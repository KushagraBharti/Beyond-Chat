import { useState } from "react";
import { formatMemoryDate, memoryReasonLabel } from "../../features/memory/adapter";
import type { MemoryProposalView } from "../../features/memory/model";
import { MemoryScopeChip } from "./MemoryScopeChip";

export function MemoryProposalQueue({ proposals, onAccept, onReject }: { readonly proposals: readonly MemoryProposalView[]; readonly onAccept: (id: string) => void | Promise<void>; readonly onReject: (id: string) => void | Promise<void> }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const decide = async (id: string, action: (id: string) => void | Promise<void>) => { setPendingId(id); try { await action(id); } finally { setPendingId(null); } };
  return <section className="memory-proposals" aria-labelledby="memory-proposals-title">
    <header><div><p className="memory-eyebrow">Review queue</p><h2 id="memory-proposals-title">Memory proposals</h2></div><span>{proposals.length} pending</span></header>
    {proposals.length === 0 ? <div className="memory-empty"><strong>No proposals need review</strong><p>New memories stay here until you accept or reject them.</p></div> :
      <div className="memory-proposal-list">{proposals.map((proposal) => <article key={proposal.id} className={proposal.reason === "contradiction" ? "is-contradiction" : undefined}>
        <div className="memory-row-meta"><MemoryScopeChip scope={proposal.scope} /><span>{memoryReasonLabel(proposal.reason)}</span><time dateTime={proposal.proposedAt}>{formatMemoryDate(proposal.proposedAt)}</time></div>
        <h3>{proposal.key}</h3><p>{proposal.content}</p>
        {proposal.reason === "contradiction" && <p className="memory-warning" role="status">This differs from an active memory. Accepting creates a new revision; it does not erase history.</p>}
        <div className="memory-actions"><button type="button" className="memory-button is-primary" disabled={pendingId !== null} onClick={() => void decide(proposal.id, onAccept)}>Accept</button><button type="button" className="memory-button" disabled={pendingId !== null} onClick={() => void decide(proposal.id, onReject)}>Reject</button></div>
      </article>)}</div>}
  </section>;
}
