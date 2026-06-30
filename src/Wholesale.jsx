import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Check,
  Camera,
  Info,
  Globe,
  Menu,
  LineChart,
  UserCircle,
  Building2,
  UserPlus,
  Hourglass,
  Handshake,
  Trophy,
  Frown,
  ListChecks,
  Rss,
  Coins,
  Car,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { DEALER, INVENTORY, usd } from "./data.js";
import { CarThumb, IndependentBadge } from "./ui.jsx";

// Two vehicles start "Ready to List" with a reserve. The rest are Incomplete.
const INITIAL_ROW_STATE = {
  "1FTFW1E84MFA90765": { status: "Ready to List", reserve: 46000 }, // F-150 Lariat
  "WBA5R1C50MAE61223": { status: "Ready to List", reserve: 33000 }, // BMW 330i M Sport
};

function initialRowState(vin) {
  return INITIAL_ROW_STATE[vin] ?? { status: "Incomplete", reserve: null };
}

/* ---- top nav ----------------------------------------------------- */

function TopNav() {
  const items = ["Auctions", "Upcoming", "Make Offer", "Listing Center"];
  const active = "Listing Center";
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-slate-800 bg-slate-950 pr-4">
      <div className="flex h-full items-center px-6">
        <span className="text-lg font-bold tracking-tight text-white">AuctionPlus</span>
      </div>
      <nav className="ml-6 flex h-full items-center gap-7 text-sm">
        {items.map((label) => (
          <button
            key={label}
            className={
              "relative flex h-full items-center text-sm font-medium " +
              (label === active ? "text-white" : "text-slate-400 hover:text-slate-200")
            }
          >
            {label}
            {label === active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500" />}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Globe className="h-5 w-5 text-slate-400" />
        <div className="flex items-center gap-2 rounded-md bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200">
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold">CV</span>
          <div className="leading-tight">
            <div className="font-semibold">Crestview Auto Group</div>
            <div className="text-[10px] text-slate-400">Crestview Auto Group</div>
          </div>
          <Menu className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}

/* ---- sidebar ----------------------------------------------------- */

function SidebarLink({ icon: Icon, label, active = false }) {
  return (
    <button
      className={
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm " +
        (active
          ? "bg-slate-800 text-white"
          : "text-slate-300 hover:bg-slate-800/60 hover:text-white")
      }
    >
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="flex-1 text-left">{label}</span>
      {active && <ChevronRight className="h-4 w-4 text-slate-500" />}
    </button>
  );
}

function SidebarGroup({ label, children }) {
  return (
    <div className="mt-4 first:mt-0">
      {label && (
        <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="w-60 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-950 px-3 py-5">
      <SidebarGroup>
        <SidebarLink icon={LineChart} label="Overview" />
        <SidebarLink icon={UserCircle} label="My Profile" />
        <SidebarLink icon={Building2} label="Dealer Profile" />
        <SidebarLink icon={UserPlus} label="Following" />
      </SidebarGroup>
      <SidebarGroup label="Buying">
        <SidebarLink icon={Hourglass} label="Active" />
        <SidebarLink icon={Handshake} label="Negotiating" />
        <SidebarLink icon={Trophy} label="Won" />
        <SidebarLink icon={Frown} label="Lost" />
        <SidebarLink icon={ListChecks} label="Watchlist" />
      </SidebarGroup>
      <SidebarGroup label="Inventory Feed">
        <SidebarLink icon={Rss} label="Cars.com" />
        <SidebarLink icon={Coins} label="Offers" />
      </SidebarGroup>
      <SidebarGroup label="Selling">
        <SidebarLink icon={Car} label="My Vehicles" active />
        <SidebarLink icon={Calendar} label="Scheduled" />
        <SidebarLink icon={Hourglass} label="Active" />
        <SidebarLink icon={Handshake} label="Negotiating" />
        <SidebarLink icon={DollarSign} label="Sold" />
        <SidebarLink icon={AlertTriangle} label="Didn't Sell" />
      </SidebarGroup>
    </aside>
  );
}

/* ---- dark tooltip ------------------------------------------------ */

function DarkTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-200"
        aria-label="What is this"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-800 p-3 text-left text-xs leading-relaxed text-slate-200 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

/* ---- table ------------------------------------------------------- */

function VehicleThumb({ v, status }) {
  if (status === "Ready to List") {
    return <CarThumb hue={v.hue} image={v.image} className="h-12 w-16 shrink-0 rounded" />;
  }
  return (
    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-slate-800">
      <Car className="h-6 w-6 text-slate-500" />
    </div>
  );
}

function VehicleCell({ v, status }) {
  return (
    <div className="flex items-center gap-3">
      <VehicleThumb v={v} status={status} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">
          {v.year} {v.make} {v.model}
        </div>
        <div className="truncate text-xs text-slate-400">{v.vin}</div>
      </div>
    </div>
  );
}

function CompleteCRControl({ onSelfInspect, onOrderInspect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-40 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Complete CR
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl">
          <button
            onClick={() => { setOpen(false); onSelfInspect(); }}
            className="block w-full px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
          >
            Self Inspect
            <div className="text-[10px] text-slate-400">Complete the inspection yourself</div>
          </button>
          <button
            onClick={() => { setOpen(false); onOrderInspect(); }}
            className="block w-full border-t border-slate-800 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
          >
            Order Inspection
            <div className="text-[10px] text-slate-400">Mobile professional comes to you</div>
          </button>
        </div>
      )}
    </div>
  );
}

function VehicleRow({ v, state, selected, onToggle, onSelfInspect, onOrderInspect }) {
  return (
    <tr className="border-t border-slate-800/60 hover:bg-slate-900/40">
      <td className="w-10 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-900 text-blue-500"
        />
      </td>
      <td className="px-3 py-3">
        <VehicleCell v={v} status={state.status} />
      </td>
      <td className="px-3 py-3 text-sm text-slate-200">{state.status}</td>
      <td className="px-3 py-3 text-sm text-slate-300">
        {state.reserve != null ? usd(state.reserve) : "-"}
      </td>
      <td className="px-3 py-3 text-sm text-slate-300">5</td>
      <td className="px-3 py-3 text-sm text-slate-300">-</td>
      <td className="w-44 px-3 py-3 text-right">
        {state.status === "Ready to List" && (
          <button className="w-40 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Schedule Auction
          </button>
        )}
        {state.status === "Incomplete" && (
          <CompleteCRControl onSelfInspect={onSelfInspect} onOrderInspect={onOrderInspect} />
        )}
      </td>
      <td className="w-10 px-3 py-3 text-right">
        <button className="text-slate-400 hover:text-white">
          <MoreVertical className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}

function BulkBar({ count, onOrderInspect, onClear }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 rounded-t-md border-b border-slate-700 bg-slate-800/95 px-4 py-2 backdrop-blur">
      <span className="text-sm font-medium text-slate-200">{count} selected</span>
      <button
        onClick={onOrderInspect}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
      >
        Order inspection ({count})
      </button>
      <button
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
        Clear selection
      </button>
    </div>
  );
}

function MainPanel({ vehicles, rowState, selected, onToggle, onToggleAll, onClearSelection, onSelfInspect, onOrderInspect }) {
  const allSelected = vehicles.length > 0 && vehicles.every((v) => selected.has(v.vin));
  const someSelected = !allSelected && vehicles.some((v) => selected.has(v.vin));
  return (
    <main className="flex-1 overflow-auto bg-slate-950 px-8 py-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
          <p className="mt-1 text-sm text-slate-400">
            As you add vehicles to get them ready for auction they will appear here.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          <Plus className="h-4 w-4" /> New Vehicle
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2">
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
        />
        <button className="flex h-7 w-9 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-500">
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/30">
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onOrderInspect={() => onOrderInspect(Array.from(selected))}
            onClear={onClearSelection}
          />
        )}
        <table className="w-full">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-400">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onToggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-900 text-blue-500"
                />
              </th>
              <th className="px-3 py-3">Vehicle</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Reserve</th>
              <th className="px-3 py-3">Remaining Runs</th>
              <th className="px-3 py-3">High Bid</th>
              <th className="w-44 px-3 py-3"></th>
              <th className="w-10 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <VehicleRow
                key={v.vin}
                v={v}
                state={rowState[v.vin]}
                selected={selected.has(v.vin)}
                onToggle={() => onToggle(v.vin)}
                onSelfInspect={() => onSelfInspect(v.vin)}
                onOrderInspect={() => onOrderInspect([v.vin])}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ---- order panel ------------------------------------------------- */

const TOOLTIP_TEXT =
  "A third-party inspector is dispatched to complete a standardized auction condition report, uploaded to your listing upon completion.";

function OrderPanelVehicles({ vehicles }) {
  if (vehicles.length === 1) {
    const v = vehicles[0];
    return (
      <div className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-800/50 p-3">
        <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-slate-800">
          <Car className="h-6 w-6 text-slate-500" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">
            {v.year} {v.make} {v.model}
          </div>
          <div className="truncate text-xs text-slate-400">VIN {v.vin}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
      <div className="mb-2 text-sm font-medium text-slate-200">
        {vehicles.length} vehicles
      </div>
      <ul className="space-y-1 text-xs text-slate-400">
        {vehicles.map((v) => (
          <li key={v.vin} className="truncate">
            <span className="text-slate-200">{v.year} {v.make} {v.model}</span>
            <span className="ml-2 text-slate-500">{v.vin.slice(-8)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderPanel({ vins, onCancel, onConfirm }) {
  const vehicles = vins
    .map((vin) => INVENTORY.find((v) => v.vin === vin))
    .filter(Boolean);
  const [schedule, setSchedule] = useState("asap");
  const [date, setDate] = useState("");

  return (
    <div className="absolute inset-0 z-40 flex">
      <div onClick={onCancel} className="flex-1 bg-black/60" />
      <aside className="flex w-[480px] flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Order inspection</h2>
            <p className="mt-1 text-xs text-slate-400">
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-slate-300">{DEALER.name}</p>
            <p className="text-xs text-slate-400">{DEALER.address}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <OrderPanelVehicles vehicles={vehicles} />

          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-slate-200">
              Standardized auction condition report
              <DarkTip text={TOOLTIP_TEXT} />
            </div>
            <div className="mt-2">
              <IndependentBadge />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Scheduling
            </div>
            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="schedule"
                  checked={schedule === "asap"}
                  onChange={() => setSchedule("asap")}
                  className="h-4 w-4 cursor-pointer"
                />
                Next available (ASAP)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="schedule"
                  checked={schedule === "later"}
                  onChange={() => setSchedule("later")}
                  className="h-4 w-4 cursor-pointer"
                />
                Schedule for later
              </label>
              {schedule === "later" && (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="ml-6 mt-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-xs text-slate-300">
            Added to your auction fees, settled at sale.
          </div>
        </main>

        <footer className="flex items-center gap-3 border-t border-slate-700 px-5 py-4">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="ml-auto rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Confirm
          </button>
        </footer>
      </aside>
    </div>
  );
}

/* ---- self inspect panel ------------------------------------------ */

const SELF_INSPECT_STEPS = [
  { key: "vin", label: "VIN", description: "Vehicle identification number", button: { label: "Upload VIN photo", icon: "camera" } },
  { key: "photos", label: "Photos", description: "Let's see how it looks!", button: { label: "Upload vehicle photos", icon: "camera" } },
  { key: "info", label: "Vehicle Info", description: "Give us the basics", button: { label: "Next: Condition" } },
  { key: "condition", label: "Condition", description: "What kind of shape is it in?", button: { label: "Next: Reserve Price" } },
  { key: "reserve", label: "Reserve Price", description: "What's it worth?", button: { label: "Submit" } },
];

function StepNode({ idx, total, active, completed, label, description }) {
  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {idx < total - 1 && (
        <div className="absolute left-[15px] top-8 h-full border-l-2 border-dashed border-slate-700" />
      )}
      <div
        className={
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 " +
          (completed
            ? "border-blue-500 bg-blue-500"
            : active
            ? "border-blue-500 bg-slate-950"
            : "border-slate-600 bg-slate-950")
        }
      >
        {completed && <Check className="h-4 w-4 text-white" />}
      </div>
      <div className="pt-1">
        <div className={"text-sm font-semibold " + (active ? "text-blue-400" : "text-white")}>{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </div>
  );
}

function SelfInspectPanel({ vin, onClose }) {
  const v = INVENTORY.find((x) => x.vin === vin);
  const [activeIdx, setActiveIdx] = useState(0);
  if (!v) return null;
  const activeStep = SELF_INSPECT_STEPS[activeIdx];
  const isLast = activeIdx === SELF_INSPECT_STEPS.length - 1;
  const onNext = () => {
    if (isLast) onClose();
    else setActiveIdx(activeIdx + 1);
  };
  return (
    <div className="absolute inset-0 z-40 flex">
      <div onClick={onClose} className="flex-1 bg-black/60" />
      <aside className="flex w-[480px] flex-col border-l border-slate-700 bg-slate-950 shadow-2xl">
        <header className="border-b border-slate-800 px-5 py-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-slate-300 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Listing Center
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <div className="mb-6 flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-slate-800">
              <Car className="h-8 w-8 text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-white">{v.year} {v.make} {v.model}</div>
              <div className="text-xs text-slate-400">Status: In Progress</div>
              <div className="truncate text-xs text-slate-400">{v.vin}</div>
              <button className="mt-1 text-sm font-medium text-blue-400 hover:text-blue-300">
                Preview Listing
              </button>
            </div>
          </div>

          <div className="ml-2">
            {SELF_INSPECT_STEPS.map((step, idx) => (
              <StepNode
                key={step.key}
                idx={idx}
                total={SELF_INSPECT_STEPS.length}
                active={idx === activeIdx}
                completed={idx < activeIdx}
                label={step.label}
                description={step.description}
              />
            ))}
          </div>
        </main>

        <footer className="border-t border-slate-800 p-4">
          <button
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {activeStep.button.icon === "camera" && <Camera className="h-4 w-4" />}
            {activeStep.button.label}
          </button>
        </footer>
      </aside>
    </div>
  );
}

/* ---- page -------------------------------------------------------- */

export function WholesalePage() {
  const [rowState, setRowState] = useState(() => {
    const m = {};
    INVENTORY.forEach((v) => { m[v.vin] = initialRowState(v.vin); });
    return m;
  });
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (vin) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(vin)) next.delete(vin);
      else next.add(vin);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === INVENTORY.length ? new Set() : new Set(INVENTORY.map((v) => v.vin))
    );
  };

  const clearSelection = () => setSelected(new Set());

  const [orderPanel, setOrderPanel] = useState(null); // null | { vins: string[] }
  const [selfInspect, setSelfInspect] = useState(null); // null | { vin: string }

  const onSelfInspect = (vin) => {
    if (!vin) return;
    setSelfInspect({ vin });
  };
  const onOrderInspect = (vins) => {
    if (!vins || vins.length === 0) return;
    setOrderPanel({ vins });
  };

  const confirmOrder = () => {
    if (!orderPanel) return;
    setRowState((prev) => {
      const next = { ...prev };
      for (const vin of orderPanel.vins) {
        if (next[vin]?.status === "Incomplete") {
          next[vin] = { ...next[vin], status: "Inspection ordered" };
        }
      }
      return next;
    });
    setOrderPanel(null);
    setSelected(new Set());
  };

  return (
    <div className="relative flex h-full flex-col bg-slate-950 text-slate-100">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPanel
          vehicles={INVENTORY}
          rowState={rowState}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onClearSelection={clearSelection}
          onSelfInspect={onSelfInspect}
          onOrderInspect={onOrderInspect}
        />
      </div>
      {orderPanel && (
        <OrderPanel
          vins={orderPanel.vins}
          onCancel={() => setOrderPanel(null)}
          onConfirm={confirmOrder}
        />
      )}
      {selfInspect && (
        <SelfInspectPanel
          vin={selfInspect.vin}
          onClose={() => setSelfInspect(null)}
        />
      )}
    </div>
  );
}
