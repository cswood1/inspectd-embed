import React, { useEffect, useRef } from "react";
import "./portal.css";
import { usePlatform } from "./PlatformStore.jsx";
import { PaneCtx } from "./ui.jsx";
import { NoticeProvider } from "./portalUi.jsx";
import { ReportView } from "./ReportView.jsx";
import { JobCard } from "./JobCard.jsx";

/*
 * The two pages a link opens without an account, outside the access gate as /job/:token is:
 *
 *  /r/<token>        the customer's report (inspection-dashboard ui/share-client): the portal's viewer,
 *                    told it is public, under a plain Inspectd bar, in the dark colours of share-client/style.css
 *  /inspect/<token>  the provider's job card (JobCard.jsx): the job behind its one job link, open to every
 *                    provider it was shared with; the first to claim gets it

 */

const Pane = ({ cls, children }) => {
  const pane = useRef(null), scroller = useRef(null);
  useEffect(() => { const t = document.title; return () => { document.title = t; }; }, []);
  return (
    <div style={{ height: "100vh" }}>
      <div className={`ipp ${cls}`} ref={pane}>
        <NoticeProvider><PaneCtx.Provider value={{ scroller, pane }}><div className="ipp-scroll" ref={scroller}>{children}</div></PaneCtx.Provider></NoticeProvider>
      </div>
    </div>
  );
};

/* ---- /r/<token> ---- */

export function SharedReport({ token }){
  const { portal } = usePlatform();
  useEffect(() => { document.title = "Your inspection report · Inspectd"; }, []);
  return (
    <Pane cls="share">
      <header className="sbar"><img className="logo" src="/inspectd-symbol.png" alt="" width="24" height="24" /><b>Inspectd</b><span className="sub">Inspection report</span></header>
      <main className="swrap" id="outlet"><ReportView id={token} isPublic ctx={{ navigate(){}, refreshCounts(){} }} tab={window.location.hash.slice(1)} row={() => portal.shared(token)} /></main>
    </Pane>
  );
}

/* ---- /inspect/<token> ---- */

/* ---- /inspect/<token>: the provider's job card (JobCard.jsx) ---- */

export function InspectPage({ token }){
  useEffect(() => { document.title = "Inspection job · Inspectd"; }, []);
  return (
    <Pane cls="inspect">
      <header className="ibar"><img className="logo" src="/inspectd-symbol.png" alt="" width="24" height="24" /><b>Inspectd</b></header>
      <main className="iwrap jc" id="main"><JobCard token={token} /></main>
    </Pane>
  );
}
