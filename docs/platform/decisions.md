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
- ~~**The client portal keeps its own stages.** A New job reads "Received" until providers are being found…~~
  *Replaced (job standards): one status vocabulary on every surface. See "Job statuses".*
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
- **Reset puts a canceled job back to New.** *(Since job standards: the button is **Reopen**, and the job returns to
  Submitted.)* The old link is turned off and kept in `meta.past_links` (its page says
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
  ~~the portal shows "Planned for Thu Nov 12, morning. The inspector will call [contact] to confirm arrival and access."~~
  *Replaced (job standards): the planned date is in the Operations console only; the portal shows no planned date.*
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

## Inspectd AI: per-report insight (AI layer, step 2)

- **Every report carries `insight`**: key issues, condition flags, a surface-rust detail and a short summary, with a
  version and when it was generated (`tools/report-conversion/insight.py`, rerunnable). Insight is factual: it
  describes the record and never recommends what to do, estimates a cost, or judges the car as a purchase. Next steps
  belong to the business.
- **Key issues are rules, not AI**: every finding graded fail, then attention, by area (Mechanical, Road Test, Tire /
  Wheels, Exterior, Interior), consumables last. Each keeps the inspector's note, and the photo it refers to when that
  photo is in the report (the picked issue photo, or a "refer to picture N" one).
- **Flags are rules, not AI**, each true or false with its evidence (findings, and inspector sentences). A sentence with
  a negation before the match ("no signs of frame damage", "no current, pending, or historic fault codes") doesn't
  count. Warning lights or codes: the OBD scan, TPMS and dash-light items, or a sentence affirming codes or a lit
  warning light. Prior repair or paint: repainted, prior paint, filler, varied paint readings, paint mismatch (not
  "needs to be repainted"). Tires: a Tire / Wheels finding graded fail or attention, or a tread reading of 4/32 or less recorded anywhere (a tire's own line, even one graded pass, or the inspector's text); wording alone ("low tread", "worn") is not enough (25 of the 99).
  Leaks: the Engine Oil, Transmission Fluid and Differential leak items, or a sentence affirming a leak, seepage or
  wetness. Structural: a frame item graded fail, or frame or structural damage stated.
- **Rust is split.** `rust_corrosion` (a flag, with a chip labeled "Rust beyond surface") is true only when the record describes more than surface
  rust: rust on a body panel, perforation, or rust or corrosion called heavy (battery-terminal corrosion doesn't count).
  Rust the record calls surface rust or places under the car, on the exhaust or on the rotors is `details.surface_rust`:
  no chip, though a Rust item graded attention still appears in key issues. Across the 99: rust_corrosion 2,
  surface_rust 57.
- **Summaries are written for a reader, not a tally.** One or two sentences, about 40 words at most. They don't open
  with counts (the counts bar shows those). They lead with the overall condition in plain words that follow from the
  record ("Clean overall" only with no failures, only routine wear and no flag true: when a flag is true, the opening names
  that concern first, e.g. "Mostly clean, but all four tires are at 4/32"; "Significant mechanical problems" only with
  failures or serious findings there), then the notable items, most important first, without repeating a word of the opening ("Clean overall: only minor
  scratches", not "Clean, with minor wear: minor scratches"). Plain language, no inspector
  jargon ("diagnostic codes", not DTC; "tire pressure warning light", not TPMS; no code numbers). Still strictly
  factual: no recommendations, costs or judgments, and the inspector's uncertainty is kept. Inspector notes on the
  card's key issues stay as written.
- **The summary is one AI call in production** (`summarize()` in insight.py, given only the record's brief). For the
  demo's 99 reports the summaries were written in this repo's session from those briefs and stored with
  `"source": "demo-written"` (`demo-summaries.json`); the card does not say so, so it looks as it will in production.
  Every summary was fact-checked: every number against the record, length, no counts in the lead, banned words
  (should, needs, recommend, replace, cost, buy, avoid, worth, great, excellent and similar) and jargon, the lead
  against the failures and flags, then each claim read against the record by a second reader.
- **The card shows on a business's reports only** (titled "Summary" since polish round 1, with "Written by Inspectd AI
  from the inspection record." at its foot, and no mark): Condition Report and Arbitration (Meridian Fleet Services, Crestview
  Denver). Consumer-type reports (Inspectd Consumers, and ReBuilt Autos' shoppers) don't show it yet, and neither does
  the public share page. A report row carries its job's inspection type so the viewer can tell. The card sits at the
  top of the report's main column: the summary, the true flags as chips (or "No warning lights, prior repair, leaks or
  structural concerns found"), and the top five key issues with "Show all"; a key issue jumps to its finding.
- **A checklist row split by a page break is read whole.** Lemon Squad's PDFs reprint such a row at the top of the
  next page but leave clipped glyphs of it at the foot of the page, which the reader had taken for labels
  ("Instrument Cl", "Underbody/Frame C", "I") with garbled statuses. The reader now drops those fragments and joins a
  label that continues on the next page. Four reports were affected and re-converted with their photo picks.
- ~~**The Inspectd AI mark is one component** (`AiMark.jsx`).~~ *Replaced (polish round 1): no mark anywhere.* Each report's
  flags and issue counts are also in `reportIndex.js` (`insight_overview`) for the step-3 overview.

## Inspectd AI: the workspace overview (AI layer, step 3)

- ~~**An "Inspectd AI" item in the portal sidebar, for fleet and dealer workspaces only**, with the AI mark, and a page
  at `/ai`.~~ *Replaced (polish round 1): the overview lives at the top of Reports in fleet and dealer workspaces; `/ai`
  redirects to Reports; the AI mark is gone. See "Simplicity".*
- **Computed in the browser from the records, with no AI.** `aiOverview.js` turns the workspace's report rows (their
  dates and locations, and each report's `insight_overview` in `reportIndex.js`: flags, surface rust, key issues as
  `[section, item, status, consumable, underbody]`, and the summary's first sentence) into every figure, and every
  figure into the vehicles or inspections behind it. Step 4's chat calls the same functions. No report is fetched.
- **Vehicles are grouped by VIN and use their latest inspection**; figures about inspections count every report.
  Vehicle figures: Vehicles, Flagged (at least one flag), With a failure, the flag tiles (count and share of vehicles),
  surface rust, most common issues, issues by area. Inspection figures: Reports, Last 30 days, By location, Inspected
  more than once.
- **"Rust or corrosion" is now labeled "Rust beyond surface"** (on the tiles and on the report card's chip); the key
  stays `rust_corrosion`. Surface rust is one muted line under the tiles, "Surface rust noted on N vehicles (not a
  flag)".
- **Most common issues** counts vehicles with an item graded fail or attention, once per vehicle, top ten, with how
  many failed it. Consumables are hidden unless "Show consumables" is on. "Failures only" ranks by failures and drops
  items with none. Item names are the inspector's.
- **Tires are one row in Most common issues.** Lemon Squad records each tire position as its own item (Driver's Front
  Tire, Passenger's 1st Axle Outer Tire ...); there they group into one "Tires" row, a vehicle counted once (two failed
  tires are one vehicle with a failure), and its list shows those vehicles. The report, the flags and Issues by area
  keep the positions apart.
- **Two tire figures, on purpose.** The Tire concerns tile is the flag (a flagged tire finding, or a tread reading of
  4/32 or less even on a tire graded pass); the Tires and wheels bar counts vehicles with a Tire / Wheels finding graded
  fail or attention. A muted line under the bar says so.
- **Issues by area: Exterior, Interior, Mechanical, Tires and wheels, Road test, Underbody.** Underbody isn't a section
  of the checklist: a flagged finding is underbody when its item is the frame, rust, the muffler or the exhaust (or
  floors, rockers), or its note places it under the car (underside, underbody, undercarriage, underneath). Underbody
  findings leave Exterior and Mechanical, so the areas don't overlap.
- **By location: within 60 miles of a metro's center counts under the metro** (Denver, Dallas, Atlanta, Nashville,
  Salt Lake City; centers exported from the seed as `METRO_CENTERS`); everything else is one "Elsewhere" row that
  expands to its cities. Each place shows its inspections and the share of them with any flag.
- ~~**Every figure opens the vehicles behind it** (`VehicleList.jsx`).~~ *Replaced (polish round 1): every figure
  filters the one report list on Reports (`ReportRows`), under "Tire concerns · 17 vehicles" with Clear; a vehicle filter
  lists each vehicle's latest report. `VehicleList.jsx` is gone; step 4's answers use the same list.*

## Simplicity (standing, from polish round 1)

*These rules cover the client portal and, since the ops polish, the Operations console. Internal, Enterprise and
Provider are outside them.*

- **Less is more.** Every element on a business customer's screens has to help them decide something; everything else
  goes. Sophisticated, utilitarian, direct.
- **AI is woven into the screens people already use**, not given its own tab, and not decorated: no mark, no sparkle,
  no gradient. ~~The overview's figures and flags sit at the top of Reports;~~ *(Replaced: the figures and breakdowns
  moved to Inspection Intelligence, a business tab of its own built around worklists; still no mark or sparkle. See
  "Inspection Intelligence".)* A report's AI summary is titled "Summary" with one quiet line saying Inspectd AI wrote it
  from the record.
- **Restraint over ornament.** The lift comes from type, numbers, spacing and one accent: hairline dividers over
  bordered boxes, a colored dot (not a colored border) where a status needs color, tabular figures on every number,
  sentence-case labels (no uppercase letter-spacing), no letter avatars, no count badges, no duplicate actions.
- **One accent: teal `#00807f`** (the logo's teal, darkened from `#00c8c8` to read on white), only for links, selected
  states and focus rings, with `#e6f5f5` as the selected wash. **Primary buttons are ink** (`#111827`) with white text.
- **Status colors carry meaning, never decoration:** red `#b02318` / `#fdecea` (fail, and the warning-lights, leaks and
  structural flags), amber `#9d500a` / `#fff3e6` (attention, and the other flags), green `#1c7a3f` / `#e9f6ee` (pass).
  A stage like "Dispatching" or a role like "Admin" is neutral.
- **Six neutrals and nothing else:** ink `#111827`, body `#374151`, muted `#6b7280`, faint `#9aa1ac`, hairline `#e5e7eb`,
  wash `#f9fafb` (plus white). All of these are CSS variables in `src/platform/tokens.css`, shared by the portal and
  the console, with Kavin's names mapped onto them, so the design pass changes them in one place. ~~The customer's share page keeps its own dark theme.~~ *(Replaced: the share page is light, like the rest; see "Type, surfaces and density".)* *(Since the design system: plus the page color, `--page` #fafaf9; content surfaces are white, `--surface`.)*
- ~~**The type scale:** page title 24/600; section title 15/600; body and table text 14/400; labels (field names, column
  heads) 12/500 muted, sentence case; secondary text 12.5/400 muted; figures 28/600 (the strip) and 20/600 (small),
  tabular; the report's vehicle title 36/700, the only 700. Weights are 400, 500 and 600.~~
  *Replaced (design system): see "Type, surfaces and density" below.*

**What polish round 1 changed in the portal**
- **Pages:** Jobs, Reports, Team, Settings, and the New inspection request button. No Overview (its request block,
  explainer cards and recent reports are all covered by the button, Jobs and Reports), no Vehicles, no Invoices (Billing
  is a section of Settings), no Inspectd AI page.
- **Routing:** `/` lands on Reports in fleet and dealer workspaces and on Jobs in Inspectd Consumers and ReBuilt Autos;
  `/ai` and `/vehicles` redirect to Reports; `/invoices` to `/settings#billing`; an unknown path to the landing page.
  *(Changed: `/ai` now goes to `/intelligence` in fleet and dealer workspaces, and `/intelligence` lands on Jobs in the
  others. See "Inspection Intelligence".)*
- ~~**Reports:** in fleet and dealer workspaces, the figure strip (Vehicles, Reports, Last 30 days, Flagged, With a
  failure) and the flag filters with the surface-rust line; any of them filters the list below, with a visible label
  and Clear. "List | Breakdown" (List by default): Breakdown holds Most common issues, Issues by area, By location and
  Inspected more than once, and anything clicked there switches back to List, filtered.~~ *Replaced (Inspection
  Intelligence): Reports keeps the list and search, and in business workspaces one row of flag chips with vehicle counts
  (surface rust last); a chip filters the list and a second click clears it. The figures, Most common issues and Issues
  by area moved to Intelligence; By location became a starting point there; Inspected more than once and the ask bar
  are gone from Reports.* One search field (VIN, make, model). The list: vehicle and VIN, city, inspected, findings, and (business) flags as dots. Consumer and marketplace
  workspaces get the plain list. Step 4's "Ask about your reports" bar goes at the top.
- **What the Vehicles page did, now:** a car's other inspections are an "Also inspected <date>" line on its report, and
  a job still in progress for it is "In progress: J-…" on the same line (neither on the share page); jobs without a
  report yet are on Jobs, which searches by VIN.
- **The report:** full width, the collapsible section headers are the navigation (no section index); no Print or
  Delete (on the share page too); Download PDF stays; the counts toggle their filter (no "View all").
- **Jobs and a job:** one stage filter (the chips with counts; no stage cards); a row names its inspection type only when
  it differs from the workspace's usual type; no "Dispatching" in Planned; the job page has no stage or reference pill,
  the reference without the internal id, no "Next" labels, and "Updated" only when it differs from Requested.
- **Sidebar, Team, Settings:** the workspace switcher shows the name only (staff still switch); the user tile shows name
  and email; Team has no meta line or role helper; Settings drops the workspace address, the member count and the
  workspaces list.

**What the ops polish changed in the Operations console**
- **Shared tokens:** the portal's token block moved into `tokens.css`, applied to both apps' roots (`.ipp`, `.ip`).
  The console's own palette (a blue accent, charcoal keycap buttons, bordered pastel pills) and its 62 hard-coded
  colors now map onto the tokens, and its font sizes and weights snap to the shared scale. The console is teal-accented
  with flat ink primary buttons. The portal is unchanged (its Reports page is pixel-identical before and after).
- **Status pills:** stages are neutral (New, Dispatching, Claimed); only Complete (green) and Canceled (red) carry a
  color. Rows have no tints or colored left edges. Role pills are neutral.
- **The Actions column** (Open and Closed jobs): one button per row. A New job gets **Dispatch ▸** (ink, a play
  triangle), which opens the job and starts the provider search, as "Find providers" did; the job only becomes
  Dispatching when its link is created. Any other open or complete job gets **Open →**. A canceled job gets ~~**Reset to
  New**~~ **Reopen** (since job standards) (the circular arrow), which opens the job with the same confirm as before. The job panel's own "Find
  providers" button is unchanged.
- **The board:** the status cards became one row of chips with counts, as in the portal; "N of N" shows only while a
  filter or search is on; no Refresh. Customers' two cards became chips (All, Consumers, Businesses).
- **The job panel:** no status pill in the header (the row says it); field labels in sentence case; the claim is a
  plain line ending "Accepted terms", with no version number and no box.
- **Reports** lists only jobs that have a report (a claimed job joins once its report lands), without a Status column,
  since every row would read Complete. The sidebar label stays "Reports".
- **Gone:** letter avatars everywhere in the console; the sidebar's count badges and group labels; the "Inspectd team ·"
  prefix in the user tile; in Settings, the workspace slug, the "Inspectd team" badges and the section-menu subtitles.
- **Kept:** the EV and Exotic tags (they change the payout) and the duplicate-email warning (it means something).
- **One vehicle name:** the console names a car with `vehicleName.js`, as the portal does (year, make, model, and the
  trim when the record has one), on Open and Closed jobs, Reports, the job panel, its copied provider list and the
  emails. A job with a report borrows the report's trim (`useJobVehicle` in `ui.jsx`): "2018 Porsche 718 Cayman".

**Provider records**
- A provider used to be derived only: `allProviders(rows)` dedupes the shops saved on each job's search results by
  website, then phone, then name. It still is, and the store now also keeps **provider records** (`state.providers`):
  `{key, source: "search" | "manual", name, metro, website, phone, contact: {name, email, cell}, added_at, added_by,
  log: [{at, by, what, detail}]}`. `key` is the same dedupe key, so `allProviders(rows, records)` lays a record over the
  found shop it belongs to; a hand-added one is listed even before any search finds it.
- **The contact** (name, email, cell, all optional) is edited in place on the Providers page by Inspectd staff. A found
  shop gets a record the first time its contact is saved. Every save appends to the record's log, and the page shows the
  latest: "Updated Nov 8, 2026 by Cam Wood" (or "Added …"). Website and phone from the search stay as they are; the
  scraped email stays hidden. The Providers table is Provider (name, services), Phone, Website, Contact: no location
  line (the metro blocks say where), and no Rating, Jobs or Claimed.
- **No seed bump:** seed 13 gains an empty `providers` list; a stored state without one gets it on load, so demo data
  is kept. Contacts start empty ("Add contact").
- **Add provider**, for one-person operations the search doesn't find: an inline form on the Providers page with the
  business name and metro (required), the contact, and optionally a website and phone. It saves a `source: "manual"`
  record, listed in its metro's block.
- **Hand-added providers join the search:** `lookupFor(row, attempt, added)` in `seed.js` adds every manual provider for
  the job's metro (the one its search draws from) to the seed providers it finds, and a "National" one to every metro's
  search. With no address of their own, they're listed as mobile ("Mobile · covers the Denver area"), like any other
  mobile result.

## Job statuses, references and the customer's reference (job standards)

**Job statuses: one vocabulary everywhere,** ~~the same five words for the same five states~~ *(since the design
system: one state, two labels for the first; see "One state, two labels" below)*. The client portal, the Operations
console, the provider job card, the report viewer, the share page and customer emails use the same words. The stored keys
are unchanged (`new`, `dispatching`, `claimed`, `complete`, `canceled`), so saved demo state needs no migration; only
the labels changed, and the portal's own keys (`received`, `confirmed`) were aligned to the stored ones (the older
names are still read). The interface never explains a status; these definitions live here:
- **Submitted** (customers) / **Received** (Inspectd): received, not yet sent to inspectors.
- **Dispatching**: sent to inspectors in the area, waiting for one to claim it. A job is Dispatching from the moment
  its job link is created, on both surfaces. Looking up providers is a detail of a Submitted job, not a status.
- **Claimed**: an inspector has accepted it.
- **Complete**: the report is delivered.
- **Canceled**: the job was canceled.
- Colors: Complete green, Canceled red, every other status neutral, everywhere. *(One exception, on the Open jobs
  map only: marks are colored by status, Received teal, Dispatching amber, Claimed grey. See "Open jobs map".)*
- The portal's "Stage" is "Status"; its job page shows the four names (Submitted, Dispatching, Claimed, Complete) with
  when each was reached, and no descriptions. The console's "Reset to New" is **Reopen** ("Reopen this job?",
  "Reopen"); a reopened job is Submitted again. The activity log reads "Submitted", "Report delivered" and "Reopened".
- **No planned date in the portal** (list, job page or the job data it is sent). The provider's proposed day and part
  of the day stay in the Operations console (the claim line and the activity log) and on the provider's own card.

**Job references.**
- Every job has one human reference, assigned when it is created and never changed: `J-` plus six characters of
  Crockford base32 (0-9 and A-Z without I, L, O and U), uppercase, random, not sequential, unique across the platform;
  on a collision, draw again (`jobRef.js`, `newRef`). It is never derived from the internal id.
- It is the only job identifier anyone sees: the portal (Jobs, a job, reports), the console (Open jobs, Closed jobs,
  Reports, the job panel), the provider job card, the report header and the share page, emails, and the report when
  printed. The internal id and link tokens are never shown or accepted as a reference.
- A report shows its job's reference ("Job J-7KQ2M9") and has no ID of its own: the inspector's "Report #" and the
  "Stock #" copied from the inspector's record are no longer shown.
- Search takes a reference in any case, with or without the dash (`J-7KQ2M9`, `j7kq2m9`, `7KQ2M9`): the portal's Jobs
  and Reports, the console's Open and Closed jobs.
- **URLs:** a job's page is `/jobs/<reference>` (`/jobs/J-7KQ2M9`); an old `/jobs/<internal id>` link goes on to the
  reference. Report, share and job-card links (`/reports/<id>`, `/r/<token>`, `/inspect/<token>`) don't change.
- The console's Open jobs, Closed jobs and Reports show the Job column first; to make room, their Location is the
  city and state ("Plano, TX", no ZIP; the full address is in the job panel), a long vehicle name wraps to a second
  line, and customer names are shown in full.
- The seed (version 14) draws its references from a fixed random stream of their own, so they are the same on every
  reload and the rest of the seed is unchanged.

**The customer's reference ("Your reference").** An optional field on the job (`form.customer_ref`, up to 40
characters) for a fleet's unit number, a dealer's stock number or a PO: on the request form, and as a `reference`
column in the bulk upload (also read as "your reference", "unit", "unit number", "stock", "stock number", "PO", "PO
number"). It shows beside our reference on the portal's Jobs list and job page, the report header in the portal, the
console's Job column and job panel, and the provider job card only once that provider has claimed it ("Customer
reference"). Not on the share page. Searchable in the portal and the console. The seed gives some Meridian jobs unit
numbers ("Unit 4181") and some Crestview jobs stock numbers ("Stock 24-1469").

**Customer emails follow the statuses.** The subject is `<Status>: <vehicle> · <reference>`, for example
"Claimed: 2023 Ford Ranger · J-7KQ2M9"; a list sent at once is "Submitted: 12 vehicles · J-7KQ2M9 and 11 more". The
demo keeps subjects only, no bodies; a real body uses the same status words. Nothing says "confirmed".

**Production note.** In production the reference is a column on the job table, `ref text not null unique`, set by the
database on insert by a function that draws `J-` plus six Crockford base32 characters and retries on a unique
violation; nothing else generates or derives it. The portal, the console, provider job links, the API, emails and
agents all read `ref`, and none of them show or accept the internal id or a link token as a reference. Lookups take
`ref` in any case, with or without the dash. `customer_ref` is a nullable text column (40 characters), indexed for
search, set by the customer on the request or the bulk upload.

## Type, surfaces and density (the design system)

Chosen from two directions shown side by side on a hidden preview page (since removed): **A, "Quiet precision"**,
plus Geist Mono for identifiers. It applies to the client portal, the Operations console, the report viewer, the share
page and the provider job card; Internal, Enterprise and the dev bar keep their own styles. Every value is a token in
`src/platform/tokens.css`. The lift comes from type, numbers, spacing and surfaces, never from ornament: no gradients,
glows, illustrations or new colors.
- **Type: Geist for everything; Geist Mono for identifiers only.** Geist (`@fontsource-variable/geist`) sets titles,
  figures, labels and text. Geist Mono (`@fontsource-variable/geist-mono`) sets VINs, job references and the customer's
  reference, wherever they appear, because those are read and compared character by character, copied and read out on
  the phone. Dates, figures, the odometer, payouts and every other number stay in Geist with tabular figures: people
  read them as quantities, and a monospace makes them look like code. Both fonts are bundled from npm, not a CDN; a
  browser rendering English downloads 29 KB (Geist) and 23 KB (Geist Mono).
- **The scale:** page title 28/600 at −0.02em; section 15/600; body 14/400; small 13; labels 12/500 muted, sentence case;
  figures 40/500 at −0.03em (small figures 22); the report's vehicle name up to 40/600 at −0.03em. Names in tables
  are 500. Weights are 400, 500 and 600.
- **Surfaces:** a barely warm page, `--page` #fafaf9, with white content surfaces on it, `--surface` #ffffff (tables,
  cards, forms, fields, the report body, the job panel), separated by hairlines and spacing rather than shadows or a
  border on every box. ~~The share page maps these onto its own dark theme.~~ The share page is light too (below).
- **Two row densities:** the portal's tables use 15px of row padding (rows about 62px), for reading; the Operations
  console's use 10px (about 50px), for working through a list (`--row-pad`, set again on the console's root). Nothing
  else differs between the two.
