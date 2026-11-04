import React, { useEffect, useRef, useState } from "react";
import "./platform.css";
import { usePlatform } from "./PlatformStore.jsx";
import { navCounts } from "./derive.js";
import { Icon, Sk, tint, ToastProvider, PaneCtx } from "./ui.jsx";
import { Board } from "./Board.jsx";

/*
 * The Operations console: Kavin's /dashboard shell (ui/console-client + ui/shared/shell.js).
 * A 260px sidebar beside the page; sections switch as view state, not URLs.
 *
 * .ip is the pane: the scope for platform.css, and the containing block for everything
 * position:fixed (page dock, toast, and the step-2 slide-over and scrim), so those anchor
 * below the dev bar. .ip-scroll inside it is what scrolls.
 */

// key, label, path, icon -- shell.js NAV
export const NAV = [
  ["Operations", [
    ["jobs", "Open jobs", "/dashboard", "list"],
    ["closed", "Closed jobs", "/dashboard/closed", "check"],
    ["providers", "Providers", "/dashboard/providers", "pin"],
    ["customers", "Customers", "/dashboard/customers", "user"],
    ["reports", "Reports", "/dashboard/reports", "doc"],
  ]],
  ["Company", [
    ["settings", "Settings", "/dashboard/settings", "gear"],
  ]],
];

// each section's heading and intro line, from its view.html; their bodies are built in step 3
const STUBS = {
  providers: ["Providers", <>Every inspection shop and mobile inspector the lookup has found so far, across all jobs. Contacted and booked flags carry over from the jobs.</>],
  customers: ["Customers", <>Everyone who has submitted a request, grouped by email. Click a row to see their jobs.</>],
  reports: ["Reports", <>Jobs that reached a booking or were completed. Normalized inspection reports are produced in the <a className="plainlink" href="#" onClick={e => e.preventDefault()}>report dashboard</a> for now; linking them to jobs here is the next step.</>],
  settings: ["Settings", <>Workspaces and their teams, who reaches this console, your own account, and how this deployment is set up.</>],
};

const LOAD_MS = 400;   // the mock's stand-in for GET /api/requests, so the skeletons show
let everLoaded = false;   // the first open of the console in this page load waits; later ones paint at once

function UserTile({ me, onSignOut }){
  const out = <button className="btn icon" title="Sign out" aria-label="Sign out" onClick={onSignOut}><Icon name="signout" size={15} /></button>;
  if (!me) return <div className="usertile" aria-busy="true"><Sk w={30} h={30} /><span className="ut"><Sk w={112} h={12} /><Sk w={84} h={10} /></span>{out}</div>;
  const name = me.name || me.email || "";
  return (
    <div className="usertile">
      <span className="av" style={{ background: tint(name) }}>{(name.trim()[0] || "?").toUpperCase()}</span>
      <span className="ut"><b>{name}</b><span>{`Inspectd team · ${me.email}`}</span></span>
      {out}
    </div>
  );
}

function Sidebar({ active, onNav, counts, me, onOpenPortal, onSignOut }){
  const go = (e, k) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onNav(k); };
  return (
    <aside className="side">
      <a className="brand" href="/dashboard" onClick={e => go(e, "jobs")}><span className="mark"><Icon name="arrow" size={14} /></span><span className="bt"><b>Inspectd</b><span>Operations</span></span></a>
      <nav aria-label="Sections">
        {NAV.map(([label, items]) => (
          <React.Fragment key={label}>
            <div className="navlabel">{label}</div>
            {items.map(([k, name, href, ic]) => (
              <a key={k} className={`navitem ${active === k ? "active" : ""}`} data-k={k} href={href} aria-current={active === k ? "page" : "false"} onClick={e => go(e, k)}>
                <Icon name={ic} /><span>{name}</span><span className={`count${counts[k] ? "" : " hide"}`}>{counts[k] || ""}</span>
              </a>
            ))}
          </React.Fragment>
        ))}
      </nav>
      {/* the way across to the other app: here it switches to the Client portal platform tab */}
      <a className="navitem out" id="portallink" href="#" onClick={e => { e.preventDefault(); onOpenPortal(); }}><Icon name="arrow" /><span>Client portal</span></a>
      <div className="side-foot"><UserTile me={me} onSignOut={onSignOut} /></div>
    </aside>
  );
}

export function Console({ onOpenPortal = () => {}, onExit = () => {} }){
  const { rows, me } = usePlatform();
  const [section, setSection] = useState("jobs");
  const [loaded, setLoaded] = useState(everLoaded);
  const [meShown, setMeShown] = useState(everLoaded);
  const pane = useRef(null), scroller = useRef(null), first = useRef(true), timer = useRef(null);

  // the first open, and Refresh: the list goes back to skeletons for a moment, then repaints
  const fetchRows = () => {
    clearTimeout(timer.current);
    setLoaded(false);
    timer.current = setTimeout(() => { everLoaded = true; setLoaded(true); setMeShown(true); }, LOAD_MS);
  };
  useEffect(() => { if (!everLoaded) fetchRows(); return () => clearTimeout(timer.current); }, []);

  // a new section starts at the top, and the reader moves to its heading, not just the scrollbar
  useEffect(() => {
    if (first.current) { first.current = false; }
    else scroller.current?.scrollTo(0, 0);
    const h = scroller.current?.querySelector("main h1");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }, [section]);

  const counts = navCounts(loaded ? rows : []);   // the badges wait for the list, as the sidebar does before it arrives
  const stub = STUBS[section];
  return (
    <div className="ip" ref={pane}>
      <ToastProvider>
        <PaneCtx.Provider value={{ scroller, pane }}>
          <div className="ip-scroll" ref={scroller}>
            <div className="shell">
              <Sidebar active={section} onNav={setSection} counts={counts} me={meShown ? me : null} onOpenPortal={onOpenPortal} onSignOut={onExit} />
              <main id="outlet">
                {section === "jobs" || section === "closed"
                  ? <Board key={section} mode={section === "closed" ? "closed" : "open"} loaded={loaded} onRefresh={fetchRows} />
                  : <div className="pad greet"><div className="gt"><h1>{stub[0]}</h1><p>{stub[1]}</p></div></div>}
              </main>
            </div>
          </div>
        </PaneCtx.Provider>
      </ToastProvider>
    </div>
  );
}
