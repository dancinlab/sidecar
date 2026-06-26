"""{{SLUG_SNAKE}} — shared runnable harness for HYPOTHESES hypothesis cards.

Deterministic, dependency-free (stdlib only) primitives for the {{NAME}} problem.
HYPOTHESES cards reference these functions from their per-hypothesis run scripts
under `state/<hX>/` (shared machinery lives in repo-root `tool/`, per-hypothesis
runs live in `state/`).

Every function is a closed-form public relation — no fitting, no hidden constants
beyond documented defaults. All inputs are explicit so a card's falsifiers can be
evaluated against the returned numbers. Replace the placeholder primitives below
with the domain relations this campaign actually needs.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Document any physical/domain constants here (explicit, no hidden fitting).
# e.g. R_GAS = 8.314462618  # universal gas constant (J/mol/K)


# --- generic closed-form primitives (replace with domain relations) -----------

def ratio(value: float, baseline: float) -> float:
    """Improvement factor of a measured value vs a baseline: value / baseline."""
    if baseline == 0:
        raise ValueError("baseline must be non-zero")
    return value / baseline


def headroom(current: float, floor: float) -> float:
    """Reduction factor between a current value and a theoretical floor:
    current / floor (>1 means there is room to improve toward the floor)."""
    if floor <= 0:
        raise ValueError(f"floor must be > 0: {floor}")
    return current / floor


def log_ratio(x: float) -> float:
    """Natural-log primitive kept as a worked example of using `math` (a
    thermodynamic-style floor is often R·T·ln(1/x)). Replace as needed."""
    if not (0.0 < x < 1.0):
        raise ValueError(f"x must be in (0,1): {x}")
    return math.log(1.0 / x)


# --- falsifier harness --------------------------------------------------------

@dataclass
class Falsifier:
    """One pre-registered, measurable falsifier. `predicate(metrics) -> bool`
    returns True when the falsifier is TRIGGERED (hypothesis component refuted)."""

    name: str
    predicate: object  # callable(dict) -> bool
    desc: str = ""


def evaluate(metrics: dict, falsifiers: list) -> dict:
    """Run each falsifier against the measured metrics. A falsifier PASSes when
    it is NOT triggered. Returns a verdict ledger (all-stdlib, JSON-safe)."""
    results = []
    for f in falsifiers:
        triggered = bool(f.predicate(metrics))
        results.append(
            {"name": f.name, "triggered": triggered, "status": "FAIL" if triggered else "PASS"}
        )
    n_pass = sum(1 for r in results if r["status"] == "PASS")
    return {
        "metrics": metrics,
        "falsifiers": results,
        "n_pass": n_pass,
        "n_total": len(results),
        "all_pass": n_pass == len(results),
    }
