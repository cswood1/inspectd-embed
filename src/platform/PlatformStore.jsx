import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildSeed, lookupFor, SEED_VERSION, jobRef } from "./seed.js";
import { createAuth, ApiError } from "./authServer.js";
import { createPortal } from "./portalServer.js";
import { isClosed } from "./jobModel.js";
import { shopKey } from "./derive.js";
import { vehicleName } from "./vehicleName.js";

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
    if (s && s.version === SEED_VERSION && Array.isArray(s.rows)) return withProviders(s);
  } catch {
    // unreadable or blocked storage: start from a fresh seed
  }
  return buildSeed();
}
// provider records arrived after seed 13 without a bump: a stored state without them gets an empty list, and keeps the rest
const withProviders = s => Array.isArray(s.providers) ? s : {...s, providers: []};
function save(state){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* storage may be unavailable; state stays in memory for the session */ }
}

/* ---- the server's side, as pure functions on a record ------------- */

const veh = (f, none) => vehicleName(f) || none;
const locationString = f => [f.address, f.city, f.state, f.zip].filter(Boolean).join(", ");

// store.update: status, notes, result, a shallow meta merge; a change of status goes into the history
function update(r, {status, notes, result, meta} = {}){
  const newMeta = {...r.meta, ...(meta || {})};
  const next = status ?? r.status;
  if (next !== r.status) newMeta.history = [...(r.meta?.history || []), {stage: next, at: nowIso()}];
  return {...r, status: next, notes: notes ?? r.notes, result: result ?? r.result, meta: newMeta, updated_at: nowIso()};
}
const mail = (to, subject, extra = {}) => ({to, subject, at: nowIso(), sent: true, id: `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`, ...extra});
const withMail = (r, entry) => entry ? {...r, meta: {...r.meta, emails: [...(r.meta?.emails || []), entry]}} : r;

