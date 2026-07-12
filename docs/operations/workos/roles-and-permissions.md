# WorkOS Roles and Internal Authorization

WorkOS owns authentication, organizations, membership lifecycle, invitations, and coarse organization roles. Beyond Chat remains authoritative for project, agent, connection, memory, knowledge, output, and action-level authorization.

## Required coarse roles

| Role | Coarse rights |
|---|---|
| Owner | Billing, organization administration, members, agents, projects, and review |
| Admin | Organization administration, members, agents, projects, and review; no owner-only billing/transfer/delete |
| Builder | Publish/use agents, create/view projects, and review outputs |
| Member | Use agents, create/view projects, and review outputs |
| Viewer | View permitted projects and review outputs; no default mutation |

## Minimal permission vocabulary

Use schema-valid WorkOS slugs representing these semantics:

- organization management
- member management
- billing management
- agent publishing
- agent use
- project creation
- project viewing
- output review

The exact provider slugs must be recorded after creation. Do not silently repurpose WorkOS's existing `widgets:*` permissions as product permissions.

## Assignment matrix

| Permission semantic | Owner | Admin | Builder | Member | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Organization management | Yes | Yes | No | No | No |
| Member management | Yes | Yes | No | No | No |
| Billing management | Yes | No | No | No | No |
| Agent publishing | Yes | Yes | Yes | No | No |
| Agent use | Yes | Yes | Yes | Yes | No |
| Project creation | Yes | Yes | Yes | Yes | No |
| Project viewing | Yes | Yes | Yes | Yes | Yes |
| Output review | Yes | Yes | Yes | Yes | Yes |

## Current provider state

The canonical environment currently exposes only default role slugs `admin` and `member` plus WorkOS widget-management permissions. No role or permission mutation succeeded during the baseline because the Production environment is not enabled and the non-interactive MCP mutation path did not receive confirmation.

## Enforcement boundary

A WorkOS role is never sufficient by itself. Every protected operation must also intersect:

`organization membership ∩ internal role policy ∩ resource grant ∩ current project ∩ connection ownership ∩ agent/tool policy`

The backend must reject stale or revoked memberships even when an old token still contains a role claim. RLS and Storage policies must use canonical internal profile/organization/project membership data rather than trusting client-supplied role names.
