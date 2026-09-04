import React, { useState } from "react";
import {
  Ban,
  CircleSlash,
  FileText,
  Mail,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  EV_ADDENDUM,
  TERMINAL_KINDS,
  useOffers,
  vehicleLine,
  vinLast6,
} from "./OfferStore.jsx";
import { formatReceived } from "./OrderStore.jsx";
import { Btn, Eyebrow } from "./InternalUI.jsx";
import { ClaimFlow, ReasonSheet, SubmitFlow } from "./JobOfferFlows.jsx";
import { OfferDevPanel } from "./OfferDevPanel.jsx";
import { useQueryFlag } from "./router.jsx";

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

const mapsUrl = (address) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);

const telHref = (phone) => "tel:" + String(phone).replace(/[^0-9]/g, "");

const TERMINAL_COPY = {
  CLAIMED_BY_ANOTHER: {
    icon: Ban,
    line: "This job has been claimed by another provider.",
  },
  SUPERSEDED: { icon: RefreshCw, line: "This offer was replaced by a newer one." },
  WITHDRAWN: { icon: CircleSlash, line: "This job was withdrawn by the requestor." },
  DECLINED: { icon: Ban, line: "You declined this job." },
  NOT_FOUND: { icon: TriangleAlert, line: "This link is not valid." },
};

const STATE_PILL = {
  CLAIMED_BY_YOU: ["Claimed", "border-emerald-200 bg-emerald-50 text-emerald-800"],
  IN_PROGRESS: ["In progress", "border-amber-200 bg-amber-50 text-amber-800"],
  SUBMITTED: ["Submitted", "border-blue-200 bg-blue-50 text-blue-800"],
  REVISION_REQUESTED: ["Revision requested", "border-rose-200 bg-rose-50 text-rose-800"],
  ACCEPTED: ["Accepted", "border-emerald-200 bg-emerald-50 text-emerald-800"],
  PAID: ["Paid", "border-emerald-200 bg-emerald-50 text-emerald-800"],
};

function StatePill({ kind }) {
  const [label, tone] = STATE_PILL[kind] || STATE_PILL.CLAIMED_BY_YOU;
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
        tone
      }
    >
      {label}
    </span>
  );
}

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
        {vehicle.label || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      </h1>
      {!vehicle.label && vehicle.trim && (
        <div className="mt-0.5 text-sm text-slate-600">{vehicle.trim}</div>
      )}
      {vehicle.vin && (
        <div className="mt-1 font-mono text-xs tabular-nums text-slate-500">
          VIN …{vinLast6(vehicle.vin)}
        </div>
      )}
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

function RequirementList({ items, marker = "dot" }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((r) => (
        <li key={r} className="flex items-start gap-2.5 text-sm text-slate-700">
          {marker === "box" ? (
            <span className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded-[3px] border border-slate-300" />
          ) : (
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          )}
          {r}
        </li>
      ))}
    </ul>
  );
}

function Requirements({ service, marker }) {
  const base = service.requirements.filter((r) => !EV_ADDENDUM.includes(r));
  const ev = service.requirements.filter((r) => EV_ADDENDUM.includes(r));
  return (
    <Card>
      <div className="text-sm font-semibold text-slate-900">{service.name}</div>
      <div className="mt-3">
        <Eyebrow>Required</Eyebrow>
        <RequirementList items={base} marker={marker} />
      </div>
      {ev.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <Eyebrow>EV addendum</Eyebrow>
          <RequirementList items={ev} marker={marker} />
        </div>
      )}
    </Card>
  );
}

function StickyBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">{children}</div>
    </div>
  );
}

/* ---- offered -------------------------------------------------- */

function Offered({ view, onClaim, onDecline }) {
  const { job } = view;

  return (
    <>
      <div className="space-y-3">
        <Card>
          <VehicleSummary vehicle={job.vehicle} />
        </Card>

        <Card>
          <Eyebrow>Payout</Eyebrow>
          <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
            ${job.payout}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <Eyebrow>Location</Eyebrow>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
              {job.city}, {job.state_} {job.zip}
              {job.distanceMi != null && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    ~{job.distanceMi} mi
                  </span>
                </>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Full address is shared once you claim.
            </div>
          </div>
          {job.window && (
            <div>
              <Eyebrow>Time window</Eyebrow>
              <div className="mt-1 text-sm font-medium text-slate-800">{job.window}</div>
            </div>
          )}
        </Card>

        <Requirements service={job.service} />
      </div>

      <StickyBar>
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
      </StickyBar>
    </>
  );
}

/* ---- post-claim ----------------------------------------------- */

function SubmissionSummary({ submission }) {
  if (!submission) return null;
  const rows = [
    ["Report", submission.pdfName],
    ["Odometer", Number(submission.odometer).toLocaleString("en-US")],
    ["Photos", submission.photoCount],
    ["Completed", submission.completedAt?.replace("T", ", ")],
  ];
  return (
    <Card>
      <Eyebrow>Submitted</Eyebrow>
      <dl className="mt-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-6 border-b border-slate-100 py-2 text-sm last:border-b-0"
          >
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium text-slate-800">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      {submission.blockingIssues && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <Eyebrow>Blocking issues</Eyebrow>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {submission.blockingIssues}
          </p>
        </div>
      )}
    </Card>
  );
}

