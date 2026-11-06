/*
 * The client portal's side of the server, as pure functions on the stored state. What Kavin's portal
 * gateway does (inspection-dashboard/apps/jobs_service, accounts_service, common/auth.py) and what it
 * forwards to (inspection-requests/apps/requests/portal.py, views.client_view, store.validate_form),
 * folded into one hop. Writes return {state, out}; refusals throw ApiError carrying the status and,
 * for a bulk upload, the per-row errors.
 */
import { ApiError } from "./authServer.js";
import { vinCheck } from "./vin.js";

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, "0")).join("").slice(0, n);
const mailId = () => `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
const fail = (status, message, extra = {}) => Object.assign(new ApiError(message), {status, body: {error: message, ...extra}});

export const STAGES = ["received", "dispatching", "confirmed", "complete", "canceled"];
const STAGE_LABELS = {received: "Received", dispatching: "Dispatching", confirmed: "Confirmed", complete: "Complete", canceled: "Canceled"};
const ROLE_LABEL = {OWNER: "Owner", ADMIN: "Admin", USER: "User", SUPER: "Inspectd team"};

/* ---- the taxonomy and the form (common/taxonomy.py, requests/store.py) ---- */

export const INSPECTION_TYPES = ["pre-purchase", "lease-end", "warranty", "auction-listing", "auction-arbitration", "other"];
// what the request store accepts: the current types and the consumer-era ones still on old rows
const STORE_TYPES = ["pre-purchase", "lease-end", "warranty", "auction-listing", "auction-arbitration", "state-safety", "emissions", "general", "other"];
export const DESIGNATIONS = ["standard", "high-end", "exotic", "classic", "ev"];
const TYPE_ALIASES = {"pre purchase": "pre-purchase", prepurchase: "pre-purchase", ppi: "pre-purchase", "lease end": "lease-end", "lease-return": "lease-end",
  "lease return": "lease-end", auction: "auction-listing", listing: "auction-listing", arbitration: "auction-arbitration", "auction arbitration": "auction-arbitration", "auction listing": "auction-listing"};
const DESIG_ALIASES = {"high end": "high-end", highend: "high-end", luxury: "high-end", electric: "ev", "e.v.": "ev", std: "standard", normal: "standard", regular: "standard"};
const norm = v => String(v ?? "").trim().toLowerCase().replace(/_/g, " ").replace(/-/g, " ").split(/\s+/).filter(Boolean).join(" ");
const normalizeType = v => { const n = norm(v); if (!n) return null; const h = n.replace(/ /g, "-"); return INSPECTION_TYPES.includes(h) ? h : TYPE_ALIASES[n] || null; };
const normalizeDesig = v => { const n = norm(v); if (!n) return "standard"; const h = n.replace(/ /g, "-"); return DESIGNATIONS.includes(h) ? h : DESIG_ALIASES[n] || null; };

const FIELDS = ["name", "email", "phone", "year", "make", "model", "vin", "inspection_type", "designation", "address", "city", "state", "zip", "notes"];
const REQUIRED = ["name", "email", "address", "city", "state", "zip", "inspection_type"];
const ZIP = /^\d{5}(-\d{4})?$/;
// store.validate_form: the form as it is kept, or the fields that are missing or invalid
function validateForm(form){
  const c = Object.fromEntries(FIELDS.map(k => [k, String(form[k] ?? "").trim()]));
  c.email = c.email.toLowerCase(); c.state = c.state.toUpperCase(); c.zip = c.zip.replace(/ /g, "");
  const problems = REQUIRED.filter(k => !c[k]);
  if (c.zip && !ZIP.test(c.zip)) problems.push("zip");
  if (c.email && !c.email.includes("@")) problems.push("email");
  c.inspection_type = c.inspection_type.toLowerCase();
  if (c.inspection_type && !STORE_TYPES.includes(c.inspection_type)) problems.push("inspection_type");
  c.designation = c.designation.toLowerCase().replace(/ /g, "-").replace(/_/g, "-");
  if (c.designation && !DESIGNATIONS.includes(c.designation)) problems.push("designation");
  if (problems.length) throw new ApiError("Missing or invalid: " + [...new Set(problems)].join(", "));
  return c;
}
// jobs_service._intake_problem: the location and the on-site contact, all in one message
function intakeProblem(row, defaults = null){
  for (const k of ["name", "email", "phone"]) if (!String(row[k] ?? "").trim() && defaults && String(defaults[k] ?? "").trim()) row[k] = String(defaults[k]).trim();
  const missing = ["address", "city", "state", "zip"].filter(k => !String(row[k] ?? "").trim());
  if (!missing.includes("zip") && !ZIP.test(String(row.zip).trim())) missing.push("zip");
  const contact = ["name", "email", "phone"].filter(k => !String(row[k] ?? "").trim());
  if (!contact.includes("email") && !String(row.email).includes("@")) contact.push("email");
  if (!contact.includes("phone") && !/\d{7,}/.test(String(row.phone).replace(/\D/g, ""))) contact.push("phone");
  const all = [...missing, ...contact];
  return all.length ? "Missing or invalid: " + all.join(", ") : null;
}
// jobs_service._classify: canonical type and designation, or what is wrong
function classify(row){
  const t = normalizeType(row.inspection_type || "pre-purchase");
  if (!t) return `Unknown inspection type '${row.inspection_type}' (use one of: ${INSPECTION_TYPES.join(", ")})`;
  const d = normalizeDesig(row.designation);
  if (!d) return `Unknown designation '${row.designation}' (use one of: ${DESIGNATIONS.join(", ")})`;
  row.inspection_type = t; row.designation = d;
  return null;
}

/* ---- what a client sees of a job (views.client_view, then the gateway's _client_view) ---- */

const shopCard = s => s && (s.name || "").trim() ? Object.fromEntries(["name", "phone", "email", "address", "website", "hours"].map(k => [k, String(s[k] || "")])) : null;
const STAGE_ORDER = ["received", "dispatching", "confirmed", "complete", "canceled"];
function historyOf(r){
  const meta = r.meta || {}, seen = {};
  for (const h of meta.history || []) if (h.stage && h.at) seen[h.stage] = h.at;
  seen.received ??= r.created_at;
  if ((r.status === "confirmed" || r.status === "complete") && !seen.confirmed) {
    const claim = meta.inspect?.claim || {}, at = meta.booking?.booked_at || (claim.status === "claimed" ? claim.at : null);
    if (at) seen.confirmed = at;
  }
  if (r.status === "complete" && !seen.complete && meta.report?.at) seen.complete = meta.report.at;
  if (r.status === "canceled" && !seen.canceled && meta.canceled?.at) seen.canceled = meta.canceled.at;
  return STAGE_ORDER.filter(s => seen[s]).map(s => ({stage: s, at: seen[s]}));
}
// views.booked_provider, of which the client keeps only the time
function scheduledAt(r){
  const b = r.meta?.booking || {};
  return b.provider?.name ? b.scheduled_at || "" : "";
}
export function clientView(r, reports = []){
  const shops = r.result?.shops || [], rep = r.meta?.report;
  let report = rep?.id ? {id: rep.id, at: rep.at || "", filename: rep.filename || "", shop: shopCard(rep.shop) || shopCard(r.meta?.inspect?.shop)} : null;
  if (!report) {   // _our_reports: a report in the store the request service never heard about
    const ours = reports.filter(x => x.request_id === r.id).sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""))[0];
    if (ours && (!r.org_id || r.org_id === ours.org_id)) report = {id: ours.id, at: ours.uploaded_at || "", filename: ours.filename || "", from_records: true};
  }
  return {id: r.id, stage: r.status, stage_label: STAGE_LABELS[r.status], created_at: r.created_at, updated_at: r.updated_at, form: r.form,
          org_id: r.org_id, user_id: r.user_id, shops_found: r.lookup === "done" ? shops.length : null, lookup_pending: r.lookup === "none" || r.lookup === "running",
          report, history: historyOf(r), can_cancel: canCancel(r), canceled: r.meta?.canceled || null, scheduled_at: scheduledAt(r)};
}
const canCancel = r => ["received", "dispatching"].includes(r.status) && !r.meta?.report?.id;

/* ---- the portal server ---------------------------------------------------- */

export function createPortal(state){
  const me = state.users.find(u => u.id === state.meId);
  const orgById = id => state.orgs.find(o => o.id === id) || null;
  // common/auth.workspaces_of: memberships first, then for a SUPER account every other workspace as SUPER
  const workspaces = () => {
    const mine = state.memberships.filter(m => m.user_id === me.id).sort((a, b) => a.joined_at.localeCompare(b.joined_at))
      .map(m => ({org: orgById(m.org_id), role: m.role})).filter(w => w.org);
    if (me.is_super) {
      const seen = new Set(mine.map(w => w.org.id));
      for (const o of [...state.orgs].sort((a, b) => a.created_at.localeCompare(b.created_at))) if (!seen.has(o.id)) mine.push({org: o, role: "SUPER"});
    }
    return mine;
  };
  // the current workspace: the one chosen (the workspace cookie) when it is still theirs, else the first
  const current = () => { const ws = workspaces(); return ws.find(w => w.org.id === state.portal?.orgId) || ws[0] || null; };
  const actorRole = oid => me.is_super ? "OWNER" : state.memberships.find(m => m.org_id === oid && m.user_id === me.id)?.role || null;
  const ws = () => { const c = current(); if (!c) throw fail(409, "Choose the workspace this job belongs to before creating it"); return c.org; };
  const withState = patch => ({...state, ...patch});
  const newRow = (form, org, ts, meta) => ({id: hex(12), created_at: ts, updated_at: ts, status: "received", lookup: "none", error: null, notes: "",
    form, result: null, meta, org_id: org.id, user_id: me.id, org: {id: org.id, name: org.name}, partner: null, inspect_url: null, inspect_shop: null, inspect_claim: null});

  return {
    // GET /api/me
    me(){
      const cur = current(), role = cur?.role || (me.is_super ? "SUPER" : null);
      return {user: {id: me.id, name: me.name, email: me.email, role, role_label: ROLE_LABEL[role] || "", is_super: !!me.is_super, has_password: !!me.has_password, google_linked: !!me.google_linked},
              account: cur ? {id: cur.org.id, name: cur.org.name, slug: cur.org.slug, plan: "pilot"} : {id: "", name: me.is_super ? "Inspectd" : "", slug: "", plan: ""},
              role, authenticated: true,
              workspaces: workspaces().map(w => ({id: w.org.id, name: w.org.name, slug: w.org.slug, role: w.role, role_label: ROLE_LABEL[w.role] || "", current: !!cur && w.org.id === cur.org.id})),
              ...(me.is_super ? {console_url: "/dashboard"} : {})};
    },
    // POST /auth/workspace
    chooseWorkspace(orgId){
      const match = workspaces().find(w => w.org.id === orgId);
      if (!match) throw fail(403, "That workspace is not yours");
      return {state: withState({portal: {...state.portal, orgId}}), out: {ok: true, org: match.org, role: match.role}};
    },
    // GET /api/reports: the workspace's report store, newest first (store.summary_row)
    reports(){
      const org = current()?.org;
      return {reports: state.reports.filter(r => r.org_id === org?.id).map(({images, findings, ...row}) => ({...row, image_count: (images || []).length}))};
    },
    // GET /api/jobs
    listJobs(){
      const org = current()?.org;
      const rows = state.rows.filter(r => r.org_id === org?.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
      return {requests: rows.map(r => clientView(r, state.reports)), stages: STAGES};
    },
    // GET /api/jobs/{id}: any job of a workspace the account acts in (a SUPER account acts in all)
    getJob(id){
      const r = state.rows.find(x => x.id === id);
      if (!r || !r.org_id || !actorRole(r.org_id)) throw fail(404, "No such request");
      return clientView(r, state.reports);
    },
    // POST /api/jobs: the gateway's checks, then portal.create_request
    createJob(body){
      const org = ws();
      body = {...body};
      if (String(body.vin || "").trim()) { const v = vinCheck(body.vin); if (!v.ok) throw fail(422, `Invalid VIN: ${v.reason}`); body.vin = v.vin; }
      const problem = intakeProblem(body) || classify(body);
      if (problem) throw fail(422, problem);
      const form = Object.fromEntries(FIELDS.map(k => [k, body[k]]));
      form.name = form.name || me.name; form.email = form.email || me.email;   // the requester is the signed-in person unless they say otherwise
      let clean;
      try { clean = validateForm(form); } catch (e) { throw fail(422, e.message); }
      const ts = nowIso(), row = newRow(clean, org, ts, {});
      row.meta = {emails: [{to: clean.email, subject: `We received your inspection request (${row.id})`, at: ts, sent: true, id: mailId()}], source: "portal"};
      return {state: withState({rows: [row, ...state.rows]}), out: {...clientView(row, state.reports), auto_start: false}};
    },
    // POST /api/jobs/bulk: the gateway sorts rows into kept, skipped and incomplete; portal.create_requests_bulk
    // creates the kept ones together, or nothing at all
    createBulk(body){
      const org = ws();
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const keep = [], keptIndex = [], skipped = [], incomplete = [];
      rows.forEach((raw, i) => {
        const r = {...(raw || {})};
        const problem = intakeProblem(r, body);
        if (problem) { incomplete.push({row: i + 1, error: problem}); return; }
        if (String(r.vin || "").trim()) {
          const v = vinCheck(r.vin);
          if (!v.ok) { skipped.push({row: i + 1, vin: r.vin, error: `Invalid VIN: ${v.reason}`}); return; }
          r.vin = v.vin;
        }
        const p = classify(r);
        if (p) { skipped.push({row: i + 1, vin: r.vin || "", error: p}); return; }
        keep.push(r); keptIndex.push(i + 1);
      });
      if (incomplete.length) throw fail(422, `${incomplete.length} of ${rows.length} rows need attention; nothing was created`, {errors: incomplete});
      if (rows.length && !keep.length) throw fail(422, `${skipped.length} of ${rows.length} rows could not be accepted; nothing was created`, {errors: skipped, skipped});
      if (!keep.length) throw fail(422, "Send at least one row");
      if (keep.length > 200) throw fail(422, "At most 200 requests per upload");
      const forms = [], errors = [];
      keep.forEach((row, i) => {
        const form = Object.fromEntries(FIELDS.map(k => [k, row[k]]));
        form.name = form.name || body.name || me.name; form.email = form.email || body.email || me.email; form.phone = form.phone || body.phone || "";
        try { forms.push(validateForm(form)); } catch (e) { errors.push({row: keptIndex[i], error: e.message}); }
      });
      if (errors.length) throw fail(422, `${errors.length} of ${keep.length} rows need attention; nothing was created`, {errors});
      // one write for the whole list: every request shares its moment of creation
      const ts = nowIso(), created = forms.map(f => newRow(f, org, ts, {source: "portal-bulk"}));
      const n = created.length;
      created[0].meta = {...created[0].meta, emails: [{to: forms[0].email, subject: `We received ${n} inspection request${n === 1 ? "" : "s"}`, at: ts, sent: true, id: mailId()}]};
      return {state: withState({rows: [...created, ...state.rows]}), out: {created: created.map(r => clientView(r, state.reports)), count: n, auto_start: false, fulfill_urls: [], skipped}};
    },
    // POST /api/jobs/{id}/cancel: only while it is still being sourced
    cancelJob(id, reason = ""){
      const r = state.rows.find(x => x.id === id);
      if (!r || !r.org_id || !actorRole(r.org_id)) throw fail(404, "No such job");
      if (r.status === "canceled") return {state, out: {...clientView(r, state.reports), already: true}};
      if (!["received", "dispatching"].includes(r.status)) throw fail(409, "An inspector has already been booked for this job; ask Inspectd to cancel it");
      if (!canCancel(r)) throw fail(409, "An inspector is already booked for this request, so it can no longer be canceled here. Contact the Inspectd team and they will sort it out.");
      const at = nowIso(), canceled = {at, by: me.name || me.email, by_id: me.id, reason: String(reason || "").trim().slice(0, 300)};
      const next = {...r, status: "canceled", updated_at: at, meta: {...r.meta, canceled, history: [...(r.meta?.history || []), {stage: "canceled", at}]}};
      return {state: withState({rows: state.rows.map(x => x.id === id ? next : x)}), out: clientView(next, state.reports)};
    },
  };
}
