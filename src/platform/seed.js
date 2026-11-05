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
import { DEALER } from "../data.js";

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
const miles = (a, b) => { const R = 3958.8, rad = d => d * Math.PI / 180, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

/* ---- providers: mobile inspectors and a few shops, seven per metro ---- */

// [base ZIP, name, street address ("" for mobile), phone, domain, hours, services, rating, coverage, notes]
const P = [
  ["75201", "Trinity Mobile Vehicle Inspections", "", "(214) 555-0112", "trinitymobileinspect.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.9 · 318 reviews", "Mobile, covers Dallas, Irving and Garland", "Fleet volume welcome; can do 6+ vehicles at one lot in a day."],
  ["75024", "Prairie Line Auto Inspect", "", "(972) 555-0118", "prairielineauto.com", "Mon-Fri 8am-6pm, Sat 9am-2pm", "Pre-purchase, lease end, photo condition reports", "4.8 · 204 reviews", "Mobile, covers Plano, Frisco and Allen", ""],
  ["75038", "Northgate Pre-Purchase Inspections", "4510 W Walnut Hill Ln, Irving, TX 75038", "(972) 555-0124", "northgateppi.com", "Mon-Sat 8am-6pm", "Pre-purchase, diagnostics, OBD scans", "4.7 · 156 reviews", "", "Also inspects on site at dealer and auction lots."],
  ["75034", "Frisco Mobile Mechanic & Inspection", "", "(469) 555-0127", "friscomobilemech.com", "Daily 7am-8pm", "Pre-purchase, mobile repair", "4.6 · 98 reviews", "Mobile, covers Frisco, McKinney and The Colony", "Weekend appointments most weeks."],
  ["75024", "Redbud Auto Diagnostics", "1401 Legacy Dr, Plano, TX 75024", "(972) 555-0133", "redbudautodiag.com", "Mon-Fri 7:30am-6pm", "Pre-purchase, EV battery health, diagnostics", "4.8 · 241 reviews", "", "EV certified (Tesla, Ford, Hyundai). Brings a battery health scanner."],
  ["75038", "Cedar Fork Inspection Co.", "", "(214) 555-0139", "cedarforkinspect.com", "Mon-Sat 8am-5pm", "Lease end, fleet de-fleet checks", "4.5 · 61 reviews", "Mobile, covers Irving, Grand Prairie and Arlington", ""],
  ["75201", "Elm Fork Mobile Inspections", "", "(214) 555-0142", "elmforkmobile.com", "Mon-Fri 8am-6pm", "Pre-purchase, high-line and exotic", "4.9 · 87 reviews", "Mobile, covers Dallas, Highland Park and Richardson", "High-line specialist; paint meter and lift-system checks on request."],

  ["30303", "Peachtree Mobile Inspections", "", "(404) 555-0151", "peachtreemobileinspect.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 · 276 reviews", "Mobile, covers Atlanta, Decatur and East Point", "Fleet volume welcome."],
  ["30060", "Chattahoochee Auto Check", "", "(770) 555-0154", "chattahoocheeautocheck.com", "Mon-Fri 8am-6pm", "Pre-purchase, lease end", "4.7 · 133 reviews", "Mobile, covers Marietta, Smyrna and Kennesaw", ""],
  ["30060", "Kennesaw Ridge Vehicle Inspect", "1250 Roswell Rd, Marietta, GA 30060", "(770) 555-0157", "kennesawridgeinspect.com", "Mon-Sat 8am-6pm", "Pre-purchase, diagnostics, emissions", "4.6 · 189 reviews", "", "Shop inspections same day; mobile within 15 miles."],
  ["30009", "Northpoint Mobile Inspection", "", "(678) 555-0160", "northpointmobile.com", "Daily 8am-7pm", "Pre-purchase, EV, high-line", "4.9 · 142 reviews", "Mobile, covers Alpharetta, Roswell and Johns Creek", "EV certified; battery health reports included."],
  ["30030", "Decatur Square Auto Diagnostics", "415 E College Ave, Decatur, GA 30030", "(404) 555-0165", "decatursquareauto.com", "Mon-Fri 7:30am-5:30pm", "Pre-purchase, diagnostics", "4.7 · 211 reviews", "", ""],
  ["30303", "Red Clay Inspection Services", "", "(404) 555-0168", "redclayinspect.com", "Mon-Sat 8am-5pm", "Lease end, fleet de-fleet checks, auction condition reports", "4.5 · 74 reviews", "Mobile, covers Atlanta, College Park and Hapeville", "Works auction lanes; can turn reports same day."],
  ["30009", "Signal Hill Vehicle Inspections", "", "(678) 555-0171", "signalhillinspect.com", "Mon-Fri 8am-6pm", "Pre-purchase, lease end", "4.6 · 52 reviews", "Mobile, covers Alpharetta, Cumming and Milton", ""],

  ["37203", "Music Row Mobile Inspections", "", "(615) 555-0102", "musicrowmobile.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 · 227 reviews", "Mobile, covers Nashville, Midtown and The Nations", "Fleet volume welcome."],
  ["37064", "Harpeth Valley Auto Inspect", "", "(615) 555-0106", "harpethvalleyauto.com", "Mon-Fri 8am-6pm", "Pre-purchase, high-line, classic", "4.9 · 118 reviews", "Mobile, covers Franklin, Leiper's Fork and Thompson's Station", "Classic and collector cars; paint meter and compression test on request."],
  ["37027", "Brentwood Precision Auto", "5100 Maryland Way, Brentwood, TN 37027", "(615) 555-0109", "brentwoodprecision.com", "Mon-Fri 7:30am-6pm", "Pre-purchase, diagnostics, high-line", "4.7 · 196 reviews", "", "European specialist."],
  ["37129", "Stones River Mobile Inspection", "", "(615) 555-0113", "stonesrivermobile.com", "Mon-Sat 8am-6pm", "Pre-purchase, rebuilt title checks", "4.6 · 89 reviews", "Mobile, covers Murfreesboro, Smyrna and La Vergne", "Rebuilt and salvage title inspections; documents prior repairs."],
  ["37203", "Cumberland Vehicle Assessment", "900 8th Ave S, Nashville, TN 37203", "(615) 555-0116", "cumberlandvehicle.com", "Mon-Fri 8am-5pm", "Pre-purchase, lease end, auction condition reports", "4.5 · 143 reviews", "", ""],
  ["37027", "Volunteer State Inspections", "", "(615) 555-0119", "volstateinspect.com", "Daily 8am-7pm", "Pre-purchase, lease end, EV", "4.7 · 101 reviews", "Mobile, covers Brentwood, Nolensville and Antioch", ""],
  ["37064", "Natchez Trace Mobile Inspect", "", "(629) 555-0122", "natchezmobile.com", "Mon-Sat 8am-6pm", "Lease end, fleet de-fleet checks", "4.4 · 47 reviews", "Mobile, covers Franklin, Spring Hill and Columbia", ""],

  ["80202", "Front Range Mobile Inspections", "", "(303) 555-0172", "frontrangemobile.com", "Mon-Sat 7am-7pm", "Pre-purchase, lease return, fleet condition reports", "4.8 · 302 reviews", "Mobile, covers Denver, Englewood and Commerce City", "Fleet volume welcome."],
  ["80226", "Bluebird Auto Inspect", "", "(720) 555-0175", "bluebirdautoinspect.com", "Mon-Fri 8am-6pm", "Pre-purchase, EV battery health", "4.7 · 128 reviews", "Mobile, covers Lakewood, Golden and Wheat Ridge", "EV certified (Tesla, Ford, Hyundai)."],
  ["80202", "Mile High Pre-Buy", "1550 Larimer St, Denver, CO 80202", "(303) 555-0178", "milehighprebuy.com", "Mon-Fri 8am-6pm", "Pre-purchase, high-line and exotic, arbitration reports", "4.9 · 164 reviews", "", "Exotic and high-line specialist; arbitration-grade documentation."],
  ["80011", "Cherry Creek Mobile Auto Check", "", "(720) 555-0181", "cherrycreekautocheck.com", "Daily 8am-7pm", "Pre-purchase, lease end", "4.6 · 93 reviews", "Mobile, covers Aurora, Centennial and Parker", ""],
  ["80120", "Littleton Motorworks Inspection", "5600 S Broadway, Littleton, CO 80120", "(303) 555-0184", "littletonmotorworks.com", "Mon-Fri 7:30am-5:30pm", "Pre-purchase, diagnostics", "4.7 · 177 reviews", "", ""],
  ["80120", "Columbine Vehicle Inspection", "", "(720) 555-0187", "columbineinspect.com", "Mon-Sat 8am-5pm", "Lease end, auction condition reports", "4.5 · 66 reviews", "Mobile, covers Littleton, Highlands Ranch and Ken Caryl", ""],
  ["80226", "Highline Canal Auto Inspect", "", "(303) 555-0190", "highlinecanalauto.com", "Mon-Fri 8am-6pm", "Pre-purchase, fleet de-fleet checks", "4.6 · 58 reviews", "Mobile, covers Lakewood, Denver and Littleton", ""],
];
export const PROVIDERS = P.map(([zip, name, address, phone, domain, hours, services, rating, coverage, notes]) => ({
  zip, name, address, phone, website: `https://www.${domain}`, email: `${address ? "service" : "bookings"}@${domain}`, hours, services, rating,
  distance: coverage, notes, mobile: !address, sources: [`https://www.${domain}`, `https://www.${domain}/${address ? "inspections" : "service-area"}`],
}));

/** What a lookup finds for a job: the nearest providers in Kavin's shop shape, located shops by measured
 *  distance first and mobile inspectors after them (research/geo.py locate). `attempt` varies a rerun. */
export function lookupFor(row, attempt = 0){
  const z = ZIPS[row.form.zip], origin = {lat: z.lat, lon: z.lon};
  const n = 4 + hashStr(row.id + ":" + attempt) % 4;   // 4 to 7
  const near = PROVIDERS.map(p => ({p, d: miles(origin, ZIPS[p.zip])})).sort((a, b) => a.d - b.d).slice(0, n);
  const shops = near.map(({p, d}) => {
    const {zip, ...shop} = p;
    const at = ZIPS[zip], m = shop.address ? Math.round(Math.max(d, 0.6 + (hashStr(shop.name) % 30) / 10) * 10) / 10 : null;
    return {...shop, lat: shop.address ? at.lat : null, lon: shop.address ? at.lon : null, miles: m, distance: m === null ? shop.distance : `${m} mi`};
  }).sort((a, b) => (a.miles === null) - (b.miles === null) || (a.miles ?? 0) - (b.miles ?? 0));
  const mobile = shops.filter(s => s.mobile).length;
  return {
    shops,
    summary: `${shops.length} inspectors cover ${z.city}, ${z.state}. ${mobile === shops.length ? "All of them are mobile and come to the vehicle." : `${mobile} are mobile and come to the vehicle; ${shops.length - mobile} work from a shop nearby and will also travel.`}`,
    origin: [z.lat, z.lon],
  };
}

/* ---- people ------------------------------------------------------- */

export const SEED_VERSION = 2;   // bump when the seed changes shape: a stored older seed is replaced
export const PORTAL = "https://portal.inspectd.com";
export const PROVIDER_TERMS_VERSION = "1";   // booking.provider_terms(): what a claim records
// a job's reference in emails (mail._vehicle_and_ref)
export const jobRef = id => `J-${id.slice(0, 6).toUpperCase()}`;
export const CAM = {name: "Cam Wood", email: "cam@inspectd.com"};

// [key, name, domain]: the business workspaces, and the people who file their requests
const ORGS = [
  ["meridian", "Meridian Fleet Services", "meridianfleet.com"],
  ["northline", "Northline Mobility", "northlinemobility.com"],
  ["harbor", "Harbor Lease Remarketing", "harborlease.com"],
  ["crestview", DEALER.name, DEALER.url],
];
const USERS = {
  dana: ["meridian", "Dana Whitfield", "dana.whitfield", "(214) 555-0131"],
  luis: ["meridian", "Luis Ortega", "luis.ortega", "(404) 555-0147"],
  jordan: ["northline", "Jordan Ellis", "jordan.ellis", "(972) 555-0158"],
  mei: ["northline", "Mei Tanaka", "mei.tanaka", "(678) 555-0163"],
  rachel: ["harbor", "Rachel Boone", "rachel.boone", "(615) 555-0173"],
  andre: ["harbor", "Andre Kim", "andre.kim", "(770) 555-0176"],
  tom: ["crestview", "Tom Becker", "tbecker", "(303) 555-0149"],
};
// walk-ins: people who paid on the public form, no workspace
const WALKINS = {
  marcus: ["Marcus Hale", "marcus.hale@pinemail.net", "(214) 555-0185"],
  elena: ["Elena Ruiz", "elena.ruiz@pinemail.net", "(404) 555-0188"],
  kevin: ["Kevin Doyle", "kdoyle@pinemail.net", "(615) 555-0191"],
  aisha: ["Aisha Grant", "aisha.grant@pinemail.net", "(720) 555-0193"],
  brian: ["Brian Cho", "brian.cho@pinemail.net", "(770) 555-0195"],
  jasmine: ["Jasmine Patel", "jasmine.patel@pinemail.net", "(615) 555-0197"],
};
// the pilot partner whose listing sent one shopper (its public profile, apps/partners/registry PUBLIC)
export const PARTNERS = {
  rebuildr: {key: "rebuildr", name: "Rebuildr", short: "Rebuildr", brand: "co-brand", logo: "", accent: "#0f766e",
             lock: ["year", "make", "model", "vin"], reimbursement: "", listing_note: "Rebuilt-title marketplace. The listing carries the car's damage history.", share_bps: 500},
};

/* ---- the jobs ------------------------------------------------------ */

// [who, zip, street, [year, make, model, vin prefix, plant], type, designation, status, lookup, days ago, extras]
// who: a user key (a workspace request) or a walk-in key. extras: form notes, internal notes, batch, link, contacted...
const J = [
  // received: not looked up yet
  ["dana", "75038", "3200 W Airport Fwy", [2024, "Toyota", "Camry", "4T1C11AK", "U"], "general", "standard", "received", "none", 0.12, {notes: "De-fleet batch. Row C at our Irving lot; keys at the front desk."}],
  ["andre", "30009", "11720 Amber Park Dr", [2023, "Nissan", "Rogue", "5N1BT3BB", "C"], "lease-end", "standard", "received", "none", 0.38, {}],
  ["aisha", "80226", "1420 S Teller St", [2022, "Tesla", "Model Y", "7SAYGDEE", "F"], "pre-purchase", "ev", "received", "none", 0.66, {notes: "Private sale. I'd like a battery health number before I pay."}],
  // dispatching
  ["dana", "75024", "6100 W Plano Pkwy", [2023, "Chevrolet", "Malibu", "1G1ZD5ST", "F"], "general", "standard", "dispatching", "done", 2.6, {batch: "m-dfw", contacted: [0], inotes: "Called Prairie Line, they can do Thursday morning. Waiting on Dana to confirm lot access."}],
  ["luis", "30303", "180 Peachtree St NW", [2023, "Ford", "Explorer", "1FMSK8DH", "G"], "lease-end", "standard", "dispatching", "done", 1.5, {}],
  ["luis", "37203", "1 Music Sq W", [2022, "Jeep", "Grand Cherokee", "1C4RJHBG", "8"], "general", "standard", "dispatching", "failed", 1.8, {}],
  ["dana", "80202", "1701 Wynkoop St", [2023, "Chevrolet", "Tahoe", "1GNSKNKD", "R"], "general", "standard", "dispatching", "done", 2.3, {contacted: [0, 1]}],
  ["dana", "75034", "8800 Gaylord Pkwy", [2024, "Kia", "Forte", "3KPF24AD", "E"], "general", "standard", "dispatching", "done", 2.6, {batch: "m-dfw", link: "offered"}],
  ["jordan", "75201", "2000 Ross Ave", [2023, "Tesla", "Model 3", "5YJ3E1EA", "F"], "general", "ev", "dispatching", "done", 1.1, {notes: "Subscriber return at 41k miles. Battery health report needed."}],
  ["mei", "30030", "250 E Ponce de Leon Ave", [2022, "Honda", "CR-V", "7FARW2H5", "E"], "pre-purchase", "standard", "dispatching", "done", 3.0, {contacted: [0], inotes: "Left voicemail with two. Decatur Square said they can do it this week."}],
  ["jordan", "75038", "5215 N O'Connor Blvd", [2023, "Hyundai", "Elantra", "KMHLM4AG", "U"], "general", "standard", "dispatching", "done", 3.4, {link: "rejected", contacted: [0]}],
  ["tom", "80226", "7400 W Colfax Ave", [2023, "Toyota", "RAV4", "2T3P1RFV", "W"], "pre-purchase", "standard", "dispatching", "done", 4.1, {}],
  ["rachel", "37027", "330 Franklin Rd", [2022, "BMW", "X5", "5UXCR6C0", "9"], "lease-end", "high-end", "dispatching", "done", 2.0, {notes: "Lease return. Lessee reports a curb-rashed wheel; please photograph all four."}],
  ["rachel", "37064", "1800 Galleria Blvd", [2023, "Mercedes-Benz", "GLE 350", "4JGFB4KB", "A"], "auction-listing", "high-end", "dispatching", "done", 3.7, {contacted: [0]}],
  ["andre", "30303", "55 Trinity Ave SW", [2022, "Nissan", "Altima", "1N4BL4DV", "N"], "lease-end", "standard", "dispatching", "done", 5.2, {}],
  ["tom", "80011", DEALER.address, [2021, "Ford", "F-150", "1FTFW1E5", "F"], "pre-purchase", "standard", "dispatching", "done", 1.6, {inotes: "Crestview wants it before Saturday's sale."}],
  ["tom", "80120", "8501 W Bowles Ave", [2022, "Lamborghini", "Huracan EVO", "ZHWUF5ZF", "L"], "auction-arbitration", "exotic", "dispatching", "done", 0.9, {link: "offered", notes: "Arbitration claim: buyer reports a front lift system fault not disclosed at sale. Need a documented check before the arbitration deadline."}],
  ["marcus", "75201", "2525 McKinnon St", [2019, "Lexus", "RX 350", "2T2BZMCA", "C"], "pre-purchase", "standard", "dispatching", "done", 2.2, {}],
  ["marcus", "75034", "4800 Main St", [2020, "Honda", "Accord", "1HGCV1F3", "A"], "pre-purchase", "standard", "dispatching", "done", 1.9, {held: true, notes: "Second car I'm looking at. Seller is free after 5pm."}],
  ["elena", "30030", "128 Sycamore St", [2021, "Subaru", "Outback", "4S4BTACC", "3"], "pre-purchase", "standard", "dispatching", "done", 4.4, {contacted: [0]}],
  ["jasmine", "37129", "1950 Old Fort Pkwy", [2020, "Honda", "Civic", "2HGFC2F6", "H"], "pre-purchase", "standard", "dispatching", "done", 1.3, {partner: "rebuildr", notes: "Want to know the repair quality on the front end before I buy."}],
  // confirmed: booked, the inspector's link claimed
  ["luis", "37129", "2635 Medical Center Pkwy", [2023, "Chevrolet", "Equinox", "3GNAXKEG", "S"], "general", "standard", "confirmed", "done", 5.8, {inotes: "Booked. Lot attendant knows to expect them."}],
  ["dana", "80226", "14500 W Colfax Ave", [2023, "Ford", "Mustang Mach-E", "3FMTK3SU", "M"], "lease-end", "ev", "confirmed", "done", 6.4, {notes: "Lease end. Check the charge port door and the glass roof for chips."}],
  ["jordan", "75024", "5800 Tennyson Pkwy", [2023, "Chrysler", "Pacifica", "2C4RC1BG", "R"], "general", "standard", "confirmed", "done", 6.9, {}],
  ["rachel", "37203", "150 3rd Ave S", [2021, "Cadillac", "Escalade", "1GYS4BKL", "R"], "auction-listing", "high-end", "confirmed", "done", 7.5, {}],
  ["tom", "80202", "1225 17th St", [2023, "Hyundai", "Ioniq 5", "KM8KN4AE", "U"], "pre-purchase", "ev", "confirmed", "done", 4.8, {}],
  ["kevin", "37027", "9040 Carothers Pkwy", [1989, "Porsche", "911 Carrera", "WP0AB091", "S"], "pre-purchase", "classic", "confirmed", "done", 5.1, {notes: "Seller claims original paint. A paint meter reading on every panel and a compression test, please."}],
  ["mei", "30009", "3000 Old Alabama Rd", [2022, "Jeep", "Wrangler", "1C4HJXEG", "W"], "pre-purchase", "standard", "confirmed", "done", 8.2, {}],
  // complete: the report is in
  ["dana", "75201", "1601 Elm St", [2022, "Toyota", "Corolla", "5YFEPMAE", "P"], "general", "standard", "complete", "done", 13, {}],
  ["luis", "30060", "800 Whitlock Ave NW", [2022, "Dodge", "Charger", "2C3CDXBG", "H"], "lease-end", "standard", "complete", "done", 16, {}],
  ["andre", "37064", "4000 Mallory Ln", [2022, "Ram", "1500", "1C6SRFBT", "N"], "lease-end", "standard", "complete", "done", 12, {}],
  ["tom", "80011", DEALER.address, [2021, "Toyota", "Tacoma", "3TMCZ5AN", "M"], "auction-arbitration", "standard", "complete", "done", 18, {}],
  ["jordan", "75038", "6301 N State Hwy 161", [2022, "Ford", "Escape", "1FMCU0G6", "U"], "general", "standard", "complete", "done", 14, {}],
  // canceled
  ["brian", "30060", "560 Powder Springs St", [2018, "Mazda", "CX-5", "JM3KFBCM", "0"], "pre-purchase", "standard", "canceled", "done", 9, {refund: true, reason: "Customer bought a different vehicle"}],
  ["jordan", "75034", "3201 Dallas Pkwy", [2021, "Nissan", "Rogue", "5N1AT3AA", "C"], "general", "standard", "canceled", "done", 11, {reason: "Vehicle sold before the inspection"}],
];

const INSPECTORS = ["Ray Delgado", "Megan Shore", "Victor Nunez", "Paige Holloway", "Sam Okafor", "Erin Castillo", "Grant Weller"];
const BOOK_NOTES = ["They will call 30 minutes before arriving.", "Keys at the lot office; ask for the attendant.", "", "The inspector needs about an hour with the car."];
const shopCard = s => s ? Object.fromEntries(["name", "phone", "email", "address", "website", "hours"].map(k => [k, s[k] || ""])) : null;
const when = ms => { const d = new Date(ms), o = k => d.toLocaleString("en-US", k); return `${o({weekday: "short"})} ${o({month: "short"})} ${d.getDate()}, ${o({hour: "numeric", minute: "2-digit"})}`; };

/** The whole seed: the request list, and the workspaces and people behind it. */
export function buildSeed(now = Date.now()){
  const r = rng(20261104), id12 = () => pick(r, HEX, 12), DAY = 864e5, HOUR = 36e5;
  const iso = ms => new Date(Math.min(ms, now)).toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const orgs = Object.fromEntries(ORGS.map(([k, name]) => [k, {id: id12(), name}]));
  const users = Object.fromEntries(Object.entries(USERS).map(([k, [org, name, local, phone]]) => [k, {id: id12(), org, name, phone, email: `${local}@${ORGS.find(o => o[0] === org)[2]}`}]));
  const cam = {...CAM, id: id12()};
  const batches = {};

  const rows = J.map(([who, zip, street, [year, make, model, prefix, plant], type, designation, status, lookup, days, x], n) => {
    const u = users[who], w = WALKINS[who], place = ZIPS[zip];
    const created = batches[x.batch] ?? (now - days * DAY - (n % 5) * 7 * 60e3);
    if (x.batch) batches[x.batch] = created;
    const row = {
      id: id12(), created_at: iso(created), updated_at: iso(created), status, lookup, error: null, notes: x.inotes || "",
      form: {name: u ? u.name : w[0], email: u ? u.email : w[1], phone: u ? u.phone : w[2], year: String(year), make, model,
             vin: vin(prefix, year, plant, String(100000 + Math.floor(r() * 899999))), inspection_type: type, designation,
             address: street, city: place.city, state: place.state, zip, notes: x.notes || ""},
      result: null, meta: {emails: [], history: [{stage: "received", at: iso(created)}]},
      org_id: u ? orgs[u.org].id : null, user_id: u ? u.id : null, org: u ? orgs[u.org] : null,
      partner: null, inspect_url: null, inspect_shop: null, inspect_claim: null,
    };
    const m = row.meta, veh = `${year} ${make} ${model}`;
    let t = created;
    const step = (hours, stage) => { t += hours * HOUR; if (stage) m.history.push({stage, at: iso(t)}); row.updated_at = iso(t); return iso(t); };
    const mail = (to, subject, at, extra = {}) => m.emails.push({to, subject, at, sent: !x.held || to !== row.form.email, ...(x.held && to === row.form.email ? {error: `held: ${to} not on MAIL_ALLOWLIST`} : {id: [8, 4, 4, 4, 12].map(k => pick(r, HEX, k)).join("-")}), ...extra});

    // how it came in: a workspace sends a list and is told once; a walk-in pays on the public form
    if (u) mail(u.email, x.batch ? "We received 2 inspection requests" : "We received 1 inspection request", row.created_at);
    else {
      const p = x.partner ? PARTNERS[x.partner] : null;
      m.order = {...quote(zip, p ? p.share_bps : 0), checkout_id: pick(r, HEX, 16), session_id: "cs_test_" + pick(r, ALNUM, 58), payment_intent: "pi_" + pick(r, ALNUM, 24),
                 amount_cents: quote(zip).price_cents, livemode: false, paid_at: row.created_at};
      mail(row.form.email, `We received your inspection request (${row.id})`, row.created_at);
      if (p) {
        const {share_bps, ...pub} = p;
        row.partner = pub; m.partner = p.key;
        m.partner_ref = {role: "shopper", listing: "RB-48213", title: "rebuilt", damage: "Front-end collision, repaired", from_listing: "year,make,model,vin"};
        m.revroom = {vin: row.form.vin, listing_id: "RB-48213", listing_url: "https://listings.rebuildr.example/RB-48213", seller: "dealership", role: "shopper",
                     title_status: "rebuilt", mileage: 41210, authorization: "listing",
                     location: {name: "Stones River Auto Sales", contact_name: "Dale Prewitt", contact_phone: "(615) 555-0104"},
                     damage: [{date: "2024-03-14", type: "collision", areas: ["front_end", "right_front"], severity: "moderate", airbags_deployed: false,
                               odometer_at_damage: 31870, notes: "Repaired at a certified body shop; state rebuilt inspection passed."}]};
      }
    }
    if (status === "received") return row;

    // the lookup: started minutes after it arrived, which moved it to dispatching
    step(0.2, "dispatching");
    if (lookup === "failed") { row.error = "Shop lookup timed out twice. Please run it again."; m.lookup = {timeouts: 2}; step(0.5); return row; }
    row.result = lookupFor(row); step(0.05);
    const shops = row.result.shops;
    for (const i of x.contacted || []) if (shops[i]) shops[i].contacted = true;

    const link = (shop, claim) => {
      const token = pick(r, URLSAFE, 32);
      m.inspect = {token, made_at: step(1.5), shop: shopCard(shop), claim};
      row.inspect_url = `${PORTAL}/inspect/${token}`; row.inspect_shop = shopCard(shop); row.inspect_claim = claim;
    };
    if (x.link === "offered") { shops[0].contacted = true; link(shops[0], {status: "offered", at: iso(t + 1.5 * HOUR)}); }
    if (x.link === "rejected") { link(shops[0], null); const at = step(3); row.inspect_claim = m.inspect.claim = {status: "rejected", at, reason: "Booked solid through next week, sorry."}; }

    if (status === "confirmed" || status === "complete") {
      const s = shops[0]; s.contacted = s.booked = true;
      const booked_at = step(status === "complete" ? 20 : 26);
      const visit = status === "complete" ? t + 46 * HOUR : now + (1 + n % 3) * DAY;
      const slot = new Date(visit); slot.setHours([9, 10, 13, 15][n % 4], n % 2 ? 30 : 0, 0, 0);
      m.booking = {provider: shopCard(s), inspector: INSPECTORS[n % INSPECTORS.length], scheduled_at: when(slot.getTime()), note: BOOK_NOTES[n % BOOK_NOTES.length], booked_by: cam.name, booked_at};
      mail(s.email, `Inspection booked: ${veh} in ${place.city}`, booked_at, {kind: "inspector_booking"});
      const claimAt = step(2, "confirmed");
      m.inspect = {token: pick(r, URLSAFE, 32), made_at: booked_at, shop: shopCard(s), claim: {status: "claimed", at: claimAt, terms: {version: PROVIDER_TERMS_VERSION, accepted_at: claimAt}}};
      row.inspect_url = `${PORTAL}/inspect/${m.inspect.token}`; row.inspect_shop = m.inspect.shop; row.inspect_claim = m.inspect.claim;
      mail(row.form.email, `Inspection confirmed: ${veh} (${jobRef(row.id)})`, claimAt, {kind: "confirmed"});
      if (status === "complete") {
        t = slot.getTime() + 3 * HOUR;
        const at = step(0, "complete");
        m.report = {id: id12(), at, filename: `${make.replace(/\W/g, "")}_${row.form.vin.slice(-6)}_inspection.pdf`, shop: shopCard(s)};
        mail(row.form.email, `Inspection report ready: ${veh} (${jobRef(row.id)})`, at, {kind: "complete"});
      }
    }
    if (status === "canceled") {
      const at = step(30, "canceled");
      const by = u && !x.refund ? u : cam;
      m.canceled = {at, by: by.name, by_id: by.id, reason: x.reason};
      if (x.refund) {
        m.refund = {id: "re_" + pick(r, ALNUM, 24), status: "succeeded", amount_cents: m.order.amount_cents, at, by: cam.name, by_id: cam.id};
        mail(row.form.email, `Inspection canceled and refunded: ${veh} (${jobRef(row.id)})`, at, {kind: "refunded"});
      }   // a workspace canceling its own job from the portal is not emailed (portal.cancel_request)
    }
    return row;
  });

  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));   // the list comes newest first
  return {version: SEED_VERSION, seededAt: new Date(now).toISOString(), rows, orgs: Object.values(orgs), users: Object.values(users), me: cam};
}
