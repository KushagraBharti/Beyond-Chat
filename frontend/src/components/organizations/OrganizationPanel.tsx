import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  changeMemberRole,
  createBulkInvitations,
  createInvitation,
  listInvitations,
  listMembers,
  listOrganizations,
  parseBulkInvitations,
  restoreMember,
  revokeInvitation,
  revokeMember,
  suspendMember,
  switchOrganization,
  type InvitationSummary,
  type MemberSummary,
  type OrganizationSummary,
} from "../../features/organizations/api";
import { hasPermission } from "../../features/organizations/permissions";
import { ApiError, workOSLoginUrl, type OrganizationRole } from "../../lib/sessionClient";
import "./organization-panel.css";

const assignableRoles: OrganizationRole[] = ["viewer", "member", "builder", "admin", "owner"];

type Tone = "info" | "success" | "error";

function describe(cause: unknown): string {
  if (cause instanceof ApiError && cause.status === 409) return `Not applied: ${cause.message}`;
  if (cause instanceof ApiError && cause.status === 403) return `Not permitted: ${cause.message}`;
  return cause instanceof Error ? cause.message : "The organization request failed.";
}

export function OrganizationPanel({ admin = false }: { admin?: boolean }) {
  const { session, refreshSession } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: Tone } | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("member");
  const [bulk, setBulk] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const canSeeDirectory = hasPermission(session, "view_member_directory");
  const canSeeLifecycle = hasPermission(session, "view_member_lifecycle");
  const canInvite = hasPermission(session, "invite_members");
  const canChangeRoles = hasPermission(session, "change_member_roles");
  const canSuspend = hasPermission(session, "suspend_members");
  const canRestore = hasPermission(session, "restore_members");
  const canRevoke = hasPermission(session, "revoke_members");
  const canManageOwners = hasPermission(session, "manage_owner_lifecycle");
  const bulkParse = useMemo(
    () => parseBulkInvitations(bulk, { allowOwner: canManageOwners }),
    [bulk, canManageOwners],
  );

  const reload = useCallback(async () => {
    if (!session) return;
    setDirectoryError(null);
    const results = await Promise.allSettled([
      listOrganizations(),
      canSeeDirectory ? listMembers(session.organizationId) : Promise.resolve({ items: [], nextCursor: null }),
      admin && canSeeLifecycle
        ? listInvitations(session.organizationId, { status: ["pending"] })
        : Promise.resolve({ items: [], nextCursor: null }),
    ]);
    if (results[0].status === "fulfilled") setOrganizations(results[0].value.items);
    if (results[1].status === "fulfilled") setMembers(results[1].value.items);
    if (results[2].status === "fulfilled") setInvitations(results[2].value.items);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
    if (failure) setDirectoryError(describe(failure.reason));
  }, [session, admin, canSeeDirectory, canSeeLifecycle]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void reload().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reload]);

  async function run(successMessage: string | null, action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await reload();
      if (successMessage) setMessage({ text: successMessage, tone: "success" });
    } catch (cause) {
      setMessage({ text: describe(cause), tone: "error" });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  async function handleSwitch(workosOrganizationId: string) {
    await run(null, async () => {
      await switchOrganization(workosOrganizationId);
      await refreshSession();
      window.location.assign("/home");
    });
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    await run(`Invitation created for ${email}.`, async () => {
      await createInvitation(email, role);
      setEmail("");
    });
  }

  async function handleBulk(event: FormEvent) {
    event.preventDefault();
    if (!bulkParse.invitations.length || bulkParse.errors.length) return;
    await run(null, async () => {
      const result = await createBulkInvitations(bulkParse.invitations);
      setBulk("");
      setMessage({
        text: `${result.success_count} invited; ${result.failure_count} failed.`,
        tone: result.failure_count ? "info" : "success",
      });
    });
  }

  function memberBlockReason(member: MemberSummary): string | null {
    if (member.email && session?.email && member.email === session.email) {
      return "You cannot administer your own membership.";
    }
    if (member.role === "owner" && !canManageOwners) {
      return "Owner memberships can only be changed by an organization owner.";
    }
    return null;
  }

  function confirmKey(action: string, memberId: string) {
    return `${action}:${memberId}`;
  }

  function lifecycleButton(
    member: MemberSummary,
    action: "suspend" | "restore" | "revoke",
    permitted: boolean,
    handler: () => Promise<void>,
  ) {
    const reason = !permitted
      ? `Requires the ${action}_members permission.`
      : memberBlockReason(member);
    const key = confirmKey(action, member.id);
    const needsConfirm = action !== "restore";
    if (needsConfirm && confirming === key) {
      return (
        <span className="organization-confirm" role="group" aria-label={`Confirm ${action}`}>
          <button type="button" className="is-danger" disabled={busy} onClick={() => void run(null, handler)}>
            Confirm {action}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirming(null)}>
            Cancel
          </button>
        </span>
      );
    }
    return (
      <button
        type="button"
        disabled={busy || Boolean(reason)}
        title={reason ?? undefined}
        aria-disabled={Boolean(reason)}
        onClick={() => (needsConfirm ? setConfirming(key) : void run(null, handler))}
      >
        {action.charAt(0).toUpperCase() + action.slice(1)}
      </button>
    );
  }

  if (!session) {
    return (
      <section className="organization-panel">
        <p className="organization-empty">
          Your session has ended. <a href={workOSLoginUrl({ returnTo: "/settings" })}>Sign in again</a> to manage
          organizations.
        </p>
      </section>
    );
  }

  return (
    <section className="organization-panel" aria-labelledby={admin ? "organization-admin-title" : "organization-switch-title"}>
      <div className="organization-panel-head">
        <div>
          <span>WorkOS organization</span>
          <h2 id={admin ? "organization-admin-title" : "organization-switch-title"}>
            {admin ? "Members and invitations" : "Organization context"}
          </h2>
          <p>
            {admin
              ? "Membership, roles, and invitations are enforced server-side; changes apply on the next request."
              : "Switch only among active memberships returned by the server."}
          </p>
        </div>
        <strong aria-label="Your role in this organization">{session.role}</strong>
      </div>
      {message ? (
        <p className="organization-message" data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
      {loading ? (
        <p className="organization-empty" role="status">
          Loading organization data...
        </p>
      ) : organizations.length ? (
        <div className="organization-list">
          {organizations.map((organization) => {
            const active = organization.workosOrganizationId === session.workosOrganizationId;
            return (
              <article key={organization.id}>
                <div>
                  <strong>{organization.name}</strong>
                  <span>
                    {organization.slug} · {organization.role}
                  </span>
                </div>
                <button type="button" disabled={active || busy} onClick={() => void handleSwitch(organization.workosOrganizationId)}>
                  {active ? "Current" : "Switch"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="organization-empty">
          You have no active organization memberships. Accept an invitation from your email, or sign out and sign in
          again to create a personal workspace.
        </p>
      )}
      {directoryError ? (
        <p className="organization-message" data-tone="error" role="alert">
          {directoryError}
        </p>
      ) : null}
      {!loading && canSeeDirectory && members.length ? (
        <div className="organization-members">
          <h3>{canSeeLifecycle ? "Members" : "Member directory"}</h3>
          <ul>
            {members.map((member) => (
              <li key={member.id}>
                <div className="organization-member-identity">
                  <strong>{member.displayName ?? member.email ?? "Unnamed member"}</strong>
                  <span>{member.email}</span>
                </div>
                {admin && canChangeRoles ? (
                  <label className="organization-member-role">
                    <span className="sr-only">Role for {member.email ?? member.id}</span>
                    <select
                      value={member.role}
                      disabled={busy || Boolean(memberBlockReason(member)) || member.state !== "active"}
                      title={memberBlockReason(member) ?? (member.state !== "active" ? "Only active members can change roles." : undefined)}
                      onChange={(event) =>
                        void run(`Role updated to ${event.target.value}.`, async () => {
                          await changeMemberRole(session.organizationId, member.id, event.target.value as OrganizationRole);
                        })
                      }
                    >
                      {assignableRoles.map((value) => (
                        <option key={value} value={value} disabled={value === "owner" && !canManageOwners}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="organization-member-rolelabel">{member.role}</span>
                )}
                {member.state ? <span className="organization-state" data-state={member.state}>{member.state}</span> : null}
                {admin ? (
                  <span className="organization-member-actions">
                    {member.state === "active"
                      ? lifecycleButton(member, "suspend", canSuspend, async () => {
                          await suspendMember(session.organizationId, member.id);
                        })
                      : null}
                    {member.state === "suspended"
                      ? lifecycleButton(member, "restore", canRestore, async () => {
                          await restoreMember(session.organizationId, member.id);
                        })
                      : null}
                    {member.state === "active" || member.state === "suspended"
                      ? lifecycleButton(member, "revoke", canRevoke, async () => {
                          await revokeMember(session.organizationId, member.id);
                        })
                      : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {admin ? (
        !canInvite ? (
          <p className="organization-empty">
            Inviting and administering members requires an administrative role. Your current role is {session.role}.
          </p>
        ) : (
          <>
            <div className="organization-admin-grid">
              <form onSubmit={(event) => void handleInvite(event)}>
                <h3>Invite one member</h3>
                <label>
                  <span>Email</span>
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
                </label>
                <label>
                  <span>Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as OrganizationRole)} disabled={busy}>
                    {assignableRoles.map((value) => (
                      <option
                        key={value}
                        value={value}
                        disabled={value === "owner" && !canManageOwners}
                        title={value === "owner" && !canManageOwners ? "Only an owner can grant the owner role." : undefined}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={busy}>Send invitation</button>
              </form>
              <form onSubmit={(event) => void handleBulk(event)}>
                <h3>Bulk invite</h3>
                <label>
                  <span>One email,role per line (maximum 50). A blank role defaults to member.</span>
                  <textarea
                    required
                    rows={5}
                    value={bulk}
                    onChange={(event) => setBulk(event.target.value)}
                    disabled={busy}
                    placeholder={"person@company.com,member\nlead@company.com,builder"}
                  />
                </label>
                {bulkParse.errors.length ? (
                  <ul className="organization-bulk-errors" aria-label="Bulk invitation errors">
                    {bulkParse.errors.map((error) => (
                      <li key={`${error.line}-${error.value}`}>
                        Line {error.line}: {error.message} Value: {error.value}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button disabled={busy || !bulkParse.invitations.length || Boolean(bulkParse.errors.length)}>
                  Send bulk invitations
                </button>
              </form>
            </div>
            <div className="organization-invitations">
              <h3>Pending invitations</h3>
              {invitations.length ? (
                invitations.map((invitation) => (
                  <article key={invitation.id}>
                    <div>
                      <strong>{invitation.email}</strong>
                      <span>
                        {invitation.role} · {invitation.state}
                        {invitation.expiresAt ? ` · expires ${new Date(invitation.expiresAt).toLocaleDateString()}` : ""}
                      </span>
                    </div>
                    {confirming === confirmKey("uninvite", invitation.id) ? (
                      <span className="organization-confirm" role="group" aria-label="Confirm invitation revocation">
                        <button
                          type="button"
                          className="is-danger"
                          disabled={busy}
                          onClick={() =>
                            void run("Invitation revoked.", async () => {
                              await revokeInvitation(invitation.id);
                            })
                          }
                        >
                          Confirm revoke
                        </button>
                        <button type="button" disabled={busy} onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => setConfirming(confirmKey("uninvite", invitation.id))}>
                        Revoke
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="organization-empty">No pending invitations.</p>
              )}
            </div>
          </>
        )
      ) : null}
    </section>
  );
}
