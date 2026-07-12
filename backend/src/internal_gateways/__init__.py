"""Security boundary primitives for internal runtime model and tool gateways."""

from .gateway import InternalGateway
from .models import (
    AuditOutcome,
    AuthoritativeRunState,
    CapabilityGrant,
    GatewayInvocation,
    GatewayResult,
)
from .tokens import HmacKeyRing, RunCapabilityTokenCodec, TokenValidationError

__all__ = [
    "AuditOutcome",
    "AuthoritativeRunState",
    "CapabilityGrant",
    "GatewayInvocation",
    "GatewayResult",
    "HmacKeyRing",
    "InternalGateway",
    "RunCapabilityTokenCodec",
    "TokenValidationError",
]
