/*
 * The Inspectd AI overview, as pure functions (no AI, no DOM): a workspace's report rows in, each figure out, and
 * each figure turned into the vehicles or inspections behind it. Step 4's chat calls the same functions, so what it
 * answers and the list it shows are the overview's own.
 *
 * Every number comes from the records: each report row's date and location, and its insight_overview in
 * reportIndex.js (flags, surface rust, key issues, the summary's first sentence). docs/platform/decisions.md has
 * the rules.
 *
 *   const ws = workspaceData(rows)              // the workspace's inspections and vehicles
 *   overview(ws)                                // every figure the page shows
 *   select(ws, {kind: "flag", key: "tires"})    // {label, unit, count, rows}: what a click lists
 */
import { METRO_CENTERS, ZIPS } from "./seed.js";
import { vehicleName } from "./vehicleName.js";
import { demoDay } from "./demoDay.js";

export const FLAGS = [["warning_lights", "Warning lights or codes"], ["tires", "Tire concerns"], ["prior_repair", "Prior repair or paint"],
  ["leaks", "Leaks"], ["rust_corrosion", "Rust beyond surface"], ["structural", "Structural or frame concerns"]];
export const FLAG_LABEL = Object.fromEntries(FLAGS);
export const AREAS = ["Exterior", "Interior", "Mechanical", "Tires and wheels", "Road test", "Underbody"];
const METRO_MILES = 60, DAY = 864e5;

/** The area a key issue counts in. Underbody findings leave Exterior and Mechanical, so the areas don't overlap. */
export function areaOf([section, , , , underbody]){
  if (underbody) return "Underbody";
  if ((section || "").startsWith("Tire")) return "Tires and wheels";
  return {Exterior: "Exterior", Interior: "Interior", Mechanical: "Mechanical", "Road Test": "Road test"}[section] || section || "Other";
}

const miles = (a, b) => { const r = d => d * Math.PI / 180, dl = r(b.lat - a.lat), dn = r(b.lon - a.lon);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2; return 7917.6 * Math.asin(Math.sqrt(h)); };

/** Where an inspection counts: a metro when within 60 miles of its center, else its city ("Elsewhere"). */
export function placeOf(location){
  const m = String(location || "").match(/^\s*([^,]+),\s*([A-Z]{2}),?\s*(\d{5})?/), zip = m?.[3], at = zip && ZIPS[zip];
  const city = m ? `${m[1].trim()}, ${m[2]}` : String(location || "Unknown");
  if (at) {
    const near = METRO_CENTERS.map(c => ({c, d: miles(at, c)})).sort((a, b) => a.d - b.d)[0];
    if (near && near.d <= METRO_MILES) return {metro: near.c.name, city};
  }
  return {metro: null, city};
}

// inspection dates are date-only strings in the demo's zone; "the last 30 days" compares them as strings (demoDay.js)
const since30 = now => demoDay(now - 30 * DAY);

/**
 * A workspace's inspections (one per report) and vehicles (one per VIN, by its latest inspection).
 * `rows` are the store's report rows for the workspace (portal.reports().reports); `now` sets "the last 30 days".
 */
