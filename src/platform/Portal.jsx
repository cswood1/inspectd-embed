import React, { useEffect, useRef, useState } from "react";
import "./portal.css";
import { usePlatform } from "./PlatformStore.jsx";
import { PaneCtx } from "./ui.jsx";
import { Svg, I, SECTIONS, Sk, SkelRows, ReportRows, NoticeProvider, useLoaded } from "./portalUi.jsx";
import { Jobs, NewJob, BulkJobs, Job } from "./PortalJobs.jsx";

/*
 * The client portal: Kavin's inspection-dashboard shell (ui/nav-client) with its workspace switcher,
 * the Overview page, and the job pages (PortalJobs.jsx). Pages switch as view state, not URLs; the
 * page you were on is kept when you go to Operations and come back.
 *
 * .ipp is the pane: the scope for portal.css, and the containing block for the notices, the page dock
 * and the dialogs, so they anchor below the dev bar. .ipp-scroll inside it is what scrolls.
 *
 * Kavin's sidebar ends with an "Operations console" link for Inspectd team accounts. It is left out on
 * purpose (docs/platform-iteration-notes.md): the dev bar switches surfaces, and a customer's portal
 * never links to the ops console.
 */

// path -> sidebar item and page; the same table as nav.js ROUTES
const ROUTES = [
  [/^\/$/, "overview", "overview"],
  [/^\/reports$/, "reports", "reports"],
  [/^\/reports\/([0-9]{8}-[0-9]{6}-[a-f0-9]{6})$/, "reports", "reports"],   // the report viewer is step 5; until then, Reports
  [/^\/jobs$/, "jobs", "jobs"],
  [/^\/jobs\/new$/, "jobs", "new"],
  [/^\/jobs\/bulk$/, "jobs", "bulk"],
  [/^\/jobs\/([0-9a-f]{12})$/, "jobs", "job"],
  [/^\/vehicles$/, "vehicles", "vehicles"],
  [/^\/invoices$/, "invoices", "invoices"],
  [/^\/team$/, "team", "team"],
  [/^\/settings$/, "settings", "settings"],
];
const match = path => ROUTES.find(([re]) => re.test(path));
// kept between visits to the tab: the page, and whether this page load has fetched the account yet
let lastPath = "/", booted = false;

// each step-5 section's heading and intro line, from its view.html
const STUBS = {
  reports: <section className="pad greet"><div className="gt"><h1>Reports</h1><p>Every finished inspection, newest first. Each one comes from the inspector who did the job. Open one for the photos, condition scores and full checklist.</p></div></section>,
  vehicles: <section className="pad"><div className="greet"><div className="gt"><h1>Vehicles</h1><p>Every car you have had inspected, one row each. Open a vehicle to see all of its reports and any inspection still in progress.</p></div></div></section>,
  invoices: <section className="pad"><div className="greet"><div className="gt"><h1>Invoices</h1><p>One invoice per billing period covering every inspection.</p></div></div></section>,
  team: <section className="pad"><div className="greet"><div className="gt"><h1>Team</h1><p>People at your company who can request inspections and read reports.</p></div></div></section>,
  settings: <section className="pad"><div className="greet"><div className="gt"><h1>Settings</h1><p>Your workspace and your account.</p></div></div></section>,
};

/* ---- Overview: the request hero, what you get, and the recent reports ---- */

