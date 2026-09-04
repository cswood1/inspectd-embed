import React, { useEffect } from "react";
import { Search } from "lucide-react";

/*
 * Light primitives for the internal Requests surface.
 *
 * Kept out of ui.jsx on purpose: that module is imported by all four
 * customer-facing surfaces (Dealer, DigitalNative, Wholesale, Inspectd) and
 * shouldn't take on internal-admin chrome. The idiom here matches theirs —
 * slate-200 outlines, slate-300 controls, slate-100 dividers, no resting
 * shadows — so the surfaces still feel like one system.
 *
 * Mint discipline: emerald is for things you can press (the drawer's primary
 * button, the active stat card). Status colour carries its own meaning.
 */

/* ---- helpers ----------------------------------------------- */

function hashCode(s) {
  let h = 0;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// First clipboard write in the repo. Resolves false rather than throwing when
// the API is unavailable (non-secure context, older browser).
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ---- buttons ------------------------------------------------ */

export function Btn({ variant = "default", size = "md", className = "", children, ...rest }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const sizes = {
    // lg is for thumb-sized tap targets on the provider offer route.
    lg: "w-full px-4 py-3 text-[15px]",
    md: "px-3.5 py-2 text-sm",
    sm: "px-2.5 py-1.5 text-xs",
    // icon keeps the board's action column narrow enough for nine columns.
    icon: "h-7 w-7 shrink-0",
  };
  const looks = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    default: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    quiet: "text-slate-500 hover:text-slate-800",
  };
  return (
    <button
      className={base + " " + sizes[size] + " " + (looks[variant] || looks.default) + " " + className}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconBtn({ className = "", children, ...rest }) {
  return (
    <button
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 " +
        className
      }
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---- stat cards --------------------------------------------- */

export function StatCard({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 rounded-lg border px-3.5 py-3 text-left transition " +
        (active
          ? "border-emerald-500 bg-emerald-50/70"
          : "border-slate-200 bg-white hover:border-slate-300")
      }
    >
      <div
        className={
          "text-[13px] font-semibold " + (active ? "text-emerald-800" : "text-slate-500")
        }
      >
        {label}
      </div>
      <div
        className={
          "mt-0.5 text-2xl font-bold tracking-tight " +
          (active ? "text-emerald-900" : "text-slate-900")
        }
      >
        {value}
      </div>
    </button>
  );
}

/* ---- pills --------------------------------------------------- */

const STATUS_TONE = {
  Waiting: "border-slate-200 bg-slate-50 text-slate-700",
  Researching: "border-amber-200 bg-amber-50 text-amber-800",
  Ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export const STATUSES = ["Waiting", "Researching", "Ready"];
export const OUTCOMES = ["Open", "Contacted", "Booked", "Closed"];

export function StatusPill({ status }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
        (STATUS_TONE[status] || STATUS_TONE.Waiting)
      }
    >
      {status}
    </span>
  );
}

export function OutcomePill({ outcome }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
      {outcome}
    </span>
  );
}

/* ---- avatar -------------------------------------------------- */

const AVATAR_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function Avatar({ name }) {
  const letter = String(name || "?").trim().charAt(0).toUpperCase();
  const tone = AVATAR_TONES[hashCode(name) % AVATAR_TONES.length];
  return (
    <span
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold " + tone
      }
    >
      {letter}
    </span>
  );
}

/* ---- inputs -------------------------------------------------- */

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
      />
    </div>
  );
}

// ui.jsx's Field has no focus ring; new controls here get one.
export const CONTROL_CLS =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none";

/* ---- text ---------------------------------------------------- */

export function Eyebrow({ children, className = "" }) {
  return (
    <div
      className={
        "text-[11px] font-semibold uppercase tracking-wide text-slate-400 " + className
      }
    >
      {children}
    </div>
  );
}

// Label-over-value pair for the drawer's request grid.
export function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 break-words text-sm font-medium text-slate-800">
        {children ?? "—"}
      </div>
    </div>
  );
}

export function SectionHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-base font-semibold text-slate-900">{children}</h3>
      {action}
    </div>
  );
}

/* ---- containers ---------------------------------------------- */

export function Empty({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export const TH =
  "px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500";
export const TD = "px-2.5 py-2 text-[13px] text-slate-700";

/*
 * Right slide-over. Follows the repo's existing sheet idiom in Wholesale.jsx:
 * backdrop as a flex sibling rather than an absolute overlay, and `absolute`
 * rather than `fixed` so it stays inside the demo shell. That also means no
 * body-level scroll lock is needed — the surface scrolls internally.
 */
export function Drawer({ open, onClose, width = "w-[640px]", children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex">
      <div onClick={onClose} className="flex-1 bg-slate-900/40" />
      <aside
        className={
          "flex max-w-full flex-col border-l border-slate-200 bg-white shadow-2xl " + width
        }
      >
        {children}
      </aside>
    </div>
  );
}
