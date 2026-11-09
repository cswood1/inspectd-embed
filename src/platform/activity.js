/*
 * A job's activity: what happened to it and who did it, newest last. Built from what the job already
 * stores (its history, search, links, report, cancellation, resets), so there is no separate log to keep.
 */

import { plannedLabel, isConsumer, STATUS_LABELS } from "./jobModel.js";

const money = c => "$" + ((c || 0) / 100).toFixed(2);

/** [{at, what, who, detail}] in time order */
export function activityOf(r){
  const m = r.meta || {}, out = [];
  const add = (at, what, who = "", detail = "") => { if (at) out.push({at, what, who, detail}); };

  add(r.created_at, STATUS_LABELS.console.new, !isConsumer(r) && r.org ? `${r.form.name}, ${r.org.name}${r.partner ? " embed" : ""}` : r.form.name, m.order ? `Paid ${money(m.order.amount_cents)}` : "");
  const s = r.search;
  if (s) {
    const n = (r.result?.shops || []).length;
    if (s.state === "running") add(s.at, "Finding providers", s.by);
    else if (s.state === "failed") add(s.at, "Provider search failed", s.by, s.error || "");
    else add(s.done_at || s.at, `Providers found (${n})`, s.by);
  }
  // every link the job has had: the ones a reset turned off, then the live one
  for (const link of [...(m.past_links || []), ...(m.link ? [m.link] : [])]) {
    add(link.created_at, "Job link created", link.created_by);
    if (link.views.length) {
      const last = link.views.at(-1).at;
      add(last, `Link viewed ${link.views.length} time${link.views.length === 1 ? "" : "s"}`, "", link.views.length > 1 ? `last ${new Date(last).toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"})}` : "");
    }
    for (const d of link.declines) add(d.at, "Declined", d.name || "A provider", d.reason);
    if (link.claim) add(link.claim.at, "Claimed", [link.claim.name, link.claim.company].filter(Boolean).join(", "),
      [link.claim.proposed_time ? `Plans ${plannedLabel(link.claim.proposed_time)}` : "", link.claim.phone].filter(Boolean).join(" · "));
    if (link.off_at) add(link.off_at, "Link turned off");
  }
  if (m.report?.at) add(m.report.at, "Report delivered", m.link?.claim?.company || m.report.shop?.name || "");
  // cancellations: the one standing, and any a reset undid
  for (const x of [...(m.resets || []).map(z => z.canceled).filter(Boolean), ...(m.canceled ? [m.canceled] : [])]) add(x.at, "Canceled", x.by, x.reason);
  if (m.refund) add(m.refund.at, `Refunded ${money(m.refund.amount_cents)}`, m.refund.by);
  for (const z of m.resets || []) add(z.at, "Reopened", z.by);
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
