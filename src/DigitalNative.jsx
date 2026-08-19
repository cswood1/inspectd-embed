import React, { useEffect, useRef, useState } from "react";
import { Search, Heart, Sparkles, ShoppingBag, Truck, Send, X, ArrowLeft, Gauge, Info, Users, Route, Mountain, Leaf, ChevronRight } from "lucide-react";
import { AXLEAUTO_DEALER, DN_INVENTORY, FEATURES, PRICE, usd } from "./data.js";
import { IndependentBadge } from "./ui.jsx";
import { useSavedStore } from "./SavedStore.jsx";

/* ---- shared: top nav -------------------------------------------- */

function TopNav({ activeItem = "Car Search", onNavigate }) {
  const { count: savedCount } = useSavedStore();
  const items = [
    { label: "Car Search", icon: Search, route: "dn-srp" },
    { label: "Saved",      icon: Heart,  route: "dn-saved" },
    { label: "Checkout",   icon: ShoppingBag },
    { label: "Delivery",   icon: Truck },
  ];
  return (
    <>
      <div className="h-1 bg-axle-crimson" />
      <header className="bg-axle-bg">
        <div className="mx-auto flex max-w-full items-center gap-8 px-6 py-3">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("dn-srp")}
            className="inline-flex items-center rounded-full bg-axle-crimson p-1.5 shadow-sm"
            aria-label="AxleAuto home"
          >
            <div className="rounded-full border border-dashed border-white/50 px-6 pb-1 pt-1.5">
              <span className="font-script text-3xl leading-none text-white">
                AxleAuto.ai
              </span>
            </div>
          </button>
          <nav className="ml-auto hidden items-center gap-10 md:flex">
            {items.map((n) => {
              const Icon = n.icon;
              const active = n.label === activeItem;
              const clickable = !!n.route;
              const showDot = n.label === "Saved" && savedCount > 0;
              return (
                <button
                  key={n.label}
                  onClick={() => clickable && onNavigate && onNavigate(n.route)}
                  disabled={!clickable}
                  className={
                    "relative flex items-center gap-2 py-2 text-sm font-medium transition " +
                    (active
                      ? "border-b-2 border-axle-crimson text-axle-crimson"
                      : "border-b-2 border-transparent text-axle-text hover:text-axle-crimson " +
                        (clickable ? "cursor-pointer" : "cursor-default opacity-70"))
                  }
                >
                  <span className="relative">
                    <Icon
                      className={
                        "h-4 w-4 " +
                        (active ? "text-axle-crimson" : "text-axle-text/70")
                      }
                    />
                    {showDot && (
                      <span className="absolute -right-1 -top-1 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-axle-crimson opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-axle-crimson" />
                      </span>
                    )}
                  </span>
                  {n.label}
                  {n.label === "Saved" && savedCount > 0 && (
                    <span className="rounded-full bg-axle-crimson px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {savedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}

/* ---- shared: chat panel ----------------------------------------- */
// Messages: { role: "user" | "assistant", text: string, linkText?: string, onLinkClick?: fn }

function ChatPanel({
  headerTitle,
  headerSubtitle,
  assistantLabel,
  greeting,
  chips,
  onChipClick,
  conversation,
  placeholder = "Type a message…",
}) {
  const chipsShown = conversation.length === 0;
  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-r border-axle-border bg-axle-bg">
      <div className="border-b border-axle-border px-6 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-axle-crimson" />
          <div className="text-base font-semibold text-axle-text">
            {headerTitle}
          </div>
        </div>
        {headerSubtitle && (
          <div className="mt-1 pl-6 text-xs text-axle-muted">{headerSubtitle}</div>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="rounded-md bg-axle-card px-4 py-3">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-axle-muted">
            {assistantLabel}
          </div>
          <p className="text-sm leading-relaxed text-axle-text">{greeting}</p>
        </div>

        {chipsShown && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => onChipClick(c)}
                className="rounded-full border border-axle-border bg-axle-bg px-4 py-2 text-xs text-axle-text transition hover:border-axle-crimson/50 hover:text-axle-crimson"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {conversation.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[300px] rounded-2xl rounded-tr-sm bg-axle-crimson px-4 py-2.5 text-sm leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="rounded-md bg-axle-card px-4 py-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-axle-muted">
                {assistantLabel}
              </div>
              <p className="text-sm leading-relaxed text-axle-text">
                {m.text}
                {m.linkText && (
                  <>
                    {" "}
                    <button
                      onClick={m.onLinkClick}
                      className="font-semibold text-axle-crimson underline underline-offset-2 hover:text-axle-crimson-dark"
                    >
                      {m.linkText}
                    </button>
                  </>
                )}
              </p>
            </div>
          )
        )}
      </div>

      <div className="border-t border-axle-border p-4">
        <div className="flex items-center gap-2">
          <input
            disabled
            placeholder={placeholder}
            className="flex-1 rounded-md border border-axle-border bg-axle-bg px-4 py-2.5 text-sm text-axle-text placeholder:text-axle-muted focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            disabled
            aria-label="Send"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-axle-crimson text-white disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ---- shared: chat card (VDP bubble-column variant) ------------- */

function ChatCard({
  headerTitle,
  headerSubtitle,
  assistantLabel,
  greeting,
  chips,
  onChipClick,
  conversation,
  placeholder = "Type a message…",
}) {
  const chipsShown = conversation.length === 0;
  return (
    <div
      className="sticky top-4 flex flex-col rounded-2xl border border-axle-border bg-axle-card p-5"
      style={{ minHeight: "620px", maxHeight: "calc(100vh - 6rem)" }}
    >
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-axle-crimson" />
          <div className="text-base font-semibold text-axle-text">
            {headerTitle}
          </div>
        </div>
        {headerSubtitle && (
          <div className="mt-1 pl-4 text-xs text-axle-muted">{headerSubtitle}</div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="rounded-md border border-axle-border bg-axle-bg/70 px-4 py-3">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-axle-muted">
            {assistantLabel}
          </div>
          <p className="text-sm leading-relaxed text-axle-text">{greeting}</p>
        </div>

        {chipsShown && (
          <div className="flex flex-col items-start gap-2 pt-1">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => onChipClick(c)}
                className="rounded-full border border-axle-border bg-axle-bg px-4 py-2 text-xs text-axle-text transition hover:border-axle-crimson/50 hover:text-axle-crimson"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {conversation.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[300px] rounded-2xl rounded-tr-sm bg-axle-crimson px-4 py-2.5 text-sm leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="rounded-md border border-axle-border bg-axle-bg/70 px-4 py-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-axle-muted">
                {assistantLabel}
              </div>
              <p className="text-sm leading-relaxed text-axle-text">
                {m.text}
                {m.linkText && (
                  <>
                    {" "}
                    <button
                      onClick={m.onLinkClick}
                      className="font-semibold text-axle-crimson underline underline-offset-2 hover:text-axle-crimson-dark"
                    >
                      {m.linkText}
                    </button>
                  </>
                )}
              </p>
            </div>
          )
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-axle-border pt-4">
        <input
          disabled
          placeholder={placeholder}
          className="flex-1 rounded-md border border-axle-border bg-axle-bg px-4 py-2.5 text-sm text-axle-text placeholder:text-axle-muted focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          disabled
          aria-label="Send"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-axle-crimson text-white disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---- shared: hoverable info link -------------------------------- */

function InfoLink({ label, tone = "blue", tip }) {
  const [open, setOpen] = useState(false);
  const linkCls =
    tone === "emerald"
      ? "text-emerald-600 hover:text-emerald-700"
      : "text-blue-600 hover:text-blue-700";
  const bubbleCls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-slate-200 bg-slate-100 text-slate-800";
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={
          "inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2 transition " +
          linkCls
        }
      >
        <Info className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <span
          className={
            "pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border p-3 text-left text-xs leading-relaxed shadow-lg " +
            bubbleCls
          }
        >
          {tip}
        </span>
      )}
    </span>
  );
}

/* ---- shared: transparency modal -------------------------------- */

function TransparencyModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-axle-border bg-axle-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-axle-border p-6">
          <div>
            <IndependentBadge />
            <h2 className="mt-3 text-xl font-bold tracking-tight text-axle-text">
              Get the ground-truth on any vehicle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-md p-1 text-axle-muted hover:bg-axle-bg hover:text-axle-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6 text-sm leading-relaxed text-axle-text/80">
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
        <div className="flex items-center justify-between border-t border-axle-border bg-axle-bg px-6 py-4">
          <span className="text-xs text-axle-muted">Order from any vehicle's page.</span>
          <button
            onClick={onClose}
            className="rounded-full bg-axle-crimson px-5 py-2 text-sm font-semibold text-white hover:bg-axle-crimson-dark"
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
      className="group overflow-hidden rounded-2xl border border-axle-border bg-axle-card text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-axle-bg">
        <img
          src={v.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4">
        <div className="text-[11px] text-axle-muted">{v.trim}</div>
        <div className="mt-0.5 text-sm font-bold text-axle-text">
          {v.year} {v.make} {v.model} {v.trim}
        </div>
        <div className="mt-2 text-lg font-bold tracking-tight text-axle-text">
          {usd(v.price)}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-axle-muted">
          <Gauge className="h-3 w-3" />
          <span>{v.miles.toLocaleString()} mi</span>
          <span className="text-axle-muted/40">·</span>
          <span className="truncate">{v.ext}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-axle-muted">Stock {v.stock}</div>
      </div>
    </button>
  );
}

function CompareByNeedCard() {
  const options = [
    { label: "Family & carpools",  icon: Users },
    { label: "Daily commute",      icon: Route },
    { label: "Weekend adventure",  icon: Mountain },
    { label: "Fuel savers",        icon: Leaf },
  ];
  return (
    <div className="flex flex-col rounded-2xl border border-axle-border bg-axle-bg p-4">
      <Sparkles className="h-4 w-4 text-axle-crimson" />
      <h3 className="mt-2 text-sm font-bold text-axle-text">
        Compare cars best for:
      </h3>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.label}
              className="group flex w-full items-center justify-between rounded-lg bg-axle-crimson-light/40 px-3 py-2 text-xs font-medium text-axle-text transition hover:bg-axle-crimson-light/70"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-axle-crimson" />
                {o.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-axle-muted transition group-hover:translate-x-0.5 group-hover:text-axle-crimson" />
            </button>
          );
        })}
      </div>
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
          className="rounded-full border border-axle-border bg-axle-card px-4 py-1.5 text-xs font-medium text-axle-text transition hover:border-axle-crimson/40 hover:text-axle-crimson"
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

export function DigitalNativeSRP({ onOpenVehicle = () => {}, onNavigate = () => {} }) {
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
    <div className="relative flex h-full flex-col bg-axle-bg font-inter">
      <TopNav activeItem="Car Search" onNavigate={onNavigate} />

      <main className="flex-1 overflow-auto border-t border-axle-border">
        <div className="mx-auto flex max-w-[1500px] items-start gap-4 p-4">
          <div className="w-[380px] shrink-0">
            <ChatCard
              headerTitle="Find your next car"
              headerSubtitle="Search the AxleAuto marketplace"
              assistantLabel="AXLEAUTO ASSISTANT"
              greeting="Hi there! Tell me what you're looking for and I'll search every AxleAuto store. Tap a prompt to start:"
              chips={SRP_CHIPS}
              onChipClick={handleChip}
              conversation={conversation}
              placeholder="What kind of car are you looking for?"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-end justify-between px-1">
              <h1 className="text-xl font-bold tracking-tight text-axle-text">
                Available inventory
              </h1>
              <div className="text-xs text-axle-muted">
                {DN_INVENTORY.length} of 294 vehicles from AxleAuto
              </div>
            </div>

            <div className="rounded-2xl border border-axle-border bg-axle-card p-6">
              <div className="mb-6">
                <FilterChips />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {firstFour.map((v) => (
                  <VehicleCard key={v.vin} v={v} onOpen={() => onOpenVehicle(v)} />
                ))}
                <CompareByNeedCard />
                {lastFour.map((v) => (
                  <VehicleCard key={v.vin} v={v} onOpen={() => onOpenVehicle(v)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <TransparencyModal open={modalOpen} onClose={closeModal} />
    </div>
  );
}

/* ---- VDP v2: right-column sections ----------------------------- */

function GallerySection({ v }) {
  const [activeIdx, setActiveIdx] = useState(0);
  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-axle-border bg-axle-card">
        <img src={v.image} alt="" className="h-full w-full object-cover" />
        <div className="absolute bottom-3 left-3 rounded-md bg-slate-900/85 px-2 py-1 text-xs font-medium text-white">
          1 / 32
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={
              "aspect-[4/3] overflow-hidden rounded-lg border border-axle-border bg-axle-card transition " +
              (i === activeIdx
                ? "ring-2 ring-axle-crimson"
                : "opacity-80 hover:opacity-100")
            }
          >
            <img src={v.image} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        <button className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-axle-border bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800">
          +26 more
        </button>
      </div>
    </div>
  );
}

function SpecItem({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-axle-muted">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm font-medium text-axle-text">
        {value}
      </div>
    </div>
  );
}

function VehicleInfoCard({ v }) {
  const { isSaved, toggle } = useSavedStore();
  const saved = isSaved(v.vin);
  return (
    <div className="rounded-2xl border border-axle-border bg-axle-card p-6">
      <h1 className="text-2xl font-bold tracking-tight text-axle-text">
        {v.year} {v.make} {v.model}
      </h1>
      <div className="mt-4 text-4xl font-bold tracking-tight text-axle-text">
        {usd(v.price)}
      </div>
      <div className="mt-3">
        <span className="inline-flex items-center rounded-full border border-axle-crimson/40 bg-axle-crimson-light/40 px-2.5 py-0.5 text-xs font-semibold text-axle-crimson">
          Used
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-sm text-axle-muted">
        <Gauge className="h-3.5 w-3.5" />
        {v.miles.toLocaleString()} mi
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-axle-border pt-5">
        <SpecItem label="Mileage" value={`${v.miles.toLocaleString()} mi`} />
        <SpecItem label="Stock #" value={v.stock} />
        <SpecItem label="Exterior" value={v.ext} />
        <SpecItem label="Interior" value="Black" />
        <SpecItem label="Drivetrain" value={v.drive} />
        <SpecItem label="Engine" value={v.engine} />
        <SpecItem label="Transmission" value={v.trans} />
        <SpecItem label="Fuel" value={v.fuel} />
        <SpecItem label="Body" value={v.body} />
        <SpecItem label="VIN" value={v.vin} />
      </div>

      <button
        onClick={() => toggle(v.vin)}
        className={
          "mt-6 flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition " +
          (saved
            ? "border-axle-crimson bg-axle-crimson-light/40 text-axle-crimson"
            : "border-axle-border bg-axle-bg text-axle-text hover:border-axle-crimson hover:text-axle-crimson")
        }
      >
        <Heart
          className={
            "h-4 w-4 " + (saved ? "fill-axle-crimson text-axle-crimson" : "")
          }
        />
        {saved ? "Saved" : "Save / get updates"}
      </button>
    </div>
  );
}

/* ---- VDP tabs + content ---------------------------------------- */

const VDP_TABS = ["Why you'll love it", "Details", "Features", "Pricing"];

function VdpTabs({ active, onSelect }) {
  return (
    <div className="sticky top-0 z-20 -mx-6 -mt-6 border-b border-axle-border bg-axle-card/95 px-6 pt-6 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        {VDP_TABS.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={
              active === t
                ? "rounded-full bg-axle-crimson px-5 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-transparent px-5 py-2 text-sm font-medium text-axle-text hover:text-axle-crimson"
            }
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function WhyYoullLoveIt({ v }) {
  const isEv = /electric/i.test(v.fuel);
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-axle-text">
        Why you'll love this {v.year} {v.make} {v.model}
      </h2>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-axle-crimson/20 bg-axle-crimson-light/40 px-2.5 py-1 text-xs font-medium text-axle-crimson">
        <Sparkles className="h-3 w-3" />
        AI-generated
      </span>
      <p className="mt-4 text-sm leading-relaxed text-axle-text/85">
        You'll enjoy the combination of a {v.engine}{isEv ? "" : " engine"} and the {v.drive} drivetrain in this {v.ext} {v.body.toLowerCase()}.
        The interior offers heated leather seats and premium finishes for your comfort, and you'll stay connected with
        modern infotainment, driver-assist tech, and safety features that come standard on the {v.year} {v.make} {v.model}.
        With {v.miles.toLocaleString()} miles on the clock, this {v.body.toLowerCase()} is priced at {usd(v.price)} — competitive
        for its trim and options.
      </p>
    </div>
  );
}

function DetailsTab({ v }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-axle-text">Vehicle details</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <SpecItem label="Year" value={v.year} />
        <SpecItem label="Make" value={v.make} />
        <SpecItem label="Model" value={v.model} />
        <SpecItem label="Trim" value={v.trim} />
        <SpecItem label="Body" value={v.body} />
        <SpecItem label="Exterior" value={v.ext} />
        <SpecItem label="Drivetrain" value={v.drive} />
        <SpecItem label="Engine" value={v.engine} />
        <SpecItem label="Transmission" value={v.trans} />
        <SpecItem label="Fuel" value={v.fuel} />
        <SpecItem label="Mileage" value={`${v.miles.toLocaleString()} mi`} />
        <SpecItem label="VIN" value={v.vin} />
      </div>
    </div>
  );
}

function FeaturesTab() {
  const feats = FEATURES.slice(0, 8);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-axle-text">Key features</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {feats.map(([label, Icon]) => (
          <div key={label} className="flex items-center gap-2 text-sm text-axle-text">
            <Icon className="h-4 w-4 shrink-0 text-axle-crimson" />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingTab({ v }) {
  const [mode, setMode] = useState("Finance");
  const monthly = { Finance: v.mo, Lease: Math.round(v.mo * 0.75) };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-axle-text">Pricing options</h2>
      <div>
        <div className="flex gap-1 rounded-full border border-axle-border bg-axle-bg p-1">
          {["Cash", "Finance", "Lease"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "flex-1 rounded-full py-2 text-sm font-medium transition " +
                (mode === m
                  ? "bg-axle-crimson text-white"
                  : "text-axle-muted hover:text-axle-text")
              }
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-baseline justify-between rounded-xl border border-axle-border bg-axle-bg px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-axle-muted">
              {mode === "Cash" ? "Total price" : mode === "Finance" ? "Est. financing" : "Est. lease"}
            </div>
            <div className="mt-1 text-xl font-bold text-axle-text">
              {mode === "Cash" ? usd(v.price) : `${usd(monthly[mode])}/mo`}
            </div>
          </div>
          <div className="text-xs text-axle-muted">
            {mode === "Cash"
              ? "Full amount at checkout"
              : mode === "Finance"
              ? "72 mo · 5.9% APR"
              : "36 mo · 10k mi/yr"}
          </div>
        </div>
        <button className="mt-4 w-full rounded-full bg-axle-crimson py-3 text-sm font-semibold text-white hover:bg-axle-crimson-dark">
          Continue to checkout
        </button>
      </div>
    </div>
  );
}

function VinsightWordmark({ className = "h-10" }) {
  return (
    <img
      src="/vinsight-wordmark.png"
      alt="VINsight"
      className={"block w-auto rounded-md " + className}
    />
  );
}

function CheckThisVehicle({ v, onOrder }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-axle-border bg-axle-card">
      <div className="px-6 pb-5 pt-6">
        <h3 className="text-base font-semibold text-axle-text">Check this vehicle</h3>
        <p className="mt-1 text-xs leading-relaxed text-axle-muted">
          Two independent reports on this exact car — one on where it has been, one on where it stands today.
        </p>

        {/* Carfax */}
        <div className="mt-5 border-t border-axle-border pt-4">
          <div className="flex items-center gap-2">
            <img src="/carfax-logo.svg" alt="Carfax" className="h-6 shrink-0" />
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              Vehicle history
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold text-axle-text">
            Review its past.
          </div>
          <p className="mt-1 text-xs leading-relaxed text-axle-muted">
            A vehicle history report is available for this vehicle.
          </p>
          <div className="mt-2">
            <InfoLink
              label="What's in the report"
              tone="blue"
              tip="Review reported accidents, title and salvage records, service history, and previous ownership, as reported to Carfax® by the shops, agencies, and insurers that handled the car."
            />
          </div>
          <button className="mt-3 flex w-full items-center justify-center rounded-full bg-axle-crimson py-2.5 text-xs font-bold text-white hover:bg-axle-crimson-dark">
            View Carfax® report
          </button>
          <div className="mt-2 text-center text-[10px] text-axle-muted">
            Included — no cost
          </div>
        </div>

        {/* VINsight */}
        <div className="mt-5 border-t border-axle-border pt-4">
          <div className="flex items-center gap-2">
            <VinsightWordmark className="h-6" />
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              Independent inspection
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold text-axle-text">
            Verify its present.
          </div>
          <p className="mt-1 text-xs leading-relaxed text-axle-muted">
            Order a VINsight™ Pre-Purchase Inspection.
          </p>
          <div className="mt-2">
            <InfoLink
              label="What's in the inspection"
              tone="emerald"
              tip="An independent third-party professional will evaluate this vehicle on our lot. You will receive a standardized condition report complete with high-resolution images, video, road-test data, and a mechanical evaluation. Plus, we will credit 100% of the inspection cost back to you when you complete your vehicle purchase."
            />
          </div>
          <button
            onClick={() => onOrder({ vehicle: v, dealer: AXLEAUTO_DEALER })}
            className="mt-3 flex w-full items-center justify-center rounded-full bg-axle-crimson py-2.5 text-xs font-bold text-white hover:bg-axle-crimson-dark"
          >
            Order VINsight™ report
          </button>
          <div className="mt-2 text-center text-[10px] text-axle-muted">
            {usd(PRICE)} — credited back at purchase
          </div>
        </div>
      </div>

      <div className="border-t border-axle-border bg-axle-bg/60 px-6 py-3">
        <div className="text-xs text-axle-muted">
          Powered by <span className="font-bold text-axle-text">Inspectd</span>
        </div>
      </div>
    </div>
  );
}

/* ---- VDP v2 page ------------------------------------------------ */

const VDP_CHIPS = [
  { id: 1, label: "Is it still available?", triggers: false },
  { id: 2, label: "What features does it have?", triggers: false },
  { id: 3, label: "Can I take it for a test drive?", triggers: false },
  { id: 4, label: "Can I order a pre-purchase inspection?", triggers: true },
];

export function DigitalNativeVDP({ v = DN_INVENTORY[0], onBack = () => {}, onOrder = () => {}, onNavigate = () => {} }) {
  const [conversation, setConversation] = useState([]);
  const [tab, setTab] = useState("Why you'll love it");
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});

  const handleChip = (chip) => {
    if (!chip.triggers) return;
    const vehicleName = `${v.year} ${v.make} ${v.model}`;
    setConversation([
      { role: "user", text: chip.label },
      {
        role: "assistant",
        text: `Yes — for this ${vehicleName}, an independent VINsight™ Pre-Purchase Inspection is available. A third-party professional inspects this exact vehicle on our lot and delivers a standardized condition report. The ${usd(PRICE)} inspection cost is credited back to you at purchase.`,
        linkText: "Order a VINsight™ report",
        onLinkClick: () => onOrder({ vehicle: v, dealer: AXLEAUTO_DEALER }),
      },
    ]);
  };

  const vehicleName = `${v.year} ${v.make} ${v.model}`;
  const greeting = `Hi there! Ask me anything about this ${vehicleName} — specs, features, availability, and more.`;

  // Sticky-tab clearance when jumping to a section.
  const TAB_OFFSET = 80;

  const goToTab = (name) => {
    setTab(name);
    const el = sectionRefs.current[name];
    const container = scrollRef.current;
    if (!el || !container) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    container.scrollTo({
      top: container.scrollTop + (elTop - containerTop) - TAB_OFFSET,
      behavior: "smooth",
    });
  };

  // Scroll-spy: whichever section's top is nearest (but not past) the
  // sticky tab bar gets marked active.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const containerTop = container.getBoundingClientRect().top;
        let current = VDP_TABS[0];
        for (const name of VDP_TABS) {
          const el = sectionRefs.current[name];
          if (!el) continue;
          const relativeTop = el.getBoundingClientRect().top - containerTop;
          if (relativeTop <= TAB_OFFSET + 10) current = name;
        }
        setTab(current);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const setSectionRef = (name) => (el) => {
    if (el) sectionRefs.current[name] = el;
  };

  return (
    <div className="relative flex h-full flex-col bg-axle-bg font-inter">
      <TopNav activeItem="Car Search" onNavigate={onNavigate} />

      <main ref={scrollRef} className="flex-1 overflow-auto border-t border-axle-border">
        <div className="mx-auto flex max-w-[1500px] items-start gap-4 p-4">
          <div className="w-[380px] shrink-0">
            <ChatCard
              headerTitle="About this vehicle"
              headerSubtitle={vehicleName}
              assistantLabel="AXLEAUTO ASSISTANT"
              greeting={greeting}
              chips={VDP_CHIPS}
              onChipClick={handleChip}
              conversation={conversation}
              placeholder="Type a message…"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-medium text-axle-muted hover:text-axle-crimson"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
            </button>
            <div className="space-y-5 rounded-2xl border border-axle-border bg-axle-card p-6">
              <GallerySection v={v} />
              <VdpTabs active={tab} onSelect={goToTab} />
              <section ref={setSectionRef("Why you'll love it")} className="pt-2">
                <WhyYoullLoveIt v={v} />
              </section>
              <section ref={setSectionRef("Details")} className="pt-6">
                <DetailsTab v={v} />
              </section>
              <section ref={setSectionRef("Features")} className="pt-6">
                <FeaturesTab />
              </section>
              <section ref={setSectionRef("Pricing")} className="pt-6 pb-6">
                <PricingTab v={v} />
              </section>
            </div>
          </div>

          <div className="w-96 shrink-0 space-y-4">
            <VehicleInfoCard v={v} />
            <CheckThisVehicle v={v} onOrder={onOrder} />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---- Saved page ------------------------------------------------- */

function SavedVehicleCard({ v, onOpen, onRemove }) {
  return (
    <div
      onClick={onOpen}
      className="relative grid cursor-pointer grid-cols-1 overflow-hidden rounded-2xl border border-axle-border bg-axle-card transition hover:border-axle-crimson/40 md:grid-cols-[280px_1fr]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-axle-bg md:aspect-auto md:h-full">
        <img
          src={v.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col p-5">
        <div className="text-xs text-axle-muted">{v.trim}</div>
        <div className="mt-0.5 text-base font-bold text-axle-text">
          {v.year} {v.make} {v.model} {v.trim}
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-axle-text">
          {usd(v.price)}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-axle-muted">
          <Gauge className="h-3.5 w-3.5" />
          <span>{v.miles.toLocaleString()} mi</span>
          <span className="text-axle-muted/40">·</span>
          <span className="truncate">{v.ext}</span>
        </div>
        <div className="mt-1 text-xs text-axle-muted">Stock {v.stock}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-3 top-3 rounded-full border border-axle-border bg-axle-bg p-1.5 text-axle-muted transition hover:border-axle-crimson hover:text-axle-crimson"
        aria-label="Remove from saved"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SavedVehicleDetailModal({ v, onClose, onViewFullDetails, onRemove, onOrder }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        onClick={onClose}
        className="absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-axle-border bg-axle-card font-inter shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-axle-border p-5">
          <div>
            <div className="text-xs text-axle-muted">{v.trim}</div>
            <div className="text-xl font-bold tracking-tight text-axle-text">
              {v.year} {v.make} {v.model}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-axle-muted hover:bg-axle-bg hover:text-axle-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[300px_1fr]">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-axle-border bg-axle-bg">
              <img src={v.image} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-3xl font-bold tracking-tight text-axle-text">
                {usd(v.price)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-axle-crimson/40 bg-axle-crimson-light/40 px-2.5 py-0.5 text-xs font-semibold text-axle-crimson">
                  Used
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-axle-muted">
                  <Gauge className="h-3.5 w-3.5" /> {v.miles.toLocaleString()} mi
                </span>
                <span className="text-axle-muted/40">·</span>
                <span className="text-xs text-axle-muted">Stock {v.stock}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-axle-text/85">
                {v.year} {v.make} {v.model} {v.trim} · {v.body} · {v.drive}.
                {" "}
                Finished in {v.ext} over Black interior, powered by a {v.engine}
                {" "}
                with the {v.trans}.
              </p>
            </div>
          </div>

          <div className="border-t border-axle-border px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-axle-muted">
              Specs
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <SpecItem label="Mileage" value={`${v.miles.toLocaleString()} mi`} />
              <SpecItem label="Stock #" value={v.stock} />
              <SpecItem label="Exterior" value={v.ext} />
              <SpecItem label="Interior" value="Black" />
              <SpecItem label="Drivetrain" value={v.drive} />
              <SpecItem label="Engine" value={v.engine} />
              <SpecItem label="Transmission" value={v.trans} />
              <SpecItem label="Fuel" value={v.fuel} />
              <SpecItem label="Body" value={v.body} />
              <div className="col-span-2 sm:col-span-3">
                <SpecItem label="VIN" value={v.vin} />
              </div>
            </div>
          </div>

          <div className="border-t border-axle-border px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-axle-muted">
              Key features
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {FEATURES.slice(0, 8).map(([label, Icon]) => (
                <div key={label} className="flex items-center gap-2 text-xs text-axle-text">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-axle-crimson" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-axle-border bg-axle-bg/60 px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-axle-muted">
              Check this vehicle
            </div>
            <div className="mt-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="inline-flex items-center gap-2 rounded-full border border-axle-border bg-axle-card px-3 py-1.5 text-xs font-medium text-axle-text transition hover:border-blue-500 hover:text-blue-700">
                    <img src="/carfax-logo.svg" alt="" className="h-3.5" />
                    Vehicle history
                  </button>
                  <InfoLink
                    label="What's in the report"
                    tone="blue"
                    tip="Review reported accidents, title and salvage records, service history, and previous ownership, as reported to Carfax® by the shops, agencies, and insurers that handled the car."
                  />
                </div>
                <div className="mt-2 text-[10px] text-axle-muted">Free</div>
              </div>
              <div className="mt-6 border-t border-axle-border pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={onOrder}
                    className="inline-flex items-center gap-2 rounded-full border border-axle-border bg-axle-card px-3 py-1.5 text-xs font-medium text-axle-text transition hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <VinsightWordmark className="h-3.5" />
                    Order inspection
                  </button>
                  <InfoLink
                    label="What's in the inspection"
                    tone="emerald"
                    tip="An independent third-party professional will evaluate this vehicle on our lot. You will receive a standardized condition report complete with high-resolution images, video, road-test data, and a mechanical evaluation. Plus, we will credit 100% of the inspection cost back to you when you complete your vehicle purchase."
                  />
                </div>
                <div className="mt-2 text-[10px] text-axle-muted">
                  {usd(PRICE)} — credited back at purchase
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-axle-border bg-axle-bg/60 p-4">
          <button
            onClick={onRemove}
            className="text-xs font-medium text-axle-muted underline underline-offset-2 hover:text-axle-crimson"
          >
            Remove from saved
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onViewFullDetails}
              className="rounded-full border border-axle-text/40 bg-transparent px-5 py-2 text-sm font-semibold text-axle-text hover:border-axle-text hover:bg-axle-text hover:text-axle-bg"
            >
              View full details
            </button>
            <button
              type="button"
              className="rounded-full bg-axle-crimson px-5 py-2 text-sm font-semibold text-white hover:bg-axle-crimson-dark"
            >
              Proceed to checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SAVED_CHIPS = [
  { id: 1, label: "How do these vehicles compare?", triggers: false },
  { id: 2, label: "Any upcoming price drops on these?", triggers: false },
  { id: 3, label: "Can I order a pre-purchase inspection?", triggers: true },
];

export function DigitalNativeSaved({
  onOpenVehicle = () => {},
  onNavigate = () => {},
  onOrder = () => {},
}) {
  const { savedVins, remove, clear, count } = useSavedStore();
  const [selectedVin, setSelectedVin] = useState(null);
  const [conversation, setConversation] = useState([]);

  const vehicles = savedVins
    .map((vin) => DN_INVENTORY.find((v) => v.vin === vin))
    .filter(Boolean);
  const selected = vehicles.find((v) => v.vin === selectedVin) || null;

  const handleChip = (chip) => {
    if (!chip.triggers) return;
    setConversation([
      { role: "user", text: chip.label },
      {
        role: "assistant",
        text:
          count === 0
            ? `You don't have any saved vehicles yet. Save a car from its details page, then come back and order a VINsight™ Pre-Purchase Inspection from here.`
            : `Yes — for any of your saved vehicles, you can order a VINsight™ Pre-Purchase Inspection. Tap a saved vehicle to open the details and order a report from there.`,
      },
    ]);
  };

  return (
    <div className="relative flex h-full flex-col bg-axle-bg font-inter">
      <TopNav activeItem="Saved" onNavigate={onNavigate} />

      <main className="flex-1 overflow-auto border-t border-axle-border">
        <div className="mx-auto flex max-w-[1400px] items-start gap-4 p-4">
          <div className="w-[380px] shrink-0">
            <ChatCard
              headerTitle="Saved vehicles"
              headerSubtitle={`${count} ${count === 1 ? "vehicle" : "vehicles"} saved`}
              assistantLabel="AXLEAUTO ASSISTANT"
              greeting="These are the vehicles you've saved. Ask me anything about them — compare specs, watch for price drops, or order a pre-purchase inspection."
              chips={SAVED_CHIPS}
              onChipClick={handleChip}
              conversation={conversation}
              placeholder="Ask about a saved vehicle…"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-axle-text">
                  Saved vehicles
                </h1>
                <p className="mt-1 text-sm text-axle-muted">
                  {count === 0
                    ? "You haven't saved any vehicles yet."
                    : `${count} ${count === 1 ? "vehicle" : "vehicles"} saved`}
                </p>
              </div>
              {count > 0 && (
                <button
                  onClick={clear}
                  className="text-xs font-medium text-axle-muted underline underline-offset-2 hover:text-axle-crimson"
                >
                  Clear all
                </button>
              )}
            </div>

            {vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-axle-border bg-axle-card p-16 text-center">
                <Heart className="h-8 w-8 text-axle-muted" />
                <div className="mt-3 text-base font-semibold text-axle-text">
                  Nothing saved yet
                </div>
                <p className="mt-1 max-w-sm text-sm text-axle-muted">
                  Tap the heart on any vehicle's details page to save it here and get updates on price and availability.
                </p>
                <button
                  onClick={() => onNavigate("dn-srp")}
                  className="mt-5 rounded-full bg-axle-crimson px-5 py-2 text-sm font-semibold text-white hover:bg-axle-crimson-dark"
                >
                  Browse inventory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {vehicles.map((v) => (
                  <SavedVehicleCard
                    key={v.vin}
                    v={v}
                    onOpen={() => setSelectedVin(v.vin)}
                    onRemove={() => remove(v.vin)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {selected && (
        <SavedVehicleDetailModal
          v={selected}
          onClose={() => setSelectedVin(null)}
          onViewFullDetails={() => {
            setSelectedVin(null);
            onOpenVehicle(selected);
          }}
          onRemove={() => {
            remove(selected.vin);
            setSelectedVin(null);
          }}
          onOrder={() => {
            setSelectedVin(null);
            onOrder({ vehicle: selected, dealer: AXLEAUTO_DEALER });
          }}
        />
      )}
    </div>
  );
}
