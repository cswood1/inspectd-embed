import React, { useEffect, useRef, useState } from "react";
import "./jobcard.css";
import { usePlatform } from "./PlatformStore.jsx";
import { useNotices, Sk } from "./portalUi.jsx";
import { TIME_WINDOWS, PROPOSE_DAYS, DECLINE_REASONS, plannedLabel, dollars } from "./jobModel.js";

/*
 * The provider's job card: the page at /inspect/<token> a provider opens from the job link, most often on a phone
 * from a text. One column, the facts that decide the job first, large tap targets; a centered card on desktop.
 *
 * Its state depends on who is looking (a per-browser viewer id, since providers have no accounts):
 *   open      anyone, before a claim: payout, vehicle, inspection and what the report covers, city and state; Claim or Decline
 *   claimed   the browser that claimed it: the call to make, the address, a checklist, and where the report goes
 *   taken     someone else claimed it        declined  this browser passed, before anyone claimed it
 *   gone      a reset turned the link off, or the job was canceled        complete  the report is in
 * ?preview=1 (the console's "Open") renders the open card with the actions off, and records nothing.
 */

// This browser's id on job links. Kept in the browser.
const VIEWER_KEY = "inspectd_link_viewer";
function viewerId(){
  try { let v = localStorage.getItem(VIEWER_KEY); if (!v) { v = "v_" + Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem(VIEWER_KEY, v); } return v; }
  catch { return ""; }
}
const viewed = new Set();   // one view per page load, even when React mounts the page twice in development
const fmtDay = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric"}).replace(",", ""); };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tel = p => `tel:${String(p || "").replace(/[^\d+]/g, "")}`;
const mapsUrl = a => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
// the checklist's ticks: this provider's own, in this browser, per link
const ticksKey = token => `inspectd_jobcard_ticks:${token}`;
const loadTicks = token => { try { return JSON.parse(localStorage.getItem(ticksKey(token)) || "[]"); } catch { return []; } };

const ClassTag = ({ c, label }) => c === "ev" || c === "exotic" ? <span className="jc-tag">{label}</span> : null;
const Vehicle = ({ j, where = false }) => (
  <div className="jc-veh"><h1>{j.vehicle}<ClassTag c={j.vehicle_class} label={j.vehicle_class_label} /></h1>
    <p>{j.inspection}{where && j.where ? ` · ${j.where}` : ""}</p>
    {j.ref ? <p className="jc-ref mono" id="jobRef">{j.ref}</p> : null}</div>
);
// a short message, with the vehicle it is about
const Message = ({ j, tone = "", title, children }) => (
  <div className="jc-card"><div className={`jc-msg ${tone}`}><b>{title}</b><p>{children}</p></div><Vehicle j={j} where /></div>
);

