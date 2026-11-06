# Platform iteration notes

Behaviours in Kavin's console that the clone in `src/platform/` mirrors for fidelity but that we
intend to revisit, and (under "Fixed after the clone") the ones since changed. Each entry says what
happens and why it matters. Later steps add to this list.

## Deliberate deviations from Kavin's console

Places where the clone differs from Kavin's console on purpose. Fidelity comparisons should expect
these differences.

- **No "Client portal" link in the console sidebar.** Kavin's sidebar ends with a link into the client
  portal. It is left out because the dev bar's Platform tabs already switch between Operations and
  Client portal, and in production the ops console should not link into a customer's portal. The
  report row's "Open" button opens that report in the Client portal tab (switching the portal to the
  workspace the report is kept in, Inspectd's own for a walk-in), and the Reports "report dashboard"
  link opens the portal's Reports list, because the report viewer only exists there.
- **No "Operations console" link in the client portal sidebar.** Kavin's portal shows Inspectd team
  accounts a link to the console. It is left out: the dev bar's Platform tabs switch between the two
  surfaces, and a customer's portal should never link to the ops console.

- **"Download PDF" shows a notice instead of a file.** The inspectors' original PDFs stay out of the
  repo, so the viewer's Download PDF button says the original isn't available in this demo and points
  to Print, which saves the report as a PDF.
- **The inspector's page has Claim and Decline controls.** Kavin's `/inspect/<token>` page only shows
  the job and an upload; claiming and declining exist as routes of his request service
  (`requests/booking.py`, `POST /inspect/{token}/claim` and `/reject`) with no controls on the page.
  Here an offered link shows the terms with a checkbox, Claim this job and Decline (with an optional
  reason), wired to the same rules: the terms must be accepted, a claim on a received or dispatching job
  confirms it and emails the business, a declined link can't claim and a claimed one can't decline.
  The console's claim pill follows.
- **The inspector's page can't upload.** Its drop zone and Choose PDF show a short "uploads aren't
  available in this demo" notice. The ten reports in the demo were converted ahead of time
  (`tools/report-conversion/`).
- **Report photos are WebP at quality 55, not the PDFs' originals.** Each photo is 1024px on its long
  side with a 360px thumbnail. Quality 60 came to 62.4 MB for the ten reports, over the 60 MB budget;
  55 comes to 59.3 MB.
- **Links the demo hands out open inside the demo.** The inspector's job link (`/inspect/<token>`) is
  built on the page's own origin rather than `https://portal.inspectd.com`, so a copied link works on
  localhost, a preview or staging alike; the token format is unchanged. Invitation links stay on
  `portal.inspectd.com`, since the demo has no invite page. The customer's report link (`/r/<token>`)
  is not shown or copied anywhere in the demo (Kavin sends it only in the "report ready" email); the page
  itself opens on any origin.

## Job detail (step 2)

- **"Change" on a job link is never saved.** It clears the link in the browser only, so the server
  still holds the old link and a refresh brings it back. The team can believe a shop's link is gone
  when that shop can still use it.
- **Booking a complete job moves it back to confirmed.** The booking route always sets the status to
  confirmed and sends the client an "Inspection confirmed" email, even when the report is already in.
  Editing a finished job's booking reopens it and tells the client something misleading.

## Providers, Customers, Reports, Settings (step 3)

- **An emailed invitation never shows its link.** With email on, inviting someone only toasts
  "Invitation emailed to …"; the copyable link appears only when the email fails. If the invitee
  never gets the email, the team has no link to send by hand and has to revoke and re-invite.
- **Inviting someone onto the Inspectd team also makes them an admin of the inviter's own workspace.**
  Team invitations have to hang on a workspace, so the inviter's first one is used. The new team
  member then shows up in that workspace's member list, which reads as an unrelated grant.
- **A name changed in Settings doesn't reach the sidebar until a reload.** The user tile is drawn
  from the account as it was when the page loaded, so for the rest of the visit the sidebar and
  Settings disagree about your name.
- **Settings fetches everything again on every visit.** The workspace picker, member table and team
  list pulse as skeletons each time the section opens, even seconds after the last visit, so moving
  in and out of Settings during a demo flickers.

## Client portal: shell and job pages (step 4)

- **Switching workspace reloads the whole page.** The switcher saves the choice and reloads, so the
  sidebar and page go back to skeletons, and the "Switched workspace" notice disappears with the reload
  before it can be read.
