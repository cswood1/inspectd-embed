import React, { useMemo, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { PageDock, paged } from "./ui.jsx";
import { Svg, I, title, fmtDate, SkelRows, ReportRows, useLoaded, FLAG_TONE, isBusiness } from "./portalUi.jsx";
import { workspaceData, overview, commonIssues, select, filterTitle } from "./aiOverview.js";
import { refHay } from "./jobRef.js";
import { AskBar } from "./AskBar.jsx";

/*
 * Reports: the workspace's reports, one list. For a business (fleet or dealer) it opens with Inspectd AI's figures
 * and condition flags across those reports (aiOverview.js, computed in the browser, no AI); any of them filters the
 * list. "Breakdown" holds the deeper figures; anything there filters the list too. A consumer workspace and a
 * marketplace's shoppers get the plain list. Step 4 puts an "Ask about your reports" bar at the top.
 * The report viewer is ReportView.jsx.
 */

const pct = x => `${Math.round(x * 100)}%`;
const CARDS = [["vehicles", "Vehicles"], ["reports", "Reports"], ["last30", "Last 30 days"], ["flagged", "Flagged"], ["failure", "With a failure"]];

export function Reports({ ctx }){
  const { portal, rows: _, seededAt } = usePlatform();
  const loaded = useLoaded();
  const me = portal.me(), business = isBusiness(me.account?.type);
  const all = loaded ? portal.reports().reports : null;
  const ws = useMemo(() => all && business ? workspaceData(all) : null, [all, business]);
  const o = useMemo(() => ws ? overview(ws) : null, [ws]);
  const [filter, setFilter] = useState(null), [view, setView] = useState("list");
  const [raw, setRaw] = useState(""), [page, setPage] = useState(0);
  const q = raw.trim().toLowerCase();

  // the reports a filter stands for: a vehicle filter lists each vehicle's latest report, an inspection filter every one
  const sel = ws && filter ? select(ws, filter) : null;
  const byId = new Map((all || []).map(r => [r.id, r]));
  const base = sel ? sel.rows.map(x => byId.get(x.id)).filter(Boolean) : (all || []);
  // the VIN, the car, and the job's references (ours in any case, with or without the dash, and the customer's own)
  const hay = r => [title(r), r.vehicle?.vin, r.vehicle?.make, r.vehicle?.model, refHay(r.job_ref, r.customer_ref)].join(" ").toLowerCase();
  const list = base.filter(r => !q || hay(r).includes(q));
  const pg = paged(list, page);
  const pick = f => { setFilter(f); setView("list"); setPage(0); };
  const on = f => !!filter && JSON.stringify(filter) === JSON.stringify(f);
  // an answer's cited reports filter the list ("Asked: … · 4 reports"); an answer citing none leaves it as it is
  const asked = ({ question, refs }) => { if (refs.length) pick({kind: "refs", refs, label: `Asked: ${question}`}); else if (filter?.kind === "refs") pick(null); };
  const unask = () => { if (filter?.kind === "refs") pick(null); };

  return (<>
    <section className="pad greet"><div className="gt"><h1>Reports</h1></div>
      {business ? <div className="actions"><span className="seg" role="group" aria-label="View">
        <button type="button" id="viewList" className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
        <button type="button" id="viewBreakdown" className={view === "breakdown" ? "on" : ""} aria-pressed={view === "breakdown"} onClick={() => setView("breakdown")}>Breakdown</button>
      </span></div> : null}
    </section>

    {business && loaded ? <AskBar workspace={me.account.id} seededAt={seededAt} onAnswer={asked} onClear={unask} /> : null}

    {business ? (
      <section className="pad">
        <div className="figs" id="figs">
          {CARDS.map(([key, label]) => (
            <button key={key} type="button" className={`fig${on({kind: "card", key}) ? " on" : ""}`} data-card={key} disabled={!o} onClick={() => pick({kind: "card", key})}>
              <span className="n">{o ? o.cards[key] : "–"}</span><span className="t">{label}</span>
            </button>))}
        </div>
        <div className="flagfilters" id="flagFilters">
          {(o ? o.flags : []).map(f => (
            <button key={f.key} type="button" className={`ff${f.vehicles ? "" : " zero"}${on({kind: "flag", key: f.key}) ? " on" : ""}`} data-flag={f.key} onClick={() => pick({kind: "flag", key: f.key})}>
              <i className={`dot ${FLAG_TONE[f.key]}`} aria-hidden="true"></i><span className="t">{f.label}</span><span className="n">{f.vehicles}</span><span className="p">{pct(f.share)}</span>
            </button>))}
          {o ? <button type="button" className={`ff quiet${on({kind: "surface_rust"}) ? " on" : ""}`} id="surfaceRust" onClick={() => pick({kind: "surface_rust"})}>
            {`Surface rust noted on ${o.surface_rust} vehicle${o.surface_rust === 1 ? "" : "s"} (not a flag)`}</button> : null}
        </div>
      </section>) : null}

    {view === "breakdown" && ws ? <Breakdown ws={ws} o={o} pick={pick} /> : (<>
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
    </>)}
  </>);
}

/* ---- Breakdown: the deeper figures; anything clicked filters the list ---- */

function Breakdown({ ws, o, pick }){
  const [consumables, setConsumables] = useState(false), [failuresOnly, setFailuresOnly] = useState(false), [elsewhere, setElsewhere] = useState(false);
  const issues = commonIssues(ws, {consumables, failuresOnly});
  const maxArea = Math.max(1, ...o.areas.map(a => a.vehicles));
  return (
    <section className="pad bd" id="breakdown">
      <div className="bdcols">
        <div className="bdblock">
          <div className="bdhead"><h2>Most common issues</h2>
            <span className="bdtoggles">
              <span className="seg sm" role="group" aria-label="Which issues">
                <button type="button" className={failuresOnly ? "" : "on"} aria-pressed={!failuresOnly} onClick={() => setFailuresOnly(false)}>All</button>
                <button type="button" className={failuresOnly ? "on" : ""} aria-pressed={failuresOnly} id="failOnly" onClick={() => setFailuresOnly(true)}>Failures only</button>
              </span>
              <label className="chk"><input type="checkbox" id="showCons" checked={consumables} onChange={e => setConsumables(e.target.checked)} /> Show consumables</label>
            </span></div>
          {issues.length ? <ol className="rank" id="aiIssuesTop">{issues.map((t, n) => {
            const f = {kind: "issue", item: t.item, ...(failuresOnly ? {failuresOnly: true} : {})};
            return <li key={t.item}><button type="button" data-issue={t.item} onClick={() => pick(f)}>
              <span className="k num">{n + 1}</span><span className="it">{t.item}</span>
              <span className="v num">{failuresOnly ? t.failures : t.vehicles}</span><span className="s num">{failuresOnly ? `of ${t.vehicles}` : (t.failures ? `${t.failures} failed` : "")}</span>
            </button></li>; })}</ol>
            : <p className="sub">No failures in this workspace's reports.</p>}
        </div>
        <div className="bdblock">
          <div className="bdhead"><h2>Issues by area</h2></div>
          <ul className="bars" id="aiAreas">{o.areas.map(a => (
            <li key={a.area}><button type="button" data-area={a.area} onClick={() => pick({kind: "area", area: a.area})}>
              <span className="it">{a.area}</span><span className="bar"><i style={{ width: `${(100 * a.vehicles / maxArea).toFixed(1)}%` }}></i></span><span className="v num">{a.vehicles}</span>
            </button>{a.area === "Tires and wheels" ? <p className="note">Tread at 4/32 or less is counted under Tire concerns even when the tire was graded pass.</p> : null}</li>))}</ul>
          <p className="note">Vehicles with a fail or attention item in each area.</p>
        </div>
      </div>
      <div className="bdcols">
        <div className="bdblock">
          <div className="bdhead"><h2>By location</h2></div>
          <table className="bdtable" id="aiPlaces"><thead><tr><th>Place</th><th className="r">Inspections</th><th className="r">With a flag</th></tr></thead><tbody>
            {o.locations.map(p => (
              <React.Fragment key={p.name}>
                <tr className="row" data-place={p.name} onClick={() => pick({kind: "place", name: p.name})}>
                  <td>{p.name === "Elsewhere" ? <><button type="button" className="exp" aria-expanded={elsewhere} id="elsewhereToggle" onClick={e => { e.stopPropagation(); setElsewhere(x => !x); }}>{elsewhere ? "▾" : "▸"}</button>{`Elsewhere · ${p.cities.length} cities`}</> : p.name}</td>
                  <td className="r num">{p.inspections}</td><td className="r num">{pct(p.flagged / p.inspections)}</td></tr>
                {p.name === "Elsewhere" && elsewhere ? p.cities.map(c => (
                  <tr key={c.name} className="row sub" data-city={c.name} onClick={() => pick({kind: "place", city: c.name})}>
                    <td>{c.name}</td><td className="r num">{c.inspections}</td><td className="r num">{pct(c.flagged / c.inspections)}</td></tr>)) : null}
              </React.Fragment>))}
          </tbody></table>
        </div>
        <div className="bdblock">
          <div className="bdhead"><h2>Inspected more than once</h2></div>
          {o.repeats.length ? <ul className="repeats" id="aiRepeats">{o.repeats.map(r => (
            <li key={r.vin}><button type="button" data-vin={r.vin} onClick={() => pick({kind: "repeat", vin: r.vin})}>
              <span className="it"><b>{r.vehicle}</b><span className="mono">{r.vin}</span></span><span className="v num">{r.dates.map(fmtDate).join(" · ")}</span>
            </button></li>))}</ul>
            : <p className="sub">No vehicle has more than one inspection in this workspace.</p>}
        </div>
      </div>
    </section>
  );
}
