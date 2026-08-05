import React, { useState } from "react";
import {
  LayoutGrid,
  Briefcase,
  Plus,
  Upload,
  UploadCloud,
  FileText,
  DollarSign,
  Users,
  Settings,
  LogOut,
  PanelLeft,
  FolderOpen,
  Clock,
  CheckCircle2,
  Search,
  Download,
  ArrowRight,
} from "lucide-react";
import { useOrderStore, formatReceived, formatUsd, SERVICE_LEVELS } from "./OrderStore.jsx";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "create", label: "Create Job", icon: Plus },
  { key: "bulk", label: "Bulk Upload", icon: Upload },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "billing", label: "Billing", icon: DollarSign },
  { key: "team", label: "Team Management", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
];

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition " +
        (active
          ? "bg-white/[0.06] text-white"
          : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200")
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function Sidebar({ subview, onSelect, onLogOut }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-[#0b1730] px-3 py-5">
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Test Enterprise Co
        </div>
        <button
          aria-label="Collapse sidebar"
          className="text-slate-500 hover:text-slate-300"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={subview === item.key}
            onClick={() => onSelect(item.key)}
          />
        ))}
      </nav>
      <button
        onClick={onLogOut}
        className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
      >
        <LogOut className="h-4 w-4" />
        <span>Log Out</span>
      </button>
    </aside>
  );
}

/* ---- Jobs page ------------------------------------------------- */

const STAT_TINTS = {
  blue: "text-blue-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
};

function StatCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between">
        <div className="text-sm text-slate-400">{label}</div>
        <Icon className={"h-4 w-4 " + STAT_TINTS[tint]} />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value.toLocaleString("en-US")}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    Open: "border-blue-400/60 bg-blue-500/10 text-blue-300",
    "In Progress": "border-amber-400/60 bg-amber-500/10 text-amber-300",
    Completed: "border-emerald-400/60 bg-emerald-500/10 text-emerald-300",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium " +
        (styles[status] ?? "border-slate-500 text-slate-300")
      }
    >
      {status}
    </span>
  );
}

function OrderRow({ order }) {
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-6 py-4 font-mono text-sm font-semibold text-emerald-400">{order.id}</td>
      <td className="px-6 py-4 text-sm text-white">{order.title}</td>
      <td className="px-6 py-4 text-sm text-slate-300">{order.location}</td>
      <td className="px-6 py-4 text-sm text-slate-300">{order.vehicle}</td>
      <td className="px-6 py-4 text-sm text-slate-300">{order.serviceLevel}</td>
      <td className="px-6 py-4">
        <StatusPill status={order.status} />
      </td>
      <td className="px-6 py-4 text-sm text-white">{formatUsd(order.price)}</td>
      <td className="px-6 py-4 text-sm text-slate-400">{formatReceived(order.received)}</td>
    </tr>
  );
}

