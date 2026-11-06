import React, { useEffect, useRef, useState } from "react";
import "./platform.css";
import { usePlatform } from "./PlatformStore.jsx";
import { navCounts } from "./derive.js";
import { Icon, Sk, tint, ToastProvider, DialogProvider, PaneCtx } from "./ui.jsx";
import { Board } from "./Board.jsx";
import { Providers, Customers, Reports } from "./Sections.jsx";
import { Settings } from "./Settings.jsx";

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

const LOAD_MS = 400;   // the mock's stand-in for GET /api/requests, so the skeletons show
let everLoaded = false;   // the first open of the console in this page load waits; later ones paint at once
// The user tile is drawn from the account as it was when the page loaded (shell.js loads it once), so a
// name changed in Settings shows there only after a reload. Mirrored; see docs/platform-iteration-notes.md.
let tileMe = null;

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

function Sidebar({ active, onNav, counts, me, onSignOut }){
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
      {/* Kavin's sidebar ends with a "Client portal" link here. Left out on purpose: the dev bar's tabs
          switch apps, and the ops console should not link into a customer's portal. See the iteration notes. */}
      <div className="side-foot"><UserTile me={me} onSignOut={onSignOut} /></div>
    </aside>
  );
}

export function Console({ onOpenPortal = () => {}, onExit = () => {} }){
  const { rows, me } = usePlatform();
  // the section, and what a link into it carried (?q= for a search, ?open= for a job); seq remounts it
  const [nav, setNav] = useState({section: "jobs", params: {}, seq: 0});
  const section = nav.section;
  const navigate = (k, params = {}) => setNav(n => n.section === k && !Object.keys(params).length && !Object.keys(n.params).length ? n : {section: k, params, seq: n.seq + 1});
  if (!tileMe && me) tileMe = me;
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
  }, [nav.seq]);

  const counts = navCounts(loaded ? rows : []);   // the badges wait for the list, as the sidebar does before it arrives
  return (
    <div className="ip" ref={pane}>
      <ToastProvider><DialogProvider>
        <PaneCtx.Provider value={{ scroller, pane }}>
          <div className="ip-scroll" ref={scroller}>
            <div className="shell">
              <Sidebar active={section} onNav={k => navigate(k)} counts={counts} me={meShown ? tileMe : null} onSignOut={onExit} />
              <main id="outlet">
                {(section === "jobs" || section === "closed") && <Board key={nav.seq} mode={section === "closed" ? "closed" : "open"} loaded={loaded} onRefresh={fetchRows}
                  onOpenPortal={onOpenPortal} initialQ={nav.params.q} initialOpen={nav.params.open} />}
                {section === "providers" && <Providers key={nav.seq} loaded={loaded} />}
                {section === "customers" && <Customers key={nav.seq} loaded={loaded} onNavigate={navigate} />}
                {section === "reports" && <Reports key={nav.seq} loaded={loaded} onNavigate={navigate} onOpenPortal={onOpenPortal} />}
                {section === "settings" && <Settings key={nav.seq} onOpenPortal={onOpenPortal} />}
              </main>
            </div>
          </div>
        </PaneCtx.Provider>
      </DialogProvider></ToastProvider>
    </div>
  );
}
