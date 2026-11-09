import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import "d3-transition";
import { quadtree } from "d3-quadtree";
import { feature, mesh } from "topojson-client";
import { geoPath } from "d3-geo";
import states from "us-atlas/states-albers-10m.json";
import { ZOOM, URGENCY, METROS, ABBR, positionOf, fitOf, clusterStep, cluster, topStatus, nodeRadius, fanOut, placeLabels, decodeLines } from "./opsMap.js";

/*
 * Open jobs as a map (Board.jsx's "List | Map"): the same jobs, filtered by the same chips and search, drawn on one
 * canvas over a stylized US (us-atlas states, pre-projected; no tiles, no map service, no request to any other host).
 * Zoomed out, jobs close together merge into glowing nodes sized by count; from 8x each job is a pin, jobs at one
 * place fanning out. Hover shows the job; a click opens the board's own job panel. The county lines, interstates and
 * major cities load from public/map the first time the map zooms past 4x. docs/platform/decisions.md, "Open jobs map".
 */

/** The slow, faint pulse on Received marks. Off here turns it off everywhere; it is always off with reduced motion. */
export const PULSE = true;
const PULSE_MS = 3200;
const LABEL = {new: "Received", dispatching: "Dispatching", claimed: "Claimed"};
const FONT = (px, w = 500) => `${w} ${px}px "Geist Variable", -apple-system, BlinkMacSystemFont, sans-serif`;

// the states, once: land, the lines between states, the outline, and each state's label point
const path = geoPath();
const BASE = {
  land: new Path2D(path(feature(states, states.objects.nation))),
  borders: new Path2D(path(mesh(states, states.objects.states, (a, b) => a !== b))),
  states: feature(states, states.objects.states).features.map(f => ({ab: ABBR[f.id], c: path.centroid(f), area: path.area(f)})).filter(s => s.ab),
};

// the lazy layers: fetched once per page load, from the app's own files
let layers = null;
const layerUrl = n => `${import.meta.env.BASE_URL || "/"}map/${n}.json`;
function loadLayers(){
  if (!layers) layers = Promise.all(["county-lines", "interstates", "cities"].map(n => fetch(layerUrl(n)).then(r => { if (!r.ok) throw new Error(n); return r.json(); })))
    .then(([c, i, ci]) => ({counties: toPath(decodeLines(c)), roads: toPath(decodeLines(i)), cities: ci.cities}))
    .catch(() => { layers = null; return null; });
  return layers;
}
function toPath(lines){ const p = new Path2D(); for (const l of lines) { p.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) p.lineTo(l[i], l[i + 1]); } return p; }