export function createServer(state){
  const me = state.users.find(u => u.id === state.meId);
  const who = me.name || me.email;
  // client.recipient: the workspace account that filed it, else the email on the form
  const recipient = r => ((r.user_id && state.users.find(u => u.id === r.user_id)?.email) || r.form?.email || "").trim();
  // the provider who claimed it is told, when they left an email, that a claimed job is off
  const tellClaimer = (r, was) => {
    const to = r.meta?.link?.claim?.email;
    if (was !== "claimed" || !to) return r;
    const f = r.form;
    return withMail(r, mail(to, `Inspection canceled: ${veh(f, "a vehicle")} in ${f.city || locationString(f)}`, {kind: "inspector_canceled"}));
  };
  const cancelChange = reason => ({canceled: {at: nowIso(), by: who, by_id: me.id, reason: String(reason || "").trim().slice(0, 300)}});

  return {
    // PATCH /api/requests/{id}: the team's internal notes
    patch(r, body){
      return update(r, {notes: body.notes});
    },
    // POST /api/requests/{id}/link: the job's one link, open to every provider it is shared with. A New job goes to Dispatching.
    createLink(r){
      if (r.status !== "new") throw new ApiError("A job link can be created while the job is New");
      if (r.meta?.link && !r.meta.link.off_at) throw new ApiError("This job already has a live link");
      const link = {token: b64url(24), created_at: nowIso(), created_by: who, off_at: null, views: [], declines: [], claim: null};
      return update(r, {status: "dispatching", meta: {link}});
    },
    // POST /api/requests/{id}/cancel: stopped, with a reason. A paid job is refunded and the customer told, as before.
    cancel(r, body = {}){
      if (r.status === "canceled") throw new ApiError("This job is already canceled");
      if (r.status === "complete") throw new ApiError("A complete job can't be canceled");
      const order = r.meta?.order || {};
      if (order.payment_intent && order.amount_cents && !r.meta?.refund) return this.refund(r, body);
      const was = r.status;
      return tellClaimer(update(r, {status: "canceled", meta: cancelChange(body.reason)}), was);
    },
    // POST /api/requests/{id}/reset: a canceled job goes back to New. Its link is turned off (the page says the job is
    // no longer available) and kept with the job; the provider results stay, so it can be dispatched again.
    reset(r){
      if (r.status !== "canceled") throw new ApiError("Only a canceled job can be reset");
      const at = nowIso(), link = r.meta?.link;
      const meta = {link: null, resets: [...(r.meta?.resets || []), {at, by: who, by_id: me.id, canceled: r.meta?.canceled || null}], canceled: null,
                    past_links: link ? [...(r.meta?.past_links || []), {...link, off_at: at}] : (r.meta?.past_links || [])};
      return update(r, {status: "new", meta});
    },
    // POST /api/requests/{id}/refund: the job's own share refunded, the job canceled, the customer told
    refund(r, body){
      const order = r.meta?.order || {};
      if (r.meta?.refund) throw new ApiError("This job was already refunded");
      if (!order.payment_intent || !order.amount_cents) throw new ApiError("Nothing was paid for this job, so there is nothing to refund");
      const at = nowIso();
      const change = {refund: {id: "re_" + alnum(24), status: "succeeded", amount_cents: +order.amount_cents, at, by: who, by_id: me.id}};
      if (r.status !== "canceled") Object.assign(change, cancelChange(body.reason));
      const to = recipient(r);
      if (to) change.emails = [...(r.meta?.emails || []), mail(to, `Inspection canceled and refunded: ${veh(r.form, "your vehicle")} (${jobRef(r.id)})`, {kind: "refunded"})];
      const was = r.status;
      return tellClaimer(update(r, {status: "canceled", meta: change}), was);
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
  // another tab wrote the list (a provider claiming on the job link, say): take it, so this tab's next save can't undo it
  useEffect(() => {
    const onStorage = e => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try { const next = JSON.parse(e.newValue); if (next?.version === SEED_VERSION && Array.isArray(next.rows)) { live.current = withProviders(next); setState(live.current); } }
      catch { /* a half-written value: the next write brings it */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback(fn => { live.current = fn(live.current); setState(live.current); return live.current; }, []);
  const setRows = useCallback(rows => commit(s => ({...s, rows: typeof rows === "function" ? rows(s.rows) : rows})), [commit]);
  const patchRow = useCallback((id, fn) => setRows(rows => rows.map(r => r.id === id ? fn(r) : r)), [setRows]);
  const row = id => live.current.rows.find(r => r.id === id);

  // the search finishing: a fresh call sheet replaces the old one (the agent's answer, located and sorted)
  const finish = useCallback(id => {
    timers.current.delete(id);
    patchRow(id, r => r.search?.state !== "running" ? r : {...r, search: {...r.search, state: "done", done_at: nowIso(), error: null}, updated_at: nowIso(), result: lookupFor(r, r.updated_at, live.current.providers)});
  }, [patchRow]);
  const schedule = useCallback((id, ms) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => finish(id), Math.max(0, ms)));
  }, [finish]);

  /** Start finding providers. The old results stay until the new ones land. Whether providers have been
   *  found is a detail of the job (r.search), not its status: the job stays New until its link goes live.
   *  `by` is who started it, for the job's activity ("Automatic" when a request arrives). */
  const fulfill = useCallback((id, by = "") => {
    const at = nowIso();
    patchRow(id, r => {
      if (r.search?.state === "running" || isClosed(r)) return r;
      return {...r, search: {state: "running", started_at: r.search?.started_at || at, at, by, error: null}, updated_at: at};
    });
    schedule(id, LOOKUP_MS);
  }, [patchRow, schedule]);

  // a lookup still running when the page was left finishes where it would have
  useEffect(() => {
    for (const r of state.rows) if (r.search?.state === "running" && !timers.current.has(r.id))
      schedule(r.id, LOOKUP_MS - (Date.now() - new Date(r.search.at).getTime()));
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
    createLink: id => call(id, (s, r) => s.createLink(r)),
    cancel: (id, body = {}) => call(id, (s, r) => s.cancel(r, body)),
    reset: id => call(id, (s, r) => s.reset(r)),
  }), [call]);

  // provider records: a contact on a provider the searches found, or a provider Inspectd staff added by hand.
  // Every write is logged on the record ({at, by, what, detail}); the Providers page shows the latest.
  const providers = useMemo(() => {
    const who = () => { const u = live.current.users.find(x => x.id === live.current.meId); return u?.name || u?.email || ""; };
    const clean = v => String(v ?? "").trim().slice(0, 200);
    const contactOf = c => ({name: clean(c?.name), email: clean(c?.email), cell: clean(c?.cell)});
    const check = c => { if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new ApiError("That email doesn't look right"); };
    return {
      /** Save a provider's contact. `shop` is the provider as listed ({name, website, phone}, its key, its metro). */
      saveContact(shop, contact){
        const c = contactOf(contact); check(c);
        const at = nowIso(), by = who(), key = shop.key || shopKey(shop);
        const detail = [c.name, c.email, c.cell].filter(Boolean).join(" · ") || "Cleared";
        commit(s => {
          const list = s.providers || [], cur = list.find(p => p.key === key);
          const rec = cur ? {...cur, contact: c, log: [...cur.log, {at, by, what: "Contact updated", detail}]}
            : {key, source: "search", name: shop.name || "", metro: shop.metro || "", website: shop.website || "", phone: shop.phone || "",
               contact: c, added_at: at, added_by: by, log: [{at, by, what: "Contact updated", detail}]};
          return {...s, providers: cur ? list.map(p => p.key === key ? rec : p) : [...list, rec]};
        });
        return c;
      },
      /** Add a provider by hand: a business name and a metro, the contact, and optionally a website and phone. */
      add(form){
        const name = clean(form.name), metro = clean(form.metro), website = clean(form.website), phone = clean(form.phone), c = contactOf(form.contact);
        if (!name) throw new ApiError("Enter the business name");
        if (!metro) throw new ApiError("Choose a metro");
        check(c);
        const key = shopKey({name, website, phone});
        if ((live.current.providers || []).some(p => p.key === key)) throw new ApiError("That provider is already listed");
        const at = nowIso(), by = who();
        const rec = {key, source: "manual", name, metro, website, phone, contact: c, added_at: at, added_by: by, log: [{at, by, what: "Provider added", detail: metro}]};
        commit(s => ({...s, providers: [...(s.providers || []), rec]}));
        return rec;
      },
    };
  }, [commit]);

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

  // the client portal's server (portalServer.js). A request it creates starts its lookup by itself,
  // as portal.py does when the agent is on: the same simulated search as the console's Find providers.
  const portal = useMemo(() => {
    const read = name => (...args) => createPortal(live.current)[name](...args);
    const write = name => (...args) => { const { state: next, out } = createPortal(live.current)[name](...args); commit(() => next); return out; };
    return {
      me: read("me"), reports: read("reports"), listJobs: read("listJobs"), getJob: read("getJob"),
      report: read("report"), reportOrg: read("reportOrg"), shared: read("shared"), team: read("team"), inspection: read("inspection"),
      chooseWorkspace: write("chooseWorkspace"), cancelJob: write("cancelJob"), deleteReport: write("deleteReport"),
      teamWrite: (name, ...args) => write("teamWrite")(name, ...args), rename: write("rename"),
      view: write("view"), claim: write("claim"), reject: write("reject"),
      createJob: body => { const out = write("createJob")(body); fulfill(out.id, "Automatic"); return out; },
      createBulk: body => { const out = write("createBulk")(body); out.created.forEach(r => fulfill(r.id, "Automatic")); return out; },
    };
  }, [commit, fulfill]);

  const reset = useCallback(() => {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
    commit(() => buildSeed());
  }, [commit]);

  const value = useMemo(() => ({
    rows: state.rows, reports: state.reports, providerRecords: state.providers || [], orgs: state.orgs, users: state.users, memberships: state.memberships, me: state.users.find(u => u.id === state.meId), meta: state.meta, seededAt: state.seededAt,
    setRows, fulfill, reset, api, auth, portal, providers,
  }), [state, setRows, fulfill, reset, api, auth, portal, providers]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatform(){
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlatform must be used inside PlatformStoreProvider");
  return v;
}
