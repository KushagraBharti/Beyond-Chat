import { useEffect, useState } from "react";
import type { ArtifactRecord } from "../lib/api";
import { listArtifacts } from "../lib/api";
import { EmptyState, FieldLabel, GhostButton, MotionCard, SecondaryButton, StatusBadge, TextInput } from "./protectedUi";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!suggestedStudio) return;
    let active = true;
    listArtifacts({ studio: suggestedStudio, limit: 5 }).then(({ items: fetched }) => {
      if (active) setSuggestedItems(fetched);
    }).catch(() => {
      // best-effort — silence fetch errors for suggestions
    });
    return () => { active = false; };
  }, [suggestedStudio]);

  useEffect(() => {
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
  }, [query]);

  const allKnownItems = [...suggestedItems, ...items].filter(
    (item, idx, arr) => arr.findIndex((a) => a.id === item.id) === idx,
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

      <div className="stack-sm">
        <FieldLabel>Search artifacts</FieldLabel>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title, summary, or content..."
        />
      </div>

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

      {loading ? <div className="meta-placeholder">Loading context options...</div> : null}
      {error ? <div className="error-copy">{error}</div> : null}

      {suggestedItems.length > 0 && (
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B6B70", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            Suggested from {suggestedStudio!.charAt(0).toUpperCase() + suggestedStudio!.slice(1)} Studio
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
                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "#4F3FE8", color: "#fff", borderRadius: "3px", padding: "1px 5px" }}>
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
      )}

      {!loading && !items.length ? (
        <EmptyState
          title="No matching artifacts yet"
          body="Save outputs from writing, research, image, or finance and they will appear here for reuse."
          action={<SecondaryButton onClick={() => setQuery("")}>Clear search</SecondaryButton>}
        />
      ) : (
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
      )}

      <div className="inline-actions">
        <GhostButton onClick={() => onChange([])} type="button">
          Clear Included Context
        </GhostButton>
      </div>
    </MotionCard>
  );
}
