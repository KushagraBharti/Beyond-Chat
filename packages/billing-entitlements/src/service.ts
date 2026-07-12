import type { BillingConfiguration, BillingRepository, Clock, MembershipPort, OrganizationEntitlement, OrganizationSubscription, SeatSnapshot, SubscriptionQuantityPort, SubscriptionStatus, VerifiedBillingEvent } from "./contracts.ts";

const statusOf=(value:unknown):SubscriptionStatus => {
  const allowed:SubscriptionStatus[]=["incomplete","trialing","active","past_due","unpaid","canceled","paused"];
  return allowed.includes(value as SubscriptionStatus)?value as SubscriptionStatus:"incomplete";
};
const stringField=(o:Readonly<Record<string,unknown>>,key:string)=>typeof o[key]==="string"?o[key] as string:undefined;
const numberField=(o:Readonly<Record<string,unknown>>,key:string)=>typeof o[key]==="number"?o[key] as number:undefined;
function organizationId(object:Readonly<Record<string,unknown>>):string|undefined {
  const metadata=object.metadata;
  return metadata&&typeof metadata==="object"?stringField(metadata as Readonly<Record<string,unknown>>,"organization_id"):undefined;
}
export function deriveEntitlement(subscription:OrganizationSubscription|undefined,now:Date,graceSeconds:number):OrganizationEntitlement {
  const verified_at=now.toISOString();
  if(!subscription)return {organization_id:"unknown",key:"workspace_access",state:"disabled",reason:"no_verified_subscription",verified_at};
  if(subscription.status==="active"||subscription.status==="trialing")return {organization_id:subscription.organization_id,key:"workspace_access",state:"enabled",source_subscription_id:subscription.subscription_id,reason:`subscription_${subscription.status}`,verified_at};
  if(subscription.status==="past_due"&&graceSeconds>0&&subscription.current_period_end&&now.getTime()<=new Date(subscription.current_period_end).getTime()+graceSeconds*1000)return {organization_id:subscription.organization_id,key:"workspace_access",state:"grace",source_subscription_id:subscription.subscription_id,reason:"payment_past_due_grace",verified_at};
  return {organization_id:subscription.organization_id,key:"workspace_access",state:"disabled",source_subscription_id:subscription.subscription_id,reason:`subscription_${subscription.status}`,verified_at};
}
export class BillingEntitlementService {
  private readonly repository:BillingRepository;
  private readonly clock:Clock;
  private readonly configuration:BillingConfiguration;
  constructor(repository:BillingRepository,clock:Clock,configuration:BillingConfiguration){this.repository=repository;this.clock=clock;this.configuration=configuration;}
  async consumeVerifiedEvent(event:VerifiedBillingEvent):Promise<"applied"|"duplicate"|"ignored_stale"|"ignored_unmapped"> {
    if(await this.repository.beginEvent(event)==="duplicate")return "duplicate";
    try {
      if(!event.type.startsWith("customer.subscription.")){await this.repository.completeEvent(event.id);return "ignored_unmapped";}
      const org=organizationId(event.object);const customer=stringField(event.object,"customer");const id=stringField(event.object,"id");
      if(!org||!customer||!id)throw new Error("Subscription webhook is missing organization metadata or provider identifiers.");
      const current=await this.repository.getSubscription(org);
      if(current&&current.provider_event_created>event.created){await this.repository.completeEvent(event.id);return "ignored_stale";}
      const quantity=Math.max(0,numberField(event.object,"quantity")??numberField(event.object,"items_quantity")??current?.quantity??0);
      const periodEnd=numberField(event.object,"current_period_end");
      const subscription:OrganizationSubscription={organization_id:org,customer_id:customer,subscription_id:id,status:event.type.endsWith(".deleted")?"canceled":statusOf(event.object.status),quantity,provider_event_created:event.created,current_period_end:periodEnd?new Date(periodEnd*1000).toISOString():undefined,cancel_at_period_end:event.object.cancel_at_period_end===true};
      await this.repository.saveSubscription(subscription);
      await this.repository.saveEntitlement(deriveEntitlement(subscription,this.clock.now(),this.configuration.past_due_grace_seconds));
      await this.repository.completeEvent(event.id);return "applied";
    } catch(error){await this.repository.failEvent(event.id,error instanceof Error?error.message:"unknown_error");throw error;}
  }
}
export async function reconcileSeats(input:{organization_id:string;subscription:OrganizationSubscription;memberships:MembershipPort;quantities:SubscriptionQuantityPort;repository:BillingRepository;clock:Clock;apply:boolean}):Promise<SeatSnapshot>{
  const billable_members=await input.memberships.countBillableMembers(input.organization_id);
  const snapshot={organization_id:input.organization_id,billable_members,subscription_quantity:input.subscription.quantity,observed_at:input.clock.now().toISOString(),matches:billable_members===input.subscription.quantity};
  await input.repository.saveSeatSnapshot(snapshot);
  if(!snapshot.matches&&input.apply)await input.quantities.setQuantity(input.subscription.subscription_id,billable_members,`seat-reconcile:${input.organization_id}:${snapshot.observed_at.slice(0,10)}`);
  return snapshot;
}
