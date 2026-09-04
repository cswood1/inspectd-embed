import React from "react";
import { useOffers, vehicleLine, vinLast6 } from "./OfferStore.jsx";

/*
 * LAYER 1 SCAFFOLD.
 *
 * Deliberately unstyled. This exists to prove routing, seeding, resolution and
 * cross-tab sync before any real UI is built. Layer 2 replaces the body with
 * the Offered and terminal screens; the raw action buttons below go away in
 * layer 3 when claim and decline get their real flows.
 */

const box = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.7,
  padding: 24,
  maxWidth: 720,
  margin: "0 auto",
};

export function JobOffer({ token }) {
  const { resolve, claim, release, now } = useOffers();
  const view = resolve(token);
  const { kind, job, provider, token: tok } = view;

  const secondsLeft =
    tok?.expiresAt && kind === "OFFERED"
      ? Math.max(0, Math.round((Date.parse(tok.expiresAt) - now) / 1000))
      : null;

  return (
    <div style={box}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#64748b" }}>
        LAYER 1 SCAFFOLD — /job/{token}
      </div>

      <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>{kind}</h1>

      {kind === "NOT_FOUND" ? (
        <p style={{ color: "#64748b" }}>No offer matches this token.</p>
      ) : (
        <>
          <div style={{ color: "#334155" }}>
            {vehicleLine(job.vehicle)} · VIN …{vinLast6(job.vehicle.vin)}
          </div>
          <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid #e2e8f0" }} />
          <div>provider     {provider.name}</div>
          <div>job          {job.id}</div>
          <div>job.state    {job.state}</div>
          <div>claimedBy    {String(job.claimedBy)}</div>
          <div>token.state  {tok.state}</div>
          <div>payout       ${job.payout}</div>
          <div>where        {job.city}, {job.state_} {job.zip} (~{job.distanceMi} mi)</div>
          <div>window       {job.window}</div>
          <div>
            requirements {job.service.requirements.length}
            {job.service.evAddendum ? " (incl. EV addendum)" : ""}
          </div>
          {secondsLeft !== null && <div>expires in   {secondsLeft}s</div>}

          <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid #e2e8f0" }} />
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
            SCAFFOLD ACTIONS — replaced in layer 3
          </div>
          <button
            onClick={() => {
              const r = claim(token);
              if (!r.ok) alert("claim failed: " + r.reason);
            }}
            disabled={kind !== "OFFERED"}
            style={{ marginRight: 8, padding: "6px 12px" }}
          >
            claim
          </button>
          <button
            onClick={() => {
              const r = release(token, "TIMING");
              if (!r.ok) alert("release failed: " + r.reason);
            }}
            disabled={kind !== "CLAIMED_BY_YOU"}
            style={{ padding: "6px 12px" }}
          >
            release
          </button>

          <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid #e2e8f0" }} />
          <div style={{ fontSize: 11, color: "#94a3b8" }}>LOG</div>
          {(job.log || []).map((l, i) => (
            <div key={i} style={{ color: "#64748b" }}>
              {new Date(l.at).toLocaleTimeString()} {l.event}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
