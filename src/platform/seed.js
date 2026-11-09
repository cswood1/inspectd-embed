/*
 * Seed data for the Operations console and the client portal: request records in the exact
 * shape GET /api/requests hands Kavin's console (apps/requests/store.py _row, views.public,
 * router's org join). Every name, company, inspection business and domain here is invented;
 * phones are 555-01xx. ZIPs, their coordinates and their price tiers are real (tiers from
 * apps/pricing/zip_tiers.csv.gz), so a quote reads the way production would price it.
 *
 * Dates are offsets from the moment the seed is built, so the demo always looks current.
 * Ids and tokens come from a fixed-seed generator: a reset rebuilds the same records.
 */
import { DEALER } from "../dealer.js";
import { REPORT_INDEX } from "./reportIndex.js";
import { payoutFor, STATUS_LABELS } from "./jobModel.js";
import { newRef } from "./jobRef.js";
import { demoDay } from "./demoDay.js";
import { vehicleName } from "./vehicleName.js";
import { REPORT_ZIPS, REPORT_PEOPLE, MORE_REPORT_JOBS } from "./reportJobs.js";
import zipDb from "us-zips";

/* ---- deterministic ids ----------------------------------------- */

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, chars, n) => Array.from({length: n}, () => chars[Math.floor(r() * chars.length)]).join("");
const HEX = "0123456789abcdef", ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", URLSAFE = ALNUM + "-_";
export const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---- VINs: real manufacturer prefixes, computed check digit ----- */

const TRANSLIT = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9};
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const YEAR_CODE = {1989: "K", 2018: "J", 2019: "K", 2020: "L", 2021: "M", 2022: "N", 2023: "P", 2024: "R"};
function vin(prefix8, year, plant, serial){
  const body = prefix8 + "0" + YEAR_CODE[year] + plant + serial;
  const sum = [...body].reduce((s, c, i) => s + (/\d/.test(c) ? +c : TRANSLIT[c]) * WEIGHTS[i], 0);
  const check = sum % 11 === 10 ? "X" : String(sum % 11);
  return prefix8 + check + body.slice(9);
}

/* ---- places: real ZIPs, their centroids and price tiers ---------- */

