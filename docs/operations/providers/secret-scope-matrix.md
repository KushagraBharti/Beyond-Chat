# Secret Scope Matrix

| Variable family | Frontend | Backend/control plane | Modal sandbox | Legacy runner | CI/operator |
|---|---:|---:|---:|---:|---:|
| VITE Supabase URL/publishable key | Allow | Optional | Deny | Deny | Allow for smoke tests |
| Supabase service role/database password | Deny | Allow only when required | Deny | Deny | Migration operator only |
| OpenRouter | Deny | Allow | Per-run derived access only in target design | Temporary allow | Deployment operator |
| Exa | Deny | Allow | Prefer gateway; direct only for approved image | Temporary finance/research allow | Deployment operator |
| Financial Datasets | Deny | Allow | Prefer finance gateway | Temporary allow | Deployment operator |
| Composio scoped runtime key | Deny | Allow | Deny; calls go through policy gateway | Deny | Integration operator |
| Composio full-access key | Deny | Deny | Deny | Deny | Break-glass admin only |
| WorkOS API/cookie/webhook secrets | Deny | Allow | Deny | Deny | Identity operator |
| WorkOS client ID/public redirect config | Allow if SDK needs | Allow | Deny | Deny | Identity operator |
| Stripe secret/webhook secret | Deny | Allow | Deny | Deny | Billing operator |
| Runner shared secret | Deny | Temporary allow | Deny | Temporary allow | Runtime operator |
| Modal service identity | Deny | Allow minimum control-plane operations | Inject per-run capability, never master token | Deny | Runtime operator |

## Enforcement rules

1. Vite exposes only `VITE_*`, but unprefixed secrets still do not belong in a frontend project’s build environment.
2. A sandbox receives scoped, short-lived capabilities or gateway access—not provider master keys.
3. Sensitive Vercel variables are write-only. A blank `vercel env pull` value is not evidence of runtime emptiness; verify through metadata plus a runtime-side check.
4. Environment names are not identities. Record account/team/project/environment IDs before every mutation.
5. Never use a local credential merely because it authenticates; verify it belongs to the intended immutable account first.
6. Public/publishable keys are not authorization. RLS, API authorization, and tenant checks remain mandatory.

