import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { PORTAL, inspectLink } from "./seed.js";
import { STATUS, fmt, where, vehicle, isClosed, Icon, CSelect, useToast, useAsk } from "./ui.jsx";
import { STATUSES, inspectionLabel, classLabel, dollars } from "./jobModel.js";

/*
 * The job detail slide-over: renderOver() and its helpers from inspection-requests/ui/shared/board.js,
 * with the #scrim / #over markup from the boards' view.html. Same markup, classes, wording and order:
 * the canceled callout, the status bar, Job, From the listing, Order, Provider, Call sheet, Internal
 * notes, Emails, Delete. Each action makes the call board.js makes, against PlatformStore's mirror of
 * the server, and toasts what Kavin's toasts.
 *
 * position:fixed, so it anchors to the .ip pane (contain:layout) and never covers the dev bar.
 */

// Who the job is for: a workspace's request is the business's; a walk-in is the person.
export const requester = r => r.org ? {name: r.org.name, sub: r.form.email, business: true} : {name: r.form.name, sub: r.form.email, business: false};
const CLAIM = {offered: ["gray", "Offered"], claimed: ["green", "Claimed"], rejected: ["red", "Declined"]};
// whether providers have been found: a detail of the job, not its status
const searchPill = r => !r.search ? ["gray", "Not searched"] : r.search.state === "running" ? ["blue", "Searching"]
  : r.search.state === "failed" ? ["red", "Failed"] : ["green", `${(r.result?.shops || []).length} found`];
// the provider fields the call sheet can fill in; everything but the name is optional
const BFIELDS = [["name", "Company or inspector", "c2", ""], ["phone", "Phone", "", "optional"], ["email", "Email", "", "optional · we send them the link"],
                 ["address", "Address", "c2", "optional"], ["website", "Website", "", "optional"], ["hours", "Hours", "", "optional"]];
const SHOP_KEYS = ["name", "phone", "email", "address", "website", "hours"];
const fromShop = sh => Object.fromEntries(SHOP_KEYS.map(k => [k, sh[k] || ""]));
// opening the form with nothing chosen: the shop already marked booked, if any, else blank
const shopPrefill = r => { const shops = r.result?.shops || [], i = shops.findIndex(s => s.booked); return i >= 0 ? {...fromShop(shops[i]), shop_index: i} : {}; };
const money = c => "$" + ((c || 0) / 100).toFixed(2);
// links that would leave the demo stay put
const stay = e => e.preventDefault();

const Sec = ({ title, right = null, style }) => <div className="sec" style={style}>{title}<span className="sp"></span>{right}</div>;
const Fact = ({ k, v }) => v ? <div><small>{k}</small><span>{v}</span></div> : null;
const Opt = ({ label, note }) => <small>{label}{note ? <i>{note}</i> : null}</small>;

// One damage record from a partner's listing, as a line:
// "Collision (moderate) · front end, right front · auction 2024-03-14 at 31,870 mi · airbags not deployed. Notes"
function damageLine(d){
  const words = s => (s || "").replaceAll("_", " ");
  const miles = n => Number.isFinite(n) ? `${n.toLocaleString()} mi` : "";
  const kind = [d.type ? words(d.type)[0].toUpperCase() + words(d.type).slice(1) : "", d.severity ? `(${d.severity})` : ""].filter(Boolean).join(" ");
  const sold = d.date ? `auction ${d.date}${miles(d.odometer_at_damage) ? ` at ${miles(d.odometer_at_damage)}` : ""}` : miles(d.odometer_at_damage);
  const air = d.airbags_deployed === true ? "airbags deployed" : d.airbags_deployed === false ? "airbags not deployed" : "";
  const flags = [d.structural ? "structural" : "", air].filter(Boolean).join(", ");
  const head = [kind, (d.areas || []).map(words).join(", "), sold, flags].filter(Boolean).join(" · ");
  return head + (d.notes ? `. ${d.notes}` : "");
}

