import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "inspectd_orders_v2";

// Product catalog: only these service levels can appear on an order.
export const SERVICE_LEVELS = [
  "VINsight",
  "VINsight EV",
  "VINshield",
  "VINshield EV",
  "VINgrade Pre-Sale",
  "VINgrade Post-Sale",
];

// Client types used by the provider portal to badge who ordered a job.
// Free-form on the order, but these are the canonical strings the UI knows about.
export const CLIENT_TYPES = [
  "DEALER",
  "FLEET",
  "LENDER",
  "OEM",
  "MARKETPLACE",
  "ARBITRATION",
  "INDIVIDUAL",
];

// Default clientType per requestor when a draft doesn't specify one.
export const REQUESTOR_CLIENT_TYPE = {
  crestview: "DEALER",
  axleauto: "DEALER",
  auctionplus: "MARKETPLACE",
  "test-enterprise": "FLEET",
};

// Payout share: providers keep ~70% of the quoted price. Matches the portal's
// calculateProviderPayout without pulling in the whole helper.
const PAYOUT_SHARE = 0.7;
export function providerPayout(price) {
  return Math.round(Number(price) * PAYOUT_SHARE);
}

// Seed orders. IDs descend so addOrder can safely resume at max + 1.
// Zips are included so seed jobs land on the VINmap.
const SEED_RAW = [
  { id: "INS-8842", requestor: "test-enterprise", title: "Cascadia Auto Group",       location: "Seattle, WA",       zip: "98101", vehicle: "2023 Mercedes-Benz GLC 300",       serviceLevel: "VINshield",         status: "In Progress", price: 349, received: "2026-08-05T09:22:00", claimedBy: "test-provider", claimedAt: "2026-08-05T10:00:00", startedAt: "2026-08-05T11:15:00" },
  { id: "INS-8841", requestor: "test-enterprise", title: "Bay Area Motors",           location: "San Francisco, CA", zip: "94102", vehicle: "2022 Tesla Model Y Performance",   serviceLevel: "VINshield EV",      status: "Open",        price: 429, received: "2026-08-05T08:15:00" },
  { id: "INS-8840", requestor: "test-enterprise", title: "Rainier Auto Group",        location: "Bellevue, WA",      zip: "98004", vehicle: "2022 Porsche Macan",               serviceLevel: "VINsight",          status: "In Progress", price: 229, received: "2026-08-05T06:30:00", claimedBy: "test-provider", claimedAt: "2026-08-05T07:00:00", startedAt: "2026-08-05T08:20:00" },
  { id: "INS-8839", requestor: "test-enterprise", title: "Sierra Motor Company",      location: "Reno, NV",          zip: "89501", vehicle: "2022 Audi Q5 Sportback",           serviceLevel: "VINsight",          status: "Completed",   price: 219, received: "2026-08-04T19:45:00", claimedBy: "test-provider", completedAt: "2026-08-05T04:10:00" },
  { id: "INS-8838", requestor: "test-enterprise", title: "West Coast Fleet Services", location: "Sacramento, CA",    zip: "95814", vehicle: "2024 Chevrolet Silverado 1500",    serviceLevel: "VINgrade Pre-Sale", status: "Open",        price:  99, received: "2026-08-04T14:20:00" },
  { id: "INS-8837", requestor: "test-enterprise", title: "Bay Area Motors",           location: "San Jose, CA",      zip: "95110", vehicle: "2023 Tesla Model 3 Long Range",    serviceLevel: "VINsight EV",       status: "Completed",   price: 259, received: "2026-08-04T11:05:00", claimedBy: "test-provider", completedAt: "2026-08-04T22:00:00" },
  { id: "INS-8836", requestor: "test-enterprise", title: "Coastal Remarketing",       location: "Portland, OR",      zip: "97205", vehicle: "2021 Land Rover Range Rover Velar", serviceLevel: "VINshield",         status: "Completed",   price: 379, received: "2026-08-03T22:10:00", claimedBy: "test-provider", completedAt: "2026-08-04T18:00:00" },
  { id: "INS-8835", requestor: "test-enterprise", title: "Pacific Dealer Network",    location: "Portland, OR",      zip: "97201", vehicle: "2022 Ford F-150 XLT",              serviceLevel: "VINsight",          status: "Completed",   price: 209, received: "2026-08-03T16:45:00", claimedBy: "test-provider", completedAt: "2026-08-04T09:00:00" },
  { id: "INS-8834", requestor: "test-enterprise", title: "Rainier Auto Group",        location: "Spokane, WA",       zip: "99201", vehicle: "2025 BMW 228 xDrive",              serviceLevel: "VINgrade Post-Sale",status: "Completed",   price:  89, received: "2026-08-03T11:00:00", claimedBy: "test-provider", completedAt: "2026-08-03T18:00:00" },
  { id: "INS-8833", requestor: "test-enterprise", title: "Sierra Motor Company",      location: "Boise, ID",         zip: "83702", vehicle: "2022 Audi A3 Premium Plus",        serviceLevel: "VINsight",          status: "Claimed",     price: 209, received: "2026-08-02T18:30:00", claimedBy: "test-provider", claimedAt: "2026-08-06T07:00:00" },
  { id: "INS-8832", requestor: "test-enterprise", title: "Western Auction Group",     location: "Phoenix, AZ",       zip: "85001", vehicle: "2020 Hyundai Sonata SEL",          serviceLevel: "VINgrade Pre-Sale", status: "Completed",   price: 109, received: "2026-08-02T09:15:00", claimedBy: "test-provider", completedAt: "2026-08-03T02:00:00" },
  { id: "INS-8831", requestor: "test-enterprise", title: "Cascadia Auto Group",       location: "Seattle, WA",       zip: "98101", vehicle: "2023 Mercedes-Benz E-Class",       serviceLevel: "VINshield",         status: "Completed",   price: 359, received: "2026-08-01T14:00:00", claimedBy: "test-provider", completedAt: "2026-08-02T11:00:00" },

  // Extra Open jobs from a mix of requestors — spreads pins across the map.
  { id: "INS-8830", requestor: "crestview",       title: "Crestview Auto Group",      location: "Aurora, CO",        zip: "80011", vehicle: "2021 Toyota 4Runner TRD Off Road", serviceLevel: "VINshield",         status: "Open",        price: 349, received: "2026-08-06T06:12:00" },
  { id: "INS-8829", requestor: "axleauto",        title: "AxleAuto",                  location: "Mountain View, CA", zip: "94043", vehicle: "2024 Rivian R1S Adventure",        serviceLevel: "VINshield EV",      status: "Open",        price: 429, received: "2026-08-06T05:47:00" },
  { id: "INS-8828", requestor: "auctionplus",     title: "AuctionPlus",               location: "Dallas, TX",        zip: "75201", vehicle: "2019 Chevrolet Malibu LT",         serviceLevel: "VINgrade Pre-Sale", status: "Open",        price:  99, received: "2026-08-06T05:15:00" },
  { id: "INS-8827", requestor: "auctionplus",     title: "AuctionPlus",               location: "Atlanta, GA",       zip: "30303", vehicle: "2020 Nissan Altima SR",            serviceLevel: "VINgrade Pre-Sale", status: "Open",        price:  99, received: "2026-08-06T04:58:00" },
  { id: "INS-8826", requestor: "test-enterprise", title: "Nor'easter Fleet Solutions",location: "Boston, MA",        zip: "02108", vehicle: "2023 Ford Transit 250",            serviceLevel: "VINsight",          status: "Open",        price: 229, received: "2026-08-06T04:32:00" },
  { id: "INS-8825", requestor: "crestview",       title: "Crestview Auto Group",      location: "Denver, CO",        zip: "80202", vehicle: "2022 Subaru Outback Wilderness",   serviceLevel: "VINsight",          status: "Open",        price: 229, received: "2026-08-06T03:44:00" },
  { id: "INS-8824", requestor: "test-enterprise", title: "Midwest Motorpool",         location: "Chicago, IL",       zip: "60601", vehicle: "2024 Kia EV9 Land",                serviceLevel: "VINshield EV",      status: "Open",        price: 429, received: "2026-08-06T02:21:00" },
  { id: "INS-8823", requestor: "auctionplus",     title: "AuctionPlus",               location: "Charlotte, NC",     zip: "28202", vehicle: "2018 Honda Accord Sport",          serviceLevel: "VINgrade Pre-Sale", status: "Open",        price:  99, received: "2026-08-06T01:50:00" },
  { id: "INS-8822", requestor: "axleauto",        title: "AxleAuto",                  location: "Austin, TX",        zip: "78701", vehicle: "2023 Ford Bronco Wildtrak",        serviceLevel: "VINshield",         status: "Open",        price: 349, received: "2026-08-06T00:12:00" },
  { id: "INS-8821", requestor: "test-enterprise", title: "Great Basin Fleet",         location: "Salt Lake City, UT",zip: "84101", vehicle: "2022 Ram 1500 Big Horn",           serviceLevel: "VINsight",          status: "Open",        price: 229, received: "2026-08-05T22:40:00" },
  { id: "INS-8820", requestor: "crestview",       title: "Crestview Auto Group",      location: "Miami, FL",         zip: "33101", vehicle: "2024 Genesis GV70 3.5T",           serviceLevel: "VINshield",         status: "Open",        price: 349, received: "2026-08-05T21:15:00" },
];

