# Platform decisions

Decisions about the platform we are building on top of the clone in `src/platform/`. Each one is a line
or two: what was decided and, where it isn't obvious, why. Newest at the bottom of each section.

## The job (ops board, part 1)

- **Inspection type and subtype replace the old type list.** Consumer (Pre-purchase, Post-purchase), Condition
  Report (Fleet, Lease return, General) and Arbitration (no subtype). The board shows the type only; the subtype
  lives in the job details. The vocabulary lives in one file, `src/platform/jobModel.js`.
- **The old types map onto the new ones.** pre-purchase → Consumer / Pre-purchase; lease-end → Condition Report /
  Lease return; auction-listing, warranty, other → Condition Report / General; auction-arbitration → Arbitration.
- **Vehicle class replaces designation: Standard, EV, Exotic.** High-end and classic become Exotic. Class is a
  property of the vehicle, the same whoever orders the inspection. It sets the payout now, and which providers
  suit the job later.
- **Every job carries a provider payout, made up for now.** It comes from the ZIP's price tier (1: $105, 2: $115,
  3: $130, 4: $145, 5: $160), plus $10 for EV or $25 for Exotic, capped at $185. A ZIP with no known tier
  prices as tier 2. One function (`payoutFor`) is the whole rule, so real pricing can replace it. The payout is
  stored on the job (`payout_cents`) when the job is created.
- **One status field: New, Dispatching, Claimed, Complete, Canceled.** It replaces the separate status and
  lookup fields. Open jobs are New, Dispatching and Claimed; closed jobs are Complete and Canceled. Dispatching
  means the job link is live.
- **Whether providers have been found is a detail of the job, not its status.** It lives in `job.search`
  (running, done or failed, and when it started). Finding providers leaves a job New.
- **Any status may follow any other, so a canceled job can go back to New.** Part 2's Reset does that, and turns
  the old link off by setting `meta.inspect.off_at`. The inspector's page already refuses a link that is off.
- **Open dispatch: a decline doesn't change the job.** A job has one link, shared with many providers, and the
  link isn't tied to one provider. A provider declining records that they passed and why. The link stays live
  and the job stays Dispatching. Only a claim, a cancel or a reset changes the status. Part 2 makes the link
  job-level.
- **The client portal keeps its own stages.** A New job reads "Received" until providers are being found, then
  "Dispatching", as it did before. Dispatching reads "Dispatching", Claimed reads "Confirmed", and Complete and
  Canceled read as before. The mapping is `portalStage()` in `portalServer.js`.
- **The portal speaks the new vocabulary.** Its request form offers the inspection type with its subtype, and the
  vehicle class. The bulk upload takes `vehicle_class`, `inspection_type` and `inspection_subtype` columns. It
  still reads the old type names and a `designation` column as aliases, so older lists import.
- **The board's next-step button.** New → "Find providers", Dispatching and Claimed → "View", Complete → "View
  report", Canceled → "Reset". In part 1 every button opens the job panel; part 2 makes "Find providers" and
  "Reset" do their work inside it.
- **A provider search works for any ZIP.** A job in one of the seed's ZIPs searches every provider by distance, as
  before. Anywhere else falls back to the providers of the nearest seeded metro (Dallas, Atlanta, Nashville or
  Denver). The job is placed by us-zips' centroid; a ZIP that us-zips doesn't know is placed at its state's center;
  with neither, Dallas is the last resort. The call sheet says the providers come from another area, and how far
  away it is. Before this, a portal request outside the seed's ZIPs crashed the search and left it running for good.

## For part 2

- **Payout is the single provider figure everywhere.** The panel's Order block will show only what the customer
  paid, and no longer the quote's own "Inspector payout" split.
