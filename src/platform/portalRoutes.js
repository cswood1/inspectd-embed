/*
 * The client portal's pages and where the old ones land (Portal.jsx). Pure, so it can be checked on its own.
 * Fewer pages than Kavin's (docs/platform/decisions.md, "Simplicity"): Overview, Vehicles, Invoices and the Inspectd
 * AI page were folded into Jobs, Reports and Settings, and their paths redirect.
 */

// path -> sidebar item and page; the same table as nav.js ROUTES
export const ROUTES = [
  [/^\/reports$/, "reports", "reports"],
  [/^\/reports\/([0-9]{8}-[0-9]{6}-[a-f0-9]{6})$/, "reports", "report"],
  [/^\/jobs$/, "jobs", "jobs"],
  [/^\/jobs\/new$/, "jobs", "new"],
  [/^\/jobs\/bulk$/, "jobs", "bulk"],
  [/^\/jobs\/([0-9a-f]{12})$/, "jobs", "job"],
  [/^\/team$/, "team", "team"],
  [/^\/settings$/, "settings", "settings"],
];
// a business (fleet or dealer) works from its reports; a consumer workspace and a marketplace's shoppers from their jobs
export const isBusiness = type => type === "fleet" || type === "dealer";
export const landing = type => isBusiness(type) ? "/reports" : "/jobs";
/** Where a path really goes: the landing page for "/" (and anything unknown), and the pages folded into others. */
export function resolve(path, type){
  const bare = path.split("#")[0];
  if (bare === "/ai" || bare === "/vehicles") return "/reports";
  if (bare === "/invoices") return "/settings#billing";
  return ROUTES.some(([re]) => re.test(bare)) ? path : landing(type);
}
