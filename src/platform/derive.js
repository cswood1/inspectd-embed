// Derived views over the request list: pure functions, no DOM. Used by the sidebar counts and several sections.
// Ported from inspection-requests/ui/shared/data.js (renamed: src/data.js is the external surfaces' mock data).
import { isClosed, isConsumer, orderedByOf, STATUSES } from "./jobModel.js";

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

/**
 * Every customer, one row each: a consumer by email (their own inspections, in Inspectd Consumers), a business by its
 * workspace. `owners` maps a workspace id to its owner ({name, email}), shown as the business's contact; `orgs` gives
 * the business's headquarters. `query` is what the board is searched by to show their jobs.
 */
export function allCustomers(rows, orgs = [], owners = {}){
  const map = new Map();
  for (const r of rows) {
    const consumer = isConsumer(r) || !r.org;
    const k = consumer ? "c:" + r.form.email.toLowerCase() : "b:" + r.org.id;
    let e = map.get(k);
    if (!e) {
      const org = consumer ? null : orgs.find(o => o.id === r.org.id), owner = consumer ? null : owners[r.org.id];
      e = {key: k, type: orderedByOf(r), business: !consumer, name: consumer ? r.form.name : r.org.name, email: consumer ? r.form.email : owner?.email || "",
           contact: owner?.name || "", phone: consumer ? r.form.phone : "", location: org?.location || "", jobs: [], names: new Set(), last: r.created_at, counts: {}};
    }
    e.jobs.push(r);
    e.counts[r.status] = (e.counts[r.status] || 0) + 1;   // every request counts, not just the newest
    if (consumer) {
      e.names.add(r.form.name.trim());
      // the most recent request decides a consumer's display name and where they are; earlier spellings are listed beside it
      if (r.created_at >= e.last) { e.name = r.form.name; e.phone = r.form.phone || e.phone; }
      if (r.created_at >= e.last || !e.location) e.location = [r.form.city, (r.form.state || "").toUpperCase()].filter(Boolean).join(", ");
    } else e.name = r.org.name;
    if (r.created_at > e.last) e.last = r.created_at;
    map.set(k, e);
  }
  return [...map.values()].map(e => ({...e, query: e.business ? e.name : e.email,
    aliases: [...e.names].filter(n => n.toLowerCase() !== e.name.trim().toLowerCase())})).sort((a, b) => b.last.localeCompare(a.last));
}

// what a customer's requests add up to: [status, count] per status they have, in pipeline order
const STATUS_ORDER = STATUSES.map(([k]) => k);
export const statusBreakdown = counts => STATUS_ORDER.filter(k => counts[k]).map(k => [k, counts[k]]);

// consumers who used one email on more than one job (a business filing several is not worth a flag)
export const dupEmails = rows => { const c = {}; rows.filter(isConsumer).forEach(r => { const e = r.form.email.toLowerCase(); c[e] = (c[e] || 0) + 1; }); return new Set(Object.keys(c).filter(e => c[e] > 1)); };

// Every badge is the number of rows its tab holds, the same figure the tab shows at the top of itself.
export const navCounts = rows => ({
  jobs: rows.filter(r => !isClosed(r)).length, closed: rows.filter(isClosed).length,
  providers: allProviders(rows).length, customers: allCustomers(rows).length,
  reports: rows.filter(r => r.status === "claimed" || r.status === "complete").length,
});
