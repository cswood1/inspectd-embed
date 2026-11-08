import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { inspectionLabel, inspectionShort, classLabel } from "./jobModel.js";

/*
 * The client portal's primitives, ported from inspection-dashboard/ui/shared/shell.js and
 * ui/jobs-client/shared.js: icons, the stage vocabulary, formatting, skeletons, the stacked notices
 * and the portal's own dialog (it never uses the browser's confirm or prompt). Same markup and class
 * names as Kavin's templates, so portal.css styles them unchanged.
 */

/* ---- icons: Kavin's SVG strings, drawn as real <svg> elements -------- */

const ATTR = {"stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin", class: "className", "aria-hidden": "aria-hidden", viewbox: "viewBox"};
/** One of Kavin's inline SVG strings as an element, its attributes and children exactly as written. */
export function Svg({ src, ...rest }){
  const m = /^<svg([^>]*)>([\s\S]*)<\/svg>$/.exec(src.trim());
  const props = {};
  for (const [, k, v] of m[1].matchAll(/([\w:-]+)="([^"]*)"/g)) props[ATTR[k] || k] = v;
  return <svg {...props} {...rest} dangerouslySetInnerHTML={{ __html: m[2] }} />;
}
export const I = {
  home: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5L8 3l5.5 4.5V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z"/><path d="M6.5 13.5v-4h3v4"/></svg>`,
  jobs: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M3 8h10M3 12h6"/></svg>`,
  reports: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/><path d="M6 9h4M6 11.5h4"/></svg>`,
  vehicles: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l2-4h6l2 4"/><path d="M2 9h12v3H2z"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/></svg>`,
  invoices: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2h8v12l-2-1.2L8 14l-2-1.2L4 14z"/><path d="M6 6h4M6 9h4"/></svg>`,
  team: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.25"/><path d="M1.75 13a4.25 4.25 0 0 1 8.5 0"/><circle cx="11.5" cy="6" r="1.75"/><path d="M11 9.5a3.25 3.25 0 0 1 3.25 3.5"/></svg>`,
  settings: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2"/></svg>`,
  out: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6"/><path d="M10 5l3 3-3 3M13 8H6.5"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3.2v9.6M3.2 8h9.6"/></svg>`,
  mark: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l2-4h6l2 4"/><path d="M2 9h12v3H2z"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/></svg>`,
  chev: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`,
  warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l6.5 11.5h-13z"/><path d="M8 6.5v3.5M8 12.2v.1"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5v.1"/></svg>',
  x: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  back: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>`,
};
export const SECTIONS = [["Inspections", [["overview", "Overview", "/", I.home], ["jobs", "Jobs", "/jobs", I.jobs], ["reports", "Reports", "/reports", I.reports]]],
                         ["Account", [["vehicles", "Vehicles", "/vehicles", I.vehicles], ["invoices", "Invoices", "/invoices", I.invoices], ["team", "Team", "/team", I.team], ["settings", "Settings", "/settings", I.settings]]]];

/* ---- vocabulary (jobs-client/shared.js) ------------------------------ */

const STAGE_ALIAS = {finding: "dispatching", booked: "confirmed", cancelled: "canceled"};   // older request-service names
const STAGES = {
  received: {label: "Received", pill: "gray", d: "We have the request"},
  dispatching: {label: "Dispatching", pill: "blue", d: "Reaching mobile inspectors near the car"},
  confirmed: {label: "Confirmed", pill: "green", d: "An inspector is scheduled"},
  complete: {label: "Complete", pill: "gray", d: "Report on its way or delivered"},
  canceled: {label: "Canceled", pill: "red", d: "Withdrawn before an inspector was confirmed"},
};
export const STAGE = {
  ...STAGES,
  key: s => STAGE_ALIAS[s] || s || "received",
  of: s => STAGES[STAGE.key(s)] || {label: String(s || "").replace(/[_-]+/g, " ").replace(/^\w/, c => c.toUpperCase()) || "Unknown", pill: "gray", d: ""},
  type: f => inspectionLabel(f || {}),          // "Consumer · Pre-purchase" (jobModel.js)
  short: f => inspectionShort(f || {}),         // "Pre-purchase", or "Arbitration"
  vclass: c => classLabel(c || "standard"),
};
export const vehicleOf = f => [f.year, f.make, f.model].filter(Boolean).join(" ") || "Vehicle not given";
export const whereOf = f => [f.city, f.state, f.zip].filter(Boolean).join(", ");
export const fmtWhen = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}); };
export const OPEN_STAGES = ["received", "dispatching", "confirmed"];
/** Open jobs keyed by VIN, so a second request for the same car is noticed before it is created. */
export function openByVin(jobs){
  const out = {};
  for (const j of jobs || []) { const vin = (j.form?.vin || "").trim().toUpperCase(); if (vin && OPEN_STAGES.includes(STAGE.key(j.stage)) && !out[vin]) out[vin] = j; }
  return out;
}
export const jobRef = id => "J-" + String(id || "").slice(0, 6).toUpperCase();

