import React, { useEffect, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { CSelect, PageDock } from "./ui.jsx";
import { Svg, I, STAGE, vehicleOf, whereOf, fmtWhen, openByVin, jobRef, Sk, SkelRows, useNotices, useLoaded } from "./portalUi.jsx";
import { vinCheck, vinLookup } from "./vin.js";
import { readTable, writeTable } from "./xlsx.js";
import { VEHICLE_CLASSES, subtypesOf, defaultSubtype, classifyInspection, classifyClass, typesFor, defaultTypeFor, consumerTypeAllowed, CONSUMER_TYPE_RULE } from "./jobModel.js";

/*
 * The portal's job pages, ported from inspection-dashboard/ui/jobs-client: the Jobs list (client.js),
 * New inspection request (new.js), Upload a list (bulk.js) and one job (job.js). Every call goes to
 * the portal server in PlatformStore, which keeps the record exactly as Kavin's server would; the
 * console reads the same records.
 */

const paged = (list, page = 0, size = 25) => { const pages = Math.max(1, Math.ceil(list.length / size)); page = Math.min(Math.max(0, page), pages - 1);
  return {slice: list.slice(page * size, (page + 1) * size), page, pages, start: list.length ? page * size + 1 : 0, end: Math.min(list.length, (page + 1) * size), total: list.length}; };
const latency = () => new Promise(r => setTimeout(r, 350));   // a send takes a moment on the wire
const stay = (e, ctx, to) => { e.preventDefault(); e.stopPropagation(); ctx.navigate(to); };
const download = (bytes, type, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], {type})); a.download = name; a.click(); URL.revokeObjectURL(a.href); };

/* ---- Jobs: the workspace's requests, newest first, with where each one stands ---- */

export function Jobs({ ctx }){
  const { portal, rows: _ } = usePlatform();
  const loaded = useLoaded();
  const [raw, setRaw] = useState(""), [stage, setStage] = useState(""), [page, setPage] = useState(0);
  const q = raw.trim().toLowerCase();   // what is matched; the box keeps what was typed
  const list = loaded ? portal.listJobs() : null;
  const jobs = list ? list.requests.map(j => ({...j, stage: STAGE.key(j.stage)})) : [];
  const counts = list ? Object.fromEntries(list.stages.map(s => [s, jobs.filter(j => j.stage === s).length])) : {};
  const hay = j => [jobRef(j.id), j.id, vehicleOf(j.form), j.form.vin, whereOf(j.form), j.form.address, j.form.name, j.form.email, STAGE.of(j.stage).label].filter(Boolean).join(" ").toLowerCase();
  const shown = jobs.filter(j => (!stage || j.stage === stage) && (!q || hay(j).includes(q)));
  const pick = s => { setStage(s); setPage(0); };
  // the workspace's usual inspection type: a row names its type only when it differs
  const typeCount = {}; jobs.forEach(j => { const t = STAGE.type(j.form); typeCount[t] = (typeCount[t] || 0) + 1; });
  const usual = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  let table, pg = null;
  if (!list) table = <SkelRows n={4} cols={6} />;
  else if (!jobs.length) table = <div className="placeholder inset"><b>No requests yet</b>Tell us where the car is and what you need; we find a mobile inspector and keep you posted here.<div style={{ marginTop: 14 }}><button className="btn primary" id="firstJob" onClick={() => ctx.navigate("/jobs/new")}>New inspection request</button></div></div>;
  else if (!shown.length) table = <div className="placeholder inset"><b>No jobs match</b>{`${q ? `Nothing matches "${q}"` : `No ${STAGE.of(stage).label.toLowerCase()} jobs`}${stage || q ? ". " : ""}`}
    {stage || q ? <a href="#" id="jclear" onClick={e => { e.preventDefault(); setRaw(""); setStage(""); setPage(0); }}>Show all</a> : null}</div>;
  else {
    pg = paged(shown, page);
    table = (
      <div className="tablewrap listgap"><table className="rtable"><thead><tr><th>Job</th><th>Vehicle</th><th>Where</th><th>Stage</th><th>Planned</th><th>Report</th><th>Requested</th></tr></thead><tbody>
        {pg.slice.map(j => (
          <tr key={j.id} className="row" data-id={j.id} onClick={() => ctx.navigate(`/jobs/${j.id}`)}>
            <td className="jobref"><span className="mono" title={j.id}>{jobRef(j.id)}</span></td>
            <td><div className="who"><span className="tx"><b>{vehicleOf(j.form)}</b>
              <span>{[STAGE.type(j.form) !== usual ? STAGE.type(j.form) : "", j.form.vehicle_class && j.form.vehicle_class !== "standard" ? STAGE.vclass(j.form.vehicle_class) : "", j.form.vin].filter(Boolean).join(" · ")}</span></span></div></td>
            <td className="sub">{whereOf(j.form)}</td><td><span className={`pill ${STAGE.of(j.stage).pill}`}>{STAGE.of(j.stage).label}</span></td>
            <td className="sub">{j.planned && j.stage !== "canceled" ? j.planned : ""}</td>
            <td className="sub">{j.report ? <a href={`/reports/${j.report.id}`} onClick={e => stay(e, ctx, `/reports/${j.report.id}`)}>Open</a> : ""}</td><td className="sub">{fmtWhen(j.created_at)}</td>
          </tr>))}
      </tbody></table></div>
    );
  }
  return (<>
    <section className="pad"><div className="greet"><div className="gt"><h1>Jobs</h1></div>
      <div className="actions"><a className="btn" id="bulkLink" href="/jobs/bulk" onClick={e => stay(e, ctx, "/jobs/bulk")}>Upload a list</a></div></div>
      <div className="toolbar"><div className="search"><Svg src={I.search} /><input id="jq" placeholder="Search reference, VIN, vehicle, city or contact" autoComplete="off" aria-label="Search jobs"
        value={raw} onChange={e => { setRaw(e.target.value); setPage(0); }} /></div>
        <div className="filters" id="jf" role="group" aria-label="Filter by stage">{list && jobs.length ? ["", ...list.stages].map(s => (
          <button key={s || "all"} type="button" className={`fbtn ${stage === s ? "on" : ""}`} data-s={s} onClick={() => pick(s)}>{s ? `${STAGE.of(s).label} ` : "All"}{s ? <span className="n">{counts[s]}</span> : null}</button>)) : null}</div></div></section>
    <div id="jobsTable">{table}</div>
    <PageDock pg={pg && pg.pages > 1 ? pg : null} rowSelector="#jobsTable tbody tr.row" onChange={d => setPage(pg.page + d)} />
  </>);
}