export const ZIPS = {
  "75201": {city: "Dallas", state: "TX", lat: 32.788309, lon: -96.799572, tier: 1},
  "75024": {city: "Plano", state: "TX", lat: 33.077854, lon: -96.811028, tier: 2},
  "75034": {city: "Frisco", state: "TX", lat: 33.121286, lon: -96.838536, tier: 3},
  "75038": {city: "Irving", state: "TX", lat: 32.87226, lon: -96.97881, tier: 2},
  "30303": {city: "Atlanta", state: "GA", lat: 33.752845, lon: -84.390226, tier: 1},
  "30060": {city: "Marietta", state: "GA", lat: 33.920062, lon: -84.5431, tier: 2},
  "30009": {city: "Alpharetta", state: "GA", lat: 34.078136, lon: -84.303424, tier: 2},
  "30030": {city: "Decatur", state: "GA", lat: 33.772712, lon: -84.291005, tier: 1},
  "37203": {city: "Nashville", state: "TN", lat: 36.149775, lon: -86.789146, tier: 1},
  "37064": {city: "Franklin", state: "TN", lat: 35.884862, lon: -86.954138, tier: 4},
  "37027": {city: "Brentwood", state: "TN", lat: 35.999288, lon: -86.785062, tier: 3},
  "37129": {city: "Murfreesboro", state: "TN", lat: 35.929834, lon: -86.450822, tier: 3},
  "80202": {city: "Denver", state: "CO", lat: 39.751526, lon: -104.997673, tier: 1},
  "80011": {city: "Aurora", state: "CO", lat: 39.744033, lon: -104.790013, tier: 2},
  "80226": {city: "Lakewood", state: "CO", lat: 39.710131, lon: -105.092127, tier: 1},
  "80120": {city: "Littleton", state: "CO", lat: 39.593836, lon: -105.01146, tier: 2},
  // Salt Lake City, where ReBuilt Autos' shoppers buy. Centroids from us-zips; these tiers are estimates (tier 1 for the
  // city, tier 2 for the suburbs), not from zip_tiers.csv.gz, which the demo doesn't have for Utah.
  "84101": {city: "Salt Lake City", state: "UT", lat: 40.756311, lon: -111.899962, tier: 1},
  "84106": {city: "Salt Lake City", state: "UT", lat: 40.706768, lon: -111.855726, tier: 1},
  "84119": {city: "West Valley City", state: "UT", lat: 40.700258, lon: -111.946425, tier: 2},
  "84070": {city: "Sandy", state: "UT", lat: 40.577114, lon: -111.889106, tier: 2},
  "84047": {city: "Midvale", state: "UT", lat: 40.615317, lon: -111.891815, tier: 2},
  // where the ten real reports were inspected
  "35611": {city: "Athens", state: "AL", lat: 34.773833, lon: -87.084145, tier: 4},
  "94533": {city: "Fairfield", state: "CA", lat: 38.280745, lon: -122.00638, tier: 2},
  "78838": {city: "Concan", state: "TX", lat: 29.534647, lon: -99.706512, tier: 5},
  "95348": {city: "Merced", state: "CA", lat: 37.420522, lon: -120.499608, tier: 3},
  "48180": {city: "Taylor", state: "MI", lat: 42.225283, lon: -83.267691, tier: 2},
  "94709": {city: "Berkeley", state: "CA", lat: 37.878291, lon: -122.266252, tier: 1},
  "48009": {city: "Birmingham", state: "MI", lat: 42.544048, lon: -83.217653, tier: 1},
  "91746": {city: "La Puente", state: "CA", lat: 34.043304, lon: -117.986859, tier: 1},
  "10467": {city: "Bronx", state: "NY", lat: 40.875262, lon: -73.872027, tier: 1},
  "21157": {city: "Westminster", state: "MD", lat: 39.548569, lon: -76.983558, tier: 3},
  // where the AI demo's 89 further reports were inspected (reportJobs.js; their tiers are estimates)
  ...REPORT_ZIPS,
};
// apps/pricing/tiers.json
export const TIERS = {
  1: {label: "High density / urban", price_cents: 18900, take_bps: 1600},
  2: {label: "Standard", price_cents: 19900, take_bps: 1600},
  3: {label: "Moderate-cost metro", price_cents: 21900, take_bps: 1500},
  4: {label: "High-cost / metro spread", price_cents: 23900, take_bps: 1500},
  5: {label: "Rural / outlying", price_cents: 26900, take_bps: 1500},
};
const bps = (cents, b) => Math.round(cents * b / 10000);
export function quote(zip, partnerShareBps = 0){
  const t = TIERS[ZIPS[zip].tier], fee = bps(t.price_cents, t.take_bps);
  const share = partnerShareBps ? Math.min(bps(t.price_cents, partnerShareBps), fee) : 0;
  return {zip, tier: ZIPS[zip].tier, label: t.label, price_cents: t.price_cents, currency: "usd", take_bps: t.take_bps,
          platform_fee_cents: fee, provider_payout_cents: t.price_cents - fee, partner_share_bps: partnerShareBps, partner_share_cents: share};
}
/** The provider's payout for a job at this ZIP, by its price tier and the vehicle's class (jobModel.payoutFor). */
export const payoutAt = (zip, vehicleClass) => payoutFor(ZIPS[zip]?.tier, vehicleClass);
const miles = (a, b) => { const R = 3958.8, rad = d => d * Math.PI / 180, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

/* ---- providers: mobile inspectors and a few shops, seven per launch metro and five in Salt Lake City ---- */

// [base ZIP, name, street address ("" for mobile), phone, domain, hours, services, rating, coverage, notes]
const P = [
  ["75201", "Trinity Mobile Vehicle Inspections", "", "(214) 555-0112", "trinitymobileinspect.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.9 stars · 318 reviews", "Mobile, covers Dallas, Irving and Garland", "Fleet volume welcome; can do 6+ vehicles at one lot in a day."],
  ["75024", "Prairie Line Auto Inspect", "", "(972) 555-0118", "prairielineauto.com", "Mon-Fri 8am-6pm, Sat 9am-2pm", "Pre-purchase, lease end, photo condition reports", "4.8 stars · 204 reviews", "Mobile, covers Plano, Frisco and Allen", ""],
  ["75038", "Northgate Pre-Purchase Inspections", "4510 W Walnut Hill Ln, Irving, TX 75038", "(972) 555-0124", "northgateppi.com", "Mon-Sat 8am-6pm", "Pre-purchase, diagnostics, OBD scans", "4.7 stars · 156 reviews", "", "Also inspects on site at dealer and auction lots."],
  ["75034", "Frisco Mobile Mechanic & Inspection", "", "(469) 555-0127", "friscomobilemech.com", "Daily 7am-8pm", "Pre-purchase, mobile repair", "4.6 stars · 98 reviews", "Mobile, covers Frisco, McKinney and The Colony", "Weekend appointments most weeks."],
  ["75024", "Redbud Auto Diagnostics", "1401 Legacy Dr, Plano, TX 75024", "(972) 555-0133", "redbudautodiag.com", "Mon-Fri 7:30am-6pm", "Pre-purchase, EV battery health, diagnostics", "4.8 stars · 241 reviews", "", "EV certified (Tesla, Ford, Hyundai). Brings a battery health scanner."],
  ["75038", "Cedar Fork Inspection Co.", "", "(214) 555-0139", "cedarforkinspect.com", "Mon-Sat 8am-5pm", "Lease end, fleet de-fleet checks", "4.5 stars · 61 reviews", "Mobile, covers Irving, Grand Prairie and Arlington", ""],
  ["75201", "Elm Fork Mobile Inspections", "", "(214) 555-0142", "elmforkmobile.com", "Mon-Fri 8am-6pm", "Pre-purchase, high-line and exotic", "4.9 stars · 87 reviews", "Mobile, covers Dallas, Highland Park and Richardson", "High-line specialist; paint meter and lift-system checks on request."],

  ["30303", "Peachtree Mobile Inspections", "", "(404) 555-0151", "peachtreemobileinspect.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 stars · 276 reviews", "Mobile, covers Atlanta, Decatur and East Point", "Fleet volume welcome."],
  ["30060", "Chattahoochee Auto Check", "", "(770) 555-0154", "chattahoocheeautocheck.com", "Mon-Fri 8am-6pm", "Pre-purchase, lease end", "4.7 stars · 133 reviews", "Mobile, covers Marietta, Smyrna and Kennesaw", ""],
  ["30060", "Kennesaw Ridge Vehicle Inspect", "1250 Roswell Rd, Marietta, GA 30060", "(770) 555-0157", "kennesawridgeinspect.com", "Mon-Sat 8am-6pm", "Pre-purchase, diagnostics, emissions", "4.6 stars · 189 reviews", "", "Shop inspections same day; mobile within 15 miles."],
  ["30009", "Northpoint Mobile Inspection", "", "(678) 555-0160", "northpointmobile.com", "Daily 8am-7pm", "Pre-purchase, EV, high-line", "4.9 stars · 142 reviews", "Mobile, covers Alpharetta, Roswell and Johns Creek", "EV certified; battery health reports included."],
  ["30030", "Decatur Square Auto Diagnostics", "415 E College Ave, Decatur, GA 30030", "(404) 555-0165", "decatursquareauto.com", "Mon-Fri 7:30am-5:30pm", "Pre-purchase, diagnostics", "4.7 stars · 211 reviews", "", ""],
  ["30303", "Red Clay Inspection Services", "", "(404) 555-0168", "redclayinspect.com", "Mon-Sat 8am-5pm", "Lease end, fleet de-fleet checks, auction condition reports", "4.5 stars · 74 reviews", "Mobile, covers Atlanta, College Park and Hapeville", "Works auction lanes; can turn reports same day."],
  ["30009", "Signal Hill Vehicle Inspections", "", "(678) 555-0171", "signalhillinspect.com", "Mon-Fri 8am-6pm", "Pre-purchase, lease end", "4.6 stars · 52 reviews", "Mobile, covers Alpharetta, Cumming and Milton", ""],

  ["37203", "Music Row Mobile Inspections", "", "(615) 555-0102", "musicrowmobile.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 stars · 227 reviews", "Mobile, covers Nashville, Midtown and The Nations", "Fleet volume welcome."],
  ["37064", "Harpeth Valley Auto Inspect", "", "(615) 555-0106", "harpethvalleyauto.com", "Mon-Fri 8am-6pm", "Pre-purchase, high-line, classic", "4.9 stars · 118 reviews", "Mobile, covers Franklin, Leiper's Fork and Thompson's Station", "Classic and collector cars; paint meter and compression test on request."],
  ["37027", "Brentwood Precision Auto", "5100 Maryland Way, Brentwood, TN 37027", "(615) 555-0109", "brentwoodprecision.com", "Mon-Fri 7:30am-6pm", "Pre-purchase, diagnostics, high-line", "4.7 stars · 196 reviews", "", "European specialist."],
  ["37129", "Stones River Mobile Inspection", "", "(615) 555-0113", "stonesrivermobile.com", "Mon-Sat 8am-6pm", "Pre-purchase, rebuilt title checks", "4.6 stars · 89 reviews", "Mobile, covers Murfreesboro, Smyrna and La Vergne", "Rebuilt and salvage title inspections; documents prior repairs."],
  ["37203", "Cumberland Vehicle Assessment", "900 8th Ave S, Nashville, TN 37203", "(615) 555-0116", "cumberlandvehicle.com", "Mon-Fri 8am-5pm", "Pre-purchase, lease end, auction condition reports", "4.5 stars · 143 reviews", "", ""],
  ["37027", "Volunteer State Inspections", "", "(615) 555-0119", "volstateinspect.com", "Daily 8am-7pm", "Pre-purchase, lease end, EV", "4.7 stars · 101 reviews", "Mobile, covers Brentwood, Nolensville and Antioch", ""],
  ["37064", "Natchez Trace Mobile Inspect", "", "(629) 555-0122", "natchezmobile.com", "Mon-Sat 8am-6pm", "Lease end, fleet de-fleet checks", "4.4 stars · 47 reviews", "Mobile, covers Franklin, Spring Hill and Columbia", ""],

  ["80202", "Front Range Mobile Inspections", "", "(303) 555-0172", "frontrangemobile.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 stars · 302 reviews", "Mobile, covers Denver, Englewood and Commerce City", "Fleet volume welcome."],
  ["80226", "Bluebird Auto Inspect", "", "(720) 555-0175", "bluebirdautoinspect.com", "Mon-Fri 8am-6pm", "Pre-purchase, EV battery health", "4.7 stars · 128 reviews", "Mobile, covers Lakewood, Golden and Wheat Ridge", "EV certified (Tesla, Ford, Hyundai)."],
  ["80202", "Mile High Pre-Buy", "1550 Larimer St, Denver, CO 80202", "(303) 555-0178", "milehighprebuy.com", "Mon-Fri 8am-6pm", "Pre-purchase, high-line and exotic, arbitration reports", "4.9 stars · 164 reviews", "", "Exotic and high-line specialist; arbitration-grade documentation."],
  ["80011", "Cherry Creek Mobile Auto Check", "", "(720) 555-0181", "cherrycreekautocheck.com", "Daily 8am-7pm", "Pre-purchase, lease end", "4.6 stars · 93 reviews", "Mobile, covers Aurora, Centennial and Parker", ""],
  ["80120", "Littleton Motorworks Inspection", "5600 S Broadway, Littleton, CO 80120", "(303) 555-0184", "littletonmotorworks.com", "Mon-Fri 7:30am-5:30pm", "Pre-purchase, diagnostics", "4.7 stars · 177 reviews", "", ""],
  ["80120", "Columbine Vehicle Inspection", "", "(720) 555-0187", "columbineinspect.com", "Mon-Sat 8am-5pm", "Lease end, auction condition reports", "4.5 stars · 66 reviews", "Mobile, covers Littleton, Highlands Ranch and Ken Caryl", ""],
  ["80226", "Highline Canal Auto Inspect", "", "(303) 555-0190", "highlinecanalauto.com", "Mon-Fri 8am-6pm", "Pre-purchase, fleet de-fleet checks", "4.6 stars · 58 reviews", "Mobile, covers Lakewood, Denver and Littleton", ""],

  ["84101", "Wasatch Mobile Inspections", "", "(801) 555-0114", "wasatchmobileinspect.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 stars · 211 reviews", "Mobile, covers Salt Lake City, South Salt Lake and North Salt Lake", ""],
  ["84106", "Sugar House Auto Diagnostics", "2150 S Highland Dr, Salt Lake City, UT 84106", "(801) 555-0126", "sugarhouseautodiag.com", "Mon-Fri 7:30am-6pm", "Pre-purchase, diagnostics, EV battery health", "4.7 stars · 164 reviews", "", "EV certified (Tesla, Ford, Hyundai)."],
  ["84119", "Jordan River Rebuilt Title Inspections", "", "(385) 555-0135", "jordanriverinspect.com", "Mon-Sat 8am-6pm", "Pre-purchase, rebuilt and salvage title checks", "4.8 stars · 97 reviews", "Mobile, covers West Valley City, Taylorsville and Kearns", "Rebuilt-title specialist; documents prior collision repairs panel by panel."],
  ["84070", "Lone Peak Vehicle Inspect", "", "(801) 555-0144", "lonepeakinspect.com", "Daily 8am-7pm", "Pre-purchase, lease end", "4.6 stars · 72 reviews", "Mobile, covers Sandy, Draper and South Jordan", ""],
  ["84047", "Midvale Motor Check", "7240 S State St, Midvale, UT 84047", "(801) 555-0153", "midvalemotorcheck.com", "Mon-Fri 8am-5:30pm", "Pre-purchase, diagnostics, rebuilt title checks", "4.5 stars · 118 reviews", "", "Lift inspections on site; frame measurements on request."],
];
export const PROVIDERS = P.map(([zip, name, address, phone, domain, hours, services, rating, coverage, notes]) => ({
  zip, name, address, phone, website: `https://www.${domain}`, email: `${address ? "service" : "bookings"}@${domain}`, hours, services, rating,
  distance: coverage, notes, mobile: !address, sources: [`https://www.${domain}`, `https://www.${domain}/${address ? "inspections" : "service-area"}`],
}));

/* ---- where a job is, for any ZIP ------------------------------------ */

// The metros the seed has providers in, each by its center ZIP. Every provider belongs to the metro in its state.
const METROS = ["75201", "30303", "37203", "80202", "84101"].map(zip => ({zip, ...ZIPS[zip]}));
const METRO_OF_STATE = Object.fromEntries(METROS.map(m => [m.state, m.city]));
// each metro's center (its downtown ZIP), for the Inspectd AI overview's "By location" (within 60 miles of one)
export const METRO_CENTERS = METROS.map(m => ({name: m.city, state: m.state, lat: m.lat, lon: m.lon}));
// the Providers tab's blocks: the four launch metros, Salt Lake City, then the national network
export const PROVIDER_METROS = ["Denver", "Dallas", "Atlanta", "Nashville", "Salt Lake City", "National"];
const PROVIDER_ZIP = new Map(PROVIDERS.map(p => [p.website.toLowerCase(), p.zip]));
/** Which block a provider the searches found sits in: its seed metro, "National" for Lemon Squad, else "Other". */
export function providerMetro(shop){
  if ((shop.name || "").trim().toLowerCase() === LEMON_SQUAD.name.toLowerCase()) return "National";
  const zip = PROVIDER_ZIP.get(String(shop.website || "").toLowerCase()) || PROVIDERS.find(p => p.name === shop.name)?.zip;
  return (zip && METRO_OF_STATE[ZIPS[zip].state]) || "Other";
}
// approximate geographic center of each state, for a ZIP that us-zips doesn't know
const STATE_CENTERS = {AL: [32.8, -86.8], AK: [61.4, -152.3], AZ: [34.2, -111.7], AR: [34.9, -92.4], CA: [37.2, -119.5], CO: [39.0, -105.5], CT: [41.6, -72.7],
  DE: [39.0, -75.5], DC: [38.9, -77.0], FL: [28.6, -82.4], GA: [32.7, -83.4], HI: [20.8, -156.3], ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3],
  IA: [42.1, -93.5], KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.1, -92.0], ME: [45.4, -69.2], MD: [39.0, -76.8], MA: [42.3, -71.8], MI: [44.3, -85.4],
  MN: [46.3, -94.3], MS: [32.7, -89.7], MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6], NH: [43.7, -71.6], NJ: [40.2, -74.7],
  NM: [34.4, -106.1], NY: [42.9, -75.5], NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8], OK: [35.6, -97.5], OR: [43.9, -120.6], PA: [40.9, -77.8],
  RI: [41.7, -71.5], SC: [33.9, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7], VT: [44.1, -72.7], VA: [37.5, -78.9],
  WA: [47.4, -120.5], WV: [38.6, -80.6], WI: [44.6, -89.9], WY: [43.0, -107.6]};
