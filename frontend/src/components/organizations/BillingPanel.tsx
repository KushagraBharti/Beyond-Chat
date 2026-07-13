import { useAuth } from "../../context/AuthContext";
import { getBillingStatus, type BillingV2Status } from "../../features/billing/v2";
import { hasPermission } from "../../features/organizations/permissions";
import { useSection } from "../../features/workspace/hooks";
import "./organization-panel.css";

const entitlementCopy: Record<BillingV2Status["entitlement_state"], string> = {
  enabled: "Your subscription is active and server-verified.",
  grace: "Payment needs attention — access continues during the grace period.",
  disabled: "Paid subscriptions are coming soon. Beyond remains available without a checkout flow for now.",
};

export function BillingPanel() {
  const { session } = useAuth();
  const canManage = hasPermission(session, "manage_organization_settings");
  const status = useSection(getBillingStatus, session?.organizationId ?? "anonymous");

  return (
    <section className="organization-panel" aria-labelledby="billing-panel-title">
      <div className="organization-panel-head">
        <div>
          <span>Billing</span>
          <h2 id="billing-panel-title">Subscription</h2>
          <p>Organization billing will be $30 per active member per month. Payments are not open yet.</p>
        </div>
      </div>
      {status.status === "loading" ? (
        <p className="organization-empty" role="status">Checking billing status…</p>
      ) : status.status === "error" || status.status === "forbidden" || !status.data ? (
        <p className="organization-empty">Billing status is unavailable right now. No paid state was assumed.</p>
      ) : (
        <>
          <p className="organization-message" data-tone={status.data.entitlement_state === "enabled" ? "success" : "info"} role="status">
            {entitlementCopy[status.data.entitlement_state]}
            {status.data.externally_verified && status.data.seat_quantity > 0
              ? ` ${status.data.seat_quantity} paid seat${status.data.seat_quantity === 1 ? "" : "s"}.`
              : ""}
          </p>
          {!canManage ? (
            <p className="organization-empty">Managing billing requires an administrative role.</p>
          ) : (
            <div className="organization-confirm">
              <button type="button" disabled title="Payments are not open yet.">Payments coming soon</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
