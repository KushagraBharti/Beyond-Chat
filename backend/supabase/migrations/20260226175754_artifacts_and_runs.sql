-- 1. Create Artifacts Table
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  tags TEXT[],
  studio TEXT,
  metadata JSONB
);

-- 2. Create Runs Table
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  studio TEXT,
  prompt TEXT,
  model TEXT[],
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- 3. Create Run Steps Table
CREATE TABLE run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  step_name TEXT,
  tool_used TEXT,
  input JSONB,
  output JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Add Indexes (as required by acceptance criteria)
CREATE INDEX idx_artifacts_workspace_id ON artifacts(workspace_id);
CREATE INDEX idx_runs_workspace_id ON runs(workspace_id);
CREATE INDEX idx_run_steps_run_id ON run_steps(run_id);