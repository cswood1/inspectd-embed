import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { Svg, I, fmtDate, useLoaded, isBusiness } from "./portalUi.jsx";
import { workspaceData, overview, commonIssues, FLAGS } from "./aiOverview.js";
import { demoDay, addDays } from "./demoDay.js";

/*
 * Inspection Intelligence: a business workspace's questions about its inspections (fleet and dealer only). Every result
 * is a worklist: a headline, the vehicles with why each matched, the evidence behind a row, an optional breakdown, and a
 * CSV. Starting points and figure clicks run the tools directly (/api/tools, no model); a typed question goes to
 * /api/ask, where the model picks the tools and writes one or two sentences, and the server attaches the rows,
 * breakdown and evidence from the tool results. Results stack in memory, newest first. docs/platform/decisions.md,
 * "Inspection Intelligence".
 */

const ALL_FLAGS = FLAGS.map(([k]) => k);
const STARTS = [
  {id: "sp-concerns", label: "Warning lights, tire concerns or leaks", input: {any_flags: ["warning_lights", "tires", "leaks"], latest_per_vehicle: true}, text: "with warning lights, tire concerns or leaks"},
  {id: "sp-failure", label: "Vehicles with a failure", input: {status: "fail", latest_per_vehicle: true}, text: "with a failed item"},
  {id: "sp-location", label: "Condition by location", input: {latest_per_vehicle: true, group_by: "metro"}, text: "inspected, by location"},
];
const CARDS = [["vehicles", "Vehicles"], ["reports", "Reports"], ["last30", "Last 30 days"], ["flagged", "Flagged"], ["failure", "With a failure"]];
const GROUP_LABEL = {metro: "Location", city: "City", make: "Make", model: "Model", year: "Year", month: "Month", flag: "Flag", issue: "Issue"};
const MESSAGES = {rate_limited: "That's a lot of questions at once. Try again in a minute.", paused: "Questions are paused for today."};
const pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : "–";
const plural = (n, unit) => `${n} ${n === 1 ? unit.replace(/s$/, "") : unit}`;

const browserId = () => {
  try {
    let id = localStorage.getItem("inspectd_ask_client");
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("inspectd_ask_client", id); }
    return id;
  } catch { return "anon"; }
};
async function post(url, body){
  const res = await fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) { const e = new Error(out.error || "unavailable"); e.code = out.error; throw e; }
  return out;
}

