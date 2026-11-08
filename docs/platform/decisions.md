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

## The job panel and open dispatch (ops board, part 2)

- **One job link per job, open to everyone it is shared with.** A job has at most one live link, and the link isn't
  tied to a provider. Anyone with it sees the job; the first to claim gets it, and from then on the link shows the job
  as taken to everyone else. Creating the link moves a New job to Dispatching; a claim moves it to Claimed; a decline
  changes nothing. It replaces the clone's per-provider links, Book form and Change.
- **The link keeps its own record** (`meta.link`): when and by whom it was created, each view, each decline (reason,
  and who if they said), and the claim (name, company, phone, optional email, when, terms accepted).
- **`provider_id: null` on every claim and decline**, reserved for linking them to a provider record later.
- **The page knows who it is talking to by a per-browser id**, since providers have no accounts. The browser that
  claimed sees the upload step; one that declined sees "You declined"; everyone else sees the job as taken once claimed.
  A view is recorded once per page load.
- **The console's "Open" is a preview.** It opens the link with `?preview=1`: the page looks the same but records
  nothing, and claiming and declining are turned off.
- **Payout is the single provider figure everywhere.** The panel's Order block shows only what the customer paid
  (and any refund); the quote's own "Inspector payout" split is gone.
- **Cancel is one action.** "Cancel job" asks for a reason; a job the customer paid for is refunded and the customer
  emailed, as before. If the provider who claimed it left an email, they are told it's off.
- **Reset puts a canceled job back to New.** The old link is turned off and kept in `meta.past_links` (its page says
  the job is no longer available), the cancellation moves into `meta.resets`, and the provider results stay so the job
  can be dispatched again. A refunded job keeps its refund record and isn't charged again.
- **Activity is derived, not logged.** The panel's timeline is built from what the job already stores (`activity.js`).
- **Scheduled times.** Nothing sets a visit time now that Book is gone. The seed's claimed and complete jobs keep theirs
  as `meta.scheduled_at`, which the portal shows. (Part 3 adds the proposed time to every claim.)
- **Gone with the old model:** the provider booking email, the per-shop Contacted and Booked flags (the Providers
  section now counts the links each provider claimed), the free status dropdown, and Delete request.
- **The board's buttons do their work.** "Find providers" opens the panel and starts a search when none has run (or the
  last one failed); "Reset" opens the panel with the reset confirm.

## The provider's job card (ops board, part 3)

- **Phone first.** `/inspect/<token>` is a single column with large tap targets, the deciding facts first, and Claim
  and Decline pinned to the bottom of a phone screen; on desktop it is a centered card (`JobCard.jsx`).
- **The card has one state per viewer:** Open (anyone, before a claim), Claimed by you, Taken, You declined, No longer
  available (reset or canceled), Complete. Preview (`?preview=1`) always renders the Open card with the actions off.
- **Before a claim, the card shows what a provider needs to decide:** payout ("Paid when your report is accepted"),
  vehicle and class, inspection and what the report covers, city and state, the customer's notes and any listing
  facts. The full address, the on-site contact and the lot's contact are only for the provider who claimed it.
- **Requirements describe what the report covers, not how to inspect.** Four to five items per type and subtype,
  plus EV and Exotic additions (`requirementsFor` in `jobModel.js`). There are no photo minimums: providers' tools
  differ, and Prism normalizes what they send.
- **Scheduling.** A claim proposes a date (today to 30 days out) and morning, afternoon or evening, stored as
  `meta.link.claim.proposed_time`. After claiming, the inspector calls the on-site contact to confirm arrival and
  access: the proposed time is the plan, the call confirms it. The console's panel and activity show it with the claim;
  the portal shows "Planned for Thu Nov 12, morning. The inspector will call [contact] to confirm arrival and access."
  Seeded jobs keep their exact times, worded the same way.
- **Declines pick a reason from a short list** (not available in time, too far away, payout too low, not equipped,
  other) plus an optional name.
