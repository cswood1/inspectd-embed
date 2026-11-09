/*
 * Inspection Intelligence's tools: the product, with the page as their first client (docs/platform/decisions.md,
 * "Inspection Intelligence"). Each tool is defined once (name, description, JSON input schema) in the shape MCP
 * publishes tools in, and returns structured data: rows with references, links, the reason each row matched, evidence.
 * Never prose. Workspace scoping lives here and in the server, never in a tool argument: `workspaceFor` builds one
 * business workspace's report set on the server, and every tool closes over it.
 *
 * Clients: the model (askServer.js, through api/ask.js), the page directly (api/tools.js, no model), and later an MCP
 * server, unchanged.
 */
import { buildSeed, METRO_CENTERS } from "./seed.js";
import { workspaceData, overview, commonIssues, findReports, select, issueMatches, issueName, FLAGS, FLAG_LABEL, AREAS } from "./aiOverview.js";
import { normRef } from "./jobRef.js";
import { demoDay, addDays } from "./demoDay.js";

const BUSINESS = ["fleet", "dealer"];
export const METROS = METRO_CENTERS.map(c => c.name);
export const GROUP_BY = ["metro", "city", "make", "model", "year", "month", "flag", "issue"];
export const DETAIL_LIMIT = 25, MAX_LIMIT = 200;

/* ---- the workspace: built on the server, scoped before anything is retrieved ---- */

const seeds = new Map();   // a few recent seeds per running copy, by their build time
function seedAt(ms){
  if (!seeds.has(ms)) { seeds.set(ms, buildSeed(ms)); if (seeds.size > 4) seeds.delete(seeds.keys().next().value); }
  return seeds.get(ms);
}
/**
 * One business workspace's reports, joined to their jobs (our reference and the customer's). `seededAt` is when the
 * browser's seed was built, so the server's report set (and every date in it) is the same one the browser lists;
 * `loadDoc(id)` reads a report's full record. Null for an unknown workspace or one that isn't a business's.
 */
export function workspaceFor(orgId, { seededAt, now = Date.now(), loadDoc }){
  const s = seedAt(seededAt), org = s.orgs.find(o => o.id === orgId);
  if (!org || !BUSINESS.includes(org.type)) return null;
  const rows = s.reports.filter(r => r.org_id === org.id).map(r => {
    const job = s.rows.find(x => x.id === r.request_id);
    return {...r, job_ref: job?.ref || "", customer_ref: job?.form.customer_ref || ""};
  });
  return {org: {id: org.id, name: org.name, type: org.type}, rows, ws: workspaceData(rows, now), loadDoc};
}

/* ---- the definitions: MCP's tool shape (name, description, inputSchema) ---- */

