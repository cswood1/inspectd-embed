/*
 * The job's vocabulary, in one place: inspection type and subtype, vehicle class, status, and the
 * provider payout. The console, the client portal and the seed all read these. See
 * docs/platform/decisions.md for why each is the way it is.
 */

/* ---- inspection type and subtype ---------------------------------- */

// [key, label, subtypes as [key, label]]; a type with no subtypes takes none
export const INSPECTION_TYPES = [
  ["consumer", "Consumer", [["pre-purchase", "Pre-purchase"], ["post-purchase", "Post-purchase"]]],
  ["condition", "Condition Report", [["fleet", "Fleet"], ["lease-return", "Lease return"], ["general", "General"]]],
  ["arbitration", "Arbitration", []],
];
const TYPE = Object.fromEntries(INSPECTION_TYPES.map(([k, label, subs]) => [k, {label, subs: Object.fromEntries(subs)}]));
export const typeLabel = t => TYPE[t]?.label || t || "";
export const subtypeLabel = (t, s) => TYPE[t]?.subs[s] || s || "";
export const subtypesOf = t => INSPECTION_TYPES.find(([k]) => k === t)?.[2] || [];
// the first subtype is what a type means when none is given
export const defaultSubtype = t => subtypesOf(t)[0]?.[0] || null;
/** "Consumer · Pre-purchase", or "Arbitration" */
export const inspectionLabel = f => [typeLabel(f.inspection_type), f.inspection_subtype ? subtypeLabel(f.inspection_type, f.inspection_subtype) : ""].filter(Boolean).join(" · ");
/** what the inspection is, in a phrase: the subtype when there is one ("Pre-purchase"), else the type */
export const inspectionShort = f => f.inspection_subtype ? subtypeLabel(f.inspection_type, f.inspection_subtype) : typeLabel(f.inspection_type);

