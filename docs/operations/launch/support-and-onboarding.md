# Support, onboarding, and connection troubleshooting

## Intake

Collect organization ID, actor ID, correlation/run ID, UTC time, affected capability, user-visible error, scope, and reproduction steps. Do not request passwords, API keys, webhook signatures, payment details, or raw sensitive documents. Classify security/privacy reports immediately and follow the incident runbook.

## Normal onboarding

Confirm invited domain/user, organization selection, role, project access, allowed agent/source, first durable task, reviewable output, and where help is found. Billing is omitted until its activation gate passes. Engineering intervention for a normal path is a pilot failure signal and must be tracked.

## Connection troubleshooting

Check current membership and resource grant, connection owner, provider health, token/reference status (never value), allowed scopes, last successful sync/action, rate limit, tombstone/revocation, and correlation trace. Reauthorize through the official provider flow; never paste credentials into tickets. For access mismatches, deny by default and escalate rather than broadening scope.

## Escalation

P0: confirmed/suspected security, cross-tenant access, data loss, erroneous charge, or uncontrolled external action. P1: organization-wide outage or blocked onboarding. P2: degraded feature/workaround exists. P3: question/cosmetic issue. Every resolution records cause, customer impact, remediation, owner, and follow-up without sensitive payloads.
