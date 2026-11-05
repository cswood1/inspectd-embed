# Platform iteration notes

Behaviours in Kavin's console that the clone in `src/platform/` mirrors for fidelity but that we
intend to revisit. Each entry says what happens and why it matters. Later steps add to this list.

## Deliberate deviations from Kavin's console

Places where the clone differs from Kavin's console on purpose. Fidelity comparisons should expect
these differences.

- **No "Client portal" link in the console sidebar.** Kavin's sidebar ends with a link into the client
  portal. It is left out because the dev bar's Platform tabs already switch between Operations and
  Client portal, and in production the ops console should not link into a customer's portal. The
  report row's "Open" button and the Reports "report dashboard" link still switch to the Client
  portal tab for now, because the report viewer only exists there.

## Job detail (step 2)

- **"Change" on a job link is never saved.** It clears the link in the browser only, so the server
  still holds the old link and a refresh brings it back. The team can believe a shop's link is gone
  when that shop can still use it.
- **Booking a complete job moves it back to confirmed.** The booking route always sets the status to
  confirmed and sends the client an "Inspection confirmed" email, even when the report is already in.
  Editing a finished job's booking reopens it and tells the client something misleading.
- **Delete, cancel-and-refund and new-link use the browser's native `confirm()` and `prompt()`.** They
  block the whole page, can't be styled, and the refund reason has to be typed into a bare system
  dialog. They are the console's only dialogs outside its design system.
- **A job opens scrolled to wherever the previous job was left.** The panel reuses one scrolling body
  and never resets it, so after reading one job's call sheet, the next job opens partway down instead
  of at its header. It is easy to miss the canceled callout or the status bar at the top.

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
