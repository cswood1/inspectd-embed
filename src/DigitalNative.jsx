import React, { useState } from "react";
import { Search, Heart, Sparkles, ShoppingBag, Truck, Bell, Send, X, Car, ArrowLeft } from "lucide-react";
import { AXLEAUTO_DEALER, DN_INVENTORY, FEATURES, PRICE, usd } from "./data.js";
import { IndependentBadge } from "./ui.jsx";

/* ---- shared: AxleAuto assistant avatar -------------------------- */

function HelmetAvatar({ size = "h-8 w-8" }) {
  return (
    <div
      className={
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white " +
        size
      }
    >
      <img src="/axleauto-assistant.png" alt="" className="h-full w-full object-contain" />
    </div>
  );
}

/* ---- shared: top nav -------------------------------------------- */

function TopNav({ activeItem = "Car Search" }) {
  const items = [
    { label: "Car Search", icon: Search },
    { label: "Saved", icon: Heart },
    { label: "Offers", icon: Sparkles },
    { label: "Checkout", icon: ShoppingBag },
    { label: "Delivery", icon: Truck },
  ];
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-full items-center gap-6 px-6 py-4">
        <div className="text-xl font-bold tracking-tight text-slate-900">
          AxleAuto<span className="text-violet-600">.ai</span>
        </div>
        <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
          {items.map((n) => {
            const Icon = n.icon;
            const active = n.label === activeItem;
            return (
              <button
                key={n.label}
                className={
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition " +
                  (active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800")
                }
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <button className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 sm:flex">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-semibold text-white">
            JR
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---- shared: chat panel ----------------------------------------- */
// Messages: { role: "user" | "assistant", text: string, linkText?: string, onLinkClick?: fn }

function ChatPanel({ greeting, chips, onChipClick, conversation }) {
  const chipsShown = conversation.length === 0;
  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <HelmetAvatar size="h-7 w-7" />
          <div>
            <div className="text-sm font-semibold text-slate-900">AxleAuto assistant</div>
            <div className="text-[11px] text-emerald-600">Online</div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="flex gap-3">
          <HelmetAvatar />
          <div className="max-w-[280px] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800">
            {greeting}
          </div>
        </div>

        {chipsShown && (
          <div className="space-y-2 pl-11">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => onChipClick(c)}
                className="block w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-left text-sm text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {conversation.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[280px] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <HelmetAvatar />
              <div className="max-w-[280px] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800">
                {m.text}
                {m.linkText && (
                  <>
                    {" "}
                    <button
                      onClick={m.onLinkClick}
                      className="font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-800"
                    >
                      {m.linkText}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
          <input
            disabled
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            disabled
            aria-label="Send"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ---- shared: transparency modal -------------------------------- */

function TransparencyModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-6">
          <div>
            <IndependentBadge />
            <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
              Get the ground-truth on any vehicle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6 text-sm leading-relaxed text-slate-600">
          <p>
            You wouldn't buy a house on its permit history alone. You'd hire an independent home inspector to walk
            the property and tell you the truth about it. Buying a car should be no different.
          </p>
          <p>
            A VINsight™ Inspection Report is an independent condition report delivered by Inspectd™. A third-party
            technician inspects this exact vehicle in person, completes a standardized condition inspection with a
            diagnostic scan, and delivers the report directly to your device.
          </p>
          <p>
            Because the technician does not work for AxleAuto or any seller, the report reads the same whether the
            news is good or bad. It's the ground-truth on the car's condition today, so you can decide with the same
            information the seller has.
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <span className="text-xs text-slate-500">Order from any vehicle's page.</span>
          <button
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- SRP v2: vehicle card + promo card -------------------------- */

function VehicleCard({ v, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={v.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {v.confidence && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-violet-700 shadow-sm backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {v.confidence}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="text-base font-semibold text-slate-900">
          {v.year} {v.make} {v.model}
        </div>
        <div className="mt-0.5 truncate text-sm text-slate-500">{v.trim}</div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>{v.miles.toLocaleString()} mi</span>
          <span className="text-slate-300">·</span>
          <span className="truncate">{v.ext}</span>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">{usd(v.price)}</div>
            <div className="text-xs text-slate-500">est. {usd(v.mo)}/mo</div>
          </div>
          <span className="text-xs font-medium text-violet-600 group-hover:text-violet-700">
            View details →
          </span>
        </div>
      </div>
    </button>
  );
}

function InspectionPromoCard({ onOpenModal }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5">
      <div>
        <IndependentBadge />
        <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900">
          Know the car's real condition before you buy.
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Order an independent VINsight™ inspection from any vehicle's page. Third-party technician, standardized
          report, delivered straight to your device.
        </p>
      </div>
      <button
        onClick={onOpenModal}
        className="mt-5 self-start rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Read our transparency promise
      </button>
    </div>
  );
}

function FilterChips() {
  const chips = ["Electric", "SUVs", "Under $50k", "AWD", "Premium"];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c}
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ---- SRP v2 page ------------------------------------------------ */

const SRP_GREETING = "Hi, I'm the AxleAuto assistant. What can I help you with today?";
const SRP_INSPECTION_REPLY =
  "Great question. An independent inspection means a third-party technician, not the dealer, inspects the exact vehicle and sends you a standardized VINsight™ condition report before you buy. It's the ground-truth on the car's condition today, impartial because the inspector doesn't work for the seller.";

const SRP_CHIPS = [
  { id: 1, label: "Show me electric vehicles", triggers: false },
  { id: 2, label: "Family-friendly SUVs under $40k", triggers: false },
  { id: 3, label: "I want an independent inspection", triggers: true },
];

export function DigitalNativeSRP({ onOpenVehicle = () => {} }) {
  const [conversation, setConversation] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleChip = (chip) => {
    if (!chip.triggers) return;
    setConversation([
      { role: "user", text: chip.label },
      {
        role: "assistant",
        text: SRP_INSPECTION_REPLY,
        linkText: "Read our transparency promise",
        onLinkClick: openModal,
      },
    ]);
  };

  const firstFour = DN_INVENTORY.slice(0, 4);
  const lastFour = DN_INVENTORY.slice(4);

  return (
    <div className="relative flex h-full flex-col bg-slate-50">
      <TopNav activeItem="Car Search" />

      <div className="flex flex-1 overflow-hidden">
        <ChatPanel
          greeting={SRP_GREETING}
          chips={SRP_CHIPS}
          onChipClick={handleChip}
          conversation={conversation}
        />

        <main className="flex-1 overflow-auto px-8 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discover your next car</h1>
              <p className="mt-1 text-sm text-slate-500">
                {DN_INVENTORY.length} vehicles curated for you · delivered to your door
              </p>
            </div>

            <div className="mb-8">
              <FilterChips />
            </div>

            <div className="grid grid-cols-3 gap-6">
              {firstFour.map((v) => (
                <VehicleCard key={v.vin} v={v} onOpen={() => onOpenVehicle(v)} />
              ))}
              <InspectionPromoCard onOpenModal={openModal} />
              {lastFour.map((v) => (
                <VehicleCard key={v.vin} v={v} onOpen={() => onOpenVehicle(v)} />
              ))}
            </div>
          </div>
        </main>
      </div>

      <TransparencyModal open={modalOpen} onClose={closeModal} />
    </div>
  );
}

/* ---- VDP v2: right-column sections ----------------------------- */

function GallerySection({ v }) {
  const [activeIdx, setActiveIdx] = useState(0);
  return (
    <div>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-100">
        <img src={v.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={
              "aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 transition " +
              (i === activeIdx ? "ring-2 ring-violet-500" : "opacity-70 hover:opacity-100")
            }
          >
            <img src={v.image} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function TitleAndPrice({ v }) {
  const [mode, setMode] = useState("Finance");
  const monthly = {
    Finance: v.mo,
    Lease: Math.round(v.mo * 0.75),
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {v.year} {v.make} {v.model}
          </h1>
          <div className="mt-1 text-sm text-slate-500">{v.trim}</div>
          <div className="mt-1 text-sm text-slate-500">
            {v.miles.toLocaleString()} mi · {v.ext}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight text-slate-900">{usd(v.price)}</div>
          <div className="text-xs text-slate-500">Sale price</div>
        </div>
      </div>

      <div className="mt-5 flex gap-1 rounded-full bg-slate-100 p-1">
        {["Cash", "Finance", "Lease"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={
              "flex-1 rounded-full py-2 text-sm font-medium transition " +
              (mode === m
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800")
            }
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {mode === "Cash" ? "Total price" : mode === "Finance" ? "Est. financing" : "Est. lease"}
          </div>
          <div className="mt-1 text-xl font-bold text-slate-900">
            {mode === "Cash" ? usd(v.price) : `${usd(monthly[mode])}/mo`}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {mode === "Cash"
            ? "Full amount at checkout"
            : mode === "Finance"
            ? "72 mo · 5.9% APR"
            : "36 mo · 10k mi/yr"}
        </div>
      </div>

      <button className="mt-4 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800">
        Continue to checkout
      </button>
    </div>
  );
}

function TradeInCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
        <Car className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">Add your trade-in</div>
        <div className="text-xs text-slate-500">
          Get an instant offer and apply it toward your order.
        </div>
      </div>
      <button className="shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700">
        Start
      </button>
    </div>
  );
}

function SpecGrid({ v }) {
  const specs = [
    ["Drivetrain", v.drive],
    ["Fuel", v.fuel],
    ["Transmission", v.trans],
    ["Exterior color", v.ext],
    ["VIN", v.vin],
    ["Stock", v.stock],
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Specs</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-6">
        {specs.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm">
            <dt className="text-slate-500">{k}</dt>
            <dd className="truncate text-right font-medium text-slate-800">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CarfaxRow() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <img src="/carfax-badge.png" alt="Carfax" className="h-7 shrink-0" />
      <div className="flex-1 text-sm text-slate-600">Vehicle history report available for this vehicle.</div>
      <button className="shrink-0 text-sm font-semibold text-violet-700 hover:text-violet-800">
        View Carfax® report
      </button>
    </div>
  );
}

function FeaturesGrid() {
  const feats = FEATURES.slice(0, 8);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Key features</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {feats.map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-2 text-sm text-slate-700">
            <Icon className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionModule({ v, onOrder }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-6">
      <IndependentBadge />
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
        Know this vehicle's real condition before you buy.
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        A VINsight™ inspection means a third-party technician, not the seller, inspects this exact vehicle and
        delivers a standardized condition report. Ordering reserves this vehicle while it's inspected, and the
        {" "}{usd(PRICE)} cost applies toward your purchase if you buy.
      </p>
      <button
        onClick={() => onOrder({ vehicle: v, dealer: AXLEAUTO_DEALER })}
        className="mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Order VINsight™ Report
      </button>
      <p className="mt-3 text-xs text-slate-500">
        Provided by Inspectd™. Independent of AxleAuto.
      </p>
    </div>
  );
}

/* ---- VDP v2 page ------------------------------------------------ */

const VDP_CHIPS = [
  { id: 1, label: "Tell me about leasing and financing options", triggers: false },
  { id: 2, label: "How does delivery work?", triggers: false },
  { id: 3, label: "I want to order an inspection on this vehicle", triggers: true },
];

export function DigitalNativeVDP({ v = DN_INVENTORY[0], onBack = () => {}, onOrder = () => {} }) {
  const [conversation, setConversation] = useState([]);

  const handleChip = (chip) => {
    if (!chip.triggers) return;
    const vehicleName = `${v.year} ${v.make} ${v.model}`;
    setConversation([
      { role: "user", text: chip.label },
      {
        role: "assistant",
        text: `Great. A VINsight™ inspection on the ${vehicleName} means a third-party technician, not the seller, inspects this exact vehicle and delivers a standardized condition report. Ordering reserves this vehicle while it's inspected, and the ${usd(PRICE)} inspection cost applies toward your purchase if you buy.`,
        linkText: "Order an inspection on this vehicle",
        onLinkClick: () => onOrder({ vehicle: v, dealer: AXLEAUTO_DEALER }),
      },
    ]);
  };

  const greeting = `You're looking at the ${v.year} ${v.make} ${v.model}. Ask about specs, delivery, or ordering an inspection.`;

  return (
    <div className="relative flex h-full flex-col bg-slate-50">
      <TopNav activeItem="Saved" />

      <div className="flex flex-1 overflow-hidden">
        <ChatPanel
          greeting={greeting}
          chips={VDP_CHIPS}
          onChipClick={handleChip}
          conversation={conversation}
        />

        <main className="flex-1 overflow-auto px-8 py-8">
          <div className="mx-auto max-w-4xl space-y-5">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
            </button>
            <GallerySection v={v} />
            <TitleAndPrice v={v} />
            <TradeInCard />
            <CarfaxRow />
            <InspectionModule v={v} onOrder={onOrder} />
            <SpecGrid v={v} />
            <FeaturesGrid />
          </div>
        </main>
      </div>
    </div>
  );
}