function Overview({ ctx }){
  const { portal } = usePlatform();
  const loaded = useLoaded();
  const reports = loaded ? portal.reports().reports : [];
  const recent = reports.slice(0, 5);
  const svg = d => `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  return (
    <section id="home" className="pad">
      <div className="greet"><div className="gt"><h1>Overview</h1><p>Your inspection requests and finished reports in one place. Tell us where a car is; we book a mobile inspector and their report lands here.</p></div></div>
      <div className="hero" id="hero">
        <span className="ictile" aria-hidden="true"><Svg src={`<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l2-4h6l2 4"/><path d="M2 9h12v3H2z"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/></svg>`} /></span>
        <b>Request an inspection</b>
        <p>One car or a whole lot. We find a mobile inspector near the vehicle, book them, and post their report to you.</p>
        <button className="btn primary" id="heroBtn" onClick={() => ctx.navigate("/jobs/new")}>New inspection request</button>{" "}
        <button className="btn" id="heroBulk" onClick={() => ctx.navigate("/jobs/bulk")}>Upload a list of cars</button>
      </div>
      <div className="steps">
        <div className="card"><div className="t"><span className="ictile"><Svg src={svg('<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 10l3-3 3 3 2-2 4 4"/><circle cx="11" cy="6" r="1"/>')} /></span>Every photo, full size</div><div className="d">All the inspector's photos in one gallery, at the resolution they were taken.</div></div>
        <div className="card"><div className="t"><span className="ictile"><Svg src={svg('<path d="M3 4h10M3 8h10M3 12h6"/>')} /></span>Issues first</div><div className="d">Anything the inspector flagged is on top, with their note next to it.</div></div>
        <div className="card"><div className="t"><span className="ictile"><Svg src={svg('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 1.5"/>')} /></span>Nothing for you to file</div><div className="d">The inspector uploads through their own link when they finish, so the report appears here on its own.</div></div>
      </div>
      <div className="sechead"><h2>Recent reports</h2><span className="secnote" id="recentNote">{!loaded ? <Sk w={48} h={12} /> : reports.length ? `${reports.length} total` : ""}</span>
        <div className="right"><button className={`btn sm${!loaded || reports.length <= 5 ? " hide" : ""}`} id="allReports" onClick={() => ctx.navigate("/reports")}>All reports</button></div></div>
      <div id="recent">{!loaded ? <SkelRows n={5} /> : recent.length ? <ReportRows rows={recent} onOpen={id => ctx.navigate(`/reports/${id}`)} />
        : <div className="placeholder"><b>No reports yet</b>Request an inspection above; the report arrives here when the inspector is done.</div>}</div>
    </section>
  );
}

/* ---- the sidebar ------------------------------------------------------- */

const ROLE_PILL = {OWNER: "blue", ADMIN: "green", USER: "gray", SUPER: "amber"};

function Sidebar({ active, me, counts, ctx, onSwitch, onSignOut }){
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const outside = () => setOpen(false);
    const t = setTimeout(() => document.addEventListener("click", outside), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", outside); };
  }, [open]);
  const ws = me?.workspaces || [], cur = ws.find(w => w.current) || ws[0], many = ws.length > 1, u = me?.user || {};
  const sub = [u.role_label, u.email].filter(Boolean).join(" · ");
  const go = (e, href) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); ctx.navigate(href); };
  return (
    <aside className="side">
      <div className="wswrap">
        <button className={`brand wsbtn${me && !many ? " static" : ""}`} id="wsBtn" aria-haspopup="menu" aria-expanded={open ? "true" : "false"}
          onClick={e => { if (!me) return; if (!many) { ctx.navigate("/"); return; } e.stopPropagation(); setOpen(o => !o); }}>
          <span className="mark" aria-hidden="true"><Svg src={I.mark} /></span>
          <span className="bt"><b id="brandName">{me && cur ? cur.name : "Inspectd"}</b><span id="brandSub">{!me ? <Sk w={90} h={10} /> : cur ? (cur.role_label || cur.role) + (many ? ` · ${ws.length} workspaces` : "") : (me.account?.name || "")}</span></span>
          <span className="chev" id="wsChev">{me && many ? <Svg src={I.chev} /> : null}</span>
        </button>
        <div className={`wsmenu${open ? "" : " hide"}`} id="wsMenu" role="menu">{me && many ? (<>
          <div className="wshead">Switch workspace</div>
          {ws.map(w => (
            <button key={w.id} className={`wsitem ${w.current ? "on" : ""}`} role="menuitem" data-id={w.id} onClick={e => { e.stopPropagation(); if (w.current) { setOpen(false); return; } onSwitch(w.id); }}>
              <span className="av">{(w.name || "?").trim()[0].toUpperCase()}</span><span className="wt"><b>{w.name}</b><span>{w.slug}</span></span><span className={`pill ${ROLE_PILL[w.role] || "gray"}`}>{w.role_label || w.role}</span>
            </button>))}
        </>) : null}</div>
      </div>
      <button className="btn primary new" id="newReq" onClick={() => ctx.navigate("/jobs/new")}><Svg src={I.plus} />New inspection request</button>
      <nav id="sidenav" aria-label="Sections">
        {SECTIONS.map(([label, items]) => (
          <React.Fragment key={label}>
            <div className="navlabel">{label}</div>
            {items.map(([k, name, href, icon]) => (
              <a key={k} className={`navitem row ${active === k ? "active" : ""}`} href={href} aria-current={active === k ? "page" : "false"} onClick={e => go(e, href)}>
                <Svg src={icon} /><span className="nl">{name}</span>{counts[k] ? <span className="count">{counts[k]}</span> : null}
              </a>))}
          </React.Fragment>
        ))}
      </nav>
      <div className="side-foot" id="sidefoot">{!me
        ? <div className="usertile" aria-busy="true"><Sk w={30} h={30} /><span className="ut"><Sk w={120} h={13} /><span style={{ marginTop: 5 }}><Sk w={90} h={11} /></span></span></div>
        : <div className="usertile"><span className="av">{((u.name || "?").trim()[0] || "?").toUpperCase()}</span><span className="ut"><b>{u.name || ""}</b><span title={sub}>{sub}</span></span>
            <button className="btn icon" id="signout" title="Sign out" aria-label="Sign out" onClick={onSignOut}><Svg src={I.out} /></button></div>}</div>
    </aside>
  );
}