/* ---- reports (shell.js) ---------------------------------------------- */

export const title = r => { const v = r.vehicle || {}; return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || r.filename || "Inspection report"; };
export const worst = s => s.fail ? "red" : s.attention ? "amber" : s.pass ? "green" : "gray";
export const DOT = {red: "#d87c72", amber: "#df9f5e", green: "#63b483", gray: "#c3c9d1"};
export const fmtDate = d => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
  const t = m ? new Date(+m[1], +m[2] - 1, +m[3]) : /^\d{4}-\d{2}-\d{2}T/.test(d || "") ? new Date(d) : null;
  return t && !isNaN(t) ? t.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"}) : (d || "");
};
export const issuesOf = r => { const s = r.summary || {}; return (s.fail || 0) + (s.attention || 0); };
/** The report-list table shared by Overview and Reports. */
export function ReportRows({ rows, onOpen }){
  return (
    <div className="tablewrap"><table className="rtable"><thead><tr><th>Vehicle</th><th>Inspected</th><th>Findings</th><th>Photos</th><th>Uploaded</th></tr></thead><tbody>
      {rows.map(r => { const s = r.summary || {}, n = issuesOf(r), i = r.inspection || {}, v = r.vehicle || {};
        return (
          <tr key={r.id} className="row" data-id={r.id} onClick={() => onOpen(r.id)}>
            <td><div className="who"><span className="av" style={{ background: `${DOT[worst(s)]}33` }}>{((v.make || "").trim()[0] || title(r).replace(/^[\d\s]+/, "").trim()[0] || "?").toUpperCase()}</span><span className="tx"><b>{title(r)}</b><span className="mono">{v.vin || ""}</span></span></div></td>
            <td className="sub">{fmtDate(i.date) || ""}</td>
            <td>{n ? <span className={`pill ${s.fail ? "red" : "amber"}`}>{`${n} issue${n > 1 ? "s" : ""}`}</span> : <span className="pill green">No issues</span>}</td>
            <td className="sub">{r.photo_count > r.image_count ? `${r.image_count} of ${r.photo_count} photos` : `${r.image_count} photo${r.image_count === 1 ? "" : "s"}`}</td><td className="sub">{fmtDate(r.uploaded_at || "")}</td>
          </tr>);
      })}
    </tbody></table></div>
  );
}

/* ---- skeletons -------------------------------------------------------- */

export const Sk = ({ w, h = 14, extra = "" }) => <span className={`sk inline ${extra}`} style={{ width: typeof w === "number" ? w + "px" : w, height: h + "px" }} />;
export function SkelRows({ n = 5, cols = 5 }){
  const cell = i => i === 0
    ? <td key={i}><div className="who"><Sk w={30} h={30} /><span className="tx"><Sk w={180} h={14} /><span style={{ marginTop: 6 }}><Sk w={120} h={11} /></span></span></div></td>
    : <td key={i}><Sk w={i === 3 ? 68 : 84} h={i === 3 ? 20 : 13} /></td>;
  return (
    <div className="tablewrap"><table className="rtable skrows" aria-busy="true"><thead><tr><th>Vehicle</th><th>Inspected</th><th>Findings</th><th>Photos</th><th>Uploaded</th></tr></thead>
      <tbody>{Array.from({length: n}, (_, r) => <tr key={r}>{Array.from({length: cols}, (_, i) => cell(i))}</tr>)}</tbody></table></div>
  );
}

/* ---- notices and the dialog ------------------------------------------- */