- **The claimer's checklist ticks stay in their browser**, per link; they are never sent.
- **A complete job reads "Complete" at any age**; the clone's 14-day "job is closed" message is gone.
- **Not yet:** a request has no timeframe field, so the card's timeframe line shows only when one exists. Report upload
  still shows the demo notice; Prism ingest comes next.

## Who orders (demo structure)

- **Every job has an "ordered by": Consumer, Dealer, Marketplace or Fleet** (`ORDERED_BY` in `jobModel.js`). It is the
  type of the workspace the job lands in, stored on the job (`ordered_by`) and on the workspace (`type`). A job made in
  the portal takes its workspace's type.
- **One client portal workspace per kind of customer.** Inspectd Consumers (Consumer) holds every consumer inspection,
  which we run ourselves; it is the old Inspectd workspace renamed (slug `inspectd-consumers`), still owned by Kavin, Cam
  and Scott. Meridian Fleet Services (Fleet), Crestview Denver (Dealer) and ReBuilt Autos (Marketplace) are the
  businesses. Northline Mobility and Harbor Lease Remarketing are gone; their fleet and lease jobs moved to Meridian.
- **Consumers now have a workspace, so "has a workspace" no longer means "is a business".** Who a job is for, the
  duplicate-email flag, related jobs and the activity line ask `isConsumer` instead. A consumer's job still carries the
  order they paid.
- **The Consumer type is only for jobs whose end customer is a consumer:** a consumer's own order, or a shopper ordering
  through a marketplace's embed (ReBuilt Autos). A business (a dealer or a fleet) orders a Condition Report or an
  Arbitration. The rule is `consumerTypeAllowed` in `jobModel.js`. A business workspace's request form doesn't offer
  Consumer and starts on Condition Report. Its bulk upload reads a blank type as Condition Report / General and skips a
  row that asks for Consumer. The server refuses a Consumer request from a business workspace. Crestview's
  pre-purchase jobs became Condition Report / General; its arbitration jobs stay Arbitration.
- **Crestview Denver is one store of the Crestview Auto Group**, named the way dealer groups name their locations. The
  dealer site (the external surfaces) stays the group; the workspace and its emails are the store.
