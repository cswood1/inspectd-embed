import React, { useEffect, useRef, useState } from "react";
import "./portal.css";
import { usePlatform } from "./PlatformStore.jsx";
import { PaneCtx } from "./ui.jsx";
import { Svg, Sk, NoticeProvider, useNotices } from "./portalUi.jsx";
import { ReportView } from "./ReportView.jsx";

/*
 * The two pages a link opens without an account, outside the access gate as /job/:token is:
 *
 *  /r/<token>        the customer's report (inspection-dashboard ui/share-client): the portal's viewer,
 *                    told it is public, under a plain Inspectd bar, in the dark colours of share-client/style.css
 *  /inspect/<token>  the inspector's page (ui/inspect-client): the job behind its one job link, open to every
 *                    provider it was shared with; the first to claim gets it
 *
 * On the inspector's page, Kavin's shows the job and an upload. Claiming and declining are routes of the
 * request service (requests/booking.py: POST /inspect/{token}/claim and /reject) with no controls on his
 * page; here the page has them, wired to the same rules, and the upload says it is not part of this demo
 * (docs/platform-iteration-notes.md).
 */

const Pane = ({ cls, children }) => {
  const pane = useRef(null), scroller = useRef(null);
  useEffect(() => { const t = document.title; return () => { document.title = t; }; }, []);
  return (
    <div style={{ height: "100vh" }}>
      <div className={`ipp ${cls}`} ref={pane}>
        <NoticeProvider><PaneCtx.Provider value={{ scroller, pane }}><div className="ipp-scroll" ref={scroller}>{children}</div></PaneCtx.Provider></NoticeProvider>
      </div>
    </div>
  );
};

/* ---- /r/<token> ---- */

export function SharedReport({ token }){
  const { portal } = usePlatform();
  useEffect(() => { document.title = "Your inspection report · Inspectd"; }, []);
  return (
    <Pane cls="share">
      <header className="sbar"><img className="logo" src="/inspectd-symbol.png" alt="" width="24" height="24" /><b>Inspectd</b><span className="sub">Inspection report</span></header>
      <main className="swrap" id="outlet"><ReportView id={token} isPublic ctx={{ navigate(){}, refreshCounts(){} }} tab={window.location.hash.slice(1)} row={() => portal.shared(token)} /></main>
    </Pane>
  );
}

/* ---- /inspect/<token> ---- */

const CHECK = '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>';
const fmtWhen = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}); };
const miles = n => Number.isFinite(n) ? `${n.toLocaleString()} mi` : "";

function facts(j){
  const site = j.site || {}, privateSeller = j.seller === "private_party";
  return [["Vehicle", j.vehicle], ["VIN", j.vin], ["Title", j.title_status], ["Odometer (listing)", miles(j.mileage)], ["Where", j.location],
          [privateSeller ? "Seller" : "At the lot", site.name],
          [privateSeller ? "Seller's phone" : "Ask for", [privateSeller ? "" : site.contact_name, site.contact_phone].filter(Boolean).join(" · ")],
          ["Inspection", j.inspection], ["Vehicle class", j.vehicle_class !== "standard" ? j.vehicle_class_label : ""], ["When", j.scheduled_at], ["Customer", j.customer], ["Customer's phone", j.contact_phone]]
    .filter(([, v]) => v).map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>);
}

// What the listing says the car has been through, so the inspector knows where to look first.
function Damage({ j }){
  const ds = j.damage || [];
  if (!ds.length) return null;
  const words = s => (s || "").replaceAll("_", " "), cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
  return (<div className="idamage"><b>Damage history from the listing</b><ul>{ds.map((d, n) => {
    const kind = [cap(words(d.type)), d.severity ? `(${d.severity})` : ""].filter(Boolean).join(" ");
    const sold = d.date ? `auction ${d.date}${miles(d.odometer_at_damage) ? ` at ${miles(d.odometer_at_damage)}` : ""}` : miles(d.odometer_at_damage);
    const air = d.airbags_deployed === true ? "airbags deployed" : d.airbags_deployed === false ? "airbags not deployed" : "";
    const flags = [d.structural ? "structural" : "", air].filter(Boolean).join(", ");
    const head = [kind, (d.areas || []).map(words).join(", "), sold].filter(Boolean).join(" · ");
    return <li key={n}><span>{head}</span>{flags ? <>{" "}<em>{flags}</em></> : null}{d.notes ? <p>{d.notes}</p> : null}</li>;
  })}</ul></div>);
}

