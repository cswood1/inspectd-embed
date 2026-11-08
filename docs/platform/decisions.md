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
  no gradient. The overview's figures and flags sit at the top of Reports; a report's AI summary is titled "Summary" with
  one quiet line saying Inspectd AI wrote it from the record.
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
  the console, with Kavin's names mapped onto them, so the design pass changes them in one place. The customer's share page keeps its own dark theme.
- **The type scale:** page title 24/600; section title 15/600; body and table text 14/400; labels (field names, column
  heads) 12/500 muted, sentence case; secondary text 12.5/400 muted; figures 28/600 (the strip) and 20/600 (small),
  tabular; the report's vehicle title 36/700, the only 700. Weights are 400, 500 and 600.

**What polish round 1 changed in the portal**
- **Pages:** Jobs, Reports, Team, Settings, and the New inspection request button. No Overview (its request block,
  explainer cards and recent reports are all covered by the button, Jobs and Reports), no Vehicles, no Invoices (Billing
  is a section of Settings), no Inspectd AI page.
- **Routing:** `/` lands on Reports in fleet and dealer workspaces and on Jobs in Inspectd Consumers and ReBuilt Autos;
  `/ai` and `/vehicles` redirect to Reports; `/invoices` to `/settings#billing`; an unknown path to the landing page.
- **Reports:** in fleet and dealer workspaces, the figure strip (Vehicles, Reports, Last 30 days, Flagged, With a
  failure) and the flag filters with the surface-rust line; any of them filters the list below, with a visible label
  and Clear. "List | Breakdown" (List by default): Breakdown holds Most common issues, Issues by area, By location and
  Inspected more than once, and anything clicked there switches back to List, filtered. One search field (VIN, make,
  model). The list: vehicle and VIN, city, inspected, findings, and (business) flags as dots. Consumer and marketplace
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

**Job statuses: one vocabulary everywhere.** The client portal, the Operations console, the provider job card, the
report viewer, the share page and customer emails use the same five words for the same five states. The stored keys
are unchanged (`new`, `dispatching`, `claimed`, `complete`, `canceled`), so saved demo state needs no migration; only
the labels changed, and the portal's own keys (`received`, `confirmed`) were aligned to the stored ones (the older
names are still read). The interface never explains a status; these definitions live here:
- **Submitted**: received, not yet sent to inspectors.
- **Dispatching**: sent to inspectors in the area, waiting for one to claim it. A job is Dispatching from the moment
  its job link is created, on both surfaces. Looking up providers is a detail of a Submitted job, not a status.
- **Claimed**: an inspector has accepted it.
- **Complete**: the report is delivered.
- **Canceled**: the job was canceled.
- Colors: Complete green, Canceled red, every other status neutral, everywhere.
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