/* ---- the shell --------------------------------------------------------- */

function Shell({ onExit, onReload }){
  const { portal, rows } = usePlatform();
  const [path, setPath] = useState(lastPath);
  const [meReady, setMeReady] = useState(booted), [countsReady, setCountsReady] = useState(booted);
  const pane = useRef(null), scroller = useRef(null), first = useRef(true);
  const navigate = to => { if (to === path) return; lastPath = to; setPath(to); };
  const ctx = { navigate, refreshCounts: () => {} };

  // the account, then the counts: fetched once per page load, as nav.js does
  useEffect(() => {
    if (booted) return;
    const a = setTimeout(() => setMeReady(true), 300), b = setTimeout(() => { booted = true; setCountsReady(true); }, 450);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  // a new page starts at the top, and the reader moves to its heading
  useEffect(() => {
    if (first.current) first.current = false; else scroller.current?.scrollTo(0, 0);
    const t = setTimeout(() => { const h = scroller.current?.querySelector("main h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }, 0);
    return () => clearTimeout(t);
  }, [path]);

  const hit = match(path) || ROUTES[0], [re, active, page] = hit, id = re.exec(path)?.[1];
  const me = meReady ? portal.me() : null;
  const counts = {};
  if (countsReady) {   // refreshCounts: reports, jobs not yet complete, and every distinct car across both
    const rep = portal.reports().reports, jobs = portal.listJobs().requests;
    const vins = new Set([...rep.map(r => (r.vehicle?.vin || "").toUpperCase() || `${r.vehicle?.year}|${r.vehicle?.make}|${r.vehicle?.model}`.toLowerCase()),
                          ...jobs.map(j => (j.form?.vin || "").toUpperCase() || `${j.form?.year}|${j.form?.make}|${j.form?.model}`.toLowerCase())]);
    Object.assign(counts, {reports: rep.length, jobs: jobs.filter(r => r.stage !== "complete").length, vehicles: vins.size});
  }
  void rows;   // the counts and pages re-read the store whenever it changes
  const switchTo = orgId => {
    try { portal.chooseWorkspace(orgId); booted = false; onReload(); }   // Kavin's switcher reloads the page
    catch (e) { /* only an unknown workspace is refused; the menu offers none */ }
  };
  const body = page === "overview" ? <Overview ctx={ctx} />
    : page === "jobs" ? <Jobs key={path} ctx={ctx} />
    : page === "new" ? <NewJob key={path} ctx={ctx} />
    : page === "bulk" ? <BulkJobs key={path} ctx={ctx} />
    : page === "job" ? <Job key={path} id={id} ctx={ctx} />
    : STUBS[page];
  return (
    <div className="ipp" ref={pane}>
      <NoticeProvider>
        <PaneCtx.Provider value={{ scroller, pane }}>
          <div className="ipp-scroll" ref={scroller}>
            <div className="shell">
              <Sidebar active={active} me={me} counts={counts} ctx={ctx} onSwitch={switchTo} onSignOut={onExit} />
              <main id="outlet" key={path}>{body}</main>
            </div>
          </div>
        </PaneCtx.Provider>
      </NoticeProvider>
    </div>
  );
}

export function Portal({ onExit = () => {} }){
  // a reload, as after switching workspace: the shell starts over on the same page
  const [gen, setGen] = useState(0);
  return <Shell key={gen} onExit={onExit} onReload={() => setGen(g => g + 1)} />;
}
