import React, { useState } from "react";
import { Ban, CircleSlash, Clock, MapPin, RefreshCw, TriangleAlert } from "lucide-react";
import {
  EV_ADDENDUM,
  TERMINAL_KINDS,
  useOffers,
  vehicleLine,
  vinLast6,
} from "./OfferStore.jsx";
import { Btn, Eyebrow } from "./InternalUI.jsx";
import { ClaimFlow, ReasonSheet } from "./JobOfferFlows.jsx";

/*
 * Provider offer screen for /job/:token.
 *
 * Standalone and mobile-first — a provider opens this from an SMS on a phone,
 * so it is a single narrow column with a sticky action bar rather than the
 * desk-bound layout the internal surfaces use.
 *
 * Terminal screens deliberately show one line and the vehicle summary only.
 * No location, no payout, no requirements: once the offer is off the table the
 * holder of a dead token should not keep seeing the job's details.
 */

/* ---- helpers ------------------------------------------------- */

function countdown(ms) {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TERMINAL_COPY = {
  CLAIMED_BY_ANOTHER: {
    icon: Ban,
    line: "This job has been claimed by another provider.",
  },
  EXPIRED: { icon: Clock, line: "This offer has expired." },
  SUPERSEDED: { icon: RefreshCw, line: "This offer was replaced by a newer one." },
  WITHDRAWN: { icon: CircleSlash, line: "This job was withdrawn by the requestor." },
  DECLINED: { icon: Ban, line: "You declined this job." },
  NOT_FOUND: { icon: TriangleAlert, line: "This link is not valid." },
};

/* ---- chrome -------------------------------------------------- */

function Header({ provider }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        <img src="/inspectd-symbol.png" alt="" className="h-5 w-5" />
        <span className="text-sm font-bold tracking-tight text-slate-900">Inspectd</span>
        {provider && (
          <span className="ml-auto truncate text-xs text-slate-500">{provider.name}</span>
        )}
      </div>
    </header>
  );
}

function VehicleSummary({ vehicle, size = "lg" }) {
  const big = size === "lg";
  return (
    <div>
      <h1
        className={
          "font-bold tracking-tight text-slate-900 " + (big ? "text-2xl" : "text-lg")
        }
      >
        {vehicle.year} {vehicle.make} {vehicle.model}
      </h1>
      {vehicle.trim && (
        <div className={"mt-0.5 text-slate-600 " + (big ? "text-sm" : "text-sm")}>
          {vehicle.trim}
        </div>
      )}
      <div className="mt-1 font-mono text-xs tabular-nums text-slate-500">
        VIN …{vinLast6(vehicle.vin)}
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={"rounded-lg border border-slate-200 bg-white p-4 " + className}>
      {children}
    </div>
  );
}

function RequirementList({ items }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((r) => (
        <li key={r} className="flex items-start gap-2.5 text-sm text-slate-700">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          {r}
        </li>
      ))}
    </ul>
  );
}

/* ---- offered -------------------------------------------------- */

function Offered({ view, onClaim, onDecline }) {
  const { job, token } = view;
  const { now } = useOffers();

  const msLeft = token.expiresAt ? Date.parse(token.expiresAt) - now : null;
  const urgent = msLeft !== null && msLeft < 10 * 60000;

  const base = job.service.requirements.filter((r) => !EV_ADDENDUM.includes(r));
  const ev = job.service.requirements.filter((r) => EV_ADDENDUM.includes(r));

  return (
    <>
      <div className="space-y-3">
        <Card>
          <VehicleSummary vehicle={job.vehicle} />
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <Eyebrow>Payout</Eyebrow>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
              ${job.payout}
            </div>
          </div>
          {msLeft !== null && (
            <div className="text-right">
              <Eyebrow>Expires in</Eyebrow>
              <div
                className={
                  "mt-1 font-mono text-xl font-semibold tabular-nums " +
                  (urgent ? "text-rose-600" : "text-slate-700")
                }
              >
                {countdown(msLeft)}
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <Eyebrow>Location</Eyebrow>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
              {job.city}, {job.state_} {job.zip}
              <span className="text-slate-400">·</span>
              <span className="font-mono tabular-nums text-slate-600">
                ~{job.distanceMi} mi
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Full address is shared once you claim.
            </div>
          </div>
          <div>
            <Eyebrow>Time window</Eyebrow>
            <div className="mt-1 text-sm font-medium text-slate-800">{job.window}</div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-slate-900">{job.service.name}</div>
          <div className="mt-3">
            <Eyebrow>Required</Eyebrow>
            <RequirementList items={base} />
          </div>
          {ev.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <Eyebrow>EV addendum</Eyebrow>
              <RequirementList items={ev} />
            </div>
          )}
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">
          <div className="flex-[2]">
            <Btn variant="primary" size="lg" onClick={onClaim}>
              Claim job
            </Btn>
          </div>
          <div className="flex-1">
            <Btn size="lg" onClick={onDecline}>
              Decline
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- terminal ------------------------------------------------- */

function Terminal({ view }) {
  const { kind, job, token } = view;
  const copy = TERMINAL_COPY[kind] || TERMINAL_COPY.NOT_FOUND;
  const Icon = copy.icon;

  // Release reuses the DECLINED token state; the timestamps tell them apart.
  const line =
    kind === "DECLINED" && token?.releasedAt ? "You released this job." : copy.line;

  return (
    <Card className="text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
      <p className="mt-3 text-sm font-medium text-slate-700">{line}</p>
      {job && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="text-sm font-semibold text-slate-900">
            {vehicleLine(job.vehicle)}
          </div>
          <div className="mt-1 font-mono text-xs tabular-nums text-slate-500">
            VIN …{vinLast6(job.vehicle.vin)}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---- post-claim placeholder (layer 4) ------------------------- */

function PostClaimPlaceholder({ view }) {
  const { kind, job } = view;
  return (
    <Card>
      <VehicleSummary vehicle={job.vehicle} size="sm" />
      <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
        <div className="font-mono text-xs font-semibold tracking-wide text-slate-700">
          {kind}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Post-claim screens land in layer 4.
        </p>
      </div>
    </Card>
  );
}

/* ---- entry ---------------------------------------------------- */

export function JobOffer({ token }) {
  const { resolve, decline } = useOffers();
  const view = resolve(token);
  const [sheet, setSheet] = useState(null); // null | "claim" | "decline"

  const closeSheet = () => setSheet(null);

  return (
    <div className="min-h-screen bg-slate-100 font-inter">
      <Header provider={view.provider} />
      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
        {view.kind === "OFFERED" ? (
          <Offered
            view={view}
            onClaim={() => setSheet("claim")}
            onDecline={() => setSheet("decline")}
          />
        ) : TERMINAL_KINDS.has(view.kind) ? (
          <Terminal view={view} />
        ) : (
          <PostClaimPlaceholder view={view} />
        )}
      </main>

      {/* Sheets sit outside the branch so a claim that loses the race can
          still explain itself over the terminal screen underneath. */}
      <ClaimFlow open={sheet === "claim"} onClose={closeSheet} view={view} token={token} />
      <ReasonSheet
        open={sheet === "decline"}
        onClose={closeSheet}
        title="Decline this job"
        description="Tell us why, so we stop sending you jobs like this one."
        confirmLabel="Decline job"
        onConfirm={(reason, note) => {
          decline(token, reason, note);
          closeSheet();
        }}
      />
    </div>
  );
}
