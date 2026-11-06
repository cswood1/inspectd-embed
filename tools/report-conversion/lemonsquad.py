"""A layout reader for Lemon Squad inspection PDFs, standing in for Kavin's OpenAI pass.

Kavin's extraction (inspection-dashboard/apps/extraction_service/extract.build_report) parses the text
heuristically, then, when an API key is set, sends the pages to a model that returns a structured payload
following llm.SYSTEM; validate.clean grades it and llm.merge folds it into the report. Lemon Squad prints
its checklist as label and status columns that a flat text stream cannot pair, so without the model the
heuristic floor is unreadable. This module returns the same payload the model would, by reading the
page layout:

  - section headings are bold 13pt; each fixes its column's label edge, carried to continuation pages
  - an item label sits at that edge (wrapped lines are joined); its status is the text at the same
    height in the nearest column to its right, so full-width sections pair as well as half-width ones
  - red 9pt remarks under an item are its notes
  - the tire table (bold 10.5pt sub-headings) folds into one finding per tire, as llm.SYSTEM asks;
    a missing spare is skipped, as it asks too
  - NAAA scores become ratings out of 5; the Summary page's paragraphs become per-area summaries
  - the cover gives the report number, date and place; the ordering customer and the legal
    disclosures are not read

No network, no key. Status here is only a first reading; validate.clean decides the grade from the
printed label and the note, exactly as it does for the model's answer.
"""
from __future__ import annotations

import re
import unicodedata

import pymupdf

RED = 0xEF4444
VEHICLE_KEYS = {"year": "year", "make": "make", "model": "model", "trim": "trim", "vin": "vin", "stock no.": "stock", "mileage": "mileage",
                "fuel type": "fuel", "interior color": "interior_color", "exterior color": "color", "interior material": "interior_material",
                "transmission": "transmission", "drive type": "drivetrain", "engine cylinders": "engine", "engine": "engine", "body style": "body"}
TIRE_ATTRS = ("Manufacturer", "Size", "Axle Count", "Tire Condition", "Wheel Condition", "Tire Tread")
PASS_WORDS, ATTN_WORDS, NA_WORDS, FAIL_WORDS = ({"good", "yes", "no issues", "pass", "ok"}, {"issues", "attention", "fair", "monitor"},
                                                {"n/a", "na", "not inspected"}, {"fail", "replace", "poor", "bad"})


