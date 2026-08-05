import React, { useState } from "react";

const SESSION_KEY = "inspectd_demo_access";
const DEFAULT_CODE = "inspectd";

function checkStoredAccess() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function persistAccess() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage may be blocked; the gate still passes for this render.
  }
}

export const gridBg = {
  backgroundColor: "#0b1730",
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
};

export function AccessGate({ children }) {
  const [granted, setGranted] = useState(() => checkStoredAccess());
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  if (granted) return children;

  const expected = import.meta.env.VITE_DEMO_ACCESS_CODE ?? DEFAULT_CODE;

  const onSubmit = (e) => {
    e.preventDefault();
    if (code.trim() === expected) {
      persistAccess();
      setGranted(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-white" style={gridBg}>
      <div className="flex flex-col items-center">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-24 -inset-y-16 rounded-full bg-white/25 blur-3xl"
          />
          <div className="relative flex flex-col items-center">
            <img
              src="/inspectd-symbol.png"
              alt=""
              className="h-24 w-24"
              style={{ filter: "brightness(0)" }}
            />
            <div className="mt-4 text-4xl font-bold tracking-tight text-slate-900">Inspectd</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-14 flex flex-col items-center">
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(false);
            }}
            autoFocus
            placeholder="Access code"
            className={
              "w-56 border-b bg-transparent px-2 py-1.5 text-center text-sm font-medium tracking-wide text-white placeholder:text-slate-500 focus:outline-none transition " +
              (error
                ? "border-red-400/60"
                : "border-white/15 hover:border-white/40 focus:border-white/70")
            }
          />
          {error && (
            <p className="mt-3 text-xs text-red-300">That code isn't right. Try again.</p>
          )}
        </form>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-500">
        Internal demo environment. Not for public distribution.
      </div>
    </div>
  );
}