const NoticeCtx = createContext(null);
export const useNotices = () => useContext(NoticeCtx);
let seq = 0;

/** The stacked notices (notify, progressToast) and the portal's own dialog (ask). */
export function NoticeProvider({ children }){
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(null);
  const remove = useCallback(id => setItems(xs => xs.filter(x => x.id !== id)), []);
  const notify = useCallback((title, text, kind = "amber", ms = 7000) => {
    const id = ++seq; setItems(xs => [...xs, {id, title, text, kind}]);
    if (ms) setTimeout(() => remove(id), ms);
  }, [remove]);
  const progressToast = useCallback((title, text) => {
    const id = ++seq; setItems(xs => [...xs, {id, progress: true, title, text, pct: null}]);
    return {
      set: (t, x, pct) => setItems(xs => xs.map(i => i.id === id ? {...i, title: t, text: x, pct} : i)),
      done: (kind, t, x, ms = 5000) => { remove(id); notify(t, x, kind, ms); },
    };
  }, [notify, remove]);
  const ask = useCallback(opts => new Promise(resolve => setDialog({...opts, resolve})), []);
  const api = useRef({});
  Object.assign(api.current, {notify, progressToast, ask});
  return (
    <NoticeCtx.Provider value={api.current}>
      {children}
      <div className="notices" id="notices">{items.map(n => n.progress ? (
        <div key={n.id} className="notice blue"><span className="spin" aria-hidden="true"></span><div className="nb"><b>{n.title}</b><p>{n.text}</p>
          <div className={`bar${n.pct == null ? " busy" : ""}`}><i style={n.pct != null ? { width: Math.round(n.pct * 100) + "%" } : undefined}></i></div></div></div>
      ) : (
        <div key={n.id} className={`notice ${n.kind}`}><Svg src={n.kind === "blue" ? I.info : I.warn} /><div className="nb"><b>{n.title}</b><p>{n.text}</p></div>
          <button className="nx" aria-label="Dismiss" onClick={() => remove(n.id)}><Svg src={I.x} /></button></div>
      ))}</div>
      {dialog && <Dialog {...dialog} onDone={v => { setDialog(null); dialog.resolve(v); }} />}
    </NoticeCtx.Provider>
  );
}

// shell.ask: Cancel, Esc and a click outside resolve null; OK resolves true, or the typed text
function Dialog({ title, text = "", input = null, ok = "OK", cancel = "Cancel", danger = false, onDone }){
  const veil = useRef(null), field = useRef(null), okBtn = useRef(null), prev = useRef(document.activeElement);
  const done = v => { onDone(v); prev.current?.focus?.(); };
  const value = () => (input ? field.current.value.trim() : true);
  useEffect(() => {
    (input ? field.current : okBtn.current)?.focus();
    const keys = e => {
      if (e.key === "Escape") { e.preventDefault(); done(null); }
      else if (e.key === "Enter" && !(e.target.tagName === "BUTTON" && e.target.id === "dlgCancel")) { e.preventDefault(); done(value()); }
      else if (e.key === "Tab") {   // keep focus inside the dialog
        const f = [...veil.current.querySelectorAll("input,button")], i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", keys, true);
    return () => document.removeEventListener("keydown", keys, true);
  }, []);
  return (
    <div className="veil" ref={veil} onMouseDown={e => { if (e.target === veil.current) done(null); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
        <h3 id="dlgTitle">{title}</h3>{text ? <p>{text}</p> : null}
        {input ? <label className="dlgf">{input.label ? <span>{input.label}</span> : null}<input id="dlgInput" ref={field} placeholder={input.placeholder || ""} maxLength={input.maxlength || 300} autoComplete="off" /></label> : null}
        <div className="acts"><button className="btn" id="dlgCancel" onClick={() => done(null)}>{cancel}</button><button className={`btn ${danger ? "danger" : "primary"}`} id="dlgOk" ref={okBtn} onClick={() => done(value())}>{ok}</button></div>
      </div>
    </div>
  );
}

/** A fetch that takes as long as one would: the page shows its skeleton first, as Kavin's pages do. */
export const FETCH_MS = 300;
export function useLoaded(ms = FETCH_MS, deps = []){
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(false); const t = setTimeout(() => setOn(true), ms); return () => clearTimeout(t); }, deps);
  return on;
}