/** Where a job is: the seed's own ZIP, else us-zips' centroid, else the state's center, else Dallas as a last resort. */
export function placeOf(zip, state){
  const z = String(zip || "").slice(0, 5);
  if (ZIPS[z]) return {lat: ZIPS[z].lat, lon: ZIPS[z].lon, from: "seed"};
  const rec = zipDb[z];
  if (rec) return {lat: rec.latitude, lon: rec.longitude, from: "zip"};
  const c = STATE_CENTERS[String(state || "").trim().toUpperCase()];
  if (c) return {lat: c[0], lon: c[1], from: "state"};
  return {lat: METROS[0].lat, lon: METROS[0].lon, from: "default"};
}

/**
 * What a provider search finds for a job: the nearest providers in Kavin's shop shape, located shops by measured
 * distance first and mobile inspectors after them (research/geo.py locate). A job in one of the seed's ZIPs in a
 * metro's state searches that metro's providers; anywhere else falls back to the providers of the nearest seeded
 * metro, so the search always finishes with someone. `attempt` varies a rerun.
 */
/**
 * A job's provider search: the nearest seed providers in its metro, plus every provider Inspectd staff added by hand
 * for that metro (or for "National", which every search includes). `added` is the store's manual provider records.
 * A hand-added provider has no address, so it is listed as mobile, covering its metro, like any other mobile result.
 */
