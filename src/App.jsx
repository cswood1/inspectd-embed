import React, { useState } from "react";
import { INVENTORY } from "./data.js";
import { SearchPage, VDPPage } from "./Dealer.jsx";
import { BrowserChrome, InspectdLanding, InspectdOrder, InspectdConfirm } from "./Inspectd.jsx";
import { WholesalePage } from "./Wholesale.jsx";

export default function App() {
  const [view, setView] = useState("search"); // search | vdp | wholesale
  const [vehicle, setVehicle] = useState(INVENTORY[0]);
  const [tab, setTab] = useState(null); // null | { context, step }
  const [orderRef] = useState("INS-" + Math.floor(100000 + Math.random() * 900000));

  const openVehicle = (v) => {
    setVehicle(v);
    setView("vdp");
  };
  const openTab = (context) => setTab({ context, step: "landing" });

  const tabUrl =
    tab &&
    `inspectd.com/crestview/${
      tab.context.mode === "vehicle" ? "inspect/" + tab.context.vehicle.vin.slice(-6) : "inspect"
    }`;

  return (
    <div className="flex h-screen flex-col bg-slate-300">
      {/* demo harness */}
      <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 text-white">
        <span className="text-xs font-semibold tracking-wide text-slate-300">INSPECTD DEV+STAGING</span>
        <div className="flex gap-1">
          <button
            onClick={() => { setView("search"); setTab(null); }}
            className={"rounded-md px-3 py-1 text-xs font-medium " + (view === "search" ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800")}
          >
            SRP
          </button>
          <button
            onClick={() => { setView("vdp"); setTab(null); }}
            className={"rounded-md px-3 py-1 text-xs font-medium " + (view === "vdp" ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800")}
          >
            VDP
          </button>
          <button
            onClick={() => { setView("wholesale"); setTab(null); }}
            className={"rounded-md px-3 py-1 text-xs font-medium " + (view === "wholesale" ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800")}
          >
            Auction
          </button>
        </div>
        <span className="ml-auto hidden text-[11px] text-slate-500 sm:block">
          Mock dealer site. The Inspectd flow opens in a simulated new tab.
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          {view === "search" && (
            <SearchPage onOpenVehicle={openVehicle} onOrderGeneric={() => openTab({ mode: "standalone" })} />
          )}
          {view === "vdp" && <VDPPage v={vehicle} onBack={() => setView("search")} onOrder={openTab} />}
          {view === "wholesale" && <WholesalePage />}
        </div>

        {tab && (
          <div className="absolute inset-0 z-20">
            <BrowserChrome url={tabUrl} onClose={() => setTab(null)}>
              {tab.step === "landing" && (
                <InspectdLanding context={tab.context} onContinue={(ctx) => setTab({ context: ctx, step: "order" })} />
              )}
              {tab.step === "order" && (
                <InspectdOrder context={tab.context} onPlace={() => setTab({ ...tab, step: "confirm" })} />
              )}
              {tab.step === "confirm" && (
                <InspectdConfirm context={tab.context} orderRef={orderRef} onClose={() => setTab(null)} />
              )}
            </BrowserChrome>
          </div>
        )}
      </div>
    </div>
  );
}
