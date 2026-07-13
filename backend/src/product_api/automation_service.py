"""Phase 11 automation lifecycle: versions, idempotent triggers, retries.

Semantics locked here:

- **Pinned configuration.** Triggers never run the mutable draft. Publishing
  appends an immutable ``automation_version`` (config + SHA-256 digest);
  every non-test execution records the version it was pinned to.
- **Idempotent enqueue.** Every trigger path (manual, signed webhook, Composio
  ingestion, scheduler tick, retry) derives a deterministic trigger key that
  becomes the ``create_once`` idempotency key, so duplicate deliveries and
  concurrent scheduler ticks are collapsed by the persistence layer itself —
  the duplicate-trigger external-side-effect proof rests on this.
- **Overlap policy.** ``configuration.overlap``: ``skip`` (default) refuses a
  new execution while one is queued/running; ``allow`` does not.
- **Service principal + owner offboarding.** Executions are attributed to the
  automation's owner as its service principal. If that owner's membership is
  no longer active, triggers pause the automation (reason recorded) instead
  of running work for a departed human.
- **Retry / dead-letter.** Retrying a failed execution appends a new attempt;
  attempts beyond ``max_attempts`` (default 3) append a ``dead_letter``
  record. Nothing is mutated in place — history is append-only.
- **Destinations.** Test executions always carry ``destinations_suppressed``;
  real delivery is the runtime's job and is never simulated here.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from os import environ
from typing import Any, Callable, Mapping

from ..authorization.policy import OrganizationRole, Principal
from ..product_persistence import Scope
from .service import ProductService, digest

DEFAULT_MAX_ATTEMPTS = 3
MIN_SCHEDULE_INTERVAL_MINUTES = 5


class AutomationTriggerError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message


class WebhookSignatureError(ValueError):
    pass


# --- signing -----------------------------------------------------------------

def automation_webhook_secret(automation_id: str) -> str:
    master = environ.get("AUTOMATION_WEBHOOK_SIGNING_KEY", "")
    if not master:
        raise AutomationTriggerError(
            "signing_unconfigured", "AUTOMATION_WEBHOOK_SIGNING_KEY is not configured.")
    return hmac.new(master.encode(), f"automation:{automation_id}".encode(), hashlib.sha256).hexdigest()


def verify_signed_trigger(payload: bytes, signature_header: str, secret: str,
                          *, tolerance_seconds: int = 300,
                          now: Callable[[], float] = time.time) -> dict[str, Any]:
    """Stripe-style ``t=<unix>,v1=<hmac>`` verification with a replay window."""

    fields: dict[str, list[str]] = {}
    for item in signature_header.split(","):
        key, separator, value = item.partition("=")
        if separator:
            fields.setdefault(key.strip(), []).append(value.strip())
    try:
        timestamp = int(fields["t"][0])
    except (KeyError, ValueError, IndexError) as exc:
        raise WebhookSignatureError("Missing trigger signature timestamp.") from exc
    if abs(now() - timestamp) > tolerance_seconds:
        raise WebhookSignatureError("Trigger signature timestamp is outside the replay window.")
    signed = str(timestamp).encode() + b"." + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in fields.get("v1", [])):
        raise WebhookSignatureError("Invalid trigger signature.")
    try:
        parsed = json.loads(payload)
        if not isinstance(parsed, dict):
            raise TypeError("body")
        return parsed
    except (json.JSONDecodeError, TypeError) as exc:
        raise WebhookSignatureError("Trigger payload is not a JSON object.") from exc


# --- ownership guard ----------------------------------------------------------

class OwnerGuard:
    """Answers: is this profile still an active member of the organization?"""

    def __init__(self, lookup: Callable[[str, str], bool]) -> None:
        self._lookup = lookup

    def is_active(self, organization_id: str, profile_id: str) -> bool:
        return self._lookup(organization_id, profile_id)


def supabase_owner_guard() -> OwnerGuard:
    from ..supabase_service import supabase_service

    def lookup(organization_id: str, profile_id: str) -> bool:
        client = supabase_service.client()
        if client is None:
            return False  # fail closed: no canonical database, no service runs
        rows = (client.table("organization_memberships").select("id")
                .eq("organization_id", organization_id).eq("profile_id", profile_id)
                .eq("state", "active").limit(1).execute().data or [])
        return bool(rows)

    return OwnerGuard(lookup)


# --- lifecycle ----------------------------------------------------------------

class AutomationLifecycle:
    def __init__(self, service: ProductService, owner_guard: OwnerGuard) -> None:
        self.service = service
        self.owner_guard = owner_guard

    # -- versions --

    def publish_version(self, *, scope: Scope, principal: Principal,
                        automation_id: str, idempotency_key: str) -> dict[str, Any]:
        automation = self.service.get("automation", automation_id, scope)
        config = dict(automation["payload"])
        pinned = {
            "parent_id": automation_id,
            "config": config,
            "config_digest": f"sha256:{digest(config)}",
            "service_principal_id": automation["created_by"],
        }
        return self.service.append(
            kind="automation_version", parent_kind="automation", parent_id=automation_id,
            scope=scope, principal=principal, idempotency_key=idempotency_key,
            payload=pinned, state="published", minimum=OrganizationRole.BUILDER)

    def latest_published_version(self, *, scope: Scope, automation_id: str) -> dict[str, Any] | None:
        versions = [item for item in self.service.list("automation_version", scope, states=("published",))
                    if (item.get("parent_id") or item["payload"].get("parent_id")) == automation_id]
        return versions[0] if versions else None

    # -- enqueue --

    def _service_principal(self, automation: Mapping[str, Any], scope: Scope) -> Principal:
        owner = str(automation.get("created_by") or "")
        return Principal(
            profile_id=owner, subject=f"automation:{automation['id']}",
            issuer="beyond:automation-service", organization_id=scope.organization_id,
            workos_organization_id="", role=OrganizationRole.BUILDER)

    def _open_executions(self, scope: Scope, automation_id: str) -> list[dict[str, Any]]:
        rows = self.service.list("automation_execution", scope, states=("queued", "running"))
        return [row for row in rows
                if (row.get("parent_id") or row["payload"].get("parent_id")) == automation_id]

    def enqueue(self, *, scope: Scope, automation_id: str, trigger_source: str,
                trigger_key: str, trigger_payload: Mapping[str, Any] | None = None,
                principal: Principal | None = None, test: bool = False,
                attempt: int = 1, expected_state: str = "queued",
                bypass_overlap: bool = False) -> dict[str, Any]:
        automation = self.service.get("automation", automation_id, scope)
        if automation["state"] == "paused" and not test:
            raise AutomationTriggerError("automation_paused", "The automation is paused.")
        if automation["state"] == "archived":
            raise AutomationTriggerError("automation_archived", "The automation is archived.")

        actor = principal or self._service_principal(automation, scope)
        if principal is None:
            owner = str(automation.get("created_by") or "")
            if not owner or not self.owner_guard.is_active(scope.organization_id, owner):
                # Owner offboarding: pause rather than run work for a departed
                # human; the pause is visible in the failure/automation views.
                self.service.update(
                    kind="automation", record_id=automation_id, scope=scope,
                    principal=self._service_principal(automation, scope),
                    expected_version=int(automation["version"]), state="paused",
                    payload={"paused_reason": "owner_offboarded"},
                    minimum=OrganizationRole.BUILDER)
                raise AutomationTriggerError(
                    "owner_offboarded",
                    "The automation owner is no longer an active member; the automation was paused.")

        version = self.latest_published_version(scope=scope, automation_id=automation_id)
        if version is None and not test:
            raise AutomationTriggerError(
                "no_published_version", "Publish an automation version before triggering it.")

        overlap = str(automation["payload"].get("configuration", {}).get("overlap", "skip"))
        if overlap != "allow" and not test and not bypass_overlap \
                and self._open_executions(scope, automation_id):
            raise AutomationTriggerError(
                "overlap_skipped", "An execution is already queued or running (overlap policy: skip).")

        payload: dict[str, Any] = {
            "parent_id": automation_id,
            "trigger": trigger_source,
            "trigger_key": trigger_key,
            "attempt": attempt,
            "test": test,
            "pinned_version_id": version["id"] if version else None,
            "pinned_config_digest": version["payload"]["config_digest"] if version else None,
            "service_principal_id": str(automation.get("created_by") or ""),
        }
        if test:
            payload["destinations_suppressed"] = True
        if trigger_payload is not None:
            payload["trigger_payload_digest"] = f"sha256:{digest(dict(trigger_payload))}"
        return self.service.append(
            kind="automation_execution", parent_kind="automation", parent_id=automation_id,
            scope=scope, principal=actor, idempotency_key=trigger_key,
            payload=payload, state=expected_state)

    # -- retry / dead-letter --

    def retry(self, *, scope: Scope, principal: Principal, automation_id: str,
              execution_id: str) -> dict[str, Any]:
        execution = self.service.get("automation_execution", execution_id, scope)
        if (execution.get("parent_id") or execution["payload"].get("parent_id")) != automation_id:
            raise KeyError("not_found")
        if execution["state"] != "failed":
            raise AutomationTriggerError("not_retryable", "Only failed executions can be retried.")
        automation = self.service.get("automation", automation_id, scope)
        max_attempts = int(automation["payload"].get("configuration", {}).get(
            "max_attempts", DEFAULT_MAX_ATTEMPTS))
        attempt = int(execution["payload"].get("attempt", 1)) + 1
        base_key = str(execution["payload"].get("trigger_key") or execution_id)
        if attempt > max_attempts:
            return self.enqueue(
                scope=scope, automation_id=automation_id, trigger_source="retry",
                trigger_key=f"{base_key}:dead:{attempt}", principal=principal,
                test=bool(execution["payload"].get("test")), attempt=attempt,
                expected_state="dead_letter", bypass_overlap=True)
        return self.enqueue(
            scope=scope, automation_id=automation_id, trigger_source="retry",
            trigger_key=f"{base_key}:attempt:{attempt}", principal=principal,
            test=bool(execution["payload"].get("test")), attempt=attempt,
            bypass_overlap=True)

    # -- scheduler --

    def due_window(self, automation: Mapping[str, Any], now_epoch: int) -> int | None:
        trigger = automation["payload"].get("trigger")
        if not isinstance(trigger, dict) or trigger.get("kind") != "schedule":
            return None
        try:
            interval_minutes = max(MIN_SCHEDULE_INTERVAL_MINUTES, int(trigger["interval_minutes"]))
        except (KeyError, TypeError, ValueError):
            return None
        return now_epoch // (interval_minutes * 60)

    def scheduler_tick(self, automations: list[dict[str, Any]], *, now_epoch: int) -> dict[str, int]:
        """Enqueue the current window for every due schedule, idempotently.

        Concurrent or repeated ticks are safe: the window index is part of the
        trigger key, so the persistence layer collapses duplicates.
        """

        report = {"due": 0, "enqueued": 0, "skipped": 0}
        for automation in automations:
            window = self.due_window(automation, now_epoch)
            if window is None:
                continue
            report["due"] += 1
            scope = Scope(automation["scope"]["organization_id"],
                          automation["scope"]["project_id"], automation["scope"]["team_id"])
            try:
                self.enqueue(
                    scope=scope, automation_id=automation["id"], trigger_source="schedule",
                    trigger_key=f"sched:{automation['id']}:{window}")
                report["enqueued"] += 1
            except (AutomationTriggerError, KeyError):
                report["skipped"] += 1
        return report
