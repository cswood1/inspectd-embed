import React, { useState } from "react";
import { AiMark } from "./AiMark.jsx";

/*
 * The Inspectd AI card at the top of the report viewer: the report's insight (tools/report-conversion/insight.py),
 * a short factual summary, the key issues, and the condition flags that are true. It describes the record and
 * nothing more: no recommendations, costs or verdicts (docs/platform/decisions.md). Shown on a business's
 * reports only; the viewer decides that.
 */

const FLAG_LABEL = {
  warning_lights: "Warning lights or codes", prior_repair: "Prior repair or paint", tires: "Tire concerns",
  leaks: "Leaks", rust_corrosion: "Rust or corrosion", structural: "Structural or frame concerns",
};
const TOP = 5;
const short = (t, n = 140) => { const s = String(t || "").trim(); return s.length > n ? s.slice(0, s.lastIndexOf(" ", n - 1) > 60 ? s.lastIndexOf(" ", n - 1) : n - 1) + "…" : s; };

/** insight: the report's insight; thumb(index): the URL of a kept photo's thumbnail, or null; onJump(finding): show it */
export function InsightCard({ insight, thumb, onJump, onPhoto }){
  const [all, setAll] = useState(false);
  if (!insight) return null;
  const key = insight.key_issues || [], shown = all ? key : key.slice(0, TOP);
  const flags = Object.entries(insight.flags || {}).filter(([, f]) => f.value).map(([k]) => k);
  const fails = key.filter(k => k.status === "fail").length, att = key.length - fails;
  return (
    <section className="ai-card" id="aiCard" aria-label="Inspectd AI">
      <header className="ai-head"><AiMark size={20} label /></header>
      {insight.summary?.text ? <p className="ai-sum" id="aiSummary">{insight.summary.text}</p> : null}

      <div className="ai-flags" id="aiFlags">
        {flags.length ? flags.map(k => <span key={k} className={`ai-chip ${k}`}>{FLAG_LABEL[k] || k}</span>)
          : <span className="ai-none">No warning lights, prior repair, leaks or structural concerns found</span>}
      </div>

      <div className="ai-issues">
        <h3>{key.length ? `Key issues · ${[fails ? `${fails} failed` : "", att ? `${att} for attention` : ""].filter(Boolean).join(", ")}` : "Key issues"}</h3>
        {key.length ? (
          <ol id="aiIssues">
            {shown.map(k => {
              const src = k.photo != null ? thumb(k.photo) : null;
              return (
                <li key={k.finding}>
                  <button type="button" className="ai-issue" data-finding={k.finding} onClick={() => onJump(k.finding)} title="Show this finding in the report">
                    <span className={`pill ${k.status === "fail" ? "red" : "amber"}`}>{k.status === "fail" ? "Fail" : "Attention"}</span>
                    <span className="ai-it"><b>{k.item}</b><small>{k.section}</small>{k.note ? <em>{short(k.note)}</em> : null}</span>
                  </button>
                  {src ? <button type="button" className="ai-ph" aria-label={`Photo ${k.photo}`} onClick={() => onPhoto(k.photo)}><img src={src} alt="" /></button> : null}
                </li>
              );
            })}
          </ol>
        ) : <p className="ai-none">Nothing in the checklist was graded fail or attention.</p>}
        {key.length > TOP ? <button type="button" className="linkbtn" id="aiAll" onClick={() => setAll(a => !a)}>{all ? "Show fewer" : `Show all ${key.length}`}</button> : null}
      </div>
    </section>
  );
}
