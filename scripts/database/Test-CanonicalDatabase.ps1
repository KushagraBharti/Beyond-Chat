[CmdletBinding()]
param(
  [string]$PostgresBin,
  [switch]$KeepArtifacts
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$migrationDirectory = Join-Path $workspaceRoot 'supabase\migrations'
$securityTest = Join-Path $workspaceRoot 'supabase\tests\database\phase2_security.sql'
$migrations = @(Get-ChildItem -LiteralPath $migrationDirectory -Filter '*.sql' | Sort-Object Name)
if ($migrations.Count -eq 0) {
  throw 'No canonical migrations were found.'
}

if (-not $PostgresBin) {
  $pathInitDb = Get-Command initdb -ErrorAction SilentlyContinue
  if ($pathInitDb) {
    $PostgresBin = Split-Path $pathInitDb.Source -Parent
  } else {
    $PostgresBin = Join-Path $HOME '.beyond-chat-tools\postgresql-17.10-2-portable\install\pgsql\bin'
  }
}

$requiredTools = @('initdb.exe', 'pg_ctl.exe', 'psql.exe')
foreach ($tool in $requiredTools) {
  $path = Join-Path $PostgresBin $tool
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required PostgreSQL tool not found: $path"
  }
}

$psql = Join-Path $PostgresBin 'psql.exe'
$postgresVersion = (& $psql --version)
if ($postgresVersion -notmatch ' 17\.') {
  throw "PostgreSQL 17 is required for parity with Supabase. Found: $postgresVersion"
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$validationBase = [IO.Path]::GetFullPath((Join-Path $HOME '.beyond-chat-tools\supabase-canonical-validation'))
$validationRoot = [IO.Path]::GetFullPath((Join-Path $validationBase "run-$timestamp"))
if (-not $validationRoot.StartsWith($validationBase, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Refusing to use an unsafe validation path.'
}

$dataDir = Join-Path $validationRoot 'data'
$logPath = Join-Path $validationRoot 'postgres.log'
$bootstrapPath = Join-Path $validationRoot 'bootstrap.sql'
[IO.Directory]::CreateDirectory($validationRoot) | Out-Null

$port = 55432..55532 |
  Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } |
  Select-Object -First 1
if (-not $port) {
  throw 'No free loopback port is available for PostgreSQL validation.'
}

$bootstrap = @'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id) on delete cascade,
  name text not null,
  owner_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant all on all tables in schema storage to service_role;
create publication supabase_realtime;
'@
[IO.File]::WriteAllText($bootstrapPath, $bootstrap, [Text.UTF8Encoding]::new($false))

$serverStarted = $false
try {
  & (Join-Path $PostgresBin 'initdb.exe') -D $dataDir -U postgres --encoding=UTF8 --locale=C --auth-local=trust --auth-host=trust | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }

  $line = [Environment]::NewLine
  [IO.File]::AppendAllText(
    (Join-Path $dataDir 'postgresql.auto.conf'),
    ($line + "listen_addresses='127.0.0.1'" + $line + "port=$port" + $line + 'max_connections=30' + $line)
  )

  # Do not pipe pg_ctl output on Windows. A detached postgres child can inherit
  # the pipeline handle and keep non-interactive shells waiting for EOF.
  & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDir -l $logPath -w start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL validation server failed to start.' }
  $serverStarted = $true

  $env:PGHOST = '127.0.0.1'
  $env:PGPORT = [string]$port
  $env:PGUSER = 'postgres'
  $env:PGDATABASE = 'postgres'

  & $psql -X -v ON_ERROR_STOP=1 -f $bootstrapPath | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Supabase compatibility bootstrap failed.' }

  foreach ($replay in 1..2) {
    foreach ($migration in $migrations) {
      & $psql -X -v ON_ERROR_STOP=1 -f $migration.FullName | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "Canonical migration replay $replay failed at $($migration.Name)." }
    }

    & $psql -X -v ON_ERROR_STOP=1 -f $securityTest | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Canonical security test pass $replay failed." }
  }

  $inventory = & $psql -X -Atc @'
select json_build_object(
  'postgres_version', current_setting('server_version'),
  'public_tables', (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'),
  'rls_tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity),
  'public_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'storage_policies', (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'),
  'realtime_tables', (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public')
);
'@
  if ($LASTEXITCODE -ne 0) { throw 'Canonical inventory query failed.' }

  [pscustomobject]@{
    Status = 'passed'
    PostgreSQL = $postgresVersion
    MigrationReplays = 2
    MigrationFiles = @($migrations.Name)
    SecurityTestPasses = 2
    Inventory = ($inventory | ConvertFrom-Json)
    ArtifactRoot = if ($KeepArtifacts) { $validationRoot } else { $null }
  } | ConvertTo-Json -Depth 5
} finally {
  Remove-Item Env:PGHOST, Env:PGPORT, Env:PGUSER, Env:PGDATABASE -ErrorAction SilentlyContinue

  if ($serverStarted) {
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataDir -m fast -w stop
  }

  if (-not $KeepArtifacts -and (Test-Path -LiteralPath $validationRoot)) {
    $resolved = [IO.Path]::GetFullPath($validationRoot)
    if (-not $resolved.StartsWith($validationBase, [StringComparison]::OrdinalIgnoreCase)) {
      throw 'Refusing to remove an unsafe validation path.'
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
