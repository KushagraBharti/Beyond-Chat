from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ParityObservation:
    scenario: str
    legacy_correct: bool
    modal_correct: bool
    source_overlap: float
    output_similarity: float
    modal_cost_ratio: float
    modal_latency_ratio: float
    cancellation_ok: bool
    recovery_ok: bool


@dataclass(frozen=True)
class CanaryThresholds:
    minimum_source_overlap: float = 0.9
    minimum_output_similarity: float = 0.9
    maximum_cost_ratio: float = 1.5
    maximum_latency_ratio: float = 1.5


def evaluate_parity(observations: list[ParityObservation], thresholds: CanaryThresholds = CanaryThresholds()) -> dict:
    failures: list[str] = []
    for item in observations:
        if not item.legacy_correct or not item.modal_correct:
            failures.append(f"{item.scenario}:correctness")
        if item.source_overlap < thresholds.minimum_source_overlap:
            failures.append(f"{item.scenario}:sources")
        if item.output_similarity < thresholds.minimum_output_similarity:
            failures.append(f"{item.scenario}:output")
        if item.modal_cost_ratio > thresholds.maximum_cost_ratio:
            failures.append(f"{item.scenario}:cost")
        if item.modal_latency_ratio > thresholds.maximum_latency_ratio:
            failures.append(f"{item.scenario}:latency")
        if not item.cancellation_ok or not item.recovery_ok:
            failures.append(f"{item.scenario}:lifecycle")
    return {"passed": not failures, "failures": failures, "required_traffic_percent": 0 if failures else "human-authorized-small-canary"}

