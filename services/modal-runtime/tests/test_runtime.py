from __future__ import annotations

import json
from pathlib import Path

import pytest

from beyond_modal_runtime.jobs import finance_summary
from beyond_modal_runtime.sidecar import DurableEventLog, assert_safe_environment


def test_durable_event_log_replays_after_reopen(tmp_path: Path) -> None:
    path = tmp_path / "events.ndjson"
    first = DurableEventLog(path)
    assert first.append({"type": "started"})["sequence"] == 1
    second = DurableEventLog(path)
    assert second.append({"type": "completed"})["sequence"] == 2
    assert [event["sequence"] for event in second.replay(0)] == [1, 2]
    assert [event["sequence"] for event in second.replay(1)] == [2]


def test_master_credentials_fail_closed() -> None:
    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        assert_safe_environment({"OPENROUTER_API_KEY": "never-in-sandbox"})
    assert_safe_environment({"BEYOND_RUN_TOKEN": "short-lived"})


def test_finance_summary_is_deterministic(tmp_path: Path) -> None:
    source = tmp_path / "amounts.csv"
    target = tmp_path / "summary.json"
    source.write_text("name,amount\na,2\nb,4\n", encoding="utf-8")
    result = finance_summary(source, target)
    assert result["sum"] == 6
    assert json.loads(target.read_text(encoding="utf-8"))["average"] == 3
