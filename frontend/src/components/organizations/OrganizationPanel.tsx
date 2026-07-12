import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { createBulkInvitations, createInvitation, listOrganizations, revokeInvitation, switchOrganization, type Invitation, type OrganizationSummary } from "../../features/organizations/api";
import type { OrganizationRole } from "../../lib/sessionClient";
import "./organization-panel.css";

const assignableRoles: OrganizationRole[] = ["viewer", "member", "builder", "admin", "owner"];

function messageOf(cause: unknown) { return cause instanceof Error ? cause.message : "The organization request failed."; }

export function OrganizationPanel({ admin = false }: { admin?: boolean }) {
  const { session, refreshSession } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("member");
  const [bulk, setBulk] = useState("");
  const [invitationId, setInvitationId] = useState("");
  const [created, setCreated] = useState<Invitation[]>([]);
  const canInvite = session?.role === "owner" || session?.role === "admin";

  useEffect(() => {
    let active = true;
    void listOrganizations().then(({ items }) => { if (active) setOrganizations(items); }).catch((cause) => { if (active) setMessage(messageOf(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.workosOrganizationId]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage(null);
    try { await action(); } catch (cause) { setMessage(messageOf(cause)); } finally { setBusy(false); }
  }

  async function handleSwitch(workosOrganizationId: string) {
    await run(async () => {
      await switchOrganization(workosOrganizationId);
      await refreshSession();
      window.location.assign("/home");
    });
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const invitation = await createInvitation(email, role);
      setCreated((items) => [invitation, ...items]); setEmail("");
      setMessage(`Invitation created for ${invitation.email}.`);
    });
  }

  async function handleBulk(event: FormEvent) {
    event.preventDefault();
    const invitations = bulk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [entryEmail, entryRole = "member"] = line.split(",").map((value) => value.trim());
      return { email: entryEmail, role: assignableRoles.includes(entryRole as OrganizationRole) ? entryRole as OrganizationRole : "member" };
    });
    await run(async () => {
      const result = await createBulkInvitations(invitations);
      setCreated((items) => [...result.entries.flatMap((entry) => entry.invitation ? [entry.invitation] : []), ...items]);
      setBulk(""); setMessage(`${result.success_count} invited; ${result.failure_count} failed.`);
    });
  }

  async function handleRevoke(id: string) {
    await run(async () => {
      await revokeInvitation(id);
      setCreated((items) => items.map((item) => item.id === id ? { ...item, state: "revoked" } : item));
      setInvitationId(""); setMessage("Invitation revoked.");
    });
  }

  return <section className="organization-panel" aria-labelledby={admin ? "organization-admin-title" : "organization-switch-title"}>
    <div className="organization-panel-head"><div><span>WorkOS organization</span><h2 id={admin ? "organization-admin-title" : "organization-switch-title"}>{admin ? "Members and invitations" : "Organization context"}</h2><p>{admin ? "Invite access through the canonical provider boundary. Membership changes are enforced on the next request." : "Switch only among active memberships returned by the server."}</p></div><strong>{session?.role ?? "member"}</strong></div>
    {message ? <p className="organization-message" role="status">{message}</p> : null}
    {loading ? <p className="organization-empty">Loading organizations...</p> : organizations.length ? <div className="organization-list">{organizations.map((organization) => { const active = organization.workosOrganizationId === session?.workosOrganizationId; return <article key={organization.id}><div><strong>{organization.name}</strong><span>{organization.slug} · {organization.role}</span></div><button type="button" disabled={active || busy} onClick={() => void handleSwitch(organization.workosOrganizationId)}>{active ? "Current" : "Switch"}</button></article>; })}</div> : <p className="organization-empty">No active organization memberships were returned.</p>}
    {admin ? <>
      {!canInvite ? <p className="organization-empty">Owner or Admin access is required to invite or revoke members.</p> : null}
      <div className="organization-admin-grid" aria-disabled={!canInvite}>
        <form onSubmit={(event) => void handleInvite(event)}><h3>Invite one member</h3><label><span>Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!canInvite || busy} /></label><label><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as OrganizationRole)} disabled={!canInvite || busy}>{assignableRoles.map((value) => <option key={value} value={value} disabled={value === "owner" && session?.role !== "owner"}>{value}</option>)}</select></label><button disabled={!canInvite || busy}>Send invitation</button></form>
        <form onSubmit={(event) => void handleBulk(event)}><h3>Bulk invite</h3><label><span>One email,role per line (maximum 50)</span><textarea required rows={5} value={bulk} onChange={(event) => setBulk(event.target.value)} disabled={!canInvite || busy} placeholder={'person@company.com,member\nowner@company.com,admin'} /></label><button disabled={!canInvite || busy || !bulk.trim()}>Send bulk invitations</button></form>
        <form onSubmit={(event) => { event.preventDefault(); void handleRevoke(invitationId); }}><h3>Revoke invitation</h3><label><span>Invitation ID</span><input required value={invitationId} onChange={(event) => setInvitationId(event.target.value)} disabled={!canInvite || busy} /></label><button disabled={!canInvite || busy || !invitationId.trim()}>Revoke</button><small>The backend does not yet expose invitation or member listing, so only IDs returned in this session or copied from an audit record can be revoked.</small></form>
      </div>
      {created.length ? <div className="organization-invitations"><h3>Invitations created this session</h3>{created.map((invitation) => <article key={invitation.id}><div><strong>{invitation.email}</strong><span>{invitation.role} · {invitation.state} · {invitation.id}</span></div><button type="button" disabled={busy || invitation.state === "revoked"} onClick={() => void handleRevoke(invitation.id)}>Revoke</button></article>)}</div> : null}
    </> : null}
  </section>;
}
