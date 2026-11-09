/*
 * The Open jobs map's geometry, as pure functions (OpsMap.jsx draws; docs/platform/decisions.md, "Open jobs map").
 * Everything lives on one plane: us-atlas's albers files are already projected by d3's geoAlbersUsa at scale 1300,
 * translate [487.5, 305] (a 975 × 610 plane, Alaska and Hawaii inset), and jobs, interstates and cities are projected
 * the same way. The view fits that plane into the canvas, then d3-zoom's transform zooms and pans it.
 */
import { geoAlbersUsa } from "d3-geo";
import { placeOf } from "./seed.js";

export const PROJ = geoAlbersUsa().scale(1300).translate([487.5, 305]);
export const PLANE = [975, 610];
/** Zoom levels (1 is the whole country): pins from 8, the lazy layers from 4, counties and major cities from 6. */
export const ZOOM = {min: 1, max: 32, pins: 8, layers: 4, roads: 4, counties: 6, cities: 6, states: 3, metrosFrom: 2.5};
export const URGENCY = ["new", "dispatching", "claimed"];   // a cluster takes its most urgent status's color
export const CLUSTER_PX = 36, FAN_PX = 14, MAX_FAN = 16;
export const METROS = [["Denver", 39.7392, -104.9903], ["Dallas", 32.7767, -96.797], ["Atlanta", 33.749, -84.388], ["Nashville", 36.1627, -86.7816], ["Salt Lake City", 40.7608, -111.891]]
  .map(([name, lat, lon]) => { const [x, y] = PROJ([lon, lat]); return {name, x, y}; });
export const ABBR = {"01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"};
const STATE_NAME = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

/**
 * Where a job goes on the plane, from its ZIP (seed.js placeOf): the seed's ZIP table or us-zips' centroid is exact;
 * a state's center (the ZIP wasn't found) is approximate, drawn hollow; with neither ZIP nor state there is no place
 * (placeOf's Dallas default is never drawn) and the job is "not on the map".
 */
export function positionOf(form = {}){
  const p = placeOf(form.zip, form.state);
  if (p.from === "default") return null;
  const q = PROJ([p.lon, p.lat]);
  if (!q) return null;
  const st = String(form.state || "").trim().toUpperCase();
  return {x: q[0], y: q[1], approx: p.from === "state", stateName: STATE_NAME[st] || st};
}

/** The fit of the plane into a W × H canvas: base coordinates are bx + f·x, by + f·y; d3-zoom's transform goes on top. */
export function fitOf(W, H){
  const f = Math.min(W / PLANE[0], H / PLANE[1]) * 0.94;
  return {f, bx: (W - PLANE[0] * f) / 2, by: (H - PLANE[1] * f) / 2};
}

/** The clustering step for a zoom level: clusters are recomputed only when this changes, so nodes don't jitter. */
export const clusterStep = k => Math.floor(Math.log2(Math.max(1, k)) * 2) / 2;

/**
 * Greedy clustering on the plane: jobs taken most urgent first join the first cluster whose center is within
 * CLUSTER_PX screen pixels (at the step's scale), else start one. A grid of cell size R keeps it linear.
 * `pts` are {job, x, y}; returns [{x, y, jobs}] with x, y the mean of the members.
 */
export function cluster(pts, f, step){
  const R = CLUSTER_PX / (f * 2 ** step), grid = new Map(), out = [];
  const key = (i, j) => i + ":" + j;
  const sorted = [...pts].sort((a, b) => URGENCY.indexOf(a.job.status) - URGENCY.indexOf(b.job.status) || String(a.job.id).localeCompare(String(b.job.id)));
  for (const p of sorted) {
    const gi = Math.floor(p.x / R), gj = Math.floor(p.y / R);
    let hit = null;
    for (let di = -1; di <= 1 && !hit; di++) for (let dj = -1; dj <= 1 && !hit; dj++)
      for (const c of grid.get(key(gi + di, gj + dj)) || []) if (Math.hypot(c.x - p.x, c.y - p.y) < R) { hit = c; break; }
    if (hit) { hit.members.push(p); hit.x = hit.members.reduce((a, m) => a + m.x, 0) / hit.members.length; hit.y = hit.members.reduce((a, m) => a + m.y, 0) / hit.members.length; }
    else { const c = {x: p.x, y: p.y, members: [p], gi, gj}; out.push(c); const k = key(gi, gj); grid.set(k, [...(grid.get(k) || []), c]); }
  }
  return out.map(c => ({x: c.x, y: c.y, jobs: c.members.map(m => m.job), approx: c.members.every(m => m.approx)}));
}

/** A cluster's color: its most urgent status. */
export const topStatus = jobs => URGENCY.find(s => jobs.some(j => j.status === s)) || "claimed";
/** A node's radius in pixels: 7 for one job, growing with the square root of the count, at most 30. */
export const nodeRadius = n => Math.min(30, 7 + 4.2 * Math.sqrt(Math.max(0, n - 1)));

/**
 * Pins with fan-out, in screen space: pins within FAN_PX of each other form a group around their first point; a group
 * of n > 1 is spread evenly on a ring of 15 + 2n pixels (two rings past 10), each pin joined to the true point by a
 * hairline. More than MAX_FAN at one place is one node instead ("n here"). `pts` are {job, sx, sy, approx}.
 */
export function fanOut(pts){
  const groups = [];
  for (const p of pts) { const g = groups.find(g => Math.hypot(g.x - p.sx, g.y - p.sy) < FAN_PX); if (g) g.members.push(p); else groups.push({x: p.sx, y: p.sy, members: [p]}); }
  const marks = [];
  for (const g of groups) {
    const n = g.members.length;
    if (n > MAX_FAN) { marks.push({type: "node", x: g.x, y: g.y, jobs: g.members.map(m => m.job), here: true}); continue; }
    const rings = n > 10 ? [g.members.slice(0, 10), g.members.slice(10)] : [g.members];
    rings.forEach((ring, ri) => {
      const r = n > 1 ? 15 + 2 * Math.min(n, 10) + ri * 18 : 0;
      ring.forEach((m, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / ring.length + ri * 0.3;
        marks.push({type: "pin", job: m.job, approx: m.approx, x: g.x + r * Math.cos(a), y: g.y + r * Math.sin(a), ax: g.x, ay: g.y, fanned: n > 1, group: n}); });
    });
  }
  return marks;
}

/**
 * Greedy label placement: candidates in priority order, each kept only if its box overlaps no box already taken
 * (marks are passed in first, as blockers) and it lies inside the canvas. `measure(text, px, weight)` gives a width.
 */
export function placeLabels(cands, blockers, W, H, measure){
  const taken = blockers.slice(), out = [];
  for (const c of cands) {
    const w = measure(c.text, c.size, c.weight), h = c.size + 2;
    const x0 = c.align === "left" ? c.x : c.x - w / 2, box = [x0 - 2, c.y - h / 2 - 1, x0 + w + 2, c.y + h / 2 + 1];
    if (box[0] < 4 || box[2] > W - 4 || box[1] < 4 || box[3] > H - 4) continue;
    if (taken.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
    taken.push(box); out.push({...c, x0, w});
  }
  return out;
}

/** A line layer from public/map (scripts/build-map-layers.mjs): {q, lines: [[x0, y0, dx, dy, ...]]} → plane polylines. */
export function decodeLines({ q, lines }){
  return lines.map(l => { const pts = new Float32Array(l.length); let x = 0, y = 0;
    for (let i = 0; i < l.length; i += 2) { x += l[i]; y += l[i + 1]; pts[i] = x / q; pts[i + 1] = y / q; } return pts; });
}