function PostClaim({ view, onStart, onRelease, onSubmit }) {
  const { kind, job } = view;
  const settled = kind === "ACCEPTED" || kind === "PAID";

  return (
    <>
      <div className="space-y-3">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <VehicleSummary vehicle={job.vehicle} size="sm" />
            <StatePill kind={kind} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <Eyebrow>Payout</Eyebrow>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
              ${job.payout}
            </div>
          </div>
          {settled && (
            <div className="text-right text-sm">
              <div className="font-medium text-emerald-700">
                {kind === "PAID" ? "Paid" : "Accepted"}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {kind === "PAID"
                  ? job.paidAt && formatReceived(job.paidAt)
                  : "Payout scheduled"}
              </div>
            </div>
          )}
        </Card>

        {kind === "REVISION_REQUESTED" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <Eyebrow className="!text-rose-500">Revision requested</Eyebrow>
            <p className="mt-1.5 text-sm leading-relaxed text-rose-900">
              {job.revisionNotes || "The reviewer asked for changes."}
            </p>
          </div>
        )}

        {kind === "SUBMITTED" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Report received. Pending review.
          </div>
        )}

        {/* Address and contact only exist once the job is yours. */}
        <Card className="space-y-4">
          <div>
            <Eyebrow>Job site</Eyebrow>
            <div className="mt-1 text-sm font-medium text-slate-800">
              {job.address || `${job.city}, ${job.state_} ${job.zip}`}
            </div>
            <a
              href={mapsUrl(job.address || `${job.city}, ${job.state_} ${job.zip}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
              Navigate
            </a>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <Eyebrow>Scheduling contact</Eyebrow>
            <div className="mt-1 text-sm font-medium text-slate-800">
              {job.contact.name}
            </div>
            {job.contact.phone ? (
              <a
                href={telHref(job.contact.phone)}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-blue-700 hover:text-blue-900"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                {job.contact.phone}
              </a>
            ) : (
              job.contact.email && (
                <a
                  href={"mailto:" + job.contact.email}
                  className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {job.contact.email}
                </a>
              )
            )}
          </div>
          {job.window && (
            <div className="border-t border-slate-100 pt-3">
              <Eyebrow>Time window</Eyebrow>
              <div className="mt-1 text-sm font-medium text-slate-800">{job.window}</div>
            </div>
          )}
        </Card>

        {job.submission && kind !== "REVISION_REQUESTED" && (
          <SubmissionSummary submission={job.submission} />
        )}

        <Requirements service={job.service} marker="box" />
      </div>

      {kind === "CLAIMED_BY_YOU" && (
        <StickyBar>
          <div className="flex-[2]">
            <Btn variant="primary" size="lg" onClick={onStart}>
              Start inspection
            </Btn>
          </div>
          <div className="flex-1">
            <Btn size="lg" onClick={onRelease}>
              Release
            </Btn>
          </div>
        </StickyBar>
      )}

      {kind === "IN_PROGRESS" && (
        <StickyBar>
          <div className="flex-[2]">
            <Btn variant="primary" size="lg" onClick={onSubmit}>
              <FileText className="h-4 w-4" />
              Submit report
            </Btn>
          </div>
          <div className="flex-1">
            <Btn size="lg" onClick={onRelease}>
              Release
            </Btn>
          </div>
        </StickyBar>
      )}

      {kind === "REVISION_REQUESTED" && (
        <StickyBar>
          <Btn variant="primary" size="lg" onClick={onSubmit}>
            <FileText className="h-4 w-4" />
            Resubmit report
          </Btn>
        </StickyBar>
      )}
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
          {job.vehicle.vin && (
            <div className="mt-1 font-mono text-xs tabular-nums text-slate-500">
              VIN …{vinLast6(job.vehicle.vin)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---- entry ---------------------------------------------------- */

export function JobOffer({ token }) {
  const { resolve, decline, release, start, submit } = useOffers();
  const view = resolve(token);
  const [sheet, setSheet] = useState(null); // null | "claim" | "decline" | "release"
  const devMode = useQueryFlag("dev");
  const [submitting, setSubmitting] = useState(false);

  const closeSheet = () => setSheet(null);
  const terminal = TERMINAL_KINDS.has(view.kind);

  // A release or a revision landing while the form is open drops us out of it.
  const inSubmitFlow =
    submitting && (view.kind === "IN_PROGRESS" || view.kind === "REVISION_REQUESTED");

  return (
    <div className="min-h-screen bg-slate-100 font-inter">
      <Header provider={view.provider} />
      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
        {inSubmitFlow ? (
          <SubmitFlow
            job={view.job}
            onCancel={() => setSubmitting(false)}
            onSubmit={(submission) => {
              submit(view.job.id, submission);
              setSubmitting(false);
            }}
          />
        ) : view.kind === "OFFERED" ? (
          <Offered
            view={view}
            onClaim={() => setSheet("claim")}
            onDecline={() => setSheet("decline")}
          />
        ) : terminal ? (
          <Terminal view={view} />
        ) : (
          <PostClaim
            view={view}
            onStart={() => start(view.job.id)}
            onRelease={() => setSheet("release")}
            onSubmit={() => setSubmitting(true)}
          />
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
      <ReasonSheet
        open={sheet === "release"}
        onClose={closeSheet}
        title="Release this job"
        description="The job goes back out to other providers and you will not be able to reclaim it."
        confirmLabel="Release job"
        onConfirm={(reason, note) => {
          release(token, reason, note);
          closeSheet();
        }}
      />

      {devMode && <OfferDevPanel token={token} />}
    </div>
  );
}