// From the listing: what the partner's link said beyond the form's fields. Only jobs that came through a link have it.
function Listing({ r, toast }){
  const x = r.meta?.partner_ref || {}, rv = r.meta?.revroom; if (!r.meta?.partner_ref && !rv) return null;
  const ROLE = {dealer: "Dealer", private_party: "Private seller", shopper: "Shopper"};
  const facts = [["Ordering as", ROLE[x.role] || x.role], ["Listing", x.listing], ["Title", x.title], ["Damage", x.damage],
                 ["Filled by the listing", (x.from_listing || "").split(",").filter(Boolean).join(", ")]].filter(([, v]) => v);
  const lot = rv?.location || {}, privateSeller = rv?.seller === "private_party";
  const car = [["Seller", rv?.seller ? (privateSeller ? "Private seller" : "Dealership") : ""], ["Mileage", Number.isFinite(rv?.mileage) ? `${rv.mileage.toLocaleString()} mi` : ""]].filter(([, v]) => v);
  const site = [[privateSeller ? "Seller's name" : "At the lot", lot.name],
                [privateSeller ? "Seller's phone" : "Ask for", [privateSeller ? "" : lot.contact_name, lot.contact_phone].filter(Boolean).join(" · ")]].filter(([, v]) => v);
  const damage = rv?.damage || [];
  if (!facts.length && !car.length && !site.length && !x.damage_notes && !damage.length) return null;
  const name = r.partner?.name || "the listing";
  const open = /^https:\/\//.test(rv?.listing_url || "")
    ? <a className="btn sm" href={rv.listing_url} target="_blank" rel="noopener" onClick={e => { stay(e); toast(`${name}'s listing isn't live in this demo`); }}>{`Open on ${name}`}</a> : null;
  const all = [...facts, ...car, ...site];
  return (<>
    <Sec title="From the listing" right={open} />
    {all.length ? <div className="facts">{all.map(([k, v]) => <Fact key={k} k={k} v={v} />)}</div> : null}
    {x.damage_notes ? <div className="note">{x.damage_notes}</div> : null}
    {damage.map((d, i) => <div key={i} className="note">{damageLine(d)}</div>)}
  </>);
}

// Order: what the customer paid, how it splits, and the payment in Stripe. Only paid (public-form) jobs have one.
function Order({ r, toast, onRefund }){
  const o = r.meta?.order; if (!o) return null;
  const refund = r.meta?.refund;
  const pay = o.payment_intent ? <a className="btn sm" href={`https://dashboard.stripe.com/${o.livemode ? "" : "test/"}payments/${encodeURIComponent(o.payment_intent)}`} target="_blank" rel="noopener"
    onClick={e => { stay(e); toast("Stripe isn't connected in this demo"); }}>Open in Stripe</a> : null;
  // cancel and refund this job's own share of the payment; the customer is emailed, and it never happens twice
  const undo = o.payment_intent && !refund ? <button className="btn sm danger" id="refundbtn" type="button" disabled={!onRefund} onClick={onRefund}>Cancel and refund</button> : null;
  return (<>
    <Sec title="Order" right={<>{undo}{pay}</>} />
    <div className="facts">
      <Fact k="Paid" v={`${money(o.amount_cents)} · Tier ${o.tier}${o.label ? ` (${o.label})` : ""}`} />
      <Fact k="Inspectd fee" v={money(o.platform_fee_cents)} />
      <Fact k="Inspector payout" v={money(o.provider_payout_cents)} />
      {o.partner_share_cents ? <Fact k="Partner share" v={money(o.partner_share_cents)} /> : null}
      <Fact k="Paid at" v={fmt(o.paid_at)} />
      {refund ? <Fact k="Refunded" v={`${money(refund.amount_cents)} · ${fmt(refund.at)}${refund.by ? ` · ${refund.by}` : ""}`} /> : null}
    </div>
  </>);
}