export function lookupFor(row, attempt = 0, added = []){
  const f = row.form, origin = placeOf(f.zip, f.state), seeded = ZIPS[String(f.zip || "").slice(0, 5)];
  const local = seeded && METRO_OF_STATE[seeded.state] ? seeded.state : null;
  const metro = local ? null : METROS.map(m => ({...m, d: miles(origin, m)})).sort((a, b) => a.d - b.d)[0];
  const pool = PROVIDERS.filter(p => ZIPS[p.zip].state === (local || metro.state));
  const n = 4 + hashStr(row.id + ":" + attempt) % 4;   // 4 to 7
  const near = pool.map(p => ({p, d: miles(origin, ZIPS[p.zip])})).sort((a, b) => a.d - b.d).slice(0, n);
  const shops = near.map(({p, d}) => {
    const {zip, ...shop} = p;
    const at = ZIPS[zip], m = shop.address ? Math.round(Math.max(d, 0.6 + (hashStr(shop.name) % 30) / 10) * 10) / 10 : null;
    return {...shop, lat: shop.address ? at.lat : null, lon: shop.address ? at.lon : null, miles: m, distance: m === null ? shop.distance : `${m} mi`};
  }).sort((a, b) => (a.miles === null) - (b.miles === null) || (a.miles ?? 0) - (b.miles ?? 0));
  const metroName = local ? METRO_OF_STATE[local] : metro.city;
  for (const p of added) if (p.source === "manual" && (p.metro === metroName || p.metro === "National"))
    shops.push({name: p.name, address: "", phone: p.phone || "", website: p.website || "", email: "", hours: "", services: "", rating: "",
                distance: p.metro === "National" ? "Mobile, nationwide" : `Mobile, covers the ${p.metro} area`, notes: "", mobile: true, sources: [], lat: null, lon: null, miles: null});
  const mobile = shops.filter(s => s.mobile).length;
  const here = [f.city, (f.state || "").toUpperCase()].filter(Boolean).join(", ") || `ZIP ${f.zip}`;
  const how = mobile === shops.length ? "All of them are mobile and come to the vehicle." : `${mobile} ${mobile === 1 ? "is" : "are"} mobile and ${mobile === 1 ? "comes" : "come"} to the vehicle; ${shops.length - mobile} ${shops.length - mobile === 1 ? "works" : "work"} from a shop and will also travel.`;
  return {
    shops,
    summary: metro && origin.from === "default"
      ? `We couldn't place ${here} on the map, so these are ${shops.length} inspectors in the ${metro.city} area. ${how}`
      : metro
      ? `No inspectors on file near ${here} yet. The nearest are ${shops.length} in the ${metro.city} area, about ${Math.round(metro.d).toLocaleString()} miles away. ${how}`
      : `${shops.length} inspectors cover ${here}. ${how.replace("from a shop and", "from a shop nearby and")}`,
    origin: [origin.lat, origin.lon],
    ...(metro ? {fallback: {metro: metro.city, state: metro.state, miles: Math.round(metro.d), located_by: origin.from}} : {}),
  };
}

/* ---- people ------------------------------------------------------- */

export const SEED_VERSION = 14;   // bump when the seed changes shape: a stored older seed is replaced
export const PORTAL = "https://portal.inspectd.com";
// The links the demo hands out (an inspector's job link) are built on the page's own origin, so a copied link opens
// inside the demo, on localhost, a preview or staging alike. Invitation links stay on PORTAL: the demo has no invite page.
export const linkOrigin = () => (typeof window !== "undefined" && window.location?.origin) || PORTAL;
export const inspectLink = token => `${linkOrigin()}/inspect/${token}`;
export const PROVIDER_TERMS_VERSION = "1";   // booking.provider_terms(): what a claim records
// a customer email's subject: the job's status, the vehicle and the job's reference (docs/platform/decisions.md)
// `status` is the stored key; the subject uses the customer's word for it (jobModel STATUS_LABELS.customer)
export const mailSubject = (status, vehicle, ref) => `${STATUS_LABELS.customer[status] || status}: ${vehicle}${ref ? ` · ${ref}` : ""}`;
export const CAM = {name: "Cam Wood", email: "cam@inspectd.com"};

// [key, name, email domain, who orders (jobModel ORDERED_BY), headquarters]: the client portal's workspaces, one per
// kind of customer. Inspectd Consumers holds every consumer inspection, which we run ourselves; the others are businesses.
const ORGS = [
  ["inspectd", "Inspectd Consumers", "inspectd.com", "consumer", ""],
  ["meridian", "Meridian Fleet Services", "meridianfleet.com", "fleet", "Dallas, TX"],
  ["crestview", "Crestview Denver", DEALER.url, "dealer", `${DEALER.city}, ${DEALER.state}`],   // one store of the Crestview Auto Group
  ["rebuilt", "ReBuilt Autos", "rebuiltautos.example", "marketplace", "Salt Lake City, UT"],
];
// the people at a business who file its requests
const USERS = {
  dana: ["meridian", "Dana Whitfield", "dana.whitfield", "(214) 555-0131"],
  luis: ["meridian", "Luis Ortega", "luis.ortega", "(404) 555-0147"],
  tasha: ["meridian", "Tasha Morel", "tasha.morel", "(972) 555-0161"],
  tom: ["crestview", "Tom Becker", "tbecker", "(303) 555-0149"],
};
// people who order for themselves: consumers who paid on the public form, and shoppers who ordered through
// ReBuilt Autos' embed on one of its listings (their jobs carry `partner`)
const PEOPLE = {
  marcus: ["Marcus Hale", "marcus.hale@pinemail.net", "(214) 555-0185"],
  elena: ["Elena Ruiz", "elena.ruiz@pinemail.net", "(404) 555-0188"],
  kevin: ["Kevin Doyle", "kdoyle@pinemail.net", "(615) 555-0191"],
  aisha: ["Aisha Grant", "aisha.grant@pinemail.net", "(720) 555-0193"],
  brian: ["Brian Cho", "brian.cho@pinemail.net", "(770) 555-0195"],
  jasmine: ["Jasmine Patel", "jasmine.patel@pinemail.net", "(615) 555-0197"],
  nicole: ["Nicole Pham", "nicole.pham@pinemail.net", "(404) 555-0189"],
  derek: ["Derek Lawson", "derek.lawson@pinemail.net", "(678) 555-0192"],
  tyler: ["Tyler Brooks", "tyler.brooks@pinemail.net", "(469) 555-0186"],
  hannah: ["Hannah Reyes", "hannah.reyes@pinemail.net", "(303) 555-0194"],
  logan: ["Logan Pratt", "logan.pratt@pinemail.net", "(801) 555-0171"],
  brooke: ["Brooke Christensen", "brooke.christensen@pinemail.net", "(385) 555-0177"],
  jared: ["Jared Nielsen", "jared.nielsen@pinemail.net", "(801) 555-0182"],
  // the consumers and shoppers behind the AI demo's further reports (reportJobs.js)
  ...REPORT_PEOPLE,
};
// the marketplace partner whose embed its shoppers order through (its public profile, apps/partners/registry PUBLIC).
// `org` is the workspace its orders land in.
export const PARTNERS = {
  "rebuilt-autos": {key: "rebuilt-autos", name: "ReBuilt Autos", short: "ReBuilt", brand: "co-brand", logo: "", accent: "#0f766e",
                    lock: ["year", "make", "model", "vin"], reimbursement: "", listing_note: "Rebuilt-title marketplace. The listing carries the car's damage history.",
                    share_bps: 500, org: "rebuilt", listings: "https://listings.rebuiltautos.example"},
};

/* ---- the jobs ------------------------------------------------------ */

// Lemon Squad: the inspection network whose reports these are, booked on every job that has one. Its website
// only: no phone, email or address of theirs is invented here.
export const LEMON_SQUAD = {name: "Lemon Squad", address: "", phone: "", website: "https://www.lemonsquad.com", email: "", hours: "",
  services: "Pre-purchase, lease return, condition reports", rating: "", distance: "Mobile, nationwide network",
  notes: "Inspector dispatched to the vehicle; the report comes back through the job link.", mobile: true, sources: ["https://www.lemonsquad.com"]};

