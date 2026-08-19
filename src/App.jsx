import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { INVENTORY, DN_INVENTORY, PRICE } from "./data.js";
import { useOrderStore } from "./OrderStore.jsx";
import { SearchPage, VDPPage, AboutPage } from "./Dealer.jsx";
import { BrowserChrome, InspectdLanding, InspectdOrder, InspectdConfirm } from "./Inspectd.jsx";
import { WholesalePage } from "./Wholesale.jsx";
import { DigitalNativeSRP, DigitalNativeVDP, DigitalNativeSaved } from "./DigitalNative.jsx";
import { EnterprisePortal } from "./EnterprisePortal.jsx";
import { ProviderPortal } from "./ProviderPortal.jsx";
import { gridBg } from "./AccessGate.jsx";

/* ---- routing model --------------------------------------------- */

const DEALER_VIEWS = new Set(["search", "vdp", "dn-srp", "dn-vdp", "dn-saved", "about"]);
const PLATFORM_VIEWS = new Set([
  "platform-enterprise",
  "platform-provider",
  "platform-internal",
]);

function sectionOf(view) {
  if (view === "home") return "home";
  if (PLATFORM_VIEWS.has(view)) return "platform";
  if (view === "wholesale" || DEALER_VIEWS.has(view)) return "external";
  return "home";
}

function areaOf(view) {
  if (view === "wholesale") return "auction";
  if (DEALER_VIEWS.has(view)) return "dealer";
  return null;
}

const DEALER_SURFACES = [
  { view: "search", label: "SRP" },
  { view: "vdp", label: "VDP" },
  { view: "dn-srp", label: "SRP v2" },
  { view: "dn-vdp", label: "VDP v2" },
];

const PLATFORM_SURFACES = [
  { view: "platform-enterprise", label: "Enterprise" },
  { view: "platform-provider", label: "Provider" },
  { view: "platform-internal", label: "Internal" },
];

const EXTERNAL_AREAS = [
  { key: "dealer", label: "Dealer", defaultView: "search" },
  { key: "auction", label: "Auction", defaultView: "wholesale" },
];

/* ---- shell chrome ---------------------------------------------- */

function Crumb({ children }) {
  return <span className="text-xs font-medium text-slate-400">{children}</span>;
}

function Sep() {
  return <span className="text-slate-600">/</span>;
}

function TabPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md px-3 py-1 text-[11px] font-medium transition " +
        (active ? "bg-white text-slate-900" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200")
      }
    >
      {label}
    </button>
  );
}