export function JobPanel({ row: r, rows, open, closed, onClose, onOpen, onViewAll, onOpenPortal, unlinked, onUnlink, onRelink, closeRef }){
  const { api, fulfill } = usePlatform();
  const toast = useToast(), ask = useAsk();   // ask: the in-page confirm() and prompt() (ui.jsx Dialog)
  const over = useRef(null), body = useRef(null), notesTimer = useRef(null);
  const [form, setForm] = useState(null);      // {id, prefill, pick} while the team is filling the booking in
  const [bkerr, setBkerr] = useState(""), [saving, setSaving] = useState(false);
  const [linkPick, setLinkPick] = useState(null), [making, setMaking] = useState(false);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => { if (over.current) over.current.inert = !open; }, [open]);
  useEffect(() => { setForm(null); setBkerr(""); setLinkPick(null); setMaking(false); setRefunding(false); }, [r?.id, open]);
  useEffect(() => () => clearTimeout(notesTimer.current), [r?.id]);
  // the panel keeps one scrolling body: a different job starts at its top, the same job reopens where it was left
  const shownId = useRef(null);
  useLayoutEffect(() => { if (r && r.id !== shownId.current) { if (body.current) body.current.scrollTop = 0; shownId.current = r.id; } }, [r?.id]);

  const shell = inner => (<>
    <div className={`scrim${open ? " on" : ""}`} onClick={onClose}></div>
    <aside className={`over${open ? " on" : ""}`} ref={over} aria-hidden={open ? undefined : "true"}>{inner}</aside>
  </>);
  if (!r) return shell(
    <div className="ohead"><div className="ht"><h2></h2><p></p></div>
      <button className="btn primary" disabled><Icon name="search" size={14} /> Find providers</button>
      <button className="btn icon" title="Close" ref={closeRef} onClick={onClose}><Icon name="x" /></button></div>);

  const f = r.form, w = requester(r), [hue, label] = STATUS[r.status] || ["gray", r.status], [lhue, llabel] = searchPill(r);
  const searching = r.search?.state === "running";
  const cx = r.meta?.canceled, b = r.meta?.booking, rep = r.meta?.report, claim = r.inspect_claim;
  const shop = unlinked ? null : r.inspect_shop, url = unlinked || !r.meta?.inspect?.token ? null : inspectLink(r.meta.inspect.token);
  const shops = r.result?.shops || [], res = r.result, booked = b?.provider;
  const editing = form && form.id === r.id;
  const fail = e => toast(e.message);

  // status, notes and per-shop flags: PATCH, shown at once, with Kavin's toasts
  const patch = (patchBody, msg) => { try { api.patch(r.id, patchBody); if (msg) toast(msg); } catch (e) { fail(e); } };
  const onNotes = e => { const v = e.target.value; clearTimeout(notesTimer.current); notesTimer.current = setTimeout(() => patch({notes: v}, "Notes saved"), 700); };

  const related = r.org ? rows.filter(x => x.id !== r.id && x.org?.id === r.org.id) : rows.filter(x => x.id !== r.id && x.form.email.toLowerCase() === f.email.toLowerCase());
  const openBooking = prefill => setForm({id: r.id, prefill, pick: prefill.shop_index !== undefined ? String(prefill.shop_index) : prefill.name ? "other" : ""});
  const editBooking = () => {
    const idx = b ? shops.findIndex(s => (s.name || "").trim().toLowerCase() === (b.provider?.name || "").trim().toLowerCase()) : -1;
    openBooking(b ? {...b.provider, inspector: b.inspector, scheduled_at: b.scheduled_at, note: b.note, shop_index: idx >= 0 ? idx : undefined} : shopPrefill(r));
    setBkerr("");
  };
  const setField = (k, v) => setForm(x => ({...x, prefill: {...x.prefill, [k]: v}}));
  const pickShop = v => {
    if (v === "other" || v === "") {
      setForm(x => ({...x, pick: v, prefill: {...x.prefill, ...fromShop({}), shop_index: undefined}}));
      if (v === "other") setTimeout(() => body.current?.querySelector("#bk_name")?.focus(), 0);
      return;
    }
    setForm(x => ({...x, pick: v, prefill: {...x.prefill, ...fromShop(shops[+v]), shop_index: +v}}));
  };
  const saveBooking = () => {
    const v = k => String(form.prefill[k] || "").trim();
    const req = {provider: Object.fromEntries(BFIELDS.map(([k]) => [k, v(k)])), inspector: v("inspector"), scheduled_at: v("scheduled_at"), note: v("note")};
    if (form.prefill.shop_index !== undefined) req.shop_index = form.prefill.shop_index;
    if (!req.provider.name) { setBkerr("Who is doing the inspection?"); return; }
    setSaving(true);
    try {
      const { row: j, email } = api.book(r.id, req);
      setForm(null); setSaving(false); onRelink();
      toast(j.inspect_url ? (email?.sent ? `Booked; link emailed to ${req.provider.email}` : "Booked; copy the inspector's link") : "Booking updated");
    } catch (e) { setBkerr(e.message); setSaving(false); }
  };
  const makeLink = () => {
    const opts = linkOpts(), v = linkPick ?? opts[0][0];
    setMaking(true);
    try { const j = api.makeLink(r.id, v === "booked" ? {shop: b.provider} : {shop_index: +v}); onRelink(); toast(`Link ready for ${j.inspect_shop?.name || "the shop"}`); }
    catch (e) { toast(e.message); }
    setMaking(false);
  };
  const linkOpts = () => {
    const o = shops.map((s, i) => [String(i), s.name]);
    if (booked?.name && !shops.some(s => s.name === booked.name)) o.unshift(["booked", booked.name]);
    return o;
  };
  const refund = async () => {
    const amount = money(r.meta?.order?.amount_cents);
    if (!await ask({title: `Cancel this job and refund ${amount} to the customer? They will be emailed.`, danger: true})) return;
    const reason = (await ask({title: "Reason, for the job's history (optional):", input: {value: ""}})) || "";   // cancelling it still refunds, as prompt() did
    setRefunding(true);
    try { api.refund(r.id, {reason}); toast(`Refunded ${amount} and canceled`); } catch (e) { setRefunding(false); toast(e.message); }
  };
  const copySheet = () => {
    const lines = [`Inspection shops for ${r.form.name} (${vehicle(r.form)}, ${where(r.form)})`, ""];
    r.result.shops.forEach((s, i) => { lines.push(`${i + 1}. ${s.name}`); [["Address", s.address], ["Phone", s.phone], ["Email", s.email], ["Website", s.website], ["Hours", s.hours], ["Notes", s.notes]].forEach(([k, v]) => { if (v) lines.push(`   ${k}: ${v}`); }); if (s.sources.length) lines.push(`   Sources: ${s.sources.join(" ")}`); lines.push(""); });
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast("Copied contact sheet"), () => toast("Copy failed"));
  };

  // ---- Provider: who has the job, where they stand on it, the link that carries it, the booking, the report
  const provider = () => {
    const head = <Sec title="Provider" right={editing ? <button className="btn sm" id="bkcancel" onClick={() => setForm(null)}>Cancel</button>
      : <button className={`btn sm ${b ? "" : "primary"}`} id="bkedit" onClick={editBooking}>{b ? "Edit booking" : <><Icon name="check" size={13} /> Book</>}</button>} />;
    if (editing) {
      const v = form.prefill;
      const picker = shops.length ? (
        <label className="c2"><Opt label="From the call sheet" note="fills the fields below" />
          <CSelect value={form.pick} onChange={pickShop} options={[{value: "", label: "Choose an inspector from the list"},
            ...shops.map((sh, i) => ({value: String(i), label: `${sh.name}${sh.distance ? ` · ${sh.distance}` : ""}`})), {value: "other", label: "Someone not on the list"}]} />
        </label>) : null;
      return (<>{head}
        <div className="bookform"><div className="bgrid">
          {picker}
          {BFIELDS.map(([k, lbl, cls, note]) => <label key={k} className={cls}><Opt label={lbl} note={note} /><input id={`bk_${k}`} value={v[k] || ""} onChange={e => setField(k, e.target.value)} /></label>)}
          <label><Opt label="Who is coming" note="optional" /><input id="bk_inspector" placeholder="Name of the inspector" value={v.inspector || ""} onChange={e => setField("inspector", e.target.value)} /></label>
          <label><Opt label="When" note="optional" /><input id="bk_scheduled_at" placeholder="Thu Sep 10, 9:00 AM" value={v.scheduled_at || ""} onChange={e => setField("scheduled_at", e.target.value)} /></label>
          <label className="c2"><Opt label="Note for the customer" note="optional" /><input id="bk_note" placeholder="What they should expect, where to leave keys" value={v.note || ""} onChange={e => setField("note", e.target.value)} /></label>
        </div><div className="brow"><button className="btn primary sm" id="bksave" disabled={saving} onClick={saveBooking}>{b ? "Save booking" : "Book inspection"}</button><span className="err" id="bkerr">{bkerr}</span></div></div>
      </>);
    }
    let who;
    if (url && shop) {
      const [chue, clabel] = CLAIM[claim?.status] || CLAIM.offered;
      who = (<>
        <div className="prov"><b>{shop.name}</b>{shop.phone ? <span className="sub">{shop.phone}</span> : null}<span className={`pill ${chue}`} title={claim?.at ? fmt(claim.at) : ""}>{clabel}</span>
          {claim?.status === "rejected" && claim.reason ? <span className="sub">{claim.reason}</span> : null}
          {claim?.status === "claimed" && claim.terms ? <span className="sub" title={`Terms v${claim.terms.version} accepted ${fmt(claim.terms.accepted_at)}`}>terms accepted</span> : null}
          <span className="sp"></span><button className="btn sm" id="bkchange" onClick={async () => { if (await ask({title: "Make this link for a different shop? The current one stops working."})) onUnlink(); }}>Change</button></div>
        <div className="linkrow"><Icon name="copy" size={14} /><span className="mono">{url}</span>
          <button className="btn sm" id="bkcopy" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Upload link copied"))}>Copy</button>
          <button className="btn sm" id="bknew" title="The link they already have stops working" onClick={async () => {
            if (!await ask({title: "Create a new link? The one the inspector already has stops working."})) return;
            try { api.newLink(r.id); toast("New link ready"); } catch (e) { toast(e.message); } }}>New link</button></div>
      </>);
    } else {
      const opts = linkOpts();
      who = opts.length
        ? <div className="linkrow"><CSelect label="Shop this link is for" value={linkPick ?? opts[0][0]} onChange={setLinkPick} options={opts.map(([value, n]) => ({value, label: n}))} />
            <button className="btn primary sm" id="bkmake" disabled={making} onClick={makeLink}>Make the job link</button></div>
        : <p className="bnone">No one yet. Find providers or book someone, then make their job link.</p>;
    }
    const p = b?.provider || {};
    return (<>{head}{who}
      {b ? <div className="facts tight"><Fact k="Inspector" v={b.inspector} /><Fact k="When" v={b.scheduled_at} /><Fact k="Phone" v={p.phone} /><Fact k="Email" v={p.email} />
        <Fact k="Booked by" v={[b.booked_by, fmt(b.booked_at)].filter(Boolean).join(" · ")} /></div> : null}
      {b?.note ? <div className="note">{b.note}</div> : null}
      <div className="reprow">{rep?.id
        ? <><Icon name="doc" size={14} /><b>Report received</b>{rep.shop?.name ? <>{" "}<span className="sub">{`from ${rep.shop.name}`}</span></> : null}{" "}<span className="sub">{`${fmt(rep.at)}${rep.filename ? ` · ${rep.filename}` : ""}`}</span>
            <a className="btn sm" href={`${PORTAL}/reports/${rep.id}`} target="_blank" rel="noopener" onClick={e => { stay(e); onOpenPortal(`/reports/${rep.id}`, {report: rep.id}); }}>Open</a></>
        : <><Icon name="doc" size={14} /><span className="sub">No report yet</span></>}</div>
    </>);
  };

  const em = r.meta?.emails || [];
  const fbLabel = searching ? "Searching" : !r.search ? "Find providers" : "Search again";
  return shell(<>
    <div className="ohead">
      <div className="ht"><h2 id="otitle">{w.name}</h2><p id="osub">{`${vehicle(f)}, ${where(f)} `}<span className={`pill ${hue}`} style={{ marginLeft: 6 }}>{label}</span></p></div>
      <button className="btn primary" id="fulfillbtn" disabled={searching || isClosed(r)} onClick={() => { fulfill(r.id); toast("Finding providers"); }}><Icon name="search" size={14} />{" " + fbLabel}</button>
      <button className="btn icon" id="closebtn" title="Close" ref={closeRef} onClick={onClose}><Icon name="x" /></button>
    </div>
    <div className="obody" id="obody" ref={body}>
      {cx ? <div className="callout" style={{ margin: "10px 0 0" }}><Icon name="x" size={14} /><span><b>Canceled</b>{` ${fmt(cx.at)}${cx.by ? ` by ${cx.by}` : ""}${cx.reason ? ` · ${cx.reason}` : ""}`}</span></div> : null}
      {/* status and the provider search, one bar */}
      <div className="statusbar">
        <span className="outc"><CSelect className={r.status} label="Status" value={r.status} onChange={v => patch({status: v}, "Status saved")}
          options={STATUSES.map(([k, t]) => ({value: k, label: t}))} /></span>
        <span className="lk"><small>Providers</small><span className={`pill ${lhue}`} title={r.search?.state === "failed" && r.search.error ? r.search.error : undefined}>{llabel}</span></span>
        <span className="mono id">{r.id}</span>
      </div>
      {/* job */}
      <Sec title="Job" />
      <div className="facts">
        <Fact k="Requested by" v={r.org ? f.name : ""} /><Fact k="Email" v={f.email} /><Fact k="Phone" v={f.phone} />
        <Fact k="Inspection" v={inspectionLabel(f)} /><Fact k="Vehicle class" v={classLabel(f.vehicle_class || "standard")} />
        <Fact k="Payout" v={r.payout_cents != null ? dollars(r.payout_cents) : ""} />
        <Fact k="VIN" v={f.vin} /><Fact k="Address" v={[f.address, f.city, f.state, f.zip].filter(Boolean).join(", ")} />
        <Fact k="Partner" v={r.partner ? r.partner.name : ""} /><Fact k="Received" v={fmt(r.created_at)} />
      </div>
      {f.notes ? <div className="note">{f.notes}</div> : null}
      {related.length ? (() => {
        const shown = related.slice(0, 4), more = related.length - shown.length, n = related.length;
        return (
          <div className={`callout ${r.org ? "info" : ""}`} style={{ marginTop: 10 }}><Icon name={r.org ? "list" : "warn"} />
            <div className="dups"><b>{`${n} other${r.org ? "" : " walk-in"} request${n === 1 ? "" : "s"}`}</b>
              {shown.map((x, i) => <React.Fragment key={x.id}>{i ? ", " : " "}<a href="#" className="duplink" onClick={e => { e.preventDefault(); onOpen(x.id); }}>{vehicle(x.form)}</a></React.Fragment>)}
              {more ? ", " : " · "}
              <a className="plainlink" href={`${closed ? "/dashboard/closed" : "/dashboard"}?q=${encodeURIComponent(r.org ? r.org.name : f.email)}`}
                onClick={e => { e.preventDefault(); onViewAll(r.org ? r.org.name : f.email); }}>{more ? `and ${more} more` : "view all"}</a></div>
          </div>);
      })() : null}
      <Listing r={r} toast={toast} />
      <Order r={r} toast={toast} onRefund={refunding ? undefined : refund} />
      {provider()}
      {/* call sheet */}
      <Sec title="Call sheet" right={shops.length ? <button className="btn sm" id="copyall" onClick={copySheet}><Icon name="copy" size={14} /> Copy</button> : null} />
      {searching ? <div className="busy"><span className="spin"></span> Finding inspectors near {where(f)}. One to three minutes.</div>
        : r.search?.state === "failed" ? <div className="fail">{r.search.error || "The search failed. Run it again."}</div>
        : !r.search ? <p className="bnone">{isClosed(r) ? "Never searched." : "Not searched yet."}</p>
        : !shops.length ? <p className="bnone">No inspectors confirmed for this area. Try a bigger radius or run again.</p> : null}
      {res?.summary && shops.length ? <p className="bnone">{res.summary}</p> : null}
      {shops.map((s, i) => {
        const parts = [s.phone ? <a key="p" href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} onClick={stay}>{s.phone}</a> : null, s.address || null,
          s.website ? <a key="w" href={s.website} target="_blank" rel="noopener" onClick={stay}>{s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}</a> : null, s.hours || null].filter(Boolean);
        // joined with " · " into as few text runs as Kavin's string has, so the text shapes identically
        const line = parts.reduce((out, x, j) => { const sep = j ? " · " : ""; const last = out[out.length - 1];
          if (typeof x === "string") { if (typeof last === "string") out[out.length - 1] = last + sep + x; else out.push(sep + x); }
          else { if (sep) { if (typeof last === "string") out[out.length - 1] = last + sep; else out.push(sep); } out.push(x); }
          return out; }, []);
        return (
          <div key={i} className={`shop ${s.booked ? "booked" : ""}`}>
            <div className="sh"><b>{s.name}</b>{s.distance ? <span>{s.distance}</span> : null}{s.rating ? <span>{s.rating}</span> : null}</div>
            {line.length ? <div className="sl">{line.map((x, j) => <React.Fragment key={j}>{x}</React.Fragment>)}</div> : null}
            {s.notes ? <div className="sl">{s.notes}</div> : null}
            {s.sources?.length ? <div className="src">{s.sources.map(u => <a key={u} href={u} target="_blank" rel="noopener" title={u} onClick={stay}>{u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</a>)}</div> : null}
            <div className="flags">
              <label><input type="checkbox" className="flag" checked={!!s.contacted} onChange={e => patch({shops: {[i]: {contacted: e.target.checked}}}, "Saved")} /> Contacted</label>
              <label><input type="checkbox" className="flag" checked={!!s.booked} onChange={e => patch({shops: {[i]: {booked: e.target.checked}}}, "Saved")} /> Booked</label>
              <button className="btn sm bookthis" onClick={() => { openBooking({...fromShop(s), shop_index: i}); setBkerr("");
                setTimeout(() => body.current?.querySelector(".bookform")?.scrollIntoView({block: "center", behavior: "smooth"}), 0); }}><Icon name="check" size={13} /> Book</button>
            </div>
          </div>);
      })}
      {/* notes and mail */}
      <Sec title="Internal notes" />
      <textarea key={r.id} className="internal" id="inotes" placeholder="Who you called, what they quoted, when it is set" defaultValue={r.notes} onChange={onNotes}></textarea>
      {em.length ? <details className="mail"><summary>Emails ({em.length})</summary><div className="maillog">{em.map((e, i) => <React.Fragment key={i}>{i ? <br /> : null}<b>{e.sent ? "Sent" : "Not sent"}</b>{` ${e.subject} to ${e.to}${e.sent ? "" : ` · ${e.error || ""}`}`}</React.Fragment>)}</div></details> : null}
      <Sec style={{ paddingTop: 26 }} title={null} right={<button className="btn sm danger" id="delbtn" onClick={async () => {
        if (!await ask({title: "Delete this request?", danger: true})) return; try { api.remove(r.id); onClose(); } catch (e) { toast(e.message); } }}><Icon name="trash" size={14} /> Delete request</button>} />
    </div>
  </>);
}