// [report id (tools/report-conversion/manifest.json), who, street, [type, subtype], class, created days ago, inspected days ago, form notes]
// Each job takes its report's car, VIN and city, so the job and its report always agree. A business never orders
// the Consumer type (jobModel.consumerTypeAllowed). Fleets are national, so
// Meridian's are wherever its cars are; Crestview buys out of state.
const CR = t => ["condition", t], CONSUMER = t => ["consumer", t], ARB = ["arbitration", null];
export const REPORT_JOBS = [
  ["20261021-161204-3c9e1a", "dana", "1220 Hwy 72 E", CR("lease-return"), "standard", 18, 15, "Lease return from our north Alabama pool."],
  ["20261027-142810-8b20d4", "luis", "2950 FM 1050", CR("fleet"), "standard", 12, 9, ""],
  ["20261023-174533-e15f07", "tasha", "23000 Eureka Rd", CR("fleet"), "standard", 16, 13, "De-fleet from the Detroit pool. The driver reported a rattle from the rear on rough roads."],
  ["20261028-120952-5a7c31", "luis", "3500 Jerome Ave", CR("general"), "standard", 10, 8, "High-mileage unit; deciding whether it goes to retail or auction."],
  ["20261017-153340-c4d812", "dana", "140 Englar Rd", CR("lease-return"), "standard", 21, 19, ""],
  ["20261024-131125-0f6be9", "tasha", "1250 S Old Woodward Ave", CR("lease-return"), "exotic", 14, 12, "Lease return headed to the online auction. Listing photos needed."],
  ["20261025-160218-92ad4e", "tom", "1700 Shattuck Ave", CR("general"), "exotic", 13, 11, "Out-of-state buy. We need the full condition report before we bid."],
  ["20261014-145907-d73b05", "tom", "2300 Cordelia Rd", ARB, "standard", 24, 22, "Arbitration claim: front bumper and grille damage not disclosed at sale."],
  ["20261022-171446-6e48c0", "dana", "15000 Valley Blvd", CR("general"), "exotic", 17, 14, "Executive car coming off assignment. Please look hard at leaks and the interior before we remarket it."],
  ["20261029-130637-a91f2c", "luis", "3300 G St", CR("general"), "exotic", 9, 7, "Executive car off assignment. The driver says it was garage kept; please confirm before it goes to auction."],
  // the AI demo's further 89 (reportJobs.js): the same shape, plus extras (a ReBuilt shopper's partner and listing)
  ...MORE_REPORT_JOBS,
];
function reportJob([id, who, street, type, cls, created, inspected, notes, extras = {}]){
  const rep = REPORT_INDEX[id], v = rep.vehicle, zip = rep.inspection.location.match(/(\d{5})\s*$/)[1];
  return [who, zip, street, [+v.year, v.make, v.model, null, null], type, cls, "complete", "done", created, {report: id, vin: v.vin, inspected, notes, ...extras}];
}

// [who, zip, street, [year, make, model, vin prefix, plant], [type, subtype], vehicle class, status, providers search, days ago, extras]
// who: a business user (USERS) or a person ordering for themselves (PEOPLE). search: null (not started), "done" or "failed".
// extras: form notes, internal notes, batch, link ("offered" or "rejected"; every Dispatching job has a live one), contacted,
// partner and listing (an order through a partner's embed)...
const PRE = CONSUMER("pre-purchase"), POST = CONSUMER("post-purchase"), FLEET = CR("fleet"), LEASE = CR("lease-return"), GENERAL = CR("general");
const REBUILT = "rebuilt-autos";
const J = [
  // new: not searched yet
  ["dana", "75038", "3200 W Airport Fwy", [2024, "Toyota", "Camry", "4T1C11AK", "U"], FLEET, "standard", "new", null, 0.12, {notes: "De-fleet batch. Row C at our Irving lot; keys at the front desk."}],
  ["tasha", "30009", "11720 Amber Park Dr", [2023, "Nissan", "Rogue", "5N1BT3BB", "C"], LEASE, "standard", "new", null, 0.38, {}],
  ["aisha", "80226", "1420 S Teller St", [2022, "Tesla", "Model Y", "7SAYGDEE", "F"], PRE, "ev", "new", null, 0.66, {notes: "Private sale. I'd like a battery health number before I pay."}],
  // new: providers found (or the search failed), no link out yet
  ["dana", "75024", "6100 W Plano Pkwy", [2023, "Chevrolet", "Malibu", "1G1ZD5ST", "F"], FLEET, "standard", "new", "done", 2.6, {batch: "m-dfw", contacted: [0], inotes: "Called Prairie Line, they can do Thursday morning. Waiting on Dana to confirm lot access."}],
  ["luis", "37203", "1 Music Sq W", [2022, "Jeep", "Grand Cherokee", "1C4RJHBG", "8"], FLEET, "standard", "new", "failed", 1.8, {}],
  ["nicole", "30030", "250 E Ponce de Leon Ave", [2022, "Honda", "CR-V", "7FARW2H5", "E"], PRE, "standard", "new", "done", 3.0, {contacted: [0], inotes: "Left voicemail with two. Decatur Square said they can do it this week."}],
  ["marcus", "75201", "2525 McKinnon St", [2019, "Lexus", "RX 350", "2T2BZMCA", "C"], POST, "standard", "new", "done", 2.2, {notes: "Bought it last week. I want to know what I'm dealing with before the return window closes."}],
  ["marcus", "75034", "4800 Main St", [2020, "Honda", "Accord", "1HGCV1F3", "A"], PRE, "standard", "new", "done", 1.9, {held: true, name: "Marc Hale", notes: "Second car I'm looking at. Seller is free after 5pm."}],
  ["logan", "84106", "2280 S 1300 E", [2019, "Toyota", "Tacoma", "3TMCZ5AN", "M"], PRE, "standard", "new", "done", 0.8, {partner: REBUILT, notes: "Rebuilt title. I'd like to know the frame is straight before I put money down.",
    listing: {id: "RB-51877", mileage: 68420, lot: ["Sugar House Motors", "Kent Ashby", "(801) 555-0108"], damage: [{date: "2023-09-02", type: "collision", areas: ["rear", "left_rear"], severity: "moderate", airbags_deployed: false, odometer_at_damage: 54210, notes: "Bed and rear bumper replaced; state rebuilt inspection passed."}]}}],
  // dispatching: the job link is live
  ["luis", "30303", "180 Peachtree St NW", [2023, "Ford", "Explorer", "1FMSK8DH", "G"], LEASE, "standard", "dispatching", "done", 1.5, {}],
  ["dana", "80202", "1701 Wynkoop St", [2023, "Chevrolet", "Tahoe", "1GNSKNKD", "R"], FLEET, "standard", "dispatching", "done", 2.3, {contacted: [0, 1]}],
  ["dana", "75034", "8800 Gaylord Pkwy", [2024, "Kia", "Forte", "3KPF24AD", "E"], FLEET, "standard", "dispatching", "done", 2.6, {batch: "m-dfw"}],
  ["hannah", "80202", "1600 Wewatta St", [2021, "Subaru", "Crosstrek", "JF2GTHMC", "8"], PRE, "standard", "dispatching", "done", 1.2, {notes: "Buying from a coworker. The car is in the garage under our office."}],
  // a provider declined; the link stays live for the others, so the job stays Dispatching
  ["tasha", "75038", "5215 N O'Connor Blvd", [2023, "Hyundai", "Elantra", "KMHLM4AG", "U"], FLEET, "standard", "dispatching", "done", 3.4, {link: "rejected", contacted: [0]}],
  ["tasha", "37027", "330 Franklin Rd", [2022, "BMW", "X5", "5UXCR6C0", "9"], LEASE, "exotic", "dispatching", "done", 2.0, {notes: "Lease return. The driver reports a curb-rashed wheel; please photograph all four."}],
  ["tom", "80011", DEALER.address, [2021, "Ford", "F-150", "1FTFW1E5", "F"], GENERAL, "standard", "dispatching", "done", 1.6, {inotes: "Crestview wants it before Saturday's sale."}],
  ["tom", "80120", "8501 W Bowles Ave", [2022, "Lamborghini", "Huracan EVO", "ZHWUF5ZF", "L"], ARB, "exotic", "dispatching", "done", 0.9, {notes: "Arbitration claim: buyer reports a front lift system fault not disclosed at sale. Need a documented check before the arbitration deadline."}],
  ["elena", "30030", "128 Sycamore St", [2021, "Subaru", "Outback", "4S4BTACC", "3"], POST, "standard", "dispatching", "done", 4.4, {contacted: [0], notes: "Bought from a private seller. The check engine light came on two days later."}],
  ["jasmine", "37129", "1950 Old Fort Pkwy", [2020, "Honda", "Civic", "2HGFC2F6", "H"], PRE, "standard", "dispatching", "done", 1.3, {notes: "The front bumper looks recently repainted. I'd like to know why before I buy."}],
  ["brooke", "84070", "10450 S State St", [2018, "Ford", "Escape", "1FMCU9GD", "U"], PRE, "standard", "dispatching", "done", 1.4, {partner: REBUILT, notes: "Want to know the repair quality on the front end before I buy.",
    listing: {id: "RB-48213", mileage: 41210, lot: ["Jordan Valley Auto Sales", "Dale Prewitt", "(801) 555-0104"], damage: [{date: "2024-03-14", type: "collision", areas: ["front_end", "right_front"], severity: "moderate", airbags_deployed: false, odometer_at_damage: 31870, notes: "Repaired at a certified body shop; state rebuilt inspection passed."}]}}],
  // claimed: booked, the job link claimed
  ["luis", "37129", "2635 Medical Center Pkwy", [2023, "Chevrolet", "Equinox", "3GNAXKEG", "S"], FLEET, "standard", "claimed", "done", 5.8, {inotes: "Booked. Lot attendant knows to expect them."}],
  ["dana", "80226", "14500 W Colfax Ave", [2023, "Ford", "Mustang Mach-E", "3FMTK3SU", "M"], LEASE, "ev", "claimed", "done", 6.4, {notes: "Lease end. Check the charge port door and the glass roof for chips."}],
  ["tasha", "75024", "5800 Tennyson Pkwy", [2023, "Chrysler", "Pacifica", "2C4RC1BG", "R"], FLEET, "standard", "claimed", "done", 6.9, {}],
  ["tom", "80202", "1225 17th St", [2023, "Hyundai", "Ioniq 5", "KM8KN4AE", "U"], GENERAL, "ev", "claimed", "done", 4.8, {}],
  ["kevin", "37027", "9040 Carothers Pkwy", [1989, "Porsche", "911 Carrera", "WP0AB091", "S"], PRE, "exotic", "claimed", "done", 5.1, {notes: "Seller claims original paint. A paint meter reading on every panel and a compression test, please."}],
  ["derek", "30009", "3000 Old Alabama Rd", [2022, "Jeep", "Wrangler", "1C4HJXEG", "W"], PRE, "standard", "claimed", "done", 8.2, {}],
  ["jared", "84119", "3500 S Redwood Rd", [2020, "Hyundai", "Tucson", "KM8J3CA4", "U"], PRE, "standard", "claimed", "done", 3.6, {partner: REBUILT,
    listing: {id: "RB-50392", mileage: 52630, lot: ["Redwood Road Auto", "Tanya Sorensen", "(385) 555-0111"], damage: [{date: "2022-11-20", type: "hail", areas: ["roof", "hood"], severity: "minor", airbags_deployed: false, odometer_at_damage: 39880, notes: "Paintless dent repair on the roof and hood."}]}}],
  // complete: one job per real report, the car and the place as the report has them (REPORT_JOBS)
  ...REPORT_JOBS.map(reportJob),
  // canceled
  ["brian", "30060", "560 Powder Springs St", [2018, "Mazda", "CX-5", "JM3KFBCM", "0"], PRE, "standard", "canceled", "done", 9, {refund: true, reason: "Customer bought a different vehicle"}],
  ["tyler", "75201", "3100 McKinney Ave", [2021, "Mazda", "CX-30", "3MVDMBBM", "M"], PRE, "standard", "canceled", "done", 6.5, {refund: true, reason: "The seller sold it to someone else first"}],
  ["luis", "30303", "55 Trinity Ave SW", [2022, "Nissan", "Altima", "1N4BL4DV", "N"], LEASE, "standard", "canceled", "done", 5.2, {link: "offered", reason: "The lessee bought the car out at lease end"}],
  ["tom", "80226", "7400 W Colfax Ave", [2023, "Toyota", "RAV4", "2T3P1RFV", "W"], GENERAL, "standard", "canceled", "done", 4.1, {reason: "The deal fell through; the car went to another buyer"}],
];