export default function OpsMap({ jobs, openId, panelOpen, viewRef, onOpen, onEmptyClick, onShowList, onClearFilters, emptyText }){
  const wrap = useRef(null), canvas = useRef(null), zoomRef = useRef(null);
  const t = useRef(viewRef.current || zoomIdentity), size = useRef({W: 0, H: 0, dpr: 1});
  const frame = useRef(0), marksRef = useRef([]), treeRef = useRef(null), clusterMemo = useRef({key: "", out: []});
  const layerData = useRef(null), colors = useRef(null), hoverRef = useRef(null);
  const [hover, setHover] = useState(null), [list, setList] = useState([]), [height, setHeight] = useState(560);
  const reduced = useMemo(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // jobs on the plane; those without a place are counted, not drawn
  const placed = useMemo(() => jobs.map(j => ({job: j, pos: positionOf(j.form)})), [jobs]);
  const drawn = placed.filter(p => p.pos), missing = placed.length - drawn.length;
  const counts = Object.fromEntries(URGENCY.map(s => [s, drawn.filter(p => p.job.status === s).length]));
  const live = useRef({}); live.current = {drawn, openId, hover};

  /* ---- drawing ---- */
  const request = () => { if (!frame.current) frame.current = requestAnimationFrame(draw); };
  function draw(now = performance.now()){
    frame.current = 0;
    const cv = canvas.current; if (!cv) return;
    const { W, H, dpr } = size.current, g = cv.getContext("2d"), C = colors.current, tr = t.current, k = tr.k;
    const { f, bx, by } = fitOf(W, H), s = f * k, ox = tr.x + k * bx, oy = tr.y + k * by;
    const toScreen = (x, y) => [ox + s * x, oy + s * y];
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = C.page; g.fillRect(0, 0, W, H);
    // the plane: land, then the lazy layers, then state lines and the outline
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    g.fillStyle = C.land; g.fill(BASE.land);
    const L = layerData.current;
    if (L && k >= ZOOM.counties) { g.globalAlpha = Math.min(1, 0.35 + (k - ZOOM.counties) / 6); g.strokeStyle = C.county; g.lineWidth = 0.6 / s; g.stroke(L.counties); g.globalAlpha = 1; }
    if (L && k >= ZOOM.roads) { g.globalAlpha = Math.min(1, 0.4 + (k - ZOOM.roads) / 8); g.strokeStyle = C.road; g.lineWidth = (k >= ZOOM.pins ? 1.1 : 0.8) / s; g.lineJoin = "round"; g.stroke(L.roads); g.globalAlpha = 1; }
    g.strokeStyle = C.state; g.lineWidth = 0.8 / s; g.stroke(BASE.borders);
    g.strokeStyle = C.outline; g.lineWidth = 0.8 / s; g.stroke(BASE.land);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the marks: nodes below the pin zoom (clustered once per step), pins from it
    const { drawn, openId, hover } = live.current;
    let marks;
    if (k < ZOOM.pins) {
      const step = clusterStep(k), key = `${step}|${W}x${H}|${drawn.map(p => p.job.id + p.job.status).join()}`;
      if (clusterMemo.current.key !== key) clusterMemo.current = {key, out: cluster(drawn.map(p => ({job: p.job, x: p.pos.x, y: p.pos.y, approx: p.pos.approx})), f, step)};
      marks = clusterMemo.current.out.map(c => { const [x, y] = toScreen(c.x, c.y); return {type: "node", x, y, jobs: c.jobs, approx: c.approx, px: c.x, py: c.y}; });
    } else {
      marks = fanOut(drawn.map(p => { const [sx, sy] = toScreen(p.pos.x, p.pos.y); return {job: p.job, sx, sy, approx: p.pos.approx}; }));
    }
    const onScreen = m => m.x > -40 && m.x < W + 40 && m.y > -40 && m.y < H + 40;
    marks = marks.filter(onScreen);

    // labels, under the marks: job cities, metro names, state abbreviations, then major cities; nothing overlaps
    const measure = (text, px, w) => { g.font = FONT(px, w); return g.measureText(text).width; };
    const blockers = marks.map(m => m.type === "node" ? [m.x - nodeRadius(m.jobs.length) - 6, m.y - nodeRadius(m.jobs.length) - 6, m.x + nodeRadius(m.jobs.length) + 6, m.y + nodeRadius(m.jobs.length) + 6]
      : [m.x - 8, m.y - 22, m.x + 8, m.y + 2]);
    const cands = [];
    if (k >= ZOOM.pins) { const seen = new Set(); for (const m of marks) { if (m.type !== "pin") continue; const c = m.job.city.replace(/, [A-Z]{2}$/, ""); if (seen.has(c + m.ax)) continue; seen.add(c + m.ax);
      const off = m.fanned ? 15 + 2 * Math.min(m.group, 10) + 12 : 12; cands.push({text: c, x: m.ax + off, y: m.ay - 8, align: "left", size: 12, weight: 500, color: C.muted, kind: "job"}); } }
    if (k >= ZOOM.metrosFrom && k < ZOOM.pins) for (const m of METROS) { const [x, y] = toScreen(m.x, m.y); cands.push({text: m.name, x, y: y + 30, align: "center", size: 12, weight: 600, color: C.muted, kind: "metro"}); }
    if (k < ZOOM.states) for (const st of BASE.states) { if (st.area * s * s < 1400) continue; const [x, y] = toScreen(st.c[0], st.c[1]); cands.push({text: st.ab, x, y, align: "center", size: 11, weight: 500, color: C.faint, kind: "state"}); }
    if (L && k >= ZOOM.cities) { const shown = new Set(cands.map(c => c.text)); for (const [name, , x, y] of L.cities) { if (shown.has(name)) continue; const [sx, sy] = toScreen(x, y);
      if (sx < 0 || sx > W || sy < 0 || sy > H) continue; cands.push({text: name, x: sx, y: sy, align: "center", size: 11, weight: 400, color: C.city, kind: "city", dot: true}); } }
    for (const l of placeLabels(cands, blockers, W, H, measure)) {
      g.font = FONT(l.size, l.weight); g.fillStyle = l.color; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(l.text, l.x0, l.y);
    }

    // glows, then marks; the selected job's pin has an ink ring
    const pulsing = PULSE && !reduced && document.visibilityState === "visible";
    const phase = (now % PULSE_MS) / PULSE_MS;
    let anyPulse = false;
    for (const m of marks.filter(m => m.type === "pin" && m.fanned)) { g.beginPath(); g.moveTo(m.ax, m.ay); g.lineTo(m.x, m.y); g.strokeStyle = C.leader; g.lineWidth = 1; g.stroke(); }
    for (const m of marks.filter(m => m.type === "pin" && m.fanned)) { g.beginPath(); g.arc(m.ax, m.ay, 2, 0, 7); g.fillStyle = C.leaderDot; g.fill(); }
    for (const m of marks) {
      if (m.type === "node") {
        const n = m.jobs.length, r = nodeRadius(n), top = topStatus(m.jobs);
        glow(g, m.x, m.y, r, C.glow[top]);
        if (pulsing && top === "new") { anyPulse = true; pulse(g, m.x, m.y, r, C.mark.new, phase); }
        g.beginPath(); g.arc(m.x, m.y, r, 0, 7);
        if (m.approx) { g.fillStyle = C.white; g.fill(); g.lineWidth = 2; g.strokeStyle = C.mark[top]; g.stroke(); }
        else { g.fillStyle = C.mark[top]; g.fill(); if (top === "claimed") { g.lineWidth = 1; g.strokeStyle = C.white; g.stroke(); } }
        // the mix, as a thin ring of arcs, most urgent first
        if (new Set(m.jobs.map(j => j.status)).size > 1) { let a0 = -Math.PI / 2; for (const st of URGENCY) { const c = m.jobs.filter(j => j.status === st).length; if (!c) continue;
          const a1 = a0 + 2 * Math.PI * c / n; g.beginPath(); g.arc(m.x, m.y, r + 3.5, a0 + 0.07, a1 - 0.07); g.strokeStyle = C.mark[st]; g.lineWidth = 2.2; g.stroke(); a0 = a1; } }
        if (n > 1) { g.font = FONT(n > 99 ? 10 : n > 9 ? 11 : 12, 600); g.fillStyle = m.approx ? C.mark[top] : C.white; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(n), m.x, m.y + 0.5); }
        if (hover && hover.kind === "node" && hover.key === nodeKey(m)) { g.beginPath(); g.arc(m.x, m.y, r + 6.5, 0, 7); g.strokeStyle = C.ink; g.lineWidth = 1.2; g.stroke(); }
      } else {
        const st = m.job.status, sel = m.job.id === openId, hov = hover?.kind === "pin" && hover.id === m.job.id;
        glow(g, m.x, m.y - 13, 6.5, C.glow[st]);
        if (pulsing && st === "new") { anyPulse = true; pulse(g, m.x, m.y - 13, 7, C.mark.new, phase); }
        pin(g, m.x, m.y, C.mark[st], m.approx, sel || hov ? C.ink : C.white, sel ? 2.2 : hov ? 1.6 : (st === "claimed" ? 1.4 : 1.2), C.white);
      }
    }
    marksRef.current = marks;
    treeRef.current = quadtree().x(m => m.x).y(m => m.type === "pin" ? m.y - 13 : m.y).addAll(marks);
    if (anyPulse) frame.current = requestAnimationFrame(draw);
  }

  /* ---- size, colors, zoom ---- */
  useLayoutEffect(() => {
    const fit = () => { const top = wrap.current?.getBoundingClientRect().top ?? 0; setHeight(Math.max(520, Math.round(window.innerHeight - top - 16))); };
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    const cs = getComputedStyle(wrap.current), v = n => cs.getPropertyValue(n).trim();
    colors.current = {page: v("--page"), land: v("--map-land"), state: v("--map-state"), outline: v("--map-outline"), county: v("--map-county"), road: v("--map-road"),
      city: v("--map-city"), muted: v("--muted"), faint: v("--faint"), ink: v("--ink"), white: "#ffffff", leader: v("--map-leader"), leaderDot: v("--map-leader-dot"),
      mark: {new: v("--map-received"), dispatching: v("--map-dispatching"), claimed: v("--map-claimed")},
      glow: {new: v("--map-received-glow"), dispatching: v("--map-dispatching-glow"), claimed: v("--map-claimed-glow")}};
    const cv = canvas.current, sel = select(cv);
    const resize = () => { const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; size.current = {W: r.width, H: r.height, dpr};
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      const { f, bx, by } = fitOf(r.width, r.height), m = 120;
      z.extent([[0, 0], [r.width, r.height]]).translateExtent([[bx - m, by - m], [bx + 975 * f + m, by + 610 * f + m]]);
      request(); };
    const z = d3zoom().scaleExtent([ZOOM.min, ZOOM.max]).clickDistance(4)
      .on("zoom", e => { t.current = e.transform; viewRef.current = e.transform; if (e.transform.k >= ZOOM.layers && !layerData.current) loadLayers().then(d => { if (d) { layerData.current = d; request(); } });
        if (hoverRef.current) { hoverRef.current = null; setHover(null); } request(); })
      .on("end", () => syncList());
    zoomRef.current = z;
    const ro = new ResizeObserver(resize); ro.observe(cv); resize();
    sel.call(z).call(z.transform, t.current);
    if (t.current.k >= ZOOM.layers) loadLayers().then(d => { if (d) { layerData.current = d; request(); } });
    document.fonts?.ready.then(request);
    const vis = () => request(); document.addEventListener("visibilitychange", vis);
    return () => { ro.disconnect(); sel.on(".zoom", null); document.removeEventListener("visibilitychange", vis); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, []);
  useEffect(() => { request(); const id = setTimeout(syncList, 0); return () => clearTimeout(id); }, [jobs, openId]);

  // the accessible list of what's drawn (and where), refreshed when a zoom or pan ends
  function syncList(){
    request();
    requestAnimationFrame(() => setList(marksRef.current.map(m => m.type === "pin"
      ? {kind: "pin", id: m.job.id, ref: m.job.ref, text: `${m.job.vehicle}, ${m.job.ref}, ${m.job.label}, ${m.job.city}`, x: Math.round(m.x), y: Math.round(m.y - 13)}
      : {kind: "node", key: nodeKey(m), text: `${m.jobs.length} jobs: ${URGENCY.filter(s => m.jobs.some(j => j.status === s)).map(s => `${m.jobs.filter(j => j.status === s).length} ${LABEL[s]}`).join(", ")}`, x: Math.round(m.x), y: Math.round(m.y), n: m.jobs.length})));
  }

  /* ---- pointer, click, keys ---- */
  const hitAt = (x, y) => { const m = treeRef.current?.find(x, y, 34); if (!m) return null;
    const cy = m.type === "pin" ? m.y - 13 : m.y, r = m.type === "pin" ? 11 : nodeRadius(m.jobs.length) + 4; return Math.hypot(m.x - x, cy - y) <= r ? m : null; };
  const local = e => { const r = canvas.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onMove = e => {
    const [x, y] = local(e), m = hitAt(x, y);
    canvas.current.style.cursor = m ? "pointer" : "";
    const h = !m ? null : m.type === "pin" ? {kind: "pin", id: m.job.id, job: m.job, approx: m.approx, x: m.x, y: m.y - 26}
      : {kind: "node", key: nodeKey(m), jobs: m.jobs, x: m.x, y: m.y - nodeRadius(m.jobs.length) - 6, here: m.here};
    if ((h?.id || h?.key || null) !== (hoverRef.current?.id || hoverRef.current?.key || null)) { hoverRef.current = h; setHover(h); request(); }
  };
  const onLeave = () => { if (hoverRef.current) { hoverRef.current = null; setHover(null); request(); } };
  const zoomTo = (m) => {
    const z = zoomRef.current, sel = select(canvas.current), { W, H } = size.current, { f, bx, by } = fitOf(W, H);
    const pts = m.jobs.map(j => positionOf(j.form)).filter(Boolean), xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const span = Math.max((x1 - x0) * f / (W * 0.6), (y1 - y0) * f / (H * 0.6), 1e-6);
    const k = Math.min(ZOOM.max, Math.max(t.current.k * 2, Math.min(1 / span, ZOOM.max), m.jobs.length > 1 && x1 - x0 < 0.5 && y1 - y0 < 0.5 ? ZOOM.pins * 1.5 : 0));
    const cx = bx + f * (x0 + x1) / 2, cy = by + f * (y0 + y1) / 2;
    sel.transition().duration(450).call(z.transform, zoomIdentity.translate(W / 2 - k * cx, H / 2 - k * cy).scale(k));
  };
  // a pin the panel would cover pans just clear of it
  const keepClear = (sx) => {
    const r = canvas.current.getBoundingClientRect(), panelW = Math.min(760, window.innerWidth * 0.96), right = window.innerWidth - panelW - 48;
    if (r.left + sx <= right) return;
    const target = r.left + Math.max(60, (window.innerWidth - panelW - r.left) / 2);
    select(canvas.current).transition().duration(350).call(zoomRef.current.translateBy, (target - (r.left + sx)) / t.current.k, 0);
  };
  const onClick = e => {
    const [x, y] = local(e), m = hitAt(x, y);
    if (!m) { onEmptyClick(); return; }
    if (m.type === "node") { zoomTo(m); return; }
    onOpen(m.job.id); keepClear(m.x);
  };
  const openFromList = item => {
    if (item.kind === "pin") { onOpen(item.id); keepClear(item.x); return; }
    const m = marksRef.current.find(x => x.type === "node" && nodeKey(x) === item.key); if (m) zoomTo(m);
  };
  const by = (fn) => { const sel = select(canvas.current).transition().duration(250); fn(sel, zoomRef.current); };
  const onKey = e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const step = 80 / t.current.k, moves = {ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step]};
    if (moves[e.key]) { e.preventDefault(); by((s, z) => s.call(z.translateBy, ...moves[e.key])); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); by((s, z) => s.call(z.scaleBy, 1.6)); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); by((s, z) => s.call(z.scaleBy, 1 / 1.6)); }
    else if (e.key === "0") { e.preventDefault(); select(canvas.current).transition().duration(450).call(zoomRef.current.transform, zoomIdentity); }
  };

  const card = hover && (hover.kind === "pin" ? (
    <div className="mapcard" style={{left: hover.x, top: hover.y}} role="tooltip" id="mapCard">
      <b>{hover.job.vehicle}</b>
      <span className="ln"><i className={`md md-${hover.job.status}`}></i><span className="mono">{hover.job.ref}</span> · {hover.job.label}</span>
      <span className="ln sub">{hover.job.city}</span>
      {hover.approx ? <span className="ln sub">{`Approximate: ${positionOf(hover.job.form)?.stateName || "state"} (ZIP not found)`}</span> : null}
    </div>) : (
    <div className="mapcard" style={{left: hover.x, top: hover.y}} role="tooltip" id="mapCard">
      <b>{`${hover.jobs.length} jobs${hover.here ? " here" : ""}`}</b>
      {URGENCY.filter(s => hover.jobs.some(j => j.status === s)).map(s => <span key={s} className="ln"><i className={`md md-${s}`}></i>{`${hover.jobs.filter(j => j.status === s).length} ${LABEL[s]}`}</span>)}
      <span className="ln sub">Click to zoom in</span>
    </div>));

  return (
    <div className={`opsmap${panelOpen ? " panel" : ""}`} ref={wrap} style={{height}}>
      <canvas ref={canvas} tabIndex={0} aria-label={`Map of open jobs: ${drawn.length} shown. Arrow keys pan, plus and minus zoom, 0 resets.`}
        onPointerMove={onMove} onPointerLeave={onLeave} onClick={onClick} onKeyDown={onKey} aria-describedby="mapList" />
      {card}
      <div className="mapctl">
        <button type="button" id="mapIn" aria-label="Zoom in" onClick={() => by((s, z) => s.call(z.scaleBy, 1.6))}>+</button>
        <button type="button" id="mapOut" aria-label="Zoom out" onClick={() => by((s, z) => s.call(z.scaleBy, 1 / 1.6))}>−</button>
        <button type="button" id="mapReset" className="reset" onClick={() => select(canvas.current).transition().duration(450).call(zoomRef.current.transform, zoomIdentity)}>Reset view</button>
      </div>
      <div className="mapleg" id="mapLegend">
        {URGENCY.map(s => <span key={s} data-status={s}><i className={`md md-${s}`}></i>{LABEL[s]}<b>{counts[s]}</b></span>)}
        {missing ? <button type="button" className="linkbtn" id="mapMissing" onClick={onShowList}>{`${missing} not on the map`}</button> : null}
      </div>
      {!jobs.length ? <div className="mapempty" id="mapEmpty"><b>{emptyText}</b>{onClearFilters ? <button type="button" className="btn sm" onClick={onClearFilters}>Clear filters</button> : null}</div> : null}
      <ul className="maplist" id="mapList" aria-label="Jobs on the map">
        {list.map(it => <li key={it.kind + (it.id || it.key)}><button type="button" tabIndex={-1} data-kind={it.kind} data-ref={it.ref || ""} data-n={it.n || 1} data-x={it.x} data-y={it.y} onClick={() => openFromList(it)}>{it.text}</button></li>)}
      </ul>
    </div>
  );
}

