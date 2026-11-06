import React, { useContext, useEffect, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { PaneCtx } from "./ui.jsx";
import { Svg, title, fmtDate, jobRef, useNotices } from "./portalUi.jsx";

/*
 * The report viewer: inspection-dashboard/ui/reports-client/report.js and report-view.html. A photo header
 * with the car's facts, a bar of counts that filter, a section index beside collapsible sections (the
 * photos, the configuration, the inspector's notes, every checklist area), and the photo viewer.
 *
 * Kavin's viewer reads /api/reports/<id>; here the store keeps the report's row (its dates, workspace and
 * job) and the document itself is public/portal/reports/<id>/report.json, fetched when the report opens.
 * As in his, every change of filter, search or expansion redraws the sections, so they reopen as drawn.
 * Used by the portal (/reports/<id>) and by the customer's share page (/r/<token>, `isPublic`).
 */

const ICON = {
  check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l6.5 11.5h-13z"/><path d="M8 6.5v3.5M8 12.2v.1"/></svg>',
  flag: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14V2"/><path d="M4 2h8l-2 3 2 3H4"/></svg>',
  fail: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  dash: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8h8"/></svg>',
};
const STATUS = {
  pass: {label: "Pass", pill: "green", icon: ICON.check}, attention: {label: "Attention", pill: "amber", icon: ICON.flag},
  fail: {label: "Fail", pill: "red", icon: ICON.fail}, na: {label: "N/A", pill: "gray", icon: ICON.dash}, unknown: {label: "Unclear", pill: "gray", icon: ICON.dash},
};
const LABELS = {vin: "VIN", year: "Year", make: "Make", model: "Model", trim: "Trim", mileage: "Mileage", plate: "Plate",
  color: "Exterior color", interior_color: "Interior color", interior_material: "Interior material", engine: "Engine", transmission: "Transmission", drivetrain: "Drivetrain",
  fuel: "Fuel", body: "Body style", stock: "Stock #", date: "Date", inspector: "Inspector", location: "Location", report_id: "Report #", customer: "Customer", overall: "Overall"};
const ORDER_V = ["year", "make", "model", "trim", "vin", "mileage", "plate", "color", "interior_color", "interior_material", "engine", "transmission", "drivetrain", "fuel", "body", "stock"];
const ORDER_I = ["date", "location", "report_id", "customer", "overall"];   // the inspector's identity stays with Inspectd
const CHEV = '<svg class="chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';
const COPY = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>';
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
const isIssue = f => f.status === "fail" || f.status === "attention";
const fmtMiles = m => m ? (/^[\d,]+$/.test(m) ? Number(m.replace(/,/g, "")).toLocaleString() + " mi" : m) : "";
const stay = e => e.preventDefault();

/** The document for a report row: its report.json, with the row's own fields over it (as the store returns it). */
export async function reportDoc(row){
  const res = await fetch(`/portal/reports/${row.id}/report.json`);
  if (!res.ok) throw new Error("No such report");
  const doc = await res.json();
  const {raw_text, ...content} = doc;
  return {...content, ...row, inspection: {...content.inspection, ...row.inspection}, images: content.images, findings: content.findings};
}

export function ReportView({ id, row: getRow, ctx, isPublic = false, tab = "" }){
  const { portal } = usePlatform();
  const { notify, ask } = useNotices();
  const { scroller } = useContext(PaneCtx);
  const [current, setCurrent] = useState(null), [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState("all"), [query, setQuery] = useState(""), [expandAll, setExpandAll] = useState(tab === "checklist"), [gen, setGen] = useState(0);
  const [photo, setPhoto] = useState(-1), [copied, setCopied] = useState(false);
  const typing = useRef(null), sectionsEl = useRef(null), navEl = useRef(null), heroEl = useRef(null), lbClose = useRef(null), chosenAt = useRef(0), collapse = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      await null;   // after a StrictMode remount's cleanup, so a refusal is told once
      if (!live) return;
      try { const row = getRow(); const doc = await reportDoc(row); if (live) { setCurrent(doc); const sec = tab === "details" ? "sec-config" : /^(sec|cat)-/.test(tab) ? tab : ""; if (sec) setTimeout(() => openSection(sec), 0); } }
      catch (e) {
        if (!live) return;
        setMissing(true);
        if (!isPublic) notify("Could not open report", e.message, "red", 0);
      }
    })();
    return () => { live = false; };
  }, [id]);
  const redraw = () => setGen(g => g + 1);

  // ---------- photos ----------
  const ims = current?.images || [];
  const imgUrl = im => `/portal/reports/${current.id}/images/${im.filename}`;
  const thumbUrl = im => im.thumb ? `/portal/reports/${current.id}/images/${im.thumb}` : imgUrl(im);
  // the header photo: the first one shot in landscape and big enough to fill it
  const pic = ims.find(im => im.width >= im.height && im.width >= 640) || ims.find(im => im.width >= 640) || null;

  // ---------- the bar: counts that filter, the PDF, search ----------
  const counts = () => { const s = current.summary || {}, fs = current.findings || [], n = k => s[k] ?? fs.filter(f => f.status === k).length; return {pass: n("pass"), issues: n("fail") + n("attention")}; };
  const pick = f => {
    if (f === "all") { setExpandAll(filter === "all" ? !expandAll : true); setQuery(""); const q = document.getElementById("q"); if (q) q.value = ""; }
    setFilter(f); redraw();
    setTimeout(() => sectionsEl.current?.scrollIntoView({behavior: "smooth", block: "start"}), 0);
  };
  const onSearch = e => { const v = e.target.value; clearTimeout(typing.current); typing.current = setTimeout(() => { setQuery(v.trim().toLowerCase()); redraw(); }, 120); };

  // ---------- sections ----------
  const matches = f => !query || [f.item, f.notes, f.section, f.raw_status].some(x => String(x || "").toLowerCase().includes(query));
  const shown = f => matches(f) && (filter === "all" || (filter === "issues" ? isIssue(f) : f.status === "pass"));
  function sections(){
    const r = current, fs = r.findings || [], out = [];
    out.push({id: "sec-photos", title: "Visual Evidence", tone: "info", meta: ims.length ? plural(ims.length, "photo") : "None", open: true, body: photosBody()});
    out.push({id: "sec-config", title: "Configuration", tone: "info", meta: "Info", open: false, body: configBody(r)});
    const notes = notesBody(r);
    if (notes) out.push({id: "sec-notes", title: "Inspector Notes", tone: "info", meta: "Info", open: false, body: notes});
    if (!fs.length) {
      out.push({id: "sec-checklist", title: "Checklist", tone: "na", meta: "Not read", open: true,
                body: <div className="cr-empty"><b>We could not read this report's checklist</b>Download the inspector's PDF above for everything they found.</div>});
      return out;
    }
    const groups = new Map(), ids = new Set();
    fs.forEach(f => { const k = f.section || "General"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); });
    for (const [name, items] of groups) {
      let sid = "cat-" + slug(name);
      for (let n = 2; ids.has(sid); n++) sid = `cat-${slug(name)}-${n}`;
      ids.add(sid);
      const fails = items.filter(f => f.status === "fail").length, att = items.filter(f => f.status === "attention").length, passed = items.filter(f => f.status === "pass").length;
      const tone = fails ? "fail" : att ? "attention" : passed ? "pass" : "na";
      const meta = fails + att ? plural(fails + att, "issue") : passed ? "Passed" : "Not inspected";
      const visible = items.filter(shown);
      out.push({id: sid, title: name, tone, meta, cat: true, hidden: !visible.length, open: !!(query || filter !== "all") && visible.length > 0, body: categoryBody(visible)});
    }
    return out;
  }
  function photosBody(){
    if (!ims.length) return <div className="cr-empty"><b>No photos in this report</b>The inspector's PDF has no photos larger than an icon.</div>;
    return (<>
      <div className="cr-chips"><span className="chip on">{`All photos (${ims.length})`}</span></div>
      <div className="cr-grid">{ims.map((im, n) => <button key={n} className="cr-thumb" type="button" data-n={n} aria-label={im.caption || "Photo " + (n + 1)} onClick={() => openLb(n)}><img src={thumbUrl(im)} alt="" loading="lazy" decoding="async" /></button>)}</div>
    </>);
  }
  const kv = (obj, order, skip = []) => {
    const keys = [...order.filter(k => obj[k]), ...Object.keys(obj).filter(k => obj[k] && !order.includes(k))].filter(k => !skip.includes(k));
    return keys.map(k => <React.Fragment key={k}><dt>{LABELS[k] || k.replace(/_/g, " ")}</dt><dd className={k === "vin" ? "mono" : undefined}>{k === "mileage" ? fmtMiles(obj[k]) : obj[k]}</dd></React.Fragment>);
  };
  function configBody(r){
    const v = kv(r.vehicle || {}, ORDER_V), i = kv(r.inspection || {}, ORDER_I, ["inspector"]);
    const pv = r.vehicle_in_pdf;
    const about = [r.pages ? plural(r.pages, "page") : "", r.uploaded_at ? "uploaded " + fmtDate(r.uploaded_at) : ""].filter(Boolean).join(" · ");
    return (<>
      {pv ? <p className="cr-odd">{`The inspector's PDF names ${[pv.year, pv.make, pv.model, pv.trim].filter(Boolean).join(" ") || "another vehicle"}`}{pv.vin ? <>{" (VIN "}<span className="mono">{pv.vin}</span>{")"}</> : null}{". This report is filed under the car above."}</p> : null}
      <div className="cr-kv">
        <div><h3>Vehicle</h3>{v.length ? <dl>{v}</dl> : <p className="none">Not listed in this report.</p>}</div>
        <div><h3>Inspection</h3>{i.length ? <dl>{i}</dl> : <p className="none">Not listed in this report.</p>}{about ? <p className="cr-about">{`Report PDF: ${about}`}</p> : null}</div>
      </div>
    </>);
  }
  function notesBody(r){
    const ss = r.summaries || [], ns = r.notes || [], rs = r.ratings || [];
    if (!ss.length && !ns.length && !rs.length) return null;
    const scaleOf = x => Number(x.scale) || (rs.every(y => Number(y.value) <= 5) ? 5 : Number(x.value) <= 10 ? 10 : 100);
    return (<>
      {ss.map((x, n) => <div key={n} className="cr-note"><h4>{x.section || "Summary"}</h4><p>{x.text}</p></div>)}
      {ns.length ? <div className="cr-note"><h4>{ss.length ? "Other remarks" : "Inspector's notes"}</h4>{ns.map((t, n) => <p key={n}>{t}</p>)}</div> : null}
      {rs.length ? <div className="cr-ratings">{rs.map((x, n) => { const val = Number(x.value), sc = scaleOf(x), pct = isFinite(val) ? Math.max(0, Math.min(100, 100 * val / sc)) : 0;
        return <div key={n} className="rating"><span className="nm">{x.name}</span><span className="val">{x.value}<small>{`/${sc}`}</small></span><span className="bar"><i style={{ width: `${pct}%` }}></i></span></div>; })}</div> : null}
    </>);
  }
  function categoryBody(items){
    const issues = items.filter(isIssue).sort((a, b) => (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1));
    const passed = items.filter(f => f.status === "pass"), other = items.filter(f => !isIssue(f) && f.status !== "pass");
    const where = f => [f.raw_status && f.raw_status.toLowerCase() !== (STATUS[f.status] || STATUS.unknown).label.toLowerCase() ? `marked "${f.raw_status}"` : "", f.page ? `p. ${f.page}` : ""].filter(Boolean).join(" · ");
    const list = (fs, cls) => <ul className={`cr-plist ${cls}`}>{fs.map((f, n) => <li key={n}><span className="ic"><Svg src={(STATUS[f.status] || STATUS.unknown).icon} /></span><span><b>{f.item}</b>{f.notes ? <>{" "}<em>{f.notes}</em></> : null}</span></li>)}</ul>;
    return (<>
      {issues.map((f, n) => { const st = STATUS[f.status];
        return <div key={n} className={`cr-issue ${f.status}`}><span className={`pill ${st.pill}`}>{st.label}</span><div><b>{f.item}</b>{f.notes ? <p>{f.notes}</p> : null}{where(f) ? <small>{where(f)}</small> : null}</div></div>; })}
      {passed.length ? <details className="cr-passed" open={filter === "pass" || !!query}><summary><Svg src={ICON.check} />{`${plural(passed.length, "item")} passed`}</summary>{list(passed, "pass")}</details> : null}
      {other.length ? <details className="cr-passed na" open={!!query}><summary><Svg src={ICON.dash} />{`${plural(other.length, "item")} not inspected or unclear`}</summary>{list(other, "na")}</details> : null}
    </>);
  }
  function openSection(sid){
    const el = document.getElementById(sid); if (!el) return;
    el.open = true; el.scrollIntoView({behavior: "smooth", block: "start"}); markNav(sid);
    chosenAt.current = Date.now();   // a section near the bottom can't scroll to the top: what they picked stays marked
  }
  // The index opens the section in place. In the portal the router also records it as the page's #hash,
  // which stays on the same page rather than mounting the viewer again (docs/platform-iteration-notes.md).
  const indexClick = sid => { if (!isPublic) ctx.navigate(`/reports/${current.id}#${sid}`); openSection(sid); };
  const markNav = sid => navEl.current?.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.sec === sid));
  // the index follows the reader down the page
  useEffect(() => {
    if (!current) return;
    if (collapse.current) { collapse.current = false; sectionsEl.current?.querySelectorAll("details.cr-sec").forEach(d => d.open = false); }
    const spy = new IntersectionObserver(es => { if (Date.now() - chosenAt.current < 1200) return; const e = es.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (e) markNav(e.target.id); },
                                         {root: scroller.current, rootMargin: "-15% 0px -70% 0px"});   // the pane is the viewport here
    sectionsEl.current?.querySelectorAll(".cr-sec").forEach(s => spy.observe(s));
    return () => spy.disconnect();
  }, [current, gen]);
  const toggleAll = () => { const next = !expandAll; setExpandAll(next); if (!next) collapse.current = true; redraw(); };

  // ---------- the photo viewer ----------
  const showPhoto = n => { if (!ims.length) return; const k = (n + ims.length) % ims.length; setPhoto(k);
    for (const j of [k + 1, k - 1]) { const nb = ims[(j + ims.length) % ims.length]; if (nb) new Image().src = imgUrl(nb); } };   // warm the neighbours
  const openLb = n => { showPhoto(n); setTimeout(() => lbClose.current?.focus(), 0); };
  const lbOpen = photo >= 0;
  useEffect(() => {
    if (!lbOpen) return;
    const onKey = e => { if (e.key === "Escape") setPhoto(-1); if (e.key === "ArrowLeft") showPhoto(photo - 1); if (e.key === "ArrowRight") showPhoto(photo + 1); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // ---------- print, delete, the PDF ----------
  const printPrep = () => { sectionsEl.current?.querySelectorAll("details").forEach(d => d.open = true); heroEl.current?.setAttribute("data-printed", new Date().toLocaleString()); };
  useEffect(() => { window.addEventListener("beforeprint", printPrep); return () => window.removeEventListener("beforeprint", printPrep); }, []);
  const del = async () => {
    if (!current || !await ask({title: "Delete this report?", text: `"${title(current)}" and its extracted photos are removed for everyone in the workspace.`, ok: "Delete report", danger: true})) return;
    try { portal.deleteReport(current.id); notify("Report deleted", title(current), "blue", 4000); ctx.refreshCounts(); ctx.navigate("/reports"); }
    catch (e) { notify("Delete failed", e.message, "red"); }
  };
  // the inspector's original PDF is not part of this demo (docs/platform-iteration-notes.md)
  const pdf = e => { e.preventDefault(); notify("The original PDF isn't available", "This demo keeps the report, not the inspector's PDF. Print saves the report as a PDF.", "blue", 5000); };
  const copyVin = async () => { try { await navigator.clipboard.writeText(current.vehicle.vin); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* the browser refused the clipboard */ } };

  const r = current, v = r?.vehicle || {}, i = r?.inspection || {};
  const facts = [];
  if (r) {
    if (v.vin) facts.push(["VIN", <><span className="mono">{v.vin}</span><button className={`cr-copy${copied ? " done" : ""}`} id="copyVin" type="button" aria-label="Copy the VIN" title={copied ? "Copied" : "Copy the VIN"} onClick={copyVin}><Svg src={COPY} /></button></>]);
    if (v.mileage) facts.push(["Odometer", <span className="mono">{fmtMiles(v.mileage)}</span>]);
    if (i.location) facts.push(["Location", <span>{i.location}</span>]);
    if (i.date) facts.push(["Inspected", <span>{fmtDate(i.date)}</span>]);
    if (r.request_id && !isPublic) facts.push(["Job", <a href={`/jobs/${r.request_id}`} className="mono" onClick={e => { stay(e); ctx.navigate(`/jobs/${r.request_id}`); }}>{jobRef(r.request_id)}</a>]);
  }
  const c = r ? counts() : null, list = r ? sections() : [];
  const hits = r ? (r.findings || []).filter(shown).length : 0;
  const im = lbOpen ? ims[photo] : null;
  return (<>
    <section id="dash" className={`cr${!r && !missing ? " loading" : ""}${missing ? " missing" : ""}`}>
      <header className={`cr-hero${r ? (pic ? " img" : " noimg") : ""}`} id="hero" ref={heroEl} style={r && pic ? { backgroundImage: `url("${imgUrl(pic)}")` } : undefined}>
        <div className="cr-hero-in pad">
          <div className="cr-hero-top">
            {!isPublic ? <a className="backlink" href="/reports" id="dBack" onClick={e => { stay(e); ctx.navigate("/reports"); }}><Svg src='<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>' />All reports</a> : null}
            <div className="actions">
              <button className="btn sm" id="dPrint" type="button" title="Print, or save as PDF from the print dialog" onClick={() => { printPrep(); window.print(); }}>Print</button>
              {!isPublic ? <button className="btn sm danger" id="dDelete" type="button" onClick={del}>
                <Svg src='<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M6 4V2.5h4V4M4.5 4l.6 9h5.8l.6-9"/></svg>' />Delete</button> : null}
            </div>
          </div>
          <h1 id="dTitle">{missing ? "Report not found" : r ? ([v.year, v.make, v.model].filter(Boolean).join(" ") || title(r)) : ""}</h1>
          <p className="cr-sub" id="dSub">{missing && isPublic ? <>{"This link isn't valid or was withdrawn. "}<a href="/find-my-report" onClick={stay}>Lost your link? Get it again</a>.</> : r ? [v.trim, v.engine, v.transmission, v.drivetrain, v.fuel].filter(Boolean).join(" · ") : ""}</p>
          <div className="cr-facts" id="dMeta">{facts.map(([k, val]) => <div key={k}><small>{k}</small><p>{val}</p></div>)}</div>
        </div>
      </header>

      <div className="cr-ribbon pad" id="ribbon">
        <button className={`rb pass${filter === "pass" ? " on" : ""}`} id="rbPass" data-f="pass" type="button" disabled={c ? !c.pass : undefined} onClick={() => pick("pass")}>{c ? <><Svg src={ICON.check} />{`${plural(c.pass, "checkpoint")} passed`}</> : null}</button>
        <button className={`rb issues${c && !c.issues ? " none" : ""}${filter === "issues" ? " on" : ""}`} id="rbIssues" data-f="issues" type="button" disabled={c ? !c.issues : undefined} onClick={() => pick("issues")}>{c ? (c.issues ? <><Svg src={ICON.warn} />{`${plural(c.issues, "issue")} detected`}</> : <><Svg src={ICON.check} />No issues detected</>) : null}</button>
        <button className={`rb all${filter === "all" ? " on" : ""}`} id="rbAll" data-f="all" type="button" onClick={() => pick("all")}>View all</button>
        <a className="rb listing" id="dListing" target="_blank" rel="noopener" hidden>
          <Svg src='<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h4v4"/><path d="M13 3L7.5 8.5"/><path d="M11 9.5V13H3V5h3.5"/></svg>' />View original listing</a>
        <a className="rb" id="dPdf" href={r ? `/api/reports/${r.id}/pdf` : "#"} download onClick={pdf} hidden={r ? r.view === "listing" : undefined}>
          <Svg src='<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v8"/><path d="M5 8l3 3 3-3"/><path d="M3 13h10"/></svg>' />Download PDF</a>
        <label className="cr-search"><i aria-hidden="true"></i><input id="q" type="search" placeholder="Search report…" aria-label="Search the report" autoComplete="off" onChange={onSearch} /></label>
      </div>

      <div className="pad skel" aria-hidden="true">
        <div className="row" style={{ gridTemplateColumns: "minmax(240px,300px) minmax(0,1fr)" }}>
          <div className="sk" style={{ height: 320 }}></div>
          <div><div className="sk" style={{ height: 28, width: 220 }}></div><div className="sk" style={{ height: 140, marginTop: 16 }}></div><div className="sk" style={{ height: 28, width: 180, marginTop: 28 }}></div><div className="sk" style={{ height: 28, width: 200, marginTop: 28 }}></div></div>
        </div>
      </div>

      <div className="cr-body pad">
        <aside className="cr-nav" aria-label="Report sections"><p className="cr-navt">Vehicle summary</p><nav id="crNav" ref={navEl} key={`n${gen}`}>
          {list.map(s => <a key={s.id} href={`#${s.id}`} data-sec={s.id} className={s.hidden ? "dim" : ""} onClick={e => { stay(e); indexClick(s.id); }}><i className={`dot ${s.tone}`}></i><span>{s.title}</span><b className={s.tone}>{s.meta}</b></a>)}
        </nav></aside>
        <div className="cr-main">
          <div className="cr-tools"><span className="cr-found" id="crFound" role="status">{query ? `${plural(hits, "item")} match “${query}”` : ""}</span>
            <button className="cr-expand" id="toggleAll" type="button" onClick={toggleAll}><Svg src='<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 4h8M6 8h8M6 12h8M2.5 4h.1M2.5 8h.1M2.5 12h.1"/></svg>' /><span>{expandAll ? "Collapse all" : "Expand all"}</span></button></div>
          <div id="crSections" ref={sectionsEl} key={`s${gen}`}>
            {r ? (list.filter(s => !s.hidden).length ? list.filter(s => !s.hidden).map(s => (
              <details key={s.id} className="cr-sec" id={s.id} open={s.open || expandAll}>
                <summary><h2>{s.title}</h2>{s.cat ? <span className={`cnt ${s.tone}`}>{s.meta}</span> : null}<Svg src={CHEV} /></summary>
                <div className="cr-secbody">{s.body}</div>
              </details>)) : <div className="cr-empty"><b>Nothing matches</b>Try another word, or View all.</div>) : null}
          </div>
        </div>
      </div>
    </section>
    <div className={`lb${lbOpen ? " open" : ""}`} id="lb" role="dialog" aria-label="Photo" onClick={e => { if (e.target === e.currentTarget) setPhoto(-1); }}>
      <button className="btn icon nav prev" id="lbPrev" aria-label="Previous" onClick={() => showPhoto(photo - 1)}><Svg src='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>' /></button>
      <figure className="lbfig"><img id="lbImg" alt={im ? (im.caption || `Photo ${photo + 1}`) : ""} src={im ? imgUrl(im) : undefined} /><figcaption id="lbCap">{im ? `${im.caption || "Photo " + (photo + 1)} · ${photo + 1} of ${ims.length}` : ""}</figcaption></figure>
      <button className="btn icon nav next" id="lbNext" aria-label="Next" onClick={() => showPhoto(photo + 1)}><Svg src='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>' /></button>
      <button className="btn icon lbx" id="lbClose" aria-label="Close" ref={lbClose} onClick={() => setPhoto(-1)}><Svg src='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>' /></button>
    </div>
  </>);
}