const S = (type, description, extra = {}) => ({type, description, ...extra});
const FLAG_KEYS = FLAGS.map(([k]) => k);
export const TOOL_DEFS = [
  {name: "find_reports",
   description: "Find this workspace's inspection reports matching every filter given, as a worklist: each row has the report's job reference, the customer's reference, the vehicle, VIN, date, city, a link to the report, and matched_on (why the report matched: the flag evidence or the matching item and the inspector's note). It takes several filters at once (for example any_flags, metro and latest_per_vehicle together), and one call usually answers the question. Set group_by for a breakdown: groups with counts and references. Returns the count of reports, the number of distinct vehicles and every matching reference. Omit a filter to not filter on it. Use get_report only when the question is about one specific report, and get_evidence for one finding.",
   inputSchema: {type: "object", additionalProperties: false, properties: {
     flags: S("array", "Condition flags the report must all have", {items: {type: "string", enum: FLAG_KEYS}}),
     any_flags: S("array", "Condition flags the report must have at least one of", {items: {type: "string", enum: FLAG_KEYS}}),
     issue: S("string", "An inspection item, matched in part (e.g. 'Scratches', 'Glass', 'tire', 'Engine Oil Leaks')"),
     area: S("string", "The area an item counts in", {enum: AREAS}),
     status: S("string", "The item's grade: fail, or attention", {enum: ["fail", "attention"]}),
     date_from: S("string", "Inspected on or after this date", {format: "date"}),
     date_to: S("string", "Inspected on or before this date", {format: "date"}),
     metro: S("string", "Inspections within 60 miles of this metro", {enum: METROS}),
     city: S("string", "The city, e.g. 'Fort Worth' or 'Fort Worth, TX'"),
     make: S("string", "Vehicle make"), model: S("string", "Vehicle model"),
     year: S("integer", "Model year"), vin: S("string", "A VIN"),
     customer_ref: S("string", "The customer's own reference: a unit number, stock number or PO, e.g. 'Unit 4468'"),
     repeat_only: S("boolean", "Only vehicles inspected more than once"),
     latest_per_vehicle: S("boolean", "Only each vehicle's latest inspection. Set it for questions about vehicles (how many vehicles, which vehicles have something): vehicles are counted by their latest inspection. Leave it off for questions about reports or inspections, and with repeat_only (every inspection of those vehicles is the answer)."),
     group_by: S("string", "Break the matches down by metro (Elsewhere for the rest), city, make, model, year, month, flag or issue", {enum: GROUP_BY}),
     limit: S("integer", `How many rows to return in full, newest first (default ${DETAIL_LIMIT}); refs always lists every match`),
   }}},
  {name: "get_evidence",
   description: "The evidence for one finding on one report: the finding's status, section and item, the inspector's note, its photo when the report kept it, and the report link. Name the item (matched in part, e.g. 'leak' or 'Engine Oil Leaks') or a condition flag. Takes a job reference (J-XXXXXX) or the customer's reference.",
   inputSchema: {type: "object", additionalProperties: false, required: ["ref"], properties: {
     ref: S("string", "A job reference (J-XXXXXX) or the customer's reference (e.g. 'Stock 24-8197')"),
     item: S("string", "The inspection item, matched in part"),
     flag: S("string", "A condition flag, for the findings behind it", {enum: FLAG_KEYS}),
   }}},
  {name: "get_report",
   description: "One report in full: the summary, every key issue with the inspector's note, the condition flags with their evidence, and the counts. Takes a job reference (J-XXXXXX) or the customer's reference.",
   inputSchema: {type: "object", additionalProperties: false, required: ["ref"], properties: {ref: S("string", "A job reference (J-XXXXXX) or the customer's reference (e.g. 'Unit 4468')")}}},
  {name: "workspace_figures",
   description: "The workspace's overview: today's date, vehicles, reports, reports in the last 30 days, flagged vehicles, vehicles with a failure (with the references behind each smaller count), each flag's count, surface rust, issues by area, inspections by location, the ten most common issues, and the vehicles inspected more than once.",
   inputSchema: {type: "object", additionalProperties: false, properties: {}}},
];
/** The definitions as the Claude API takes them: strict tools with the same schemas. */
export const anthropicTools = () => TOOL_DEFS.map(t => ({name: t.name, description: t.description, input_schema: t.inputSchema, strict: true}));

/* ---- reading a report's record ---- */

