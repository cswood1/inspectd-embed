import React, { useId } from "react";

/*
 * The Inspectd AI mark: a small four-point spark in a rounded tile, and optionally the wordmark beside it.
 * One component, so the report card and (in step 3) the sidebar's Inspectd AI workspace look the same.
 */
export function AiMark({ size = 18, label = false, className = "" }){
  const g = "aimark-" + useId().replace(/:/g, "");   // its own gradient, so two marks on a page don't share one
  return (
    <span className={`aimark${label ? " withlabel" : ""}${className ? " " + className : ""}`}>
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <rect x="0.5" y="0.5" width="19" height="19" rx="5" fill={`url(#${g})`} />
        <path d="M10 4.2c.35 2.6 1.6 3.85 4.2 4.2v.05c-2.6.35-3.85 1.6-4.2 4.2h-.05c-.35-2.6-1.6-3.85-4.2-4.2v-.05c2.6-.35 3.85-1.6 4.2-4.2z" fill="#fff" />
        <circle cx="14.6" cy="14.4" r="1.25" fill="#fff" opacity=".85" />
        <defs><linearGradient id={g} x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e6fb8" /><stop offset="1" stopColor="#6d4fd8" /></linearGradient></defs>
      </svg>
      {label ? <b>Inspectd AI</b> : null}
    </span>
  );
}