const words = v => String(v ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const slug = v => words(v).replace(/ /g, "-");
// a subtype named on its own says which type it belongs to; the old type names map onto the new ones
const BY_SUBTYPE = Object.fromEntries(INSPECTION_TYPES.flatMap(([t, , subs]) => subs.map(([s]) => [s, [t, s]])));
const TYPE_ALIASES = {
  "condition-report": "condition", condition: "condition", consumer: "consumer", arbitration: "arbitration",
  ppi: ["consumer", "pre-purchase"], prepurchase: ["consumer", "pre-purchase"], postpurchase: ["consumer", "post-purchase"],
  // the old type list
  "lease-end": ["condition", "lease-return"], "lease-return": ["condition", "lease-return"], "auction-listing": ["condition", "general"], auction: ["condition", "general"],
  listing: ["condition", "general"], "auction-arbitration": ["arbitration", null], warranty: ["condition", "general"], other: ["condition", "general"],
  "de-fleet": ["condition", "fleet"], defleet: ["condition", "fleet"], "state-safety": ["condition", "general"], emissions: ["condition", "general"],
};
/*
 * The Consumer type is only for jobs whose end customer is a consumer: a consumer's own order, or a shopper ordering
 * through a marketplace's embed. A business (a dealer or a fleet) orders a Condition Report or an Arbitration.
 */
export const consumerTypeAllowed = orderedBy => orderedBy === "consumer" || orderedBy === "marketplace";
/** The inspection types a customer of this kind may order, as INSPECTION_TYPES rows. */
export const typesFor = orderedBy => consumerTypeAllowed(orderedBy) ? INSPECTION_TYPES : INSPECTION_TYPES.filter(([k]) => k !== "consumer");
/** What a blank type means for this kind of customer: Consumer for a consumer, Condition Report for a business. */
export const defaultTypeFor = orderedBy => consumerTypeAllowed(orderedBy) ? "consumer" : "condition";
export const CONSUMER_TYPE_RULE = "The Consumer type is for consumers; a business orders a Condition Report or an Arbitration";

/**
 * The canonical type and subtype for what a form or a spreadsheet row says, or null when it can't be read.
 * Takes a type ("consumer"), a subtype on its own ("pre-purchase"), or one of the old type names
 * ("lease-end", "auction-listing"), with an optional subtype beside it. Blank means what `defaultTypeFor` says for
 * the customer (Consumer, Pre-purchase for a consumer; Condition Report, General for a business).
 */
export function classifyInspection(type, subtype, orderedBy = "consumer"){
  const t = slug(type), s = slug(subtype);
  let out;
  if (!t) out = s ? BY_SUBTYPE[s] || null : (consumerTypeAllowed(orderedBy) ? ["consumer", "pre-purchase"] : ["condition", "general"]);
  else if (TYPE[t]) out = [t, null];
  else if (BY_SUBTYPE[t]) out = BY_SUBTYPE[t];
  else { const a = TYPE_ALIASES[t]; out = a ? (Array.isArray(a) ? a : [a, null]) : null; }
  if (!out) return null;
  let [kt, ks] = out;
  if (s && !(t && BY_SUBTYPE[t])) {   // a subtype given beside the type must belong to it
    if (!TYPE[kt].subs[s]) return null;
    ks = s;
  }
  if (!ks) ks = defaultSubtype(kt);
  return {inspection_type: kt, inspection_subtype: ks};
}

/* ---- who ordered it ------------------------------------------------- */

// Every job is ordered by one kind of customer, the type of the workspace it lands in. Consumers order one-off
// inspections that we run ourselves (the Inspectd Consumers workspace); the others are businesses.
export const ORDERED_BY = [["consumer", "Consumer"], ["dealer", "Dealer"], ["marketplace", "Marketplace"], ["fleet", "Fleet"]];
const ORDERED = Object.fromEntries(ORDERED_BY);
export const orderedByLabel = k => ORDERED[k] || k || "";
/** Who ordered a job: its own `ordered_by`, else its workspace's type; a job with neither is a consumer's. */
export const orderedByOf = r => r.ordered_by || r.org?.type || "consumer";
export const isConsumer = r => orderedByOf(r) === "consumer";

/* ---- vehicle class -------------------------------------------------- */

// a property of the vehicle, whoever orders the inspection: it sets the payout, and later which providers suit it
export const VEHICLE_CLASSES = [["standard", "Standard"], ["ev", "EV"], ["exotic", "Exotic"]];
const CLASS = Object.fromEntries(VEHICLE_CLASSES);
export const classLabel = c => CLASS[c] || c || "";
const CLASS_ALIASES = {electric: "ev", "e v": "ev", "high end": "exotic", highend: "exotic", luxury: "exotic", classic: "exotic", collector: "exotic",
                       std: "standard", normal: "standard", regular: "standard"};
/** The canonical class, "standard" when blank, or null when it can't be read. High-end and classic are Exotic. */
export function classifyClass(v){
  const w = words(v); if (!w) return "standard";
  return CLASS[w] ? w : CLASS_ALIASES[w] || CLASS_ALIASES[w.replace(/\./g, "")] || null;
}

/* ---- status ----------------------------------------------------------- */

// [key, label, pill hue, meaning]
export const STATUSES = [
  ["new", "New", "gray", "Received; providers can be found for it"],
  ["dispatching", "Dispatching", "amber", "The job link is live"],
  ["claimed", "Claimed", "blue", "A provider claimed it"],
  ["complete", "Complete", "green", "The provider's report is submitted"],
  ["canceled", "Canceled", "red", "Stopped"],
];
export const STATUS = Object.fromEntries(STATUSES.map(([k, label, hue]) => [k, [hue, label]]));
export const OPEN_STATUSES = ["new", "dispatching", "claimed"];
export const CLOSED_STATUSES = ["complete", "canceled"];
export const isClosed = r => CLOSED_STATUSES.includes(r.status);
// the button on a job's row: its next step
export const NEXT_STEP = {new: "Find providers", dispatching: "View", claimed: "View", complete: "View report", canceled: "Reset"};

/* ---- provider payout ---------------------------------------------------- */

// Made up for now; real pricing replaces this one function.
const PAYOUT_BY_TIER = {1: 10500, 2: 11500, 3: 13000, 4: 14500, 5: 16000};
const CLASS_ADD = {standard: 0, ev: 1000, exotic: 2500};
export const PAYOUT_CAP = 18500;
export const DEFAULT_TIER = 2;   // a ZIP with no known price tier
/** The provider's payout in cents for a job in a ZIP of this price tier, for this class of vehicle. */
export function payoutFor(tier, vehicleClass){
  const base = PAYOUT_BY_TIER[tier] ?? PAYOUT_BY_TIER[DEFAULT_TIER];
  return Math.min(base + (CLASS_ADD[vehicleClass] || 0), PAYOUT_CAP);
}
export const dollars = cents => "$" + Math.round((cents || 0) / 100).toLocaleString("en-US");

/* ---- what the report must cover ----------------------------------------- */

// What the provider's report covers for each type and subtype: the content, not how to inspect, and no photo
// minimums (providers' tools differ; Prism normalizes what they send). The vehicle's class adds its own items.
const REQUIREMENTS = {
  "consumer/pre-purchase": [
    "Exterior and interior condition, with photos of each area",
    "Engine bay and undercarriage: leaks, rust, damage",
    "Tires and brakes",
    "Diagnostic scan results, with any codes",
    "Road test, where the seller allows it",
  ],
  "consumer/post-purchase": [
    "Exterior and interior condition, with photos of each area",
    "Engine bay and undercarriage: leaks, rust, damage",
    "Tires and brakes",
    "Diagnostic scan results, with any codes",
    "Anything that should be raised with the seller, clearly flagged",
  ],
  "condition/fleet": [
    "VIN and odometer",
    "Exterior damage by panel, with photos",
    "Interior condition",
    "Tire condition",
    "Warning lights and diagnostic scan results",
  ],
  "condition/lease-return": [
    "VIN and odometer",
    "Exterior damage by panel, with photos, including glass and wheels",
    "Interior condition: stains, tears, odors",
    "Tire condition",
    "Keys and accessories present",
  ],
  "condition/general": [
    "VIN and odometer",
    "Exterior and interior condition, with photos",
    "Tire condition",
    "Warning lights and diagnostic scan results",
  ],
  "arbitration": [
    "VIN and odometer, with dated photos",
    "The disputed item, documented with close-ups and a written description",
    "Diagnostic scan results",
    "Signs of prior repair or damage",
    "No repairs or adjustments made during the inspection",
  ],
};
const CLASS_REQUIREMENTS = {
  ev: ["Battery health report", "Charge port condition", "Any high-voltage warnings"],
  exotic: ["Paint readings by panel", "Close-ups of wheels, carbon and trim"],
};
/** What the report must cover for this job: its type and subtype's list, then its vehicle class's additions. */
export function requirementsFor(f){
  const base = REQUIREMENTS[f.inspection_subtype ? `${f.inspection_type}/${f.inspection_subtype}` : f.inspection_type]
    || REQUIREMENTS[`${f.inspection_type}/${defaultSubtype(f.inspection_type)}`] || [];
  return [...base, ...(CLASS_REQUIREMENTS[f.vehicle_class] || [])];
}

/* ---- when the provider can inspect, and why they pass ----------------------- */

// A claim proposes a date and a part of the day; the inspector's call to the on-site contact confirms the time.
export const TIME_WINDOWS = [["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"]];
export const PROPOSE_DAYS = 30;   // how far ahead a claim may propose
/** "Thu Nov 12, morning" for {date: "2026-11-12", window: "morning"} */
export function plannedLabel(p){
  if (!p?.date) return "";
  const [y, m, d] = p.date.split("-").map(Number), day = new Date(y, m - 1, d);
  return `${day.toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric"}).replace(",", "")}${p.window ? `, ${p.window}` : ""}`;
}
export const DECLINE_REASONS = ["Not available in time", "Too far away", "Payout too low", "Not equipped for this vehicle or inspection", "Other"];