/* ---- New inspection request ---- */


export function NewJob({ ctx }){
  const { portal } = usePlatform();
  const { notify, progressToast, ask } = useNotices();
  const me = portal.me(), open = openByVin(portal.listJobs().requests);   // to notice a second request for the same car
  const form = useRef(null), vinEl = useRef(null), lastLookup = useRef("");
  // a business workspace isn't offered the Consumer type; it starts on Condition Report
  const orderedBy = me.account?.type || "consumer", first = defaultTypeFor(orderedBy);
  const [type, setTypeOnly] = useState(first), [subtype, setSubtype] = useState(defaultSubtype(first)), [vclass, setVclass] = useState("standard");
  const setType = t => { setTypeOnly(t); setSubtype(defaultSubtype(t)); };   // a new type starts on its first subtype
  const [bad, setBad] = useState(new Set()), [vinState, setVinState] = useState({cls: "", hint: "", hintCls: "hint"});
  const [err, setErr] = useState(""), [sending, setSending] = useState(false);
  const field = id => form.current.querySelector("#" + id);
  useEffect(() => { field("year").focus(); }, []);
  const dupNote = vin => { const d = open[vin]; if (!d) return false;
    setVinState(s => ({...s, hint: <>{"Already requested as "}<a href={`/jobs/${d.id}`} onClick={e => stay(e, ctx, `/jobs/${d.id}`)}>{jobRef(d.id)}</a>{` · ${STAGE.of(d.stage).label}`}</>, hintCls: "hint warn"})); return true; };
  const showVin = res => setVinState({cls: res.ok ? "mono good" : "mono bad", hint: res.reason, hintCls: "hint " + (res.ok ? "ok" : "warn")});
  const onVinInput = () => { const v = vinEl.current.value.trim();
    if (!v || v.replace(/[\s-]/g, "").length < 17) { setVinState({cls: "mono", hint: "", hintCls: vinState.hintCls}); return; }
    showVin(vinCheck(v)); };
  const onVinBlur = () => {
    const v = vinEl.current.value.trim(); if (!v) return;
    const res = vinCheck(v); showVin(res); if (!res.ok || res.vin === lastLookup.current) return;
    lastLookup.current = res.vin; vinEl.current.value = res.vin;
    // the decoder fills in what it knows, only into empty fields
    const d = vinLookup(res.vin);
    if (d.valid) { for (const k of ["year", "make", "model"]) if (d[k] && !field(k).value.trim()) field(k).value = d[k];
      if (d.year || d.make) setVinState(s => ({...s, hint: `Valid VIN · ${[d.year, d.make, d.model].filter(Boolean).join(" ")}`, hintCls: "hint ok"})); }
    dupNote(res.vin);
  };
  const submit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form.current).entries());
    data.inspection_type = type; data.inspection_subtype = subtype || ""; data.vehicle_class = vclass;
    data.state = (data.state || "").toUpperCase();
    const missing = ["address", "city", "state", "zip", "name", "email", "phone"].filter(k => !(data[k] || "").trim() || (k === "email" && !data.email.includes("@")) || (k === "zip" && !/^\d{5}(-\d{4})?$/.test(data.zip.trim())) || (k === "phone" && data.phone.replace(/\D/g, "").length < 7));
    setBad(new Set(missing));
    if (missing.length) { setErr("Please fill in the highlighted fields."); field(missing[0]).focus(); return; }
    if ((data.vin || "").trim()) { const res = vinCheck(data.vin); if (!res.ok) { showVin(res); setErr("Fix the VIN before sending."); vinEl.current.focus(); return; } data.vin = res.vin; }
    const dup = data.vin ? open[data.vin] : null;
    if (dup && !await ask({title: "This car already has an open request", text: `${vehicleOf(dup.form)} · ${jobRef(dup.id)} is ${STAGE.of(dup.stage).label.toLowerCase()}. Create another request for the same VIN anyway?`, ok: "Create anyway", cancel: "Go back"})) { dupNote(data.vin); vinEl.current.focus(); return; }
    setErr(""); setSending(true);
    const toast = progressToast("Sending your request", "Creating the job");
    try {
      await latency();
      const r = portal.createJob(data);
      toast.done("blue", "Request sent", "We are finding a mobile inspector near the car. Watch the Jobs page for updates.", 6000);
      ctx.refreshCounts(); ctx.navigate(`/jobs/${r.id}`);
    } catch (e2) { toast.done("red", "Could not send", e2.message, 8000); setErr(e2.message); setSending(false); }
  };
  const cls = (id, base = "") => [base, bad.has(id) ? "bad" : ""].filter(Boolean).join(" ") || undefined;
  return (
    <section className="pad"><div className="narrow wide"><div className="greet"><div className="gt"><h1>New inspection request</h1></div>
      <div className="actions"><a className="btn" href="/jobs/bulk" onClick={e => stay(e, ctx, "/jobs/bulk")}>Many cars? Upload a list</a><button className="btn" id="cancelJob" onClick={() => ctx.navigate("/jobs")}>Cancel</button></div></div>
      <form className="reqform" id="jobForm" noValidate ref={form} onSubmit={submit}><div className="fsgrid">
        <section className="fs span2"><div className="fsh"><span className="fsi"><img src="/portal/icons/vehicle.png" alt="" width="30" height="30" /></span><div><h2>Vehicle</h2><p>What we are inspecting. A VIN fills in the year, make and model for you.</p></div></div><div className="grid6">
          <div className="f c1"><label htmlFor="year">Year</label><input id="year" name="year" inputMode="numeric" placeholder="2019" /></div>
          <div className="f c2"><label htmlFor="make">Make</label><input id="make" name="make" placeholder="Honda" /></div>
          <div className="f c3"><label htmlFor="model">Model</label><input id="model" name="model" placeholder="Civic" /></div>
          <div className="f c3"><label htmlFor="vin">VIN <i>optional</i></label><input id="vin" name="vin" ref={vinEl} className={vinState.cls || "mono"} maxLength="20" placeholder="17 characters" autoComplete="off" spellCheck="false"
            onInput={onVinInput} onBlur={onVinBlur} /><small className={vinState.hintCls} id="vinHint">{vinState.hint}</small></div>
          <div className="f c3"><label htmlFor="vehicle_class">Vehicle class <i>affects who we send and the price</i></label><CSelect value={vclass} onChange={setVclass} options={VEHICLE_CLASSES.map(([value, label]) => ({value, label}))} /></div>
          <div className="f c3"><label htmlFor="inspection_type">Inspection type</label><CSelect value={type} onChange={setType} options={typesFor(orderedBy).map(([value, label]) => ({value, label}))} /></div>
          {subtypesOf(type).length ? <div className="f c3"><label htmlFor="inspection_subtype">{type === "consumer" ? "Before or after the purchase" : "Kind of report"}</label>
            <CSelect value={subtype} onChange={setSubtype} options={subtypesOf(type).map(([value, label]) => ({value, label}))} /></div> : null}
        </div></section>
        <section className="fs"><div className="fsh"><span className="fsi"><img src="/portal/icons/location.png" alt="" width="30" height="30" /></span><div><h2>Where is the car</h2><p>The inspector drives to it, so we need the exact address, plus anything that helps them get to the car.</p></div></div><div className="grid6">
          <div className="f c6"><label htmlFor="address">Street address</label><input id="address" name="address" className={cls("address")} autoComplete="off" placeholder="1200 Congress Ave" required /></div>
          <div className="f c3"><label htmlFor="city">City</label><input id="city" name="city" className={cls("city")} required /></div>
          <div className="f c1"><label htmlFor="state">State</label><input id="state" name="state" className={cls("state")} maxLength="2" placeholder="TX" required /></div>
          <div className="f c2"><label htmlFor="zip">ZIP</label><input id="zip" name="zip" className={cls("zip")} inputMode="numeric" maxLength="10" placeholder="78701" required /></div>
          <div className="f c6"><label htmlFor="notes">Anything the inspector should know <i>optional</i></label><textarea id="notes" name="notes" placeholder="Seller only allows weekends, car does not start, keys at the front desk, etc."></textarea></div>
        </div></section>
        <section className="fs"><div className="fsh"><span className="fsi"><img src="/portal/icons/contact.png" alt="" width="30" height="30" /></span><div><h2>On-site contact</h2><p>Who the inspector calls to get to the car and confirm the time. All three are required.</p></div></div><div className="grid6">
          <div className="f c6"><label htmlFor="name">Name</label><input id="name" name="name" className={cls("name")} autoComplete="name" required defaultValue={me.user?.name || ""} /></div>
          <div className="f c3"><label htmlFor="email">Email</label><input id="email" name="email" className={cls("email")} type="email" autoComplete="email" required defaultValue={me.user?.email || ""} /></div>
          <div className="f c3"><label htmlFor="phone">Phone</label><input id="phone" name="phone" className={cls("phone")} type="tel" autoComplete="tel" placeholder="(512) 555-0100" required /></div>
        </div></section>
      </div>
        <div className="formfoot"><button className="btn primary" type="submit" id="submitJob" disabled={sending}>{sending ? <><span className="spin" aria-hidden="true"></span> Sending</> : "Send request"}</button><span className="err" id="jobErr">{err}</span></div>
      </form></div></section>
  );
}

