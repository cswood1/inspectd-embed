import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import {
  SERVICE_LEVELS,
  formatReceived,
  formatUsd,
  useOrderStore,
} from "./OrderStore.jsx";

const ENTERPRISE = {
  key: "test-enterprise",
  name: "Test Enterprise Co",
  short: "TEST ENTERPRISE CO",
};

// Tier metadata used by the Create Job wizard. Keys match SERVICE_LEVELS.
const TIERS = [
  {
    key: "VINsight",
    price: 229,
    sla: "24 hour delivery",
    description: "Standard vehicle condition inspection with photos and test drive.",
    includes: [
      "Exterior walk-around",
      "Interior condition review",
      "Photo documentation",
      "Test drive report",
    ],
  },
  {
    key: "VINsight EV",
    price: 259,
    sla: "24 hour delivery",
    description: "Standard inspection tuned for electric vehicles.",
    includes: [
      "Exterior walk-around",
      "Interior condition review",
      "Battery state-of-health",
      "Photo documentation",
      "Test drive report",
    ],
  },
  {
    key: "VINshield",
    price: 349,
    sla: "48 hour delivery",
    description: "In-depth mechanical and electrical inspection.",
    includes: [
      "Full mechanical inspection",
      "OBD-II diagnostic scan",
      "Suspension and brake check",
      "Undercarriage photos",
      "Test drive report",
    ],
  },
  {
    key: "VINshield EV",
    price: 429,
    sla: "48 hour delivery",
    description: "Deep EV inspection with battery and drivetrain diagnostics.",
    includes: [
      "Full mechanical inspection",
      "Battery cell diagnostics",
      "Charging port validation",
      "OBD-II diagnostic scan",
      "Test drive report",
    ],
  },
  {
    key: "VINgrade Pre-Sale",
    price: 99,
    sla: "12 hour delivery",
    description: "Standardized photos and condition grade for pre-sale listings.",
    includes: ["Standardized photo set", "Condition grade", "Damage callouts"],
  },
  {
    key: "VINgrade Post-Sale",
    price: 89,
    sla: "12 hour delivery",
    description: "Post-sale grading for wholesale reconciliation.",
    includes: ["Standardized photo set", "Condition grade", "Damage callouts"],
  },
];

