import { forwardRef, useId, useImperativeHandle, useRef, useState, type KeyboardEvent } from "react";
import { queryDiscovery, type DiscoveryResult } from "@beyond/product-catalog";
import { discoveryBrowsePath, discoveryItems, type PromotionDraft, type ReferenceChip } from "../../features/workspace/adapter";

export const WorkspaceComposer = forwardRef<HTMLTextAreaElement, { disabled: boolean; onPromote: (draft: PromotionDraft) => void; onSend?: (draft: PromotionDraft) => void; onBrowse: (path: string) => void; items?: readonly (typeof discoveryItems)[number][]; runLabel?: string }>(({ disabled, onPromote, onSend, onBrowse, items = discoveryItems, runLabel = "Run General" }, forwardedRef) => {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => textarea.current as HTMLTextAreaElement);
  const listboxId = useId();
  const [message, setMessage] = useState("");
  const [chips, setChips] = useState<ReferenceChip[]>([]);
  const [results, setResults] = useState<readonly DiscoveryResult[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const updateDiscovery = (value: string) => {
    const token = value.split(/\s/).at(-1) ?? "";
    if (token.startsWith("/") || token.startsWith("@")) { setResults(queryDiscovery(items, token)); setHighlighted(0); } else setResults([]);
  };
  const select = (item: DiscoveryResult) => {
    if (!item.keyboard.is_selectable) return;
    const browsePath = discoveryBrowsePath(item.id);
    if (browsePath) {
      setResults([]);
      onBrowse(browsePath);
      return;
    }
    setChips((current) => current.some((chip) => chip.id === item.id) ? current : [...current, { id: item.id, label: item.label, kind: item.kind, state: item.state }]);
    setMessage((current) => current.replace(/(?:^|\s)[/@][^\s]*$/, "").trimStart());
    setResults([]);
    textarea.current?.focus();
  };
  const moveHighlight = (direction: 1 | -1) => {
    setHighlighted((current) => {
      for (let offset = 1; offset <= results.length; offset += 1) {
        const candidate = (current + direction * offset + results.length) % results.length;
        if (results[candidate].keyboard.is_selectable) return candidate;
      }
      return current;
    });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!results.length) { if (event.key === "Escape") setResults([]); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); moveHighlight(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveHighlight(-1); }
    else if (event.key === "Home") { event.preventDefault(); setHighlighted(0); }
    else if (event.key === "End") { event.preventDefault(); setHighlighted(results.length - 1); }
    else if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); select(results[highlighted]); }
    else if (event.key === "Escape") { event.preventDefault(); setResults([]); }
  };
  const activeId = results[highlighted] ? `${listboxId}-${results[highlighted].id}` : undefined;
  return <div className="workspace-composer">
    <div className="workspace-chip-list" aria-label="Attached references">{chips.map((chip) => <button key={chip.id} type="button" className="workspace-chip" onClick={() => setChips((current) => current.filter((item) => item.id !== chip.id))}>{chip.kind}: {chip.label}<span aria-hidden="true"> ×</span><span className="sr-only">Remove</span></button>)}</div>
    <textarea ref={textarea} aria-label="Chat message" aria-autocomplete="list" aria-controls={results.length ? listboxId : undefined} aria-expanded={results.length > 0} aria-activedescendant={activeId} value={message} disabled={disabled} placeholder="Try /research, /project Market entry, or @Finance" onChange={(event) => { setMessage(event.target.value); updateDiscovery(event.target.value); }} onKeyDown={onKeyDown} />
    <div className="workspace-composer-actions"><span><kbd>/</kbd> discover · <kbd>↑↓</kbd> select · chips keep context explicit</span><span>{onSend ? <button type="button" className="workspace-button" disabled={!message.trim() || disabled} onClick={() => { onSend({ prompt: message.trim(), references: chips, source: "chat" }); setMessage(""); setChips([]); }}>{runLabel}</button> : null}<button type="button" className="workspace-button is-quiet" disabled={!message.trim() || disabled} onClick={() => onPromote({ prompt: message.trim(), references: chips, source: "chat" })}>Promote to Work</button></span></div>
    {results.length ? <div id={listboxId} className="workspace-discovery" role="listbox" aria-label="Command discovery">{results.map((item, index) => <button key={item.id} id={`${listboxId}-${item.id}`} type="button" role="option" aria-selected={index === highlighted} aria-disabled={!item.keyboard.is_selectable} className={index === highlighted ? "is-highlighted" : ""} tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => select(item)}><span>{item.label}<small>{item.kind}</small></span><em>{item.keyboard.is_selectable ? item.keyboard.shortcut_hint : item.state_reason ?? item.state}</em></button>)}</div> : null}
  </div>;
});
WorkspaceComposer.displayName = "WorkspaceComposer";