const short = (s, n = 110) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1) > 40 ? s.lastIndexOf(" ", n - 1) : n - 1) + "…"; };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const reportUrl = i => `/reports/${i.id}`;
const findInspection = (ws, key) => {
  const ref = normRef(key), compact = s => String(s || "").toLowerCase().replace(/[\s#-]+/g, "");
  return ws.inspections.find(x => (ref && x.ref === ref) || (!ref && x.customer_ref && compact(x.customer_ref) === compact(key)));
};
// a flag's first piece of evidence: a finding (with its index, so the evidence can open) or an inspector's sentence
function firstEvidence(doc, key){
  const f = doc.insight?.flags?.[key], findings = doc.findings || [];
  // a finding first (it opens as evidence, with its photo when one is linked), else the inspector's sentence
  for (const e of f?.evidence || []) if (Number.isInteger(e.finding) && findings[e.finding]) { const x = findings[e.finding]; return {text: short(`${x.item}${x.notes ? ": " + x.notes : ""}`), finding: e.finding}; }
  for (const e of f?.evidence || []) if (e.text) return {text: short(e.text), finding: null};
  return {text: "", finding: null};
}

/** Why a report is in a result, built by code from the filters applied and the report's own record (never by the model). */
export function matchedOn(W, i, f = {}){
  const doc = W.loadDoc(i.id) || {}, keyIssues = doc.insight?.key_issues || [], out = [];
  const flags = [...new Set([...(f.flags || []), ...(f.any_flags || []).filter(k => i.flags[k])])];
  for (const k of flags) { const e = firstEvidence(doc, k); out.push({kind: "flag", key: k, label: FLAG_LABEL[k], text: e.text, finding: e.finding}); }
  if (f.issue || f.area || f.status) {
    const low = x => String(x || "").trim().toLowerCase(), exact = !!f.issue && W.ws.inspections.some(x => x.issues.some(k => low(issueName(k)) === low(f.issue)));
    const tuples = i.issues.filter(k => issueMatches(k, {...f, exact}));
    for (const t of tuples.slice(0, 3)) {
      const k = keyIssues.find(x => x.item === t[1] && x.status === t[2]) || {};
      out.push({kind: "issue", label: `${cap(t[2] === "fail" ? "failed" : t[2])}: ${t[1]}`, text: short(k.note || ""), finding: Number.isInteger(k.finding) ? k.finding : null, item: t[1]});
    }
  }
  if (f.customer_ref && i.customer_ref) out.push({kind: "customer_ref", label: "Your reference", text: i.customer_ref, finding: null});
  if (f.repeat_only) out.push({kind: "repeat", label: "Inspected more than once", text: "", finding: null});
  return out;
}
const flagList = i => FLAGS.filter(([k]) => i.flags[k]).map(([, label]) => label);
/** One worklist row. */
export const rowFor = (W, i, f = {}) => ({ref: i.ref, customer_ref: i.customer_ref || null, vehicle: i.vehicle, vin: i.vin, date: i.date, city: i.place.city,
  metro: i.place.metro, report_id: i.id, report_url: reportUrl(i), flags: flagList(i), failed_items: i.fail, attention_items: i.attention, matched_on: matchedOn(W, i, f)});

const monthLabel = ym => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {timeZone: "UTC", month: "short", year: "numeric"}); };
const isFlagged = i => FLAGS.some(([k]) => i.flags[k]);
/** Group a result's inspections: [{key, vehicles, reports, flagged (vehicles with any flag), refs}]. */
export function groupRows(rows, by){
  const keysOf = i => by === "metro" ? [i.place.metro || "Elsewhere"] : by === "city" ? [i.place.city] : by === "make" ? [i.make || "Unknown"]
    : by === "model" ? [`${i.make} ${i.model}`.trim() || "Unknown"] : by === "year" ? [String(i.year || "Unknown")] : by === "month" ? [monthLabel(i.date.slice(0, 7))]
    : by === "flag" ? FLAGS.filter(([k]) => i.flags[k]).map(([, l]) => l) : by === "issue" ? [...new Set(i.issues.filter(k => !k[3]).map(issueName))] : [];
  const g = new Map();
  for (const i of rows) for (const key of keysOf(i)) {
    const x = g.get(key) || {key, vins: new Set(), flaggedVins: new Set(), refs: []};
    x.vins.add(i.vin); if (isFlagged(i)) x.flaggedVins.add(i.vin); x.refs.push(i.ref); g.set(key, x);
  }
  const list = [...g.values()].map(x => ({key: x.key, vehicles: x.vins.size, reports: x.refs.length, flagged: x.flaggedVins.size, refs: x.refs}));
  return list.sort((a, b) => (by === "metro" ? (a.key === "Elsewhere") - (b.key === "Elsewhere") : 0) || (by === "year" ? +b.key - +a.key : 0) || b.vehicles - a.vehicles || b.reports - a.reports || a.key.localeCompare(b.key))
    .slice(0, by === "issue" ? 15 : 50);
}

/* ---- running a tool ---- */

const clean = input => Object.fromEntries(Object.entries(input || {}).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));
/**
 * Run one tool for a workspace. Returns {result, refs, sets, run}: the result (rows in full up to `limit`), the
 * references it returned (for the citation check), the counts it reported with their references (for the count and
 * headline checks), and what the server keeps to build the page's worklist, breakdown and evidence.
 */