const ROLES = [
  "Vehicle Owner",
  "Authorized Representative",
  "Dealer Representative",
  "Fleet Manager",
  "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR + 1 - i);

/* ---- sidebar ---------------------------------------------- */

const NAV = [
  { key: "dashboard",   label: "Dashboard",       icon: LayoutDashboard, group: "Dashboard" },
  { key: "jobs",        label: "Jobs",            icon: Briefcase,       group: "Jobs" },
  { key: "create",      label: "Create Job",      icon: Plus,            group: "Jobs" },
  { key: "bulk-upload", label: "Bulk Upload",     icon: Upload,          group: "Jobs" },
  { key: "reports",     label: "Reports",         icon: FileStack,       group: "Reports" },
  { key: "billing",     label: "Billing",         icon: DollarSign,      group: "Billing" },
  { key: "team",        label: "Team Management", icon: Users,           group: "Team" },
  { key: "settings",    label: "Settings",        icon: Settings,        group: "Settings" },
];

function Sidebar({ current, onNav, onExit }) {
  const grouped = [];
  let last = null;
  for (const item of NAV) {
    if (item.group !== last) {
      grouped.push({ group: item.group, items: [] });
      last = item.group;
    }
    grouped[grouped.length - 1].items.push(item);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-portal-border bg-portal-sidebar font-inter text-portal-text">
      <div className="flex items-center justify-between px-4 pb-6 pt-5">
        <h2 className="max-w-[160px] break-words px-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {ENTERPRISE.short}
        </h2>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-400 hover:bg-portal-card hover:text-slate-200"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {grouped.map((g, gi) => (
          <div key={g.group}>
            {gi > 0 && <div className="my-1 h-px bg-portal-border/60" />}
            {g.items.map((item) => {
              const Icon = item.icon;
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNav(item.key)}
                  className={
                    "mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium transition " +
                    (active
                      ? "bg-portal-card text-portal-text"
                      : "text-portal-text/90 hover:bg-portal-card/60")
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-portal-border/60 p-3">
        <button
          onClick={onExit}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-portal-muted transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

/* ---- shared pieces ---------------------------------------- */

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-portal-text md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-portal-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const STAT_TONE = {
  blue: "text-blue-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  emerald: "text-emerald-500",
};

function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  return (
    <div className="rounded-lg border border-portal-border bg-portal-card/60 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-portal-muted">{label}</div>
        {Icon && <Icon className={"h-4 w-4 " + STAT_TONE[tone]} />}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-portal-text">
        {value}
      </div>
    </div>
  );
}

const STATUS_PILL = {
  Open: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
  Claimed: "bg-violet-500/15 text-violet-400 ring-violet-500/30",
  "In Progress": "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  Completed: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
};

function StatusPill({ status }) {
  const cls = STATUS_PILL[status] || STATUS_PILL.Open;
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset " +
        cls
      }
    >
      {status}
    </span>
  );
}

function OrdersTable({ orders, emptyText = "No orders yet." }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-portal-border bg-portal-card/40 p-8 text-center text-sm text-portal-muted">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-portal-border bg-portal-card/60">
      <table className="w-full text-sm">
        <thead className="border-b border-portal-border text-left text-[11px] font-semibold uppercase tracking-wide text-portal-muted">
          <tr>
            <th className="px-5 py-4">Order ID</th>
            <th className="px-5 py-4">Title</th>
            <th className="px-5 py-4">Location</th>
            <th className="px-5 py-4">Vehicle</th>
            <th className="px-5 py-4">Service Level</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Price</th>
            <th className="px-5 py-4">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border/60">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-portal-card">
              <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-portal-emerald">
                {o.id}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-portal-text">{o.title}</td>
              <td className="whitespace-nowrap px-5 py-4 text-portal-text/80">{o.location}</td>
              <td className="whitespace-nowrap px-5 py-4 text-portal-text/80">{o.vehicle}</td>
              <td className="whitespace-nowrap px-5 py-4 text-portal-text/80">{o.serviceLevel}</td>
              <td className="whitespace-nowrap px-5 py-4">
                <StatusPill status={o.status} />
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-medium text-portal-text">
                {formatUsd(o.price)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-xs text-portal-muted">
                {formatReceived(o.received)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- form primitives -------------------------------------- */

const INPUT_CLS =
  "w-full rounded-md border border-portal-border bg-portal-card/60 px-3 py-2 text-sm text-portal-text placeholder:text-portal-muted focus:border-portal-emerald focus:outline-none";

function Field({ label, children, required, hint, className }) {
  return (
    <label className={"block " + (className || "")}>
      <span className="text-sm font-medium text-portal-text">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-portal-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/* ---- data selectors --------------------------------------- */

function useEnterpriseOrders() {
  const { orders } = useOrderStore();
  return useMemo(
    () => orders.filter((o) => o.requestor === ENTERPRISE.key),
    [orders]
  );
}

function counts(orders) {
  return {
    total: orders.length,
    open: orders.filter((o) => o.status === "Open").length,
    // Bucket Claimed under In Progress from the enterprise's point of view —
    // both mean "someone's on it, not yet delivered".
    inProgress: orders.filter(
      (o) => o.status === "In Progress" || o.status === "Claimed"
    ).length,
    completed: orders.filter((o) => o.status === "Completed").length,
  };
}

/* ---- Dashboard, Jobs, Reports ---------------------------- */

function DashboardPage({ onNav }) {
  const orders = useEnterpriseOrders();
  const c = useMemo(() => counts(orders), [orders]);
  const recent = orders.slice(0, 5);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        subtitle={`Welcome back, ${ENTERPRISE.name}`}
        action={
          <button
            onClick={() => onNav("create")}
            className="inline-flex items-center gap-1.5 rounded-md bg-portal-emerald px-3 py-2 text-sm font-semibold text-slate-900 hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Create Job
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Orders" value={c.total.toLocaleString()} icon={Briefcase} tone="blue" />
        <StatCard label="Open" value={c.open} icon={FolderOpen} tone="amber" />
        <StatCard label="In Progress" value={c.inProgress} icon={Clock} tone="orange" />
        <StatCard label="Completed" value={c.completed.toLocaleString()} icon={CheckCircle} tone="emerald" />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-portal-text">Recent Orders</h2>
          <button
            onClick={() => onNav("jobs")}
            className="inline-flex items-center gap-1 text-xs font-medium text-portal-muted hover:text-portal-text"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <OrdersTable orders={recent} emptyText="No recent orders." />
      </section>
    </div>
  );
}

function JobsPage() {
  const orders = useEnterpriseOrders();
  const c = useMemo(() => counts(orders), [orders]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.vehicle.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="All Orders" subtitle="View and manage all inspection orders" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Orders" value={c.total.toLocaleString()} icon={Briefcase} tone="blue" />
        <StatCard label="Open" value={c.open} icon={FolderOpen} tone="amber" />
        <StatCard label="In Progress" value={c.inProgress} icon={Clock} tone="orange" />
        <StatCard label="Completed" value={c.completed.toLocaleString()} icon={CheckCircle} tone="emerald" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-portal-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders…"
            className={INPUT_CLS + " w-64 pl-8"}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT_CLS + " w-auto"}
        >
          <option value="all">All statuses</option>
          <option value="Open">Open</option>
          <option value="Claimed">Claimed</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <div className="text-xs text-portal-muted">
          {filtered.length === orders.length
            ? `${orders.length} orders`
            : `${filtered.length} of ${orders.length} orders`}
        </div>
      </div>
      <OrdersTable orders={filtered} emptyText="No orders match the current filters." />
    </div>
  );
}

function ReportsPage() {
  const orders = useEnterpriseOrders();
  const completed = useMemo(
    () => orders.filter((o) => o.status === "Completed"),
    [orders]
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Completed inspection reports" />
      <OrdersTable orders={completed} emptyText="No completed reports yet." />
    </div>
  );
}

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="rounded-lg border border-dashed border-portal-border bg-portal-card/40 p-16 text-center">
        <div className="text-sm text-portal-muted">
          This surface is next in the buildout.
        </div>
      </div>
    </div>
  );
}

/* ---- Create Job wizard ------------------------------------ */

const STEP_LABELS = ["Vehicle", "Service", "Location", "Contact", "Review"];

function Stepper({ current, total }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      <div className="md:hidden">
        <span className="text-sm font-medium text-portal-muted">
          Step {current} of {total}
        </span>
      </div>
      <div className="hidden items-center md:flex">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <div key={n} className="flex items-center">
              <div
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition " +
                  (done || active
                    ? "bg-portal-emerald text-slate-900 shadow-lg"
                    : "bg-portal-card text-portal-muted")
                }
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              {i < total - 1 && (
                <div
                  className={
                    "mx-2 h-0.5 w-12 " +
                    (n < current ? "bg-portal-emerald" : "bg-portal-card")
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepHeading({ title, subtitle, center }) {
  return (
    <div className={center ? "mb-6 text-center" : "mb-6"}>
      <h2 className={"font-bold text-portal-text " + (center ? "text-3xl" : "text-2xl")}>{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm text-portal-muted">{subtitle}</p>
      )}
    </div>
  );
}

function SubHeading({ children }) {
  return (
    <h3 className="mb-3 text-lg font-medium text-portal-text">{children}</h3>
  );
}

function VehicleStep({ data, onUpdate }) {
  const v = data.vehicle;
  const setV = (patch) =>
    onUpdate({ vehicle: { ...v, ...patch } });
  const setKnown = (patch) =>
    onUpdate({ known: { ...data.known, ...patch } });

  const autoFill = () => {
    // Demo-only: pretend to decode the VIN and populate year/make/model.
    setV({
      year: "2023",
      make: "Tesla",
      model: "Model Y",
      _autofilled: true,
    });
  };
  const vinValid = v.vin && v.vin.length === 17;

  return (
    <div>
      <StepHeading title="Tell us about the vehicle" />

      <div className="mb-6 rounded-lg border border-portal-emerald/20 bg-portal-emerald/5 p-5">
        <div className="mb-2 text-sm font-semibold text-portal-text">
          VIN{" "}
          <span className="ml-1 text-xs font-normal text-portal-muted">
            (optional — auto-fills year, make, model)
          </span>
        </div>
        <div className="flex gap-2">
          <input
            value={v.vin}
            onChange={(e) => setV({ vin: e.target.value.toUpperCase().slice(0, 17) })}
            placeholder="17-character VIN"
            className={INPUT_CLS + " flex-1 font-mono uppercase tracking-wider"}
          />
          <button
            type="button"
            onClick={autoFill}
            disabled={!vinValid}
            className="rounded-md bg-portal-emerald/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Auto-fill
          </button>
        </div>
        <div className="mt-2 text-xs text-portal-muted">
          {v.vin && v.vin.length < 17
            ? `${v.vin.length}/17 characters`
            : "VIN is usually found on your dashboard or driver-side door frame."}
        </div>
      </div>

      <SubHeading>Vehicle Details</SubHeading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Year" required>
          <select value={v.year} onChange={(e) => setV({ year: e.target.value })} className={INPUT_CLS}>
            <option value="">Select year</option>
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-portal-card text-portal-text">
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Make" required>
          <input value={v.make} onChange={(e) => setV({ make: e.target.value })} placeholder="Toyota" className={INPUT_CLS} />
        </Field>
        <Field label="Model" required>
          <input value={v.model} onChange={(e) => setV({ model: e.target.value })} placeholder="Camry" className={INPUT_CLS} />
        </Field>
        <Field label="Current Mileage">
          <div className="relative">
            <input
              value={v.mileage}
              onChange={(e) => setV({ mileage: e.target.value })}
              placeholder="45000"
              className={INPUT_CLS + " pr-16"}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
              <button
                type="button"
                onClick={() => setV({ mileageUnit: "mi" })}
                className={
                  "rounded-l-md px-2 py-1 text-xs font-semibold " +
                  (v.mileageUnit === "mi"
                    ? "bg-portal-emerald text-slate-900"
                    : "text-portal-muted hover:text-portal-text")
                }
              >
                mi
              </button>
              <button
                type="button"
                onClick={() => setV({ mileageUnit: "km" })}
                className={
                  "rounded-r-md px-2 py-1 text-xs font-semibold " +
                  (v.mileageUnit === "km"
                    ? "bg-portal-emerald text-slate-900"
                    : "text-portal-muted hover:text-portal-text")
                }
              >
                km
              </button>
            </div>
          </div>
        </Field>
        <Field label="Color" className="md:col-span-2">
          <input value={v.color} onChange={(e) => setV({ color: e.target.value })} placeholder="Silver" className={INPUT_CLS} />
        </Field>
      </div>

      <div className="mt-8">
        <SubHeading>Any known issues with this vehicle?</SubHeading>
        <div className="space-y-2">
          {[
            { key: "none",  label: "None that I'm aware of" },
            { key: "minor", label: "Minor issues (cosmetic, small items)" },
            { key: "major", label: "Major issues (mechanical, safety)" },
          ].map((opt) => (
            <label
              key={opt.key}
              className={
                "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition " +
                (data.known.severity === opt.key
                  ? "border-portal-emerald bg-portal-emerald/10 text-portal-text"
                  : "border-portal-border bg-portal-card/40 text-portal-text/90 hover:border-portal-emerald/50")
              }
            >
              <input
                type="radio"
                name="severity"
                checked={data.known.severity === opt.key}
                onChange={() => setKnown({ severity: opt.key })}
                className="accent-portal-emerald"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {data.known.severity === "minor" && (
          <div className="mt-3">
            <Field label="What minor issues should we note?">
              <textarea
                rows={3}
                value={data.known.minor}
                onChange={(e) => setKnown({ minor: e.target.value })}
                className={INPUT_CLS}
              />
            </Field>
          </div>
        )}
        {data.known.severity === "major" && (
          <div className="mt-3">
            <Field
              label={
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  What major issues need attention?
                </span>
              }
            >
              <textarea
                rows={3}
                value={data.known.major}
                onChange={(e) => setKnown({ major: e.target.value })}
                className={INPUT_CLS + " border-orange-500/60 focus:border-orange-500"}
              />
            </Field>
            <div className="mt-2 text-xs text-orange-300/80">
              💡 Consider a VINshield inspection to catch mechanical concerns.
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Field
          label="Recent repairs (optional)"
          hint="Any recent work done on the vehicle."
        >
          <textarea
            rows={3}
            value={data.repairs}
            onChange={(e) => onUpdate({ repairs: e.target.value })}
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </div>
  );
}

function ServiceStep({ data, onUpdate }) {
  return (
    <div>
      <StepHeading
        title="Choose Your Inspection Package"
        subtitle="Select the inspection level that best fits your needs"
        center
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((t) => {
          const selected = data.tier === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onUpdate({ tier: t.key })}
              className={
                "rounded-lg border-2 p-5 text-left transition duration-200 hover:shadow-lg " +
                (selected
                  ? "border-portal-emerald bg-portal-emerald/5 shadow-md"
                  : "border-portal-border bg-portal-card/40 hover:border-portal-emerald/50")
              }
            >
              <div className="text-center">
                <div className="text-base font-bold text-portal-text sm:text-lg">{t.key}</div>
                <div className="mt-1 text-xl font-bold text-portal-emerald sm:text-2xl">
                  {formatUsd(t.price)}
                </div>
                <div className="text-xs text-portal-muted">{t.sla}</div>
                <div className="mt-2 text-sm text-portal-muted">{t.description}</div>
              </div>
              <div className="mt-4 border-t border-portal-border pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-portal-muted">
                  What's included
                </div>
                <ul className="space-y-1.5">
                  {t.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-portal-text/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-portal-emerald" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocationStep({ data, onUpdate }) {
  const l = data.location;
  const setL = (patch) => onUpdate({ location: { ...l, ...patch } });
  return (
    <div>
      <StepHeading
        title="Location & Timing"
        subtitle="Where and when should the inspection take place?"
      />
      <div className="space-y-4">
        <Field label="Address" required>
          <input value={l.addr1} onChange={(e) => setL({ addr1: e.target.value })} placeholder="Street address" className={INPUT_CLS} />
        </Field>
        <Field label="Address line 2 (optional)">
          <input value={l.addr2} onChange={(e) => setL({ addr2: e.target.value })} placeholder="Apt, suite, etc." className={INPUT_CLS} />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="City" required>
            <input value={l.city} onChange={(e) => setL({ city: e.target.value })} placeholder="Seattle" className={INPUT_CLS} />
          </Field>
          <Field label="State" required>
            <input
              value={l.state}
              onChange={(e) => setL({ state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="WA"
              className={INPUT_CLS + " uppercase"}
            />
          </Field>
          <Field label="Vehicle Zip Code">
            <input value={l.zip} onChange={(e) => setL({ zip: e.target.value })} placeholder="98101" className={INPUT_CLS} />
          </Field>
        </div>
        <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-semibold text-amber-300">Important:</span> Enter the zip code where the vehicle is currently located, not your billing address.
          </div>
        </div>
        <Field label="Additional Notes (Optional)">
          <textarea
            rows={4}
            value={l.notes}
            onChange={(e) => setL({ notes: e.target.value })}
            placeholder="Access instructions, gate codes, best times, etc."
            className={INPUT_CLS}
          />
        </Field>
      </div>
    </div>
  );
}

function ContactStep({ data, onUpdate }) {
  const c = data.contact;
  const setC = (patch) => onUpdate({ contact: { ...c, ...patch } });
  return (
    <div>
      <StepHeading
        title="Contact Information"
        subtitle="Who should our inspector contact to coordinate?"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Contact Name" required>
          <input value={c.name} onChange={(e) => setC({ name: e.target.value })} placeholder="Full name" className={INPUT_CLS} />
        </Field>
        <Field label="Phone Number" required>
          <input value={c.phone} onChange={(e) => setC({ phone: e.target.value })} placeholder="(555) 000-0000" type="tel" className={INPUT_CLS} />
        </Field>
        <Field label="Role">
          <select value={c.role} onChange={(e) => setC({ role: e.target.value })} className={INPUT_CLS}>
            <option value="">Select role</option>
            {ROLES.map((r) => (
              <option key={r} value={r} className="bg-portal-card text-portal-text">
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Best time to reach">
          <input value={c.bestTime} onChange={(e) => setC({ bestTime: e.target.value })} placeholder="Weekday mornings" className={INPUT_CLS} />
        </Field>
        {c.role === "Other" && (
          <Field label="Please specify" className="md:col-span-2">
            <input value={c.roleOther} onChange={(e) => setC({ roleOther: e.target.value })} className={INPUT_CLS} />
          </Field>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ n, title, onEdit, children }) {
  return (
    <div className="rounded-lg border border-portal-border bg-portal-card/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-portal-emerald text-sm font-bold text-slate-900">
            {n}
          </div>
          <div className="text-lg font-semibold text-portal-text">{title}</div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-portal-muted hover:bg-portal-card hover:text-portal-text"
        >
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-portal-muted">{label}</div>
      <div className="mt-0.5 text-sm text-portal-text">{value || "—"}</div>
    </div>
  );
}

function ReviewStep({ data, onJump }) {
  const tier = TIERS.find((t) => t.key === data.tier);
  return (
    <div>
      <StepHeading
        title="Review Customer Request"
        subtitle="Confirm the details below, then submit to send the inspection to the provider network."
        center
      />
      <div className="grid gap-4">
        <ReviewCard n={1} title="Vehicle Information" onEdit={() => onJump(1)}>
          <div className="grid grid-cols-2 gap-4">
            <KV label="Year" value={data.vehicle.year} />
            <KV label="Make" value={data.vehicle.make} />
            <KV label="Model" value={data.vehicle.model} />
            <KV label="Color" value={data.vehicle.color} />
            <KV label="Mileage" value={data.vehicle.mileage && `${data.vehicle.mileage} ${data.vehicle.mileageUnit}`} />
            {data.vehicle.vin && (
              <div className="col-span-2">
                <div className="text-xs uppercase tracking-wide text-portal-muted">VIN</div>
                <div className="mt-0.5 font-mono text-xs text-portal-text">{data.vehicle.vin}</div>
              </div>
            )}
          </div>
          {(data.known.severity !== "none" || data.repairs) && (
            <div className="mt-4 space-y-3 border-t border-portal-border pt-4">
              {data.known.severity === "minor" && (
                <KV label="Known issues (minor)" value={data.known.minor} />
              )}
              {data.known.severity === "major" && (
                <KV label="Known issues (major)" value={data.known.major} />
              )}
              {data.repairs && <KV label="Recent repairs" value={data.repairs} />}
            </div>
          )}
        </ReviewCard>

        <ReviewCard n={2} title="Service Package" onEdit={() => onJump(2)}>
          {tier ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-portal-text">{tier.key}</div>
                  <div className="mt-1 text-sm text-portal-muted">{tier.description}</div>
                  <span className="mt-2 inline-flex items-center rounded-full bg-portal-card px-2 py-0.5 text-xs font-medium text-portal-text/80">
                    {tier.sla}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold text-portal-emerald">
                    {formatUsd(tier.price)}
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-portal-border pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-portal-muted">
                  Standard inspection checklist
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {tier.includes.map((line) => (
                    <div key={line} className="flex items-start gap-2 text-sm text-portal-text/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-portal-emerald" />
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-portal-muted">No service selected.</div>
          )}
        </ReviewCard>

        <ReviewCard n={3} title="Location & Timing" onEdit={() => onJump(3)}>
          <div className="text-sm text-portal-text/90">
            {data.location.addr1}
            {data.location.addr2 ? `, ${data.location.addr2}` : ""}
            {data.location.addr1 && <br />}
            {data.location.city}
            {data.location.state ? `, ${data.location.state}` : ""} {data.location.zip}
          </div>
          {data.location.notes && (
            <div className="mt-3">
              <KV label="Additional notes" value={data.location.notes} />
            </div>
          )}
        </ReviewCard>

        <ReviewCard n={4} title="Contact Information" onEdit={() => onJump(4)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <KV label="Name" value={data.contact.name} />
            <KV label="Phone" value={data.contact.phone} />
            <KV label="Role" value={data.contact.role === "Other" ? data.contact.roleOther : data.contact.role} />
            <KV label="Best time to reach" value={data.contact.bestTime} />
          </div>
        </ReviewCard>

        <div className="rounded-lg border border-portal-emerald/20 bg-portal-emerald/5 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-portal-muted">Total Price (before taxes)</div>
            <div className="text-3xl font-bold text-portal-emerald">
              {tier ? formatUsd(tier.price) : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateJobWizard({ onCreated }) {
  const { addOrder } = useOrderStore();
  const [step, setStep] = useState(1);
  const TOTAL = 5;
  const [data, setData] = useState({
    vehicle: { year: "", make: "", model: "", vin: "", mileage: "", mileageUnit: "mi", color: "" },
    known: { severity: "none", minor: "", major: "" },
    repairs: "",
    tier: null,
    location: { addr1: "", addr2: "", city: "", state: "", zip: "", notes: "" },
    contact: { name: "", phone: "", role: "", roleOther: "", bestTime: "" },
  });
  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return !!(data.vehicle.year && data.vehicle.make && data.vehicle.model);
      case 2:
        return !!data.tier;
      case 3:
        return !!(data.location.addr1 && data.location.city && data.location.state);
      case 4:
        return !!(data.contact.name && data.contact.phone);
      default:
        return true;
    }
  }, [step, data]);

  const submit = () => {
    const tier = TIERS.find((t) => t.key === data.tier);
    addOrder({
      requestor: ENTERPRISE.key,
      title: data.contact.name || ENTERPRISE.name,
      location: `${data.location.city}, ${data.location.state}`,
      vehicle: `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}`.trim(),
      serviceLevel: data.tier,
      price: tier ? tier.price : 0,
    });
    onCreated();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Stepper current={step} total={TOTAL} />
      <div className="rounded-xl border border-portal-border bg-portal-card/70 p-6 shadow-2xl sm:p-8">
        {step === 1 && <VehicleStep data={data} onUpdate={update} />}
        {step === 2 && <ServiceStep data={data} onUpdate={update} />}
        {step === 3 && <LocationStep data={data} onUpdate={update} />}
        {step === 4 && <ContactStep data={data} onUpdate={update} />}
        {step === 5 && <ReviewStep data={data} onJump={setStep} />}

        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex-1 rounded-md border border-portal-border bg-transparent px-4 py-2 text-sm font-semibold text-portal-text transition hover:bg-portal-card disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {step < TOTAL ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(TOTAL, s + 1))}
              disabled={!canProceed}
              className="flex-1 rounded-md bg-portal-emerald px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-portal-emerald px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-110"
            >
              Submit Request <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- entry ------------------------------------------------ */

export function EnterprisePortal({ onExit }) {
  const [sub, setSub] = useState("dashboard");
  return (
    <div className="flex h-full bg-portal-bg font-inter text-portal-text">
      <Sidebar current={sub} onNav={setSub} onExit={onExit} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {sub === "dashboard"   && <DashboardPage onNav={setSub} />}
        {sub === "jobs"        && <JobsPage />}
        {sub === "create"      && <CreateJobWizard onCreated={() => setSub("jobs")} />}
        {sub === "bulk-upload" && <PlaceholderPage title="Bulk Upload" subtitle="Import multiple inspection orders at once" />}
        {sub === "reports"     && <ReportsPage />}
        {sub === "billing"     && <PlaceholderPage title="Billing" subtitle="Invoices and payment history" />}
        {sub === "team"        && <PlaceholderPage title="Team Management" subtitle="Invite and manage team members" />}
        {sub === "settings"    && <PlaceholderPage title="Settings" subtitle="Company profile and preferences" />}
      </main>
    </div>
  );
}