export function JobCard({ token }){
  const { portal, rows } = usePlatform();
  const { notify } = useNotices();
  const preview = new URLSearchParams(window.location.search).has("preview");
  const viewer = useRef(viewerId()).current;
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState(null);   // null | "claim" | "decline": which form is open
  const [who, setWho] = useState({name: "", company: "", phone: "", email: ""});
  const [when, setWhen] = useState({date: "", window: ""});
  const [terms, setTerms] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [why, setWhy] = useState({reason: "", name: ""});
  const [ticks, setTicks] = useState(() => loadTicks(token));
  const formTop = useRef(null);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (preview || viewed.has(token)) return;
    viewed.add(token);
    try { portal.view(token, viewer); } catch { /* a bad or closed link records nothing */ }
  }, [token]);
  useEffect(() => { if (mode) formTop.current?.scrollIntoView({block: "start", behavior: "smooth"}); }, [mode]);
  void rows;   // re-read when the job changes

  if (!loaded) return <div className="jc-card"><Sk w={120} h={34} /><div style={{ marginTop: 18 }}><Sk w="80%" h={22} /></div><div style={{ marginTop: 10 }}><Sk w="60%" h={14} /></div><div style={{ marginTop: 24 }}><Sk w="100%" h={140} /></div></div>;
  let j;
  try { j = portal.inspection(token, preview ? "" : viewer); }
  catch (e) { return <div className="jc-card"><div className="jc-msg"><b>This link is not valid</b><p>{e.message}</p></div></div>; }

  // preview always shows the open card, whatever the job's state, with the actions off
  const state = preview ? "open" : j.state;
  if (state === "gone") return <Message j={j} title="No longer available">{j.why === "canceled" ? "This inspection was canceled. You don't need to go out for it." : "This job is no longer available. Inspectd may send a new link if it needs an inspector again."}</Message>;
  if (state === "complete") return <Message j={j} tone="good" title="Complete">{`The report is in${j.uploaded_at ? ` (${fmtDay(j.uploaded_at)})` : ""}. Thanks; there's nothing more to do on this job.`}</Message>;
  if (state === "taken") return <Message j={j} title="This job has been taken">Another provider claimed it first. Thanks for looking; Inspectd will send you the next one near you.</Message>;
  if (state === "declined") return <Message j={j} title="You declined this job">{`Thanks for letting us know${j.declined_at ? ` (${fmtDay(j.declined_at)})` : ""}. If you change your mind, ask whoever sent you the link.`}</Message>;

  const payout = j.payout_cents != null ? dollars(j.payout_cents) : "";
  const covers = j.requirements || [];

  /* ---- claimed by this browser ---- */
  if (state === "claimed") {
    const done = ticks.length;
    const tick = i => { const next = ticks.includes(i) ? ticks.filter(x => x !== i) : [...ticks, i]; setTicks(next); try { localStorage.setItem(ticksKey(token), JSON.stringify(next)); } catch { /* ticks stay for this visit */ } };
    const noUpload = e => { e.preventDefault(); notify("Uploads aren't available in this demo", "In the live app the PDF becomes the customer's report here. This demo's reports were converted ahead of time.", "blue", 6000); };
    return (
      <div className="jc-card">
        <div className="jc-mine"><b>Claimed by you</b><span className="jc-pay sm">{payout}</span>
          <p>{j.planned ? `Planned: ${j.planned}` : ""}</p></div>
        <div className="jc-next" id="nextStep">
          <small>Next step</small>
          <b>{`Call ${j.contact?.name || "the on-site contact"} to confirm arrival and vehicle access`}</b>
          {j.contact?.phone ? <a className="jc-btn primary big" id="callBtn" href={tel(j.contact.phone)}>{`Call ${j.contact.phone}`}</a> : null}
        </div>
        <section className="jc-sec"><h2>Where</h2>
          <p className="jc-addr" id="address">{j.address}</p>
          {j.site ? <p className="jc-sub">{[j.site.name, j.site.contact_name, j.site.contact_phone].filter(Boolean).join(" · ")}</p> : null}
          <a className="jc-btn" id="navBtn" href={mapsUrl(j.address)} target="_blank" rel="noopener">Navigate</a></section>
        <section className="jc-sec"><h2>Vehicle</h2><Vehicle j={j} />{j.vin ? <p className="jc-sub mono">{`VIN ${j.vin}`}</p> : null}
          {j.customer_ref ? <p className="jc-sub" id="customerRef">{`Customer reference ${j.customer_ref}`}</p> : null}</section>
        {j.notes ? <section className="jc-sec"><h2>Customer's notes</h2><p className="jc-quote">{j.notes}</p></section> : null}
        <section className="jc-sec"><h2>Your report covers <span className="jc-count" id="tickCount">{`${done} of ${covers.length}`}</span></h2>
          <ul className="jc-check" id="checklist">{covers.map((c, i) => (
            <li key={i}><label><input type="checkbox" checked={ticks.includes(i)} onChange={() => tick(i)} /><span>{c}</span></label></li>))}</ul>
          <p className="jc-sub">Ticks are just for you, kept on this phone.</p></section>
        <section className="jc-sec"><h2>Submit your report</h2>
          <label className="jc-drop" id="drop" onClick={noUpload}><b>Upload your report PDF</b><span>PDF from any inspection app.</span>
            <span className="jc-btn primary" id="pick">Choose PDF</span></label></section>
      </div>
    );
  }

  /* ---- open: anyone with the link ---- */
  const today = new Date(), last = new Date(); last.setDate(today.getDate() + PROPOSE_DAYS);
  const claim = () => {
    const missing = ["name", "company", "phone"].filter(k => !who[k].trim());
    if (missing.length) return setErr(`Please give your ${missing.join(", ")}.`);
    if (!when.date || !when.window) return setErr("Say when you can inspect it: a date and morning, afternoon or evening.");
    if (!terms) return setErr("Accept the terms to claim this job.");
    setBusy(true);
    try { portal.claim(token, {...who, proposed_time: when, accept_terms: true}, viewer); setErr(""); setMode(null); notify("Job claimed", "It's yours. Call the on-site contact next.", "blue", 5000); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const decline = () => {
    if (!why.reason) return setErr("Pick a reason.");
    try { portal.reject(token, why, viewer); setErr(""); setMode(null); }
    catch (e) { setErr(e.message); }
  };
  const field = (k, label, opt, type = "text") => (
    <label className="jc-f"><span>{label}{opt ? <i> optional</i> : null}</span>
      <input id={`claim_${k}`} type={type} value={who[k]} onChange={e => { setWho(w => ({...w, [k]: e.target.value})); setErr(""); }}
        autoComplete={k === "company" ? "organization" : k === "phone" ? "tel" : k} inputMode={k === "phone" ? "tel" : undefined} /></label>);
  return (
    <div className="jc-card">
      {preview ? <p className="jc-preview" id="previewLabel"><b>Preview</b> What a provider sees. Nothing here is recorded, and the actions are off.</p> : null}
      <div className="jc-pay" id="payout">{payout}</div>
      <p className="jc-paynote">Paid when your report is accepted.</p>
      <Vehicle j={j} />
      <p className="jc-where" id="where">{j.where}<span>Full address after you claim</span></p>
      {j.notes || j.timeframe ? <section className="jc-sec"><h2>From the customer</h2>
        {j.timeframe ? <p className="jc-sub"><b>{`Needed ${j.timeframe}`}</b></p> : null}
        {j.notes ? <p className="jc-quote">{j.notes}</p> : null}</section> : null}
      {j.listing ? <section className="jc-sec"><h2>From the listing</h2>
        <p className="jc-sub">{[j.listing.title_status ? `${j.listing.title_status[0].toUpperCase()}${j.listing.title_status.slice(1)} title` : "", Number.isFinite(j.listing.mileage) ? `${j.listing.mileage.toLocaleString()} mi` : ""].filter(Boolean).join(" · ")}</p>
        {j.listing.damage.map((d, i) => <p key={i} className="jc-sub">{`${(d.type || "").replaceAll("_", " ").replace(/^\w/, c => c.toUpperCase())}${d.severity ? ` (${d.severity})` : ""}: ${(d.areas || []).map(a => a.replaceAll("_", " ")).join(", ")}${d.notes ? `. ${d.notes}` : ""}`}</p>)}</section> : null}
      <section className="jc-sec"><h2>The report covers</h2><ul className="jc-list" id="requirements">{covers.map((c, i) => <li key={i}>{c}</li>)}</ul></section>

      <div ref={formTop}></div>
      {mode === "claim" ? (
        <section className="jc-form" id="claimForm"><h2>Claim this job</h2>
          {field("name", "Your name")}{field("company", "Company")}{field("phone", "Phone", false, "tel")}{field("email", "Email", true, "email")}
          <label className="jc-f"><span>When can you inspect it?</span>
            <input id="claim_date" type="date" min={ymd(today)} max={ymd(last)} value={when.date} onChange={e => { setWhen(w => ({...w, date: e.target.value})); setErr(""); }} /></label>
          <div className="jc-seg" role="radiogroup" aria-label="Part of the day">{TIME_WINDOWS.map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={when.window === k} className={when.window === k ? "on" : ""} data-w={k}
              onClick={() => { setWhen(w => ({...w, window: k})); setErr(""); }}>{label}</button>))}</div>
          <p className="jc-callnote">After you claim, you call the on-site contact to confirm your arrival time and access to the vehicle. Their name and number appear here once the job is yours.</p>
          <label className="jc-terms"><input type="checkbox" id="acceptTerms" checked={terms} onChange={e => { setTerms(e.target.checked); setErr(""); }} /><span>{j.terms?.summary}</span></label>
          {err ? <p className="jc-err" id="formErr">{err}</p> : null}
          <div className="jc-row"><button className="jc-btn primary big" id="claimSubmit" disabled={busy} onClick={claim}>{when.date && when.window ? `Claim for ${plannedLabel(when)}` : "Claim this job"}</button>
            <button className="jc-btn" onClick={() => { setMode(null); setErr(""); }}>Back</button></div>
        </section>
      ) : mode === "decline" ? (
        <section className="jc-form" id="declineForm"><h2>Decline this job</h2>
          <div className="jc-reasons" role="radiogroup" aria-label="Why are you passing?">{DECLINE_REASONS.map(r => (
            <button key={r} type="button" role="radio" aria-checked={why.reason === r} className={why.reason === r ? "on" : ""} onClick={() => { setWhy(w => ({...w, reason: r})); setErr(""); }}>{r}</button>))}</div>
          <label className="jc-f"><span>Your name or company<i> optional</i></span><input id="decline_name" maxLength={120} value={why.name} onChange={e => setWhy(w => ({...w, name: e.target.value}))} /></label>
          {err ? <p className="jc-err" id="formErr">{err}</p> : null}
          <div className="jc-row"><button className="jc-btn danger big" id="declineSubmit" onClick={decline}>Decline job</button>
            <button className="jc-btn" onClick={() => { setMode(null); setErr(""); }}>Back</button></div>
        </section>
      ) : (
        <div className="jc-actions" id="actions">
          <button className="jc-btn primary big" id="claimBtn" disabled={preview} onClick={() => setMode("claim")}>Claim this job</button>
          <button className="jc-btn big" id="declineBtn" disabled={preview} onClick={() => setMode("decline")}>Decline</button>
        </div>
      )}
    </div>
  );
}
