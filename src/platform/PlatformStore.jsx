import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSeed, lookupFor } from "./seed.js";

/*
 * The platform's request list: the one GET /api/requests answer that every console section (and,
 * from step 4, the client portal) is a view of. In Kavin's apps the server owns it; here it lives
 * in the browser, persisted to one localStorage key so reset() is a single delete.
 *
 * Writes mirror the server's: fulfill() is POST /api/requests/{id}/fulfill and the lookup that
 * follows (store.set_lookup), so a received job moves to dispatching the moment its lookup starts.
 * Self-contained: OrderStore, OfferStore, RequestStore and SavedStore are untouched.
 */

export const STORAGE_KEY = "inspectd_platform_v1";
const LOOKUP_MS = 4000;   // a real lookup takes one to three minutes; the demo takes about four seconds

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");

function load(){
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (s && s.version === 1 && Array.isArray(s.rows)) return s;
  } catch {
    // unreadable or blocked storage: start from a fresh seed
  }
  return buildSeed();
}
function save(state){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* storage may be unavailable; state stays in memory for the session */ }
}

const Ctx = createContext(null);

export function PlatformStoreProvider({ children }){
  const [state, setState] = useState(load);
  const timers = useRef(new Map());
  useEffect(() => { save(state); }, [state]);

  const setRows = useCallback(rows => setState(s => ({...s, rows: typeof rows === "function" ? rows(s.rows) : rows})), []);
  const patchRow = useCallback((id, fn) => setRows(rows => rows.map(r => r.id === id ? fn(r) : r)), [setRows]);

  // the lookup finishing: a fresh call sheet replaces the old one (the agent's answer, located and sorted)
  const finish = useCallback(id => {
    timers.current.delete(id);
    patchRow(id, r => r.lookup !== "running" ? r : {...r, lookup: "done", error: null, updated_at: nowIso(), result: lookupFor(r, r.updated_at)});
  }, [patchRow]);
  const schedule = useCallback((id, ms) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => finish(id), Math.max(0, ms)));
  }, [finish]);

  /** Start the lookup. Like store.set_lookup("running"): the old call sheet stays until the new one
   *  lands, and a job that was merely received moves to dispatching, stamped in its history. */
  const fulfill = useCallback(id => {
    const at = nowIso();
    patchRow(id, r => {
      if (r.lookup === "running" || r.status === "complete" || r.status === "canceled") return r;
      const moved = r.status === "received";
      const history = r.meta?.history || [];
      return {...r, lookup: "running", error: null, updated_at: at, status: moved ? "dispatching" : r.status,
              meta: {...r.meta, history: moved && !history.some(h => h.stage === "dispatching") ? [...history, {stage: "dispatching", at}] : history}};
    });
    schedule(id, LOOKUP_MS);
  }, [patchRow, schedule]);

  // a lookup still running when the page was left finishes where it would have
  useEffect(() => {
    for (const r of state.rows) if (r.lookup === "running" && !timers.current.has(r.id))
      schedule(r.id, LOOKUP_MS - (Date.now() - new Date(r.updated_at).getTime()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { for (const t of timers.current.values()) clearTimeout(t); }, []);

  const reset = useCallback(() => {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
    setState(buildSeed());
  }, []);

  const value = useMemo(() => ({
    rows: state.rows, orgs: state.orgs, users: state.users, me: state.me, seededAt: state.seededAt,
    setRows, fulfill, reset,
  }), [state, setRows, fulfill, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatform(){
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlatform must be used inside PlatformStoreProvider");
  return v;
}
