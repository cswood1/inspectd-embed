// Derived views over the request list: pure functions, no DOM. Used by the sidebar counts and several sections.
// Ported from inspection-requests/ui/shared/data.js (renamed: src/data.js is the external surfaces' mock data).
import { isClosed } from "./ui.jsx";

// the same shop found on several jobs is one provider; website, then phone, then name identifies it
export const shopKey = sh => (sh.website || sh.phone || sh.name || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") || (sh.name || "").toLowerCase();

export function allProviders(rows){
  const map = new Map();
  for (const r of rows) for (const sh of (r.result?.shops || [])) {
    const k = shopKey(sh); if (!k) continue;
    const e = map.get(k) || {...sh, jobs: 0, contacted: false, booked: false, last: r.created_at};
    e.jobs++; e.contacted = e.contacted || !!sh.contacted; e.booked = e.booked || !!sh.booked; if (r.created_at > e.last) e.last = r.created_at;
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
const STATUS_ORDER = ["received", "dispatching", "confirmed", "complete", "canceled"];
export const statusBreakdown = counts => STATUS_ORDER.filter(k => counts[k]).map(k => [k, counts[k]]);

export const dupEmails = rows => { const c = {}; rows.forEach(r => { const e = r.form.email.toLowerCase(); c[e] = (c[e] || 0) + 1; }); return new Set(Object.keys(c).filter(e => c[e] > 1)); };

// Every badge is the number of rows its tab holds, the same figure the tab shows at the top of itself.
export const navCounts = rows => ({
  jobs: rows.filter(r => !isClosed(r)).length, closed: rows.filter(isClosed).length,
  providers: allProviders(rows).length, customers: allCustomers(rows).length,
  reports: rows.filter(r => r.status === "confirmed" || r.status === "complete").length,
});
