import { Agent } from './agent/agent.js';
import type { AgentEvent, ApprovalDecision, DoneEvent, ToolEndEvent } from './agent/types.js';
import { DEFAULT_MODEL } from './model/llm.js';
import { InMemoryChatHistory } from './utils/in-memory-chat-history.js';

type RunnerArgs = {
  prompt: string;
  model: string;
  json: boolean;
  maxIterations: number;
};

type RunnerOutput = {
  type: 'final';
  answer: string;
  events: AgentEvent[];
  toolCalls: DoneEvent['toolCalls'];
  sources: Array<{ title?: string; url: string; snippet?: string }>;
  usage?: DoneEvent['tokenUsage'];
  iterations: number;
  totalTime: number;
  engine: 'dexter';
};

function parseArgs(argv: string[]): RunnerArgs {
  const args: RunnerArgs = {
    prompt: '',
    model: DEFAULT_MODEL,
    json: false,
    maxIterations: 10,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    const next = argv[index + 1];
    if (item === '--prompt' && next) {
      args.prompt = next;
      index += 1;
    } else if (item === '--model' && next) {
      args.model = next;
      index += 1;
    } else if (item === '--max-iterations' && next) {
      args.maxIterations = Number(next);
      index += 1;
    } else if (item === '--json') {
      args.json = true;
    }
  }

  if (!args.prompt.trim()) {
    throw new Error('Missing required --prompt value.');
  }
  return args;
}

function emitJson(payload: unknown) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function collectSources(events: AgentEvent[]): Array<{ title?: string; url: string; snippet?: string }> {
  const seen = new Set<string>();
  const sources: Array<{ title?: string; url: string; snippet?: string }> = [];
  const urlPattern = /https?:\/\/[^\s"'<>),]+/g;

  for (const event of events) {
    if (event.type !== 'tool_end') continue;
    const toolEvent = event as ToolEndEvent;
    const matches = toolEvent.result.match(urlPattern) ?? [];
    for (const rawUrl of matches) {
      const url = rawUrl.replace(/[.]+$/, '');
      if (seen.has(url)) continue;
      seen.add(url);
      sources.push({
        url,
        title: `${toolEvent.tool} source`,
        snippet: toolEvent.result.slice(0, 240),
      });
    }
  }

  return sources.slice(0, 12);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const events: AgentEvent[] = [];
  let finalDone: DoneEvent | null = null;
  const sessionApprovedTools = new Set<string>(['write_file', 'edit_file']);
  const requestToolApproval = async (): Promise<ApprovalDecision> => 'allow-session';

  const agent = await Agent.create({
    model: args.model,
    modelProvider: 'openrouter',
    maxIterations: args.maxIterations,
    channel: 'web',
    memoryEnabled: false,
    requestToolApproval,
    sessionApprovedTools,
  });

  const history = new InMemoryChatHistory(args.model);

  for await (const event of agent.run(args.prompt, history)) {
    events.push(event);
    if (args.json) {
      emitJson({ type: 'event', event });
    }
    if (event.type === 'done') {
      finalDone = event;
    }
  }

  if (!finalDone) {
    throw new Error('Dexter finished without a final done event.');
  }

  const output: RunnerOutput = {
    type: 'final',
    answer: finalDone.answer,
    events,
    toolCalls: finalDone.toolCalls,
    sources: collectSources(events),
    usage: finalDone.tokenUsage,
    iterations: finalDone.iterations,
    totalTime: finalDone.totalTime,
    engine: 'dexter',
  };

  emitJson(output);
}

main().catch((error) => {
  emitJson({
    type: 'error',
    error: error instanceof Error ? error.message : String(error),
    engine: 'dexter',
  });
  process.exitCode = 1;
});
