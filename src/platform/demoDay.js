/*
 * Calendar dates in the demo's one time zone. An inspection date is a date-only value ("2026-10-29"), the same on the
 * server (Vercel runs in UTC) and in a browser anywhere: the seed decides each day in America/Denver, the demo's home
 * zone, and comparisons ("the last 30 days") compare these strings, never local times. Display parses them as dates
 * only (portalUi fmtDate). docs/platform/decisions.md, "Dates".
 */
export const DEMO_ZONE = "America/Denver";
const ymd = new Intl.DateTimeFormat("en-CA", {timeZone: DEMO_ZONE, year: "numeric", month: "2-digit", day: "2-digit"});
/** The demo's calendar date (YYYY-MM-DD) at an instant. */
export const demoDay = ms => ymd.format(new Date(ms));
/** A date-only value moved by whole days, with no time zone involved. */
export const addDays = (day, n) => { const [y, m, d] = day.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