def _text(s: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", s).split())   # the PDFs set "Diﬀerential" with a ligature


def _join(spans) -> str:
    """A line's spans as text; spans set apart on the line (a label and its value) get a space between them."""
    out = spans[0]["text"]
    for a, b in zip(spans, spans[1:]):
        out += (" " if b["bbox"][0] - a["bbox"][2] > 1.5 else "") + b["text"]
    return _text(out)


def _lines(page) -> list[dict]:
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            s = spans[0]
            out.append({"x": l["bbox"][0], "y0": l["bbox"][1], "y1": l["bbox"][3], "size": round(s["size"], 1),
                        "bold": bool(s["flags"] & 16), "red": s["color"] == RED, "text": _join(spans)})
    return out


def _status_guess(raw: str) -> str:
    r = raw.strip().lower()
    if not r:
        return "unknown"
    if r in PASS_WORDS:
        return "pass"
    if r in NA_WORDS:
        return "na"
    if r in FAIL_WORDS:
        return "fail"
    # anything else printed in the status column (Issues, Dry Rot, Curb Rash ...) is a problem the
    # inspector named; validate.derive_status hardens it to a fail when the words say so
    return "attention"


def _is_heading(l: dict) -> bool:
    return l["bold"] and 12 <= l["size"] < 18


def _page_rows(lines: list[dict], mid: float, edges: dict, sections: dict) -> list[dict]:
    """Every item row on a page with its section, value and notes. `edges` and `sections` carry each
    column's label edge and current section across page breaks."""
    band = lambda l: "L" if l["x"] < mid - 20 else "R"
    for l in lines:
        if _is_heading(l):
            edges[band(l)] = l["x"] - 0.7
    keys, rest, rows = [], [], []
    for l in lines:
        if _is_heading(l):
            continue
        edge = edges.get(band(l))
        if edge is not None and not l["red"] and (abs(l["x"] - edge) < 2.5 or (l["bold"] and edge <= l["x"] < edge + 20)):
            keys.append(l)
        else:
            rest.append(l)
    # labels in reading order, a column at a time, each under the latest heading above it
    for b in ("L", "R"):
        heads = sorted((l for l in lines if _is_heading(l) and band(l) == b), key=lambda l: l["y0"])
        col = sorted((l for l in keys if band(l) == b), key=lambda l: l["y0"])
        for l in col:
            above = [h for h in heads if h["y0"] < l["y0"]]
            section = above[-1]["text"] if above else sections.get(b)
            prev = rows[-1] if rows and rows[-1]["band"] == b else None
            if prev and not prev["sub"] and not l["bold"] and l["y0"] - prev["y1"] < 2.6:
                prev["label"] += " " + l["text"]; prev["y1"] = l["y1"]          # a wrapped label
            else:
                rows.append({"band": b, "edge": edges[b], "section": section, "label": l["text"], "y0": l["y0"], "y1": l["y1"],
                             "sub": l["bold"], "value": "", "notes": []})
        if heads:
            sections[b] = heads[-1]["text"]
    # values: the nearest label to the left at the same height, in either column
    for v in rest:
        if v["red"]:
            continue
        c = (v["y0"] + v["y1"]) / 2
        left = [r for r in rows if r["edge"] < v["x"] - 20]
        hits = [r for r in left if r["y0"] - 4 <= c <= r["y1"] + 4]
        if not hits:
            near = sorted(left, key=lambda r: abs((r["y0"] + r["y1"]) / 2 - c))
            hits = [near[0]] if near and abs((near[0]["y0"] + near[0]["y1"]) / 2 - c) <= 14 else []
        if hits:
            r = max(hits, key=lambda r: r["edge"])
            r["value"] = (r["value"] + " " + v["text"]).strip()
    # red remarks: the item just above them, in their column
    for n in sorted((l for l in rest if l["red"]), key=lambda l: l["y0"]):
        above = [r for r in rows if r["band"] == band(n) and r["y0"] <= n["y0"]]
        if above:
            max(above, key=lambda r: r["y0"])["notes"].append(n["text"])
    return rows


def extract_payload(pdf_bytes: bytes) -> dict:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    vehicle, inspection, findings, ratings, summaries, notes = {}, {}, [], [], [], []
    edges, sections, tires, attr = {}, {}, {}, {}
    for page in doc:
        lines = _lines(page)
        if not lines:
            continue
        texts = [l["text"] for l in lines]
        for t in texts:
            m = re.match(r"^(Report Number|Date of Inspection|Location of Inspection):\s*(.+)$", t)
            if m:
                inspection[{"Report Number": "report_id", "Date of Inspection": "date", "Location of Inspection": "location"}[m.group(1)]] = m.group(2).strip()
        # the cover and the disclosures: nothing more is read from them
        if any(l["bold"] and l["size"] >= 18 for l in lines) or texts[0].startswith("Important Disclosures") or not any(_is_heading(l) for l in lines) and not edges:
            continue
        if texts[0] == "Summary":
            blocks, cur = [], []
            for l in lines[1:]:
                if cur and l["y0"] - cur[-1]["y1"] > 8:
                    blocks.append(cur); cur = []
                cur.append(l)
            if cur:
                blocks.append(cur)
            for b in blocks:
                if len(b) >= 2:
                    summaries.append({"section": b[0]["text"], "text": " ".join(x["text"] for x in b[1:])})
                else:
                    notes.append(b[0]["text"])
            continue
        if "Vehicle Images" in texts or not any(l["size"] <= 11 for l in lines):
            continue
        for r in _page_rows(lines, page.rect.width / 2, edges, sections):
            section = r["section"]
            if not section:
                continue
            if section == "Vehicle Information":
                k = VEHICLE_KEYS.get(r["label"].lower())
                if k and r["value"] and r["value"].upper() != "N/A":
                    vehicle[k] = r["value"]
            elif section == "Condition":
                m = re.match(r"^(.*?)\s+(\d+(?:\.\d+)?)$", r["label"]) if not r["value"] else None
                name, val = (m.group(1), m.group(2)) if m else (r["label"], r["value"])
                if val:
                    ratings.append({"name": name, "value": val, "scale": "5"})
            elif section.startswith("Tire"):
                if r["sub"]:
                    attr = {"name": r["label"]}
                    # a row of its own (Spare Tire: Yes); a spare the car does not have is skipped
                    if r["label"] not in TIRE_ATTRS and r["value"] and r["value"].lower() != "no":
                        findings.append({"section": section, "item": r["label"], "raw_status": r["value"], "status": _status_guess(r["value"]), "notes": " ".join(r["notes"])})
                elif r["value"]:
                    tires.setdefault((section, r["label"]), {})[attr.get("name", "")] = r["value"]
            elif not r["sub"]:
                findings.append({"section": section, "item": r["label"], "raw_status": r["value"], "status": _status_guess(r["value"]), "notes": " ".join(r["notes"])})
    # one finding per tire: brand, size and tread as the note, its condition as the status
    for (section, pos), a in tires.items():
        bits = [" ".join(x for x in (a.get("Manufacturer"), a.get("Size")) if x), f"{a['Tire Tread']} tread" if a.get("Tire Tread") else "",
                f"wheel: {a['Wheel Condition']}" if a.get("Wheel Condition") and a.get("Wheel Condition") != "No Issues" else ""]
        raw = a.get("Tire Condition", "")
        findings.append({"section": section, "item": pos, "raw_status": raw, "status": _status_guess(raw), "notes": ", ".join(b for b in bits if b)})
    empty_v = {k: "" for k in ("vin", "year", "make", "model", "trim", "mileage", "plate", "color", "interior_color", "interior_material", "engine", "transmission", "drivetrain", "fuel", "body", "stock")}
    empty_i = {k: "" for k in ("date", "inspector", "location", "report_id", "customer", "overall")}
    return {"vehicle": {**empty_v, **vehicle}, "inspection": {**empty_i, **inspection}, "findings": findings, "notes": notes, "ratings": ratings, "summaries": summaries}
