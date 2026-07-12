export const BILLING_SCHEMA_VERSION = "1.0" as const;
export const DEFAULT_SEAT_PRICE = Object.freeze({ currency: "usd", unit_amount_cents: 3000, interval: "month" } as const);

export type SubscriptionStatus = "incomplete" | "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "paused";
export type EntitlementState = "enabled" | "grace" | "disabled";
export interface BillingConfiguration {
  readonly enabled: boolean;
  readonly livemode: boolean;
  readonly price_id?: string;
  readonly price: typeof DEFAULT_SEAT_PRICE;
  readonly past_due_grace_seconds: number;
}
export const DISABLED_BILLING_CONFIGURATION: BillingConfiguration = Object.freeze({
  enabled: false, livemode: false, price: DEFAULT_SEAT_PRICE, past_due_grace_seconds: 0,
});
export interface VerifiedBillingEvent {
  readonly id: string;
  readonly type: string;
  readonly created: number;
  readonly livemode: boolean;
  readonly object: Readonly<Record<string, unknown>>;
}
export interface OrganizationSubscription {
  readonly organization_id: string;
  readonly customer_id: string;
  readonly subscription_id: string;
  readonly status: SubscriptionStatus;
  readonly quantity: number;
  readonly provider_event_created: number;
  readonly current_period_end?: string;
  readonly cancel_at_period_end: boolean;
}
export interface OrganizationEntitlement {
  readonly organization_id: string;
  readonly key: "workspace_access";
  readonly state: EntitlementState;
  readonly source_subscription_id?: string;
  readonly reason: string;
  readonly verified_at: string;
}
export interface SeatSnapshot {
  readonly organization_id: string;
  readonly billable_members: number;
  readonly subscription_quantity: number;
  readonly observed_at: string;
  readonly matches: boolean;
}
export interface BillingRepository {
  beginEvent(event: VerifiedBillingEvent): Promise<"accepted" | "duplicate">;
  completeEvent(event_id: string): Promise<void>;
  failEvent(event_id: string, reason: string): Promise<void>;
  getSubscription(organization_id: string): Promise<OrganizationSubscription | undefined>;
  saveSubscription(value: OrganizationSubscription): Promise<void>;
  saveEntitlement(value: OrganizationEntitlement): Promise<void>;
  saveSeatSnapshot(value: SeatSnapshot): Promise<void>;
}
export interface MembershipPort { countBillableMembers(organization_id: string): Promise<number>; }
export interface SubscriptionQuantityPort { setQuantity(subscription_id: string, quantity: number, idempotency_key: string): Promise<void>; }
export interface CheckoutPort { create(input: { organization_id:string; customer_id?:string; quantity:number; price_id:string; success_url:string; cancel_url:string; idempotency_key:string }): Promise<{ url:string }>; }
export interface PortalPort { create(input: { organization_id:string; customer_id:string; return_url:string }): Promise<{ url:string }>; }
export interface Clock { now(): Date; }
