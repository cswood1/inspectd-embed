import React from "react";
import { ShieldCheck, Check, ChevronRight, X, Lock } from "lucide-react";
import { DEALER, PRICE, usd } from "./data.js";
import { CarThumb, IndependentBadge, InfoTip, Field } from "./ui.jsx";

/* ---- copy ------------------------------------------------------- */

const TIP_VEHICLE = `An independent technician inspects this exact vehicle and delivers a VINsight™ Inspection Report, a standardized condition report with a diagnostic scan. Inspectd does not work for ${DEALER.short}, so the report reads the same whether the news is good or bad.`;
const TIP_GENERIC = `Order a VINsight™ Inspection Report by VIN. The independent third-party technician does not work for the dealer, so the assessment is impartial.`;

/* ---- embed modules (the inserted third-party pieces) ------------ */

// Right-rail module on the VDP, sits in the dealer's CTA stack.
export function VdpInspectdModule({ onOrder }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <IndependentBadge />
        <InfoTip text={TIP_VEHICLE} align="right" />
      </div>
      <div className="text-sm font-semibold text-slate-900">VINsight™ Inspection Report</div>
      <p className="mt-0.5 text-xs text-slate-500">
        Independent third-party condition report on this exact vehicle before you buy.
      </p>
      <button
        onClick={onOrder}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Order VINsight™ Report <ChevronRight className="h-4 w-4" />
      </button>
      <p className="mt-1.5 text-center text-[10px] text-slate-400">
        Provided by Inspectd™. Not affiliated with {DEALER.short}.
      </p>
    </div>
  );
}

// Page-level band above the search results, vehicle-agnostic.
export function SearchInspectdBand({ onOrder }) {
  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <IndependentBadge />
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Considering a vehicle? Get a VINsight™ Inspection Report.
            <span className="ml-1 align-middle">
              <InfoTip text={TIP_GENERIC} align="left" />
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Order a standardized third-party condition report before you buy.
          </p>
        </div>
      </div>
      <button
        onClick={onOrder}
        className="shrink-0 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Order VINsight™ Inspection Report
      </button>
    </div>
  );
}

/* ---- new-tab flow: chrome / landing / order / confirm ----------- */

export function BrowserChrome({ url, onClose, children }) {
  return (
    <div className="flex h-full flex-col bg-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-300" />
          <span className="h-3 w-3 rounded-full bg-slate-300" />
          <span className="h-3 w-3 rounded-full bg-slate-300" />
        </div>
        <div className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs text-slate-500">
          <Lock className="h-3 w-3 text-emerald-600" /> {url}
        </div>
        <button onClick={onClose} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200">
          <X className="h-4 w-4" /> Close tab
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white">{children}</div>
    </div>
  );
}

function InspectdHeader() {
  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">Inspectd™</span>
        </div>
        <span className="text-xs text-slate-400">For {DEALER.short} shoppers</span>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    "You order, and we schedule an independent technician at the vehicle's location.",
    "The technician completes a standardized inspection, including a diagnostic scan.",
    "You get a condition report on this specific VIN, usually within two business days.",
  ];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {i + 1}
          </span>
          <p className="text-sm text-slate-600">{s}</p>
        </div>
      ))}
    </div>
  );
}

export function InspectdLanding({ context, onContinue }) {
  const v = context.vehicle;
  return (
    <div>
      <InspectdHeader />
      <div className="mx-auto max-w-3xl px-5 py-7">
        <IndependentBadge />
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          Know this vehicle's real condition before you buy
        </h1>
        <p className="mt-2 text-slate-600">
          The VINsight™ Inspection Report is an independent condition report delivered by Inspectd. The technician who
          inspects the vehicle does not work for the dealer, so you get the same standardized report whether the news
          is good or bad.
        </p>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <CarThumb hue={v.hue} image={v.image} className="h-16 w-28 rounded" />
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {v.year} {v.make} {v.model} {v.trim}
            </div>
            <div className="text-xs text-slate-500">
              VIN {v.vin} · {v.miles.toLocaleString()} mi · {DEALER.short}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">How it works</h2>
            <HowItWorks />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">What's covered</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              {[
                "Exterior, body, and paint",
                "Interior and electronics",
                "Mechanical and undercarriage",
                "Road test",
                "Diagnostic / OBD scan",
                "Full photo set",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-start justify-between gap-3 rounded-xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center">
          <div>
            <div className="text-2xl font-bold">{usd(PRICE)}</div>
            <div className="text-xs text-slate-400">Representative price. Final price set by market and scope.</div>
          </div>
          <button
            onClick={() => onContinue({ ...context, vin: v.vin })}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Continue to order <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function InspectdOrder({ context, onPlace }) {
  const v = context.vehicle;
  return (
    <div>
      <InspectdHeader />
      <div className="mx-auto max-w-2xl px-5 py-7">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Order your VINsight™ Inspection Report</h1>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Vehicle</span>
            <span className="font-medium text-slate-800">{v.year} {v.make} {v.model}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-500">VIN</span>
            <span className="font-medium text-slate-800">{context.vin}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-500">Location</span>
            <span className="font-medium text-slate-800">{DEALER.address}</span>
          </div>
        </div>

        <div className="mt-5 text-sm font-semibold text-slate-900">Your contact</div>
        <div className="mt-2 space-y-3">
          <Field label="Full name" placeholder="Jordan Reyes" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" placeholder="you@email.com" />
            <Field label="Phone" placeholder="(555) 555-0123" />
          </div>
        </div>

        <div className="mt-5 text-sm font-semibold text-slate-900">Payment</div>
        <div className="mt-2 rounded-lg border border-slate-200 p-3">
          <Field label="Card number" placeholder="4242 4242 4242 4242" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Expiry" placeholder="MM / YY" />
            <Field label="CVC" placeholder="123" />
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
          <Lock className="h-3 w-3" /> Demo only. No payment is processed.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
          <span className="text-sm">Total today</span>
          <span className="text-lg font-bold">{usd(PRICE)}</span>
        </div>
        <button
          onClick={onPlace}
          className="mt-3 w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          Place order
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          By ordering you agree this inspection is independent of {DEALER.short}.
        </p>
      </div>
    </div>
  );
}

export function InspectdConfirm({ context, orderRef, onClose }) {
  const v = context.vehicle;
  return (
    <div>
      <InspectdHeader />
      <div className="mx-auto max-w-xl px-5 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Order placed</h1>
        <p className="mt-1 text-slate-600">Your VINsight™ Inspection Report order is confirmed. Reference {orderRef}.</p>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm">
          {[
            ["Vehicle", `${v.year} ${v.make} ${v.model}`],
            ["VIN", context.vin],
            ["Report", "VINsight™ Inspection Report"],
            ["Independent of", DEALER.name],
          ].map(([k, val]) => (
            <div key={k} className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-800">{val}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-400">
          This is a demo. No inspection has been scheduled and no payment was taken.
        </p>
        <button onClick={onClose} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">
          Close tab
        </button>
      </div>
    </div>
  );
}
