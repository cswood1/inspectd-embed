import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSeed, lookupFor, PORTAL, SEED_VERSION, jobRef } from "./seed.js";
import { createAuth, ApiError } from "./authServer.js";

export { ApiError };

/*
 * The platform's request list: the one GET /api/requests answer that every console section (and,
 * from step 4, the client portal) is a view of. In Kavin's apps the server owns it; here it lives
 * in the browser, persisted to one localStorage key so reset() is a single delete.
 *
 * Every write mirrors the server route behind it (apps/requests: store.py, router.py, booking.py,
 * notifications/client.py) and leaves the record exactly as the server would, emails logged and all.
 * Self-contained: OrderStore, OfferStore, RequestStore and SavedStore are untouched.
 */

export const STORAGE_KEY = "inspectd_platform_v1";
const LOOKUP_MS = 4000;   // a real lookup takes one to three minutes; the demo takes about four seconds

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
const b64url = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, "0")).join("").slice(0, n);
const alnum = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62]).join("");

function load(){
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (s && s.version === SEED_VERSION && Array.isArray(s.rows)) return s;
  } catch {
    // unreadable or blocked storage: start from a fresh seed
  }
  return buildSeed();
}
function save(state){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* storage may be unavailable; state stays in memory for the session */ }
}

/* ---- the server's side, as pure functions on a record ------------- */

const SHOP_KEYS = ["name", "phone", "email", "address", "website", "hours"];
// views.shop_card: the contact fields only, and only when there is a name
const shopCard = s => s && (s.name || "").trim() ? Object.fromEntries(SHOP_KEYS.map(k => [k, String(s[k] || "")])) : null;
const veh = (f, none) => [f.year, f.make, f.model].filter(Boolean).join(" ") || none;
const locationString = f => [f.address, f.city, f.state, f.zip].filter(Boolean).join(", ");
const TOLD_ON = ["confirmed", "complete"];
const CANCELED = "This request was canceled; no inspector is booked or linked for it";

// views.public: the link fields the console reads, derived from meta.inspect
function present(r){
  const inspect = r.meta?.inspect || {};
  return {...r, inspect_url: inspect.token ? `${PORTAL}/inspect/${inspect.token}` : null, inspect_shop: shopCard(inspect.shop),
          inspect_claim: inspect.token ? (inspect.claim || {status: "offered", at: inspect.made_at || ""}) : null};
}
// store.update: status, notes, result, a shallow meta merge; a change of stage goes into the history
function update(r, {status, notes, result, meta} = {}){
  const newMeta = {...r.meta, ...(meta || {})};
  const next = status ?? r.status;
  if (next !== r.status) newMeta.history = [...(r.meta?.history || []), {stage: next, at: nowIso()}];
  return present({...r, status: next, notes: notes ?? r.notes, result: result ?? r.result, meta: newMeta, updated_at: nowIso()});
}
// store.set_inspect_token: a fresh link is a fresh offer
const setInspectToken = (r, shop) => update(r, {meta: {inspect: {token: b64url(24), made_at: nowIso(), shop: shop || null, claim: {status: "offered", at: nowIso()}}}});
const mail = (to, subject, extra = {}) => ({to, subject, at: nowIso(), sent: true, id: `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`, ...extra});
const withLog = (r, meta, entry) => entry ? {...(meta || {}), emails: [...(r.meta?.emails || []), entry]} : meta;
const preview = (r, status, meta) => ({...r, status: status || r.status, meta: {...r.meta, ...(meta || {})}});