- **The Scheduled column runs free text through a date parser.** The booking's time is whatever the team
  typed ("Thu Nov 6, 9:00 AM"); the column parses it as a date, which works for that shape by luck (the
  browser assumes a year and the column hides it) and shows the raw text for anything else.

## Client portal: reports, vehicles, team, settings (step 5)

- **Deleting a report leaves its job pointing at it.** Delete removes the report from the store, but
  the request service is never told, so the job's Report link and the Jobs table's "Open" still lead to
  it and open "Report not found".
- **Saving in Settings reloads the page.** Renaming the workspace or yourself reloads the portal 600 ms
  later, so the sidebar and page go back to skeletons and the "saved" notice vanishes with the reload.

## Fixed after the clone

Entries that were mirrored from Kavin's apps and have since been changed on purpose, each with a line
saying what changed.

- **The report's section index reloads the report instead of jumping to the section.** The index links
  are `href="#section"` anchors, and the portal's router takes every same-origin link click first: it
  routes to `/reports/<id>#<section>`, which mounts the viewer again at the top with the section
  closed. Only the share page (`/r/<token>`), which has no router, jumps. The fix is for the router to
  ignore links whose path is the current one.
  *Fixed:* the router treats a link that only changes the `#hash` as the same page, so the index opens
  and scrolls to the section in place (the hash is kept), in the portal as on the share page.
- **Delete, cancel-and-refund and new-link use the browser's native `confirm()` and `prompt()`.** They
  block the whole page, can't be styled, and the refund reason has to be typed into a bare system
  dialog. They are the console's only dialogs outside its design system.
  *Fixed:* all seven (delete, cancel and refund with its reason, Change, New link, workspace rename,
  remove member, team access) are in-page dialogs in the portal's dialog style, scoped to the console,
  with the same wording and choices; Enter confirms, Escape and a click outside cancel, focus returns.
- **A job opens scrolled to wherever the previous job was left.** The panel reuses one scrolling body
  and never resets it, so after reading one job's call sheet, the next job opens partway down instead
  of at its header. It is easy to miss the canceled callout or the status bar at the top.
  *Fixed:* opening a different job starts the panel at its top; reopening the same job keeps its place.
- **The job page's facts and cards are unstyled.** The page builds its fact list and its Inspection,
  Report and notes cards from `.facts`, `.kv` and `.none`, and no stylesheet in the portal defines them,
  so they render as plain stacked text under the stage cards. It is the one page that looks unfinished.
  *Fixed:* styled on the job page only (Settings keeps Kavin's `.kv`): a facts grid like the console's
  job panel, and cards like the Overview cards.
- **A cancel reason never shows.** The job page looks for `cancel_reason`, but the server returns the
  reason as `canceled.reason`, so the reason a customer types when canceling is saved and never shown
  back to them.
  *Fixed:* the Canceled card reads `canceled.reason`.
- **The Jobs badge counts canceled jobs as open.** The sidebar counts every job that is not complete,
  so canceled requests keep the number up after there is nothing left to do.
  *Fixed:* the badge counts received, dispatching and confirmed jobs only.
- **The Vehicles rows are unstyled.** Each vehicle is a `<details class="secgroup vgroup">`, and no
  stylesheet styles `.secgroup` or `.vgroup`, so the rows render as plain disclosure lines with the parts
  of the header run together.
  *Fixed:* each vehicle is a bordered row whose header lays out in one line (vehicle and VIN, counts,
  issues, last activity) and whose body lists its jobs, then its reports.
- **Two inspectors' notes show a literal `&rsquo;`.** The Malibu and Acadia PDFs print an HTML entity
  in the inspector's text, and the converter kept it as printed.
  *Fixed:* the converter decodes HTML entities in extracted text (`lemonsquad.py`); the two reports were
  converted again, and only those four strings changed.

Kavin's report extraction (`extraction_service`), run on the ten Lemon Squad PDFs by
`tools/report-conversion/`, has two flaws the conversion works around rather than mirrors, since they
change what the report says:

- **The odometer can be a repair-history mileage.** The heuristic pass takes the first "N miles" in
  the text, and the merge keeps it over the model's reading. On the GMC Acadia that was 103,797 from a
  service record, not the 103,855 the Vehicle Information table prints. The conversion uses the table's.
- **Photos drawn on two pages are dropped.** The extractor treats any image that appears on two pages
  as a header or footer logo. That also drops a cover photo repeated in the gallery (the Charger, the
  Corsair) and photos split across a page break (five on the Acadia). The conversion keeps every image
  at least 48px on each side and no wider than 3:1, with Kavin's caption where he has one.
