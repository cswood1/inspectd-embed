import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Search,
  X,
  Heart,
  Share2,
  Phone,
  MapPin,
  Clock,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { DEALER, CRESTVIEW_DEALER, INVENTORY, FEATURES, usd } from "./data.js";
import { CarThumb, IndependentBadge } from "./ui.jsx";
import { SearchInspectdBand, VdpInspectdModule } from "./Inspectd.jsx";

/* ---- dealer chrome ---------------------------------------------- */

function TopUtilityBar() {
  return (
    <div className="bg-slate-900 text-slate-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-red-500" /> 2 Locations</span>
          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-red-500" /> {DEALER.phone}</span>
          <span className="hidden items-center gap-1 sm:flex"><Clock className="h-3.5 w-3.5 text-red-500" /> Open today 9:00 AM - 8:00 PM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">EN</span>
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> Favorites</span>
        </div>
      </div>
    </div>
  );
}

function DealerHeader({ onOpenAbout }) {
  const nav = ["New", "Used", "Specials", "Finance", "Service & Parts"];
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border-2 border-slate-900 px-2.5 py-1">
            <span className="text-base font-black uppercase tracking-tight text-slate-900">Crestview</span>
          </div>
          <span className="hidden text-xs font-medium uppercase tracking-widest text-slate-400 sm:inline">Auto Group</span>
        </div>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 lg:flex">
          {nav.map((n) => (
            <span key={n} className="flex cursor-pointer items-center gap-1 hover:text-red-700">
              {n}
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </span>
          ))}
          <button onClick={onOpenAbout} className="cursor-pointer hover:text-red-700">
            About
          </button>
        </nav>
        <div className="flex items-center gap-3">
          <button className="hidden items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 sm:flex">
            <Search className="h-4 w-4" /> Search Inventory
          </button>
          <span className="text-sm font-bold text-red-700">{DEALER.phone}</span>
        </div>
      </div>
    </div>
  );
}

function PromoStrip() {
  return (
    <div className="bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 py-2 text-center text-sm">
        <span className="font-semibold italic">"Colorado's used vehicle headquarters"</span>
        <span className="hidden font-bold uppercase tracking-wide text-amber-400 md:inline">Check out this month's specials</span>
      </div>
    </div>
  );
}

/* ---- search page ------------------------------------------------ */

function FilterAccordion({ label, children, open: openInit = false }) {
  const [open, setOpen] = useState(openInit);
  return (
    <div className="border-b border-slate-100 py-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-sm font-semibold text-slate-800">
        {label}
        <ChevronDown className={"h-4 w-4 text-slate-400 transition " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function FilterSidebar() {
  const bars = [3, 5, 8, 12, 16, 22, 19, 14, 10, 7, 9, 6, 4, 3, 2];
  return (
    <aside className="w-64 shrink-0">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">142 matches</span>
          <button className="text-xs font-medium text-red-700">Clear filters</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Used", "Certified"].map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {c} <X className="h-3 w-3" />
            </span>
          ))}
        </div>

        <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 py-1.5 text-xs font-semibold text-slate-700">
          <Heart className="h-3.5 w-3.5" /> Save search
        </button>

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Price</div>
          <div className="mt-2 flex h-10 items-end gap-0.5">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-amber-400" style={{ height: h * 4 + "%" }} />
            ))}
          </div>
          <div className="mt-1 h-1 rounded-full bg-amber-400" />
          <div className="mt-2 flex gap-2">
            <div className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600">$8,000</div>
            <div className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600">$107,000</div>
          </div>
        </div>

        <FilterAccordion label="Condition" open>
          {[["New", 148], ["Certified pre-owned", 41], ["Pre-owned", 101]].map(([c, n]) => (
            <label key={c} className="flex items-center gap-2 py-1 text-sm text-slate-600">
              <input type="checkbox" defaultChecked={c !== "New"} className="h-3.5 w-3.5 accent-red-700" />
              {c} <span className="text-slate-400">({n})</span>
            </label>
          ))}
        </FilterAccordion>
        <FilterAccordion label="Make & Model" />
        <FilterAccordion label="Year & Mileage" />
        <FilterAccordion label="Body Style" />
        <FilterAccordion label="Fuel Type" />
        <FilterAccordion label="Features" />
      </div>
    </aside>
  );
}

function VehicleCard({ v, onOpen }) {
  return (
    <div onClick={onOpen} className="group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:shadow-md">
      <div className="relative">
        <CarThumb hue={v.hue} image={v.image} className="aspect-[4/3] w-full" watermark />
        {v.cpo && (
          <span className="absolute left-2 top-2 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Certified Pre-Owned
          </span>
        )}
        <button className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 hover:text-red-600">
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Stock #{v.stock}</span>
          <span>{v.miles.toLocaleString()} mi</span>
        </div>
        <div className="mt-0.5 text-sm font-bold text-slate-900">{v.year} {v.make} {v.model}</div>
        <div className="text-xs text-slate-500">{v.trim}</div>

        <div className="mt-2 flex items-end justify-between border-t border-slate-100 pt-2">
          <div>
            <div className="text-[10px] uppercase text-slate-400">Sale price</div>
            <div className="text-lg font-bold text-slate-900">{usd(v.price)}</div>
          </div>
          <div className="text-right text-[11px] text-slate-500">est. {usd(v.mo)}/mo</div>
        </div>

        <button className="mt-2.5 w-full rounded-md bg-red-700 py-2 text-sm font-bold text-white hover:bg-red-800">Unlock price</button>

        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5">1-OWNER</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">History report</span>
        </div>
      </div>
    </div>
  );
}

