import React, { useMemo, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { PageDock, paged } from "./ui.jsx";
import { Svg, I, title, SkelRows, ReportRows, useLoaded, FLAG_TONE, isBusiness } from "./portalUi.jsx";
import { workspaceData, overview, select, filterTitle } from "./aiOverview.js";
import { refHay } from "./jobRef.js";

/*
 * Reports: the workspace's reports, one list with search. A business (fleet or dealer) also gets one row of condition
 * flag chips with their vehicle counts (aiOverview.js, in the browser, no AI); a chip filters the list. The figures,
 * the breakdowns and questions live on Inspection Intelligence (PortalIntelligence.jsx). The viewer is ReportView.jsx.
 */

export function Reports({ ctx }){
  const { portal } = usePlatform();
  const loaded = useLoaded();
  const me = portal.me(), business = isBusiness(me.account?.type);
  const all = loaded ? portal.reports().reports : null;
  const ws = useMemo(() => all && business ? workspaceData(all) : null, [all, business]);
  const o = useMemo(() => ws ? overview(ws) : null, [ws]);
  const [filter, setFilter] = useState(null), [raw, setRaw] = useState(""), [page, setPage] = useState(0);
  const q = raw.trim().toLowerCase();

  // a chip lists each vehicle's latest report with that flag
  const sel = ws && filter ? select(ws, filter) : null;
  const byId = new Map((all || []).map(r => [r.id, r]));
  const base = sel ? sel.rows.map(x => byId.get(x.id)).filter(Boolean) : (all || []);
  // the VIN, the car, and the job's references (ours in any case, with or without the dash, and the customer's own)
  const hay = r => [title(r), r.vehicle?.vin, r.vehicle?.make, r.vehicle?.model, refHay(r.job_ref, r.customer_ref)].join(" ").toLowerCase();
  const list = base.filter(r => !q || hay(r).includes(q));
  const pg = paged(list, page);
  const on = f => !!filter && JSON.stringify(filter) === JSON.stringify(f);
  const pick = f => { setFilter(on(f) ? null : f); setPage(0); };

  return (<>
    <section className="pad greet"><div className="gt"><h1>Reports</h1></div></section>
    {business && o ? (
      <section className="pad">
        <div className="flagchips" id="flagFilters" role="group" aria-label="Condition flags">
          {o.flags.map(f => (
            <button key={f.key} type="button" className={`fbtn${on({kind: "flag", key: f.key}) ? " on" : ""}`} data-flag={f.key} aria-pressed={on({kind: "flag", key: f.key})} disabled={!f.vehicles} onClick={() => pick({kind: "flag", key: f.key})}>
              <i className={`dot ${FLAG_TONE[f.key]}`} aria-hidden="true"></i>{f.label}<span className="n">{f.vehicles}</span>
            </button>))}
          <button type="button" className={`fbtn quiet${on({kind: "surface_rust"}) ? " on" : ""}`} id="surfaceRust" aria-pressed={on({kind: "surface_rust"})} disabled={!o.surface_rust} onClick={() => pick({kind: "surface_rust"})}>
            Surface rust<span className="n">{o.surface_rust}</span></button>
        </div>
      </section>) : null}
    <section className="pad">
      <div className="listbar">
        <div className="search"><Svg src={I.search} /><input id="rq" type="search" placeholder="Search VIN, make, model, reference" autoComplete="off" aria-label="Search reports"
          value={raw} onChange={e => { setRaw(e.target.value); setPage(0); }} /></div>
        {sel ? <span className="filterlabel" id="filterLabel"><b>{filterTitle(sel)}</b><button type="button" className="linkbtn" id="clearFilter" onClick={() => { setFilter(null); setPage(0); }}>Clear</button></span>
          : <span className="sub num" id="rcount">{all ? `${list.length} report${list.length === 1 ? "" : "s"}` : ""}</span>}
      </div>
    </section>
    <div id="reportsTable">{!all ? <SkelRows n={6} /> : list.length
      ? <ReportRows rows={pg.slice} flags={business} onOpen={id => ctx.navigate(`/reports/${id}`)} />
      : <div className="placeholder inset"><b>{all.length ? "No reports match" : "No reports yet"}</b>{all.length ? "" : "When an inspector finishes a job, their report lands here."}</div>}</div>
    <PageDock pg={all && list.length && pg.pages > 1 ? pg : null} rowSelector="#reportsTable tbody tr.row" onChange={d => setPage(pg.page + d)} />
  </>);
}
