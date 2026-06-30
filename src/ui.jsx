import React, { useState } from "react";
import { Info, ShieldCheck } from "lucide-react";
import { DEALER } from "./data.js";

export function CarThumb({ hue = 210, className = "", watermark = false, image }) {
  const [failed, setFailed] = useState(false);
  const showImage = image && !failed;
  return (
    <div
      className={"relative overflow-hidden " + className}
      style={showImage ? undefined : { background: `linear-gradient(160deg, hsl(${hue} 16% 90%), hsl(${hue} 14% 78%))` }}
    >
      {showImage ? (
        <img src={image} alt="" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 240 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="92" width="240" height="28" fill="hsl(0 0% 0% / 0.06)" />
          <path
            d="M30 84 L52 84 C56 70 66 62 84 62 L150 62 C168 62 182 68 196 84 L212 84 C218 84 222 80 220 74 L214 60 C210 52 200 48 188 47 L168 45 C158 40 146 36 130 36 L96 36 C82 36 72 42 62 52 L44 60 C34 63 28 68 26 76 C25 81 26 84 30 84 Z"
            fill={`hsl(${hue} 30% 52%)`}
            opacity="0.9"
          />
          <path d="M92 47 L128 47 C140 47 150 50 158 56 L96 56 C88 56 84 52 92 47 Z" fill="hsl(0 0% 100% / 0.55)" />
          <circle cx="74" cy="84" r="13" fill="#1f2937" />
          <circle cx="74" cy="84" r="6" fill="#9ca3af" />
          <circle cx="176" cy="84" r="13" fill="#1f2937" />
          <circle cx="176" cy="84" r="6" fill="#9ca3af" />
        </svg>
      )}
      {watermark && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-700/90 px-2 py-1 text-[10px] font-semibold text-white">
          {DEALER.name} · {DEALER.phone}
        </div>
      )}
    </div>
  );
}

export function IndependentBadge({ subtle = false }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium " +
        (subtle ? "border-slate-200 bg-white text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-800")
      }
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      Independent inspection
    </span>
  );
}

export function InfoTip({ text, align = "center" }) {
  const [open, setOpen] = useState(false);
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
        aria-label="What is this"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span className={"absolute bottom-7 z-40 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-600 shadow-xl " + pos}>
          {text}
        </span>
      )}
    </span>
  );
}

export function Field({ label, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </label>
  );
}
