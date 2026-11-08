"""Convert Lemon Squad inspection PDFs into the report documents the portal clone shows.

Runs Kavin's own extraction, inspection-dashboard/apps/extraction_service/extract.build_report, with the
layout reader (lemonsquad.py) in place of its OpenAI call: his heuristic parse, his photo extraction,
validate.clean's grading and llm.merge are used as they are. Then, for this demo:

  - the report gets the id the seed gives it (Kavin's YYYYMMDD-HHMMSS-abc123 format), which also
    replaces the provider's own report number
  - the ordering customer becomes the workspace (or walk-in) the job belongs to; the PDF's customer,
    the provider's legal disclosures and the raw text are not kept; the filename drops the report number
  - source is "layout", so the document says how it was read
  - the odometer is the one the report's Vehicle Information table prints: Kavin's heuristic pass takes
    the first "N miles" in the text, which can be a repair-history mileage, and merge keeps it
  - every photo in the PDF is kept (Kavin's extractor drops a photo drawn on two pages), re-encoded for
    the web (images.py); or, with --picks, only the three photos chosen for the report (photo-picks.json:
    a hero, an interior and an issue shot), with the inspector's photo count kept as photo_count
  - a failed consumable (normalize.CONSUMABLES: wipers, air filters, washer fluid...) is graded attention

Usage (see README.md):
  python -B convert.py --apps <inspection-dashboard/apps> --pdfs <folder of PDFs> --manifest manifest.json --out <folder> [--picks photo-picks.json]

Kavin's code is read only from --apps; nothing is written anywhere but --out.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True   # never leave __pycache__ in the reference checkout

HERE = Path(__file__).resolve().parent
# a photo is what Kavin's extractor counts as one (pdf.MIN_IMAGE_SIDE, pdf.MAX_ASPECT): 48px or more on each
# side and no wider than 3:1; every logo in these reports is far wider than that
PHOTO_SIDE, PHOTO_ASPECT = 48, 3.0


def photos_in(pdf_bytes: bytes) -> list[tuple[int, bytes]]:
    """Each photo-sized image once, at the page where it first appears, as its embedded bytes."""
    import pymupdf
    doc, seen, out = pymupdf.open(stream=pdf_bytes, filetype="pdf"), set(), []
    for page_no, page in enumerate(doc, start=1):
        for info in page.get_images(full=True):
            xref = info[0]
            if xref in seen:
                continue
            seen.add(xref)
            raw = doc.extract_image(xref)
            if raw and min(raw["width"], raw["height"]) >= PHOTO_SIDE and max(raw["width"], raw["height"]) / min(raw["width"], raw["height"]) <= PHOTO_ASPECT:
                out.append((page_no, raw["image"]))
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--apps", required=True, help="inspection-dashboard/apps (Kavin's code, read only)")
    ap.add_argument("--pdfs", required=True, help="folder holding the PDFs the manifest names")
    ap.add_argument("--manifest", default=str(HERE / "manifest.json"), help="which PDF becomes which report")
    ap.add_argument("--out", required=True, help="where <report id>/report.json and images/ are written")
    ap.add_argument("--only", nargs="*", help="convert only these PDF names")
    ap.add_argument("--picks", help="photo-picks.json: keep only each listed report's hero, interior and issue photos")
    args = ap.parse_args()

    sys.path.insert(0, str(Path(args.apps).resolve()))
    sys.path.insert(0, str(HERE))
    from extraction_service import extract, llm, validate   # Kavin's
    # Kavin's 50 MB cap is the upload limit of his web form; archived reports with many photos run larger, and
    # converting them here is not an upload, so the cap is lifted for this run only (his code is not changed)
    extract.MAX_PDF_BYTES = max(extract.MAX_PDF_BYTES, 200 * 1024 * 1024)
    import lemonsquad, images, normalize                      # ours

    out_root = Path(args.out).resolve()
    jobs = json.loads(Path(args.manifest).read_text())
    picks = json.loads(Path(args.picks).read_text()) if args.picks else {}
    for job in jobs:
        if args.only and job["pdf"] not in args.only:
            continue
        pdf_bytes = (Path(args.pdfs) / job["pdf"]).read_bytes()
        # the layout reader answers where the model would, and goes through the same validation
        payload = validate.clean(lemonsquad.extract_payload(pdf_bytes))
        llm.extract_with_openai = lambda trimmed, client=None, model=None: payload
        ex = extract.build_report(pdf_bytes, job["pdf"], use_llm=True)
        doc = {k: v for k, v in ex.doc.items() if k != "raw_text"}
        if doc.get("llm_error"):
            raise SystemExit(f"{job['pdf']}: the layout reader failed: {doc['llm_error']}")
        v = doc["vehicle"]
        if payload["vehicle"].get("mileage"):
            v["mileage"] = payload["vehicle"]["mileage"]
        doc.update(id=job["id"], source="layout", filename=f"{v.get('make', 'Vehicle').replace(' ', '-')}_{v.get('vin', '')[-6:]}_inspection.pdf")
        doc["inspection"] = {**doc["inspection"], "report_id": job["id"], "customer": job["customer"]}
        regraded = normalize.regrade(doc)   # a failed consumable is wear: attention, and the counts recomputed
        # photos: every photo in the PDF, in page order, re-encoded for the web and numbered as Kavin's store
        # numbers them. Kavin's extractor drops an image drawn on two pages as a header or footer logo, which
        # also drops a cover photo repeated in the gallery and a photo split across a page break; here every
        # photo-sized image is kept, with his caption where he has one.
        dest = out_root / job["id"]
        (dest / "images").mkdir(parents=True, exist_ok=True)
        kept = {data: im for (name, data), im in zip([f for f in ex.files if f[0].startswith("img-")], doc["images"])}
        refs, total = [], 0
        photos = photos_in(pdf_bytes)
        # every photo, numbered as the report numbers them (the cover photo is picture 1); or the three picked,
        # hero first (the viewer's header takes the first wide one), each keeping its number and its role
        pick = picks.get(job["id"])
        chosen = [(pick[r], r) for r in ("hero", "interior", "issue")] if pick else [(n, "") for n in range(1, len(photos) + 1)]
        for n, role in chosen:
            page_no, data = photos[n - 1]
            full, w, h, thumb = images.web_photo(data)
            fn, tn = f"img-{n:03d}.webp", f"thumb-{n:03d}.webp"
            (dest / "images" / fn).write_bytes(full)
            (dest / "images" / tn).write_bytes(thumb)
            total += len(full) + len(thumb)
            caption = kept[data]["caption"] if data in kept else ""
            refs.append({"index": n, "page": page_no, "width": w, "height": h, "ext": "webp", "filename": fn, "caption": caption, "thumb": tn, **({"role": role} if role else {})})
        doc["images"] = refs
        doc["photo_count"] = len(photos)   # the inspector's, whether or not all of them are kept
        (dest / "report.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False))
        s = doc["summary"]
        print(f"{job['pdf']} -> {job['id']}: {v.get('year')} {v.get('make')} {v.get('model')} {v.get('vin')} · {doc['inspection'].get('date')} · "
              f"{s['total']} findings ({s['pass']} pass, {s['attention']} attention, {s['fail']} fail, {s['na']} n/a, {s['unknown']} unknown) · "
              f"{len(refs)} of {len(photos)} photos, {total / 1e6:.1f} MB" + (f" · {regraded} consumable(s) graded attention" if regraded else ""))


if __name__ == "__main__":
    main()
