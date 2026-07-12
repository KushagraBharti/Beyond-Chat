export type BillingEntitlementState="enabled"|"grace"|"disabled";
export interface BillingStatus { readonly organizationId:string;readonly subscriptionStatus:string;readonly entitlementState:BillingEntitlementState;readonly billableMembers:number;readonly subscriptionSeats:number;readonly currentPeriodEnd?:string;readonly checkoutEnabled:boolean;readonly portalEnabled:boolean;readonly externallyVerified:boolean;readonly failureReason?:string; }
export interface BillingAdapter { loadStatus():Promise<BillingStatus>;beginCheckout(idempotencyKey:string):Promise<string>;openPortal():Promise<string>; }
export const DISABLED_BILLING_STATUS:BillingStatus={organizationId:"unavailable",subscriptionStatus:"not_configured",entitlementState:"disabled",billableMembers:0,subscriptionSeats:0,checkoutEnabled:false,portalEnabled:false,externallyVerified:false,failureReason:"Paid billing has not been activated."};
export class DisabledBillingAdapter implements BillingAdapter {
  async loadStatus(){return DISABLED_BILLING_STATUS;}
  async beginCheckout(){throw new Error("Paid checkout is not enabled.");}
  async openPortal(){throw new Error("Billing portal is not enabled.");}
}
export class ServerBillingAdapter implements BillingAdapter {
  constructor(private readonly request:(path:string,init?:RequestInit)=>Promise<Response>){ }
  async loadStatus(){const response=await this.request("/api/v2/billing/status");if(!response.ok)throw new Error("Unable to load verified billing status.");return await response.json() as BillingStatus;}
  async beginCheckout(idempotencyKey:string){const response=await this.request("/api/v2/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idempotency_key:idempotencyKey})});if(!response.ok)throw new Error("Checkout is unavailable.");const body=await response.json() as {url:string};return body.url;}
  async openPortal(){const response=await this.request("/api/v2/billing/portal",{method:"POST"});if(!response.ok)throw new Error("Billing portal is unavailable.");const body=await response.json() as {url:string};return body.url;}
}