/* ---- Upload a list: many requests at once, from a CSV, an Excel file or pasted rows ---- */

export const COLUMNS = ["year", "make", "model", "vin", "vehicle_class", "inspection_type", "inspection_subtype", "address", "city", "state", "zip", "notes", "name", "email", "phone"];
const EXAMPLE_ROWS = [
  ["2019", "Honda", "Civic", "1HGCM82633A004352", "standard", "consumer", "pre-purchase", "1200 Congress Ave", "Austin", "TX", "78701", "", "", "", ""],
  ["2023", "Tesla", "Model 3", "", "ev", "condition", "lease-return", "4500 N Lamar Blvd", "Austin", "TX", "78756", "Keys at the front desk", "", "", ""],
  ["2017", "Ford", "F-150", "", "standard", "arbitration", "", "201 E Main St", "Round Rock", "TX", "78664", "", "", "", ""],
];
const ZIP = /^\d{5}(-\d{4})?$/;
// other names a column goes by; "designation" is the old name of vehicle_class, so older lists still import
const ALIAS = {type: "inspection_type", inspection: "inspection_type", subtype: "inspection_subtype", "inspection subtype": "inspection_subtype",
  class: "vehicle_class", "vehicle class": "vehicle_class", designation: "vehicle_class", category: "vehicle_class", tier: "vehicle_class", street: "address", postal: "zip", zipcode: "zip", note: "notes", contact: "name", tel: "phone", telephone: "phone", "vin number": "vin"};
