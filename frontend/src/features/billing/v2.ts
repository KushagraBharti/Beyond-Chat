import { sessionRequest } from "../../lib/sessionClient";

/** billing_v2 client. Entitlement truth is server-computed; the UI never
 * derives paid state locally and never renders checkout/portal controls the
 * backend reports as unavailable. */

export interface BillingV2Status {
  organization_id: string;
  subscription_status: string;
  entitlement_state: "enabled" | "grace" | "disabled";
  seat_quantity: number;
  billable_members: number;
  checkout_enabled: boolean;
  portal_enabled: boolean;
  externally_verified: boolean;
}

export function getBillingStatus() {
  return sessionRequest<BillingV2Status>("/api/v2/billing/status");
}

export function startCheckout() {
  return sessionRequest<{ url: string }>("/api/v2/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ idempotency_key: crypto.randomUUID() }),
  });
}

export function openPortal() {
  return sessionRequest<{ url: string }>("/api/v2/billing/portal", { method: "POST" });
}
