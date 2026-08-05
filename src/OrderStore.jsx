import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "inspectd_orders";

// Product catalog: only these service levels can appear on an order.
export const SERVICE_LEVELS = [
  "VINsight",
  "VINsight EV",
  "VINshield",
  "VINshield EV",
  "VINgrade Pre-Sale",
  "VINgrade Post-Sale",
];

// Seed orders. IDs descend so addOrder can safely resume at max + 1.
// All seed rows belong to the "test-enterprise" requestor; embedded surface
// writes (crestview / axleauto / auctionplus) carry their own requestor.
const SEED_RAW = [
  { id: "INS-8842", title: "Cascadia Auto Group",       location: "Seattle, WA",       vehicle: "2023 Mercedes-Benz GLC 300",       serviceLevel: "VINshield",         status: "In Progress", price: 349, received: "2026-08-05T09:22:00" },
  { id: "INS-8841", title: "Bay Area Motors",           location: "San Francisco, CA", vehicle: "2022 Tesla Model Y Performance",   serviceLevel: "VINshield EV",      status: "Open",        price: 429, received: "2026-08-05T08:15:00" },
  { id: "INS-8840", title: "Rainier Auto Group",        location: "Bellevue, WA",      vehicle: "2022 Porsche Macan",               serviceLevel: "VINsight",          status: "In Progress", price: 229, received: "2026-08-05T06:30:00" },
  { id: "INS-8839", title: "Sierra Motor Company",      location: "Reno, NV",          vehicle: "2022 Audi Q5 Sportback",           serviceLevel: "VINsight",          status: "Completed",   price: 219, received: "2026-08-04T19:45:00" },
  { id: "INS-8838", title: "West Coast Fleet Services", location: "Sacramento, CA",    vehicle: "2024 Chevrolet Silverado 1500",    serviceLevel: "VINgrade Pre-Sale", status: "Open",        price:  99, received: "2026-08-04T14:20:00" },
  { id: "INS-8837", title: "Bay Area Motors",           location: "San Jose, CA",      vehicle: "2023 Tesla Model 3 Long Range",    serviceLevel: "VINsight EV",       status: "Completed",   price: 259, received: "2026-08-04T11:05:00" },
  { id: "INS-8836", title: "Coastal Remarketing",       location: "Portland, OR",      vehicle: "2021 Land Rover Range Rover Velar", serviceLevel: "VINshield",         status: "Completed",   price: 379, received: "2026-08-03T22:10:00" },
  { id: "INS-8835", title: "Pacific Dealer Network",    location: "Portland, OR",      vehicle: "2022 Ford F-150 XLT",              serviceLevel: "VINsight",          status: "Completed",   price: 209, received: "2026-08-03T16:45:00" },
  { id: "INS-8834", title: "Rainier Auto Group",        location: "Spokane, WA",       vehicle: "2025 BMW 228 xDrive",              serviceLevel: "VINgrade Post-Sale",status: "Completed",   price:  89, received: "2026-08-03T11:00:00" },
  { id: "INS-8833", title: "Sierra Motor Company",      location: "Boise, ID",         vehicle: "2022 Audi A3 Premium Plus",        serviceLevel: "VINsight",          status: "In Progress", price: 209, received: "2026-08-02T18:30:00" },
  { id: "INS-8832", title: "Western Auction Group",     location: "Phoenix, AZ",       vehicle: "2020 Hyundai Sonata SEL",          serviceLevel: "VINgrade Pre-Sale", status: "Completed",   price: 109, received: "2026-08-02T09:15:00" },
  { id: "INS-8831", title: "Cascadia Auto Group",       location: "Seattle, WA",       vehicle: "2023 Mercedes-Benz E-Class",       serviceLevel: "VINshield",         status: "Completed",   price: 359, received: "2026-08-01T14:00:00" },
];

const SEED = SEED_RAW.map((o) => ({ requestor: "test-enterprise", ...o }));

const OrderStoreContext = createContext(null);

function loadOrders() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate: any pre-existing row without a requestor belongs to the
        // enterprise account it was seeded/created from.
        return parsed.map((o) =>
          o && o.requestor ? o : { ...o, requestor: "test-enterprise" }
        );
      }
    }
  } catch {
    // fall through to seed
  }
  return SEED;
}

function nextOrderId(orders) {
  const nums = orders
    .map((o) => parseInt(String(o.id).slice(4), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 8830;
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

  // addOrders takes a list of order drafts, assigns sequential ids based on
  // current state, and prepends them newest-first. Returns the created ids.
  // Computing ids outside the setter keeps things predictable under StrictMode
  // and lets a single bulk confirm produce N unique ids in one go.
  const addOrders = (drafts) => {
    if (!drafts || drafts.length === 0) return [];
    const nums = orders
      .map((o) => parseInt(String(o.id).slice(4), 10))
      .filter((n) => Number.isFinite(n));
    let max = nums.length ? Math.max(...nums) : 8830;
    const received = new Date().toISOString();
    const created = drafts.map((draft) => {
      max += 1;
      return {
        id: `INS-${max}`,
        received,
        status: draft.status ?? "Open",
        ...draft,
      };
    });
    const ids = created.map((o) => o.id);
    // Prepend in reverse so the highest id (last created) sits at the top.
    setOrders((prev) => [...created.slice().reverse(), ...prev]);
    return ids;
  };

  const addOrder = (order) => addOrders([order])[0];

  const counts = useMemo(
    () => ({
      total: orders.length,
      open: orders.filter((o) => o.status === "Open").length,
      inProgress: orders.filter((o) => o.status === "In Progress").length,
      completed: orders.filter((o) => o.status === "Completed").length,
    }),
    [orders]
  );

  const value = { orders, addOrder, addOrders, counts };
  return <OrderStoreContext.Provider value={value}>{children}</OrderStoreContext.Provider>;
}

export function useOrderStore() {
  const ctx = useContext(OrderStoreContext);
  if (!ctx) throw new Error("useOrderStore must be used inside <OrderStoreProvider>");
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
