import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { PORTAL, inspectLink } from "./seed.js";
import { STATUS, fmt, vehicle, isClosed, Icon, ClassTag, useToast, useAsk } from "./ui.jsx";
import { inspectionLabel, classLabel, dollars, plannedLabel, isConsumer, orderedByOf, orderedByLabel } from "./jobModel.js";
import { activityOf } from "./activity.js";

/*
 * The job panel, built around what can be done with the job next: its details, the providers found for it,
 * its one job link (open dispatch: shared with every provider, the first to claim gets it), the report,
 * what has happened, internal notes, and Cancel or Reset at the bottom. See docs/platform/decisions.md.
 *
 * position:fixed, so it anchors to the .ip pane (contain:layout) and never covers the dev bar.
 */

// Who the job is for: a consumer's job is the person's; a business's is the company's.
export const requester = r => !isConsumer(r) && r.org ? {name: r.org.name, sub: r.form.email, business: true} : {name: r.form.name, sub: r.form.email, business: false};
// "Consumer", "Fleet · Meridian Fleet Services", "Marketplace · ReBuilt Autos, through its embed"
const orderedByText = r => { const k = orderedByOf(r), label = orderedByLabel(k);
  return k === "consumer" || !r.org ? label : `${label} · ${r.org.name}${r.partner ? ", through its embed" : ""}`; };