export function Intelligence({ ctx }){
  const { portal, seededAt } = usePlatform();
  const loaded = useLoaded();
  const me = portal.me(), business = isBusiness(me.account?.type), workspace = me.account?.id;
  const all = loaded && business ? portal.reports().reports : null;
  const ws = useMemo(() => all ? workspaceData(all) : null, [all]);
  const o = useMemo(() => ws ? overview(ws) : null, [ws]);
  const [q, setQ] = useState(""), [results, setResults] = useState([]), [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const scope = {workspace, seeded_at: seededAt, client: browserId()};
  const tool = (name, input) => post("/api/tools", {...scope, tool: name, input});

  const push = r => setResults(rs => [r, ...rs.filter(x => x.id !== r.id)]);
  // a code-run result: one find_reports call, the headline its count (vehicles when counted by vehicle)
  const runCode = async ({ title, input, text }) => {
    const id = ++seq.current; push({id, kind: "code", title, pending: true}); setBusy(true);
    try {
      const r = await tool("find_reports", input), byVehicle = !!input.latest_per_vehicle;
      push({id, kind: "code", title, headline: {figure: byVehicle ? r.vehicles : r.count, unit: byVehicle ? "vehicles" : "reports", text},
        // the share flagged, beside a breakdown of every vehicle ("Condition by location"); not beside a filtered one
        rows: r.rows, breakdown: r.groups ? {by: r.group_by, groups: r.groups, flagged: Object.keys(input).every(k => ["latest_per_vehicle", "group_by"].includes(k))} : null, follow_ups: []});
    } catch (e) { push({id, kind: "code", title, error: MESSAGES[e.code] || "Couldn't run that right now.", retry: () => runCode({title, input, text})}); }
    finally { setBusy(false); }
  };
  const ask = async (question, previous = null) => {
    question = question.trim(); if (!question || busy) return;
    const id = ++seq.current; push({id, kind: "ask", title: question, pending: true}); setBusy(true); setQ("");
    try {
      const a = await post("/api/ask", {...scope, question, previous});
      push({id, kind: "ask", title: question, ...a});
    } catch (e) { push({id, kind: "ask", title: question, error: MESSAGES[e.code] || "Couldn't answer right now.", retry: () => ask(question, previous)}); }
    finally { setBusy(false); }
  };
  const today = ws ? demoDay(ws.now) : "";
  const cardInput = key => ({vehicles: {latest_per_vehicle: true}, reports: {}, last30: {date_from: addDays(today, -30)},
    flagged: {any_flags: ALL_FLAGS, latest_per_vehicle: true}, failure: {status: "fail", latest_per_vehicle: true}})[key];

  if (!business) return <section className="pad greet"><div className="gt"><h1>Inspection Intelligence</h1></div><p className="sub">Inspection Intelligence is for business workspaces.</p></section>;
  return (<>
    <section className="pad greet"><div className="gt"><h1>Inspection Intelligence</h1></div>
      {results.length ? <div className="actions"><button type="button" className="btn sm" id="intelClear" onClick={() => setResults([])}>Clear</button></div> : null}
    </section>

    <section className="pad intelask">
      <form className="askbar" role="search" onSubmit={e => { e.preventDefault(); ask(q); }}>
        <Svg src={I.search} />
        <input id="askq" type="text" value={q} maxLength={300} placeholder="Ask about your inspections" aria-label="Ask about your inspections" autoComplete="off"
          onChange={e => setQ(e.target.value)} disabled={busy} />
        <button className="btn primary sm" id="askBtn" type="submit" disabled={!q.trim() || busy}>{busy ? "Working…" : "Ask"}</button>
      </form>
      <div className="starts" id="starts">
        {STARTS.map(s => <button key={s.id} type="button" className="fbtn" id={s.id} disabled={!loaded || busy} onClick={() => runCode({title: s.label, input: s.input, text: s.text})}>{s.label}</button>)}
      </div>
    </section>

    {results.length ? <section className="pad intelresults" id="results" aria-live="polite">
      {results.map(r => <Result key={`${r.id}:${r.pending ? "p" : r.error ? "e" : "d"}`} r={r} tool={tool} ctx={ctx} onFollow={f => ask(f, r.kind === "ask" && r.answer ? {question: r.title, answer: r.answer} : null)} busy={busy} />)}
    </section> : null}

    <section className="pad intelov" id="overview">
      <div className="figs" id="figs">
        {CARDS.map(([key, label]) => (
          <button key={key} type="button" className="fig" data-card={key} disabled={!o || busy}
            onClick={() => runCode({title: label, input: cardInput(key), text: key === "reports" ? "in this workspace" : key === "last30" ? "in the last 30 days" : label === "Vehicles" ? "in this workspace" : label.toLowerCase()})}>
            <span className="n">{o ? o.cards[key] : "–"}</span><span className="t">{label}</span>
          </button>))}
      </div>
      {ws ? <Overview ws={ws} o={o} busy={busy} run={runCode} /> : null}
    </section>
  </>);
}

/* ---- the overview: most common issues and issues by area; a click runs it ---- */

function Overview({ ws, o, busy, run }){
  const [consumables, setConsumables] = useState(false), [failuresOnly, setFailuresOnly] = useState(false);
  const issues = commonIssues(ws, {consumables, failuresOnly});
  const maxArea = Math.max(1, ...o.areas.map(a => a.vehicles));
  return (
    <div className="bdcols bd">
      <div className="bdblock">
        <div className="bdhead"><h2>Most common issues</h2>
          <span className="bdtoggles">
            <span className="seg sm" role="group" aria-label="Which issues">
              <button type="button" className={failuresOnly ? "" : "on"} aria-pressed={!failuresOnly} onClick={() => setFailuresOnly(false)}>All</button>
              <button type="button" className={failuresOnly ? "on" : ""} aria-pressed={failuresOnly} id="failOnly" onClick={() => setFailuresOnly(true)}>Failures only</button>
            </span>
            <label className="chk"><input type="checkbox" id="showCons" checked={consumables} onChange={e => setConsumables(e.target.checked)} /> Show consumables</label>
          </span></div>
        {issues.length ? <ol className="rank" id="aiIssuesTop">{issues.map((t, n) => (
          <li key={t.item}><button type="button" data-issue={t.item} disabled={busy}
            onClick={() => run({title: failuresOnly ? `${t.item}, failed` : t.item, input: {issue: t.item, latest_per_vehicle: true, ...(failuresOnly ? {status: "fail"} : {})}, text: failuresOnly ? `failed on ${t.item}` : `with ${t.item}`})}>
            <span className="k num">{n + 1}</span><span className="it">{t.item}</span>
            <span className="v num">{failuresOnly ? t.failures : t.vehicles}</span><span className="s num">{failuresOnly ? `of ${t.vehicles}` : (t.failures ? `${t.failures} failed` : "")}</span>
          </button></li>))}</ol>
          : <p className="sub">No failures in this workspace's reports.</p>}
      </div>
      <div className="bdblock">
        <div className="bdhead"><h2>Issues by area</h2></div>
        <ul className="bars" id="aiAreas">{o.areas.map(a => (
          <li key={a.area}><button type="button" data-area={a.area} disabled={busy} onClick={() => run({title: a.area, input: {area: a.area, latest_per_vehicle: true}, text: `with an issue in ${a.area}`})}>
            <span className="it">{a.area}</span><span className="bar"><i style={{ width: `${(100 * a.vehicles / maxArea).toFixed(1)}%` }}></i></span><span className="v num">{a.vehicles}</span>
          </button>{a.area === "Tires and wheels" ? <p className="note">Tread at 4/32 or less is counted under Tire concerns even when the tire was graded pass.</p> : null}</li>))}</ul>
        <p className="note">Vehicles with a fail or attention item in each area.</p>
      </div>
    </div>
  );
}

/* ---- one result ---- */

function Result({ r, tool, ctx, onFollow, busy }){
  const [group, setGroup] = useState(null), [open, setOpen] = useState(() => r.evidence?.length ? r.evidence[0].ref : null), [more, setMore] = useState(false);
  if (r.pending) return <article className="iresult pending" data-kind={r.kind}><p className="iq">{r.title}</p><p className="sub">{r.kind === "ask" ? "Answering…" : "Counting…"}</p></article>;
  if (r.error) return <article className="iresult" data-kind={r.kind} role="alert"><p className="iq">{r.title}</p><p className="ianswer">{r.error}</p>
    {r.error.startsWith("Couldn't") ? <button type="button" className="linkbtn" onClick={r.retry}>Try again</button> : null}</article>;
  const rows = r.rows || [], g = group && r.breakdown?.groups.find(x => x.key === group);
  const shown = g ? rows.filter(x => g.refs.includes(x.ref)) : rows, page = more ? shown : shown.slice(0, 25);
  const unit = r.headline?.unit || "vehicles", h = r.headline || {};
  return (
    <article className="iresult" data-kind={r.kind}>
      <p className="iq">{r.title}</p>
      <div className="ihead">
        {h.figure !== null && h.figure !== undefined
          ? <p className="ihl"><span className="n num">{h.figure}</span> <span className="u">{h.figure === 1 ? h.unit.replace(/s$/, "") : h.unit}</span> <span className="t">{h.text}</span></p>
          : h.text ? <p className="ihl phrase">{h.text}</p> : null}
        {rows.length ? <button type="button" className="btn sm icsv" onClick={() => downloadCsv(r.title, shown)}>Download CSV</button> : null}
      </div>
      {r.answer ? <p className="ianswer">{r.answer}</p> : null}
      {r.breakdown ? <Breakdown b={r.breakdown} unit={unit} group={group} setGroup={k => { setGroup(k); setMore(false); }} /> : null}
      {rows.length ? <>
        {g ? <p className="ifilter">{`${g.key} · ${plural(unit === "reports" ? shown.length : new Set(shown.map(x => x.vin)).size, unit)}`} <button type="button" className="linkbtn" onClick={() => setGroup(null)}>Show all</button></p> : null}
        <Worklist rows={page} open={open} setOpen={setOpen} tool={tool} ctx={ctx} attached={r.evidence || []} />
        {shown.length > page.length ? <button type="button" className="linkbtn imore" onClick={() => setMore(true)}>{`Show all ${shown.length}`}</button> : null}
      </> : null}
      {r.follow_ups?.length ? <div className="askfollow">{r.follow_ups.map(f => <button key={f} type="button" className="fbtn" disabled={busy} onClick={() => onFollow(f)}>{f}</button>)}</div> : null}
      <p className="askfoot">{r.kind === "ask" ? "Answered by Inspectd AI from this workspace's inspection records." : "Counted from this workspace's inspection records."}</p>
    </article>
  );
}

function Breakdown({ b, unit, group, setGroup }){
  const showFlagged = !!b.flagged;
  return (
    <table className="bdtable ibreak"><thead><tr><th>{GROUP_LABEL[b.by] || "Group"}</th><th className="r">{unit === "reports" ? "Reports" : "Vehicles"}</th>{showFlagged ? <th className="r">With a flag</th> : null}</tr></thead>
      <tbody>{b.groups.map(x => (
        <tr key={x.key} className={`row${group === x.key ? " on" : ""}`} data-group={x.key} onClick={() => setGroup(group === x.key ? null : x.key)}>
          <td>{x.key}</td><td className="r num">{unit === "reports" ? x.reports : x.vehicles}</td>{showFlagged ? <td className="r num">{pct(x.flagged, x.vehicles)}</td> : null}</tr>))}
      </tbody></table>
  );
}

/* ---- the worklist and a row's evidence ---- */

function Worklist({ rows, open, setOpen, tool, ctx, attached }){
  return (
    <div className="tablewrap"><table className="rtable iwork"><thead><tr><th>Vehicle</th><th>Job</th><th>Your ref</th><th>Inspected</th><th>City</th><th>Matched on</th></tr></thead>
      <tbody>{rows.map(x => { const m = x.matched_on || [], on = open === x.ref; return (<React.Fragment key={x.ref}>
        <tr className={`row${on ? " on" : ""}`} data-ref={x.ref} aria-expanded={on} onClick={() => setOpen(on ? null : x.ref)}>
          <td data-l="Vehicle"><span className="tx"><b>{x.vehicle}</b><span className="mono">{x.vin}</span></span></td>
          <td data-l="Job" className="mono jref">{x.ref}</td>
          <td data-l="Your ref" className="sub">{x.customer_ref || "–"}</td>
          <td data-l="Inspected" className="sub num">{fmtDate(x.date)}</td>
          <td data-l="City" className="sub">{x.city}</td>
          <td data-l="Matched on" className="mt">{m.length ? <><b>{m[0].label}</b>{m[0].text ? <span>{m[0].text}</span> : null}{m.length > 1 ? <span className="more">{`+${m.length - 1} more`}</span> : null}</> : <span className="sub">–</span>}</td>
        </tr>
        {on ? <tr className="evrow"><td colSpan={6}><Evidence row={x} tool={tool} ctx={ctx} attached={attached.find(e => e.ref === x.ref)} onClose={() => setOpen(null)} /></td></tr> : null}
      </React.Fragment>); })}</tbody></table></div>
  );
}

function Evidence({ row, tool, ctx, attached, onClose }){
  const m = (row.matched_on || []).find(x => x.kind === "flag" || x.kind === "issue");
  const input = m?.kind === "flag" ? {ref: row.ref, flag: m.key} : m?.kind === "issue" ? {ref: row.ref, item: m.item} : {ref: row.ref};
  const [ev, setEv] = useState(attached || null), [err, setErr] = useState(false);
  useEffect(() => {
    if (ev) return; let live = true;
    tool("get_evidence", input).then(x => live && setEv(x), () => live && setErr(true));
    return () => { live = false; };
  }, []);
  const open = () => ctx.navigate(`/reports/${row.report_id}`);
  return (<>
    <div className="evscrim" onClick={onClose} aria-hidden="true"></div>
    <div className="evpanel" role="region" aria-label={`Evidence for ${row.vehicle}`} onClick={e => e.stopPropagation()}>
      <div className="evhead"><b>{row.vehicle}</b><span className="mono">{row.ref}</span><button type="button" className="linkbtn evclose" onClick={onClose}>Close</button></div>
      {err ? <p className="sub">Couldn't load the evidence. The report has every finding.</p> : !ev ? <p className="sub">Loading…</p> : <>
        {ev.flag_evidence?.length && !ev.findings.length ? <ul className="evtext">{ev.flag_evidence.map(t => <li key={t}>{t}</li>)}</ul> : null}
        {ev.findings.map(f => (
          <div className="evitem" key={f.finding}>
            <div className="evmeta"><span className={`dotlabel ${f.status === "fail" ? "red" : "amber"}`}>{f.status === "fail" ? "Fail" : f.status ? f.status[0].toUpperCase() + f.status.slice(1) : "Finding"}</span><span>{f.section}</span><b>{f.item}</b></div>
            {f.note ? <p className="evnote">{f.note}</p> : null}
            {f.photo ? <a className="evphoto" href={f.photo.url} target="_blank" rel="noreferrer"><img src={f.photo.url} alt={`${f.item}, photo ${f.photo.number}`} loading="lazy" /></a>
              : <p className="evnophoto">{f.photo_note}</p>}
          </div>))}
        {!ev.findings.length && !ev.flag_evidence?.length ? <p className="sub">{ev.note || "Nothing recorded for this finding."}</p> : null}
      </>}
      <button type="button" className="btn sm evopen" onClick={open}>Open report</button>
    </div>
  </>);
}

/* ---- CSV: the rows shown, with a link to each report ---- */

function downloadCsv(title, rows){
  const esc = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["Vehicle", "VIN", "Job reference", "Your reference", "Inspected", "City", "Matched on", "Report"];
  const lines = [head, ...rows.map(x => [x.vehicle, x.vin, x.ref, x.customer_ref || "", x.date, x.city,
    (x.matched_on || []).map(m => m.text ? `${m.label}: ${m.text}` : m.label).join("; "), `${location.origin}${x.report_url}`])].map(l => l.map(esc).join(","));
  const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], {type: "text/csv"}));
  const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "inspections"}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