export function createServer(state){
  const me = state.users.find(u => u.id === state.meId);
  // client.recipient: the workspace account that filed it, else the email on the form
  const recipient = r => ((r.user_id && state.users.find(u => u.id === r.user_id)?.email) || r.form?.email || "").trim();
  // client.status_changed: at most one email, when the stage moves onto confirmed or complete
  const statusChanged = (before, after) => {
    if (after.status === before || !TOLD_ON.includes(after.status)) return null;
    const to = recipient(after); if (!to) return null;
    const v = veh(after.form, "your vehicle"), ref = jobRef(after.id);
    return after.status === "confirmed" ? mail(to, `Inspection confirmed: ${v} (${ref})`, {kind: "confirmed"})
                                        : mail(to, `Inspection report ready: ${v} (${ref})`, {kind: "complete"});
  };
  // router.tell_inspector_canceled: a booked inspector is told a confirmed job is off
  const tellInspectorCanceled = (r, was) => {
    const to = r.meta?.booking?.provider?.email;
    if (was !== "confirmed" || r.status !== "canceled" || !to) return r;
    const f = r.form;
    return update(r, {meta: {emails: [...(r.meta?.emails || []), mail(to, `Inspection canceled: ${veh(f, "a vehicle")} in ${f.city || locationString(f)}`, {kind: "inspector_canceled"})]}});
  };
  const linkShop = r => shopCard(r.meta?.inspect?.shop);

  return {
    // PATCH /api/requests/{id}: status, notes, per-shop flags
    patch(r, body){
      const was = r.status;
      let result = null;
      if (body.shops && r.result) {
        result = {...r.result, shops: r.result.shops.map((s, i) => {
          const flags = body.shops[i]; if (!flags) return s;
          return {...s, ...Object.fromEntries(["contacted", "booked"].filter(k => k in flags).map(k => [k, !!flags[k]]))};
        })};
      }
      let meta = null;
      if (body.status === "canceled" && r.status !== "canceled") meta = {canceled: {at: nowIso(), by: me.name || me.email, by_id: me.id, reason: String(body.reason || "").trim().slice(0, 300)}};
      if (TOLD_ON.includes(body.status) && body.status !== r.status) meta = withLog(r, meta, statusChanged(r.status, preview(r, body.status, meta)));
      return tellInspectorCanceled(update(r, {status: body.status, notes: body.notes, result, meta}), was);
    },
    // POST /api/requests/{id}/booking: who is coming and when; confirmed; the link minted when needed
    book(r, body){
      if (r.status === "canceled") throw new ApiError(CANCELED);
      const provider = Object.fromEntries(SHOP_KEYS.map(k => [k, String(body.provider?.[k] || "").trim()]));
      if (!provider.name) throw new ApiError("Who is doing the inspection? A provider name is required");
      const booking = {provider, inspector: String(body.inspector || "").trim(), scheduled_at: String(body.scheduled_at || "").trim(),
                       note: String(body.note || "").trim(), booked_by: me.name || me.email, booked_at: nowIso()};
      let result = null;
      if (body.shop_index !== undefined && body.shop_index !== null && r.result)   // the shop the team picked is the one marked booked
        result = {...r.result, shops: r.result.shops.map((s, i) => ({...s, booked: i === +body.shop_index}))};
      const current = linkShop(r);
      const changed = current !== null && current.name.trim().toLowerCase() !== provider.name.trim().toLowerCase();
      const minted = !!(body.new_link || changed || !r.meta?.inspect?.token);
      if (minted) r = setInspectToken(r, provider);
      const meta = {booking};
      r = update(r, {status: "confirmed", result, meta: withLog(r, meta, statusChanged(r.status, preview(r, "confirmed", meta)))});
      let email = null;
      if (minted && provider.email) {
        const f = r.form;
        email = mail(provider.email, `Inspection booked: ${veh(f, "a vehicle")} in ${f.city || locationString(f)}`);
        r = update(r, {meta: {emails: [...(r.meta?.emails || []), {...email, kind: "inspector_booking"}]}});
      }
      return {row: r, email};
    },
    // POST /api/requests/{id}/inspect-link: a link for a call-sheet shop, or the booked provider
    makeLink(r, body){
      if (r.status === "canceled") throw new ApiError(CANCELED);
      let shop = null;
      if (body.shop_index !== undefined && body.shop_index !== null) {
        shop = (r.result?.shops || [])[+body.shop_index];
        if (!shop) throw new ApiError("No such shop on this job's call sheet");
      } else shop = body.shop;
      shop = shopCard(shop);
      if (!shop) throw new ApiError("Which shop is this link for? Pick one from the call sheet or give a name");
      const current = linkShop(r);
      return current && current.name.trim().toLowerCase() === shop.name.trim().toLowerCase() ? r : setInspectToken(r, shop);
    },
    // POST /api/requests/{id}/booking/link: a fresh link for the same shop
    newLink(r){
      if (r.status === "canceled") throw new ApiError(CANCELED);
      return setInspectToken(r, linkShop(r));
    },
    // POST /api/requests/{id}/refund: the job's own share refunded, the job canceled, the customer told
    refund(r, body){
      const order = r.meta?.order || {};
      if (r.meta?.refund) throw new ApiError("This job was already refunded");
      if (!order.payment_intent || !order.amount_cents) throw new ApiError("Nothing was paid for this job, so there is nothing to refund");
      const at = nowIso(), by = me.name || me.email;
      const change = {refund: {id: "re_" + alnum(24), status: "succeeded", amount_cents: +order.amount_cents, at, by, by_id: me.id}};
      if (r.status !== "canceled") change.canceled = {at, by, by_id: me.id, reason: String(body.reason || "").trim().slice(0, 300)};
      const to = recipient(r);
      if (to) change.emails = [...(r.meta?.emails || []), mail(to, `Inspection canceled and refunded: ${veh(r.form, "your vehicle")} (${jobRef(r.id)})`, {kind: "refunded"})];
      const was = r.status;
      return tellInspectorCanceled(update(r, {status: "canceled", meta: change}), was);
    },
  };
}

