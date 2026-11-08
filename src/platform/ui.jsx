import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

/*
 * Ported from inspection-requests/ui/shared/ui.js: vocabulary, formatting, the
 * icon glyphs, skeletons, the custom select, the page dock and the toast. Same
 * markup and class names as Kavin's string templates, so platform.css styles
 * them unchanged; only the DOM plumbing is React.
 */

/* ---- vocabulary ------------------------------------------------ */

// the job's vocabulary lives in jobModel.js; the status pills and the open/closed split are re-exported for the console
export { STATUS, isClosed } from "./jobModel.js";
export const ROLE = {OWNER: ["blue", "Owner"], ADMIN: ["green", "Admin"], USER: ["gray", "User"]};

/* ---- formatting ------------------------------------------------ */

/** When a job came in, short: "2h ago" (or "15m ago") within the last day, else "Nov 6". */
export const received = (iso, now = Date.now()) => {
  const d = new Date(iso); if (isNaN(d)) return "";
  const mins = Math.floor((now - d) / 60e3);
  if (mins < 1440) return mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString("en-US", {month: "short", day: "numeric"});
};
export const fmt = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}); };
export const tint = s => { let h = 0; for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 45% 88%)`; };
export const where = f => [f.city, f.state, f.zip].filter(Boolean).join(", ");
export const vehicle = f => [f.year, f.make, f.model].filter(Boolean).join(" ") || "Vehicle not given";

export const Pill = ({ hue, children, ...rest }) => <span className={`pill ${hue}`} {...rest}>{children}</span>;
// a quiet tag after the vehicle, only for a class worth noticing (EV, Exotic)
export const ClassTag = ({ c }) => c === "ev" || c === "exotic" ? <span className="vtag">{c === "ev" ? "EV" : "Exotic"}</span> : null;

// avatar + name + email cell; `extra` lands after the email
export const Who = ({ name, email, extra = null }) => (
  <div className="who">
    <span className="av" style={{ background: tint(name) }}>{((name || "").trim()[0] || "?").toUpperCase()}</span>
    <span className="tx"><b>{name}</b><span>{email}{extra}</span></span>
  </div>
);

/* ---- paging: 25 rows at a time --------------------------------- */

export const PAGE = 25;
export function paged(list, page = 0, size = PAGE){
  const pages = Math.max(1, Math.ceil(list.length / size)); page = Math.min(Math.max(0, page), pages - 1);
  return {slice: list.slice(page * size, (page + 1) * size), page, pages, start: list.length ? page * size + 1 : 0, end: Math.min(list.length, (page + 1) * size), total: list.length};
}

/* ---- icons: the hand-drawn 16px glyphs from the sprite ---------- */

const s15 = { fill: "none", stroke: "currentColor", strokeWidth: "1.5" };
const rr = { strokeLinecap: "round", strokeLinejoin: "round" };
const GLYPHS = {
  arrow: <path d="M4.5 11.5l7-7M6 4.5h5.5V10" {...s15} {...rr} />,
  x: <path d="M4 4l8 8M12 4l-8 8" {...s15} strokeLinecap="round" />,
  search: <><circle cx="7" cy="7" r="4.25" {...s15} /><path d="M10.2 10.2L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  copy: <><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" {...s15} /><path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" {...s15} /></>,
  refresh: <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" {...s15} {...rr} />,
  trash: <path d="M3 4.5h10M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8" {...s15} {...rr} />,
  pin: <><path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14z" {...s15} strokeLinejoin="round" /><circle cx="8" cy="6.5" r="1.5" {...s15} /></>,
  car: <><path d="M2.5 9.5l1.2-3.6A1.5 1.5 0 0 1 5.1 5h5.8a1.5 1.5 0 0 1 1.4.9l1.2 3.6M2.5 9.5h11v3h-11z" {...s15} strokeLinejoin="round" /><circle cx="5" cy="11" r=".9" fill="currentColor" /><circle cx="11" cy="11" r=".9" fill="currentColor" /></>,
  user: <><circle cx="8" cy="5.5" r="2.75" {...s15} /><path d="M2.75 13.5a5.25 5.25 0 0 1 10.5 0" {...s15} strokeLinecap="round" /></>,
  warn: <><path d="M8 2.5l6 10.5H2z" {...s15} strokeLinejoin="round" /><path d="M8 6.5v3M8 11.6v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  list: <path d="M3 4h10M3 8h10M3 12h6" {...s15} {...rr} />,
  check: <path d="M3 8.5l3 3 7-7" {...s15} {...rr} />,
  doc: <><path d="M4 2h5l3 3v9H4z" {...s15} {...rr} /><path d="M9 2v3h3" {...s15} {...rr} /><path d="M6 9h4M6 11.5h4" {...s15} {...rr} /></>,
  gear: <><circle cx="8" cy="8" r="2.2" {...s15} /><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2" {...s15} strokeLinecap="round" /></>,
  signout: <path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10 5l3 3-3 3M13 8H6.5" {...s15} {...rr} />,
};
// Kavin's icon(name, size): <svg width height><use href="#i-name"/></svg>, the symbol carrying a 16x16 viewBox
export const Icon = ({ name, size = 16, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" {...rest}>{children}{GLYPHS[name]}</svg>
);

/* ---- skeletons -------------------------------------------------- */

export const Sk = ({ w, h = 14, extra = "" }) => <span className={`sk inline ${extra}`} style={{ width: typeof w === "number" ? w + "px" : w, height: h + "px" }} />;

export function SkelRows({ n = 6, heads = [], extraCls = "" }){
  const cols = heads.length || 5;
  const cell = i => i === 0
    ? <td key={i}><div className="who"><Sk w={30} h={30} /><span className="tx"><Sk w={150} h={13} /><span style={{ marginTop: 5 }}><Sk w={110} h={11} /></span></span></div></td>
    : <td key={i}><Sk w={i % 3 === 2 ? 64 : 88} h={i % 3 === 2 ? 19 : 12} /></td>;
  return (
    <table className={`skrows ${extraCls}`} aria-busy="true">
      <thead><tr>{heads.length ? heads.map((h, i) => <th key={i}>{h}</th>) : Array.from({length: cols}, (_, i) => <th key={i}><Sk w={58} h={10} /></th>)}</tr></thead>
      <tbody>{Array.from({length: n}, (_, r) => <tr key={r}>{Array.from({length: cols}, (_, i) => cell(i))}</tr>)}</tbody>
    </table>
  );
}
// what a section shows between the click and its own skeleton: a heading and a table, pulsing
export const SkelSection = () => (
  <><div className="pad greet" aria-busy="true"><div className="gt"><Sk w={180} h={22} /></div></div>
    <div className="pad"><SkelRows n={6} /></div></>
);
export const SkelCards = ({ n = 5 }) => Array.from({length: n}, (_, i) => <div key={i} className="card sk-card" aria-busy="true"><Sk w={86} h={12} /><Sk w={42} h={24} /></div>);

/* ---- toast ------------------------------------------------------ */

/** A passing message. `kind` tints it ("warn" amber, "bad" red); `ms` is how long it stays. */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }){
  const el = useRef(null), timer = useRef(null);
  const toast = useCallback((m, {kind = "", ms = 1800} = {}) => {
    const t = el.current; if (!t) return;
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = m;
    requestAnimationFrame(() => t.classList.add("on"));   // a repeat message should move, not sit there
    clearTimeout(timer.current); timer.current = setTimeout(() => t.classList.remove("on"), ms);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ToastCtx.Provider value={toast}>{children}<div className="toast" ref={el} /></ToastCtx.Provider>;
}

/* ---- dialogs ---------------------------------------------------- */

/**
 * The in-page replacement for the browser's confirm() and prompt(), in the portal's dialog style
 * (portalUi.jsx Dialog, .veil/.dlg). ask({title, input, ok, cancel, danger}) resolves true (OK) or the
 * typed text (with `input`), and null for Cancel, Escape or a click outside, as prompt() returns null.
 * Enter confirms, Tab stays inside, focus goes back to where it was, and Escape closes the dialog only.
 */
const AskCtx = createContext(async () => null);
export const useAsk = () => useContext(AskCtx);
export function DialogProvider({ children }){
  const [dialog, setDialog] = useState(null);
  const seq = useRef(0);
  // each dialog is its own: one asked straight after another (the refund's reason) gets fresh focus and state
  const ask = useCallback(opts => new Promise(resolve => setDialog({...opts, resolve, n: ++seq.current})), []);
  return (<AskCtx.Provider value={ask}>{children}
    {dialog && <Dialog key={dialog.n} {...dialog} onDone={v => { setDialog(null); dialog.resolve(v); }} />}</AskCtx.Provider>);
}
function Dialog({ title, text = "", input = null, ok = "OK", cancel = "Cancel", danger = false, onDone }){
  const veil = useRef(null), field = useRef(null), okBtn = useRef(null), prev = useRef(document.activeElement);
  const done = v => { onDone(v); prev.current?.focus?.(); };
  const value = () => (input ? field.current.value : true);
  useEffect(() => {
    if (input) { field.current.focus(); field.current.select(); } else okBtn.current?.focus();
    const keys = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(null); }   // not the panel's Escape too
      else if (e.key === "Enter" && !(e.target.tagName === "BUTTON" && e.target.id === "dlgCancel")) { e.preventDefault(); e.stopPropagation(); done(value()); }
      else if (e.key === "Tab") {
        const f = [...veil.current.querySelectorAll("input,button")], i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", keys, true);
    return () => document.removeEventListener("keydown", keys, true);
  }, []);
  return (
    <div className="veil" ref={veil} onMouseDown={e => { if (e.target === veil.current) done(null); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
        <h3 id="dlgTitle">{title}</h3>{text ? <p>{text}</p> : null}
        {input ? <label className="dlgf">{input.label ? <span>{input.label}</span> : null}<input id="dlgInput" ref={field} defaultValue={input.value || ""} placeholder={input.placeholder || ""} maxLength={input.maxlength || 300} autoComplete="off" aria-label={input.label ? undefined : title} /></label> : null}
        <div className="acts"><button className="btn" id="dlgCancel" onClick={() => done(null)}>{cancel}</button><button className={`btn ${danger ? "danger" : "primary"}`} id="dlgOk" ref={okBtn} onClick={() => done(value())}>{ok}</button></div>
      </div>
    </div>
  );
}

/* ---- custom select ---------------------------------------------- */

// The design-system select: a button and a menu in place of the browser's control. Kavin's version
// wraps a hidden <select>; here the value lives in React, so only the parts people see are drawn.
const CHEV = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>;
let openSelect = null;   // one menu open at a time, across every select on the page
export const anySelectOpen = () => !!openSelect;

export function CSelect({ value, options, onChange, className = "", label, disabled = false }){
  const [open, setOpen] = useState(false), [up, setUp] = useState(false), [act, setAct] = useState(-1);
  const root = useRef(null), btn = useRef(null), menu = useRef(null);
  const sel = Math.max(0, options.findIndex(o => o.value === value));
  const close = useCallback(() => { setOpen(false); if (openSelect?.root === root) openSelect = null; }, []);
  const doOpen = () => {
    if (openSelect && openSelect.root !== root) openSelect.close();
    openSelect = { root, close }; setAct(sel); setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open || !menu.current || !btn.current) return;
    const r = btn.current.getBoundingClientRect(), h = menu.current.offsetHeight;
    setUp(r.bottom + h + 8 > window.innerHeight && r.top > h + 8);
    menu.current.querySelector(".copt.act")?.scrollIntoView({ block: "nearest" });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (root.current && !root.current.contains(e.target)) close(); };
    // Escape closes an open dropdown and nothing else: the event is marked so the page's own Escape handlers leave it
    const onKey = e => { if (e.key === "Escape") { close(); e.closedASelect = true; } };
    document.addEventListener("click", onDoc); document.addEventListener("keydown", onKey); window.addEventListener("resize", close);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", close); };
  }, [open, close]);
  useEffect(() => () => { if (openSelect?.root === root) openSelect = null; }, []);
  const choose = i => { const changed = i !== sel; close(); btn.current?.focus(); if (changed) onChange(options[i].value); };
  const onKeyDown = e => {
    if (!open) { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); doOpen(); } return; }
    const live = options.map((o, i) => i).filter(i => !options[i].disabled); let idx = live.indexOf(act);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setAct(live[Math.min(live.length - 1, Math.max(0, idx + (e.key === "ArrowDown" ? 1 : -1)))]); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (act >= 0) choose(act); }
    else if (e.key === "Tab") close();
    else if (e.key.length === 1) { const hit = live.find(i => options[i].label.toLowerCase().startsWith(e.key.toLowerCase())); if (hit !== undefined) setAct(hit); }
  };
  useEffect(() => { if (open) menu.current?.querySelector(".copt.act")?.scrollIntoView({ block: "nearest" }); }, [act, open]);
  return (
    <span className="csel-wrap" ref={root}>
      <button type="button" ref={btn} aria-haspopup="listbox" aria-expanded={open ? "true" : "false"} aria-label={label}
        className={`csel ${className}`.trim()} disabled={disabled}
        onClick={e => { e.stopPropagation(); open ? close() : doOpen(); }} onKeyDown={onKeyDown}>
        <span className="csel-t">{options[sel]?.label ?? ""}</span>{CHEV}
      </button>
      <div ref={menu} className={`cmenu${open ? "" : " hide"}${up ? " up" : ""}`} role="listbox">
        {open && options.map((o, i) => (
          <button key={o.value + ":" + i} type="button" role="option" aria-selected={i === sel ? "true" : "false"}
            className={`copt${i === sel ? " on" : ""}${o.disabled ? " dis" : ""}${i === act ? " act" : ""}`}
            onClick={e => { e.stopPropagation(); choose(i); }}>{o.label}</button>
        ))}
      </div>
    </span>
  );
}

/* ---- the paging dock --------------------------------------------- */

/*
 * Floats above the table, and docks into the last row once the page is scrolled to the bottom.
 * Kavin's watches the window; this pane scrolls instead of the window, so the console hands the
 * dock its scroller and the pane, and the dock sets hasdock/--dockpad on the pane as his sets them on body.
 */
export const PaneCtx = createContext({ scroller: { current: null }, pane: { current: null } });

export function PageDock({ pg, onChange, rowSelector }){
  const { scroller, pane } = useContext(PaneCtx);
  const dock = useRef(null), inner = useRef(null), st = useRef({ natW: 0, natH: 0 });
  const on = !!pg && (pg.total > pg.end - pg.start + 1 || pg.pages > 1);
  const rowHeight = () => { const tr = scroller.current?.querySelector(rowSelector); return tr ? Math.round(tr.getBoundingClientRect().height) : 57; };
  const measure = () => { const el = inner.current; if (!el) return; const prev = {w: el.style.width, h: el.style.height};
    el.style.width = "auto"; el.style.height = "auto"; st.current.natW = el.offsetWidth; st.current.natH = el.offsetHeight; el.style.width = prev.w; el.style.height = prev.h; };
  const mode = () => {
    const sc = scroller.current, d = dock.current, el = inner.current; if (!on || !sc || !d || !el) return;
    const scrollable = sc.scrollHeight > sc.clientHeight + 40;
    const atBottom = scrollable && sc.clientHeight + sc.scrollTop >= sc.scrollHeight - 6;
    d.classList.toggle("bar", atBottom);
    if (atBottom) { el.style.width = d.clientWidth + "px"; el.style.height = rowHeight() + "px"; }
    else { el.style.width = st.current.natW + "px"; el.style.height = st.current.natH + "px"; }
  };
  useLayoutEffect(() => {
    const p = pane.current; if (!p) return;
    p.classList.toggle("hasdock", on);
    if (!on) { dock.current?.classList.remove("bar"); return; }
    p.style.setProperty("--dockpad", (rowHeight() - 1) + "px");
    measure(); mode();
  });
  useEffect(() => {
    const sc = scroller.current; if (!sc) return;
    const onScroll = () => requestAnimationFrame(mode), onResize = () => { measure(); mode(); };
    sc.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onResize);
    return () => { sc.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  });
  // leaving a page takes its pager with it, so the next page never inherits a dock it has no rows for
  useEffect(() => () => { pane.current?.classList.remove("hasdock"); }, []);
  const go = d => { onChange(d); scroller.current?.scrollTo({ top: 0 }); };
  return (
    <div className={`pagedock${on ? " on" : ""}`} ref={dock}>
      <div className="dockin" ref={inner}>
        <button className="btn sm" disabled={!on || pg.page === 0} onClick={() => go(-1)}>Prev</button>
        <span className="range">{on ? `${pg.start.toLocaleString("en-US")}–${pg.end.toLocaleString("en-US")} of ${pg.total.toLocaleString("en-US")}` : ""}</span>
        <button className="btn sm" disabled={!on || pg.page >= pg.pages - 1} onClick={() => go(1)}>Next</button>
      </div>
    </div>
  );
}

/* ---- the inline pager, for pages with more than one list (pagerHtml/wirePager) ---- */

export const Pager = ({ p, onChange }) => p.total > PAGE ? (
  <div className="pager"><span>{`${p.start}–${p.end} of ${p.total}`}</span><span className="pbtns">
    <button className="btn sm" disabled={p.page === 0} onClick={() => onChange(-1)}>Prev</button>
    <button className="btn sm" disabled={p.page >= p.pages - 1} onClick={() => onChange(1)}>Next</button></span></div>
) : null;

// a key-value card, pulsing (skelKv)
export const SkelKv = ({ title = "", rows = 3 }) => (
  <div className="kv" aria-busy="true"><h3>{title || <Sk w={96} h={12} />}</h3><dl>
    {Array.from({length: rows}, (_, i) => <React.Fragment key={i}><dt><Sk w={64 + (i % 2) * 18} h={11} /></dt><dd><Sk w={i % 2 ? "42%" : "60%"} h={12} /></dd></React.Fragment>)}
  </dl></div>
);

// flag(on, label, hue): a pill only when it is on
export const flag = (on, label, hue) => on ? <Pill hue={hue}>{label}</Pill> : null;
