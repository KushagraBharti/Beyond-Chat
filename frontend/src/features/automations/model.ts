export type AutomationUiState = "active" | "paused" | "disabled";
export type ExecutionUiState = "queued" | "running" | "awaiting_approval" | "completed" | "retrying" | "failed" | "dead_letter" | "skipped";
export interface AutomationSummary { readonly id:string; readonly name:string; readonly state:AutomationUiState; readonly trigger:string; readonly version:string; readonly owner:string; readonly principal:string; readonly lastRun?:string; readonly nextRun?:string; readonly failureCount:number; readonly costCents:number; readonly costLimitCents:number; }
export interface AutomationRun { readonly id:string; readonly state:ExecutionUiState; readonly trigger:string; readonly version:string; readonly startedAt:string; readonly attempt:number; readonly costCents:number; readonly detail:string; }
export interface AutomationApproval { readonly id:string; readonly automationName:string; readonly action:string; readonly expiresAt:string; readonly status:"pending"|"approved"|"denied"|"expired"; }
export interface AutomationIntegrationState { readonly persistence:"in_memory"|"connected"; readonly runtime:"simulated"|"connected"; readonly scheduler:"not_connected"|"connected"; readonly composio:"not_connected"|"connected"; readonly notifications:"in_memory"|"connected"; }
export interface AutomationDashboardData { readonly automations:readonly AutomationSummary[]; readonly runs:readonly AutomationRun[]; readonly approvals:readonly AutomationApproval[]; readonly integrations:AutomationIntegrationState; }
export interface AutomationUiAdapter { load():Promise<AutomationDashboardData>; pause(id:string):Promise<void>; resume(id:string):Promise<void>; test(id:string,input:Readonly<Record<string,unknown>>):Promise<AutomationRun>; retry(runId:string):Promise<void>; resolveApproval(id:string,decision:"approved"|"denied"):Promise<void>; }
export const EMPTY_AUTOMATION_DATA:AutomationDashboardData={automations:[],runs:[],approvals:[],integrations:{persistence:"in_memory",runtime:"simulated",scheduler:"not_connected",composio:"not_connected",notifications:"in_memory"}};
export class DemoAutomationAdapter implements AutomationUiAdapter {
  private data:AutomationDashboardData;
  constructor(initial:AutomationDashboardData=EMPTY_AUTOMATION_DATA){this.data=initial;}
  async load(){return this.data;}
  async pause(id:string){this.data={...this.data,automations:this.data.automations.map(a=>a.id===id?{...a,state:"paused"}:a)};}
  async resume(id:string){this.data={...this.data,automations:this.data.automations.map(a=>a.id===id?{...a,state:"active"}:a)};}
  async test(id:string,input:Readonly<Record<string,unknown>>){const automation=this.data.automations.find(a=>a.id===id);if(!automation)throw new Error("Automation not found.");const run:AutomationRun={id:`test_${Date.now()}`,state:"completed",trigger:"Manual test",version:automation.version,startedAt:new Date().toISOString(),attempt:1,costCents:0,detail:`Simulated locally with ${Object.keys(input).length} input field(s). No external action was sent.`};this.data={...this.data,runs:[run,...this.data.runs]};return run;}
  async retry(runId:string){if(!this.data.runs.some(r=>r.id===runId))throw new Error("Run not found.");}
  async resolveApproval(id:string,decision:"approved"|"denied"){this.data={...this.data,approvals:this.data.approvals.map(a=>a.id===id?{...a,status:decision}:a)};}
}
