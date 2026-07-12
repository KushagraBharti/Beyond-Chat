"""Transparent Modal sandbox unit-economics calculator."""

from __future__ import annotations

from dataclasses import asdict, dataclass

from .config import MODAL_PRICES


@dataclass(frozen=True)
class CostEstimate:
    cpu: float
    memory_gib: float
    duration_seconds: float
    cpu_cost_usd: float
    memory_cost_usd: float
    total_cost_usd: float

    def to_dict(self) -> dict[str, float]:
        return asdict(self)


def estimate_sandbox_cost(cpu: float, memory_mb: int, duration_seconds: float) -> CostEstimate:
    if cpu <= 0 or memory_mb <= 0 or duration_seconds < 0:
        raise ValueError("cpu and memory must be positive; duration cannot be negative")
    memory_gib = memory_mb / 1024
    cpu_cost = cpu * duration_seconds * MODAL_PRICES["cpu_core_second_usd"]
    memory_cost = memory_gib * duration_seconds * MODAL_PRICES["memory_gib_second_usd"]
    return CostEstimate(
        cpu=cpu,
        memory_gib=memory_gib,
        duration_seconds=duration_seconds,
        cpu_cost_usd=round(cpu_cost, 8),
        memory_cost_usd=round(memory_cost, 8),
        total_cost_usd=round(cpu_cost + memory_cost, 8),
    )