const nodeKey = m => m.jobs.map(j => j.id).sort().join(",");
function glow(g, x, y, r, color){
  const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r * 2.3); gr.addColorStop(0, color); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.3, 0, 7); g.fill();
}
// one slow ring, growing out from the mark and fading
function pulse(g, x, y, r, color, phase){
  const e = 1 - (1 - phase) ** 2;
  g.beginPath(); g.arc(x, y, r * (1.1 + 0.9 * e), 0, 7); g.strokeStyle = color; g.globalAlpha = 0.4 * (1 - phase); g.lineWidth = 1.5; g.stroke(); g.globalAlpha = 1;
}
// a small teardrop with its point at (x, y); hollow when the place is approximate (a state's center)
function pin(g, x, y, col, hollow, edge, edgeW, white){
  g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - 2, y - 5, x - 7, y - 8, x - 7, y - 13); g.arc(x, y - 13, 7, Math.PI, 0); g.bezierCurveTo(x + 7, y - 8, x + 2, y - 5, x, y); g.closePath();
  if (hollow) { g.fillStyle = white; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke(); if (edge !== white) { g.lineWidth = edgeW; g.strokeStyle = edge; g.stroke(); } g.beginPath(); g.arc(x, y - 13, 2.6, 0, 7); g.fillStyle = col; g.fill(); return; }
  g.fillStyle = col; g.fill(); g.lineWidth = edgeW; g.strokeStyle = edge; g.stroke();
  g.beginPath(); g.arc(x, y - 13, 2.6, 0, 7); g.fillStyle = white; g.fill();
}