const INSPECTORS = ["Ray Delgado", "Megan Shore", "Victor Nunez", "Paige Holloway", "Sam Okafor", "Erin Castillo", "Grant Weller"];
// the providers who passed on a Dispatching job's link: [job model, [reason, name from the call sheet's shop n, or null]]
const DECLINES = {
  "Elantra": [["Booked solid through next week, sorry.", 0]],
  "Huracan EVO": [["Not equipped for lift-system checks on exotics.", 1], ["Out of town until the 20th.", null]],
  "Tahoe": [["Can't get to downtown Denver before Friday.", 2]],
  "Escape": [["Sandy is outside my area this week.", 1]],
};
const shopCard = s => s ? Object.fromEntries(["name", "phone", "email", "address", "website", "hours"].map(k => [k, s[k] || ""])) : null;
const when = ms => { const d = new Date(ms), o = k => d.toLocaleString("en-US", k); return `${o({weekday: "short"})} ${o({month: "short"})} ${d.getDate()}, ${o({hour: "numeric", minute: "2-digit"})}`; };

/** The whole seed: the request list, and the workspaces and people behind it. */
export function buildSeed(now = Date.now()){
  const r = rng(20261104), id12 = () => pick(r, HEX, 12), DAY = 864e5, HOUR = 36e5;
  // the jobs' references come from a random stream of their own, so the rest of the seed (VINs, times) is unchanged
  const refRand = rng(20261108), refs = new Set();
  const iso = ms => new Date(Math.min(ms, now)).toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const orgs = Object.fromEntries(ORGS.map(([k, name, , type]) => [k, {id: id12(), name, type}]));
  const users = Object.fromEntries(Object.entries(USERS).map(([k, [org, name, local, phone]]) => [k, {id: id12(), org, name, phone, email: `${local}@${ORGS.find(o => o[0] === org)[2]}`}]));
  const cam = {...CAM, id: id12()};
  const batches = {};

  const rows = J.map(([who, zip, street, [year, make, model, prefix, plant], [type, subtype], vehicle_class, status, search, days, x], n) => {
    // a business user files for its workspace; a consumer is in Inspectd Consumers; a partner's shopper is in the partner's
    const u = users[who], w = PEOPLE[who], place = ZIPS[zip], p = x.partner ? PARTNERS[x.partner] : null;
    const org = orgs[u ? u.org : p ? p.org : "inspectd"];
    const created = batches[x.batch] ?? (now - days * DAY - (n % 5) * 7 * 60e3);
    if (x.batch) batches[x.batch] = created;
    const row = {
      id: id12(), ref: newRef(refs, refRand), created_at: iso(created), updated_at: iso(created), status, search: null, notes: x.inotes || "", payout_cents: payoutAt(zip, vehicle_class), ordered_by: org.type,
      form: {name: u ? u.name : (x.name || w[0]), email: u ? u.email : w[1], phone: u ? u.phone : w[2], year: String(year), make, model,
             vin: x.vin || vin(prefix, year, plant, String(100000 + Math.floor(r() * 899999))), vehicle_class, inspection_type: type, inspection_subtype: subtype,
             address: street, city: place.city, state: place.state, zip, notes: x.notes || "", customer_ref: ""},
      // a business files from the client portal, one car or a list; a consumer pays on the public form, a shopper in the partner's embed
      result: null, meta: {emails: [], history: [{stage: "new", at: iso(created)}], source: u ? (x.batch ? "portal-bulk" : "portal") : p ? "embed" : "public"},
      org_id: org.id, user_id: u ? u.id : null, org: {...org},
      partner: null,
    };
    const m = row.meta, veh = vehicleName({year, make, model, trim: x.report ? REPORT_INDEX[x.report].vehicle.trim : ""});
    let t = created;
    const step = (hours, stage) => { t += hours * HOUR; if (stage) m.history.push({stage, at: iso(t)}); row.updated_at = iso(t); return iso(t); };
    const mail = (to, subject, at, extra = {}) => m.emails.push({to, subject, at, sent: !x.held || to !== row.form.email, ...(x.held && to === row.form.email ? {error: `held: ${to} not on MAIL_ALLOWLIST`} : {id: [8, 4, 4, 4, 12].map(k => pick(r, HEX, k)).join("-")}), ...extra});

    // how it came in: a business sends a list and is told once; a consumer or a shopper pays at checkout
    if (u) mail(u.email, mailSubject("new", veh, row.ref), row.created_at);
    else {
      m.order = {...quote(zip, p ? p.share_bps : 0), checkout_id: pick(r, HEX, 16), session_id: "cs_test_" + pick(r, ALNUM, 58), payment_intent: "pi_" + pick(r, ALNUM, 24),
                 amount_cents: quote(zip).price_cents, livemode: false, paid_at: row.created_at};
      mail(row.form.email, mailSubject("new", veh, row.ref), row.created_at);
      if (p) {
        // the listing the shopper ordered from: what the embed handed over about the car
        const {share_bps, org: _org, listings, ...pub} = p, l = x.listing, d = l.damage[0];
        const what = `${d.type[0].toUpperCase()}${d.type.slice(1)}${d.areas.includes("front_end") ? ", front end" : d.areas.includes("rear") ? ", rear" : ""}, repaired`;
        row.partner = pub; m.partner = p.key;
        m.partner_ref = {role: "shopper", listing: l.id, title: "rebuilt", damage: what, from_listing: "year,make,model,vin"};
        m.revroom = {vin: row.form.vin, listing_id: l.id, listing_url: `${listings}/${l.id}`, seller: "dealership", role: "shopper",
                     title_status: "rebuilt", mileage: l.mileage, authorization: "listing",
                     location: {name: l.lot[0], contact_name: l.lot[1], contact_phone: l.lot[2]}, damage: l.damage};
      }
    }
    if (!search) return row;

    // finding providers: started minutes after it arrived. A detail of the job; the status stays New.
    const started = step(0.2);
    row.search = {state: "done", started_at: started, at: started, error: null};
    if (search === "failed") { row.search = {...row.search, state: "failed", error: "Provider search timed out twice. Please run it again."}; m.lookup = {timeouts: 2}; step(0.5); return row; }
    if (x.report) return reportFlow(row, x, created, {step, mail, iso, cam, r, now, veh, place, DAY, HOUR, t: () => t, setT: v => { t = v; }});
    row.result = lookupFor(row); step(0.05);
    const shops = row.result.shops;

    // the job link: one per job, shared with every provider on the list; going live makes the job Dispatching
    if (status === "new") return row;
    const views = hashStr(row.form.vin) % (status === "dispatching" ? 5 : 3) + 1;
    if (status === "dispatching" || x.link) {
      const at = step(1.5, "dispatching");
      m.link = newLink(r, at, cam);
      seedViews(m.link, r, Date.parse(at), Math.min(now, Date.parse(at) + 30 * HOUR), status === "canceled" ? 2 : views, iso);
      (DECLINES[model] || []).forEach(([reason, who], i) => {
        const v = m.link.views[i] || m.link.views[0];
        m.link.declines.push({at: iso(Date.parse(v.at) + 12 * 60e3), reason, name: who === null ? "" : shops[who]?.name || "", viewer: v.viewer, provider_id: null});
      });
    }

    if (status === "claimed" || status === "complete") {
      const s = shops[0];
      const linked = step(status === "complete" ? 20 : 26, "dispatching");
      const visit = status === "complete" ? t + 46 * HOUR : now + (1 + n % 3) * DAY;
      const slot = new Date(visit); slot.setHours([9, 10, 13, 15][n % 4], n % 2 ? 30 : 0, 0, 0);
      m.scheduled_at = when(slot.getTime());   // the visit time the seed's bookings had; nothing sets one now
      m.link = newLink(r, linked, cam);
      const claimAt = step(2, "claimed");
      seedViews(m.link, r, Date.parse(linked), Date.parse(claimAt), views, iso);
      m.link.claim = claimOf(m.link, claimAt, INSPECTORS[n % INSPECTORS.length], s.name, s.phone, n % 2 ? s.email : "", slot.getTime());
      mail(row.form.email, mailSubject("claimed", veh, row.ref), claimAt, {kind: "claimed"});
      if (status === "complete") {
        t = slot.getTime() + 3 * HOUR;
        const at = step(0, "complete");
        m.report = {id: reportId(at, id12()), at, filename: `${make.replace(/\W/g, "")}_${row.form.vin.slice(-6)}_inspection.pdf`, shop: shopCard(s)};
        mail(row.form.email, mailSubject("complete", veh, row.ref), at, {kind: "complete"});
      }
    }
    if (status === "canceled") {
      const at = step(30, "canceled");
      const by = u && !x.refund ? u : cam;
      m.canceled = {at, by: by.name, by_id: by.id, reason: x.reason};
      if (x.refund) {
        m.refund = {id: "re_" + pick(r, ALNUM, 24), status: "succeeded", amount_cents: m.order.amount_cents, at, by: cam.name, by_id: cam.id};
        mail(row.form.email, mailSubject("canceled", veh, row.ref), at, {kind: "refunded"});
      }   // a workspace canceling its own job from the portal is not emailed (portal.cancel_request)
    }
    return row;
  });

  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));   // the list comes newest first
  // the customer's own reference on some business jobs: a fleet's unit number on most of Meridian's open jobs and a
  // handful of its finished ones, a dealer's stock number on some of Crestview's (form.customer_ref, "Your reference")
  const used = new Set(), unique = (base, k, span) => { let v = base + k % span; while (used.has(v)) v++; used.add(v); return v; };
  for (const row of rows) {
    const h = hashStr(row.form.vin), open = row.status !== "complete";
    if (row.org.id === orgs.meridian.id && (open ? h % 4 !== 0 : h % 16 === 0)) row.form.customer_ref = `Unit ${unique(4100, h, 800)}`;
    if (row.org.id === orgs.crestview.id && (open || h % 3 === 0)) row.form.customer_ref = `Stock 24-${unique(1000, h, 9000)}`;
  }
  const auth = buildAuth(now, orgs, users, cam);
  return {version: SEED_VERSION, seededAt: new Date(now).toISOString(), rows, ...auth, meta: META,
          reports: buildReports(rows, orgs.inspectd.id), portal: {orgId: orgs.meridian.id},
          providers: []};   // provider records (contacts, hand-added providers): PlatformStore.jsx; none to start
}