// the type and class columns take the new values, and the old ones as aliases (jobModel.classifyInspection, classifyClass)
const typeHelp = orderedBy => typesFor(orderedBy).map(([k, , subs]) => subs.length ? `${k} (${subs.map(([s]) => s).join(", ")})` : k).join(", ");
const CLASS_HELP = VEHICLE_CLASSES.map(([k]) => k).join(", ");
const MAX = 200;
// a small CSV reader: quotes, escaped quotes, commas or tabs, CR/LF line ends
export function parseCsv(text){
  const sep = text.includes("\t") && !text.split("\n")[0].includes(",") ? "\t" : ",";
  const out = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); if (row.some(v => v.trim())) out.push(row); row = []; cell = ""; }
    else cell += c;
  }
  row.push(cell); if (row.some(v => v.trim())) out.push(row);
  return out;
}
const normHead = h => { const k = h.trim().toLowerCase().replace(/[\s-]+/g, "_"); return COLUMNS.includes(k) ? k : (ALIAS[k.replace(/_/g, " ")] || ALIAS[k] || null); };
function toRows(table){
  if (!table.length) return {rows: [], unknown: []};
  const heads = table[0].map(normHead), unknown = table[0].filter((h, i) => !heads[i] && h.trim());
  return {rows: table.slice(1).map(r => Object.fromEntries(heads.map((h, i) => [h, (r[i] || "").trim()]).filter(([h]) => h))), unknown};
}
function check(r, d, orderedBy){
  const p = [], name = r.name || d.name, email = r.email || d.email, phone = r.phone || d.phone;
  if (!name) p.push("name"); if (!email || !email.includes("@")) p.push("email"); if (!phone || phone.replace(/\D/g, "").length < 7) p.push("phone");
  if (!r.address) p.push("address"); if (!r.city) p.push("city"); if (!r.state) p.push("state"); if (!r.zip || !ZIP.test(r.zip)) p.push("zip");
  const ct = classifyInspection(r.inspection_type, r.inspection_subtype, orderedBy); if (ct) Object.assign(r, ct);
  const cd = classifyClass(r.vehicle_class); if (cd) r.vehicle_class = cd;
  return p;
}
const SHOW = ["year", "make", "model", "vin", "vehicle_class", "inspection_type", "inspection_subtype", "address", "city", "state", "zip", "name", "email"];

