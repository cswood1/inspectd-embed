import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./portal.css";
import { usePlatform } from "./PlatformStore.jsx";
import { PaneCtx } from "./ui.jsx";
import { Svg, I, SECTIONS, Sk, SkelRows, ReportRows, NoticeProvider, useLoaded } from "./portalUi.jsx";
import { Jobs, NewJob, BulkJobs, Job } from "./PortalJobs.jsx";
import { Reports, Vehicles } from "./PortalReports.jsx";
import { Team, Settings, Invoices } from "./PortalTeam.jsx";
import { ReportView } from "./ReportView.jsx";

/*
 * The client portal: Kavin's inspection-dashboard shell (ui/nav-client) with its workspace switcher,
 * the Overview page, the job pages (PortalJobs.jsx), Reports and Vehicles (PortalReports.jsx), the report
 * viewer (ReportView.jsx), and Team, Settings and Invoices (PortalTeam.jsx). Pages switch as view state, not URLs; the
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
  [/^\/reports\/([0-9]{8}-[0-9]{6}-[a-f0-9]{6})$/, "reports", "report"],
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
let lastPath = "/", booted = false, pending = null;

/** Open the portal at a page, as the console's links do: a report opens in the workspace it is kept in
 *  (a walk-in's, in Inspectd's own), switching to it as Kavin's switcher would, with a reload. */
export function portalAt(path, { report = null } = {}){ pending = {path, report}; }

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
  const navigate = to => { if (to === path) return; lastPath = to; setPath(to); };   // the #hash is kept, as location.hash is in nav.js
  const ctx = { navigate, refreshCounts: () => {}, reload: onReload, signOut: onExit };

  // the account, then the counts: fetched once per page load, as nav.js does
  useEffect(() => {
    if (booted) return;
    const a = setTimeout(() => setMeReady(true), 300), b = setTimeout(() => { booted = true; setCountsReady(true); }, 450);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  // the page is the path without its #hash: a link that only changes the hash stays on the same page
  const [bare, tab = ""] = path.split("#"), hit = match(bare) || ROUTES[0], [re, active, page] = hit, id = re.exec(bare)?.[1];
  // a new page starts at the top, and the reader moves to its heading
  useEffect(() => {
    if (first.current) first.current = false; else scroller.current?.scrollTo(0, 0);
    const t = setTimeout(() => { const h = scroller.current?.querySelector("main h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }, 0);
    return () => clearTimeout(t);
  }, [bare]);

  const me = meReady ? portal.me() : null;
  const counts = {};
  if (countsReady) {   // refreshCounts: reports, jobs still open (not complete or canceled), and every distinct car across both
    const rep = portal.reports().reports, jobs = portal.listJobs().requests;
    const vins = new Set([...rep.map(r => (r.vehicle?.vin || "").toUpperCase() || `${r.vehicle?.year}|${r.vehicle?.make}|${r.vehicle?.model}`.toLowerCase()),
                          ...jobs.map(j => (j.form?.vin || "").toUpperCase() || `${j.form?.year}|${j.form?.make}|${j.form?.model}`.toLowerCase())]);
    Object.assign(counts, {reports: rep.length, jobs: jobs.filter(r => r.stage !== "complete" && r.stage !== "canceled").length, vehicles: vins.size});
  }
  void rows;   // the counts and pages re-read the store whenever it changes
  const switchTo = orgId => {
    try { portal.chooseWorkspace(orgId); booted = false; onReload(); }   // Kavin's switcher reloads the page
    catch (e) { /* only an unknown workspace is refused; the menu offers none */ }
  };
  const body = page === "overview" ? <Overview ctx={ctx} />
    : page === "jobs" ? <Jobs key={bare} ctx={ctx} />
    : page === "new" ? <NewJob key={bare} ctx={ctx} />
    : page === "bulk" ? <BulkJobs key={bare} ctx={ctx} />
    : page === "job" ? <Job key={bare} id={id} ctx={ctx} />
    : page === "reports" ? <Reports key={bare} ctx={ctx} />
    : page === "report" ? <ReportPage key={bare} id={id} tab={tab} ctx={ctx} />
    : page === "vehicles" ? <Vehicles key={bare} ctx={ctx} />
    : page === "team" ? <Team key={bare} ctx={ctx} />
    : page === "settings" ? <Settings key={bare} ctx={ctx} />
    : <Invoices />;
  return (
    <div className="ipp" ref={pane}>
      <NoticeProvider>
        <PaneCtx.Provider value={{ scroller, pane }}>
          <div className="ipp-scroll" ref={scroller}>
            <div className="shell">
              <Sidebar active={active} me={me} counts={counts} ctx={ctx} onSwitch={switchTo} onSignOut={onExit} />
              <main id="outlet" key={bare}>{body}</main>
            </div>
          </div>
        </PaneCtx.Provider>
      </NoticeProvider>
    </div>
  );
}

// /reports/<id>: the viewer, given the row the store keeps (a report from another workspace is "not found")
function ReportPage({ id, tab, ctx }){
  const { portal } = usePlatform();
  return <ReportView id={id} tab={tab} ctx={ctx} row={() => portal.report(id)} />;
}

export function Portal({ onExit = () => {} }){
  const { portal } = usePlatform();
  // a reload, as after switching workspace: the shell starts over on the same page
  const [gen, setGen] = useState(0), [ready, setReady] = useState(!pending);
  useLayoutEffect(() => {   // the console's hand-off: the workspace first, then the page
    if (!pending) return;
    const { path, report } = pending; pending = null;
    const org = report && portal.reportOrg(report);
    if (org && org !== portal.me().account.id) { portal.chooseWorkspace(org); booted = false; }
    lastPath = path; setReady(true); setGen(g => g + 1);
  }, []);
  return ready ? <Shell key={gen} onExit={onExit} onReload={() => setGen(g => g + 1)} /> : null;
}