const SEED = SEED_RAW.map((o) => ({
  clientType: REQUESTOR_CLIENT_TYPE[o.requestor] || "INDIVIDUAL",
  ...o,
}));

const OrderStoreContext = createContext(null);

function loadOrders() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return SEED;
}

function nextId(orders) {
  const nums = orders
    .map((o) => parseInt(String(o.id).slice(4), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 8820;
  return `INS-${max + 1}`;
}

export function OrderStoreProvider({ children }) {
  const [orders, setOrders] = useState(() => loadOrders());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // localStorage may be unavailable; state stays in memory for the session.
    }
  }, [orders]);

  const addOrders = (drafts) => {
    if (!drafts || drafts.length === 0) return [];
    const nums = orders
      .map((o) => parseInt(String(o.id).slice(4), 10))
      .filter((n) => Number.isFinite(n));
    let max = nums.length ? Math.max(...nums) : 8820;
    const received = new Date().toISOString();
    const created = drafts.map((draft) => {
      max += 1;
      return {
        id: `INS-${max}`,
        received,
        status: draft.status ?? "Open",
        clientType:
          draft.clientType ||
          REQUESTOR_CLIENT_TYPE[draft.requestor] ||
          "INDIVIDUAL",
        ...draft,
      };
    });
    const ids = created.map((o) => o.id);
    // Prepend in reverse so the highest id (last created) sits at the top.
    setOrders((prev) => [...created.slice().reverse(), ...prev]);
    return ids;
  };

  const addOrder = (order) => addOrders([order])[0];

  const patchOrder = (orderId, patch) =>
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));

  // Provider claims an Open job. Bumps status to "Claimed" and stamps who + when.
  const claim = (orderId, providerKey) => {
    const now = new Date().toISOString();
    patchOrder(orderId, {
      status: "Claimed",
      claimedBy: providerKey,
      claimedAt: now,
    });
  };

  // Provider starts a Claimed job. Bumps to "In Progress" and stamps start time.
  const start = (orderId) => {
    const now = new Date().toISOString();
    patchOrder(orderId, { status: "In Progress", startedAt: now });
  };

  // Provider submits a report. Bumps to "Completed" and stamps submission.
  const complete = (orderId, submission = null) => {
    const now = new Date().toISOString();
    patchOrder(orderId, {
      status: "Completed",
      completedAt: now,
      reportSubmission: submission
        ? { submittedAt: now, ...submission }
        : { submittedAt: now, method: "portal_upload" },
    });
  };

  // Provider releases a Claimed job (never released once started).
  const release = (orderId) => {
    patchOrder(orderId, {
      status: "Open",
      claimedBy: null,
      claimedAt: null,
    });
  };

  const counts = useMemo(
    () => ({
      total: orders.length,
      open: orders.filter((o) => o.status === "Open").length,
      claimed: orders.filter((o) => o.status === "Claimed").length,
      inProgress: orders.filter((o) => o.status === "In Progress").length,
      completed: orders.filter((o) => o.status === "Completed").length,
    }),
    [orders]
  );

  const value = {
    orders,
    addOrder,
    addOrders,
    claim,
    start,
    complete,
    release,
    counts,
  };
  return (
    <OrderStoreContext.Provider value={value}>
      {children}
    </OrderStoreContext.Provider>
  );
}

export function useOrderStore() {
  const ctx = useContext(OrderStoreContext);
  if (!ctx)
    throw new Error("useOrderStore must be used inside <OrderStoreProvider>");
  return ctx;
}

// Formats an ISO datetime like "Aug 5, 09:22 AM", matching the portal screenshot.
export function formatReceived(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const hour24 = d.getHours();
  const hour12 = ((hour24 + 11) % 12) + 1;
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return `${month} ${day}, ${String(hour12).padStart(2, "0")}:${min} ${ampm}`;
}

export function formatUsd(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Age helpers for the provider job board — matches useAgeClock in the portal.
export function ageString(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round((now - then) / 60000));
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return `${d}d ${hh}h`;
}

export function ageColor(iso) {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 60) return "text-emerald-400";
  if (diffMin < 60 * 6) return "text-amber-400";
  return "text-rose-400";
}
