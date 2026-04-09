import { useEffect, useMemo, useState } from "react";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import ContextBuilder from "../../components/ContextBuilder";
import { buildCompareArtifactInput } from "../../lib/artifactDrafts";
import {
  comparePrompt,
  createThread,
  getThread,
  listChatThreads,
  sendThreadMessage,
  type ChatThread,
  type CompareResult,
} from "../../lib/api";
import {
  EmptyState,
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "../../components/protectedUi";

const availableModels = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
];

export default function ChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [comparePromptText, setComparePromptText] = useState("");
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"chat" | "compare">("chat");
  const [model, setModel] = useState(availableModels[0]);
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState("");

  useEffect(() => {
    void refreshThreads();
  }, []);

  async function refreshThreads(selectedId?: string) {
    try {
      const response = await listChatThreads();
      setThreads(response.threads);
      const firstThread = response.threads[0];
      const targetId = selectedId ?? activeThread?.id ?? firstThread?.id;
      if (targetId) {
        const threadResponse = await getThread(targetId);
        setActiveThread(threadResponse.thread);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat threads.");
    }
  }

  const groupedThreads = useMemo(() => {
    return {
      project: threads.filter((thread) => thread.collection_type === "project"),
      group: threads.filter((thread) => thread.collection_type === "group"),
      chat: threads.filter((thread) => thread.collection_type === "chat"),
    };
  }, [threads]);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) {
      return;
    }
    try {
      const response = await createThread({
        title: newThreadTitle,
        collection_type: "chat",
        studio: "chat",
        model,
      });
      setNewThreadTitle("");
      await refreshThreads(response.thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    }
  };

  const handleOpenThread = async (threadId: string) => {
    try {
      const response = await getThread(threadId);
      setActiveThread(response.thread);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open thread.");
    }
  };

  const handleSendMessage = async () => {
    if (!activeThread || !message.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await sendThreadMessage(activeThread.id, {
        content: message,
        model,
      });
      setActiveThread((current) =>
        current
          ? {
              ...current,
              messages: [...(current.messages ?? []), response.userMessage, response.assistantMessage],
            }
          : current,
      );
      setMessage("");
      await refreshThreads(activeThread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!comparePromptText.trim()) {
      return;
    }

    setCompareLoading(true);
    setError(null);
    try {
      const response = await comparePrompt({
        prompt: comparePromptText,
        models: availableModels,
        context_ids: selectedContextIds,
      });
      setCompareResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare failed.");
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Chat Workspace"
        title="Chat, projects, and compare mode"
        description="The chat surface keeps projects, group chats, and single chats organized while compare mode stays in the same workspace."
        actions={
          <div className="inline-actions">
            <SecondaryButton type="button" onClick={() => setMode("chat")}>
              Chat
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => setMode("compare")}>
              Compare
            </PrimaryButton>
          </div>
        }
      />

      {error ? <div className="error-copy">{error}</div> : null}

      <div className="chat-layout">
        <MotionCard className="chat-sidebar-card">
          <div className="context-builder-head">
            <div>
              <h3>Conversation Library</h3>
              <p>Projects, group chats, and standalone chats.</p>
            </div>
            <StatusBadge status="connected" label={`${threads.length} threads`} />
          </div>

          <div className="stack-sm">
            <FieldLabel>Start new chat</FieldLabel>
            <div className="inline-actions inline-actions-stretch">
              <TextInput
                value={newThreadTitle}
                onChange={(event) => setNewThreadTitle(event.target.value)}
                placeholder="Name the thread..."
              />
              <PrimaryButton type="button" onClick={handleCreateThread}>
                Create
              </PrimaryButton>
            </div>
          </div>

          {threads.length ? (
            <div className="collection-list">
              <ThreadSection title="Projects" items={groupedThreads.project} activeId={activeThread?.id} onOpen={handleOpenThread} />
              <ThreadSection title="Group Chats" items={groupedThreads.group} activeId={activeThread?.id} onOpen={handleOpenThread} />
              <ThreadSection title="Chats" items={groupedThreads.chat} activeId={activeThread?.id} onOpen={handleOpenThread} />
            </div>
          ) : (
            <EmptyState title="No chat groups yet" body="Create your first thread and the conversation rail will populate." />
          )}
        </MotionCard>

        {mode === "chat" ? (
          <MotionCard className="chat-main-card">
            <div className="chat-main-header">
              <div>
                <h3>{activeThread?.title ?? "Select a thread"}</h3>
                <p>Use the same visual language as ChatGPT, but keep work grouped by projects and teams.</p>
              </div>
              <div className="inline-actions">
                <Select value={model} onChange={(event) => setModel(event.target.value)}>
                  {availableModels.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="chat-messages">
              {activeThread?.messages?.length ? (
                activeThread.messages.map((entry) => (
                  <div key={entry.id} className={`chat-message chat-${entry.role}`}>
                    <div className="chat-bubble-role">{entry.role}</div>
                    <div className="chat-bubble-copy">{entry.content}</div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No active thread selected"
                  body="Pick a project, group chat, or standalone thread from the rail to start working."
                />
              )}
            </div>

            <div className="chat-composer">
              <TextArea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Send a message, attach context, or draft a compare prompt..."
              />
              <div className="chat-composer-row">
                <StatusBadge status="disconnected" label={`${selectedContextIds.length} context items`} />
                <PrimaryButton disabled={!activeThread || loading} onClick={handleSendMessage} type="button">
                  {loading ? "Sending..." : "Send"}
                </PrimaryButton>
              </div>
            </div>
          </MotionCard>
        ) : (
          <MotionCard className="chat-main-card">
            <div className="chat-main-header">
              <div>
                <h3>Compare Mode</h3>
                <p>Run one prompt across multiple models without leaving the chat workspace.</p>
              </div>
              <StatusBadge status={compareResults.length ? "completed" : "disconnected"} label="Model Compare" />
            </div>

            <TextArea
              value={comparePromptText}
              onChange={(event) => setComparePromptText(event.target.value)}
              placeholder="Ask all models the same question..."
            />

            <div className="inline-actions">
              <PrimaryButton onClick={handleCompare} disabled={compareLoading} type="button">
                {compareLoading ? "Running compare..." : "Run Compare"}
              </PrimaryButton>
            </div>

            <div className="compare-grid">
              {compareResults.length ? (
                compareResults.map((result) => (
                  <div key={result.model} className="compare-card">
                    <div className="compare-card-header">
                      <strong>{result.model}</strong>
                      <StatusBadge
                        status={
                          result.status === "completed" || result.status === "failed" || result.status === "not_configured"
                            ? result.status
                            : "disconnected"
                        }
                      />
                    </div>
                    <p>{result.content || result.error || "No response returned."}</p>
                    <div className="inline-actions inline-actions-stretch">
                      <span>{result.latencyMs ? `${result.latencyMs}ms` : "No provider latency yet"}</span>
                      <ArtifactSaveButton
                        buildPayload={() =>
                          buildCompareArtifactInput({
                            prompt: comparePromptText,
                            result,
                            contextIds: selectedContextIds,
                          })
                        }
                        disabled={!result.content || result.status === "failed"}
                        label="Save Result"
                        savedLabel="Saved"
                        saveKey={`${comparePromptText}:${result.model}:${result.content}`}
                        onSaved={() => setError(null)}
                        onError={setError}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No compare results yet"
                  body="Use compare mode for side-by-side model checks before saving the best result as an artifact."
                />
              )}
            </div>
          </MotionCard>
        )}

        <ContextBuilder selectedIds={selectedContextIds} onChange={setSelectedContextIds} />
      </div>
    </div>
  );
}

function ThreadSection({
  title,
  items,
  activeId,
  onOpen,
}: {
  title: string;
  items: ChatThread[];
  activeId?: string;
  onOpen: (threadId: string) => void;
}) {
  return (
    <div className="thread-section">
      <div className="thread-section-title">{title}</div>
      <div className="stack-sm">
        {items.map((thread) => (
          <button
            key={thread.id}
            className={`thread-card ${thread.id === activeId ? "is-active" : ""}`}
            onClick={() => onOpen(thread.id)}
            type="button"
          >
            <strong>{thread.title}</strong>
            <span>{thread.model}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