export function workspaceData(rows, now = Date.now()){
  const inspections = rows.map(r => {
    const o = r.insight_overview || {}, v = r.vehicle || {}, place = placeOf(r.inspection?.location);
    return {id: r.id, ref: r.job_ref || "", customer_ref: r.customer_ref || "", vin: (v.vin || "").toUpperCase() || r.id, vehicle: vehicleName(v) || "Vehicle",
            date: r.inspection?.date || (r.uploaded_at ? demoDay(Date.parse(r.uploaded_at)) : ""), location: r.inspection?.location || "", place,
            flags: o.flags || {}, surface_rust: !!o.surface_rust, issues: o.issues || [], first_sentence: o.first_sentence || "",
            fail: r.summary?.fail || 0, attention: r.summary?.attention || 0};
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const byVin = new Map();
  for (const i of inspections) { if (!byVin.has(i.vin)) byVin.set(i.vin, []); byVin.get(i.vin).push(i); }
  const vehicles = [...byVin.values()].map(list => ({...list[0], inspections: list}));   // newest first, so [0] is the latest
  return {inspections, vehicles, now};
}

const flagged = i => FLAGS.some(([k]) => i.flags[k]);
// Lemon Squad records each tire position as its own item (Driver's Front Tire, Passenger's 1st Axle Outer Tire ...).
// In Most common issues they are one "Tires" row, a vehicle counted once; the report, flags and areas keep them apart.
export const TIRES = "Tires";
export const issueName = ([section, item]) => (section || "").startsWith("Tire") && /\btire$/i.test(item || "") ? TIRES : item;
const failed = i => i.issues.some(k => k[2] === "fail");

/**
 * The most common issues: vehicles with the item graded fail or attention (once per vehicle), with how many of them
 * failed it. `consumables` includes the wear items; `failuresOnly` ranks by failures and drops items with none.
 */
export function commonIssues(ws, { consumables = false, failuresOnly = false, limit = 10 } = {}){
  const tally = new Map();
  for (const v of ws.vehicles) {
    const seen = new Map();
    for (const k of v.issues) {
      if (k[3] && !consumables) continue;
      const name = issueName(k);
      seen.set(name, (seen.get(name) || false) || k[2] === "fail");
    }
    for (const [item, fail] of seen) {
      const t = tally.get(item) || {item, vehicles: 0, failures: 0};
      t.vehicles++; if (fail) t.failures++; tally.set(item, t);
    }
  }
  let out = [...tally.values()];
  if (failuresOnly) out = out.filter(t => t.failures).sort((a, b) => b.failures - a.failures || b.vehicles - a.vehicles || a.item.localeCompare(b.item));
  else out.sort((a, b) => b.vehicles - a.vehicles || b.failures - a.failures || a.item.localeCompare(b.item));
  return out.slice(0, limit);
}

/** Every figure the overview shows. */
export function overview(ws){
  const n = ws.vehicles.length, share = c => n ? c / n : 0, since = since30(ws.now);
  const places = new Map();
  for (const i of ws.inspections) {
    const key = i.place.metro || "Elsewhere", p = places.get(key) || {name: key, inspections: 0, flagged: 0, cities: new Map()};
    p.inspections++; if (flagged(i)) p.flagged++;
    if (!i.place.metro) { const c = p.cities.get(i.place.city) || {name: i.place.city, inspections: 0, flagged: 0}; c.inspections++; if (flagged(i)) c.flagged++; p.cities.set(i.place.city, c); }
    places.set(key, p);
  }
  const loc = [...places.values()].map(p => ({...p, cities: [...p.cities.values()].sort((a, b) => b.inspections - a.inspections || a.name.localeCompare(b.name))}))
    .sort((a, b) => (a.name === "Elsewhere") - (b.name === "Elsewhere") || b.inspections - a.inspections);
  return {
    cards: {vehicles: n, reports: ws.inspections.length, last30: ws.inspections.filter(i => i.date >= since).length,
            flagged: ws.vehicles.filter(flagged).length, failure: ws.vehicles.filter(failed).length},
    flags: FLAGS.map(([key, label]) => { const c = ws.vehicles.filter(v => v.flags[key]).length; return {key, label, vehicles: c, share: share(c)}; }),
    surface_rust: ws.vehicles.filter(v => v.surface_rust).length,
    areas: AREAS.map(a => ({area: a, vehicles: ws.vehicles.filter(v => v.issues.some(k => areaOf(k) === a)).length})),
    locations: loc,
    repeats: ws.vehicles.filter(v => v.inspections.length > 1).map(v => ({vin: v.vin, vehicle: v.vehicle, dates: v.inspections.map(i => i.date).sort()})),
  };
}

const CARD = {vehicles: "All vehicles", reports: "All reports", last30: "Last 30 days", flagged: "Flagged", failure: "With a failure"};

/**
 * What a click lists. filter.kind: card (key: vehicles | reports | last30 | flagged | failure), flag (key), surface_rust,
 * issue (item, failuresOnly), area (area), place (name, or city for one Elsewhere city), repeat (vin).
 * Returns {label, unit: "vehicles" | "inspections", count, rows}; rows are inspections, newest first.
 */
export function select(ws, f){
  const V = (label, rows) => ({label, unit: "vehicles", count: rows.length, rows});
  const I = (label, rows) => ({label, unit: "inspections", count: rows.length, rows});
  switch (f.kind) {
    case "card":
      if (f.key === "reports") return I(CARD.reports, ws.inspections);
      if (f.key === "last30") { const since = since30(ws.now); return I(CARD.last30, ws.inspections.filter(i => i.date >= since)); }
      if (f.key === "flagged") return V(CARD.flagged, ws.vehicles.filter(flagged));
      if (f.key === "failure") return V(CARD.failure, ws.vehicles.filter(failed));
      return V(CARD.vehicles, ws.vehicles);
    case "flag": return V(FLAG_LABEL[f.key] || f.key, ws.vehicles.filter(v => v.flags[f.key]));
    case "surface_rust": return V("Surface rust", ws.vehicles.filter(v => v.surface_rust));
    case "issue": return V(f.failuresOnly ? `${f.item} · failed` : f.item,
      ws.vehicles.filter(v => v.issues.some(k => issueName(k) === f.item && (!f.failuresOnly || k[2] === "fail"))));
    case "area": return V(f.area, ws.vehicles.filter(v => v.issues.some(k => areaOf(k) === f.area)));
    case "place": return I(f.city || f.name, ws.inspections.filter(i => f.city ? !i.place.metro && i.place.city === f.city : (i.place.metro || "Elsewhere") === f.name));
    case "refs": { const rows = ws.inspections.filter(i => f.refs.includes(i.ref)); return {label: f.label || "Reports", unit: "reports", count: rows.length, rows}; }   // an answer's cited reports
    case "repeat": { const v = ws.vehicles.find(x => x.vin === f.vin); return I(v ? `${v.vehicle} · inspected ${v.inspections.length} times` : f.vin, v ? v.inspections : []); }
    default: return V("Vehicles", []);
  }
}

/**
 * The reports matching a set of filters, for "Ask about your reports" (askServer.js find_reports). Every filter is
 * optional and they all apply: flags (every one listed), issue (an item name, matched in part, so "tire" finds every tire
 * position), area, status (fail or attention, on the matching items, or any item), date_from and date_to (YYYY-MM-DD,
 * inclusive), metro (within 60 miles, as the overview counts), city, make, model, year, vin, customer_ref, repeat_only
 * (vehicles inspected more than once), latest_per_vehicle. Rows are inspections, newest first.
 */
export function findReports(ws, f = {}){
  const low = s => String(s ?? "").trim().toLowerCase(), compact = s => low(s).replace(/[\s#-]+/g, "");
  const repeats = new Set(ws.vehicles.filter(v => v.inspections.length > 1).map(v => v.vin));
  const itemOk = k => (!f.issue || low(issueName(k)).includes(low(f.issue)) || low(k[1]).includes(low(f.issue)))
    && (!f.area || areaOf(k) === f.area) && (!f.status || k[2] === f.status);
  const byItem = f.issue || f.area || f.status;
  const pool = f.latest_per_vehicle ? ws.vehicles : ws.inspections;
  const rows = pool.filter(i =>
    (!f.flags?.length || f.flags.every(k => i.flags[k]))
    && (!byItem || i.issues.some(itemOk))
    && (!f.date_from || i.date >= f.date_from) && (!f.date_to || i.date <= f.date_to)
    && (!f.metro || low(i.place.metro) === low(f.metro))
    && (!f.city || low(i.place.city).startsWith(low(f.city).replace(/,\s*$/, "")))
    && (!f.make || low(i.vehicle).includes(low(f.make))) && (!f.model || low(i.vehicle).includes(low(f.model)))
    && (!f.year || i.vehicle.startsWith(String(f.year) + " "))
    && (!f.vin || i.vin === String(f.vin).trim().toUpperCase())
    && (!f.customer_ref || compact(i.customer_ref) === compact(f.customer_ref))
    && (!f.repeat_only || repeats.has(i.vin)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return {count: rows.length, vehicles: new Set(rows.map(i => i.vin)).size, rows};
}

/** "Tire concerns · 17 vehicles" */
export const filterTitle = s => `${s.label} · ${s.count} ${s.count === 1 ? s.unit.replace(/s$/, "") : s.unit}`;
