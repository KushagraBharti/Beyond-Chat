import { useState } from "react";
interface ConversationalBuilderProps { readonly disabled?: boolean; readonly onSubmit: (prompt: string) => Promise<void>; }
export function ConversationalBuilder({ disabled = false, onSubmit }: ConversationalBuilderProps) {
  const [prompt, setPrompt] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!prompt.trim()) return; setPending(true); try { await onSubmit(prompt); setPrompt(""); } finally { setPending(false); } }
  return <form className="ab-conversation" onSubmit={submit}><label htmlFor="agent-builder-prompt">Describe what this agent should own</label><textarea id="agent-builder-prompt" rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Create an operations agent that turns approved procedures into weekly checklists and asks before external writes." disabled={disabled || pending} /><div className="ab-field-footer"><span>Builder suggestions update the same structured draft.</span><button className="ab-button ab-button--dark" type="submit" disabled={disabled || pending || !prompt.trim()}>{pending ? "Drafting…" : "Apply proposal"}<span aria-hidden="true">→</span></button></div></form>;
}
