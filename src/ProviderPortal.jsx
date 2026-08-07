import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Check,
  CheckCircle,
  ClipboardCheck,
  CloudUpload,
  CreditCard,
  DollarSign,
  Eye,
  FileStack,
  FileText,
  Link2,
  List as ListIcon,
  Loader2,
  LogOut,
  Map as MapIcon,
  MapPin,
  Navigation,
  PanelLeft,
  Play,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Upload as UploadIcon,
  Users,
  X,
} from "lucide-react";
import {
  ageColor,
  ageString,
  formatReceived,
  formatUsd,
  providerPayout,
  useOrderStore,
} from "./OrderStore.jsx";
import VINmap, { haversineMiles, zipCoords } from "./VINmap.jsx";

const PROVIDER = {
  key: "test-provider",
  name: "Test Provider Co",
  short: "TEST PROVIDER CO",
};

/* ---- client-type badge styling (matches JobCard.tsx) ---- */

const CLIENT_CHIP = {
  FLEET:       "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MARKETPLACE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ARBITRATION: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DEALER:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LENDER:      "bg-violet-500/10 text-violet-400 border-violet-500/20",
  OEM:         "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  INDIVIDUAL:  "bg-slate-500/10 text-slate-400 border-slate-700",
};

function ClientChip({ type }) {
  const cls = CLIENT_CHIP[type] || CLIENT_CHIP.INDIVIDUAL;
  return (
    <span
      className={
        "inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wide " +
        cls
      }
    >
      Ordered by: {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

/* ---- sidebar --------------------------------------------- */

const NAV_TOP = [
  { key: "board",       label: "Job Board",           icon: ShoppingCart,   badge: null },
  { key: "active",      label: "Active Claimed Jobs", icon: Briefcase },
  { key: "upload",      label: "Upload Data",         icon: CloudUpload },
  { key: "reports",     label: "Completed Reports",   icon: FileStack },
];
const NAV_BOTTOM = [
  { key: "team",        label: "Team Management",     icon: Users },
  { key: "settings",    label: "Payout Settings",     icon: CreditCard,     badge: "$" },
];

function Sidebar({ current, onNav, onExit, counts }) {
  const badgeFor = (k) => {
    if (k === "board") return counts.open;
    if (k === "active") return counts.claimed + counts.inProgress;
    if (k === "reports") return counts.completedByProvider;
    return null;
  };
  const renderItem = (item) => {
    const Icon = item.icon;
    const active = current === item.key;
    const count = badgeFor(item.key);
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
        <span className="flex-1 text-left">{item.label}</span>
        {typeof count === "number" && count > 0 && (
          <span className="rounded bg-portal-emerald/15 px-1.5 py-0.5 text-[10px] font-bold text-portal-emerald">
            {count}
          </span>
        )}
        {item.badge && (
          <span className="rounded bg-portal-card px-1.5 py-0.5 text-[10px] font-bold text-portal-muted">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-portal-border bg-portal-sidebar font-inter text-portal-text">
      <div className="flex items-center justify-between px-4 pb-6 pt-5">
        <h2 className="max-w-[160px] break-words px-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {PROVIDER.short}
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
        <div>{NAV_TOP.map(renderItem)}</div>
        <div className="my-2 h-px bg-portal-border/60" />
        <div>{NAV_BOTTOM.map(renderItem)}</div>
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

/* ---- shared primitives ----------------------------------- */

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
  Open:          "bg-blue-500/15 text-blue-400 ring-blue-500/30",
  Claimed:       "bg-violet-500/15 text-violet-400 ring-violet-500/30",
  "In Progress": "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  Completed:     "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
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

const INPUT_CLS =
  "w-full rounded-md border border-portal-border bg-portal-card/80 px-3 py-2 text-sm text-portal-text placeholder:text-portal-muted focus:border-portal-emerald focus:outline-none";

/* ---- marketplace compact JobCard ------------------------- */

function siteTypeFor(job) {
  const t = (job.title || "").toLowerCase();
  if (["manheim", "adesa", "iaai", "copart", "openlane", "auction"].some((k) => t.includes(k)))
    return "Auto Auction";
  if (t.includes("dealer")) return "Dealership";
  return "Private Residence";
}

function MarketplaceJobCard({ job, distance, onOpen, onClaim }) {
  const payout = providerPayout(job.price);
  const site = siteTypeFor(job);
  const [city, state] = String(job.location || "").split(",").map((s) => s.trim());
  return (
    <div
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col gap-0 overflow-hidden rounded-lg border border-portal-border/60 bg-portal-card/50 px-3 py-2 transition-all duration-200 hover:border-portal-emerald/40"
    >
      {/* Row 1: Vehicle | AGE */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-0 text-sm">
          <span className="truncate font-bold uppercase tracking-wide text-white">
            {job.vehicle}
          </span>
          <span className="mx-1.5 text-slate-600">•</span>
          <span className="text-xs text-slate-400">{job.serviceLevel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            AGE
          </span>
          <span
            className={
              "font-mono text-sm font-bold tabular-nums " + ageColor(job.received)
            }
          >
            {ageString(job.received)}
          </span>
        </div>
      </div>
      {/* Row 2: Location + Requester | Payout + Actions */}
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-0 text-sm text-slate-400">
          <span>📍</span>
          <span className="ml-0.5 font-mono">{job.zip || "—"}</span>
          <span className="mx-1.5 text-slate-600">•</span>
          <span>{city || "—"}{state ? `, ${state}` : ""}</span>
          <span className="mx-1.5 text-slate-600">•</span>
          <span>at {site}</span>
          {distance !== undefined && (
            <>
              <span className="mx-1.5 text-slate-600">•</span>
              <span className="font-bold text-emerald-400">{distance}mi</span>
            </>
          )}
          <span className="mx-1.5 text-slate-600">•</span>
          <ClientChip type={job.clientType || "INDIVIDUAL"} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-2xl font-bold leading-none tabular-nums text-emerald-400">
            {formatUsd(payout)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="inline-flex h-6 items-center gap-0.5 px-2 text-xs font-medium text-slate-300 hover:text-emerald-400"
          >
            <Link2 className="mr-0.5 h-3.5 w-3.5" />
            Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClaim(job);
            }}
            className="h-6 rounded bg-emerald-500 px-2.5 text-[10px] font-bold text-slate-950 hover:bg-emerald-400"
          >
            CLAIM
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- JobDetails modal ------------------------------------ */

function ModalLabel({ children }) {
  return <div className="text-xs font-semibold uppercase text-slate-500">{children}</div>;
}
function ModalValue({ children, className = "" }) {
  return <div className={"text-base font-medium text-slate-100 " + className}>{children}</div>;
}
function SectionTitle({ children }) {
  return (
    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
      {children}
    </h3>
  );
}

function JobDetailsModal({ job, onClose, onClaim, canClaim }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!job) return null;

  const payout = providerPayout(job.price);
  const site = siteTypeFor(job);
  const [city, state] = String(job.location || "").split(",").map((s) => s.trim());
  const isAuction = site === "Auto Auction";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-slate-700/50 bg-slate-950 text-slate-200 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="text-lg font-extrabold text-emerald-400">
              {job.vehicle}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-emerald-400/70">
                Order {job.id}
              </span>
              <span className="text-slate-600">•</span>
              <span
                className={
                  "rounded border px-1.5 py-0 text-[10px] font-black uppercase tracking-[0.12em] " +
                  (isAuction
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : site === "Dealership"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-600 text-slate-400")
                }
              >
                {site}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-6">
            {/* Customer Intent */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <div className="mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400">
                  Customer Intent
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug text-slate-200">
                {ordersIntentCopy(job)}
              </p>
            </div>

            {/* Middle row: Overview + Location */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <SectionTitle>Overview</SectionTitle>
                <div className="space-y-3">
                  <div>
                    <ModalLabel>Provider Payout</ModalLabel>
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatUsd(payout)}
                    </div>
                  </div>
                  <div>
                    <ModalLabel>Service Package</ModalLabel>
                    <ModalValue>{job.serviceLevel}</ModalValue>
                  </div>
                  <div>
                    <ModalLabel>Order ID</ModalLabel>
                    <ModalValue className="font-mono">{job.id}</ModalValue>
                  </div>
                  <div>
                    <ModalLabel>Status</ModalLabel>
                    <div className="mt-1">
                      <StatusPill status={job.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <SectionTitle>Location &amp; Timing</SectionTitle>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <ModalLabel>City</ModalLabel>
                      <ModalValue>{city || "—"}</ModalValue>
                    </div>
                    <div>
                      <ModalLabel>State</ModalLabel>
                      <ModalValue>{state || "—"}</ModalValue>
                    </div>
                  </div>
                  <div>
                    <ModalLabel>ZIP</ModalLabel>
                    <ModalValue className="font-mono">{job.zip || "—"}</ModalValue>
                  </div>
                  <div>
                    <ModalLabel>Site Type</ModalLabel>
                    <ModalValue>{site}</ModalValue>
                  </div>
                  <div>
                    <ModalLabel>Posted</ModalLabel>
                    <ModalValue>{formatReceived(job.received)}</ModalValue>
                  </div>
                  <div>
                    <ModalLabel>Age</ModalLabel>
                    <div
                      className={
                        "font-mono text-base font-bold tabular-nums " +
                        ageColor(job.received)
                      }
                    >
                      {ageString(job.received)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <SectionTitle>Vehicle Information</SectionTitle>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <ModalLabel>Vehicle</ModalLabel>
                  <ModalValue>{job.vehicle}</ModalValue>
                </div>
                <div>
                  <ModalLabel>Service Level</ModalLabel>
                  <ModalValue>{job.serviceLevel}</ModalValue>
                </div>
                <div>
                  <ModalLabel>Requestor</ModalLabel>
                  <ModalValue>{job.title}</ModalValue>
                </div>
              </div>
            </div>

            {/* Requester */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <SectionTitle>Requester</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ModalLabel>Client</ModalLabel>
                  <ModalValue>{job.title}</ModalValue>
                </div>
                <div>
                  <ModalLabel>Client Type</ModalLabel>
                  <ModalValue>
                    <ClientChip type={job.clientType || "INDIVIDUAL"} />
                  </ModalValue>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border-none bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Close
          </button>
          <button
            onClick={() => onClaim(job)}
            disabled={!canClaim}
            className={
              "rounded-md px-4 py-2 text-sm font-bold " +
              (canClaim
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                : "cursor-not-allowed border border-blue-800/60 bg-blue-900/40 text-blue-300")
            }
          >
            {canClaim ? "Claim Job" : "Already Claimed"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ordersIntentCopy(job) {
  const map = {
    DEALER: "Dealer inventory assessment — wholesale or retail lot.",
    FLEET: "Fleet operator inspection — enterprise pool management.",
    LENDER: "Lender verification — collateral or repossession check.",
    OEM: "OEM audit — factory or authorized channel inspection.",
    MARKETPLACE: "Marketplace listing verification — pre-sale grading.",
    ARBITRATION: "Post-sale arbitration inspection — dispute review.",
    INDIVIDUAL: "Individual customer inspection.",
  };
  return map[job.clientType] || map.INDIVIDUAL;
}

/* ---- Job Board (list + map + filters) -------------------- */

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Payout" },
  { value: "lowest", label: "Lowest Payout" },
  { value: "nearest", label: "Nearest First" },
  { value: "city-asc", label: "City (A-Z)" },
  { value: "state-asc", label: "State (A-Z)" },
  { value: "zip-asc", label: "ZIP (Low-High)" },
];

function JobBoardPage({ onOpenDetails, onClaim }) {
  const { orders } = useOrderStore();
  const [mode, setMode] = useState("list"); // list | map
  const [search, setSearch] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(50);
  const [sortBy, setSortBy] = useState("newest");

  const openJobs = useMemo(
    () => orders.filter((o) => o.status === "Open"),
    [orders]
  );

  const centerCoords = useMemo(() => {
    if (!zip || zip.length !== 5) return null;
    return zipCoords(zip);
  }, [zip]);

  const distanceMap = useMemo(() => {
    if (!centerCoords) return {};
    const m = {};
    for (const job of openJobs) {
      const c = zipCoords(job.zip);
      if (!c) continue;
      m[job.id] = Math.round(
        haversineMiles(centerCoords.lat, centerCoords.lng, c.lat, c.lng)
      );
    }
    return m;
  }, [centerCoords, openJobs]);

  const jobs = useMemo(() => {
    let filtered = openJobs;

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((o) => {
        const hay = [
          o.id,
          o.title,
          o.vehicle,
          o.location,
          o.zip,
          o.serviceLevel,
          o.clientType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // Radius
    if (centerCoords) {
      filtered = filtered.filter((o) => {
        const d = distanceMap[o.id];
        return d === undefined || d <= radius;
      });
    }

    // Sort
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.received) - new Date(a.received);
        case "oldest":
          return new Date(a.received) - new Date(b.received);
        case "highest":
          return providerPayout(b.price) - providerPayout(a.price);
        case "lowest":
          return providerPayout(a.price) - providerPayout(b.price);
        case "nearest": {
          const dA = distanceMap[a.id] ?? 9999;
          const dB = distanceMap[b.id] ?? 9999;
          return dA - dB;
        }
        case "city-asc":
          return String(a.location).localeCompare(String(b.location));
        case "state-asc": {
          const stA = String(a.location).split(",")[1]?.trim() || "";
          const stB = String(b.location).split(",")[1]?.trim() || "";
          return stA.localeCompare(stB);
        }
        case "zip-asc":
          return String(a.zip || "").localeCompare(String(b.zip || ""));
        default:
          return 0;
      }
    });
    return sorted;
  }, [openJobs, search, centerCoords, distanceMap, radius, sortBy]);

  const resetAll = () => {
    setSearch("");
    setZip("");
    setRadius(50);
    setSortBy("newest");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Job Board"
        subtitle="Browse national demand. Use filters to find jobs in your service area."
      />

      {/* Command bar */}
      <div className="space-y-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by City, State, ZIP, Vehicle, or Client…"
              className={INPUT_CLS + " h-10 pl-9 pr-8"}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Zip anchor */}
          <div className="relative w-48 shrink-0">
            <Navigation className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="ZIP Code"
              maxLength={5}
              className={
                INPUT_CLS +
                " h-10 pl-9 pr-8 font-mono tracking-wider " +
                (centerCoords ? "border-emerald-500 ring-1 ring-emerald-500/30" : "")
              }
            />
            {zip && (
              <button
                onClick={() => {
                  setZip("");
                  setRadius(50);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Radius */}
          <div className="flex shrink-0 items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-emerald-500/60" />
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-2 w-64 cursor-pointer accent-emerald-400"
            />
            <input
              type="number"
              min={0}
              max={500}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-8 w-16 rounded-md border border-portal-border bg-portal-card text-center font-mono text-sm font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <span className="shrink-0 font-mono text-xs text-slate-500">mi</span>
          </div>

          {/* View toggle */}
          <div className="relative ml-auto flex shrink-0 items-center">
            <span className="absolute -top-6 right-0 hidden text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 sm:inline">
              POWERED BY INSPECTD VINMAP™
            </span>
            <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-lg border border-portal-border bg-portal-card">
              <button
                onClick={() => setMode("list")}
                className={
                  "flex h-full items-center gap-1.5 px-4 text-[11px] font-bold uppercase tracking-wider transition " +
                  (mode === "list"
                    ? "bg-portal-emerald text-slate-900"
                    : "text-portal-muted hover:bg-portal-border/40 hover:text-portal-text")
                }
              >
                <ListIcon className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <div className="h-full w-px bg-portal-border" />
              <button
                onClick={() => setMode("map")}
                className={
                  "flex h-full items-center gap-1.5 px-4 text-[11px] font-bold uppercase tracking-wider transition " +
                  (mode === "map"
                    ? "bg-portal-emerald text-slate-900"
                    : "text-portal-muted hover:bg-portal-border/40 hover:text-portal-text")
                }
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
        </div>

        {centerCoords && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-portal-emerald">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-portal-emerald" />
            Anchored · {zip} · showing jobs within {radius}mi
          </div>
        )}
      </div>

      {mode === "list" && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={INPUT_CLS + " h-8 w-44 text-xs"}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-portal-card">
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={resetAll}
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-white"
          >
            Reset All Filters
          </button>
          <span className="ml-auto rounded-md bg-slate-800 px-3 py-1 text-sm font-bold tracking-wide text-emerald-400">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
          </span>
        </div>
      )}

      {mode === "map" ? (
        <VINmap
          jobs={jobs}
          centerCoords={centerCoords}
          onJobSelect={onOpenDetails}
          fullHeight
        />
      ) : (
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-portal-border bg-portal-card/40 p-8 text-center text-sm text-portal-muted">
              No open jobs match the current filters.
            </div>
          ) : (
            jobs.map((job) => (
              <MarketplaceJobCard
                key={job.id}
                job={job}
                distance={distanceMap[job.id]}
                onOpen={() => onOpenDetails(job)}
                onClaim={onClaim}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Active Claimed Jobs page ---------------------------- */

function DashboardJobCard({ job, onView, onStart, onContinue, onViewReport }) {
  const payout = providerPayout(job.price);
  return (
    <div className="flex h-full flex-col rounded-lg border border-portal-border bg-portal-card/40 p-4 sm:p-6">
      <div className="mb-4 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-tight text-portal-text">
              {job.vehicle}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-portal-emerald">
                {job.id}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{job.serviceLevel}</span>
            </div>
          </div>
          <StatusPill status={job.status} />
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-portal-emerald" />
            <span className="text-portal-text">{job.location}</span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-2xl font-bold text-emerald-400">
              {formatUsd(payout)}
            </span>
          </div>
          <div className="text-xs text-portal-muted">
            Posted: {formatReceived(job.received)}
          </div>
          {job.claimedAt && (
            <div className="text-xs text-portal-muted">
              Claimed: {formatReceived(job.claimedAt)}
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto flex gap-2 border-t border-portal-border pt-3">
        <button
          onClick={onView}
          className="flex-1 rounded-md border border-portal-border px-3 py-2 text-sm font-medium text-portal-text hover:bg-portal-card"
        >
          <Eye className="mr-1 inline h-4 w-4" /> View Details
        </button>
        {job.status === "Claimed" && (
          <button
            onClick={onStart}
            className="flex-1 rounded-md bg-portal-emerald px-3 py-2 text-sm font-bold text-slate-900 hover:brightness-110"
          >
            <Play className="mr-1 inline h-4 w-4" /> Start
          </button>
        )}
        {job.status === "In Progress" && (
          <button
            onClick={onContinue}
            className="flex-1 rounded-md bg-portal-emerald px-3 py-2 text-sm font-bold text-slate-900 hover:brightness-110"
          >
            <Play className="mr-1 inline h-4 w-4" /> Continue
          </button>
        )}
        {job.status === "Completed" && (
          <button
            onClick={onViewReport}
            className="flex-1 rounded-md bg-portal-emerald/90 px-3 py-2 text-sm font-bold text-slate-900 hover:brightness-110"
          >
            <FileText className="mr-1 inline h-4 w-4" /> View Report
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveJobsPage({ onOpenDetails, onNav }) {
  const { orders, start } = useOrderStore();
  const [tab, setTab] = useState("all");

  const mine = useMemo(
    () => orders.filter((o) => o.claimedBy === PROVIDER.key),
    [orders]
  );
  const c = useMemo(
    () => ({
      all: mine.length,
      toStart: mine.filter((o) => o.status === "Claimed").length,
      active: mine.filter((o) => o.status === "In Progress").length,
      done: mine.filter((o) => o.status === "Completed").length,
    }),
    [mine]
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case "toStart":
        return mine.filter((o) => o.status === "Claimed");
      case "active":
        return mine.filter((o) => o.status === "In Progress");
      case "done":
        return mine.filter((o) => o.status === "Completed");
      default:
        return mine;
    }
  }, [mine, tab]);

  const tabs = [
    { key: "all", label: "All", count: c.all },
    { key: "toStart", label: "To Start", count: c.toStart },
    { key: "active", label: "Active", count: c.active },
    { key: "done", label: "Done", count: c.done },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Claimed Jobs"
        subtitle="Jobs claimed by your team — start them, continue reports, or view completed."
      />
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Assigned to Me" value={c.toStart} icon={ClipboardCheck} tone="amber" />
        <StatCard label="In Progress" value={c.active} icon={Play} tone="orange" />
        <StatCard label="Completed" value={c.done} icon={CheckCircle} tone="emerald" />
      </div>
      <div className="flex gap-1 rounded-md border border-portal-border bg-portal-card/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "flex-1 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition " +
              (tab === t.key
                ? "bg-portal-emerald text-slate-900"
                : "text-portal-muted hover:text-portal-text")
            }
          >
            {t.label}
            <span className="ml-1.5 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-portal-border bg-portal-card/40 p-8 text-center text-sm text-portal-muted">
          No jobs in this bucket yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((job) => (
            <DashboardJobCard
              key={job.id}
              job={job}
              onView={() => onOpenDetails(job)}
              onStart={() => start(job.id)}
              onContinue={() => onNav("upload")}
              onViewReport={() => onOpenDetails(job)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Upload Data page ------------------------------------ */

function UploadPage({ onSubmitted }) {
  const { orders, complete } = useOrderStore();
  const activeJobs = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.claimedBy === PROVIDER.key &&
          (o.status === "Claimed" || o.status === "In Progress")
      ),
    [orders]
  );
  const [selectedId, setSelectedId] = useState(activeJobs[0]?.id ?? "");
  const [externalUrl, setExternalUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    if (!activeJobs.some((j) => j.id === selectedId)) {
      setSelectedId(activeJobs[0]?.id ?? "");
    }
  }, [activeJobs, selectedId]);

  const canSubmit =
    selectedId && (externalUrl.trim().length > 0 || files.length > 0);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const list = Array.from(e.dataTransfer.files || []);
    setFiles((f) => [...f, ...list].slice(0, 100));
  };

  const submit = () => {
    if (!canSubmit) return;
    setBusy(true);
    // Simulate a small delay so the button state reads as real work.
    setTimeout(() => {
      complete(selectedId, {
        method: externalUrl ? "external_url" : "portal_upload",
        url: externalUrl || undefined,
        fileCount: files.length,
      });
      setOkMsg(`Submission received for ${selectedId}.`);
      setSelectedId("");
      setExternalUrl("");
      setFiles([]);
      setBusy(false);
      if (onSubmitted) onSubmitted();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Data"
        subtitle="Submit report files or an external URL for one of your active jobs."
      />
      {okMsg && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {okMsg}
        </div>
      )}
      <div className="space-y-6 rounded-lg border border-portal-border bg-portal-card/60 p-6">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-portal-muted">
            1. Select Active Job
          </div>
          {activeJobs.length === 0 ? (
            <div className="rounded-md border border-portal-border bg-portal-card/40 p-3 text-sm text-portal-muted">
              You don't have any active jobs to upload against. Claim one from the Job Board first.
            </div>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={INPUT_CLS}
            >
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-portal-card">
                  {j.id} — {j.vehicle} — {j.location}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-portal-muted">
            2. External URL (optional)
          </div>
          <input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://…"
            className={INPUT_CLS}
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-portal-muted">
            3. File Upload
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition " +
              (dragOver
                ? "border-portal-emerald bg-portal-emerald/5"
                : "border-portal-border bg-portal-card/40")
            }
          >
            <UploadIcon className="mb-2 h-8 w-8 text-portal-muted" />
            <div className="text-sm text-portal-text">
              Drag and drop files here, or{" "}
              <label className="cursor-pointer font-semibold text-portal-emerald underline underline-offset-2">
                choose files
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const list = Array.from(e.target.files || []);
                    setFiles((f) => [...f, ...list].slice(0, 100));
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-1 text-xs text-portal-muted">
              PDF, JPG, PNG, HEIC, ZIP — up to 100 files
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-portal-border bg-portal-card/60 px-3 py-1.5 text-xs"
                >
                  <span className="truncate text-portal-text">{f.name}</span>
                  <button
                    onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
                    className="text-portal-muted hover:text-red-400"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-portal-border pt-4">
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-portal-emerald px-4 py-2 text-sm font-bold text-slate-900 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>Submit Report</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Completed Reports page ------------------------------ */

function ReportsPage({ onOpenDetails }) {
  const { orders } = useOrderStore();
  const reports = useMemo(
    () =>
      orders.filter(
        (o) => o.status === "Completed" && o.claimedBy === PROVIDER.key
      ),
    [orders]
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Completed Reports"
        subtitle="Reports submitted by your team."
      />
      {reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-portal-border bg-portal-card/40 p-8 text-center text-sm text-portal-muted">
          No completed reports yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-portal-border bg-portal-card/60">
          <table className="w-full text-sm">
            <thead className="border-b border-portal-border text-left text-[11px] font-semibold uppercase tracking-wide text-portal-muted">
              <tr>
                <th className="px-5 py-4">Order ID</th>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4">Requester</th>
                <th className="px-5 py-4">Tier</th>
                <th className="px-5 py-4 text-right">Payout</th>
                <th className="px-5 py-4">Completed</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-portal-border/60">
              {reports.map((o) => (
                <tr key={o.id} className="hover:bg-portal-card">
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-portal-emerald">
                    {o.id}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-portal-text">
                    {o.vehicle}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-portal-text/80">
                    {o.title}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-portal-text/80">
                    {o.serviceLevel}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-portal-text">
                    {formatUsd(providerPayout(o.price))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-portal-muted">
                    {formatReceived(o.completedAt || o.received)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <button
                      onClick={() => onOpenDetails(o)}
                      className="inline-flex items-center gap-1 rounded-md border border-portal-border px-2 py-1 text-xs font-medium text-portal-text hover:bg-portal-card"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---- Placeholder for Team / Payout ----------------------- */

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

/* ---- entry ----------------------------------------------- */

export function ProviderPortal({ onExit }) {
  const [sub, setSub] = useState("board");
  const [selectedJob, setSelectedJob] = useState(null);
  const { orders, claim } = useOrderStore();

  const sidebarCounts = useMemo(() => {
    const mine = orders.filter((o) => o.claimedBy === PROVIDER.key);
    return {
      open: orders.filter((o) => o.status === "Open").length,
      claimed: mine.filter((o) => o.status === "Claimed").length,
      inProgress: mine.filter((o) => o.status === "In Progress").length,
      completedByProvider: mine.filter((o) => o.status === "Completed").length,
    };
  }, [orders]);

  const doClaim = (job) => {
    if (job.status !== "Open") return;
    claim(job.id, PROVIDER.key);
    setSelectedJob(null);
    setSub("active");
  };

  return (
    <div className="flex h-full bg-portal-bg font-inter text-portal-text">
      <Sidebar
        current={sub}
        onNav={setSub}
        onExit={onExit}
        counts={sidebarCounts}
      />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {sub === "board"    && <JobBoardPage onOpenDetails={setSelectedJob} onClaim={doClaim} />}
        {sub === "active"   && <ActiveJobsPage onOpenDetails={setSelectedJob} onNav={setSub} />}
        {sub === "upload"   && <UploadPage />}
        {sub === "reports"  && <ReportsPage onOpenDetails={setSelectedJob} />}
        {sub === "team"     && <PlaceholderPage title="Team Management" subtitle="Invite and manage inspectors on your team" />}
        {sub === "settings" && <PlaceholderPage title="Payout Settings" subtitle="Connect your bank account and manage payouts" />}
      </main>
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onClaim={doClaim}
          canClaim={selectedJob.status === "Open"}
        />
      )}
    </div>
  );
}
