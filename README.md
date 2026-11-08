# Inspectd Dev + Staging

The prototype environment for the Inspectd platform. Everything here is a mock: there
is no backend, and pricing, VIN decode, provider lookup, payment and messaging are all
stubbed. It exists for three things:

- **Demos.** Walk a partner, customer or investor through the product end to end.
- **Prototyping.** Build a new screen or flow here before it goes into a production repo.
- **Ideation.** Try variants side by side (see SRP v2 / VDP v2) without touching anything real.

It covers both sides of the platform: the **Platform** surfaces we operate (enterprise,
provider and internal workspaces) and the **External** surfaces we embed on partner
sites (dealer listings, marketplaces, auctions).

## Fidelity bar

Build these as close to the shipped product as we can. A surface should look, read and
behave like the real thing:

- Real-looking copy, data and states (empty, loading, error, terminal), not lorem ipsum
  or "TODO" boxes.
- Interactions work end to end. If a button exists, it does something credible.
- State carries across surfaces where it would in production. An order placed on a dealer
  VDP should show up in the portals.
- Partner surfaces should feel like the partner's site, with Inspectd as the inserted
  third-party piece. Mock partners stay generic and are never real dealers or brands.
- Mocks can be faked, but they shouldn't feel fake. Stub the backend, not the experience.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs to dist/
npm run preview    # serve the build locally
```

The app sits behind an access gate. The code is `inspectd`, or whatever you set as
`VITE_DEMO_ACCESS_CODE`. Access is remembered for the browser session.

Stack: Vite 5, React 18, Tailwind 3 and lucide-react. It's plain JSX with no TypeScript and
no router library. Leaflet and `us-zips` power the provider job-board map.

## Map of the environment

The top bar (**INSPECTD DEV+STAGING**) switches between sections. Apart from
`/job/:token`, `/r/:token` and `/inspect/:token`, navigation is view state, not URLs.

### Platform

| Tab | File | What it is |
| --- | --- | --- |
| Operations | `platform/Console.jsx` | High-fidelity clone of the Inspectd operations console: sidebar with live counts, Open and Closed jobs boards (status cards, search, filters, sortable table, simulated lookup), and Providers, Customers, Reports and Settings sections. The app opens here. |
| Client portal | `platform/Portal.jsx` | High-fidelity clone of the Inspectd client portal, signed in as Cam (Inspectd team) in Meridian Fleet Services. One workspace per kind of customer: Inspectd Consumers, Meridian Fleet Services (fleet), Crestview Denver (dealer) and ReBuilt Autos (marketplace). It has: workspace switcher, Overview, Jobs, New inspection request, Upload a list (CSV or Excel; demo files in `public/demo/`) the job page, Reports and the report viewer (photos, configuration, inspector notes and every checklist area, from ten real Lemon Squad reports), Vehicles, Team, Settings and Invoices. Shares the console's request list: a portal request is a job on the console's board, and console changes show in the portal. A console job's report "Open" opens that report here. |
| Enterprise | `EnterprisePortal.jsx` | Business customer portal: dashboard, jobs, reports, and the multi-step Create Job wizard (vehicle → service → location → contact → review). |
| Provider | `ProviderPortal.jsx` | Inspector workspace: job board (list + map + filters), job details, active claimed jobs, upload data, completed reports. |
| Internal | `InternalRequests.jsx` | Ops console: incoming requests, provider research by area, notes/outcomes, duplicate detection, and **Dispatch**, which turns a job into a shareable provider link. |

### External surfaces

| Area / tab | File | What it is |
| --- | --- | --- |
| Dealer → SRP / VDP | `Dealer.jsx` | Generic dealer site (Crestview Auto Group). Page-level Inspectd band on search; Inspectd module in the VDP's CTA stack. |
| Dealer → SRP v2 / VDP v2 | `DigitalNative.jsx` | Digital-native retailer variant (AxleAuto) with chat assistant, saved vehicles and a "check this vehicle" module. |
| Auction | `Wholesale.jsx` | Wholesale/auction inventory table with bulk "order inspection" and a self-inspect flow. |

Ordering from a dealer surface opens a **simulated new tab** (`Inspectd.jsx`: landing →
order → confirm) skinned for that partner. In production this is a real tab to a
partner-skinned Inspectd page.

### Provider offer link: `/job/:token`

A standalone mobile page an inspector opens from a texted link. The token is the auth, so it
renders outside the access gate and the dev chrome. It covers offered → claim (with
verification) → post-claim → submit, plus coded declines and terminal states.

- Seeded tokens: `/job/t_k4rav`, `/job/t_r9rav` (two providers, same job, to demo
  first-claim-wins across two tabs), `/job/t_k2tsl`, `/job/t_r7f15`, `/job/t_r3sup`
  (superseded).
- Dispatch in the Internal console mints new tokens.
- Add `?dev=1` to get the demo operator panel, which moves the job forward and resets state.
- Hosting needs a rewrite of `/job/*` to `index.html`; on Vercel it lives in `vercel.json`.

### Client portal links: `/r/:token` and `/inspect/:token`

Two more standalone pages, outside the access gate, reading and writing the same `PlatformStore` as
the Operations console and Client portal:

- `/r/<token>` is the customer's report link (the portal's viewer, public, in the dark share colours).
  Each report's token is `reports[].share.token` in `inspectd_platform_v1`.
- `/inspect/<token>` is the inspector's job link: the job facts, Claim (with the terms) or Decline on
  an offered link, then the received state. Uploads show a demo notice. Each job's token is
  `rows[].meta.inspect.token`; the console's job panel shows the link.
- Hosting needs the same rewrite for `/r/*` and `/inspect/*`, also in `vercel.json`.

## Shared state

The surfaces talk to each other through small context stores persisted to `localStorage`.
That's what makes cross-surface demos work, for example ordering on a VDP and then seeing it
in the Enterprise and Provider portals.

| Store | Key | Holds | Written by / read by |
| --- | --- | --- | --- |
| `OrderStore.jsx` | `inspectd_orders_v2` | Orders, service levels, client types, payout math | Dealer/DN tab, Wholesale, Enterprise wizard → Enterprise, Provider, Internal |
| `RequestStore.jsx` | (in memory) | Internal console overlay keyed by order id: research, notes, outcome | Internal only, never touches order status |
| `OfferStore.jsx` | `inspectd_offers_v1` | Jobs, providers, tokens, offer state machine; syncs across tabs | Internal Dispatch → `/job/:token` |
| `SavedStore.jsx` | `inspectd_saved_vins` | Saved vehicles | Digital-native surfaces |
| `platform/PlatformStore.jsx` | `inspectd_platform_v1` | Request records in the production console's exact shape, seeded from `platform/seed.js` (dates relative to first load); `reset()` reseeds | Operations, Client portal |

To reset a demo, clear those keys or use **Reset** in the `?dev=1` panel for offers.

## Structure

```
src/
  main.jsx              root: OfferStore → (/job/:token | /r/:token | /inspect/:token | stores → AccessGate → App)
  router.jsx            hand-rolled /job, /r and /inspect token matches + ?flag reader
  AccessGate.jsx        demo access code screen
  App.jsx               dev chrome, section/tab switching, simulated-tab overlay
  data.js               mock partners (Crestview, AxleAuto), inventory, price
  ui.jsx                primitives shared by customer-facing surfaces
  InternalUI.jsx        primitives for internal surfaces (kept out of ui.jsx on purpose)

  Dealer.jsx            dealer SRP / VDP / About
  DigitalNative.jsx     SRP v2 / VDP v2 / Saved
  Wholesale.jsx         auction surface
  Inspectd.jsx          embed modules + new-tab order flow

  EnterprisePortal.jsx  enterprise customer portal
  ProviderPortal.jsx    provider workspace
  VINmap.jsx            Leaflet job map, zip → coords, distance
  InternalRequests.jsx  internal ops console + Dispatch

  JobOffer.jsx          /job/:token screens
  JobOfferFlows.jsx     claim / decline / submit bottom sheets
  OfferDevPanel.jsx     ?dev=1 operator panel

  OrderStore.jsx  RequestStore.jsx  OfferStore.jsx  SavedStore.jsx

  platform/             Operations console + client portal clones, self-contained
    platform.css        the console design system, scoped to .ip
    portal.css          the portal design system, scoped to .ipp
    ui.jsx  derive.js   console primitives, vocabulary, derived views
    seed.js  PlatformStore.jsx  authServer.js  portalServer.js
    Console.jsx  Board.jsx  JobPanel.jsx  Sections.jsx  Settings.jsx
    Portal.jsx  PortalJobs.jsx  PortalReports.jsx  PortalTeam.jsx  ReportView.jsx
    PublicPages.jsx  portalUi.jsx  vin.js  xlsx.js
    reportIndex.js      generated: each converted report's summary row
public/                 brand marks, partner assets, vehicle photos
  portal/reports/       the ten converted reports: <id>/report.json and images/ (WebP)
tools/
  report-conversion/    turns inspection PDFs into those reports; not part of the build (see its README)
```

## Adding a surface

1. Build it as its own `src/<Name>.jsx`. Read and write shared state through the stores
   rather than inventing local copies of orders or jobs.
2. Register the view in `App.jsx`: add it to `DEALER_SURFACES`, `PLATFORM_SURFACES` or
   `EXTERNAL_AREAS`, and render it in the view switch.
3. Use `ui.jsx` primitives for customer-facing pages and `InternalUI.jsx` for internal ones.
4. Put mock partners and inventory in `data.js`. Partners are fictional; Inspectd product copy
   lives with the surface that uses it.

This repo is also where the production `widget.js` embed loader will start out.
