import React, { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { DECLINE_REASONS, useOffers } from "./OfferStore.jsx";
import { Btn } from "./InternalUI.jsx";

/*
 * Interaction flows for the provider offer route.
 *
 * Bottom sheets rather than the right side-over the internal surfaces use —
 * this route is a phone. Follows the repo's sheet idiom otherwise: backdrop as
 * a flex sibling, escape to close, no entry animation.
 */

const FIELD_LG =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none";

function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div onClick={onClose} className="flex-1 bg-slate-900/40" />
      <div className="rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---- claim: phone, then a 6-digit code ----------------------- */

export function ClaimFlow({ open, onClose, view, token }) {
  const { claim } = useOffers();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  // Prefill the number we have on file, and start clean each time it opens.
  useEffect(() => {
    if (!open) return;
    setStep("phone");
    setCode("");
    setPhone(view.provider?.phone || "");
  }, [open, view.provider]);

  // A successful claim flips the view to CLAIMED_BY_YOU and the caller closes
  // the sheet. Only CLAIMED_BY_ANOTHER means we lost the race.
  const lost = view.kind === "CLAIMED_BY_ANOTHER";

  const digits = phone.replace(/\D/g, "");
  const canSend = digits.length >= 10;
  const canVerify = code.length === 6;

  const verify = () => {
    const r = claim(token);
    if (r.ok) onClose();
    // Otherwise the derived view has already flipped and `lost` renders below.
  };

  if (lost) {
    return (
      <Sheet open={open} onClose={onClose} title="Already claimed">
        <p className="text-sm leading-relaxed text-slate-600">
          Another provider claimed this job while you were verifying. Nothing was
          charged to you.
        </p>
        <div className="mt-5">
          <Btn size="lg" onClick={onClose}>
            Close
          </Btn>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === "phone" ? "Verify your phone" : "Enter your code"}
    >
      {step === "phone" ? (
        <>
          <p className="text-sm leading-relaxed text-slate-600">
            We text a code to confirm it is you before assigning the job.
          </p>
          <input
            autoFocus
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
            className={FIELD_LG + " mt-4 font-mono tabular-nums"}
          />
          <div className="mt-5">
            <Btn
              variant="primary"
              size="lg"
              disabled={!canSend}
              onClick={() => setStep("code")}
            >
              Send code
            </Btn>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-slate-600">
            Sent to <span className="font-mono tabular-nums">{phone}</span>.
          </p>
          <input
            autoFocus
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="······"
            className={
              FIELD_LG +
              " mt-4 text-center font-mono text-2xl tracking-[0.4em] tabular-nums"
            }
          />
          <p className="mt-2 text-xs text-slate-500">
            Any 6 digits work in this demo.
          </p>
          <div className="mt-5">
            <Btn variant="primary" size="lg" disabled={!canVerify} onClick={verify}>
              <ShieldCheck className="h-4 w-4" />
              Verify and claim
            </Btn>
          </div>
          <button
            onClick={() => setStep("phone")}
            className="mt-3 w-full text-center text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
          >
            Use a different number
          </button>
        </>
      )}
    </Sheet>
  );
}

/* ---- coded reason: decline now, release in layer 4 ----------- */

export function ReasonSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
}) {
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason(null);
    setNote("");
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {description && (
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      )}
      <div className="mt-4 space-y-2">
        {DECLINE_REASONS.map((r) => (
          <label
            key={r.code}
            className={
              "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition " +
              (reason === r.code
                ? "border-emerald-500 bg-emerald-50 text-slate-900"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
            }
          >
            <input
              type="radio"
              name="reason"
              checked={reason === r.code}
              onChange={() => setReason(r.code)}
              className="h-4 w-4 accent-emerald-600"
            />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything else? (optional)"
        className={FIELD_LG + " mt-3 resize-y text-sm"}
      />
      <div className="mt-5">
        <Btn
          variant="primary"
          size="lg"
          disabled={!reason}
          onClick={() => onConfirm(reason, note.trim())}
        >
          {confirmLabel}
        </Btn>
      </div>
    </Sheet>
  );
}

