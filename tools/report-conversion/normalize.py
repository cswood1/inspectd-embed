"""Our grading on top of Kavin's: a failed consumable is graded attention, not fail.

Kavin's grading (validate.clean) fails any item whose printed status or note reads as a failure, which
includes consumables: worn wiper blades, a dirty air filter, low washer fluid. Those are routine wear,
replaced at a service, not a failed vehicle; counting them as failures inflated the fail figures the
report, the overview and the AI read. So after his grading, these items are graded attention (still
flagged, so they show and are counted), and the summary counts are recomputed from the findings.
The items are CONSUMABLES below, as Lemon Squad's checklist names them.
"""
from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

# Lemon Squad's checklist labels for wear items: replaced routinely, so a "fail" on one is wear, not a failure.
# A dead battery, tires, brakes and leaks are not on this list: those failures stand.
CONSUMABLES = ("Wiper Blades", "Air Filter", "Cabin Air Filter", "Windshield Washer", "Key Fob", "Floor Mats")


def is_consumable(item: str) -> bool:
    return (item or "").strip().lower() in {c.lower() for c in CONSUMABLES}


def summary_of(findings: list[dict]) -> dict:
    """The report's counts, as Kavin's store keeps them."""
    c = collections.Counter(f.get("status") for f in findings)
    return {"pass": c["pass"], "fail": c["fail"], "attention": c["attention"], "na": c["na"], "unknown": c["unknown"], "total": len(findings)}


def regrade(doc: dict) -> int:
    """Grade failed consumables as attention and recompute the summary. Returns how many findings changed."""
    n = 0
    for f in doc.get("findings", []):
        if f.get("status") == "fail" and is_consumable(f.get("item", "")):
            f["status"] = "attention"; n += 1
    doc["summary"] = summary_of(doc.get("findings", []))
    return n


if __name__ == "__main__":
    # python normalize.py <reports folder>: re-grade every converted report in place
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "../../public/portal/reports")
    for p in sorted(root.glob("*/report.json")):
        doc = json.loads(p.read_text())
        n = regrade(doc)
        p.write_text(json.dumps(doc, indent=1, ensure_ascii=False))
        print(f"{p.parent.name}: {n} consumable{'s' if n != 1 else ''} regraded · {doc['summary']}")
