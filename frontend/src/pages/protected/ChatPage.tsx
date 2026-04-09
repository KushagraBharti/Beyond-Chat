import { useEffect, useMemo, useState } from "react";
import ContextBuilder from "../../components/ContextBuilder";
import {
  createThread,
  getThread,
  listChatThreads,
  sendThreadMessage,
  type ChatThread,
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
import { useComparePanel } from "../../features/compare/ComparePanelProvider";

const availableModels = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
];

export default function ChatPage() {
  const { openComparePanel } = useComparePanel();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [model, setModel] = useState(availableModels[0]);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Chat Workspace"
        title="Chat, projects, and shared compare"
        description="The chat surface keeps projects, group chats, and single chats organized while model comparison lives in a reusable side panel."
        actions={
          <div className="inline-actions">
            <PrimaryButton
              type="button"
              onClick={() =>
                openComparePanel({
                  prompt: message || activeThread?.prompt || "",
                  contextIds: selectedContextIds,
                  studio: "chat",
                })
              }
            >
              Open Compare Panel
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
              placeholder="Send a message, attach context, or prepare a prompt for compare..."
            />
            <div className="chat-composer-row">
              <StatusBadge status="disconnected" label={`${selectedContextIds.length} context items`} />
              <div className="inline-actions">
                <SecondaryButton
                  onClick={() =>
                    openComparePanel({
                      prompt: message || activeThread?.prompt || "",
                      contextIds: selectedContextIds,
                      studio: "chat",
                    })
                  }
                  type="button"
                >
                  Compare Prompt
                </SecondaryButton>
                <PrimaryButton disabled={!activeThread || loading} onClick={handleSendMessage} type="button">
                  {loading ? "Sending..." : "Send"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </MotionCard>

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
