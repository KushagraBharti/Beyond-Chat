import { Sandbox } from '@vercel/sandbox';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Writable } from 'node:stream';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
};

type VercelResponse = {
  setHeader?: (name: string, value: string) => void;
  write?: (chunk: string) => void;
  end?: () => void;
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

type RunPayload = {
  prompt?: string;
  model?: string;
  workspaceId?: string;
  runId?: string;
  options?: Record<string, unknown>;
  env?: Record<string, string>;
};

type JsonLine = Record<string, unknown>;

const DEXTER_ROOT = join(process.cwd(), 'dexter');
const SANDBOX_APP_DIR = '/app';
const SANDBOX_RUNTIME = 'node24';
const SANDBOX_TIMEOUT_MS = 2700 * 1000;

function requireAuth(req: VercelRequest) {
  const expected = process.env.DEXTER_RUNNER_SHARED_SECRET;
  if (!expected) return;
  const raw = req.headers.authorization ?? '';
  const actual = Array.isArray(raw) ? raw[0] : raw;
  if (actual !== `Bearer ${expected}`) {
    const error = new Error('Unauthorized');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }
}

async function collectFiles(root: string, dir = root): Promise<Array<{ path: string; content: Buffer }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: Array<{ path: string; content: Buffer }> = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, absolute));
      continue;
    }
    const rel = relative(root, absolute).replaceAll('\\', '/');
    files.push({
      path: `${SANDBOX_APP_DIR}/${rel}`,
      content: await readFile(absolute),
    });
  }

  return files;
}

function sandboxEnv(payload: RunPayload): Record<string, string> {
  const keys = [
    'OPENROUTER_API_KEY',
    'FINANCIAL_DATASETS_API_KEY',
    'EXASEARCH_API_KEY',
    'X_BEARER_TOKEN',
  ];
  const env: Record<string, string> = {
    DEXTER_MEMORY_ENABLED: 'false',
    DEXTER_ENABLE_BROWSER: 'false',
    DEXTER_ENABLE_AUTOMATIONS: 'false',
    ...(payload.env ?? {}),
  };
  for (const key of keys) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

function parseJsonLines(stdout: string): { final: JsonLine | null; events: JsonLine[] } {
  const events: JsonLine[] = [];
  let final: JsonLine | null = null;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as JsonLine;
      if (parsed.type === 'event') {
        events.push(parsed.event as JsonLine);
      } else if (parsed.type === 'final') {
        final = parsed;
      } else if (parsed.type === 'error') {
        final = parsed;
      }
    } catch {
      // Ignore dependency install chatter or non-JSON logs.
    }
  }
  return { final, events };
}

function parseJsonLine(line: string): JsonLine | null {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line) as JsonLine;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function wantsNdjson(req: VercelRequest, res: VercelResponse) {
  const raw = req.headers.accept ?? '';
  const accept = Array.isArray(raw) ? raw.join(',') : raw;
  return accept.includes('application/x-ndjson') && typeof res.write === 'function' && typeof res.end === 'function';
}

function writeNdjson(res: VercelResponse, payload: unknown) {
  res.write?.(`${JSON.stringify(payload)}\n`);
}

class JsonLineCapture extends Writable {
  private buffer = '';
  readonly chunks: string[] = [];
  final: JsonLine | null = null;
  readonly events: JsonLine[] = [];

  constructor(private readonly onEvent?: (event: JsonLine) => void) {
    super();
  }

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const text = chunk.toString();
    this.chunks.push(text);
    this.buffer += text;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      this.handleLine(line);
    }
    callback();
  }

  _final(callback: (error?: Error | null) => void) {
    if (this.buffer.trim()) {
      this.handleLine(this.buffer);
    }
    callback();
  }

  private handleLine(line: string) {
    const parsed = parseJsonLine(line);
    if (!parsed) return;
    if (parsed.type === 'event' && parsed.event && typeof parsed.event === 'object') {
      const event = parsed.event as JsonLine;
      this.events.push(event);
      this.onEvent?.(event);
    } else if (parsed.type === 'final' || parsed.type === 'error') {
      this.final = parsed;
    }
  }
}

class TextCapture extends Writable {
  readonly chunks: string[] = [];

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(chunk.toString());
    callback();
  }

  text() {
    return this.chunks.join('');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    requireAuth(req);
    const payload = req.body as RunPayload;
    if (!payload.prompt || !payload.model) {
      res.status(400).json({ error: 'prompt and model are required' });
      return;
    }

    const streamResponse = wantsNdjson(req, res);
    if (streamResponse) {
      res.setHeader?.('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader?.('Cache-Control', 'no-cache');
    }

    const snapshotId = null;
    const baseSandboxParams = {
      timeout: SANDBOX_TIMEOUT_MS,
      env: sandboxEnv(payload),
    };
    const sandbox = snapshotId
      ? await Sandbox.create({
          ...baseSandboxParams,
          source: { type: 'snapshot', snapshotId },
        })
      : await Sandbox.create({
          ...baseSandboxParams,
          runtime: SANDBOX_RUNTIME,
        });

    try {
      if (!snapshotId) {
        await sandbox.mkDir(SANDBOX_APP_DIR);
        const files = await collectFiles(DEXTER_ROOT);
        for (let index = 0; index < files.length; index += 100) {
          await sandbox.writeFiles(files.slice(index, index + 100));
        }
        const install = await sandbox.runCommand({
          cmd: 'npm',
          args: ['install'],
          cwd: SANDBOX_APP_DIR,
        });
        if (install.exitCode !== 0) {
          throw new Error(`npm install failed: ${await install.stderr()}`);
        }
      }

      const stdoutCapture = new JsonLineCapture((event) => {
        if (streamResponse) {
          writeNdjson(res, { type: 'event', event });
        }
      });
      const stderrCapture = new TextCapture();

      const command = await sandbox.runCommand({
        cmd: 'npm',
        args: [
          'run',
          'dexter:run',
          '--',
          '--prompt',
          payload.prompt,
          '--model',
          payload.model,
          '--json',
        ],
        cwd: SANDBOX_APP_DIR,
        stdout: stdoutCapture,
        stderr: stderrCapture,
      });
      const stdout = stdoutCapture.chunks.join('');
      const stderr = stderrCapture.text();
      const parsed = stdoutCapture.final ? { final: stdoutCapture.final, events: stdoutCapture.events } : parseJsonLines(stdout);
      const { final, events } = parsed;

      if (command.exitCode !== 0) {
        throw new Error(`Dexter exited with ${command.exitCode}: ${stderr || stdout}`);
      }
      if (!final || final.type === 'error') {
        throw new Error(String(final?.error || 'Dexter did not return a final payload.'));
      }

      const responsePayload = {
        ...final,
        events: final.events ?? events,
        sandbox: {
          provider: 'vercel',
          sandboxId: sandbox.sandboxId,
          commandId: command.cmdId,
          runtime: SANDBOX_RUNTIME,
          snapshotId: snapshotId || null,
        },
      };
      if (streamResponse) {
        writeNdjson(res, responsePayload);
        res.end?.();
      } else {
        res.status(200).json(responsePayload);
      }
    } finally {
      await sandbox.stop().catch(() => undefined);
    }
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    const errorPayload = {
      error: error instanceof Error ? error.message : String(error),
      sandbox: { provider: 'vercel', mode: 'failed' },
      type: 'error',
    };
    if (wantsNdjson(req, res)) {
      writeNdjson(res, errorPayload);
      res.end?.();
      return;
    }
    res.status(statusCode).json(errorPayload);
  }
}
