import React, { useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { allProviders, allCustomers, shopKey } from "./derive.js";
import { PROVIDER_METROS, providerMetro } from "./seed.js";
import { orderedByLabel, isConsumer } from "./jobModel.js";
import { fmt, useJobVehicle, isClosed, Icon, Who, SkelRows, CSelect, PageDock, paged, useToast } from "./ui.jsx";

/*
 * Providers, Customers and Reports: ports of inspection-requests/ui/{providers,customers,reports}-client.
 * Each is a view of the same request list the boards read. Links that would leave the demo stay put.
 */
const stay = e => e.preventDefault();

/* ---- Providers: every shop the lookups have found, plus the ones added by hand, in a block per metro ---- */

const firstPhone = t => (String(t || "").match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/) || [""])[0];
const host = u => String(u || "").match(/https?:\/\/[^\s)]+/) ? String(u).match(/https?:\/\/[^\s)]+/)[0] : (String(u || "").split(/\s/)[0] || "");
const splitName = n => { const m = String(n || "").split(/\s+[—–-]\s+|\s+\(/); return [m[0] || "Unnamed", m.length > 1 ? String(n).slice(m[0].length).replace(/^\s*[—–-]\s*|^\s*\(|\)\s*$/g, "") : ""]; };
const P_HEADS = ["Provider", "Phone", "Website", "Contact"];
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const day = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}); };
const metroOf = p => p.metro || providerMetro(p);

// the contact, edited in place by Inspectd staff: name, email, cell; the record's last change under it
function ContactCell({ p }){
  const { providers } = usePlatform(), toast = useToast();
  const c = p.contact || {}, last = p.log?.at(-1);
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(c), [err, setErr] = useState("");
  const open = () => { setDraft({name: c.name || "", email: c.email || "", cell: c.cell || ""}); setErr(""); setEditing(true); };
  const save = e => {
    e.preventDefault();
    try { providers.saveContact({key: shopKey(p), name: p.name, website: p.website, phone: p.phone, metro: metroOf(p)}, draft); setEditing(false); toast("Contact saved"); }
    catch (er) { setErr(er.message); }
  };
  const field = (k, label, type = "text") => <input type={type} className="cin" data-f={k} placeholder={label} aria-label={`Contact ${label.toLowerCase()}`} value={draft[k] || ""} onChange={e => setDraft(d => ({...d, [k]: e.target.value}))} />;
  if (editing) return (
    <form className="contactedit" noValidate onSubmit={save} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setEditing(false); } }}>
      {field("name", "Name")}{field("email", "Email", "email")}{field("cell", "Cell", "tel")}
      <span className="cacts"><button className="btn sm primary" type="submit">Save</button><button className="btn sm" type="button" onClick={() => setEditing(false)}>Cancel</button>
        {err ? <span className="err">{err}</span> : null}</span>
    </form>);
  const any = c.name || c.email || c.cell;
  return (
    <div className="contact">
      {any ? <button type="button" className="cview" title="Edit the contact" onClick={open}>
          {c.name ? <b>{c.name}</b> : null}<span>{[c.email, c.cell].filter(Boolean).join(" · ")}</span></button>
        : <button type="button" className="linkbtn addcontact" onClick={open}>Add contact</button>}
      {last ? <span className="clog">{`${last.what === "Provider added" ? "Added" : "Updated"} ${day(last.at)}${last.by ? ` by ${last.by}` : ""}`}</span> : null}
    </div>);
}

