import React, { useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { allProviders, allCustomers, statusBreakdown } from "./derive.js";
import { STATUS, fmt, where, vehicle, isClosed, tint, Icon, Who, Pill, Sk, SkelRows, PageDock, paged, flag } from "./ui.jsx";

/*
 * Providers, Customers and Reports: ports of inspection-requests/ui/{providers,customers,reports}-client.
 * Each is a view of the same request list the boards read. Links that would leave the demo stay put.
 */
const stay = e => e.preventDefault();

/* ---- Providers: every shop the lookups have found, one row per distinct shop, 50 per page ---- */

const PAGE_LIMIT = 50;
const firstPhone = t => (String(t || "").match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/) || [""])[0];
const host = u => String(u || "").match(/https?:\/\/[^\s)]+/) ? String(u).match(/https?:\/\/[^\s)]+/)[0] : (String(u || "").split(/\s/)[0] || "");
const ratingNum = t => { const m = String(t || "").match(/\b([0-5](?:\.\d)?)\s*(?:\/\s*5|stars?|★)?/i); return m && /\d/.test(m[1]) && (/\/\s*5|star|★|rating|google|yelp/i.test(t) || String(t).trim().length < 6) ? m[1] : ""; };
const splitName = n => { const m = String(n || "").split(/\s+[—–-]\s+|\s+\(/); return [m[0] || "Unnamed", m.length > 1 ? String(n).slice(m[0].length).replace(/^\s*[—–-]\s*|^\s*\(|\)\s*$/g, "") : ""]; };
const P_HEADS = ["Provider", "Location", "Phone", "Website", "Rating", "Jobs", "Status"];

export function Providers({ loaded }){
  const { rows } = usePlatform();
  const [pq, setPq] = useState(""), [page, setPage] = useState(0);
  const q = pq.trim().toLowerCase();
  const all = loaded ? allProviders(rows) : [], hay = p => [p.name, p.address, p.city, p.phone, p.website, p.email, p.services].join(" ").toLowerCase();
  const matched = all.filter(p => !q || hay(p).includes(q));
  const pg = paged(matched, page, PAGE_LIMIT);
  let body;
  if (!loaded) body = <div className="tablewrap"><SkelRows n={7} heads={P_HEADS} extraCls="ptable" /></div>;
  else if (!all.length) body = <div className="empty"><b>No providers yet</b>Run a lookup on a job and the shops it finds will appear here.</div>;
  else if (!matched.length) body = <div className="empty"><b>Nothing matches</b></div>;
  else body = (
    <div className="tablewrap"><table className="ptable">
      <colgroup><col style={{ width: "34%" }} /><col style={{ width: "20%" }} /><col style={{ width: "12%" }} /><col style={{ width: "14%" }} /><col style={{ width: "6%" }} /><col style={{ width: "5%" }} /><col style={{ width: "9%" }} /></colgroup>
      <thead><tr>{P_HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{pg.slice.map(p => {
        const [nm, tag] = splitName(p.name), phone = firstPhone(p.phone), site = host(p.website), rating = ratingNum(p.rating);
        const desc = tag || p.services || p.notes || "";
        return (
          <tr key={p.name + p.phone}>
            <td><div className="who"><span className="av" style={{ background: tint(nm) }}>{(nm.trim()[0] || "?").toUpperCase()}</span><span className="tx"><b title={p.name}>{nm}</b><span className="clamp sub" title={desc}>{desc}</span></span></div></td>
            <td className="sub"><span className="clamp two" title={p.address || ""}>{p.address || p.city || ""}</span></td>
            <td className="sub">{phone ? <a href={`tel:${phone.replace(/\D/g, "")}`} onClick={stay}>{phone}</a> : <span className="clamp" title={p.phone || ""}>{p.phone || ""}</span>}</td>
            <td className="sub">{site ? <a href={site} target="_blank" rel="noopener" onClick={stay}>{site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}</a> : null}</td>
            <td className="sub" title={p.rating || ""}>{rating ? <b>{rating}</b> : (p.rating ? "n/a" : "")}</td>
            <td className="sub">{p.jobs}</td>
            <td title={p.booked ? "Booked on at least one job" : p.contacted ? "Contacted on at least one job" : ""}>{flag(p.booked, "Booked", "blue") || flag(p.contacted, "Contacted", "amber") || ""}</td>
          </tr>);
      })}</tbody>
    </table></div>
  );
  return (<>
    <div className="pad greet"><div className="gt"><h1>Providers</h1><p>Every inspection shop and mobile inspector the lookup has found so far, across all jobs. Contacted and booked flags carry over from the jobs.</p></div></div>
    <div className="pad"><div className="toolbar"><div className="search"><Icon name="search" size={14} /><input id="pq" type="search" placeholder="Search shop, city, phone" autoComplete="off" value={pq} onChange={e => { setPq(e.target.value); setPage(0); }} /></div>
      <span className="chip" id="pcount">{loaded ? `${matched.length} of ${all.length}` : <Sk w={54} h={12} />}</span></div></div>
    <div id="providers">{body}</div>
    <PageDock pg={loaded && matched.length ? pg : null} rowSelector="#providers tbody tr" onChange={d => setPage(pg.page + d)} />
  </>);
}

/* ---- Customers: one row per email address, how many requests, and what they add up to ---- */

const C_HEADS = ["Customer", "Phone", "Requests", "Statuses", "Last request"];

export function Customers({ loaded, onNavigate }){
  const { rows } = usePlatform();
  const [cq, setCq] = useState(""), [page, setPage] = useState(0);
  const q = cq.trim().toLowerCase();
  const all = loaded ? allCustomers(rows) : [], hay = c => [c.name, c.email, c.phone].join(" ").toLowerCase();
  const list = all.filter(c => !q || hay(c).includes(q));
  const pg = paged(list, page);
  let body;
  if (!loaded) body = <SkelRows n={6} heads={C_HEADS} />;
  else if (!all.length) body = <div className="empty"><b>No customers yet</b>Requests arrive from the client portal.</div>;
  else if (!list.length) body = <div className="empty"><b>Nothing matches</b>{`No customer matches "${q}".`}</div>;
  else body = (
    <table><thead><tr>{C_HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{pg.slice.map(c => {
      // every request counts: one pill per status they have, with how many are in it
      const parts = statusBreakdown(c.counts), only = parts.length === 1 && parts[0][1] === 1;
      return (
        // a customer's jobs are the open board searched by their email
        <tr key={c.email} className="row" data-email={c.email} onClick={() => onNavigate("jobs", {q: c.email})}>
          <td><Who name={c.name} email={c.email + (c.aliases.length ? ` · also as ${c.aliases.join(", ")}` : "")} /></td>
          <td className="sub">{c.phone || ""}</td><td className="sub">{c.jobs.length}</td>
          <td><span className="pills" title={parts.map(([k, n]) => `${n} ${(STATUS[k] || ["", k])[1]}`).join(", ")}>{parts.map(([k, n]) => { const [hue, label] = STATUS[k] || ["gray", k]; return <Pill key={k} hue={hue}>{only ? label : `${n} ${label}`}</Pill>; })}</span></td>
          <td className="sub">{fmt(c.last)}</td>
        </tr>);
    })}</tbody></table>
  );
  return (<>
    <div className="pad greet"><div className="gt"><h1>Customers</h1><p>Everyone who has submitted a request, grouped by email. Click a row to see their jobs.</p></div></div>
    <div className="pad"><div className="toolbar"><div className="search"><Icon name="search" size={14} /><input id="cq" type="search" placeholder="Search name, email, phone" autoComplete="off" value={cq} onChange={e => { setCq(e.target.value); setPage(0); }} /></div>
      <span className="chip" id="ccount">{loaded ? `${list.length} of ${all.length}` : <Sk w={54} h={12} />}</span></div></div>
    <div className="tablewrap" id="customers">{body}</div>
    <PageDock pg={loaded && list.length ? pg : null} rowSelector="#customers tbody tr" onChange={d => setPage(pg.page + d)} />
  </>);
}

/* ---- Reports: jobs that reached a booking or were completed, newest change first ---- */

const R_HEADS = ["Customer", "Vehicle", "Location", "Status", "Provider", "Updated"];

export function Reports({ loaded, onNavigate, onOpenPortal }){
  const { rows } = usePlatform();
  const [page, setPage] = useState(0);
  const list = loaded ? rows.filter(r => r.status === "confirmed" || r.status === "complete").sort((a, b) => b.updated_at.localeCompare(a.updated_at)) : [];
  const pg = paged(list, page);
  let body;
  if (!loaded) body = <SkelRows n={5} heads={R_HEADS} />;
  else if (!list.length) body = <div className="empty"><b>No confirmed jobs yet</b>Once an inspection is confirmed it shows up here, and its report once it lands.</div>;
  else body = (
    <table><thead><tr>{R_HEADS.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{pg.slice.map(r => {
      const [hue, label] = STATUS[r.status] || ["gray", r.status], booked = (r.result?.shops || []).find(s => s.booked);
      return (
        // a row opens the job on its board
        <tr key={r.id} className="row" data-id={r.id} onClick={() => onNavigate(isClosed(r) ? "closed" : "jobs", {open: r.id})}>
          <td><Who name={r.org ? r.org.name : r.form.name} email={r.form.email} /></td>
          <td>{vehicle(r.form)}</td><td className="sub">{where(r.form)}</td><td><Pill hue={hue}>{label}</Pill></td>
          <td className="sub">{booked?.name || ""}</td><td className="sub">{fmt(r.updated_at)}</td>
        </tr>);
    })}</tbody></table>
  );
  return (<>
    <div className="pad greet"><div className="gt"><h1>Reports</h1><p>Jobs that reached a booking or were completed. Normalized inspection reports are produced in the <a className="plainlink" id="reportsLink" href="#" target="_blank" rel="noopener" onClick={e => { stay(e); onOpenPortal("/reports"); }}>report dashboard</a> for now; linking them to jobs here is the next step.</p></div></div>
    <div className="tablewrap" id="reports">{body}</div>
    <PageDock pg={loaded && list.length ? pg : null} rowSelector="#reports tbody tr" onChange={d => setPage(pg.page + d)} />
  </>);
}
