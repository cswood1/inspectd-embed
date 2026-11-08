import React, { useMemo, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { AiMark } from "./AiMark.jsx";
import { VehicleList } from "./VehicleList.jsx";
import { workspaceData, overview, commonIssues, select } from "./aiOverview.js";
import { fmtDate, Sk, useLoaded } from "./portalUi.jsx";

/*
 * The Inspectd AI workspace (/ai): an overview across this workspace's reports, every figure computed in the
 * browser from the records (aiOverview.js), with no AI. Any figure opens the vehicles behind it (VehicleList.jsx),
 * directly under the headline cards. Shown in fleet and dealer workspaces only (Portal.jsx). Step 4 adds the chat.
 */

const pct = x => `${Math.round(x * 100)}%`;
const CARDS = [["vehicles", "Vehicles"], ["reports", "Reports"], ["last30", "Last 30 days"], ["flagged", "Flagged"], ["failure", "With a failure"]];

export function AiOverview({ ctx }){
  const { portal } = usePlatform();
  const loaded = useLoaded();
  const rows = loaded ? portal.reports().reports : null;
  const ws = useMemo(() => rows ? workspaceData(rows) : null, [rows]);
  const o = useMemo(() => ws ? overview(ws) : null, [ws]);
  const [filter, setFilter] = useState(null);   // what the vehicle list shows: an aiOverview.select filter
  const [consumables, setConsumables] = useState(false), [failuresOnly, setFailuresOnly] = useState(false);
  const [elsewhere, setElsewhere] = useState(false);
  const listRef = useRef(null);
  const sel = ws && filter ? select(ws, filter) : null;
  const pick = f => { setFilter(f); setTimeout(() => listRef.current?.scrollIntoView({behavior: "smooth", block: "start"}), 30); };
  const on = f => filter && JSON.stringify(filter) === JSON.stringify(f);
  const issues = ws ? commonIssues(ws, {consumables, failuresOnly}) : [];
  const maxArea = o ? Math.max(1, ...o.areas.map(a => a.vehicles)) : 1;

  return (
    <section className="pad aiws">
      <div className="greet"><div className="gt"><h1 className="aiws-h"><AiMark size={24} /><span>Inspectd AI</span></h1></div></div>

      <div className="aiws-cards">
        {CARDS.map(([key, label]) => (
          <button key={key} type="button" className={`aiws-card${on({kind: "card", key}) ? " on" : ""}`} data-card={key} disabled={!o} onClick={() => pick({kind: "card", key})}>
            <span className="t">{label}</span><span className="n">{o ? o.cards[key] : <Sk w={36} h={22} />}</span>
          </button>
        ))}
      </div>

      <div ref={listRef} className="aiws-list">
        {sel ? <VehicleList selection={sel} onOpen={id => ctx.navigate(`/reports/${id}`)} onClear={() => setFilter(null)} /> : null}
      </div>

      <h2 className="aiws-sec">Condition flags</h2>
      <div className="aiws-flags">
        {(o ? o.flags : []).map(f => (
          <button key={f.key} type="button" className={`aiws-flag ${f.key}${f.vehicles ? "" : " zero"}${on({kind: "flag", key: f.key}) ? " on" : ""}`} data-flag={f.key} onClick={() => pick({kind: "flag", key: f.key})}>
            <span className="t">{f.label}</span>
            <span className="n">{f.vehicles}<small>{`${pct(f.share)} of vehicles`}</small></span>
          </button>
        ))}
      </div>
      {o ? <p className="aiws-quiet"><button type="button" className="linkish" id="surfaceRust" onClick={() => pick({kind: "surface_rust"})}>{`Surface rust noted on ${o.surface_rust} vehicle${o.surface_rust === 1 ? "" : "s"}`}</button>{" (not a flag)"}</p> : null}

      <div className="aiws-cols">
        <div className="aiws-panel">
          <div className="aiws-ph"><h2>Most common issues</h2>
            <span className="aiws-toggles">
              <span className="seg" role="group" aria-label="Which issues">
                <button type="button" className={failuresOnly ? "" : "on"} aria-pressed={!failuresOnly} onClick={() => setFailuresOnly(false)}>All</button>
                <button type="button" className={failuresOnly ? "on" : ""} aria-pressed={failuresOnly} id="failOnly" onClick={() => setFailuresOnly(true)}>Failures only</button>
              </span>
              <label className="chk"><input type="checkbox" id="showCons" checked={consumables} onChange={e => setConsumables(e.target.checked)} /> Show consumables</label>
            </span>
          </div>
          {!o ? <Sk w="100%" h={160} /> : issues.length ? (
            <ol className="aiws-rank" id="aiIssuesTop">
              {issues.map((t, n) => {
                const f = {kind: "issue", item: t.item, ...(failuresOnly ? {failuresOnly: true} : {})};
                return (
                  <li key={t.item}><button type="button" className={on(f) ? "on" : ""} data-issue={t.item} onClick={() => pick(f)}>
                    <span className="k">{n + 1}</span><span className="it">{t.item}</span>
                    <span className="v">{failuresOnly ? t.failures : t.vehicles}<small>{failuresOnly ? `failed · ${t.vehicles} flagged` : (t.failures ? `${t.failures} failed` : "")}</small></span>
                  </button></li>);
              })}
            </ol>
          ) : <p className="aiws-quiet">No failures in this workspace's reports.</p>}
        </div>

        <div className="aiws-panel">
          <div className="aiws-ph"><h2>Issues by area</h2></div>
          {!o ? <Sk w="100%" h={160} /> : (
            <ul className="aiws-bars" id="aiAreas">
              {o.areas.map(a => (
                <li key={a.area}>
                  <button type="button" className={on({kind: "area", area: a.area}) ? "on" : ""} data-area={a.area} onClick={() => pick({kind: "area", area: a.area})}>
                    <span className="it">{a.area}</span>
                    <span className="bar"><i style={{ width: `${(100 * a.vehicles / maxArea).toFixed(1)}%` }}></i></span>
                    <span className="v">{a.vehicles}</span>
                  </button>
                  {a.area === "Tires and wheels" ? <p className="aiws-note">Tread at 4/32 or less is counted under Tire concerns even when the tire was graded pass.</p> : null}
                </li>))}
            </ul>
          )}
          {o ? <p className="aiws-quiet">Vehicles with a fail or attention item in each area.</p> : null}
        </div>
      </div>

      <div className="aiws-cols">
        <div className="aiws-panel">
          <div className="aiws-ph"><h2>By location</h2></div>
          {!o ? <Sk w="100%" h={120} /> : (
            <table className="aiws-table" id="aiPlaces">
              <thead><tr><th>Place</th><th className="r">Inspections</th><th className="r">With a flag</th></tr></thead>
              <tbody>
                {o.locations.map(p => (
                  <React.Fragment key={p.name}>
                    <tr className={`row${on({kind: "place", name: p.name}) ? " on" : ""}`} data-place={p.name} onClick={() => pick({kind: "place", name: p.name})}>
                      <td>{p.name === "Elsewhere"
                        ? <><button type="button" className="exp" aria-expanded={elsewhere} id="elsewhereToggle" onClick={e => { e.stopPropagation(); setElsewhere(x => !x); }}>{elsewhere ? "▾" : "▸"}</button>{`Elsewhere · ${p.cities.length} cities`}</>
                        : p.name}</td>
                      <td className="r">{p.inspections}</td><td className="r">{pct(p.flagged / p.inspections)}</td>
                    </tr>
                    {p.name === "Elsewhere" && elsewhere ? p.cities.map(c => (
                      <tr key={c.name} className={`row sub${on({kind: "place", city: c.name}) ? " on" : ""}`} data-city={c.name} onClick={() => pick({kind: "place", city: c.name})}>
                        <td>{c.name}</td><td className="r">{c.inspections}</td><td className="r">{pct(c.flagged / c.inspections)}</td>
                      </tr>)) : null}
                  </React.Fragment>))}
              </tbody>
            </table>
          )}
        </div>

        <div className="aiws-panel">
          <div className="aiws-ph"><h2>Inspected more than once</h2></div>
          {!o ? <Sk w="100%" h={80} /> : o.repeats.length ? (
            <ul className="aiws-repeats" id="aiRepeats">
              {o.repeats.map(r => (
                <li key={r.vin}><button type="button" className={on({kind: "repeat", vin: r.vin}) ? "on" : ""} data-vin={r.vin} onClick={() => pick({kind: "repeat", vin: r.vin})}>
                  <span className="it"><b>{r.vehicle}</b><span className="mono">{r.vin}</span></span>
                  <span className="v">{r.dates.map(fmtDate).join(" · ")}</span>
                </button></li>))}
            </ul>
          ) : <p className="aiws-quiet">No vehicle has more than one inspection in this workspace.</p>}
        </div>
      </div>
    </section>
  );
}
