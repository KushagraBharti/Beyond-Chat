"""Provider-neutral Phase 11 automation ports.

The HTTP composition root intentionally lives outside this package and is not
wired until production persistence, scheduler, runtime, and webhook secrets are
available.
"""

from .ports import (
    AutomationPersistencePort,
    AutomationRuntimePort,
    ComposioTriggerPort,
    NotificationPort,
    SchedulerPort,
)

__all__ = [
    "AutomationPersistencePort",
    "AutomationRuntimePort",
    "ComposioTriggerPort",
    "NotificationPort",
    "SchedulerPort",
]
