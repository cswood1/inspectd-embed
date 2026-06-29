# Inspectd embed demo

A runnable mock of the Inspectd "order inspection" embed on a dealer site. Two partner
surfaces (search results and a vehicle details page) on a generic mock dealer, with the
Inspectd flow opening in a simulated new tab.

This is also the home for the production `widget.js` loader when we build it.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (default http://localhost:5173).

Build for hosting:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the build locally
```

## What's here

- Top bar switches between **Dealer search** and **Dealer VDP**.
- Search: filter rail, results grid, and the page-level Inspectd band above the grid.
  The band button opens the standalone flow (customer enters a VIN).
- VDP: gallery, spec table, features, sticky pricing rail with the Inspectd module in
  the dealer CTA stack. The module carries the specific vehicle into the flow.
- Both open a simulated new tab to a partner-skinned Inspectd landing → order → confirm.

Everything is mock. Pricing, timing, VIN decode, and payment are stubbed. The simulated
new tab stands in for opening a real tab to a partner-skinned Inspectd page in production.

## Structure

```
src/
  data.js        mock dealer, inventory, features, price, usd()
  ui.jsx         shared primitives: CarThumb, IndependentBadge, InfoTip, Field
  Dealer.jsx     dealer chrome, search page, VDP, sidebar, card
  Inspectd.jsx   embed modules + new-tab flow (landing/order/confirm)
  App.jsx        demo harness, view state, simulated-tab overlay
```

To change the mock dealer or inventory, edit `src/data.js`. Inspectd copy lives at the
top of `src/Inspectd.jsx`.
