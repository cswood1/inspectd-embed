/*
 * Builds the Open jobs map's lazily loaded context layers into public/map/ (docs/platform/decisions.md, "Open jobs
 * map"). Run by hand when the sources change; the outputs are committed, so the app never fetches anything but its own
 * files. Every layer is projected exactly as us-atlas's albers files are (d3 geoAlbersUsa, scale 1300, translate
 * [487.5, 305]), so they line up with the states the map draws.
 *
 *   node scripts/build-map-layers.mjs <ne_10m_roads.geojson> <sub-est2023.csv> <2023_Gaz_place_national.txt>
 *
 * Sources (public data, downloaded once by whoever runs this):
 *   - county lines: us-atlas counties-albers-10m (npm), the lines between counties of the same state
 *   - interstates: Natural Earth 10m roads (github.com/nvkelso/natural-earth-vector), sov_a3 USA, level Interstate
 *   - cities: Census Vintage 2023 population estimates for incorporated places (sub-est2023.csv), the 300 largest,
 *     placed at their Census 2023 Gazetteer internal points
 *
 * Output format, for each line layer: {"q": 10, "lines": [[x0, y0, dx1, dy1, dx2, dy2, ...], ...]}: plane coordinates
 * times q, rounded, the first point absolute and the rest as deltas (small integers compress well). Cities:
 * {"cities": [[name, state, x, y, population], ...]} largest first, x and y in plane units to one decimal.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { mesh } from "topojson-client";
import { geoAlbersUsa } from "d3-geo";

const [roadsFile, popFile, gazFile] = process.argv.slice(2);
if (!roadsFile || !popFile || !gazFile) { console.error("usage: node scripts/build-map-layers.mjs <roads.geojson> <sub-est2023.csv> <gaz_place.txt>"); process.exit(1); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), OUT = path.join(ROOT, "public", "map");
fs.mkdirSync(OUT, { recursive: true });
const proj = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const Q = 10;   // coordinates to a tenth of a plane unit (about a third of a mile); at the closest zoom, about 3px

// Douglas-Peucker, in plane units
function simplify(pts, tol){
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, at = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len; if (d > max) { max = d; at = i; } }
    if (max > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function encode(lines, tol){
  const out = [];
  for (const l of lines) {
    const s = simplify(l, tol).map(([x, y]) => [Math.round(x * Q), Math.round(y * Q)]).filter((p, i, a) => !i || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    if (s.length < 2) continue;
    const flat = [s[0][0], s[0][1]];
    for (let i = 1; i < s.length; i++) flat.push(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    out.push(flat);
  }
  return JSON.stringify({q: Q, lines: out});
}
const gz = s => zlib.gzipSync(s, {level: 9}).length;
const write = (name, s) => { fs.writeFileSync(path.join(OUT, name), s); return {name, raw: s.length, gz: gz(s)}; };

// county lines: between two counties of the same state (state lines are drawn from the states file)
const counties = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", "us-atlas", "counties-albers-10m.json"), "utf8"));
const cl = mesh(counties, counties.objects.counties, (a, b) => a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0)).coordinates;

// interstates, projected; a segment that leaves the projection's areas is split there
const roads = JSON.parse(fs.readFileSync(roadsFile, "utf8")).features.filter(f => f.properties.sov_a3 === "USA" && f.properties.level === "Interstate");
const il = [];
for (const f of roads) {
  const parts = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const part of parts) { let cur = []; for (const p of part) { const q = proj(p); if (q) cur.push(q); else { if (cur.length > 1) il.push(cur); cur = []; } } if (cur.length > 1) il.push(cur); }
}

// cities: the 300 largest incorporated places, at their Gazetteer points
const csv = fs.readFileSync(popFile, "latin1").split(/\r?\n/), head = csv[0].split(",");
const col = n => head.indexOf(n);
const places = csv.slice(1).map(l => l.split(",")).filter(r => r[col("SUMLEV")] === "162" && ["A", "F"].includes(r[col("FUNCSTAT")]))   // F: a consolidated city's balance (Nashville, Indianapolis, Louisville)
  .map(r => ({geoid: r[col("STATE")] + r[col("PLACE")], name: r[col("NAME")], pop: +r[col("POPESTIMATE2023")]}));
const gazRows = fs.readFileSync(gazFile, "utf8").split(/\r?\n/).map(l => l.split("\t").map(s => s.trim()));
const gh = gazRows[0], gaz = new Map(gazRows.slice(1).filter(r => r.length > 5).map(r => [r[gh.indexOf("GEOID")], {usps: r[gh.indexOf("USPS")], lat: +r[gh.indexOf("INTPTLAT")], lon: +r[gh.indexOf("INTPTLONG")]}]));
// "Nashville-Davidson metropolitan government (balance)" → "Nashville"; "Boise City city" → "Boise";
// "San Buenaventura (Ventura) city" → "Ventura"
const clean = n => n.replace(/\s*\(balance\)$/, "").replace(/\s+(city|town|village|municipality|borough|CDP)$/i, "")
  .replace(/[-/].*(government|county|consolidated).*$/i, "").replace(/^Boise City$/, "Boise").replace(/^Urban /, "").replace(/^.*\((.+)\)$/, "$1").trim();
const cities = [];
for (const p of [...places].sort((a, b) => b.pop - a.pop)) {
  const g = gaz.get(p.geoid); if (!g) continue;
  const q = proj([g.lon, g.lat]); if (!q) continue;
  cities.push([clean(p.name), g.usps, Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10, p.pop]);
  if (cities.length === 300) break;
}

// simplify the line layers until the three files fit the budget together (150 KB gzipped)
const BUDGET = 150 * 1024, citiesJson = JSON.stringify({cities});
let tol = 0.05, files;
for (;;) {
  files = [write("county-lines.json", encode(cl, tol)), write("interstates.json", encode(il, tol * 0.6)), write("cities.json", citiesJson)];
  const total = files.reduce((a, f) => a + f.gz, 0);
  if (total <= BUDGET || tol > 2) break;
  tol *= 1.25;
}
const total = files.reduce((a, f) => a + f.gz, 0);
for (const f of files) console.log(`${f.name.padEnd(18)} ${String(f.raw).padStart(8)} bytes raw ${String(f.gz).padStart(7)} gzipped`);
console.log(`total ${total} bytes gzipped (budget ${BUDGET}); simplified to ${tol.toFixed(3)} plane units (county lines), ${(tol * 0.6).toFixed(3)} (interstates); ${roads.length} interstate features, ${cities.length} cities`);
