import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  type ChatMessage,
  createThread,
  deleteThread,
  getThread,
  listChatThreads,
  renameThread,
  streamThreadMessage,
  setStoredWorkspaceId,
  type ChatThread,
} from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { AppBrand } from "../../components/protectedUi";
import ArtifactSaveButton from "../../components/ArtifactSaveButton";
import ContextBuilder from "../../components/ContextBuilder";
import { useComparePanel } from "../../features/compare/ComparePanelProvider";
import { activeModelCatalog, defaultChatModel } from "../../lib/modelCatalog";
import { buildChatMessageArtifactInput } from "../../lib/artifactDrafts";

const availableModels = [
  ...activeModelCatalog.map((entry) => ({
    id: entry.openRouterId,
    label: entry.name,
  })),
];

const launchPlanPrompt =
  "Create an artifact-ready launch plan from the attached context. Include the core decision, research questions, data needed, finance assumptions, writing deliverables, image needs, risks, and the next studio to use for each workstream.";

function formatThreadDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);
  const [threadMenu, setThreadMenu] = useState<{
    threadId: string;
    x: number;
    y: number;
    phase: "default" | "rename" | "confirm";
    renameValue: string;
  } | null>(null);

  const movePromptToComposer = (nextPrompt: string) => {
    setMessage(nextPrompt);
    window.setTimeout(handleTextareaInput, 0);
  };

  const assistantHandoffPrompt = (msg: ChatMessage) =>
    [
      "Use this assistant output as source context.",
      "",
      msg.content,
      "",
      "Produce a concrete artifact-ready next step that preserves the important context, decisions, risks, and recommendations.",
    ].join("\n");

  useEffect(() => {
    void refreshThreads();
  }, []);

  useEffect(() => {
    const state = location.state as { prompt?: string; contextIds?: string[] } | null;
    if (!state) return;
    if (state.prompt) {
      setMessage(state.prompt);
      window.setTimeout(handleTextareaInput, 0);
    }
    if (state.contextIds?.length) {
      setContextIds(state.contextIds);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!threadMenu) return;

    const closeMenu = () => setThreadMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [threadMenu]);

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

  const handleThreadContextMenu = (event: React.MouseEvent, threadId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const thread = threads.find((t) => t.id === threadId);
    setThreadMenu({ threadId, x: event.clientX, y: event.clientY, phase: "default", renameValue: thread?.title ?? "" });
  };

  const handleRenameThread = async (thread: ChatThread, nextTitle: string) => {
    setThreadMenu(null);
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === thread.title) return;

    try {
      const response = await renameThread(thread.id, { title: trimmed });
      setThreads((current) => current.map((item) => (item.id === thread.id ? { ...item, title: response.thread.title } : item)));
      if (activeThread?.id === thread.id) {
        setActiveThread((current) => (current ? { ...current, title: response.thread.title } : current));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename chat.");
    }
  };

  const handleDeleteThread = async (thread: ChatThread) => {
    setThreadMenu(null);
    const previousThreads = threads;
    const nextThreads = threads.filter((item) => item.id !== thread.id);
    setThreads(nextThreads);
    if (activeThread?.id === thread.id) {
      setActiveThread(null);
    }

    try {
      await deleteThread(thread.id);
    } catch (err) {
      setThreads(previousThreads);
      setError(err instanceof Error ? err.message : "Failed to delete chat.");
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
        context_ids: contextIds,
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

        <div className="cs-sidebar-actions">
          <button className="cs-new-chat" onClick={handleNewChat} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            <span>New chat</span>
          </button>
        </div>

        <div className="cs-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            className="cs-search"
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cs-threads">
          <div className="cs-threads-label">
            <span>Recents</span>
            <span>{filteredThreads.length}</span>
          </div>
          <div className="cs-threads-list">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                className={`cs-thread-item ${thread.id === activeThread?.id ? "is-active" : ""}`}
                onClick={() => void handleSelectThread(thread.id)}
                onContextMenu={(event) => handleThreadContextMenu(event, thread.id)}
                type="button"
                title={thread.title}
              >
                <span className="cs-thread-glyph" aria-hidden="true" />
                <span className="cs-thread-copy">
                  <span>{thread.title}</span>
                  <span>{formatThreadDate(thread.updated_at ?? thread.created_at)}</span>
                </span>
              </button>
            ))}
            {!filteredThreads.length && (
              <div className="cs-threads-empty">
                {searchQuery ? "No matching chats" : "No conversations yet"}
              </div>
            )}
          </div>
        </div>

        <div className={`cs-context-panel ${contextOpen ? "is-open" : ""}`}>
          <button className="cs-context-trigger" type="button" onClick={() => setContextOpen((open) => !open)}>
            <span>Context</span>
            <strong>{contextIds.length}</strong>
          </button>
          {contextOpen ? (
            <div className="cs-context-drawer">
              <ContextBuilder
                selectedIds={contextIds}
                onChange={setContextIds}
                title="Chat Context"
              />
            </div>
          ) : null}
        </div>

        <div className="cs-sidebar-footer">
          <div className="cs-user-row">
            <div className="cs-user-avatar">
              {user?.email?.slice(0, 1).toUpperCase() ?? "U"}
            </div>
            <div className="cs-user-info">
              <span className="cs-user-name">
                {user?.email ?? "Authenticated user"}
              </span>
              <span className="cs-user-meta">Signed in</span>
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
                contextIds,
                studio: "chat",
                onUseResult: (result) => {
                  setMessage(result.content);
                  window.setTimeout(handleTextareaInput, 0);
                },
                useResultLabel: "Use in Composer",
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
            <div className="cs-welcome-actions">
              <button className="cs-quick-action" type="button" onClick={() => movePromptToComposer(launchPlanPrompt)}>
                Create Launch Plan
              </button>
              <button
                className="cs-quick-action"
                type="button"
                onClick={() =>
                  movePromptToComposer(
                    "Review the attached artifacts and suggest what to research, analyze, finance, write, and create next. Return the answer as an artifact-ready action plan.",
                  )
                }
              >
                Plan Next Studios
              </button>
            </div>
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
                  {msg.role === "assistant" && msg.content.trim() && !msg.metadata?.streaming ? (
                    <div className="cs-msg-actions">
                      <ArtifactSaveButton
                        buildPayload={() =>
                          buildChatMessageArtifactInput({
                            threadTitle: activeThread.title,
                            message: msg,
                          })
                        }
                        label="Save"
                        savedLabel="Saved"
                        saveKey={msg.id}
                        onError={setError}
                      />
                      <button
                        className="cs-msg-action-btn"
                        type="button"
                        onClick={() => navigate("/research", { state: { prompt: assistantHandoffPrompt(msg), contextIds } })}
                      >
                        Research
                      </button>
                      <button
                        className="cs-msg-action-btn"
                        type="button"
                        onClick={() =>
                          navigate("/writing/new", {
                            state: {
                              prompt: "Turn this chat output into a polished writing artifact.",
                              contextIds,
                              template: {
                                title: `${activeThread.title} draft`,
                                content: msg.content,
                              },
                            },
                          })
                        }
                      >
                        Writing
                      </button>
                      <button
                        className="cs-msg-action-btn"
                        type="button"
                        onClick={() =>
                          openComparePanel({
                            prompt: assistantHandoffPrompt(msg),
                            contextIds,
                            studio: "chat",
                            useResultLabel: "Use in Composer",
                            onUseResult: (result) => movePromptToComposer(result.content),
                          })
                        }
                      >
                        Compare
                      </button>
                    </div>
                  ) : null}
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
            {activeModelLabel} &middot; {contextIds.length} artifact{contextIds.length === 1 ? "" : "s"} attached &middot; Enter to send, Shift+Enter for new line
          </div>
        </div>
      </main>

      {threadMenu ? (
        <div
          className="cs-thread-menu"
          style={{ left: threadMenu.x, top: threadMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const thread = threads.find((item) => item.id === threadMenu.threadId);
            if (!thread) return null;

            if (threadMenu.phase === "rename") {
              return (
                <>
                  <input
                    className="cs-thread-menu-input"
                    value={threadMenu.renameValue}
                    onChange={(e) => setThreadMenu((m) => m ? { ...m, renameValue: e.target.value } : null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRenameThread(thread, threadMenu.renameValue);
                      if (e.key === "Escape") setThreadMenu((m) => m ? { ...m, phase: "default" } : null);
                    }}
                    autoFocus
                  />
                  <button className="cs-thread-menu-item" type="button" onClick={() => void handleRenameThread(thread, threadMenu.renameValue)}>
                    Save
                  </button>
                  <button className="cs-thread-menu-item" type="button" onClick={() => setThreadMenu((m) => m ? { ...m, phase: "default" } : null)}>
                    Cancel
                  </button>
                </>
              );
            }

            if (threadMenu.phase === "confirm") {
              return (
                <>
                  <div className="cs-thread-menu-label">Delete this chat?</div>
                  <button className="cs-thread-menu-item is-danger" type="button" onClick={() => void handleDeleteThread(thread)}>
                    Yes, delete
                  </button>
                  <button className="cs-thread-menu-item" type="button" onClick={() => setThreadMenu((m) => m ? { ...m, phase: "default" } : null)}>
                    Cancel
                  </button>
                </>
              );
            }

            return (
              <>
                <button className="cs-thread-menu-item" type="button" onClick={() => setThreadMenu((m) => m ? { ...m, phase: "rename" } : null)}>
                  Rename
                </button>
                <button className="cs-thread-menu-item is-danger" type="button" onClick={() => setThreadMenu((m) => m ? { ...m, phase: "confirm" } : null)}>
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
