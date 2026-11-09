import React, { useRef, useState } from "react";
import { Svg, I } from "./portalUi.jsx";

/*
 * "Ask about your reports": one bar at the top of Reports, in business workspaces (fleet and dealer). A question goes
 * to /api/ask (api/ask.js) with the workspace, the previous turn and when this browser's seed was built; never report
 * data. The answer shows under the bar, the reports it rests on filter the list below (PortalReports.jsx), and up to
 * three follow-ups carry the question and answer on as context. No mark, no sparkle: one muted line says who answered.
 * docs/platform/decisions.md, "Ask about your reports".
 */

const browserId = () => {
  try {
    let id = localStorage.getItem("inspectd_ask_client");
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("inspectd_ask_client", id); }
    return id;
  } catch { return "anon"; }
};
const MESSAGES = {rate_limited: "That's a lot of questions at once. Try again in a minute.", paused: "Questions are paused for today."};

export function AskBar({ workspace, seededAt, onAnswer, onClear }){
  const [q, setQ] = useState(""), [state, setState] = useState({phase: "idle"});
  const last = useRef(null);   // the previous question and answer, sent with a follow-up
  const run = async (question, previous) => {
    question = question.trim(); if (!question || state.phase === "asking") return;
    setQ(question); setState({phase: "asking", question});
    try {
      const res = await fetch("/api/ask", {method: "POST", headers: {"content-type": "application/json"},
        body: JSON.stringify({question, workspace, previous, seeded_at: seededAt, client: browserId()})});
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.error) { setState({phase: "error", question, previous, message: MESSAGES[body.error] || "Couldn't answer right now."}); return; }
      last.current = {question, answer: body.answer};
      setState({phase: "answered", question, ...body});
      onAnswer({question, refs: body.cited_refs || []});
    } catch { setState({phase: "error", question, previous, message: "Couldn't answer right now."}); }
  };
  const submit = e => { e.preventDefault(); last.current = null; run(q, null); };
  const clear = () => { setQ(""); setState({phase: "idle"}); last.current = null; onClear(); };
  const s = state;
  return (
    <section className="pad askwrap" id="ask">
      <form className="askbar" onSubmit={submit} role="search">
        <Svg src={I.search} />
        <input id="askq" type="text" value={q} maxLength={300} placeholder="Ask about your reports" aria-label="Ask about your reports" autoComplete="off"
          onChange={e => setQ(e.target.value)} disabled={s.phase === "asking"} />
        <button className="btn primary sm" id="askBtn" type="submit" disabled={!q.trim() || s.phase === "asking"}>{s.phase === "asking" ? "Answering…" : "Ask"}</button>
      </form>
      {s.phase === "answered" ? (
        <div className="askanswer" id="askAnswer" aria-live="polite">
          <p className="asktext" id="askText">{s.answer}</p>
          {s.follow_ups?.length ? <div className="askfollow" id="askFollow">{s.follow_ups.map(f => (
            <button key={f} type="button" className="fbtn" onClick={() => run(f, last.current)}>{f}</button>))}</div> : null}
          <p className="askfoot">Answered by Inspectd AI from this workspace's inspection records.</p>
        </div>) : null}
      {s.phase === "error" ? (
        <div className="askanswer" id="askError" role="alert">
          <p className="asktext">{s.message}</p>
          {s.message.startsWith("Couldn't") ? <button type="button" className="linkbtn" id="askRetry" onClick={() => run(s.question, s.previous)}>Try again</button> : null}
        </div>) : null}
      {s.phase === "answered" || s.phase === "error" ? <button type="button" className="linkbtn askclear" id="askClear" onClick={clear}>Clear</button> : null}
    </section>
  );
}
