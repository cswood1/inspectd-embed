import React from "react";
import { FLAGS, filterTitle } from "./aiOverview.js";
import { fmtDate } from "./portalUi.jsx";

/*
 * The vehicles (or inspections) behind a figure: what it is filtered by and how many, then one row each with the
 * vehicle, VIN, city, inspection date, its flags and the first sentence of its summary. A row opens the report.
 * The Inspectd AI overview opens it from any figure; step 4's chat answers show the vehicles they draw on with it.
 *
 * selection: aiOverview.select(...) -> {label, unit, count, rows}; onOpen(reportId); onClear() (optional)
 */
export function VehicleList({ selection, onOpen, onClear, id = "vlist" }){
  if (!selection) return null;
  const { rows } = selection;
  return (
    <section className="vl" id={id} aria-label={filterTitle(selection)}>
      <header className="vl-head">
        <h2>{filterTitle(selection)}</h2>
        {onClear ? <button type="button" className="btn sm" onClick={onClear}>Clear</button> : null}
      </header>
      {rows.length ? (
        <ol className="vl-rows">
          {rows.map(r => {
            const chips = FLAGS.filter(([k]) => r.flags[k]);
            return (
              <li key={r.id}>
                <button type="button" className="vl-row" data-report={r.id} onClick={() => onOpen(r.id)}>
                  <span className="vl-car"><b>{r.vehicle}</b><span className="mono">{r.vin}</span></span>
                  <span className="vl-where">{r.place.city}<small>{fmtDate(r.date)}</small></span>
                  <span className="vl-flags">{chips.length ? chips.map(([k, label]) => <span key={k} className={`ai-chip ${k}`}>{label}</span>)
                    : <span className="vl-none">No flags</span>}</span>
                  <span className="vl-sum">{r.first_sentence}</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : <p className="vl-empty">No vehicles match.</p>}
    </section>
  );
}
