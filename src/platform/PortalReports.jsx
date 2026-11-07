import React, { useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { PageDock, paged } from "./ui.jsx";
import { Svg, title, worst, DOT, fmtDate, issuesOf, jobRef, SkelRows, ReportRows, useLoaded } from "./portalUi.jsx";

/*
 * The portal's Reports list (ui/reports-client/client.js) and Vehicles (ui/vehicles-client/client.js).
 * The report viewer is ReportView.jsx.
 */

/* ---- Reports: every finished inspection, newest first ---- */

export function Reports({ ctx }){
  const { portal, rows: _ } = usePlatform();
  const loaded = useLoaded();
  const [page, setPage] = useState(0);
  const reports = loaded ? portal.reports().reports : [];
  const pg = paged(reports, page);
  return (<>
    <section className="pad greet"><div className="gt"><h1>Reports</h1><p>Every finished inspection, newest first. Each one comes from the inspector who did the job. Open one for the photos, condition scores and full checklist.</p></div>
      <div className="actions"><button className="btn accent" id="newReqBtn" onClick={() => ctx.navigate("/jobs/new")}>New inspection request</button></div></section>
    <div id="reportsTable">{!loaded ? <SkelRows n={6} /> : reports.length
      ? <div className="listgap"><ReportRows rows={pg.slice} onOpen={id => ctx.navigate(`/reports/${id}`)} /></div>
      : <div className="placeholder inset"><b>No reports yet</b>When an inspector finishes a job, their report lands here.</div>}</div>
    <PageDock pg={loaded && reports.length && pg.pages > 1 ? pg : null} rowSelector="#reportsTable tbody tr.row" onChange={d => setPage(pg.page + d)} />
  </>);
}

/* ---- Vehicles: one row per car (by VIN), its reports and its jobs ---- */

/** Group reports and jobs by VIN; without a VIN, by year/make/model. Newest activity first. */
export function groupVehicles(reports, jobs){
  const groups = new Map();
  const keyOf = (vin, y, mk, md) => (vin || "").trim().toUpperCase() || ["ymm", y, mk, md].map(x => String(x || "").trim().toLowerCase()).join("|");
  const get = (key, label, vin) => { if (!groups.has(key)) groups.set(key, {key, label, vin: (vin || "").trim().toUpperCase(), reports: [], jobs: [], last: ""}); return groups.get(key); };
  const jobKey = j => { const f = j.form || {}; return keyOf(f.vin, f.year, f.make, f.model); };
  const byJob = Object.fromEntries(jobs.map(j => [j.id, j]));
  for (const j of jobs) {
    const f = j.form || {}, label = [f.year, f.make, f.model].filter(Boolean).join(" ") || "Vehicle";
    const g = get(jobKey(j), label, f.vin);
    g.jobs.push(j); g.last = [g.last, (j.created_at || "").slice(0, 10)].sort().pop();
  }
  for (const r of reports) {
    const v = r.vehicle || {}, j = byJob[r.request_id];   // a report uploaded for a job belongs with that job's car, whatever the PDF said
    const g = j ? get(jobKey(j), [j.form?.year, j.form?.make, j.form?.model].filter(Boolean).join(" ") || title(r), j.form?.vin) : get(keyOf(v.vin, v.year, v.make, v.model), title(r), v.vin);
    g.reports.push(r); g.last = [g.last, r.inspection?.date || "", (r.uploaded_at || "").slice(0, 10)].sort().pop();
  }
  return [...groups.values()].sort((a, b) => b.last.localeCompare(a.last));
}
const worstOf = rs => worst({fail: rs.some(r => r.summary?.fail), attention: rs.some(r => r.summary?.attention), pass: rs.length > 0});
const CHEV = '<svg class="chev" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>';
const SEARCH = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.25"/><path d="M10.2 10.2L14 14"/></svg>';

export function Vehicles({ ctx, expand = false }){
  const { portal, rows: _ } = usePlatform();
  const loaded = useLoaded();
  const [raw, setRaw] = useState("");
  const q = raw.trim().toLowerCase();
  const all = loaded ? groupVehicles(portal.reports().reports, portal.listJobs().requests) : [];
  const list = all.filter(g => !q || [g.label, g.vin].join(" ").toLowerCase().includes(q));
  let body;
  if (!loaded) body = <SkelRows n={4} />;
  else if (!all.length) body = <div className="placeholder inset"><b>No vehicles yet</b>Request an inspection or receive a report and the car appears here.</div>;
  else if (!list.length) body = <div className="placeholder inset"><b>Nothing matches</b></div>;
  else body = list.map((g, i) => {
    const open = g.jobs.filter(j => j.stage !== "complete"), hue = worstOf(g.reports), n = g.reports.length;
    const issues = g.reports.length ? Math.max(...g.reports.map(issuesOf)) : 0;
    // the row's styles are ours (portal.css, "added after the clone"): Kavin's markup has no stylesheet behind it
    return (
      <details key={g.key} className="secgroup vgroup" open={list.length === 1 || (i === 0 && expand)}>
        <summary>
          <Svg src={CHEV} />{" "}
          <span className="av" style={{ background: `${DOT[hue]}33` }}>{(g.label.replace(/^[\d\s]+/, "").trim()[0] || "?").toUpperCase()}</span>{" "}
          <span className="vt"><b>{g.label}</b><span className="mono">{g.vin || "VIN not recorded"}</span></span>{" "}
          <span className="cnt">{`${n} report${n === 1 ? "" : "s"}${open.length ? ` · ${open.length} in progress` : ""}${!n && !open.length && g.jobs.length ? ` · ${g.jobs.length} completed job${g.jobs.length === 1 ? "" : "s"}` : ""}`}</span>{" "}
          {n ? <span className={`pill ${hue === "gray" ? "gray" : hue}`}>{issues ? `${issues} issue${issues > 1 ? "s" : ""}` : "No issues"}</span> : null}{n ? " " : null}
          <span className="cnt vlast">{g.last ? "Last " + fmtDate(g.last) : ""}</span>
        </summary>
        {g.jobs.length ? <div className="vjobs">{[...open, ...g.jobs.filter(j => j.stage === "complete")].map(j => (
          <a key={j.id} className="vjob" href={`/jobs/${j.id}`} onClick={e => { e.preventDefault(); ctx.navigate(`/jobs/${j.id}`); }}><span className="mono">{jobRef(j.id)}</span><span className={`pill ${j.stage === "complete" ? "gray" : "blue"}`}>{j.stage_label || j.stage}</span>
            <span className="sub">{[j.form ? STAGE.short(j.form) : "", j.form?.city].filter(Boolean).join(" · ")}</span><span className="sub">{fmtDate((j.created_at || "").slice(0, 10))}</span></a>))}</div> : null}
        {n ? <ReportRows rows={g.reports} onOpen={id => ctx.navigate(`/reports/${id}`)} /> : <div className="vempty">No report yet for this vehicle.</div>}
      </details>);
  });
  return (
    <section className="pad"><div className="greet"><div className="gt"><h1>Vehicles</h1><p>Every car you have had inspected, one row each. Open a vehicle to see all of its reports and any inspection still in progress.</p></div></div>
      <div className="toolbar"><div className="search"><Svg src={SEARCH} /><input id="vq" type="search" placeholder="Search VIN, make, model" autoComplete="off" value={raw} onChange={e => setRaw(e.target.value)} /></div>
        <span className="chip" id="vcount">{loaded && all.length ? `${list.length} of ${all.length}` : ""}</span></div>
      <div id="vehicles" className="listgap">{body}</div></section>
  );
}