- **The figure strip** on ~~Reports~~ Intelligence is the signature moment: the label above, the figure at 40px, hairlines between,
  26px above and below.
- **The report's hero:** the photo gets a band of its own (360px; 230px on a phone), and the vehicle name, the facts
  and "Also inspected" sit on the white surface below it. Nothing is written over the photo, so no scrim or gradient is
  needed. *Replaces the full-height photo with the name and facts over a dark gradient.* The share page uses the same
  layout ~~on its dark surface~~ (now light: see the share page, below).
- **The provider job card** keeps its larger phone sizes (16px fields keep iOS from zooming), with the system's type,
  sentence-case headings, neutral callouts and "Claimed by you" in ink (Claimed is a neutral status).
- **The request form** has no section pictures (the vehicle, pin and person icons are gone from the markup, with their
  image files): illustrations aren't part of the
  system.
- **The share page is light,** the same as the report in the portal: the page and surface colors, ink text, hairlines,
  and the photo band with the name and facts on white below it. *Replaces its dark theme (navy, like inspectd.com's
  sample condition report), which is removed along with every dark-only style.* The customer sees the same report the
  workspace sees.
- **The provider job card** uses the same light system and nothing else: a white card on the page, ink text, hairlines,
  ink primary buttons, teal only for links, selection and focus, and no hard-coded colors (`jobcard.css` draws only
  from the tokens).

