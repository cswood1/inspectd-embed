/*
 * The client portal's pages and where the old ones land (Portal.jsx). Pure, so it can be checked on its own.
 * Fewer pages than Kavin's (docs/platform/decisions.md, "Simplicity"): Overview, Vehicles, Invoices and the Inspectd
 * AI page were folded into Jobs, Reports and Settings, and their paths redirect.
 */

import { normRef } from "./jobRef.js";

// path -> sidebar item and page; the same table as nav.js ROUTES
export const ROUTES = [
  [/^\/reports$/, "reports", "reports"],
  [/^\/reports\/([0-9]{8}-[0-9]{6}-[a-f0-9]{6})$/, "reports", "report"],
  [/^\/jobs$/, "jobs", "jobs"],
  [/^\/jobs\/new$/, "jobs", "new"],
  [/^\/jobs\/bulk$/, "jobs", "bulk"],
  [/^\/jobs\/(J-[0-9A-HJKMNP-TV-Z]{6})$/, "jobs", "job"],   // a job's URL is its reference (jobRef.js)
  [/^\/intelligence$/, "intelligence", "intelligence"],   // business workspaces only (resolve sends others to their landing page)
  [/^\/team$/, "team", "team"],
  [/^\/settings$/, "settings", "settings"],
];
// a business (fleet or dealer) works from its reports; a consumer workspace and a marketplace's shoppers from their jobs
export const isBusiness = type => type === "fleet" || type === "dealer";
export const landing = type => isBusiness(type) ? "/reports" : "/jobs";
/**
 * Where a path really goes: the landing page for "/" (and anything unknown), and the pages folded into others. A job
 * goes by its reference: one typed in another case or without the dash is tidied, and an old link by internal id
 * (/jobs/<12 hex>) is sent on to the reference, which `refOf(id)` looks up ("" when the job isn't the account's).
 */
export function resolve(path, type, refOf = () => ""){
  const bare = path.split("#")[0];
  const job = bare.match(/^\/jobs\/([^/]+)$/);
  if (job && !["new", "bulk"].includes(job[1])) {
    const ref = normRef(job[1]) || (/^[0-9a-f]{12}$/.test(job[1]) ? refOf(job[1]) : "");
    return ref ? `/jobs/${ref}` : "/jobs";
  }
  // Inspection Intelligence is a business workspace's (fleet, dealer); the old Inspectd AI page goes there too
  if (bare === "/intelligence") return isBusiness(type) ? path : landing(type);
  if (bare === "/ai") return isBusiness(type) ? "/intelligence" : "/reports";
  if (bare === "/vehicles") return "/reports";
  if (bare === "/invoices") return "/settings#billing";
  return ROUTES.some(([re]) => re.test(bare)) ? path : landing(type);
}
