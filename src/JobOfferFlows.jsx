import React, { useEffect, useState } from "react";
import { FileUp, ShieldCheck, X } from "lucide-react";
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
    // The verified number is the only identity a shared dispatch link carries.
    const r = claim(token, phone);
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

/* ---- submit report ------------------------------------------- */

// datetime-local wants YYYY-MM-DDTHH:mm in local time, not an ISO string.
function localStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const LABEL = "text-[11px] font-semibold uppercase tracking-wide text-slate-400";

/*
 * Full screen rather than a sheet — a PDF plus four fields is too much for a
 * bottom sheet on a phone. Prefills from the previous submission so a
 * resubmission after a revision request is an edit, not a re-entry.
 */
export function SubmitFlow({ job, onCancel, onSubmit }) {
  const prev = job.submission;
  const [pdfName, setPdfName] = useState(prev?.pdfName || "");
  const [odometer, setOdometer] = useState(prev?.odometer || "");
  const [photoCount, setPhotoCount] = useState(prev?.photoCount || "");
  const [completedAt, setCompletedAt] = useState(prev?.completedAt || localStamp());
  const [blockingIssues, setBlockingIssues] = useState(prev?.blockingIssues || "");

  const ready = pdfName && odometer !== "" && photoCount !== "" && completedAt;
  const shortOnPhotos = photoCount !== "" && Number(photoCount) < 100;

  return (
    <div className="space-y-3">
      <button
        onClick={onCancel}
        className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
      >
        Back to job
      </button>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Submit report</h2>
        <p className="mt-1 text-sm text-slate-600">
          Attach the report and confirm what you captured.
        </p>

        <div className="mt-5">
          <div className={LABEL}>Report PDF</div>
          <label className="mt-2 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-emerald-400">
            <FileUp className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
            <span className="mt-2 text-sm font-medium text-slate-700">
              {pdfName || "Choose a PDF"}
            </span>
            <span className="mt-0.5 text-xs text-slate-500">
              {pdfName ? "Tap to replace" : "PDF up to 50 MB"}
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPdfName(file.name);
              }}
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <div className={LABEL}>Odometer</div>
            <input
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder="48210"
              className={FIELD_LG + " mt-2 font-mono tabular-nums"}
            />
          </div>
          <div>
            <div className={LABEL}>Photos</div>
            <input
              inputMode="numeric"
              value={photoCount}
              onChange={(e) => setPhotoCount(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="104"
              className={FIELD_LG + " mt-2 font-mono tabular-nums"}
            />
          </div>
        </div>
        {shortOnPhotos && (
          <p className="mt-2 text-xs text-amber-700">
            This job requires a minimum of 100 photos.
          </p>
        )}

        <div className="mt-4">
          <div className={LABEL}>Completed</div>
          <input
            type="datetime-local"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
            className={FIELD_LG + " mt-2"}
          />
        </div>

        <div className="mt-4">
          <div className={LABEL}>Blocking issues (optional)</div>
          <textarea
            rows={3}
            value={blockingIssues}
            onChange={(e) => setBlockingIssues(e.target.value)}
            placeholder="Anything that stopped you completing a required section"
            className={FIELD_LG + " mt-2 resize-y text-sm"}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Btn
            variant="primary"
            size="lg"
            disabled={!ready}
            onClick={() =>
              onSubmit({
                pdfName,
                odometer: Number(odometer),
                photoCount: Number(photoCount),
                completedAt,
                blockingIssues: blockingIssues.trim(),
              })
            }
          >
            {prev ? "Resubmit report" : "Submit report"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