export function BulkJobs({ ctx }){
  const { portal } = usePlatform();
  const { progressToast } = useNotices();
  const me = portal.me(), open = openByVin(portal.listJobs().requests);   // to notice cars that already have an open job
  const orderedBy = me.account?.type || "consumer";
  const [rows, setRows] = useState([]), [unknown, setUnknown] = useState([]), [serverErrors, setServerErrors] = useState([]);
  const [contact, setContact] = useState({name: me.user?.name || "", email: me.user?.email || "", phone: ""});
  const [note, setNote] = useState(null), [bulkErr, setBulkErr] = useState(""), [sending, setSending] = useState(false), [drag, setDrag] = useState(false);
  const text = useRef(null);
  // what each row needs before it can go, and which rows are left out of the send
  const problems = {}, skips = {};
  rows.forEach((r, i) => {
    const p = check(r, contact, orderedBy); if (p.length) problems[i] = "Missing or invalid: " + p.join(", ");
    if ((r.vin || "").trim()) { const v = vinCheck(r.vin); if (!v.ok) skips[i] = "Invalid VIN: " + v.reason; else { r.vin = v.vin; const d = open[v.vin]; if (d) skips[i] = `Already requested as ${jobRef(d.id)} (${STAGE.of(d.stage).label}); cancel that job first if this is a new inspection`; } }
    if (!skips[i] && !classifyInspection(r.inspection_type, r.inspection_subtype, orderedBy)) skips[i] = `Unknown inspection type "${[r.inspection_type, r.inspection_subtype].filter(Boolean).join(" / ")}"; use ${typeHelp(orderedBy)}`;
    if (!skips[i] && r.inspection_type === "consumer" && !consumerTypeAllowed(orderedBy)) skips[i] = CONSUMER_TYPE_RULE;
    if (!skips[i] && !classifyClass(r.vehicle_class)) skips[i] = `Unknown vehicle class "${r.vehicle_class}"; use ${CLASS_HELP}`;
  });
  serverErrors.forEach(e => { problems[e.row - 1] = e.error; });
  const bad = Object.keys(problems).length, skip = Object.keys(skips).length, n = rows.length, sendable = n - skip;
  const summary = !n ? "Nothing loaded yet." : `${n} row${n === 1 ? "" : "s"}${bad ? `, ${bad} need${bad === 1 ? "s" : ""} attention` : ""}${skip ? `, ${skip} will be skipped (invalid VIN, unknown type, or already requested)` : ""}${!bad && !skip ? ", all good" : ""}${n > MAX ? ` (at most ${MAX} per upload)` : ""}${unknown.length ? ` · ignored columns: ${unknown.join(", ")}` : ""}`;
  const label = n ? (skip ? `Send ${sendable} request${sendable === 1 ? "" : "s"}, skip ${skip}` : `Send ${n} request${n === 1 ? "" : "s"}`) : "Send requests";

  const load = (table, source = "") => {
    const {rows: rs, unknown: un} = toRows(table);
    setRows(rs); setUnknown(un); setServerErrors([]); setNote(null);
    if (!rs.length) setNote(`No rows found${source ? ` in ${source}` : ""}. The first line must be the column names, followed by one car per line.`);
    else {
      const p = rs.some(r => check({...r}, contact).some(k => ["name", "email", "phone"].includes(k)));
      if (p && !contact.phone) setBulkErr("Some rows have no on-site contact. Fill in the contact below or add name, email and phone columns.");
    }
  };
  const loadFile = async f => {
    setBulkErr(""); setNote(`Reading ${f.name}…`);
    try {
      if (/\.xlsx?$/i.test(f.name)) load(await readTable(await f.arrayBuffer()), f.name);   // Kavin's server unpacks Excel; here it is read in the page
      else load(parseCsv(await f.text()), f.name);
    } catch (e) { setBulkErr(/\.xlsx?$/i.test(f.name) ? e.message : `Could not read ${f.name}: ${e.message}`); setNote("Nothing loaded yet."); }
  };
  const send = async () => {
    const keep = rows.filter((_, i) => !skips[i]), left = rows.filter((_, i) => skips[i]), k = keep.length;
    setBulkErr(""); setSending(true);
    const toast = progressToast(`Sending ${k} request${k === 1 ? "" : "s"}`, "Creating a job for each car");
    try {
      await latency();
      const r = portal.createBulk({rows: keep.map(x => ({...x})), name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim()});
      const skipped = (r.skipped || []).length + left.length;
      toast.done(skipped ? "amber" : "blue", `${r.count} request${r.count === 1 ? "" : "s"} sent${skipped ? `, ${skipped} skipped` : ""}`,
        skipped ? `${skipped} row${skipped === 1 ? " was" : "s were"} not sent (invalid VIN, unknown type, or already requested). Fix ${skipped === 1 ? "it" : "them"} below and send again.` : "We are finding mobile inspectors for each car. Follow them on the Jobs page.", 8000);
      ctx.refreshCounts();
      setRows(left); setServerErrors([]); setSending(false);   // sent rows never get offered twice; the skipped ones stay here to be fixed
      if (!left.length) ctx.navigate("/jobs");
    } catch (e) {
      toast.done("red", "Could not send", e.message, 8000);
      setBulkErr(e.message);
      if (Array.isArray(e.body?.errors)) setServerErrors(e.body.errors);
      setSending(false);
    }
  };
  const xlsxTemplate = e => { e.preventDefault(); download(writeTable([COLUMNS, ...EXAMPLE_ROWS], "Requests", [7, 10, 10, 20, 12, 16, 16, 22, 14, 6, 8, 26, 16, 24, 14]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "inspection-requests.xlsx"); };
  const csvTemplate = () => download(COLUMNS.join(",") + "\n2019,Honda,Civic,,standard,consumer,pre-purchase,1200 Congress Ave,Austin,TX,78701,,,,\n", "text/csv", "inspection-requests.csv");
  const setC = k => e => setContact(c => ({...c, [k]: e.target.value}));
  return (
    <section className="pad"><div className="narrow wide">
      <div className="greet"><div className="gt"><h1>Upload a list of cars</h1></div>
        <div className="actions"><a className="btn" href="/api/jobs/template.xlsx" download onClick={xlsxTemplate}>Excel template</a><button className="btn" id="tmplBtn" onClick={csvTemplate}>CSV template</button><a className="btn" href="/jobs" onClick={e => stay(e, ctx, "/jobs")}>Cancel</a></div></div>
      <div className="bulkgrid">
        <label className={`drop${drag ? " drag" : ""}`} id="drop" htmlFor="csvFile" onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}>
          <input type="file" id="csvFile" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hide" onChange={e => { const f = e.target.files[0]; if (f) loadFile(f); e.target.value = ""; }} />
          <b>Drop an Excel or CSV file here, or click to choose</b><span>{`Columns: ${COLUMNS.join(", ")}. Street address, city, state and ZIP are required, and so is an on-site contact (name, email, phone: per row, or once for the whole list below). Everything else is optional. Inspection type, with its subtype: ${TYPE_HELP}; a subtype on its own also works, and blank means consumer pre-purchase. Vehicle class: standard (default), ev, exotic. Older lists with the previous type names or a designation column still import.`}</span></label>
        <div><label htmlFor="csvText">Or paste rows</label><textarea id="csvText" ref={text} placeholder={"year,make,model,address,city,state,zip\n2019,Honda,Civic,1200 Congress Ave,Austin,TX,78701\n2021,Toyota,Camry,2100 Ross Ave,Dallas,TX,75201"}></textarea>
          <div className="formfoot" style={{ marginTop: 8 }}><button className="btn sm" id="parseBtn" onClick={() => load(parseCsv(text.current.value), "the pasted text")}>Preview</button></div></div>
      </div>
      <div className="sechead"><h2>On-site contact for these requests</h2><span className="secnote">Every request needs a name, email and phone the inspector can call. These fill any row that leaves them empty.</span></div>
      <div className="grid6 contactrow">
        <div className="f c2"><label htmlFor="bName">Name</label><input id="bName" value={contact.name} onChange={setC("name")} /></div>
        <div className="f c2"><label htmlFor="bEmail">Email</label><input id="bEmail" type="email" value={contact.email} onChange={setC("email")} /></div>
        <div className="f c2"><label htmlFor="bPhone">Phone</label><input id="bPhone" type="tel" placeholder="(512) 555-0100" value={contact.phone} onChange={setC("phone")} /></div>
      </div>
      <div className="sechead"><h2>Preview</h2><span className="secnote" id="previewNote">{note ?? summary}</span></div>
      <div className="tablewrap" id="preview">{n ? (
        <table className="rtable bulk"><thead><tr><th>#</th>{SHOW.map(c => <th key={c}>{c.replace("_", " ")}</th>)}<th>Check</th></tr></thead><tbody>
          {rows.slice(0, 200).map((r, i) => (
            <tr key={i} className={problems[i] ? "bad" : skips[i] ? "skip" : ""}><td className="sub">{i + 1}</td>{SHOW.map(c => <td key={c}>{r[c] || ""}</td>)}
              <td>{problems[i] ? <span className="pill red">{problems[i]}</span> : skips[i] ? <span className="pill amber" title={skips[i]}>{`${skips[i].startsWith("Invalid VIN") ? "Invalid VIN" : skips[i].startsWith("Already") ? "Already open" : skips[i].startsWith("Unknown inspection") ? "Unknown type" : "Unknown class"} · skipped`}</span> : <span className="pill green">OK</span>}</td></tr>))}
        </tbody></table>) : null}</div>
      <div className="formfoot"><button className="btn primary" id="sendBulk" disabled={sending || !n || bad > 0 || n > MAX || sendable === 0} onClick={send}>{sending ? <><span className="spin" aria-hidden="true"></span> Sending</> : label}</button><span className="err" id="bulkErr">{bulkErr}</span></div>
    </div></section>
  );
}