function ProviderTable({ list }){
  return (
    <div className="tablewrap"><table className="ptable">
      <colgroup><col style={{ width: "36%" }} /><col style={{ width: "14%" }} /><col style={{ width: "18%" }} /><col style={{ width: "32%" }} /></colgroup>
      <thead><tr>{P_HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{list.map(p => {
        const [nm, tag] = splitName(p.name), phone = firstPhone(p.phone), site = host(p.website);
        const desc = tag || p.services || p.notes || "";
        return (
          <tr key={shopKey(p)} data-provider={p.name}>
            <td><div className="who"><span className="tx"><b title={p.name}>{nm}</b>{desc ? <span className="clamp sub" title={desc}>{desc}</span> : null}</span></div></td>
            <td className="sub">{phone ? <a href={`tel:${phone.replace(/\D/g, "")}`} onClick={stay}>{phone}</a> : <span className="clamp" title={p.phone || ""}>{p.phone || ""}</span>}</td>
            <td className="sub">{site ? <a href={/^https?:/.test(site) ? site : `https://${site}`} target="_blank" rel="noopener" onClick={stay}>{site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}</a> : null}</td>
            <td><ContactCell p={p} /></td>
          </tr>);
      })}</tbody>
    </table></div>
  );
}

// Add a provider by hand, for one-person operations the search doesn't find: they join their metro's searches
function AddProvider({ onDone }){
  const { providers } = usePlatform(), toast = useToast();
  const [f, setF] = useState({name: "", metro: "", website: "", phone: "", contact: {name: "", email: "", cell: ""}}), [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({...x, [k]: v})), setC = (k, v) => setF(x => ({...x, contact: {...x.contact, [k]: v}}));
  const submit = e => {
    e.preventDefault();
    try { const rec = providers.add(f); toast(`${rec.name} added`); onDone(rec); } catch (er) { setErr(er.message); }
  };
  const input = (id, label, value, on, opt = {}) => (
    <label className={opt.wide ? "c2" : undefined}><small>{label}{opt.optional ? <i>Optional</i> : null}</small>
      <input id={id} type={opt.type || "text"} value={value} onChange={e => on(e.target.value)} autoComplete="off" /></label>);
  return (
    <form className="addprov" id="addProvider" noValidate onSubmit={submit}>
      <div className="apgrid">
        {input("apName", "Business name", f.name, v => set("name", v), {wide: true})}
        <label><small>Metro</small><CSelect label="Metro" value={f.metro} onChange={v => set("metro", v)}
          options={[{value: "", label: "Choose a metro"}, ...PROVIDER_METROS.map(m => ({value: m, label: m}))]} /></label>
        {input("apCName", "Contact name", f.contact.name, v => setC("name", v), {optional: true})}
        {input("apCEmail", "Contact email", f.contact.email, v => setC("email", v), {optional: true, type: "email"})}
        {input("apCCell", "Contact cell", f.contact.cell, v => setC("cell", v), {optional: true, type: "tel"})}
        {input("apSite", "Website", f.website, v => set("website", v), {optional: true})}
        {input("apPhone", "Phone", f.phone, v => set("phone", v), {optional: true, type: "tel"})}
      </div>
      <div className="brow"><button className="btn primary sm" type="submit" id="apSave">Add provider</button>
        <button className="btn sm" type="button" onClick={() => onDone(null)}>Cancel</button>{err ? <span className="err" id="apErr">{err}</span> : null}</div>
    </form>);
}

export function Providers({ loaded }){
  const { rows, providerRecords } = usePlatform();
  const [pq, setPq] = useState(""), [adding, setAdding] = useState(false);
  const q = pq.trim().toLowerCase();
  const all = loaded ? allProviders(rows, providerRecords) : [];
  const hay = p => [p.name, p.address, p.city, p.phone, p.website, p.email, p.services, metroOf(p), p.contact?.name, p.contact?.email, p.contact?.cell].join(" ").toLowerCase();
  const matched = all.filter(p => !q || hay(p).includes(q));
  // one block per metro, in a fixed order; a provider from nowhere the seed knows goes last, under Other
  const blocks = [...PROVIDER_METROS, "Other"].map(metro => [metro, matched.filter(p => metroOf(p) === metro)]).filter(([, list]) => list.length);
  let body;
  if (!loaded) body = <div className="tablewrap"><SkelRows n={7} heads={P_HEADS} extraCls="ptable" /></div>;
  else if (!all.length) body = <div className="empty"><b>No providers yet</b>Find providers for a job, or add one, and they appear here.</div>;
  else if (!matched.length) body = <div className="empty"><b>Nothing matches</b></div>;
  else body = blocks.map(([metro, list]) => (
    <section key={metro} className="metroblock" data-metro={metro}>
      <div className="pad sechead"><h2>{metro}</h2><span className="secnote">{plural(list.length, "provider")}</span></div>
      <ProviderTable list={list} />
    </section>));
  return (<>
    <div className="pad greet"><div className="gt"><h1>Providers</h1></div>
      <div className="actions">{adding ? null : <button className="btn" id="addProviderBtn" disabled={!loaded} onClick={() => setAdding(true)}>Add provider</button>}</div></div>
    {adding ? <div className="pad"><AddProvider onDone={rec => { setAdding(false); if (rec) setPq(""); }} /></div> : null}
    <div className="pad"><div className="toolbar"><div className="search"><Icon name="search" size={14} /><input id="pq" type="search" placeholder="Search shop, city, phone, contact" autoComplete="off" value={pq} onChange={e => setPq(e.target.value)} /></div>
      {loaded && q ? <span className="chip" id="pcount">{`${matched.length} of ${all.length}`}</span> : null}</div></div>
    <div id="providers">{body}</div>
  </>);
}

/* ---- Customers: consumers one row per email, businesses one row per workspace ---- */

const C_HEADS = ["Customer", "Type", "Location", "Inspections", "Last inspection"];
const C_CARDS = [["consumer", "Consumers", c => !c.business], ["business", "Businesses", c => c.business]];

export function Customers({ loaded, onNavigate }){
  const { rows, orgs, users, memberships } = usePlatform();
  const [cq, setCq] = useState(""), [kind, setKind] = useState(""), [page, setPage] = useState(0);
  const q = cq.trim().toLowerCase();
  // a business's contact is its workspace's owner, the longest-standing one if there are several
  const owners = {};
  for (const m of [...(memberships || [])].filter(m => m.role === "OWNER").sort((a, b) => a.joined_at.localeCompare(b.joined_at))) {
    if (owners[m.org_id]) continue;
    const u = users.find(x => x.id === m.user_id); if (u) owners[m.org_id] = {name: u.name, email: u.email};
  }
  const all = loaded ? allCustomers(rows, orgs, owners) : [], hay = c => [c.name, c.email, c.contact, c.phone, c.location, orderedByLabel(c.type)].join(" ").toLowerCase();
  const inKind = c => !kind || C_CARDS.find(([k]) => k === kind)[2](c);
  const list = all.filter(c => inKind(c) && (!q || hay(c).includes(q)));
  const pg = paged(list, page);
  const pickCard = k => { setKind(cur => cur === k ? "" : k); setPage(0); };
  let body;
  if (!loaded) body = <SkelRows n={6} heads={C_HEADS} />;
  else if (!all.length) body = <div className="empty"><b>No customers yet</b>Requests arrive from the client portal.</div>;
  else if (!list.length) body = <div className="empty"><b>Nothing matches</b>{q ? `No customer matches "${q}".` : ""}</div>;
  else body = (
    <table><thead><tr>{C_HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{pg.slice.map(c => (
      // a customer's jobs are the board searched by their email, or by the company's name
      <tr key={c.key} className="row" data-customer={c.query} onClick={() => onNavigate("jobs", {q: c.query})}>
        <td>{c.business
          ? <Who name={c.name} email={c.contact ? `${c.contact}${c.email ? ` · ${c.email}` : ""}` : c.email} />
          : <Who name={c.name} email={c.email + (c.aliases.length ? ` · also as ${c.aliases.join(", ")}` : "")} />}</td>
        <td className="sub">{orderedByLabel(c.type)}</td>
        <td className="sub">{c.location}</td>
        <td className="sub">{c.jobs.length}</td>
        <td className="sub">{fmt(c.last)}</td>
      </tr>))}</tbody></table>
  );
  return (<>
    <div className="pad greet"><div className="gt"><h1>Customers</h1></div></div>
    <div className="pad">
      <div className="toolbar"><div className="search"><Icon name="search" size={14} /><input id="cq" type="search" placeholder="Search name, company, email" autoComplete="off" value={cq} onChange={e => { setCq(e.target.value); setPage(0); }} /></div>
        <div className="filters" id="cbreakdown" role="group" aria-label="Kind of customer">
          <button type="button" className={`fbtn${kind ? "" : " on"}`} data-kind="" aria-pressed={!kind} disabled={!loaded} onClick={() => { setKind(""); setPage(0); }}>All<span className="n">{loaded ? all.length : ""}</span></button>
          {C_CARDS.map(([k, t, test]) => (
            <button key={k} type="button" className={`fbtn${kind === k ? " on" : ""}`} data-kind={k} aria-pressed={kind === k} disabled={!loaded} onClick={() => pickCard(k)}>
              {t}<span className="n">{loaded ? all.filter(test).length : ""}</span></button>))}
        </div>
        {loaded && (kind || q) ? <span className="chip" id="ccount">{`${list.length} of ${all.length}`}</span> : null}</div></div>
    <div className="tablewrap" id="customers">{body}</div>
    <PageDock pg={loaded && list.length ? pg : null} rowSelector="#customers tbody tr" onChange={d => setPage(pg.page + d)} />
  </>);
}

/* ---- Reports: jobs that have a report, newest change first (a claimed job joins once its report lands) ---- */

// no Status column: every job here has its report, so every one would read Complete
const R_HEADS = ["Job", "Customer", "Vehicle", "Location", "Provider", "Updated"];

export function Reports({ loaded, onNavigate, onOpenPortal }){
  const { rows } = usePlatform();
  const vehicle = useJobVehicle();   // named as the report names the car
  const [page, setPage] = useState(0);
  const list = loaded ? rows.filter(r => r.meta?.report?.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at)) : [];
  const pg = paged(list, page);
  let body;
  if (!loaded) body = <SkelRows n={5} heads={R_HEADS} />;
  else if (!list.length) body = <div className="empty"><b>No reports yet</b>When a provider submits a job's report, the job shows up here.</div>;
  else body = (
    <table><thead><tr>{R_HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{pg.slice.map(r => {
      const claim = r.meta?.link?.claim;
      return (
        // a row opens the job on its board
        <tr key={r.id} className="row" data-id={r.id} onClick={() => onNavigate(isClosed(r) ? "closed" : "jobs", {open: r.id})}>
          <td className="jobcell"><span className="mono">{r.ref}</span>{r.form.customer_ref ? <span className="cref mono">{r.form.customer_ref}</span> : null}</td>
          <td><Who name={!isConsumer(r) && r.org ? r.org.name : r.form.name} email={r.form.email} /></td>
          <td>{vehicle(r)}</td><td className="sub">{[r.form.city, (r.form.state || "").toUpperCase()].filter(Boolean).join(", ")}</td>
          <td className="sub">{claim ? claim.company || claim.name : ""}</td><td className="sub">{fmt(r.updated_at)}</td>
        </tr>);
    })}</tbody></table>
  );
  return (<>
    <div className="pad greet"><div className="gt"><h1>Reports</h1></div></div>
    <div className="tablewrap" id="reports">{body}</div>
    <PageDock pg={loaded && list.length ? pg : null} rowSelector="#reports tbody tr" onChange={d => setPage(pg.page + d)} />
  </>);
}