function JobsPage() {
  const { orders } = useOrderStore();
  const myOrders = orders.filter((o) => o.requestor === "test-enterprise");
  const counts = {
    total: myOrders.length,
    open: myOrders.filter((o) => o.status === "Open").length,
    inProgress: myOrders.filter((o) => o.status === "In Progress").length,
    completed: myOrders.filter((o) => o.status === "Completed").length,
  };
  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">All Orders</h1>
        <p className="mt-1 text-sm text-slate-400">View and manage all inspection orders</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={counts.total} icon={Briefcase} tint="blue" />
        <StatCard label="Open" value={counts.open} icon={FolderOpen} tint="amber" />
        <StatCard label="In Progress" value={counts.inProgress} icon={Clock} tint="amber" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} tint="emerald" />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
        <Search className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-500">Search orders</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3 font-medium">Order ID</th>
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Location</th>
              <th className="px-6 py-3 font-medium">Vehicle</th>
              <th className="px-6 py-3 font-medium">Service Level</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {myOrders.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Create Job page ------------------------------------------- */

const DEFAULT_PRICE = {
  "VINsight": 219,
  "VINsight EV": 259,
  "VINshield": 349,
  "VINshield EV": 429,
  "VINgrade Pre-Sale": 99,
  "VINgrade Post-Sale": 89,
};

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30";

function Label({ children }) {
  return (
    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
      {children}
    </label>
  );
}

function CreateJobPage({ onCreated }) {
  const { addOrder } = useOrderStore();
  const [requestor, setRequestor] = useState("Test Enterprise Co");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [serviceLevel, setServiceLevel] = useState("VINsight");
  const [price, setPrice] = useState(String(DEFAULT_PRICE["VINsight"]));

  const onServiceLevelChange = (sl) => {
    setServiceLevel(sl);
    setPrice(String(DEFAULT_PRICE[sl] ?? ""));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanYear = year.trim();
    const cleanMake = make.trim();
    const cleanModel = model.trim();
    const priceNum = Number(price);
    if (!requestor.trim() || !cleanYear || !cleanMake || !cleanModel || !city.trim() || !state.trim() || !Number.isFinite(priceNum)) {
      return;
    }
    addOrder({
      requestor: "test-enterprise",
      title: requestor.trim(),
      location: `${city.trim()}, ${state.trim().toUpperCase()}`,
      vehicle: [cleanYear, cleanMake, cleanModel].join(" "),
      vin: vin.trim() || undefined,
      serviceLevel,
      price: priceNum,
    });
    onCreated();
  };

  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">Create Job</h1>
        <p className="mt-1 text-sm text-slate-400">Add a new inspection order to your queue</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div>
          <Label>Requestor</Label>
          <input
            type="text"
            value={requestor}
            onChange={(e) => setRequestor(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <Label>Vehicle</Label>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              placeholder="Year"
              inputMode="numeric"
              maxLength={4}
              className={inputClass}
            />
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              required
              placeholder="Make"
              className={inputClass}
            />
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              placeholder="Model"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <Label>VIN <span className="text-slate-500 normal-case">(optional)</span></Label>
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="17-character VIN"
            maxLength={17}
            className={inputClass + " tracking-wider"}
          />
        </div>

        <div>
          <Label>Location</Label>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              placeholder="City"
              className={inputClass + " col-span-2"}
            />
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              placeholder="State"
              maxLength={2}
              className={inputClass + " uppercase"}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Service Level</Label>
            <select
              value={serviceLevel}
              onChange={(e) => onServiceLevelChange(e.target.value)}
              className={inputClass + " appearance-none pr-8"}
            >
              {SERVICE_LEVELS.map((sl) => (
                <option key={sl} value={sl} className="bg-slate-900">
                  {sl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Price (USD)</Label>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-6">
          <button
            type="button"
            onClick={onCreated}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            Create Job
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---- Dashboard ------------------------------------------------- */

function myOrdersFrom(orders) {
  return orders.filter((o) => o.requestor === "test-enterprise");
}

function Dashboard({ onNavigate }) {
  const { orders } = useOrderStore();
  const myOrders = myOrdersFrom(orders);
  const counts = {
    total: myOrders.length,
    open: myOrders.filter((o) => o.status === "Open").length,
    inProgress: myOrders.filter((o) => o.status === "In Progress").length,
    completed: myOrders.filter((o) => o.status === "Completed").length,
  };
  const recent = myOrders.slice(0, 5);
  const byLevel = SERVICE_LEVELS.map((sl) => ({
    label: sl,
    count: myOrders.filter((o) => o.serviceLevel === sl).length,
  }));
  const maxCount = Math.max(...byLevel.map((b) => b.count), 1);

  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Enterprise inspection activity at a glance</p>
        </div>
        <button
          onClick={() => onNavigate("create")}
          className="flex shrink-0 items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Create Job
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={counts.total} icon={Briefcase} tint="blue" />
        <StatCard label="Open" value={counts.open} icon={FolderOpen} tint="amber" />
        <StatCard label="In Progress" value={counts.inProgress} icon={Clock} tint="amber" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} tint="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent orders</h2>
            <button
              onClick={() => onNavigate("jobs")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recent.length === 0 && (
              <div className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                No orders yet.
              </div>
            )}
            {recent.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-emerald-400">{o.id}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-200">{o.vehicle}</div>
                </div>
                <div className="shrink-0 text-xs text-slate-500">{formatReceived(o.received)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-sm font-semibold text-white">Orders by service level</h2>
          <div className="space-y-4">
            {byLevel.map(({ label, count }) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{label}</span>
                  <span className="text-slate-400">{count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-emerald-400/70 transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Static pages ---------------------------------------------- */

const EXPECTED_COLUMNS = [
  "requestor_title",
  "vehicle_year",
  "vehicle_make",
  "vehicle_model",
  "vin",
  "city",
  "state",
  "service_level",
];

function BulkUploadPage() {
  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">Bulk Upload</h1>
        <p className="mt-1 text-sm text-slate-400">Create many inspection orders at once from a CSV file</p>
      </div>

      <div className="mb-6 max-w-3xl rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center">
          <UploadCloud className="h-10 w-10 text-slate-500" />
          <div className="mt-4 text-lg font-semibold text-slate-200">Drop a CSV or click to browse</div>
          <div className="mt-1 text-sm text-slate-500">Up to 500 orders per file</div>
        </div>
      </div>

      <div className="mb-6 max-w-3xl rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="mb-3 text-sm font-semibold text-white">Expected columns</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXPECTED_COLUMNS.map((c) => (
            <code
              key={c}
              className="rounded bg-white/5 px-2 py-1 text-center font-mono text-xs text-slate-300"
            >
              {c}
            </code>
          ))}
        </div>
      </div>

      <button
        disabled
        className="cursor-not-allowed rounded-md bg-white/5 px-6 py-2.5 text-sm font-bold text-slate-500"
      >
        Upload
      </button>
    </div>
  );
}

const MOCK_REPORTS = [
  { name: "August order summary", period: "Aug 1 to Aug 31, 2026", size: "24 KB" },
  { name: "Completed inspections export", period: "Q3 2026", size: "182 KB" },
  { name: "Service level breakdown", period: "Last 90 days", size: "12 KB" },
  { name: "Billing reconciliation", period: "July 2026", size: "48 KB" },
];

function ReportsPage() {
  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Download recent activity reports</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3 font-medium">Report</th>
              <th className="px-6 py-3 font-medium">Period</th>
              <th className="px-6 py-3 font-medium">Size</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {MOCK_REPORTS.map((r) => (
              <tr key={r.name} className="border-t border-white/5">
                <td className="px-6 py-4 text-sm text-white">{r.name}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{r.period}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{r.size}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    disabled
                    aria-label="Download"
                    className="cursor-not-allowed rounded-md p-2 text-slate-500"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MOCK_INVOICES = [
  { id: "INV-2026-08", period: "August 2026", amount: 12480, status: "Open" },
  { id: "INV-2026-07", period: "July 2026",   amount:  9820, status: "Paid" },
  { id: "INV-2026-06", period: "June 2026",   amount: 11255, status: "Paid" },
  { id: "INV-2026-05", period: "May 2026",    amount:  8905, status: "Paid" },
];

function BillingPage() {
  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">Billing</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your subscription and invoices</p>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current balance
          </div>
          <div className="mt-3 text-4xl font-bold text-white">{formatUsd(12480)}</div>
          <div className="mt-1 text-xs text-slate-500">Due Sep 15, 2026</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Payment method
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
              Visa
            </span>
            <span className="font-mono text-sm text-white">•••• 4242</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Expires 12/28</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="border-b border-white/5 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Recent invoices</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3 font-medium">Invoice</th>
              <th className="px-6 py-3 font-medium">Period</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv) => (
              <tr key={inv.id} className="border-t border-white/5">
                <td className="px-6 py-4 font-mono text-sm font-semibold text-emerald-400">{inv.id}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{inv.period}</td>
                <td className="px-6 py-4 text-sm text-white">{formatUsd(inv.amount)}</td>
                <td className="px-6 py-4">
                  <StatusPill status={inv.status === "Paid" ? "Completed" : "Open"} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    disabled
                    aria-label="Download invoice"
                    className="cursor-not-allowed rounded-md p-2 text-slate-500"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MOCK_TEAM = [
  { name: "Alex Chen",    role: "Admin",       email: "alex@test-enterprise.co",    status: "Active" },
  { name: "Priya Patel",  role: "Ops Manager", email: "priya@test-enterprise.co",   status: "Active" },
  { name: "Marcus Reed",  role: "Coordinator", email: "marcus@test-enterprise.co",  status: "Active" },
  { name: "Sam Rivera",   role: "Coordinator", email: "sam@test-enterprise.co",     status: "Invited" },
];

function TeamPage() {
  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Team Management</h1>
          <p className="mt-1 text-sm text-slate-400">Users with access to this enterprise account</p>
        </div>
        <button
          disabled
          className="flex cursor-not-allowed items-center gap-2 rounded-md bg-white/5 px-4 py-2 text-sm font-bold text-slate-500"
        >
          <Plus className="h-4 w-4" /> Invite member
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TEAM.map((m) => (
              <tr key={m.email} className="border-t border-white/5">
                <td className="px-6 py-4 text-sm text-white">{m.name}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{m.role}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{m.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={
                      "text-xs font-medium " +
                      (m.status === "Active" ? "text-emerald-400" : "text-amber-400")
                    }
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage() {
  const disabledInput = inputClass + " cursor-not-allowed opacity-70";
  return (
    <div className="min-h-full bg-[#050b1c] px-10 py-10 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Organization preferences</p>
      </div>

      <div className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <div>
          <Label>Organization name</Label>
          <input disabled defaultValue="Test Enterprise Co" className={disabledInput} />
        </div>
        <div>
          <Label>Notification email</Label>
          <input disabled defaultValue="ops@test-enterprise.co" className={disabledInput} />
        </div>
        <div>
          <Label>Default service level</Label>
          <select disabled defaultValue="VINsight" className={disabledInput + " appearance-none pr-8"}>
            {SERVICE_LEVELS.map((sl) => (
              <option key={sl} value={sl} className="bg-slate-900">
                {sl}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Timezone</Label>
          <input disabled defaultValue="America/Los_Angeles" className={disabledInput} />
        </div>
      </div>
    </div>
  );
}

/* ---- Portal shell ---------------------------------------------- */

export function EnterprisePortal() {
  const [subview, setSubview] = useState("dashboard");

  const handleLogOut = () => {
    try {
      sessionStorage.removeItem("inspectd_demo_access");
    } catch {
      // ignore
    }
    window.location.reload();
  };

  return (
    <div className="flex h-full bg-[#050b1c] text-white">
      <Sidebar subview={subview} onSelect={setSubview} onLogOut={handleLogOut} />
      <main className="flex-1 overflow-auto">
        {subview === "dashboard" && <Dashboard onNavigate={setSubview} />}
        {subview === "jobs" && <JobsPage />}
        {subview === "create" && <CreateJobPage onCreated={() => setSubview("jobs")} />}
        {subview === "bulk" && <BulkUploadPage />}
        {subview === "reports" && <ReportsPage />}
        {subview === "billing" && <BillingPage />}
        {subview === "team" && <TeamPage />}
        {subview === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