/* ---- the store ------------------------------------------------------ */

const Ctx = createContext(null);

export function PlatformStoreProvider({ children }){
  const [state, setState] = useState(load);
  const live = useRef(state);            // the latest state, so a write that follows another in the same tick sees it
  const timers = useRef(new Map());
  useEffect(() => { save(state); }, [state]);

  const commit = useCallback(fn => { live.current = fn(live.current); setState(live.current); return live.current; }, []);
  const setRows = useCallback(rows => commit(s => ({...s, rows: typeof rows === "function" ? rows(s.rows) : rows})), [commit]);
  const patchRow = useCallback((id, fn) => setRows(rows => rows.map(r => r.id === id ? fn(r) : r)), [setRows]);
  const row = id => live.current.rows.find(r => r.id === id);

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

  /** One server call against the current record: the row it leaves is stored and handed back. */
  const call = useCallback((id, fn) => {
    const r = row(id); if (!r) throw new ApiError("No such request");
    const out = fn(createServer(live.current), r);
    const next = out.row || out;
    patchRow(id, () => next);
    return out;
  }, [patchRow]);
  const api = useMemo(() => ({
    patch: (id, body) => call(id, (s, r) => s.patch(r, body)),
    book: (id, body) => call(id, (s, r) => s.book(r, body)),
    makeLink: (id, body) => call(id, (s, r) => s.makeLink(r, body)),
    newLink: id => call(id, (s, r) => s.newLink(r)),
    refund: (id, body = {}) => call(id, (s, r) => s.refund(r, body)),
    remove: id => { if (!row(id)) throw new ApiError("No such request"); setRows(rows => rows.filter(r => r.id !== id)); },
  }), [call, setRows]);

  // the auth service (authServer.js): reads answer from the latest state; writes store what they leave
  const auth = useMemo(() => {
    const read = name => (...args) => createAuth(live.current)[name](...args);
    const write = name => (...args) => { const { state: next, out } = createAuth(live.current)[name](...args); commit(() => next); return out; };
    return {
      me: read("me"), listOrgs: read("listOrgs"), members: read("members"), supers: read("supers"),
      renameOrg: write("renameOrg"), invite: write("invite"), revokeInvitation: write("revokeInvitation"), setRole: write("setRole"),
      removeMember: write("removeMember"), inviteTeam: write("inviteTeam"), revokeSuper: write("revokeSuper"), updateMe: write("updateMe"),
    };
  }, [commit]);

  const reset = useCallback(() => {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
    commit(() => buildSeed());
  }, [commit]);

  const value = useMemo(() => ({
    rows: state.rows, orgs: state.orgs, users: state.users, me: state.users.find(u => u.id === state.meId), meta: state.meta, seededAt: state.seededAt,
    setRows, fulfill, reset, api, auth,
  }), [state, setRows, fulfill, reset, api, auth]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatform(){
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlatform must be used inside PlatformStoreProvider");
  return v;
}
