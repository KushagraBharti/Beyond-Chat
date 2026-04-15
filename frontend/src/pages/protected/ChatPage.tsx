import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  type ChatMessage,
  createThread,
  getThread,
  listChatThreads,
  streamThreadMessage,
  setStoredWorkspaceId,
  type ChatThread,
} from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { AppBrand } from "../../components/protectedUi";
import { useComparePanel } from "../../features/compare/ComparePanelProvider";
import { activeModelCatalog, defaultChatModel } from "../../lib/modelCatalog";

const availableModels = [
  ...activeModelCatalog.map((entry) => ({
    id: entry.openRouterId,
    label: entry.name,
  })),
];

export default function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openComparePanel } = useComparePanel();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [model, setModel] = useState(defaultChatModel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    void refreshThreads();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages]);

  async function refreshThreads(selectId?: string) {
    try {
      const response = await listChatThreads();
      setThreads(response.threads);
      if (selectId) {
        const threadResponse = await getThread(selectId);
        setActiveThread(threadResponse.thread);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load threads.");
    }
  }

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, searchQuery]);

  const handleNewChat = () => {
    setActiveThread(null);
    setMessage("");
    setError(null);
  };

  const handleSelectThread = async (threadId: string) => {
    try {
      const response = await getThread(threadId);
      setActiveThread(response.thread);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open thread.");
    }
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const outboundMessage = message.trim();
      setMessage("");
      resetTextareaHeight();

      let thread = activeThread;

      if (!thread) {
        const threadTitle = outboundMessage.replace(/\s+/g, " ").slice(0, 60) || "New chat";
        const response = await createThread({
          title: threadTitle,
          collection_type: "chat",
          studio: "chat",
          model,
        });
        thread = response.thread;
        thread.messages = [];
        setActiveThread(thread);
      }

      const optimisticUserId = `user-pending-${Date.now()}`;
      const optimisticAssistantId = `assistant-pending-${Date.now()}`;
      const optimisticTimestamp = new Date().toISOString();

      const optimisticUserMessage: ChatMessage = {
        id: optimisticUserId,
        thread_id: thread.id,
        role: "user",
        content: outboundMessage,
        created_at: optimisticTimestamp,
        metadata: {},
      };

      const optimisticAssistantMessage: ChatMessage = {
        id: optimisticAssistantId,
        thread_id: thread.id,
        role: "assistant",
        content: "",
        created_at: optimisticTimestamp,
        metadata: { streaming: true },
      };

      setActiveThread((current) =>
        current
          ? {
              ...current,
              messages: [
                ...(current.messages ?? []),
                optimisticUserMessage,
                optimisticAssistantMessage,
              ],
            }
          : current,
      );

      const response = await streamThreadMessage(thread.id, {
        content: outboundMessage,
        model,
      }, {
        onDelta: (_chunk, fullText) => {
          setActiveThread((current) =>
            current
              ? {
                  ...current,
                  messages: (current.messages ?? []).map((item) =>
                    item.id === optimisticAssistantId
                      ? {
                          ...item,
                          content: fullText,
                          metadata: { ...item.metadata, streaming: true },
                        }
                      : item,
                  ),
                }
              : current,
          );
        },
      });

      setActiveThread((current) =>
        current
          ? {
              ...current,
              messages: (current.messages ?? []).map((item) => {
                if (item.id === optimisticUserId) {
                  return response.userMessage;
                }
                if (item.id === optimisticAssistantId) {
                  return response.assistantMessage;
                }
                return item;
              }),
            }
          : current,
      );
      await refreshThreads(thread.id);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to send message.";
      setActiveThread((current) =>
        current
          ? {
              ...current,
              messages: (current.messages ?? []).map((item) =>
                item.id.startsWith("assistant-pending-")
                  ? {
                      ...item,
                      content: messageText,
                      metadata: { ...item.metadata, streaming: false },
                    }
                  : item,
              ),
            }
          : current,
      );
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setStoredWorkspaceId(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  };

  const resetTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
    }
  };

  const activeModelLabel =
    availableModels.find((m) => m.id === model)?.label ?? model;

  return (
    <div className="cs">
      {/* Sidebar */}
      <aside className={`cs-sidebar ${sidebarOpen ? "" : "cs-sidebar-hidden"}`}>
        <div className="cs-sidebar-top">
          <Link to="/dashboard" className="cs-brand-link">
            <AppBrand compact={false} />
          </Link>
          <button
            className="cs-sidebar-toggle"
            onClick={() => setSidebarOpen(false)}
            type="button"
            title="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
          </button>
        </div>

        <button className="cs-new-chat" onClick={handleNewChat} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          New chat
        </button>

        <div className="cs-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            className="cs-search"
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cs-threads">
          {filteredThreads.length > 0 && (
            <div className="cs-threads-label">Recents</div>
          )}
          <div className="cs-threads-list">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                className={`cs-thread-item ${thread.id === activeThread?.id ? "is-active" : ""}`}
                onClick={() => void handleSelectThread(thread.id)}
                type="button"
                title={thread.title}
              >
                {thread.title}
              </button>
            ))}
            {!filteredThreads.length && (
              <div className="cs-threads-empty">
                {searchQuery ? "No matching chats" : "No conversations yet"}
              </div>
            )}
          </div>
        </div>

        <div className="cs-sidebar-footer">
          <div className="cs-user-row">
            <div className="cs-user-avatar">
              {user?.email?.slice(0, 1).toUpperCase() ?? "U"}
            </div>
            <div className="cs-user-info">
              <span className="cs-user-name">
                {user?.email ?? "Workspace user"}
              </span>
            </div>
            <button
              className="cs-signout-btn"
              onClick={() => void handleSignOut()}
              type="button"
              title="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="cs-main">
        {/* Top bar */}
        <div className="cs-topbar">
          {!sidebarOpen && (
            <button
              className="cs-sidebar-open"
              onClick={() => setSidebarOpen(true)}
              type="button"
              title="Open sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
            </button>
          )}
          <div className="cs-topbar-title">
            {activeThread ? activeThread.title : "New chat"}
          </div>
          <button
            className="cs-compare-btn"
            onClick={() =>
              openComparePanel({
                prompt: message || activeThread?.prompt || "",
                contextIds: [],
                studio: "chat",
              })
            }
            type="button"
            title="Compare models"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" /></svg>
          </button>
        </div>

        {error && <div className="cs-error">{error}</div>}

        {/* Messages or welcome */}
        {!activeThread || !activeThread.messages?.length ? (
          <div className="cs-welcome">
            <h1 className="cs-welcome-title">
              Hello{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="cs-welcome-sub">How can I help you today?</p>
          </div>
        ) : (
          <div className="cs-messages">
            {activeThread.messages.map((msg) => (
              <div
                key={msg.id}
                className={`cs-msg cs-msg-${msg.role}`}
              >
                <div className="cs-msg-label">{msg.role}</div>
                <div className="cs-msg-body">
                  <div className="cs-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Composer */}
        <div className="cs-composer-wrap">
          <div className="cs-composer">
            <textarea
              ref={textareaRef}
              className="cs-composer-input"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTextareaInput();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              disabled={loading}
            />
            <div className="cs-composer-bar">
              <div className="cs-composer-left">
                <select
                  className="cs-model-picker"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="cs-send-btn"
                onClick={() => void handleSend()}
                disabled={loading || !message.trim()}
                type="button"
                title="Send message"
              >
                {loading ? (
                  <span className="cs-send-loading" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className="cs-composer-hint">
            {activeModelLabel} &middot; Enter to send, Shift+Enter for new line
          </div>
        </div>
      </main>
    </div>
  );
}