- **ReBuilt Autos replaces Rebuildr.** It is a fictional rebuilt-title marketplace. Its shoppers order through its embed
  on a listing, pay at checkout (with the partner's share), and the job lands in ReBuilt's workspace with the listing's
  facts (`listings.rebuiltautos.example`). The panel reads "Marketplace · ReBuilt Autos, through its embed".
- **Geography.** Consumer jobs are in Denver, Dallas, Atlanta and Nashville only. Meridian's are mostly in those four,
  plus eight of the ten real reports elsewhere (fleets are national). Crestview's are in Denver, plus the two real reports
  it bought out of state (the Berkeley 718 and the Fairfield Camaro arbitration). ReBuilt's are in Salt Lake City, which
  has five fictional providers. Consumers and ReBuilt have no reports yet; the next step adds real ones.
- **Salt Lake City price tiers are estimates** (tier 1 in the city, tier 2 in the suburbs). The tier file the seed's
  other ZIPs come from has no Utah rows here.
- **A provider search stays in the job's metro.** A job in a seeded ZIP in a metro's state searches that metro's
  providers only; anywhere else falls back to the nearest metro (now including Salt Lake City), as before. Without this, a
  Salt Lake City job asking for up to seven inspectors would list Denver shops 370 miles away.
- **Canceling a paid job from the portal refunds it**, as canceling from the console does. Before this, only business
  jobs (never paid) could be canceled there, so the case didn't arise.
- **The board shows Ordered by, not the inspection type.** The Customer column is the person for a consumer and the
  company for a business. The type and subtype stay in the job details. The filter is an Ordered by filter.
- **Customers: a consumer is one row per email; a business is one row per workspace.** A business's contact is the
  workspace's owner and its location its headquarters. Two cards across the top count consumer and business customers and
  their inspections, and filter the table. A row opens the board searched for that email or company name.
- **Providers are grouped into blocks by metro** (Denver, Dallas, Atlanta, Nashville, Salt Lake City), with Lemon Squad
  in National. The tab is no longer paged; it lists the providers the searches have found, as before.
- **No subtitle under page headings**, in the console or the portal. The job page's lead sentence went with them; the
  stage cards below say the same. The console Reports page lost its link to the portal's report dashboard; "View
  report" in the job panel still opens a report.

## The AI demo's report set

- **About 100 real reports: the ten already converted plus 89 more**, from the Inspectd-Reports project's
  `lemon_squad_reports` (8,925 completed Lemon Squad inspections, December 2022 to August 2025). That table holds only
  each report's metadata; the PDFs are in its private `reports` bucket, and the photos exist only inside the PDFs.
  Everything was read with GET and list requests only, and the PDFs stayed in a scratch folder outside the repo.
- **Real places, not relabeled ones.** Each report belongs to the workspace whose area it was inspected in: Meridian 60
  (41 in Denver, Dallas, Atlanta and Nashville, 19 elsewhere, since fleets are national), Inspectd Consumers 20 (five
  per launch metro), Crestview Denver 5 (four in the Denver area, one bought out of state) and ReBuilt Autos 4 (Salt
  Lake City area). Inspection types follow the Consumer-type rule above.
- **The condition mix is weighted toward clean, but the data has more findings than "mostly clean".** Clean means wear
  only; attention means more than seven attention items, or tires, a leak or prior repair; fail/warning means a failed
  item (not a consumable) or an OBD code or dash warning. Only 16% of the 437 reports analyzed were clean, mostly because
  so many have stored OBD codes; the 89 come to 39% clean, 31% attention and 29% fail/warning.
- **A failed consumable is graded attention, not fail** (`tools/report-conversion/normalize.py`). The items, as Lemon
  Squad's checklist names them: Wiper Blades, Air Filter, Cabin Air Filter, Windshield Washer, Key Fob and Floor Mats.
  They still show as flagged and are counted; the report's counts are recomputed, so the report, the overview and the
  AI agree. A dead battery, tires, brakes and leaks are not consumables. It applies to every report: of the existing
  ten, one finding changed (the '05 911's Windshield Washer).
- **The 2023 template's Summary is read.** It is a section at the foot of the vehicle page, not a page of its own,
  and is either per area (Exterior, Interior, ...) or one paragraph, kept as "Overall". The reader had skipped it.
- **Three photos per report, chosen by eye.** Lemon Squad's gallery has no labels or order, so each report's photos
  were laid out on a numbered contact sheet and three chosen: a hero (a wide exterior, which the viewer uses for its
  header), the first clear interior shot, and a photo showing a flagged finding (else a second exterior angle). Each
  pick and its reason is in `tools/report-conversion/photo-picks.json`. A photo keeps the number the report gives it
  (the cover photo is picture 1, so "refer to picture 16" is image 16), and the report keeps the inspector's photo
  count; the viewer says "3 of 76 photos in this demo". The ten converted earlier keep every photo.
- **Dates are the demo's, not the reports'.** The 89 are inspected between 5 and 178 days ago, spread evenly; the two
  repeat-VIN pairs (an '18 Outback, 36 days apart; an '19 Camry, 155 days apart) keep their real gap.
- **What the seed makes up around a report:** the street address (the reports give only city and ZIP), the requester
  (Meridian's and Crestview's people, 20 new consumers, four ReBuilt shoppers), and the ZIP's price tier (the nearest
  seeded ZIP's tier within 60 miles, else tier 2). ReBuilt's rebuilt titles and damage history are its listings'
  facts; none of the Salt Lake City reports mentions title status. Mileage is as the report prints it, typos included.