/* ---- one job: its stage, and when the inspection happens ---- */

const ORDER = ["received", "dispatching", "confirmed", "complete"];
const CANCELABLE = ["received", "dispatching"];   // once an inspector is confirmed, cancelling goes through Inspectd

export function Job({ id, ctx }){
  const { portal, rows: _ } = usePlatform();
  const { notify, ask } = useNotices();
  const loaded = useLoaded();
  const [canceling, setCanceling] = useState(false);
  const told = useRef(false);
  let j = null, error = null;
  if (loaded) { try { j = portal.getJob(id); j.stage = STAGE.key(j.stage); } catch (e) { error = e; } }
  useEffect(() => { if (error && !told.current) { told.current = true; notify("Could not open this request", error.message, "red", 6000); } });
  const cancel = async () => {
    const why = await ask({title: "Cancel this inspection request?", text: `${vehicleOf(j.form)} · ${jobRef(j.id)} will not be dispatched. This cannot be undone.`,
                           input: {label: "Reason (optional)", placeholder: "For example: car sold"}, ok: "Cancel request", cancel: "Keep it", danger: true});
    if (why === null) return;
    setCanceling(true);
    try { await latency(); portal.cancelJob(j.id, why.trim()); notify("Request canceled", `${vehicleOf(j.form)} · ${jobRef(j.id)} will not be dispatched.`, "blue", 5000); ctx.refreshCounts(); }
    catch (e) { notify("Could not cancel", e.message, "red", 8000); }
    setCanceling(false);
  };
  const head = (title, actions) => (
    <div className="greet"><div className="gt"><a className="backlink" href="/jobs" id="jobBack" onClick={e => stay(e, ctx, "/jobs")}><Svg src={I.back} />All jobs</a><h1 id="jobTitle">{title}</h1></div>
      <div className="actions"><span id="jobActions">{actions}</span></div></div>
  );
  if (!j) return (
    <section className="pad jobpage">{head(<Sk w={220} h={26} />, null)}
      <div className="cards" id="jobSteps">{ORDER.map(s => <div key={s} className="card"><Sk w={60} h={10} /><Sk w={120} h={16} /><Sk w={150} h={11} /></div>)}</div>
      <div className="facts" id="jobFacts">{Array.from({length: 5}, (_, i) => <div key={i}><Sk w={56} h={9} /><Sk w={96} h={14} /></div>)}</div>
      <div className="cols2" id="jobCols"></div></section>
  );
  const f = j.form, canceled = j.stage === "canceled", idx = canceled ? -1 : Math.max(0, ORDER.indexOf(j.stage));
  const reached = Object.fromEntries((j.history || []).map(h => [STAGE.key(h.stage), h.at]));   // when each stage was reached
  const updated = fmtWhen(j.updated_at), requested = fmtWhen(j.created_at);
  const facts = [["Reference", jobRef(j.id), "mono"], ["Inspection", STAGE.type(f)], ["Vehicle class", STAGE.vclass(f.vehicle_class)], ["Location", [f.address, f.city, f.state, f.zip].filter(Boolean).join(", ")],
    ["VIN", f.vin, "mono"], ["Contact", [f.name, f.phone].filter(Boolean).join(" · ")], ["Requested", requested], ["Updated", updated !== requested ? updated : ""]].filter(([, v]) => v);
  const rep = canceled ? null : j.report, when = j.planned || "";   // the provider's proposed day and part of day, or the seed's visit time
  const sub = {margin: "6px 0 0", color: "var(--sub)"}, ink = {color: "var(--ink)"};
  // the reason the request was withdrawn with is canceled.reason (Kavin's page read cancel_reason, which is never sent)
  return (
    <section className="pad jobpage">
      {head(vehicleOf(f),
        CANCELABLE.includes(j.stage) ? <button className="btn sm danger" id="cancelJob" disabled={canceling} onClick={cancel}>{canceling ? "Cancelling" : "Cancel request"}</button> : null)}
      <div className="cards" id="jobSteps">{canceled
        ? <div className="card on"><div className="t">Canceled</div><div className="d st">Request withdrawn</div><div className="d">{`${fmtWhen(reached.canceled || j.updated_at)}${j.canceled?.reason ? " · " + j.canceled.reason : ""}`}</div></div>
        : ORDER.map((s, i) => { const at = reached[s]; return (
            <div key={s} className={`card ${i === idx ? "on" : ""}${i > idx ? " later" : ""}`}><div className="t">{i <= idx || idx === 3 ? `${i < idx || idx === 3 ? "Done" : "Now"}${at ? ` · ${fmtWhen(at)}` : ""}` : "\u00a0"}</div>
              <div className="d st">{STAGE.of(s).label}</div><div className="d">{STAGE.of(s).d}</div></div>); })}</div>
      <div className="facts" id="jobFacts">{facts.map(([k, v, c]) => <div key={k}><small>{k}</small><span className={c || ""}>{v}</span></div>)}</div>
      <div className="cols2" id="jobCols">
        <div className="kv"><h3>Inspection</h3><div className="none" style={ink}>{
          canceled ? "No inspection will take place; the request was canceled."
          : j.stage === "confirmed" ? <><b>{when ? `Planned for ${when}.` : "Inspector confirmed."}</b><p style={sub}>{`The inspector will call ${f.name || "your on-site contact"} to confirm arrival and access. Questions or changes go through Inspectd, not the inspector.`}</p></>
          : j.stage === "complete" ? <><b>Done</b><p style={sub}>{`${when ? `Inspected ${when}. ` : ""}The report is delivered on the right.`}</p></>
          : j.stage === "dispatching" ? "We are contacting mobile inspectors near the car. The confirmed time appears here."
          : "We are about to start dispatching an inspector. The confirmed time appears here."}</div></div>
        {rep ? <div className="kv"><h3>Report</h3><div className="none" style={ink}><b>Ready</b>{` · ${fmtWhen(rep.at)}`}<div style={{ marginTop: 10 }}><a className="btn primary" href={`/reports/${rep.id}`} onClick={e => stay(e, ctx, `/reports/${rep.id}`)}>Open the report</a></div></div></div>
          : <div className="kv"><h3>Report</h3><div className="none">{canceled ? "There will be no report for a canceled request." : j.stage === "confirmed" ? "Inspectd delivers it here as soon as the inspection is done; you do not have to chase anyone for it." : "The report appears here once the inspection is done."}</div></div>}
        {f.notes ? <div className="kv"><h3>Your notes</h3><div className="none" style={ink}>{f.notes}</div></div> : null}
      </div>
    </section>
  );
}