export function InspectPage({ token }){
  useEffect(() => { document.title = "Upload your inspection report · Inspectd"; }, []);
  return (
    <Pane cls="inspect">
      <header className="ibar"><img className="logo" src="/inspectd-symbol.png" alt="" width="24" height="24" /><b>Inspectd</b></header>
      <main className="iwrap" id="main"><InspectBody token={token} /></main>
    </Pane>
  );
}

// This browser's id on job links: how the page knows who claimed or declined, without an account. Kept in the browser.
const VIEWER_KEY = "inspectd_link_viewer";
function viewerId(){
  try { let v = localStorage.getItem(VIEWER_KEY); if (!v) { v = "v_" + Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem(VIEWER_KEY, v); } return v; }
  catch { return ""; }
}
// one view per page load, even when React mounts the page twice in development
const viewed = new Set();

function InspectBody({ token }){
  const { portal, rows } = usePlatform();
  const { notify } = useNotices();
  // ?preview=1: the console's "Open". The page renders the same but records nothing, and claiming and declining are off.
  const preview = new URLSearchParams(window.location.search).has("preview");
  const viewer = useRef(viewerId()).current;
  const [loaded, setLoaded] = useState(false), [terms, setTerms] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [drag, setDrag] = useState(false);
  const [who, setWho] = useState({name: "", company: "", phone: "", email: ""});
  const [declining, setDeclining] = useState(false), [why, setWhy] = useState({reason: "", name: ""});
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (preview || viewed.has(token)) return;
    viewed.add(token);
    try { portal.view(token, viewer); } catch { /* a bad or closed link records nothing */ }
  }, [token]);
  void rows;   // re-read when the console changes the job

  if (!loaded) return (
    <div className="icard"><Sk w={240} h={22} /><div style={{ marginTop: 10 }}><Sk w="70%" h={14} /></div>
      <div className="jobfacts">{Array.from({length: 4}, (_, i) => <div key={i}><Sk w={56} h={9} /><Sk w={110} h={14} /></div>)}</div><Sk w="100%" h={120} /></div>
  );
  let job;
  try { job = portal.inspection(token, preview ? "" : viewer); }
  catch (e) {   // a canceled, reset or long-closed job (410) is not a bad link: its own words, and no new link to ask for
    const gone = e.status === 410;
    return <div className="icard"><h1>{gone ? "This job is no longer available" : "This link is not valid"}</h1>
      <p className="lead">{e.message}{gone ? "" : " Ask whoever sent it to you for a new link."}</p></div>;
  }
  const done = !!job.report_id;
  const previewNote = preview ? <p className="ipreview">Preview from the Inspectd console. Nothing on this page is recorded, and claiming and declining are turned off.</p> : null;
  const foot = <p className="ifoot">This page is only for this inspection. Nothing else about the customer is shared.</p>;

  // claim and decline (booking.py's routes): the first provider to claim gets the job
  const doClaim = () => {
    const missing = ["name", "company", "phone"].filter(k => !who[k].trim());
    if (missing.length) { setErr(`Please give your ${missing.join(", ")}.`); return; }
    if (!terms) { setErr("Accept the terms to claim this job."); return; }
    setBusy(true);
    try { portal.claim(token, {...who, accept_terms: true}, viewer); setErr(""); notify("Job claimed", "It is yours. Upload the report here when the inspection is done.", "blue", 5000); }
    catch (e) { setErr(e.message); notify("Could not claim the job", e.message, "red"); }
    finally { setBusy(false); }
  };
  const doReject = () => {
    try { portal.reject(token, why, viewer); notify("Job declined", "Thanks for letting us know.", "blue", 5000); }
    catch (e) { notify("Could not decline the job", e.message, "red"); }
  };
  // the upload itself is not part of this demo (docs/platform-iteration-notes.md)
  const noUpload = e => { e.preventDefault(); setDrag(false); notify("Uploads aren't available in this demo", "In the live app the PDF becomes the customer's report here. This demo's reports were converted ahead of time.", "blue", 6000); };

  if (job.you === "declined") return (<>{previewNote}
    <div className="icard"><h1>You declined this job</h1>
      <p className="lead">{`Thanks for letting us know${job.declined_at ? ` (${fmtWhen(job.declined_at)})` : ""}. Inspectd is finding another inspector.`}</p>
      <div className="jobfacts">{facts(job)}</div></div>{foot}
  </>);
  if (job.taken) return (<>{previewNote}
    <div className="icard"><h1>This job has been taken</h1>
      <p className="lead">Another provider claimed this job. Thanks for looking; Inspectd will send you the next one near you.</p>
      <div className="jobfacts">{facts(job)}</div></div>{foot}
  </>);

  const offered = job.you !== "claimed";
  const field = (k, label, opt) => (
    <label className="iff"><span>{label}{opt ? <i> optional</i> : null}</span>
      <input id={`claim_${k}`} value={who[k]} disabled={preview} onChange={e => { setWho(w => ({...w, [k]: e.target.value})); setErr(""); }} autoComplete={k === "company" ? "organization" : k === "phone" ? "tel" : k} /></label>);
  return (<>{previewNote}
    <div className="icard">
      <h1>{done ? "Report received" : offered ? "Inspection job available" : "Upload your inspection report"}</h1>
      <p className="lead">{done
        ? `Thanks. ${job.customer || "The customer"} can read it now. Uploaded ${fmtWhen(job.uploaded_at)}.`
        : offered
          ? "This inspection is open to the providers Inspectd sent it to. The first to claim it gets the job; decline it if you can't take it."
          : `${job.provider ? job.provider + " has" : "You have"} claimed this job. When you are done, drop your report PDF here and we turn it into a readable report for the customer.`}</p>
      <div className="jobfacts">{facts(job)}</div>
      <Damage j={job} />
      {job.note ? <div className="inote">{job.note}</div> : null}
      {done ? <div className="idone"><Svg src={CHECK} /><div><b>Delivered</b><p>Uploaded the wrong file? Drop the right one below and it replaces the report.</p></div></div> : null}
      {offered ? (
        <div className="inote" id="claimBox">
          <div className="ifields">{field("name", "Your name")}{field("company", "Company")}{field("phone", "Phone")}{field("email", "Email", true)}</div>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", marginTop: 12 }}>
            <input type="checkbox" id="acceptTerms" checked={terms} disabled={preview} onChange={e => { setTerms(e.target.checked); setErr(""); }} style={{ marginTop: 3 }} />
            <span>{job.terms?.summary}</span></label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn primary" type="button" id="claimBtn" disabled={busy || preview} onClick={doClaim}>Claim this job</button>
            <button className="btn" type="button" id="rejectBtn" disabled={busy || preview} onClick={() => setDeclining(d => !d)}>Decline</button>
            {err ? <span className="err" style={{ color: "var(--red)", fontSize: 13 }}>{err}</span> : null}
          </div>
          {declining ? (
            <div className="ifields" id="declineBox" style={{ marginTop: 14 }}>
              <label className="iff wide"><span>Why are you passing? <i>optional</i></span><input id="decline_reason" maxLength={300} placeholder="e.g. Not available that day" value={why.reason} onChange={e => setWhy(w => ({...w, reason: e.target.value}))} /></label>
              <label className="iff"><span>Your name or company <i>optional</i></span><input id="decline_name" maxLength={120} value={why.name} onChange={e => setWhy(w => ({...w, name: e.target.value}))} /></label>
              <div className="iff"><span>&nbsp;</span><button className="btn danger" type="button" id="declineBtn" onClick={doReject}>Decline job</button></div>
            </div>) : null}
        </div>
      ) : (
        <label className={`idrop${drag ? " drag" : ""}`} id="drop" onClick={noUpload}
               onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={noUpload}>
          <b>{done ? "Replace the report" : "Drop your report PDF here"}</b>
          <p>PDF from any inspection app. Photos and the checklist come across automatically.</p>
          <button className="btn primary" type="button" id="pick" onClick={noUpload}>Choose PDF</button>
          <p style={{ marginTop: 10 }} id="dropHint"></p>
        </label>
      )}
    </div>
    {foot}
  </>);
}
