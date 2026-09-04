import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useOrderStore } from "./OrderStore.jsx";

/*
 * Request state for the internal console.
 *
 * An OVERLAY keyed by order id, not new fields on the order. The Enterprise
 * and Provider portals read order.status and know nothing about this surface;
 * keeping them separate means this state can never disturb them.
 *
 * Scope is deliberately small: take the request, look up inspection providers
 * covering that area, list them. A human works the list — notes and an outcome.
 * The surface makes no claim about a provider beyond who they are and how to
 * reach them, because that is all we actually know.
 *
 * Every provider is a mobile inspection service that travels to the vehicle.
 * None are shops and none have a location a customer visits.
 */

/* ---- helpers ------------------------------------------------ */

function hashCode(s) {
  let h = 0;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// "Crestview Auto Group" -> ops@crestviewautogroup.com. Derived from the title
// rather than the requestor key so the eight jobs sharing three requestors also
// share an inbox, which is what makes the duplicate banner meaningful.
export function emailFor(title) {
  const slug = String(title || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `ops@${slug}.com`;
}

/* ---- provider lookup ---------------------------------------- */

const NAME_PREFIX = [
  "Precision", "Summit", "Anchor", "Ironclad", "Cardinal", "Northgate",
  "Redline", "Meridian", "Vantage", "Bedrock", "Copperline", "Clearview",
  "Tandem", "Keystone", "Brightline", "Foundry",
];
const NAME_SUFFIX = [
  "Mobile Inspection", "Vehicle Inspection", "Inspection Services",
  "Mobile Diagnostics", "Vehicle Assessment", "Inspection Group",
  "PPI Services", "Fleet Inspection",
];
const AREA_CODE = {
  CO: "303", CA: "415", WA: "206", OR: "503", NV: "775", TX: "214",
  GA: "404", MA: "617", IL: "312", NC: "704", UT: "801", FL: "305",
  AZ: "602", ID: "208",
};

// Deterministic per (job, salt) so a demo replays identically. `salt` bumps on
// Run again, which is what makes a second lookup return a different set.
function genProviders(job, salt = 0) {
  const seed = `${job.id}:${salt}`;
  const state = String(job.location || "").split(",")[1]?.trim() || "";
  const ac = AREA_CODE[state] || "555";
  const count = 5 + (hashCode(seed) % 4); // 5..8

  const out = [];
  const used = new Set();
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const k = hashCode(`${seed}:${i}`);
    const name = `${NAME_PREFIX[k % NAME_PREFIX.length]} ${NAME_SUFFIX[(k >> 3) % NAME_SUFFIX.length]}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push({
      name,
      phone: `(${ac}) ${200 + ((k >> 9) % 700)}-${String((k >> 11) % 10000).padStart(4, "0")}`,
    });
  }
  return out;
}

/*
 * Seed plan. Hours-ago rather than order.received: the seed orders are dated
 * several weeks back, and "New jobs are researched automatically" next to a
 * month-old timestamp reads wrong. Waiting is newest, then Researching, then
 * everything already looked up.
 *
 * INS-8823 carries `empty` so the zero-result case stays visible — a lookup
 * that finds nobody is just Ready with no providers, not a separate status.
 */
const SEED = [
  { id: "INS-8825", status: "Waiting",     hAgo: 0.3 },
  { id: "INS-8821", status: "Waiting",     hAgo: 0.8 },
  { id: "INS-8827", status: "Researching", hAgo: 1.4 },
  { id: "INS-8826", status: "Researching", hAgo: 2.1 },
  { id: "INS-8824", status: "Researching", hAgo: 3.0 },
  { id: "INS-8829", status: "Ready",       hAgo: 4.5 },
  { id: "INS-8830", status: "Ready",       hAgo: 6.2, outcome: "Contacted" },
  { id: "INS-8828", status: "Ready",       hAgo: 8.0 },
  { id: "INS-8841", status: "Ready",       hAgo: 11 },
  { id: "INS-8820", status: "Ready",       hAgo: 14 },
  { id: "INS-8823", status: "Ready",       hAgo: 18, empty: true },
  { id: "INS-8822", status: "Ready",       hAgo: 23 },
  { id: "INS-8838", status: "Ready",       hAgo: 29 },
  { id: "INS-8833", status: "Ready",       hAgo: 36, outcome: "Contacted" },
  { id: "INS-8840", status: "Ready",       hAgo: 44, outcome: "Contacted" },
  { id: "INS-8842", status: "Ready",       hAgo: 52, outcome: "Booked" },
];
const SEED_BY_ID = Object.fromEntries(SEED.map((s) => [s.id, s]));

function research(order, status, salt, empty = false) {
  if (status !== "Ready" || empty) return { providers: [] };
  return { providers: genProviders(order, salt) };
}

function seedEntry(order, now) {
  const plan = SEED_BY_ID[order.id];
  // Orders created elsewhere in the demo land as brand-new Waiting work.
  const status = plan ? plan.status : "Waiting";
  const hAgo = plan ? plan.hAgo : 0;
  const at = now - hAgo * 3600000;
  return {
    customer: { name: order.title, email: emailFor(order.title) },
    status,
    outcome: (plan && plan.outcome) || "Open",
    notes: "",
    receivedAt: new Date(at).toISOString(),
    ranAt: status === "Ready" ? new Date(at + 90000).toISOString() : null,
    salt: 0,
    ...research(order, status, 0, plan && plan.empty),
  };
}

/* ---- provider ----------------------------------------------- */

const RequestContext = createContext(null);

const RUN_MS = 1200;

export function RequestProvider({ children }) {
  const { orders } = useOrderStore();
  const [requests, setRequests] = useState(() => {
    const now = Date.now();
    const out = {};
    for (const o of orders) {
      if (o.status === "Completed") continue;
      out[o.id] = seedEntry(o, now);
    }
    return out;
  });

  // Orders created elsewhere in the demo (the embed flow, Create Job) show up
  // here as fresh Waiting work.
  useEffect(() => {
    const missing = orders.filter((o) => o.status !== "Completed" && !requests[o.id]);
    if (missing.length === 0) return;
    const now = Date.now();
    const patch = {};
    for (const o of missing) patch[o.id] = seedEntry(o, now);
    setRequests((r) => ({ ...r, ...patch }));
  }, [orders, requests]);

  const patch = (id, next) =>
    setRequests((r) => (r[id] ? { ...r, [id]: { ...r[id], ...next } } : r));

  const jobs = useMemo(() => {
    return orders
      .filter((o) => o.status !== "Completed" && requests[o.id])
      .map((o) => ({ ...o, ...requests[o.id] }))
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [orders, requests]);

  const jobById = useMemo(() => {
    const m = {};
    for (const j of jobs) m[j.id] = j;
    return m;
  }, [jobs]);

  const counts = useMemo(() => {
    const c = { Waiting: 0, Researching: 0, Ready: 0 };
    for (const j of jobs) c[j.status] = (c[j.status] || 0) + 1;
    return c;
  }, [jobs]);

  // Jobs sharing an inbox — drives the duplicate triangle and the drawer banner.
  const siblingsOf = (id) => {
    const job = jobById[id];
    if (!job) return [];
    return jobs.filter((j) => j.id !== id && j.customer.email === job.customer.email);
  };

  const runAgain = (id) => {
    const job = jobById[id];
    if (!job || job.status === "Researching") return;
    patch(id, { status: "Researching" });
    setTimeout(() => {
      setRequests((r) => {
        const cur = r[id];
        if (!cur) return r;
        const order = orders.find((o) => o.id === id);
        const salt = cur.salt + 1;
        return {
          ...r,
          [id]: {
            ...cur,
            status: "Ready",
            salt,
            ranAt: new Date().toISOString(),
            ...research(order, "Ready", salt),
          },
        };
      });
    }, RUN_MS);
  };

  const setOutcome = (id, outcome) => patch(id, { outcome });
  const setNotes = (id, notes) => patch(id, { notes });

  // Plain text, for pasting into a call sheet or a message.
  const contactSheet = (id) => {
    const job = jobById[id];
    if (!job) return "";
    const head = [
      `${job.customer.name} — ${job.id}`,
      job.vehicle,
      `${job.location} ${job.zip || ""}`.trim(),
      job.serviceLevel,
      "",
    ];
    const body = job.providers.map((p) => `${p.name}\n  ${p.phone}`);
    return [...head, ...body].join("\n");
  };

  const value = {
    jobs,
    jobById,
    counts,
    siblingsOf,
    runAgain,
    setOutcome,
    setNotes,
    contactSheet,
  };
  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>;
}

export function useRequests() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error("useRequests must be used inside <RequestProvider>");
  return ctx;
}
