import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./tokens.css";
import "./portal.css";
import { usePlatform } from "./PlatformStore.jsx";
import { PaneCtx } from "./ui.jsx";
import { Svg, I, SECTIONS, Sk, NoticeProvider } from "./portalUi.jsx";
import { ROUTES, resolve, isBusiness } from "./portalRoutes.js";
import { Intelligence } from "./PortalIntelligence.jsx";
import { Jobs, NewJob, BulkJobs, Job } from "./PortalJobs.jsx";
import { Reports } from "./PortalReports.jsx";
import { Team, Settings } from "./PortalTeam.jsx";
import { ReportView } from "./ReportView.jsx";

/*
 * The client portal: Kavin's inspection-dashboard shell (ui/nav-client) with its workspace switcher, the job pages
 * (PortalJobs.jsx), Reports (PortalReports.jsx), the report viewer (ReportView.jsx), and Team and Settings
 * (PortalTeam.jsx). Pages switch as view state, not URLs; the page you were on is kept when you go to Operations and
 * come back. Fewer pages than Kavin's: no Overview, Vehicles, Invoices or Inspectd AI page (docs/platform/decisions.md,
 * "Simplicity"); their old paths redirect.
 *
 * .ipp is the pane: the scope for portal.css, and the containing block for the notices, the page dock
 * and the dialogs, so they anchor below the dev bar. .ipp-scroll inside it is what scrolls.
 *
 * Kavin's sidebar ends with an "Operations console" link for Inspectd team accounts. It is left out on
 * purpose (docs/platform-iteration-notes.md): the dev bar switches surfaces, and a customer's portal
 * never links to the ops console.
 */

// the routing table and where the folded pages land: portalRoutes.js
const match = path => ROUTES.find(([re]) => re.test(path));
// kept between visits to the tab: the page, and whether this page load has fetched the account yet
let lastPath = "/", booted = false, pending = null;

/** Open the portal at a page, as the console's links do: a report opens in the workspace it is kept in
 *  (a consumer's, in Inspectd Consumers), switching to it as Kavin's switcher would, with a reload. */
export function portalAt(path, { report = null } = {}){ pending = {path, report}; }

/* ---- the sidebar ------------------------------------------------------- */

function Sidebar({ active, me, ctx, onSwitch, onSignOut }){
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const outside = () => setOpen(false);
    const t = setTimeout(() => document.addEventListener("click", outside), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", outside); };
  }, [open]);
  const ws = me?.workspaces || [], cur = ws.find(w => w.current) || ws[0], many = ws.length > 1, u = me?.user || {};
  const go = (e, href) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); ctx.navigate(href); };
  return (
    <aside className="side">
      <div className="wswrap">
        <button className={`brand wsbtn${me && !many ? " static" : ""}`} id="wsBtn" aria-haspopup="menu" aria-expanded={open ? "true" : "false"}
          onClick={e => { if (!me) return; if (!many) { ctx.navigate("/"); return; } e.stopPropagation(); setOpen(o => !o); }}>
          <span className="bt"><b id="brandName">{me && cur ? cur.name : <Sk w={140} h={14} />}</b></span>
          <span className="chev" id="wsChev">{me && many ? <Svg src={I.chev} /> : null}</span>
        </button>
        <div className={`wsmenu${open ? "" : " hide"}`} id="wsMenu" role="menu">{me && many ? (<>
          <div className="wshead">Switch workspace</div>
          {ws.map(w => (
            <button key={w.id} className={`wsitem ${w.current ? "on" : ""}`} role="menuitem" data-id={w.id} onClick={e => { e.stopPropagation(); if (w.current) { setOpen(false); return; } onSwitch(w.id); }}>
              <span className="wt"><b>{w.name}</b></span><span className="wrole">{w.role_label || w.role}</span>
            </button>))}
        </>) : null}</div>
      </div>
      <button className="btn primary new" id="newReq" onClick={() => ctx.navigate("/jobs/new")}><Svg src={I.plus} />New inspection request</button>
      <nav id="sidenav" aria-label="Sections">
        {SECTIONS.filter(([, , , , business]) => !business || isBusiness(me?.account?.type)).map(([k, name, href, icon]) => (
          <a key={k} className={`navitem row ${active === k ? "active" : ""}`} href={href} aria-current={active === k ? "page" : "false"} onClick={e => go(e, href)}>
            <Svg src={icon} /><span className="nl">{name}</span>
          </a>))}
      </nav>
      <div className="side-foot" id="sidefoot">{!me
        ? <div className="usertile" aria-busy="true"><span className="ut"><Sk w={120} h={13} /><span style={{ marginTop: 5 }}><Sk w={90} h={11} /></span></span></div>
        : <div className="usertile"><span className="ut"><b>{u.name || ""}</b><span title={u.email}>{u.email}</span></span>
            <button className="btn icon" id="signout" title="Sign out" aria-label="Sign out" onClick={onSignOut}><Svg src={I.out} /></button></div>}</div>
    </aside>
  );
}

/* ---- the shell --------------------------------------------------------- */

function Shell({ onExit, onReload }){
  const { portal, rows } = usePlatform();
  const [path0, setPath] = useState(lastPath);
  const [meReady, setMeReady] = useState(booted);
  const type = portal.me().account?.type;
  // "/" and the folded pages land where they now live; an old job link by internal id goes on to the job's reference
  const path = resolve(path0, type, id => { try { return portal.getJob(id).ref; } catch { return ""; } });
  lastPath = path;
  const pane = useRef(null), scroller = useRef(null), first = useRef(true);
  const navigate = to => { if (to === path0) return; lastPath = to; setPath(to); };   // the #hash is kept, as location.hash is in nav.js
  const ctx = { navigate, refreshCounts: () => {}, reload: onReload, signOut: onExit };

  // the account: fetched once per page load, as nav.js does
  useEffect(() => {
    if (booted) return;
    const a = setTimeout(() => { booted = true; setMeReady(true); }, 300);
    return () => clearTimeout(a);
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
  void rows;   // the pages re-read the store whenever it changes
  const switchTo = orgId => {
    try { portal.chooseWorkspace(orgId); booted = false; onReload(); }   // Kavin's switcher reloads the page
    catch (e) { /* only an unknown workspace is refused; the menu offers none */ }
  };
  const body = page === "jobs" ? <Jobs key={bare} ctx={ctx} />
    : page === "new" ? <NewJob key={bare} ctx={ctx} />
    : page === "bulk" ? <BulkJobs key={bare} ctx={ctx} />
    : page === "job" ? <Job key={bare} id={id} ctx={ctx} />
    : page === "reports" ? <Reports key={bare} ctx={ctx} />
    : page === "report" ? <ReportPage key={bare} id={id} tab={tab} ctx={ctx} />
    : page === "intelligence" ? <Intelligence key={bare} ctx={ctx} />
    : page === "team" ? <Team key={bare} ctx={ctx} />
    : page === "settings" ? <Settings key={bare} ctx={ctx} tab={tab} />
    : <Reports key={bare} ctx={ctx} />;
  return (
    <div className="ipp" ref={pane}>
      <NoticeProvider>
        <PaneCtx.Provider value={{ scroller, pane }}>
          <div className="ipp-scroll" ref={scroller}>
            <div className="shell">
              <Sidebar active={active} me={me} ctx={ctx} onSwitch={switchTo} onSignOut={onExit} />
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
