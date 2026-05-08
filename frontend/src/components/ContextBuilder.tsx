import { useEffect, useState } from "react";
import type { ArtifactRecord, ProviderRecord } from "../lib/api";
import { getCachedProviderStatuses, getProviderStatuses, listArtifacts } from "../lib/api";
import { EmptyState, FieldLabel, GhostButton, MotionCard, SecondaryButton, StatusBadge, TextInput } from "./protectedUi";

const sourceTabs = [
  { key: "artifacts", label: "Artifacts", providerKey: null },
  { key: "notion", label: "Notion", providerKey: "notion" },
  { key: "files", label: "Files", providerKey: "googleDrive" },
  { key: "calendar", label: "Calendar", providerKey: "googleCalendar" },
  { key: "slack", label: "Slack", providerKey: "slack" },
] as const;

export default function ContextBuilder({
  selectedIds,
  onChange,
  title = "Context Builder",
  suggestedStudio,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  title?: string;
  suggestedStudio?: string;
}) {
  const [items, setItems] = useState<ArtifactRecord[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<ArtifactRecord[]>([]);
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<(typeof sourceTabs)[number]["key"]>("artifacts");
  const [providers, setProviders] = useState<Record<string, ProviderRecord>>(() => getCachedProviderStatuses() ?? {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!suggestedStudio) {
      setSuggestedItems([]);
      return;
    }

    let active = true;
    listArtifacts({ studio: suggestedStudio, limit: 5 })
      .then(({ items: fetched }) => {
        if (active) {
          setSuggestedItems(fetched);
        }
      })
      .catch(() => {
        if (active) {
          setSuggestedItems([]);
        }
      });

    return () => {
      active = false;
    };
  }, [suggestedStudio]);

  useEffect(() => {
    let active = true;
    void getProviderStatuses()
      .then((response) => {
        if (active) setProviders(response.providers);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeSource !== "artifacts") {
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listArtifacts({ q: query, limit: 8 });
        if (active) {
          setItems(response.items);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load artifacts.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeSource, query]);

  const allKnownItems = [...suggestedItems, ...items].filter(
    (item, index, allItems) => allItems.findIndex((candidate) => candidate.id === item.id) === index,
  );
  const selectedItems = allKnownItems.filter((item) => selectedIds.includes(item.id));

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <MotionCard className="context-builder-card">
      <div className="context-builder-head">
        <div>
          <h3>{title}</h3>
          <p>Attach artifacts, notes, and outputs before you run.</p>
        </div>
        <StatusBadge status={selectedIds.length ? "connected" : "disconnected"} label={`${selectedIds.length} included`} />
      </div>

      <div className="context-source-tabs" role="tablist" aria-label="Context sources">
        {sourceTabs.map((tab) => {
          const status = tab.providerKey ? providers[tab.providerKey]?.status ?? "not_configured" : null;
          const active = activeSource === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`context-source-tab ${active ? "is-active" : ""}`}
              onClick={() => setActiveSource(tab.key)}
            >
              <span>{tab.label}</span>
              {status ? <span>{status.replace("_", " ")}</span> : null}
            </button>
          );
        })}
      </div>

      {activeSource === "artifacts" ? (
        <div className="stack-sm">
          <FieldLabel>Search artifacts</FieldLabel>
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, summary, or content..."
          />
        </div>
      ) : null}

      {selectedIds.length ? (
        <div className="selected-context-list">
          {selectedItems.map((item) => (
            <button key={item.id} className="selected-context-chip" onClick={() => toggleSelection(item.id)} type="button">
              <span>{item.title}</span>
              <span>{item.type}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeSource !== "artifacts" ? (
        <EmptyState
          title={`${sourceTabs.find((tab) => tab.key === activeSource)?.label ?? "Source"} is not available yet`}
          body="This source will become selectable after its real connector is implemented and configured. Beyond Chat does not fabricate connector data."
        />
      ) : null}

      {activeSource === "artifacts" && loading ? <div className="meta-placeholder">Loading context options...</div> : null}
      {error ? <div className="error-copy">{error}</div> : null}

      {activeSource === "artifacts" && suggestedItems.length > 0 ? (
        <div>
          <div
            style={{
              color: "#6B6B70",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              marginBottom: "0.5rem",
              textTransform: "uppercase",
            }}
          >
            Suggested from {suggestedStudio?.charAt(0).toUpperCase()}
            {suggestedStudio?.slice(1)} Studio
          </div>
          <div className="context-grid">
            {suggestedItems.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  className={`context-option ${selected ? "is-selected" : ""}`}
                  onClick={() => toggleSelection(item.id)}
                  type="button"
                >
                  <div className="context-option-top">
                    <strong>{item.title}</strong>
                    <div style={{ alignItems: "center", display: "flex", gap: "0.25rem" }}>
                      <span
                        style={{
                          background: "#4F3FE8",
                          borderRadius: "3px",
                          color: "#fff",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "1px 5px",
                        }}
                      >
                        {suggestedStudio}
                      </span>
                      <StatusBadge status={selected ? "connected" : "disconnected"} label={selected ? "Included" : ""} />
                    </div>
                  </div>
                  <p>{item.summary ?? item.content.slice(0, 120)}</p>
                  <div className="context-option-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeSource === "artifacts" && !loading && !items.length ? (
        <EmptyState
          title="No matching artifacts yet"
          body="Save outputs from writing, research, image, or finance and they will appear here for reuse."
          action={query.trim() ? <SecondaryButton onClick={() => setQuery("")}>Clear search</SecondaryButton> : undefined}
        />
      ) : activeSource === "artifacts" ? (
        <div className="context-grid">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                className={`context-option ${selected ? "is-selected" : ""}`}
                onClick={() => toggleSelection(item.id)}
                type="button"
              >
                <div className="context-option-top">
                  <strong>{item.title}</strong>
                  <StatusBadge status={selected ? "connected" : "disconnected"} label={selected ? "Included" : item.studio} />
                </div>
                <p>{item.summary ?? item.content.slice(0, 120)}</p>
                <div className="context-option-tags">
                  {item.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedIds.length ? (
        <div className="inline-actions">
          <GhostButton onClick={() => onChange([])} type="button">
            Clear Included Context
          </GhostButton>
        </div>
      ) : null}
    </MotionCard>
  );
}