const money = c => "$" + ((c || 0) / 100).toFixed(2);
const place = f => [f.city, (f.state || "").toUpperCase()].filter(Boolean).join(", ");
const site = u => (u || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
// links that would leave the demo stay put
const stay = e => e.preventDefault();
const TOP = 5;   // providers shown before "Show all"

const Sec = ({ title, right = null }) => <div className="sec">{title}<span className="sp"></span>{right}</div>;
const Fact = ({ k, v, wide }) => v ? <div className={wide ? "wide" : undefined}><small>{k}</small><span>{v}</span></div> : null;

// From the listing: what a partner's link said about the car. Only jobs that came through a listing have it.
function Listing({ r }){
  const x = r.meta?.partner_ref, rv = r.meta?.revroom; if (!x && !rv) return null;
  const lot = rv?.location || {}, dmg = rv?.damage || [];
  const parts = [x?.title ? `${x.title} title` : "", Number.isFinite(rv?.mileage) ? `${rv.mileage.toLocaleString()} mi` : "", lot.name ? `at ${lot.name}` : "",
                 [lot.contact_name, lot.contact_phone].filter(Boolean).join(" · ")].filter(Boolean);
  return <div className="note">{`From ${r.partner?.name || "the listing"} (${x?.listing || rv?.listing_id || ""}): ${parts.join(", ")}.`}
    {dmg.map((d, i) => <div key={i}>{`${(d.type || "").replaceAll("_", " ")}${d.severity ? ` (${d.severity})` : ""}, ${(d.areas || []).map(a => a.replaceAll("_", " ")).join(", ")}${d.notes ? `. ${d.notes}` : ""}`}</div>)}</div>;
}

export function JobPanel({ row: r, rows, open, onClose, onOpenPortal, onViewAll, intent, closeRef }){
  const { api, fulfill, me } = usePlatform();
  const toast = useToast(), ask = useAsk();   // ask: the in-page confirm() and prompt() (ui.jsx Dialog)
  const over = useRef(null), body = useRef(null), notesTimer = useRef(null), handled = useRef(null);
  const [allShops, setAllShops] = useState(false), [busy, setBusy] = useState(false);

  useEffect(() => { if (over.current) over.current.inert = !open; }, [open]);
  useEffect(() => { setAllShops(false); setBusy(false); }, [r?.id]);
  useEffect(() => () => clearTimeout(notesTimer.current), [r?.id]);
  // the panel keeps one scrolling body: a different job starts at its top, the same job reopens where it was left
  const shownId = useRef(null);
  useLayoutEffect(() => { if (r && r.id !== shownId.current) { if (body.current) body.current.scrollTop = 0; shownId.current = r.id; } }, [r?.id]);

  const fail = e => toast(e.message);
  const search = () => { fulfill(r.id, me?.name || me?.email || ""); toast("Finding providers"); };
  const createLink = () => { try { api.createLink(r.id); toast("Job link created"); } catch (e) { fail(e); } };
  const cancel = async () => {
    const paid = r.meta?.order?.payment_intent && r.meta.order.amount_cents && !r.meta.refund;
    const text = [paid ? `The customer paid ${money(r.meta.order.amount_cents)}. They will be refunded and emailed.` : "",
                  r.status === "claimed" ? "A provider has claimed it; if they left an email, they are told it's off." : "",
                  r.meta?.link ? "The job link will show the job as canceled." : ""].filter(Boolean).join(" ");
    const reason = await ask({title: "Cancel this job?", text, input: {label: "Reason", placeholder: "For example: the car was sold"}, ok: paid ? "Cancel and refund" : "Cancel job", cancel: "Keep it", danger: true});
    if (reason === null) return;
    setBusy(true);
    try { api.cancel(r.id, {reason}); toast(paid ? `Canceled; ${money(r.meta.order.amount_cents)} refunded` : "Job canceled"); } catch (e) { fail(e); }
    setBusy(false);
  };
  const reset = async () => {
    const ok = await ask({title: "Reset this job to New?", text: `${r.meta?.link ? "Its job link is turned off, and anyone who opens it sees the job is no longer available. " : ""}The provider results are kept, so you can create a new link and dispatch it again.`, ok: "Reset job", cancel: "Keep it canceled"});
    if (!ok) return;
    try { api.reset(r.id); toast("Job reset to New"); } catch (e) { fail(e); }
  };

  // the board's buttons: "Find providers" opens the panel and starts the search; "Reset" opens it with the confirm
  useEffect(() => {
    if (!open || !r || !intent || intent.id !== r.id || handled.current === intent.n) return;
    handled.current = intent.n;
    if (intent.action === "search" && !isClosed(r) && (!r.search || r.search.state === "failed")) search();
    if (intent.action === "reset" && r.status === "canceled") reset();
  });

  const shell = inner => (<>
    <div className={`scrim${open ? " on" : ""}`} onClick={onClose}></div>
    <aside className={`over${open ? " on" : ""}`} ref={over} aria-hidden={open ? undefined : "true"}>{inner}</aside>
  </>);
  if (!r) return shell(<div className="ohead"><div className="ht"><h2></h2><p></p></div><button className="btn icon" title="Close" ref={closeRef} onClick={onClose}><Icon name="x" /></button></div>);

  const f = r.form, w = requester(r), [hue, label] = STATUS[r.status] || ["gray", r.status];
  const m = r.meta || {}, link = m.link, rep = m.report, o = m.order, closed = isClosed(r);
  const onNotes = e => { const v = e.target.value; clearTimeout(notesTimer.current); notesTimer.current = setTimeout(() => { try { api.patch(r.id, {notes: v}); toast("Notes saved"); } catch (er) { fail(er); } }, 700); };
  const related = w.business ? rows.filter(x => x.id !== r.id && x.org?.id === r.org.id) : rows.filter(x => x.id !== r.id && isConsumer(x) && x.form.email.toLowerCase() === f.email.toLowerCase());
  const shops = r.result?.shops || [], shown = allShops ? shops : shops.slice(0, TOP);
  const copyContacts = () => {
    const lines = [`Providers for ${vehicle(f)}, ${place(f)}`, ""];
    shops.forEach((s, i) => { lines.push(`${i + 1}. ${s.name} (${s.mobile ? "mobile" : "shop"}, ${s.distance || ""})`); [s.phone, s.email, s.website].filter(Boolean).forEach(v => lines.push(`   ${v}`)); });
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast("Copied the contact list"), () => toast("Copy failed"));
  };

  /* ---- providers: who we send the link to ---- */
  const searching = r.search?.state === "running";
  const providers = () => {
    if (searching) return <div className="busy"><span className="spin"></span>{` Finding inspectors near ${place(f)}…`}</div>;
    if (!r.search) return closed ? <p className="bnone">No providers were searched for.</p>
      : <div className="pempty"><p className="bnone">Not searched yet.</p><button className="btn primary sm" id="findbtn" onClick={search}><Icon name="search" size={13} /> Find providers</button></div>;
    if (r.search.state === "failed") return <><div className="fail">{r.search.error || "The search failed."}</div>
      {closed ? null : <div className="pempty"><button className="btn sm" id="findbtn" onClick={search}><Icon name="refresh" size={13} /> Search again</button></div>}</>;
    return (<>
      <p className="psum">{r.result?.summary}</p>
      <div className="plist">{shown.map((s, i) => (
        <div key={i} className="prow">
          <b>{s.name}</b>
          <span className="sub" title={s.distance || ""}>{s.mobile ? "Mobile" : "Shop"}{s.distance ? ` · ${s.distance.replace(/^mobile,\s*/i, "")}` : ""}</span>
          <span className="pc">{s.phone ? <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} onClick={stay}>{s.phone}</a> : null}
            {s.website ? <a href={s.website} target="_blank" rel="noopener" onClick={stay}>{site(s.website)}</a> : null}</span>
        </div>))}</div>
      {shops.length > TOP ? <button className="linkbtn" id="showall" onClick={() => setAllShops(a => !a)}>{allShops ? "Show fewer" : `Show all ${shops.length}`}</button> : null}
    </>);
  };

  /* ---- the job link ---- */
  const jobLink = () => {
    const past = (m.past_links || []).length;
    const earlier = past ? <p className="bnone">{`${past} earlier link${past === 1 ? " was" : "s were"} turned off by a reset.`}</p> : null;
    if (!link) return (<>
      {r.status === "new" ? <div className="pempty"><p className="bnone">No link yet. Create it, then send it to the providers above; the first to claim gets the job.</p>
        <button className="btn primary sm" id="mklink" onClick={createLink}><Icon name="copy" size={13} /> Create job link</button></div>
        : <p className="bnone">No job link.</p>}
      {earlier}</>);
    const url = inspectLink(link.token), c = link.claim, dn = link.declines.length;
    return (<>
      <div className="linkrow"><Icon name="copy" size={14} /><span className="mono" id="linkurl">{url}</span>
        <button className="btn sm" id="copylink" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Job link copied"), () => toast("Copy failed"))}>Copy</button>
        <a className="btn sm" id="openlink" href={`${url}?preview=1`} target="_blank" rel="noopener" title="Opens the provider's page as a preview; nothing is recorded">Open</a></div>
      <div className="lstats">
        <span>{`Created ${fmt(link.created_at)}${link.created_by ? ` by ${link.created_by}` : ""}`}</span>
        <span id="linkviews">{`${link.views.length} view${link.views.length === 1 ? "" : "s"}`}</span>
        {dn ? <details className="declines"><summary>{`${dn} decline${dn === 1 ? "" : "s"}`}</summary>
          <ul>{link.declines.map((d, i) => <li key={i}><b>{d.name || "A provider"}</b>{d.reason ? `: ${d.reason}` : ""} <span className="sub">{fmt(d.at)}</span></li>)}</ul></details>
          : <span>No declines</span>}
      </div>
      {c ? <div className="claimed" id="claimline"><Icon name="check" size={14} /><span><b>{`Claimed by ${c.name}${c.company ? `, ${c.company}` : ""}`}</b>
        {c.proposed_time ? ` · plans ${plannedLabel(c.proposed_time)}` : ""}{` · claimed ${fmt(c.at)}`}{c.phone ? ` · ${c.phone}` : ""}{c.email ? ` · ${c.email}` : ""}<span className="sub">{` · terms v${c.terms?.version || "1"} accepted`}</span></span></div> : null}
      {r.status === "canceled" ? <p className="bnone">The job is canceled, so the link shows it as canceled. Reset turns it off.</p> : null}
      {earlier}
    </>);
  };

  const act = activityOf(r);
  return shell(<>
    <div className="ohead">
      <div className="ht"><h2 id="otitle">{vehicle(f)}<ClassTag c={f.vehicle_class} /></h2>
        <p id="osub">{w.name}{" "}<span className={`pill ${hue}`} style={{ marginLeft: 6 }}>{label}</span><span className="opay">{r.payout_cents != null ? `${dollars(r.payout_cents)} payout` : ""}</span></p></div>
      <button className="btn icon" id="closebtn" title="Close" ref={closeRef} onClick={onClose}><Icon name="x" /></button>
    </div>
    <div className="obody" id="obody" ref={body}>
      {m.canceled ? <div className="callout" style={{ margin: "12px 0 0" }}><Icon name="x" size={14} /><span><b>Canceled</b>{` ${fmt(m.canceled.at)}${m.canceled.by ? ` by ${m.canceled.by}` : ""}${m.canceled.reason ? ` · ${m.canceled.reason}` : ""}`}</span></div> : null}

      <Sec title="Details" />
      <div className="facts dense">
        <Fact k="Inspection" v={inspectionLabel(f)} /><Fact k="Vehicle class" v={classLabel(f.vehicle_class || "standard")} /><Fact k="VIN" v={f.vin} />
        <Fact k="Received" v={fmt(r.created_at)} />
        <Fact k="Address" v={[f.address, f.city, f.state, f.zip].filter(Boolean).join(", ")} wide />
        <Fact k="On-site contact" v={[f.name, f.phone, f.email].filter(Boolean).join(" · ")} wide />
        <Fact k="Ordered by" v={orderedByText(r)} />
        <Fact k="Paid" v={o ? `${money(o.amount_cents)}${m.refund ? ` · refunded ${fmt(m.refund.at)}` : ""}` : ""} />
      </div>
      {f.notes ? <div className="note">{f.notes}</div> : null}
      <Listing r={r} />
      {related.length ? <button className="linkbtn" id="relatedlink" onClick={() => onViewAll(w.business ? r.org.name : f.email)}>
        {`${related.length} other job${related.length === 1 ? "" : "s"} from ${w.name}`}</button> : null}

      <Sec title="Providers" right={r.search?.state === "done" ? <>
        <button className="btn sm" id="copyall" onClick={copyContacts}><Icon name="copy" size={13} /> Copy</button>
        {closed ? null : <button className="btn sm" id="researchbtn" onClick={search} disabled={searching}>Search again</button>}</> : null} />
      {providers()}

      <Sec title="Job link" />
      {jobLink()}

      <Sec title="Report" />
      <div className="reprow">{rep?.id
        ? <><Icon name="doc" size={14} /><b>Report received</b><span className="sub">{` ${fmt(rep.at)}`}</span>
            <a className="btn sm primary" id="viewreport" style={{ marginLeft: "auto" }} href={`${PORTAL}/reports/${rep.id}`} target="_blank" rel="noopener" onClick={e => { stay(e); onOpenPortal(`/reports/${rep.id}`, {report: rep.id}); }}>View report</a></>
        : <><Icon name="doc" size={14} /><span className="sub">No report yet</span></>}</div>

      <Sec title="Activity" />
      <ol className="activity" id="activity">{act.map((a, i) => (
        <li key={i}><span className="when">{fmt(a.at)}</span><span><b>{a.what}</b>{a.who ? <span className="sub">{` · ${a.who}`}</span> : null}{a.detail ? <span className="det">{a.detail}</span> : null}</span></li>))}</ol>

      <Sec title="Internal notes" />
      <textarea key={r.id} className="internal small" id="inotes" placeholder="Who you called, what they said" defaultValue={r.notes} onChange={onNotes}></textarea>

      <div className="pactions">
        {r.status === "canceled" ? <button className="btn primary" id="resetbtn" onClick={reset}><Icon name="refresh" size={14} /> Reset</button>
          : !closed ? <button className="btn danger" id="cancelbtn" disabled={busy} onClick={cancel}><Icon name="x" size={14} /> Cancel job</button> : null}
      </div>
    </div>
  </>);
}
