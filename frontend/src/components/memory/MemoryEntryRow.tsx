import { useState } from "react";
import { formatMemoryDate } from "../../features/memory/adapter";
import type { MemoryEntryView, RecallExplanationView } from "../../features/memory/model";
import { MemoryScopeChip } from "./MemoryScopeChip";
import { RecallExplanation } from "./RecallExplanation";

export function MemoryEntryRow({ entry, explanation, onEdit, onDelete }: { readonly entry: MemoryEntryView; readonly explanation?: RecallExplanationView; readonly onEdit: (id: string, content: string) => void | Promise<void>; readonly onDelete: (id: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false); const [content, setContent] = useState(entry.content); const [confirmDelete, setConfirmDelete] = useState(false); const [busy, setBusy] = useState(false);
  const save = async () => { if (!content.trim()) return; setBusy(true); try { await onEdit(entry.id, content.trim()); setEditing(false); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await onDelete(entry.id); } finally { setBusy(false); } };
  return <article className="memory-entry-row">
    <div className="memory-entry-main"><div className="memory-row-meta"><MemoryScopeChip scope={entry.scope} /><span>{entry.type.replaceAll("_", " ")}</span>{entry.sensitivity !== "normal" && <span className="memory-sensitive">{entry.sensitivity}</span>}</div><h3>{entry.key}</h3>
      {editing ? <div className="memory-edit"><label htmlFor={`memory-${entry.id}`}>Memory content</label><textarea id={`memory-${entry.id}`} value={content} onChange={(event) => setContent(event.target.value)} aria-describedby={`memory-${entry.id}-help`} /><small id={`memory-${entry.id}-help`}>Saving creates a revision so the change remains inspectable.</small><div className="memory-actions"><button type="button" className="memory-button is-primary" disabled={busy || !content.trim()} onClick={() => void save()}>Save revision</button><button type="button" className="memory-button" disabled={busy} onClick={() => { setContent(entry.content); setEditing(false); }}>Cancel</button></div></div> : <p>{entry.content}</p>}
      {explanation && <RecallExplanation explanation={explanation} />}</div>
    <aside><time dateTime={entry.updatedAt}>Updated {formatMemoryDate(entry.updatedAt)}</time>{entry.expiresAt && <span>Expires {formatMemoryDate(entry.expiresAt)}</span>}<div className="memory-actions"><button type="button" className="memory-text-button" onClick={() => setEditing(true)} disabled={busy || editing}>Edit</button>{confirmDelete ? <><button type="button" className="memory-text-button is-danger" onClick={() => void remove()} disabled={busy}>Delete now</button><button type="button" className="memory-text-button" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep</button></> : <button type="button" className="memory-text-button is-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete</button>}</div></aside>
  </article>;
}