/* ---- accounts, workspaces, roles and invitations (apps/auth/store.py) ---- */

// /api/meta, as production answers it
export const META = {
  agent_enabled: true, mail_enabled: true, mail_from: "Inspectd <jobs@inspectd.com>", mail_test_sender: false,
  storage: "postgres", payments_enabled: true, support_email: "support@inspectd.com", google_enabled: true,
  reports_url: PORTAL, portal_url: PORTAL,
};
// AUTH_SUPER_EMAILS: addresses the server grants team access to on sight, so it cannot be revoked here
export const SUPER_EMAILS = ["kavin@inspectd.com"];
export const INVITATION_DAYS = 7;

// store.slugify
export const slugify = name => (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "org";

// [workspace key, name, email local part (or a whole address), role, sign-in, joined days ago]
// The people who file requests keep the ids the jobs above already carry. The Inspectd team owns Inspectd Consumers.
const TEAM = {
  inspectd: [["kavin", "Kavin Jeyasankar", "kavin@inspectd.com", "OWNER", "both", 420], ["cam", "Cam Wood", "cam@inspectd.com", "OWNER", "google", 400],
             ["scott", "Scott Wood", "scott@inspectd.com", "OWNER", "google", 380]],
  meridian: [["greg", "Greg Halvorsen", "greg.halvorsen", "OWNER", "password", 210], ["dana", null, null, "ADMIN", "password", 205],
             ["luis", null, null, "USER", "google", 160], ["tasha", null, null, "USER", "password", 44]],
  crestview: [["mark", "Mark Delaney", "mdelaney", "OWNER", "both", 140], ["tom", null, null, "ADMIN", "password", 138], ["jen", "Jen Ortiz", "jortiz", "USER", "", 9]],
  rebuilt: [["whitney", "Whitney Sorensen", "whitney", "OWNER", "google", 120], ["caleb", "Caleb Durant", "caleb", "ADMIN", "password", 96],
            ["ivy", "Ivy Tran", "ivy", "USER", "google", 22]],
};
// [workspace, email, role, inviter key, sent days ago, team invitation]
const INVITES = [
  ["inspectd", "ops@inspectd.com", "ADMIN", "cam", 1.2, true],
  ["meridian", "fleet.ops@meridianfleet.com", "USER", "greg", 0.6, false],
  ["meridian", "r.santos@meridianfleet.com", "ADMIN", "dana", 3.1, false],
  ["rebuilt", "listings@rebuiltautos.example", "USER", "whitney", 2.4, false],
  ["rebuilt", "temp@rebuiltautos.example", "USER", "caleb", 11, false],   // expired: never shown as pending
  ["crestview", "service@crestviewautogroup.com", "USER", "mark", 1.7, false],
];

function buildAuth(now, jobOrgs, jobUsers, cam){
  const r = rng(20261105), id12 = () => pick(r, HEX, 12), DAY = 864e5;
  // a time of day of their own for each person, so a member list doesn't read as one batch
  const at = (days, key = "") => new Date(now - days * DAY - (key ? hashStr(key) % 540 : 0) * 60e3).toISOString();
  const domain = k => ORGS.find(o => o[0] === k)[2];
  const orgs = [], users = [], memberships = [], byKey = {};
  const ORG_NAMES = Object.fromEntries(ORGS.map(([k, name]) => [k, name]));
  for (const [k, people] of Object.entries(TEAM)) {
    const oldest = Math.max(...people.map(p => p[5]));
    const [, , , type, location] = ORGS.find(o => o[0] === k);
    const org = {id: jobOrgs[k].id, name: ORG_NAMES[k], slug: slugify(ORG_NAMES[k]), type, location, created_at: at(oldest + 0.4), created_by: null};
    orgs.push(org);
    for (const [key, name, email, role, signin, days] of people) {
      let u = byKey[key];
      if (!u) {
        const known = key === "cam" ? cam : jobUsers[key];
        u = byKey[key] = {id: known ? known.id : id12(), email: known ? known.email : (email.includes("@") ? email : `${email}@${domain(k)}`),
                          name: known ? known.name : name, phone: known?.phone || "", is_super: k === "inspectd",
                          has_password: signin === "password" || signin === "both", google_linked: signin === "google" || signin === "both",
                          created_at: at(days, key), last_login_at: signin ? at(Math.min(days, 0.04 + (hashStr(key) % 90) / 24)) : null};
        users.push(u);
      }
      if (!org.created_by) org.created_by = u.id;
      memberships.push({org_id: org.id, user_id: u.id, role, joined_at: at(days, key + k)});
    }
  }
  const invitations = INVITES.map(([k, email, role, by, days, team]) => ({
    id: id12(), org_id: orgs.find(o => o.slug === slugify(ORG_NAMES[k])).id, email, role, invited_by: byKey[by].id, grants_super: team,
    token: pick(r, URLSAFE, 43), created_at: at(days, email), expires_at: at(days - INVITATION_DAYS, email), accepted_at: null, accepted_by: null, revoked_at: null,
  }));
  return {orgs: orgs.sort((a, b) => a.created_at.localeCompare(b.created_at)), users, memberships, invitations, superEmails: SUPER_EMAILS, meId: cam.id};
}

/* ---- the ten jobs with real reports ------------------------------------ */

// A job whose report is real: Lemon Squad looked up and booked, claimed through its link, inspected on the
// day, and its report back three hours later, with the history, booking, claim and emails Kavin's server keeps.
function reportFlow(row, x, created, k){
  const m = row.meta, rep = REPORT_INDEX[x.report];
  const shop = {...LEMON_SQUAD, lat: null, lon: null, miles: null};
  row.result = {shops: [shop], summary: `Lemon Squad covers ${k.place.city}, ${k.place.state} with a mobile inspector who comes to the vehicle.`, origin: [k.place.lat, k.place.lon]};
  k.step(0.05);
  // the inspection's day in the demo's zone, and the visit at a fixed instant on it (17:00 UTC is mid-morning in Denver),
  // so the server and every browser give the report the same date (demoDay.js)
  const day = demoDay(k.now - x.inspected * k.DAY), [vy, vm, vd] = day.split("-").map(Number);
  const visit = new Date(Date.UTC(vy, vm - 1, vd, 17, 0));
  m.inspected_on = day;
  const linked = k.iso(created + (visit.getTime() - created) * 0.45);
  k.setT(Date.parse(linked));
  m.scheduled_at = when(visit.getTime());
  row.updated_at = linked;
  m.history.push({stage: "dispatching", at: linked});
  m.link = newLink(k.r, linked, k.cam);
  const claimAt = k.step(2, "claimed");
  seedViews(m.link, k.r, Date.parse(linked), Date.parse(claimAt), hashStr(rep.id) % 3 + 1, k.iso);
  // Lemon Squad claims through its dispatcher; no phone or email of theirs is invented here
  m.link.claim = claimOf(m.link, claimAt, INSPECTORS[hashStr(rep.id) % INSPECTORS.length], LEMON_SQUAD.name, "", "", visit.getTime());
  k.mail(row.form.email, mailSubject("claimed", k.veh, row.ref), claimAt, {kind: "claimed"});
  k.setT(visit.getTime() + 3 * k.HOUR);
  const at = k.step(0, "complete");
  m.report = {id: rep.id, at, filename: rep.filename, shop: shopCard(shop)};
  k.mail(row.form.email, mailSubject("complete", k.veh, row.ref), at, {kind: "complete"});
  return row;
}

/* ---- the job link: one per job, open to every provider it is shared with ---- */

const newLink = (r, at, by) => ({token: pick(r, URLSAFE, 32), created_at: at, created_by: by.name, off_at: null, views: [], declines: [], claim: null});
// n views between two moments, each from a browser of its own
function seedViews(link, r, from, to, n, iso){
  for (let i = 0; i < n; i++) link.views.push({at: iso(from + (to - from) * (i + 1) / (n + 1)), viewer: "v_" + pick(r, HEX, 10)});
}
// the claim comes from the browser that viewed it last, proposing the day and part of the day of the seeded visit
const claimOf = (link, at, name, company, phone, email, visit) => ({at, name, company, phone, email, viewer: link.views.at(-1)?.viewer || "", provider_id: null,
  terms: {version: PROVIDER_TERMS_VERSION, accepted_at: at}, proposed_time: proposedOf(visit)});
const proposedOf = ms => { const d = new Date(ms), p = n => String(n).padStart(2, "0"), h = d.getHours();
  return {date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, window: h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"}; };

/* ---- inspection reports (apps/reports_service): one per finished job ---- */

/** Kavin's report id: the upload time to the second, then six hex characters (YYYYMMDD-HHMMSS-abc123). */
export const reportId = (iso, hex) => { const d = new Date(iso), p = n => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}-${hex.slice(0, 6)}`; };

/*
 * The report store's rows (store.summary_row plus what the store keeps beside it): each converted report's
 * summary from reportIndex.js, with the dates, workspace and job the seed gives it. The full document, its
 * findings and photos, is public/portal/reports/<id>/report.json, fetched when the report is opened.
 */
function buildReports(rows, inspectdOrgId){
  const r = rng(20261106), out = [];
  for (const row of rows) {
    const rep = row.meta?.report, doc = rep?.id && REPORT_INDEX[rep.id]; if (!doc) continue;
    out.push({
      ...doc, uploaded_at: rep.at, request_id: row.id,
      // what the job ordered: the viewer shows Inspectd AI only on a business's reports (not the Consumer type)
      inspection_type: row.form.inspection_type, inspection_subtype: row.form.inspection_subtype,
      // every job has a workspace now; a job without one would be kept in Inspectd's own (reports_service DIRECT_ORG)
      org_id: row.org_id || inspectdOrgId,
      uploaded_by: null, uploaded_by_name: rep.shop?.name || "",                 // the inspector, through their job link
      inspection: {...doc.inspection, date: row.meta.inspected_on || demoDay(Date.parse(rep.at))},   // date-only
      share: {token: pick(r, HEX, 32), listing: pick(r, HEX, 32)},                // the customer's /r/<token> link, and the listing's
    });
  }
  return out.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}