function AreaSwitcher({ area, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const current = EXTERNAL_AREAS.find((a) => a.key === area);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
      >
        {current?.label ?? "Select"}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-md border border-slate-800 bg-slate-950 shadow-xl">
          {EXTERNAL_AREAS.map((a) => (
            <button
              key={a.key}
              onClick={() => {
                setOpen(false);
                onSelect(a);
              }}
              className={
                "block w-full px-3 py-2 text-left text-xs font-medium " +
                (a.key === area
                  ? "bg-slate-900 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white")
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- placeholders ---------------------------------------------- */

function PlatformPlaceholder({ label }) {
  return (
    <div className="flex h-full items-center justify-center bg-slate-100 px-6">
      <div className="text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Platform · {label}
        </div>
        <div className="mt-3 text-2xl font-semibold text-slate-800">Coming soon</div>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          This surface will land in a future layer. Nothing to see yet.
        </p>
      </div>
    </div>
  );
}

function Homepage({ onGo }) {
  const links = [
    { label: "Platform", view: "platform-enterprise" },
    { label: "External Surfaces", view: "search" },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6 text-white" style={gridBg}>
      <div className="flex flex-col items-center">
        <img src="/inspectd-symbol.png" alt="" className="h-24 w-24" />
        <div className="mt-4 text-4xl font-bold tracking-tight text-white">Inspectd</div>
        <div className="mt-14 flex items-center gap-10">
          {links.map((l) => (
            <button
              key={l.view}
              onClick={() => onGo(l.view)}
              className="text-sm font-medium tracking-wide text-slate-500 transition hover:text-white"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- app ------------------------------------------------------- */

export default function App() {
  const [view, setView] = useState("home");
  const [vehicle, setVehicle] = useState(INVENTORY[0]);
  const [dnVehicle, setDnVehicle] = useState(DN_INVENTORY[0]);
  const [tab, setTab] = useState(null); // null | { context, step, orderId? }
  const { addOrder } = useOrderStore();

  const go = (nextView) => {
    setView(nextView);
    setTab(null);
  };

  const openVehicle = (v) => {
    setVehicle(v);
    setView("vdp");
    setTab(null);
  };
  const openTab = (context) => setTab({ context, step: "landing" });
  const openAbout = () => go("about");
  const openDnVehicle = (v) => {
    setDnVehicle(v);
    setView("dn-vdp");
    setTab(null);
  };

  const section = sectionOf(view);
  const area = areaOf(view);

  const tabUrl =
    tab && `inspectd.com/${tab.context.dealer.key}/inspect/${tab.context.vehicle.vin.slice(-6)}`;

  return (
    <div className="flex h-screen flex-col bg-slate-300">
      {/* app shell — single row, contextual */}
      <div className="flex h-11 items-center gap-3 border-b border-slate-900 bg-slate-950 px-4 text-white">
        <button
          onClick={() => go("home")}
          className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 hover:text-white"
        >
          <img src="/inspectd-symbol.png" alt="" className="h-5 w-5" />
          INSPECTD DEV+STAGING
        </button>

        {section === "external" && (
          <>
            <Sep />
            <Crumb>External Surfaces</Crumb>
            <Sep />
            <AreaSwitcher area={area} onSelect={(a) => go(a.defaultView)} />
            <div className="ml-auto flex gap-1">
              {area === "dealer" &&
                DEALER_SURFACES.map((t) => (
                  <TabPill
                    key={t.view}
                    label={t.label}
                    active={view === t.view}
                    onClick={() => go(t.view)}
                  />
                ))}
            </div>
          </>
        )}

        {section === "platform" && (
          <>
            <Sep />
            <Crumb>Platform</Crumb>
            <div className="ml-auto flex gap-1">
              {PLATFORM_SURFACES.map((t) => (
                <TabPill
                  key={t.view}
                  label={t.label}
                  active={view === t.view}
                  onClick={() => go(t.view)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          {view === "home" && <Homepage onGo={go} />}
          {view === "platform-enterprise" && <EnterprisePortal onExit={() => go("home")} />}
          {view === "platform-provider" && <ProviderPortal onExit={() => go("home")} />}
          {view === "platform-internal" && <PlatformPlaceholder label="Internal" />}
          {view === "search" && (
            <SearchPage onOpenVehicle={openVehicle} onOpenAbout={openAbout} />
          )}
          {view === "vdp" && (
            <VDPPage v={vehicle} onBack={() => setView("search")} onOrder={openTab} onOpenAbout={openAbout} />
          )}
          {view === "wholesale" && <WholesalePage />}
          {view === "dn-srp" && (
            <DigitalNativeSRP onOpenVehicle={openDnVehicle} onNavigate={go} />
          )}
          {view === "dn-vdp" && (
            <DigitalNativeVDP
              v={dnVehicle}
              onBack={() => setView("dn-srp")}
              onOrder={openTab}
              onNavigate={go}
            />
          )}
          {view === "dn-saved" && (
            <DigitalNativeSaved
              onOpenVehicle={openDnVehicle}
              onNavigate={go}
              onOrder={openTab}
            />
          )}
          {view === "about" && (
            <AboutPage onBack={() => setView("search")} onOpenAbout={openAbout} />
          )}
        </div>

        {tab && (
          <div className="absolute inset-0 z-20">
            <BrowserChrome url={tabUrl} onClose={() => setTab(null)}>
              {tab.step === "landing" && (
                <InspectdLanding context={tab.context} onContinue={(ctx) => setTab({ context: ctx, step: "order" })} />
              )}
              {tab.step === "order" && (
                <InspectdOrder
                  context={tab.context}
                  onPlace={() => {
                    const v = tab.context.vehicle;
                    const d = tab.context.dealer;
                    const id = addOrder({
                      requestor: d.key,
                      title: d.name,
                      location: `${d.city}, ${d.state}`,
                      vehicle: `${v.year} ${v.make} ${v.model}`,
                      serviceLevel: "VINsight",
                      price: PRICE,
                    });
                    setTab({ ...tab, step: "confirm", orderId: id });
                  }}
                />
              )}
              {tab.step === "confirm" && (
                <InspectdConfirm
                  context={tab.context}
                  orderRef={tab.orderId}
                  onClose={() => setTab(null)}
                />
              )}
            </BrowserChrome>
          </div>
        )}
      </div>
    </div>
  );
}