export function SearchPage({ onOpenVehicle, onOpenAbout }) {
  return (
    <div className="min-h-full bg-slate-100">
      <TopUtilityBar />
      <DealerHeader onOpenAbout={onOpenAbout} />
      <PromoStrip />

      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {["Under $25k", "Under $500/mo", "AWD / 4WD", "SUVs", "Electric", "$750 CO Tax Credit"].map((p) => (
            <span key={p} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">{p}</span>
          ))}
        </div>

        <div className="flex gap-5">
          <FilterSidebar />

          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">Search by make, model, or feature</span>
              </div>
              <button className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                <SlidersHorizontal className="h-4 w-4" /> Sort: Best match
              </button>
            </div>

            <div className="mb-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">142</span> certified and used vehicles for sale in {DEALER.city}, {DEALER.state}
            </div>

            <SearchInspectdBand onOpenAbout={onOpenAbout} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {INVENTORY.map((v) => (
                <VehicleCard key={v.vin} v={v} onOpen={() => onOpenVehicle(v)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- VDP -------------------------------------------------------- */

function SpecRow({ k, v }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  );
}

export function VDPPage({ v, onBack, onOrder, onOpenAbout }) {
  const [showAll, setShowAll] = useState(false);
  const feats = showAll ? FEATURES : FEATURES.slice(0, 9);
  return (
    <div className="min-h-full bg-slate-100">
      <TopUtilityBar />
      <DealerHeader onOpenAbout={onOpenAbout} />
      <PromoStrip />

      <div className="mx-auto max-w-7xl px-4 py-4">
        <button onClick={onBack} className="mb-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Inventory / Used {v.year} {v.make} {v.model} {v.trim}
        </button>

        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div>
            <div className="relative">
              <CarThumb hue={v.hue} image={v.image} className="aspect-[16/10] w-full rounded-lg" watermark />
              {v.cpo && (
                <span className="absolute left-3 top-3 rounded bg-slate-900/90 px-2.5 py-1 text-[11px] font-bold uppercase text-white">Certified Pre-Owned</span>
              )}
              <div className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-[11px] text-white">1 / 30 photos</div>
              <button className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-slate-700"><ChevronLeft className="h-5 w-5" /></button>
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-slate-700"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <CarThumb key={i} hue={v.hue} image={v.image} className={"aspect-[4/3] rounded " + (i === 0 ? "ring-2 ring-red-600" : "opacity-70")} />
              ))}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{v.year} {v.make} {v.model} {v.trim}</h1>
            <div className="text-sm text-slate-500">{v.miles.toLocaleString()} miles · Stock #{v.stock}</div>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">1-OWNER</span>
              <img src="/carfax-badge.png" alt="Carfax" className="h-7 shrink-0" />
              <span className="text-sm text-slate-600">Free vehicle history report available</span>
              <button className="ml-auto text-sm font-semibold text-red-700">View report</button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-bold text-slate-900">{v.year} {v.make} {v.model} details</h2>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <dl>
                  <SpecRow k="Condition" v={v.cpo ? "Certified Pre-Owned" : "Pre-owned"} />
                  <SpecRow k="Body type" v={v.body} />
                  <SpecRow k="Trim" v={v.trim} />
                  <SpecRow k="Stock #" v={v.stock} />
                  <SpecRow k="VIN" v={v.vin} />
                  <SpecRow k="Location" v={`${DEALER.city}, ${DEALER.state}`} />
                  <SpecRow k="Exterior color" v={v.ext} />
                  <SpecRow k="Interior color" v={v.intc} />
                </dl>
                <dl>
                  <SpecRow k="Fuel type" v={v.fuel} />
                  <SpecRow k="Drivetrain" v={v.drive} />
                  <SpecRow k="Transmission" v={v.trans} />
                  <SpecRow k="Engine" v={v.engine} />
                  <SpecRow k="Mileage" v={v.miles.toLocaleString() + " mi"} />
                  <SpecRow k="Passengers" v="5" />
                  <SpecRow k="Doors" v="4" />
                  <SpecRow k="MPG (est.)" v={v.fuel === "Electric" ? "—" : "26 city / 33 hwy"} />
                </dl>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold text-slate-900">Key features</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {feats.map(([label, Icon]) => (
                  <div key={label} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {label}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAll((s) => !s)} className="mt-3 flex items-center gap-1 text-sm font-medium text-red-700">
                {showAll ? "Show fewer features" : "Show all 18 features"}
                <ChevronDown className={"h-4 w-4 " + (showAll ? "rotate-180" : "")} />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-bold text-slate-900">Used {v.year} {v.make} {v.model} for sale in {DEALER.city}, {DEALER.state}</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                This {v.year} {v.make} {v.model} {v.trim} is offered by {DEALER.name}. Equipped with {v.drive} and a {v.engine},
                it comes ready for Colorado driving. Stop in for a test drive or unlock your price online. All pricing excludes
                tax, title, and dealer handling fee.
              </p>
            </div>
          </div>

          <div>
            <div className="space-y-3 lg:sticky lg:top-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Price</div>
                <div className="text-3xl font-bold text-slate-900">{usd(v.price)}</div>
                <div className="mt-1 inline-flex items-center gap-2 rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white">Est. {usd(v.mo)}/mo</div>

                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between text-slate-500"><span>Original price</span><span>{usd(v.orig)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Dealer handling fee</span><span>$699</span></div>
                  <div className="flex justify-between font-semibold text-slate-900"><span>Sale price</span><span>{usd(v.price)}</span></div>
                </div>

                <button className="mt-3 w-full rounded-md bg-red-700 py-2.5 text-sm font-bold text-white hover:bg-red-800">Unlock VIP pricing</button>
                <div className="mt-2 space-y-2">
                  {["Get pre-approved", "Schedule a test drive", "Ask a question"].map((c) => (
                    <button key={c} className="w-full rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{c}</button>
                  ))}
                </div>

                <div className="mt-3 flex justify-around border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="flex flex-col items-center gap-1"><Share2 className="h-4 w-4" /> Share</span>
                  <span className="flex flex-col items-center gap-1"><Heart className="h-4 w-4" /> Save</span>
                  <span className="flex flex-col items-center gap-1"><Phone className="h-4 w-4" /> Call</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
                <img src="/carfax-badge.png" alt="Carfax" className="h-7 shrink-0" />
                <button className="text-sm font-semibold text-red-700 hover:text-red-800">
                  View Carfax® report
                </button>
              </div>

              <VdpInspectdModule onOrder={() => onOrder({ vehicle: v, dealer: CRESTVIEW_DEALER })} />

              <div className="rounded-lg bg-amber-400 p-4">
                <div className="text-sm font-bold text-slate-900">What's your car worth?</div>
                <div className="text-xs text-slate-700">Get an instant trade-in value.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- About page (dealer chrome + content) ----------------------- */

export function AboutPage({ onBack, onOpenAbout }) {
  return (
    <div className="min-h-full bg-slate-100">
      <TopUtilityBar />
      <DealerHeader onOpenAbout={onOpenAbout} />
      <PromoStrip />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
        </button>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome to Crestview Auto Group
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          As Aurora, Colorado's premier destination for high-quality used vehicles, we believe that trust is earned,
          not given. We've built our dealership on total transparency, fair pricing, and putting our customers in the
          driver's seat, on the road and during the buying process. We aren't just selling cars. We're building
          lifelong relationships in our Colorado community.
        </p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Beyond the History Report: get the ground-truth facts
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-700">
            Because we believe in total transparency, we provide a complimentary Carfax® Vehicle History Report with
            every car on our lot. But a history report only tells you the past. It doesn't tell you the condition of
            the vehicle today. You wouldn't buy a house on its permit history alone without hiring an independent home
            inspector. Buying a car should be no different. Consumer advocates recommend a Pre-Purchase Inspection
            before you buy, especially shopping online or out of state.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">We agree. And we have nothing to hide.</h2>
          <div className="mt-3">
            <IndependentBadge />
          </div>
          <p className="mt-3 text-base leading-relaxed text-slate-700">
            Because we're confident in the quality of our inventory, we make it easy to get an independent second
            opinion. We supply a link to order a VINsight™ Inspection Report directly through Inspectd™, an impartial,
            nationwide network of professional vehicle inspectors who operate entirely independently from our
            dealership.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">How to get the facts</h2>
          <ol className="mt-4 space-y-3 text-base leading-relaxed text-slate-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                1
              </span>
              <span>Click "Order VINsight™ Inspection Report" on any vehicle listing.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                2
              </span>
              <span>
                An impartial third-party inspector arrives at our lot to evaluate the vehicle and delivers the data
                directly and exclusively to your device.
              </span>
            </li>
          </ol>
        </div>

        <div className="mt-6 rounded-lg bg-slate-900 p-6 text-white">
          <p className="text-base leading-relaxed text-slate-200">
            <span className="font-bold text-white">The Crestview Reimbursement:</span> if you buy from us, we reimburse
            the full cost.
          </p>
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-balance text-center text-xl font-semibold italic leading-snug text-slate-800">
          Shop with the ease of digital retail, backed by the certainty of physical truth.
        </p>
      </div>
    </div>
  );
}
