# Platform iteration notes

Behaviours in Kavin's console that the clone in `src/platform/` mirrors for fidelity but that we
intend to revisit. Each entry says what happens and why it matters. Later steps add to this list.

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
