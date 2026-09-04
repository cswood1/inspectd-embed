import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { NEXT_STATE, useOffers } from "./OfferStore.jsx";
import { navigate } from "./router.jsx";

/*
 * Demo operator panel, behind ?dev=1.
 *
 * Deliberately dark and monospace so it never reads as part of the product —
 * it floats above everything, including the bottom sheets, so the operator can
 * always drive the demo forward.
 */

const REVIEWER_NOTE =
  "Undercarriage photos are underexposed and the OBD scan is missing the freeze-frame data. Please recapture both and resubmit.";

function DevBtn({ tone = "default", className = "", children, ...rest }) {
  const looks = {
    default: "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700",
    primary: "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500",
    danger: "border-rose-900 bg-rose-950 text-rose-300 hover:bg-rose-900",
  };
  return (
    <button
      className={
        "w-full rounded border px-2 py-1.5 text-left text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 " +
        looks[tone] +
        " " +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="truncate text-slate-200">{v}</span>
    </div>
  );
}

export function OfferDevPanel({ token }) {
  const [open, setOpen] = useState(false);
  const {
    state,
    resolve,
    advance,
    requestRevision,
    expireToken,
    withdraw,
    resetAll,
  } = useOffers();

  const view = resolve(token);
  const job = view.job;
  const tok = view.token;
  const next = job ? NEXT_STATE[job.state] : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-[60] rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 shadow-lg hover:bg-slate-800"
      >
        Dev
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[60] w-72 rounded-lg border border-slate-700 bg-slate-900 font-mono text-[11px] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2">
        <span className="font-bold uppercase tracking-[0.14em] text-slate-300">Dev</span>
        <button
          onClick={() => setOpen(false)}
          className="ml-auto text-slate-500 hover:text-slate-200"
          aria-label="Collapse"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1 border-b border-slate-800 px-3 py-2.5">
        <Row k="token" v={token} />
        <Row k="screen" v={view.kind} />
        {job && <Row k="job" v={`${job.id} · ${job.state}`} />}
        {tok && <Row k="token.state" v={tok.state} />}
      </div>

      <div className="space-y-1.5 border-b border-slate-800 px-3 py-2.5">
        <DevBtn tone="primary" disabled={!next} onClick={() => advance(token)}>
          {next ? `Advance → ${next}` : "Advance (dead end)"}
        </DevBtn>
        <DevBtn
          disabled={job?.state !== "SUBMITTED"}
          onClick={() => requestRevision(job.id, REVIEWER_NOTE)}
        >
          Request revision
        </DevBtn>
        <DevBtn
          disabled={!tok || tok.state !== "ACTIVE"}
          onClick={() => expireToken(token)}
        >
          Expire token
        </DevBtn>
        <DevBtn
          disabled={!job || job.state === "WITHDRAWN"}
          onClick={() => withdraw(job.id)}
        >
          Withdraw job
        </DevBtn>
      </div>

      {/* Hopping between tokens by hand means typing six URLs; this is how the
          two-tab claim demo gets set up. */}
      <div className="max-h-44 overflow-y-auto border-b border-slate-800 px-3 py-2.5">
        <div className="mb-1.5 uppercase tracking-[0.14em] text-slate-500">Tokens</div>
        <div className="space-y-1">
          {Object.keys(state.tokens).map((id) => {
            const r = resolve(id);
            const here = id === token;
            return (
              <button
                key={id}
                onClick={() => navigate("/job/" + id + window.location.search)}
                className={
                  "flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left transition " +
                  (here ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60")
                }
              >
                <span className="shrink-0">{id}</span>
                <span className="ml-auto truncate text-[10px] text-slate-500">
                  {r.kind}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-2.5">
        <DevBtn tone="danger" onClick={resetAll}>
          Reset all state
        </DevBtn>
      </div>
    </div>
  );
}