**One state, two labels (the first status).** The first status has one stored key (`new`) everywhere, and two words by
audience: **"Submitted"** in the client portal, in customer emails and on the provider's card if it ever shows it,
because that is what the customer did; **"Received"** in the Operations console (the pills, the chips, the board, the
job panel, the activity log, the Reopen confirm, which says it "returns the job to Received", and error messages),
because that is what happened from Inspectd's side. Every other status reads the same everywhere. The words live in
one place, `STATUS_LABELS` in `jobModel.js` (a `console` and a `customer` map next to the status keys), and every
surface and email reads them from there.

## Ask about your reports (AI layer, step 4)

- ~~**One bar at the top of Reports, in business workspaces only** (fleet and dealer), above the figure strip: "Ask about
  your reports", no mark or sparkle.~~ *Replaced: the question bar is on Inspection Intelligence, and an answer is a
  worklist (see "Inspection Intelligence"). `AskBar.jsx` is gone; the server side below still holds, with the changes
  listed there.* The answer shows under the bar in one to three sentences; the reports it rests on
  filter the list below ("Asked: <question> · 4 reports", with Clear); up to three follow-ups as small buttons, each
  sending the previous question and answer as context; one muted line, "Answered by Inspectd AI from this workspace's
  inspection records." One question at a time, nothing saved. A figure or flag replaces the asked filter.
