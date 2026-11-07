// Derived views over the request list: pure functions, no DOM. Used by the sidebar counts and several sections.
// Ported from inspection-requests/ui/shared/data.js (renamed: src/data.js is the external surfaces' mock data).
import { isClosed, STATUSES } from "./jobModel.js";

// the same shop found on several jobs is one provider; website, then phone, then name identifies it
export const shopKey = sh => (sh.website || sh.phone || sh.name || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") || (sh.name || "").toLowerCase();

// every provider the searches have found, with how many jobs found them and how many of those jobs' links they claimed
export function allProviders(rows){
  const map = new Map(), claims = {};
  for (const r of rows) { const c = r.meta?.link?.claim; if (c?.company) { const n = c.company.trim().toLowerCase(); claims[n] = (claims[n] || 0) + 1; } }
  for (const r of rows) for (const sh of (r.result?.shops || [])) {
    const k = shopKey(sh); if (!k) continue;
    const e = map.get(k) || {...sh, jobs: 0, claimed: claims[(sh.name || "").trim().toLowerCase()] || 0, last: r.created_at};
    e.jobs++; if (r.created_at > e.last) e.last = r.created_at;
    for (const f of ["phone", "website", "email", "address", "rating", "hours"]) if (!e[f] && sh[f]) e[f] = sh[f];
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.jobs - a.jobs || (a.name || "").localeCompare(b.name || ""));
}

export function allCustomers(rows){
  const map = new Map();
  for (const r of rows) {
    const k = r.form.email.toLowerCase();
    const e = map.get(k) || {email: r.form.email, name: r.form.name, phone: r.form.phone, jobs: [], names: new Set(), last: r.created_at, status: r.status, counts: {}};
    e.jobs.push(r); e.names.add(r.form.name.trim());
    e.counts[r.status] = (e.counts[r.status] || 0) + 1;   // every request counts, not just the newest
    // the most recent request decides the display name; earlier spellings are listed beside it
    if (r.created_at >= e.last) { e.last = r.created_at; e.name = r.form.name; e.status = r.status; e.phone = r.form.phone || e.phone; }
    map.set(k, e);
  }
  return [...map.values()].map(e => ({...e, aliases: [...e.names].filter(n => n.toLowerCase() !== e.name.trim().toLowerCase())})).sort((a, b) => b.last.localeCompare(a.last));
}

// what a customer's requests add up to: [status, count] per status they have, in pipeline order
const STATUS_ORDER = STATUSES.map(([k]) => k);
export const statusBreakdown = counts => STATUS_ORDER.filter(k => counts[k]).map(k => [k, counts[k]]);

export const dupEmails = rows => { const c = {}; rows.forEach(r => { const e = r.form.email.toLowerCase(); c[e] = (c[e] || 0) + 1; }); return new Set(Object.keys(c).filter(e => c[e] > 1)); };

// Every badge is the number of rows its tab holds, the same figure the tab shows at the top of itself.
export const navCounts = rows => ({
  jobs: rows.filter(r => !isClosed(r)).length, closed: rows.filter(isClosed).length,
  providers: allProviders(rows).length, customers: allCustomers(rows).length,
  reports: rows.filter(r => r.status === "claimed" || r.status === "complete").length,
});