export function runTool(W, name, input = {}){
  const { ws } = W;
  if (name === "find_reports") {
    const f = clean(input), { limit = DETAIL_LIMIT, group_by, ...filters } = f;
    const out = findReports(ws, filters), refs = out.rows.map(i => i.ref), n = Math.max(1, Math.min(MAX_LIMIT, +limit || DETAIL_LIMIT));
    const groups = group_by ? groupRows(out.rows, group_by) : null;
    // with latest_per_vehicle each row is one vehicle's latest report, so the count is of vehicles
    const result = {count: out.count, unit: filters.latest_per_vehicle ? "vehicles (each by its latest report)" : "reports", vehicles: out.vehicles, refs, rows: out.rows.slice(0, n).map(i => rowFor(W, i, filters)),
      ...(groups ? {group_by, groups} : {}), ...(out.count > n ? {note: `Rows for the newest ${n} of ${out.count}; refs lists all ${out.count}.`} : {})};
    const sets = [{count: out.count, refs}, {count: out.vehicles, refs}, ...(groups || []).flatMap(x => [{count: x.vehicles, refs: x.refs}, {count: x.reports, refs: x.refs}])];
    return {result, refs, sets, run: {name, filters, group_by: group_by || null, rows: out.rows, groups}};
  }
  if (name === "get_evidence") {
    const i = findInspection(ws, String(input?.ref || ""));
    if (!i) return {refs: [], sets: [], result: {error: `No report in this workspace with the reference ${input?.ref}.`}};
    const doc = W.loadDoc(i.id) || {}, findings = doc.findings || [], keyIssues = doc.insight?.key_issues || [];
    const kept = new Map((doc.images || []).map(im => [im.index, im]));
    const photoOf = n => { const im = kept.get(n); return im ? {url: `/portal/reports/${i.id}/images/${im.filename}`, thumb: im.thumb ? `/portal/reports/${i.id}/images/${im.thumb}` : null, number: n, caption: im.caption || ""} : null; };
    const card = (idx, k) => { const x = findings[idx] || {}, photo = k?.photo ? photoOf(k.photo) : null;
      return {finding: idx, status: k?.status || x.status || "", section: k?.section || x.section || "", item: k?.item || x.item || "", note: k?.note || x.notes || "", photo,
              photo_note: photo ? null : k?.photo ? "The inspector's photo for this item isn't in the demo set." : "The inspector didn't link a photo to this item."}; };
    let picked = [], flagText = [];
    const low = s => String(s || "").toLowerCase();
    if (input?.flag) {
      const ev = doc.insight?.flags?.[input.flag]?.evidence || [];
      picked = ev.filter(e => Number.isInteger(e.finding)).map(e => card(e.finding, keyIssues.find(k => k.finding === e.finding)));
      flagText = ev.filter(e => e.text).map(e => e.text);
    }
    if (input?.item) {
      const want = low(input.item).replace(/s\b/g, "");
      const hit = keyIssues.filter(k => low(k.item).replace(/s\b/g, "").includes(want) || low(k.note).includes(low(input.item)));
      picked = hit.length ? hit.map(k => card(k.finding, k)) : findings.map((x, n) => [x, n]).filter(([x]) => low(x.item).includes(want) && x.status !== "pass").map(([, n]) => card(n, null));
    }
    if (!input?.flag && !input?.item) picked = keyIssues.filter(k => k.status === "fail").map(k => card(k.finding, k));
    picked = picked.filter((c, n, a) => a.findIndex(x => x.finding === c.finding) === n).slice(0, 5);
    return {refs: [i.ref], sets: [], result: {ref: i.ref, customer_ref: i.customer_ref || null, vehicle: i.vehicle, date: i.date, report_id: i.id, report_url: reportUrl(i),
      ...(input?.flag ? {flag: FLAG_LABEL[input.flag]} : {}), findings: picked, ...(flagText.length ? {flag_evidence: flagText.slice(0, 3)} : {}),
      ...(picked.length ? {} : {note: "No finding on this report matches; nothing recorded for it."})}, run: {name, ref: i.ref}};
  }
  if (name === "get_report") {
    const i = findInspection(ws, String(input?.ref || ""));
    if (!i) return {refs: [], sets: [], result: {error: `No report in this workspace with the reference ${input?.ref}.`}};
    const doc = W.loadDoc(i.id) || {}, ins = doc.insight || {}, findings = doc.findings || [];
    const evidence = ev => (ev || []).map(e => e.text || (Number.isInteger(e.finding) && findings[e.finding] ? `${findings[e.finding].item}: ${findings[e.finding].notes || findings[e.finding].status}` : null)).filter(Boolean).slice(0, 3);
    const flags = Object.fromEntries(FLAGS.filter(([k]) => ins.flags?.[k]?.value).map(([k, label]) => [label, evidence(ins.flags[k].evidence)]));
    const { matched_on, ...row } = rowFor(W, i);
    return {refs: [i.ref], sets: [], result: {...row, location: i.location, summary: ins.summary?.text || i.first_sentence,
      key_issues: (ins.key_issues || []).map(k => ({status: k.status, section: k.section, item: k.item, note: k.note || "", consumable: !!k.consumable})),
      flags, surface_rust: !!ins.details?.surface_rust?.value}, run: {name, ref: i.ref}};
  }
  if (name === "workspace_figures") {
    const o = overview(ws);
    const refsOf = vin => ws.inspections.filter(i => i.vin === vin).map(i => i.ref);
    const repeats = o.repeats.map(r => ({vehicle: r.vehicle, vin: r.vin, dates: r.dates, refs: refsOf(r.vin)}));
    const today = demoDay(ws.now);
    // the references behind the smaller counts (each vehicle by its latest inspection), so an answer can cite them all
    const of = sel => select(ws, sel).rows.map(i => i.ref);
    const failure = of({kind: "card", key: "failure"}), flagged = of({kind: "card", key: "flagged"}), last30 = of({kind: "card", key: "last30"});
    const flagRefs = Object.fromEntries(FLAGS.map(([k]) => [k, of({kind: "flag", key: k})]));
    const sets = [{count: failure.length, refs: failure}, {count: flagged.length, refs: flagged}, {count: last30.length, refs: last30},
      ...FLAGS.map(([k]) => ({count: flagRefs[k].length, refs: flagRefs[k]})).filter(x => x.count), ...repeats.map(r => ({count: r.refs.length, refs: r.refs}))];
    return {refs: [...new Set([...repeats.flatMap(r => r.refs), ...failure, ...flagged, ...last30, ...Object.values(flagRefs).flat()])], sets, run: {name}, result: {
      today, last_30_days_from: addDays(today, -30),
      vehicles: o.cards.vehicles, reports: o.cards.reports,
      reports_last_30_days: o.cards.last30, reports_last_30_days_refs: last30,
      flagged_vehicles: o.cards.flagged, flagged_vehicles_refs: flagged,
      vehicles_with_a_failure: o.cards.failure, vehicles_with_a_failure_refs: failure,
      flags: o.flags.map(f => ({flag: f.label, vehicles: f.vehicles, share_of_vehicles: `${Math.round(f.share * 100)}%`, refs: flagRefs[f.key]})), surface_rust_vehicles: o.surface_rust,
      areas: o.areas.map(a => ({area: a.area, vehicles: a.vehicles})),
      locations: o.locations.map(p => ({place: p.name, inspections: p.inspections, with_a_flag: p.flagged, ...(p.cities.length ? {cities: p.cities.map(c => ({city: c.name, inspections: c.inspections}))} : {})})),
      most_common_issues: commonIssues(ws, {limit: 10}).map(t => ({item: t.item, vehicles: t.vehicles, failed_on: t.failures})),
      inspected_more_than_once: repeats}};
  }
  return {refs: [], sets: [], result: {error: `Unknown tool ${name}`}};
}
/** What the model sees of a result: the same, with rows trimmed for find_reports (the server keeps them all). */
export const forModel = (name, result) => name === "find_reports" && result.rows?.length > DETAIL_LIMIT
  ? {...result, rows: result.rows.slice(0, DETAIL_LIMIT), note: `Rows for the newest ${DETAIL_LIMIT} of ${result.count}; refs lists all ${result.count}.`} : result;
