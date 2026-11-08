"""Inspectd AI's per-report insight: key issues and condition flags by rule, and a short factual summary.

Writes `insight` onto each converted report (public/portal/reports/<id>/report.json):

  key_issues   every finding graded fail, then attention, by area; consumables last (rules, no AI)
  flags        warning_lights, prior_repair, tires, leaks, rust_corrosion, structural: each true or false with the
               findings and inspector sentences that support it (rules, no AI)
  details      surface_rust: rust the record calls surface or underside rust, which is not a flag
  summary      two or three factual sentences on overall condition. In production this is one AI call per report
               (summarize below); for the demo's reports it was written by hand and is read from
               demo-summaries.json, marked "source": "demo-written"

Insight is factual: it describes what the record says. It never recommends what to do, estimates a cost, or
judges whether the car is a good buy; next steps belong to the business. See docs/platform/decisions.md.

    python3 insight.py --reports ../../public/portal/reports --summaries demo-summaries.json
    python3 insight.py --reports ../../public/portal/reports --briefs <folder>   # what a summary may draw on
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from normalize import is_consumable   # noqa: E402

VERSION = 1

# ---------- sentences, and whether one affirms something ----------

NEGATION = re.compile(r"\b(no|not|none|without|never|nor|free of)\b|n't\b", re.I)


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|(?<=[a-z])\.(?=[A-Z])", text or "") if s.strip()]


def affirmed(text: str, pattern: str) -> list[str]:
    """The sentences of `text` that state `pattern`: it matches, and no negation comes before it in the sentence
    ("no signs of frame damage" does not affirm frame damage)."""
    out = []
    for s in sentences(text):
        m = re.search(pattern, s, re.I)
        if m and not NEGATION.search(s[:m.start()]):
            out.append(s)
    return out


# ---------- the flags ----------

# Each flag: checklist items that support it when graded fail or attention ("items"), an area whose flagged
# findings all support it ("section"), and what an inspector's sentence must say ("text"), anywhere in a flagged
# finding's note, a summary or a note. "unless" drops a sentence that matches but means something else.
FLAGS = {
    "warning_lights": {
        "label": "Warning lights or codes",
        # the scan and the warning lights themselves; the Instrument Cluster and the dash only through what their note says
        "items": r"Computer Diagnosis|OBD|^Dash Lights|Tire Pressure System|TPMS|Check Engine",
        "text": r"(trouble|fault|error|diagnostic|stored|pending|active|historical)\s+codes?|\bcodes?\s+(?:is\s+|are\s+|were\s+)?(present|stored|found|in the system|for the|across)|found (several |multiple |a |stored )*codes?|check engine light|warning lights?|\b(TPMS|tire( pressure)?( monitoring)?) (warning )?light|\bP[0-3]\d{3}\b|\bDTCs?\b",
        "unless": r"\bno\b[^.]{0,60}\bcodes|codes?[^.]{0,30}\b(were|was) (checked|cleared)|without (any )?codes",
    },
    "prior_repair": {
        "label": "Prior repair or paint",
        "items": None,   # Paint Condition / Body Panel Alignment only when their note says so (the text rule)
        "text": r"(has|have|had) been (re-?painted|repaired|refinished)|\bwas (re-?painted|repaired)|prior (paint|repair|accident|damage|body ?work)|previous(ly)? (repair|paint|accident)|\bbody ?work\b|overspray|refinish(ed)?\b|aftermarket (bumper|panel|hood|fender|door)|paint (gauge|meter)[^.]*(repaint|high|thick|varied)|varied paint readings|paint mismatch|mismatched paint|(vehicle|car) (is|has been) (re-?)?painted",
        "unless": r"(need|needs|will need|should|to be) (be )?(re-?painted|repaired)",
    },
    # a Tire / Wheels finding graded fail or attention, or a tread reading of 4/32 or less recorded anywhere (a tire's
    # own line, even one graded pass, or the inspector's text). Wording alone ("low tread", "worn") is not enough.
    "tires": {
        "label": "Tire concerns",
        "section": r"^Tire",
        "text": r"(?<![\d.])[0-4](\.\d+)?\s*/\s*32",
        "any_status": True,
    },
    "leaks": {
        "label": "Leaks",
        "items": r"\bLeaks$",   # Engine Oil, Transmission Fluid, Differential leaks; "Shocks ... Leaking?" only by its note
        "text": r"\bleak(s|ing)?\b|\bseep(age|ing|s)?\b|\bwetness\b",
        "unless": r"no (active )?leaks|no (audible )?leaks|free of leaks|has no leaks",
    },
    "rust_corrosion": {
        "label": "Rust beyond surface",
        # more than surface rust: rust on a body panel, perforation or rot, rust or corrosion called out as heavy,
        # or a Rust item graded fail. Surface and underside rust is the surface_rust detail, not this flag.
        "items_fail": r"^Rust$|Corrosion",
        "text": r"rust[^.]{0,40}\b(panel|fender|door|quarter|rocker|wheel (well|arch)|hood|trunk|tailgate|roof|cab corner|bed)\b|\b(panel|fender|door|quarter|rocker|wheel (well|arch)|hood|trunk|tailgate|roof|cab corner|bed)s?\b[^.]{0,60}\brust|rust formation|rusted through|rust holes?|perforat|(heavy|severe|excessive|significant|extensive|flaking|scaling) (rust|corrosion)|corrosion",
        "unless": r"battery|terminal",
    },
    "structural": {
        "label": "Structural or frame concerns",
        "items_fail": r"Frame|Structural|Unibody",
        "text": r"frame damage|bent frame|frame (is |was )?(bent|cracked|damaged|repaired)|structural(ly)? (damage|repair|compromised)|unibody damage|subframe (damage|bent|repair)",
    },
}
SURFACE_RUST = r"\brust(ed|y)?\b"

# ---------- key issues: their order ----------

AREA_ORDER = ["Mechanical", "Road Test", "Tire / Wheels", "Exterior", "Interior"]
area_rank = lambda s: next((i for i, a in enumerate(AREA_ORDER) if (s or "").startswith(a.split(" /")[0])), len(AREA_ORDER))
PICTURE_REF = re.compile(r"(?i)(?:refer to|see) (?:the )?(?:picture|photo|image)s?\s*#?\s*([\d][\d ,#and]*)|(?:picture|photo)s?\s*#\s*(\d+)")


def photo_refs(text: str) -> list[int]:
    out = []
    for m in PICTURE_REF.finditer(text or ""):
        out += [int(n) for n in re.findall(r"\d+", m.group(1) or m.group(2) or "")]
    return out


def key_issues(doc: dict, issue_pick: dict | None) -> list[dict]:
    """Every fail, then every attention, by area; consumables last. Each with the photo it refers to when that
    photo is in the report: the picked issue photo when it shows this finding, or a "refer to picture N" photo."""
    kept = {im["index"] for im in doc.get("images", [])}
    picked = None
    if issue_pick and issue_pick.get("issue_finding"):
        m = re.match(r"^(FAIL|ATTENTION) · ([^:]+): (.+?)(?: — |$)", issue_pick["issue_finding"])
        if m: picked = (m.group(2).strip(), m.group(3).strip(), issue_pick["issue"])
    out = []
    for n, f in enumerate(doc.get("findings", [])):
        if f.get("status") not in ("fail", "attention"):
            continue
        photo = None
        if picked and f.get("section") == picked[0] and f.get("item") == picked[1] and picked[2] in kept:
            photo = picked[2]
        else:
            photo = next((p for p in photo_refs(f.get("notes", "")) if p in kept), None)
        out.append({"finding": n, "status": f["status"], "section": f.get("section") or "", "item": f.get("item") or "",
                    "note": f.get("notes") or "", "photo": photo, "consumable": is_consumable(f.get("item", ""))})
    return sorted(out, key=lambda k: (k["consumable"], k["status"] != "fail", area_rank(k["section"]), k["finding"]))


def flags(doc: dict) -> tuple[dict, dict]:
    """(flags, details): each flag {value, evidence}; details.surface_rust the same shape."""
    fs = doc.get("findings", [])
    texts = [(f"summary:{s.get('section') or 'Overall'}", s.get("text", "")) for s in doc.get("summaries", [])] + \
            [("note", t) for t in doc.get("notes", [])]
    out = {}
    for key, r in FLAGS.items():
        ev, seen = [], set()
        def said(text):
            return [s for s in affirmed(text, r["text"]) if not (r.get("unless") and re.search(r["unless"], s, re.I))]
        for n, f in enumerate(fs):
            st = f.get("status")
            if st not in ("fail", "attention"):
                if r.get("any_status") and said(f.get("notes", "")):   # a reading on a line graded pass still counts
                    ev.append({"finding": n}); seen.add(n)
                continue
            hit = (r.get("items") and re.search(r["items"], f.get("item", ""), re.I)) \
                or (r.get("section") and re.search(r["section"], f.get("section", ""))) \
                or (r.get("items_fail") and st == "fail" and re.search(r["items_fail"], f.get("item", ""), re.I)) \
                or said(f.get("notes", ""))
            if hit:
                ev.append({"finding": n}); seen.add(n)
        for src, t in texts:
            for s in said(t):
                ev.append({"source": src, "text": s})
        out[key] = {"value": bool(ev), "evidence": ev}
    # surface rust: rust the record mentions that is not a rust_corrosion concern
    ev = []
    for n, f in enumerate(fs):
        if f.get("status") in ("fail", "attention") and (re.search(r"^Rust$", f.get("item", ""), re.I) or affirmed(f.get("notes", ""), SURFACE_RUST)):
            ev.append({"finding": n})
    for src, t in texts:
        for s in affirmed(t, SURFACE_RUST):
            ev.append({"source": src, "text": s})
    concern_texts = {e.get("text") for e in out["rust_corrosion"]["evidence"]}
    ev = [e for e in ev if e.get("text") not in concern_texts or "text" not in e]
    return out, {"surface_rust": {"value": bool(ev), "evidence": ev}}


# ---------- the summary ----------

def summarize(doc: dict, key: list[dict], fl: dict) -> dict | None:
    """PRODUCTION: one AI call per report goes here. Send the brief (brief() below: the findings graded fail or
    attention, the inspector's summaries and notes, the ratings, the true flags) with the rules: two or three plain
    sentences on overall condition, only what the record states, no recommendations, no costs, no judgment of the
    purchase. Return {"text": ..., "source": "ai", "model": <model id>, "written_at": <iso>}.
    The demo does not call a model: its summaries were written by hand (demo-summaries.json)."""
    return None


def brief(doc: dict, key: list[dict], fl: dict) -> dict:
    """Everything a summary may draw on, and nothing else."""
    v = doc.get("vehicle", {})
    return {"id": doc["id"], "vehicle": " ".join(x for x in (v.get("year"), v.get("make"), v.get("model"), v.get("trim")) if x),
            "mileage": v.get("mileage", ""), "counts": doc.get("summary", {}),
            "key_issues": [f"{k['status'].upper()} · {k['section']}: {k['item']}" + (f" — {k['note']}" if k["note"] else "") + (" (consumable)" if k["consumable"] else "") for k in key],
            "inspector_summaries": [f"{s.get('section')}: {s.get('text')}" for s in doc.get("summaries", [])],
            "tires": [f"{f['item']}: {f.get('notes') or ''} ({f.get('status')})" for f in doc.get("findings", []) if (f.get("section") or "").startswith("Tire")],
            "inspector_notes": doc.get("notes", []), "ratings": [f"{r['name']}: {r['value']}/{r.get('scale') or 5}" for r in doc.get("ratings", [])],
            "flags_true": [FLAGS[k]["label"] for k, f in fl.items() if f["value"]]}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--reports", default=str(HERE / "../../public/portal/reports"))
    ap.add_argument("--picks", default=str(HERE / "photo-picks.json"))
    ap.add_argument("--summaries", help="demo-summaries.json: hand-written summaries by report id")
    ap.add_argument("--briefs", help="write each report's brief here (what a summary may draw on) instead of updating the reports")
    args = ap.parse_args()
    picks = json.loads(Path(args.picks).read_text()) if Path(args.picks).exists() else {}
    written = json.loads(Path(args.summaries).read_text()) if args.summaries else {}
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    n = 0
    for p in sorted(Path(args.reports).glob("*/report.json")):
        doc = json.loads(p.read_text())
        key = key_issues(doc, picks.get(doc["id"]))
        fl, details = flags(doc)
        if args.briefs:
            Path(args.briefs).mkdir(parents=True, exist_ok=True)
            (Path(args.briefs) / f"{doc['id']}.json").write_text(json.dumps(brief(doc, key, fl), indent=1, ensure_ascii=False))
            continue
        summary = summarize(doc, key, fl)
        if summary is None and doc["id"] in written:
            w = written[doc["id"]]
            summary = {"text": w["text"], "source": "demo-written", "model": None, "written_at": w.get("written_at", now)}
        doc["insight"] = {"version": VERSION, "generated_at": now, "key_issues": key, "flags": fl, "details": details, "summary": summary}
        p.write_text(json.dumps(doc, indent=1, ensure_ascii=False))
        n += 1
    print(f"{n} reports given insight" if not args.briefs else f"briefs written to {args.briefs}")


if __name__ == "__main__":
    main()