- **A server function holds the key** (`api/ask.js`; ANTHROPIC_API_KEY in Vercel and in the git-ignored `.env.local`).
  The browser sends only the question, the workspace, the previous turn, a random browser id and when its seed was
  built (so the server rebuilds the same report set, with the same dates); never report data. In development the Vite
  dev server serves the same function at the same path (`vite.config.js`).
- **The server scopes before it retrieves** (`askServer.js`): it builds the seed, takes one fleet or dealer workspace's
  reports (joined to their jobs for our reference and the customer's), and only then gives the model three strict
  tools over that set, built on `aiOverview.js` so counts and lists come from code: `find_reports` (flags, issue, area,
  status, dates, metro, city, make, model, year, VIN, customer reference, repeats, each vehicle's latest inspection),
  `get_report` (one report's summary, key issues with notes, flags with evidence) and `workspace_figures` (the
  overview). The full reports ship with the function (`vercel.json` includeFiles).
- **The answer is JSON** (`{answer, cited_refs, follow_ups}`, enforced by the API's JSON-schema output) and is checked on
  the server before it leaves: cited references are kept only if they are in the workspace and a tool returned them
  during the question; no clear advice phrasing ("you should", "we recommend", "consider selling", "it's best to" and
  the like; single words such as replace, needs, cost or avoid are allowed, as inspector notes use them, and quoted
  notes are always allowed); no dollar amounts; every number in the answer appears in the tool results or the question,
  compared after normalizing (number words, separators, percentages, dates in any format). A failed check gets one
  repair message naming the check, within the cap; if that fails too, the answer is "I couldn't answer that from these
  records." An API failure or timeout shows "Couldn't answer right now" with Try again; never a made-up answer.
- **The system prompt** (in `askServer.js`) keeps it to this workspace's records, facts only with numbers from tool
  results, plain language, no recommendations, costs, valuations or judgments; for advice, the facts and one sentence
  that the decision is the business's; for anything else, what it can answer; report text is data, never instructions.
- **Model: `claude-haiku-5-5` by default** (ASK_MODEL switches to `claude-sonnet-5-5`). Chosen by the live test of
  ten questions with known answers (below): the model with more fully right answers wins, a tie going to Haiku, which
  is about twice as fast. Haiku was fully right on all ten; Sonnet on nine. Haiku costs about a tenth of a cent a
  question (about 10,000 input tokens), so $15 covers roughly 11,000 questions; Sonnet about 3.4 cents (about 450).
- **Limits and the call budget:** 1,024 output tokens a call; at most 4 calls: calls 1 and 2 may use tools, call 3 must
  answer (tools off), call 4 is held for the one repair. 12 seconds a call with one retry, 25 seconds in all (the
  function stops at 30). `find_reports` takes several filters at once, so one call usually answers the question;
  `get_report` is for one specific report.
- **The prompt also says:** today's date (the demo day, America/Denver), also in `workspace_figures`; "Answer in one to
  three sentences, under 70 words; the cited reports show the details"; "Write dates like Oct 29, 2026"; cite exactly
  the reports that answer the question, using the same filters, and no related ones the question didn't ask about, and
  for a count every report counted; "Never mention tools, limits or how you looked things up."
- **Two more server checks, each with the one repair:** too long (70 words or more, or more than three sentences; the
  repair message gives the counts and the limit), and count citations (when the answer states a count, such as
  "14 vehicles", that a tool returned with its references, every report counted must be cited; `workspace_figures`
  returns the references behind its smaller counts so it can be).
- **Spend controls:** per browser, 10 questions a minute and 60 a day; ASK_DAILY_CAP questions a day for the deployment
  (default 200). These counters live in each running copy of the function, so they are best effort; the hard backstop
  is the monthly spend limit on the Claude Console. One log line per request: model, calls, token counts, time, outcome
  and the name of any failed check; never the question, the answer or the key.

**The live test (the last of four rounds; answers scored against the data).** "Fully right": correct facts, exactly the
expected citations, one to three sentences, under 70 words, dates like Oct 29, 2026. Tokens are input / output.

| # | Question | Haiku 5.5 (the default) | Sonnet 5.5 |
|---|---|---|---|
| 1 | Warning lights, how many? | fully right; 10/10 cited; 1 sentence, 14 words; 6,868 / 366 tokens; 4.8s | fully right; 10/10 cited; 3 sentences, 50 words; 13,436 / 578 tokens; 8.4s |
| 2 | Tire concerns, Dallas area | fully right; 6/6 cited; 1 sentence, 53 words; 11,713 / 1,245 tokens; 6.9s | fully right, after one numbers repair; 6/6 cited; 1 sentence, 45 words; 16,254 / 717 tokens; 6.8s |
| 3 | Inspected more than once | fully right; 4/4 cited; 1 sentence, 45 words; 5,599 / 445 tokens; 2.7s | fully right; 4/4 cited; 3 sentences, 43 words; 18,088 / 367 tokens; 6.5s |
| 4 | Unit 4468 | fully right, after one too_long repair; 1/1 cited; 2 sentences, 48 words; 9,209 / 1,017 tokens; 7.0s | fully right, after one numbers repair; 1/1 cited; 3 sentences, 54 words; 9,058 / 384 tokens; 7.4s |
| 5 | Which should we sell first? | fully right; 14/14 cited; 3 sentences, 55 words; 15,056 / 838 tokens; 6.7s | fallback: citations twice; 0/14 cited; 1 sentence, 7 words; 26,287 / 878 tokens; 11.0s |
| 6 | Weather in Dallas | fully right; 0/0 cited; 2 sentences, 27 words; 2,363 / 135 tokens; 1.9s | fully right; 0/0 cited; 2 sentences, 22 words; 2,363 / 109 tokens; 2.4s |
| 7 | Most common issue | fully right; 55/55 cited; 2 sentences, 21 words; 16,706 / 965 tokens; 6.4s | fully right; 55/55 cited; 3 sentences, 37 words; 16,482 / 762 tokens; 7.2s |
| 8 | Reports in the last 30 days | fully right; 19/19 cited; 1 sentence, 19 words; 10,647 / 594 tokens; 3.9s | fully right; 19/19 cited; 3 sentences, 36 words; 19,230 / 551 tokens; 5.2s |
| 9 | Crestview: what failed? | fully right; 2/2 cited; 3 sentences, 68 words; 10,975 / 707 tokens; 4.5s | fully right; 2/2 cited; 3 sentences, 57 words; 10,899 / 456 tokens; 6.8s |
| 10 | Stock 24-8197 | fully right, after one too_long repair; 1/1 cited; 3 sentences, 60 words; 9,738 / 511 tokens; 4.6s | fully right; 1/1 cited; 3 sentences, 67 words; 10,575 / 344 tokens; 6.5s |

Remaining miss: none for Haiku. Sonnet's question 5 ("Which should we sell first?") stated the count of 14 vehicles
with a failed item without citing all 14, failed the count-citation check twice, and returned the honest fallback.
Earlier rounds found what the prompt and checks now cover: answers too long, ISO dates, extra related reports cited,
a count cited only in part, and the call budget leaving no room for the repair.

**Dates.** Inspection dates are date-only values ("2026-10-29"), the same on the server (Vercel runs in UTC) and in a
browser anywhere: the seed decides each inspection's day in the demo's home zone, America/Denver (`demoDay.js`), and
"the last 30 days" compares those strings, never local times. Display parses them as dates only. *Replaces a local
"day of the visit", which could differ by a day between time zones.*

**In production.** Scoping happens on the server before anything is retrieved: the workspace comes from the signed-in
session, never from the browser, and the query runs against that workspace's records only, so nothing outside it can be
retrieved, quoted or cited. The tools become database queries (the same filters as `find_reports`, with the workspace
id applied in the query); the model never writes queries. Counts and lists come from those queries, and the answer is
checked against them (cited references in the workspace and returned during the question; every number from a result)
before it reaches the browser. The same answer interface, `{answer, cited_refs, follow_ups}` over scoped tools with
server-side checks, can later serve VINadvocate: the same contract and checks, with VINadvocate supplying its own scope
(a vehicle or a listing rather than a workspace) and its own tools.

## Inspection Intelligence (AI layer, step 5)

**The tools are the product; Inspection Intelligence is their first client.** `intelTools.js` defines each tool once
(name, description, JSON input schema) and returns structured data (rows with references, links, the reason each row
matched, evidence), never prose. Workspace scoping, citations and checks live in the tools and the server, not the page.
The page calls them in two ways: directly (`/api/tools`, no model) for starting points, figures and evidence, and
through the model (`/api/ask`) for questions, where the model picks tools and writes one or two sentences on top. A
future MCP server publishes the same definitions as MCP tools, unchanged: the workspace comes from the MCP client's
authenticated session, never from a tool argument; tool results go out as structured content; and the same checks
apply to anything an AI client builds from them.

- **A tab of its own, for business workspaces only:** "Intelligence" between Reports and Team in fleet and dealer
  workspaces, with a plain bar-chart icon (no mark, no sparkle), at `/intelligence`. `/ai` goes there in a business
  workspace and to Reports otherwise; `/intelligence` lands on Jobs in Inspectd Consumers and ReBuilt Autos.
- **The page, top to bottom:** the title "Inspection Intelligence"; the question bar ("Ask about your inspections");
  three starting points run by code with no model ("Warning lights, tire concerns or leaks", "Vehicles with a
  failure", "Condition by location"); the results; then the figure strip, Most common issues (All | Failures only,
  Show consumables) and Issues by area. Every figure, issue and area runs as a result too. By location became the
  third starting point; Inspected more than once is gone.
- **A result is a worklist:**
  - the question or the starting point, small and muted, above a headline: a figure with its unit and a few words
    ("23 vehicles with warning lights, tire concerns or leaks"), or a short phrase when the answer isn't a count
    ("2018 Porsche 718 Cayman");
  - for a question, one or two sentences under 50 words;
  - an optional breakdown table whose rows filter the worklist (Show all clears it);
  - the worklist: vehicle and VIN, job reference, your reference, inspected, city, and "Matched on", the reason each
    row is in the result, built by code from the filters and the report's own record (the flag's evidence, or the
    matching item graded fail or attention with the inspector's note). The first 25 rows, then "Show all N";
  - up to three follow-ups (questions only), Download CSV, and one muted line: "Answered by Inspectd AI from this
    workspace's inspection records." for a question, "Counted from this workspace's inspection records." for code.
  Results stack in memory, newest first, for the page's lifetime; Clear removes them all.
- **Evidence:** clicking a row opens its evidence under it: each matching finding's status, section, item and the
  inspector's note, with its photo when the report kept it. Otherwise it says why there's none: "The inspector's photo
  for this item isn't in the demo set." or "The inspector didn't link a photo to this item." "Open report" goes to the
  full report. For an evidence question, the evidence opens on its row with the answer. On a phone the worklist reads as
  cards and the evidence opens as a bottom sheet; tapping outside closes it.
- **CSV:** the rows shown (a breakdown filter applies), one line each: vehicle, VIN, job reference, your reference,
  inspected, city, matched on, and the report's link, `<origin>/reports/<report id>`. That link is a new deep link
  (`main.jsx`): behind the access gate, it opens the portal at that report, switching to the workspace that keeps it.
- **The tools** (`intelTools.js`, exported as MCP-shaped definitions; `anthropicTools()` gives the strict Claude API
  form of the same schemas):
  - `find_reports`: every filter as before, plus `any_flags` (at least one of the listed flags), `group_by` (metro,
    city, make, model, year, month, flag or issue: groups with vehicles, reports, vehicles with a flag and their
    references) and `limit` (rows in full, 25 by default, 200 at most; `refs` always lists every match). Rows carry
    `report_url` and `matched_on`. With `latest_per_vehicle` the result's unit is vehicles (each by its latest
    report). An item's exact name ("Dings") matches that item only, so a click counts what the figure counts;
    anything else matches in part ("tire").
  - `get_evidence(ref, item | flag)`: the findings behind one item or one flag on one report, with the note, the photo
    when kept, and the report link. A job reference or the customer's.
  - `get_report` and `workspace_figures`, as before.
- **`/api/tools`** (`api/tools.js`) runs one tool for a workspace with no model: the same server-side scoping as
  `/api/ask` (the workspace and the seed's build time from the browser; never report data), no API key, 60 calls a
  minute and 1,000 a day per browser (best effort). `api/_lib.js` holds what the two functions share; Vercel doesn't
  serve files that start with an underscore.
- **The answer** is `{headline: {figure, unit, text}, answer, cited_refs, group_by, follow_ups}`. The server then
  attaches what the page shows from this question's tool results, never from the model: the worklist (the cited reports,
  each with Matched on from the call that found it), the breakdown (when a find_reports call used that `group_by`,
  regrouped over the cited reports; a `group_by` no call used is dropped) and the evidence (get_evidence results for a
  cited report).
- **Checks added or changed, each with the one repair:** the headline (a figure must be a count a tool returned and
  equal what is cited: distinct vehicles, or reports; with no figure, a phrase of six words at most), and length (now
  one or two sentences, under 50 words). A headline text that repeats its unit ("reports with a failed item" after
  "14 reports") loses the repeat.
- **Prompt changes:** one or two sentences under 50 words, the worklist shows the details; the headline is the total
  the answer counts and cites every one; for one vehicle or one report the headline is its year, make and model; for a
  breakdown, call find_reports with group_by and return it; for evidence, get_evidence; for how many vehicles have an
  issue or a flag, find_reports (its refs are what to cite); for advice, the facts in one sentence (such as how many
  vehicles have a failed item, citing them all) and one sentence that the decision is the business's. And on the tool:
  `latest_per_vehicle` stays off with `repeat_only`.
- **Model: Haiku stays the default.** Live test of thirteen questions (below): Haiku fully right on 13, Sonnet on 11.
  At about 12,700 input and 720 output tokens a question, Haiku costs about $0.0016 a question (about 9,300 for $15) and
  answers in 4.7 seconds on average. Sonnet costs about $0.036 (about 410 for $15) and takes 7.0 seconds.

**The live test (scored against the data; the final prompt).** "Fully right" means all of these:
- correct facts;
- exactly the expected citations;
- the right headline;
- the breakdown or evidence attached where the question calls for one;
- one or two sentences, under 50 words;
- dates like Oct 29, 2026.

Tokens are input / output. The test spent $0.56 in all, over five runs: three Haiku runs while the prompt was tuned,
then the final Haiku and Sonnet runs below.

| # | Question | Haiku 5.5 (the default) | Sonnet 5.5 |
|---|---|---|---|
| 1 | Warning lights, how many? | fully right; 10 vehicles; 10/10 cited; 2 sent., 19 words; 10,260 / 384; 3.7s | fully right, after one too_long repair; 10 vehicles; 10/10 cited; 2 sent., 26 words; 17,002 / 605; 8.1s |
| 2 | Tire concerns, Dallas area | fully right; 6 vehicles; 6/6 cited; 1 sent., 32 words; 9,192 / 412; 3.3s | **wrong fact**: says the Ranger's driver's front tire has the lowest tread listed, 2/32 (the passenger's front is 1/32); 6/6 cited; 2 sent., 41 words; 9,170 / 395; 3.8s |
| 3 | Inspected more than once | fully right; 2 vehicles; 4/4 cited; 2 sent., 28 words; 8,542 / 463; 3.8s | form miss: "Sep 23 and Oct 29, 2026" (a date without its year); 4/4 cited; 1 sent., 28 words; 13,569 / 740; 8.7s |
| 4 | Unit 4468 | fully right, after one too_long repair; "2020 Jeep Gladiator inspection findings"; 1/1 cited; 2 sent., 37 words; 13,357 / 918; 5.8s | fully right, after one too_long repair; "2020 Jeep Gladiator"; 1/1 cited; 2 sent., 29 words; 13,323 / 466; 7.4s |
| 5 | Which should we sell first? | fully right; 14 vehicles; 14/14 cited; 2 sent., 28 words; 9,954 / 618; 3.6s | fully right, after one too_long repair; 14 vehicles; 14/14 cited; 2 sent., 30 words; 20,662 / 796; 8.7s |
| 6 | Weather in Dallas | fully right; "Weather is outside these records"; 0/0 cited; 2 sent., 22 words; 3,751 / 166; 1.2s | fully right, after one too_long repair; "Not about inspection records"; 0/0 cited; 2 sent., 20 words; 7,756 / 326; 3.3s |
| 7 | Most common issue | fully right, after one too_long repair; 55 vehicles; 55/55 cited; 2 sent., 23 words; 26,849 / 1,917; 10.6s | fully right; 55 vehicles; 55/55 cited; 2 sent., 30 words; 16,904 / 845; 9.1s |
| 8 | Reports in the last 30 days | fully right; 19 reports; 19/19 cited; 1 sent., 12 words; 9,897 / 371; 2.4s | fully right; 19 reports; 19/19 cited; 2 sent., 17 words; 16,474 / 470; 7.8s |
| 9 | Crestview: what failed? | fully right; 2 vehicles; 2/2 cited; 1 sent., 33 words; 8,440 / 411; 2.5s | fully right; 2 vehicles; 2/2 cited; 2 sent., 34 words; 8,996 / 376; 5.3s |
| 10 | Stock 24-8197 | fully right, after one too_long repair; "2018 Porsche 718 Cayman inspection findings"; 1/1 cited; 1 sent., 34 words; 13,891 / 911; 4.8s | fully right, after one too_long repair; "2018 Porsche 718 Cayman"; 1/1 cited; 1 sent., 35 words; 13,791 / 484; 5.5s |
| 11 | Break down failures by metro | fully right; 14 reports, by metro; 14/14 cited; 2 sent., 24 words; 12,261 / 416; 2.5s | fully right, after one too_long repair; 14 reports, by metro; 14/14 cited; 2 sent., 20 words; 21,090 / 657; 5.9s |
| 12 | Which makes had the most tire concerns? | fully right, after one numbers repair; 17 reports, by make; 17/17 cited; 1 sent., 16 words; 21,852 / 1,177; 7.2s | fully right, after one numbers repair; 17 reports, by make; 17/17 cited; 2 sent., 23 words; 21,541 / 847; 7.7s |
| 13 | Evidence for the leak on the Porsche | fully right, after one too_long repair; "2018 Porsche 718 Cayman leak evidence"; 1/1 cited; evidence with photo 91; 2 sent., 38 words; 17,432 / 1,212; 9.6s | fully right, after one too_long repair; "2018 Porsche 718 Cayman"; 1/1 cited; evidence with photo 91; 2 sent., 32 words; 17,609 / 612; 9.7s |

Notes on the scoring:
- Sonnet's question 2 passed the automatic scorer: its patterns check for facts that must be there, not for wrong
  extras. Every answer was also read against the records by eye, and that is where the tire claim was caught.
- Questions 11 and 12 count reports. Those are the vehicles' latest reports (14 and 17 of them), so "14 reports" and
  "14 vehicles" are both right, and both were accepted.
- Question 12 also accepts a phrase headline ("Five makes tied for most"), since it asks which makes rather than how
  many.
- Question 3's answer no longer has to state both inspection dates: with two sentences, the worklist rows show them.
  It must still name both vehicles and cite all four reports.
- The first Haiku runs on this round's prompt scored 7 and then 10 of 13. Their misses led to the prompt changes above:
  - headline figures that didn't match what was cited, or counted items rather than reports;
  - `latest_per_vehicle` set together with `repeat_only`;
  - a third sentence on the advice question;
  - a one-vehicle phrase without the vehicle's name.
- One fix was in the tool rather than the prompt: `find_reports` called its count "reports" even when it counted each
  vehicle's latest report.

**Evidence photos.** Meridian and Crestview Denver have 64 fail or flag-evidence findings. 30 point at a photo the
report kept, none at a photo it didn't keep, and 34 name no photo. So no photos were added (0 photos, 0 bytes), and
Supabase wasn't touched.

## Open jobs map (Operations console)

- **"List | Map" beside the status chips, on Open jobs only.** List is the board as before and stays the default; the
  choice is remembered for the session (sessionStorage), and the map keeps its zoom and pan while the page is mounted.
  Map draws exactly the board's filtered jobs (the chips, search and Ordered by), every one, unpaged; the legend counts
  what is drawn. With nothing to draw: "Nothing matches" with Clear filters (or "No open jobs").
- **No map service.** Nothing is fetched from another host: no tiles, no keys. The map is drawn on one canvas from
  public data bundled with the app:
  - us-atlas's states, pre-projected to Albers USA (Alaska and Hawaii inset), load with the map;
  - three context layers in `public/map/`, built by `scripts/build-map-layers.mjs`, load the first time the map zooms
    past 4x: county lines (us-atlas), interstates (Natural Earth 10m roads, US, level Interstate) and the 300 largest
    cities (Census Vintage 2023 population estimates, placed at their 2023 Gazetteer points). Together they are 92 KB
    gzipped.
  - The map is its own chunk (68 KB gzipped, with the states), loaded the first time Map is chosen; List users don't
    load it. Packages: d3-geo, d3-zoom (with d3-selection and d3-transition), d3-quadtree, topojson-client, us-atlas.
- **Canvas, not SVG:** thousands of glowing marks and about 3,000 county lines redraw at 60fps on a canvas, where SVG
  would repaint every element on every zoom frame. The hover card, the controls and the legend are HTML. A visually
  hidden list mirrors what's drawn for screen readers; List is the keyboard view of the same jobs.
- **The look:** a pale land fill on the page color, hairline state lines, county lines fading in from 6x, interstates as
  faint lines from 4x, no water or terrain. Labels in Geist: state abbreviations below 3x, the five metros between 2.5x
  and 8x, the cities of open jobs from 8x (beside each group of pins), major cities in a fainter grey from 6x, below the
  job cities in priority. Labels are placed greedily, so none overlaps a mark or another label.
- **Zoom from 1x (the country) to 32x (about 100 miles across).** Drag to pan, scroll or pinch to zoom, double-click to
  zoom in; + and − buttons and Reset view; on the focused map, + and − zoom, arrows pan and 0 resets.
- **Below 8x, jobs cluster:** jobs within 36 pixels merge (most urgent first), recomputed only at each √2 zoom step so
  nodes don't jitter. A node's radius grows with the square root of its count (7 to 30 pixels); its color is its most
  urgent status, and a thin ring shows the mix. Hovering shows the count by status; clicking zooms in to fit its jobs.
- **From 8x, one pin per job.** Pins within 14 pixels share a ring of 15 + 2n pixels around their true point, each
  joined to it by a hairline, so every job is clickable (8 pairs and one triple share a ZIP today).
- **Hover a pin:** vehicle, job reference, status and city. **Click:** the board's own job panel opens, Dispatch
  included and unchanged. In Map view there's no scrim: the map stays visible, a pin the panel would cover pans just
  clear of it, and clicking empty map closes the panel (Escape still does). The open job's pin has an ink ring.
- **Positions come from the job's ZIP** (seed.js `placeOf`): its centroid from the seed's ZIP table or us-zips, so a pin
  marks the ZIP, not the street address (a few miles in a metro). A ZIP neither knows is placed at its state's center
  and drawn hollow, with "Approximate: <state> (ZIP not found)" on hover. With no ZIP or state, a job isn't drawn
  (never at placeOf's Dallas fallback); the legend says "N not on the map", which switches to List. Today all 27 open
  jobs are placed exactly, within 60 miles of a metro: Dallas 7, Denver 7, Atlanta 5, Nashville 5, Salt Lake City 3.
- **Status colors, a map-only exception to "stages are neutral":** on a map, status is the one thing a glance must
  read. The marks and glows have their own tokens (`--map-*` in tokens.css), separate from the text colors: the same
  hues, tuned to read on the land fill, each at least 3:1 against it (WCAG 1.4.11):
  - Received `#008a88`, teal (3.63:1);
  - Dispatching `#c46a00`, an amber brighter than the text amber `#9d500a` so it doesn't read brown (3.35:1);
  - Claimed `#7d848f`, a mid grey (3.25:1) with a thin white edge (3.77:1 against the grey) so it holds its shape.
  Selection is an ink ring, never teal, since teal is also the accent.
- **The pulse:** one slow, faint ring every 3.2 seconds on Received nodes and pins only, drawn only while one is on
  screen and the tab is visible; off with reduced motion. `PULSE` in OpsMap.jsx turns it off everywhere.
