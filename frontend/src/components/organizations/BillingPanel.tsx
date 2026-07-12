import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getBillingStatus, openPortal, startCheckout, type BillingV2Status } from "../../features/billing/v2";
import { hasPermission } from "../../features/organizations/permissions";
import { useSection } from "../../features/workspace/hooks";
import { ApiError } from "../../lib/sessionClient";
import "./organization-panel.css";

const entitlementCopy: Record<BillingV2Status["entitlement_state"], string> = {
  enabled: "Your subscription is active and server-verified.",
  grace: "Payment needs attention — access continues during the grace period.",
  disabled: "No verified subscription exists. Paid features stay off until checkout completes and the webhook is verified.",
};

export function BillingPanel() {
  const { session } = useAuth();
  const canManage = hasPermission(session, "manage_organization_settings");
  const status = useSection(getBillingStatus, session?.organizationId ?? "anonymous");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function go(action: () => Promise<{ url: string }>) {
    setBusy(true);
    setMessage(null);
    try {
      const { url } = await action();
      window.location.assign(url);
    } catch (cause) {
      setMessage(
        cause instanceof ApiError && cause.status === 503
          ? "Billing is not activated for this deployment yet."
          : cause instanceof Error ? cause.message : "The billing request failed.",
      );
      setBusy(false);
    }
  }

  return (
    <section className="organization-panel" aria-labelledby="billing-panel-title">
      <div className="organization-panel-head">
        <div>
          <span>Billing</span>
          <h2 id="billing-panel-title">Subscription</h2>
          <p>$30 per active member per month. Seats follow the canonical member directory; entitlement is verified server-side.</p>
        </div>
      </div>
      {message ? <p className="organization-message" data-tone="error" role="alert">{message}</p> : null}
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
              {status.data.checkout_enabled ? (
                <button type="button" disabled={busy} onClick={() => void go(startCheckout)}>
                  Start subscription checkout
                </button>
              ) : (
                <button type="button" disabled title="Checkout is not activated for this deployment.">
                  Checkout unavailable
                </button>
              )}
              {status.data.portal_enabled ? (
                <button type="button" disabled={busy} onClick={() => void go(openPortal)}>
                  Open billing portal
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}
