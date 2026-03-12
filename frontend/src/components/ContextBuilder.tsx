import { useEffect, useState } from "react";
import type { ArtifactRecord } from "../lib/api";
import { listArtifacts } from "../lib/api";
import { EmptyState, FieldLabel, GhostButton, MotionCard, SecondaryButton, StatusBadge, TextInput } from "./protectedUi";

export default function ContextBuilder({
  selectedIds,
  onChange,
  title = "Context Builder",
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  title?: string;
}) {
  const [items, setItems] = useState<ArtifactRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

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
