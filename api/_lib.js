/*
 * What api/ask.js and api/tools.js share (a leading underscore keeps Vercel from serving this file as a function):
 * reading the request, the workspace from the browser's seed, reading report records, and best-effort limits per
 * running copy (the Claude Console spend limit is the backstop for the model).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { workspaceFor } from "../src/platform/intelTools.js";

const REPORT_ID = /^\d{8}-\d{6}-[a-f0-9]{6}$/;
export const loadDoc = id => {
  if (!REPORT_ID.test(id)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "portal", "reports", id, "report.json"), "utf8")); }
  catch { return null; }
};
export const send = (res, status, body) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.setHeader("cache-control", "no-store"); res.end(JSON.stringify(body)); };
export async function bodyOf(req){
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 16e3) throw new Error("too large"); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
export const str = (v, max) => typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null;
export const log = line => console.log(JSON.stringify({at: new Date().toISOString(), ...line}));

/** The workspace a request names, built from the browser's seed (when it was built: within the last year, not ahead). */
export function workspaceOf(b, now){
  const workspace = str(b?.workspace, 40), seededAt = Date.parse(b?.seeded_at || "");
  if (!workspace) return null;
  const seed = Number.isFinite(seededAt) && seededAt <= now + 60e3 && now - seededAt < 366 * 864e5 ? seededAt : now;
  return workspaceFor(workspace, {seededAt: seed, now, loadDoc});
}

/** A per-browser limiter: `perMinute` and `perDay` for one key, and an optional cap a day for the deployment. */
export function limiter({ perMinute, perDay, dailyCap = () => Infinity }){
  const hits = new Map(), daily = {day: "", n: 0};
  return (req, client, now) => {
    const day = new Date(now).toISOString().slice(0, 10);
    if (daily.day !== day) { daily.day = day; daily.n = 0; hits.clear(); }
    if (daily.n >= dailyCap()) return "paused";
    const ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
    const key = crypto.createHash("sha256").update(`${client}|${ip}`).digest("hex").slice(0, 16);
    const h = hits.get(key) || {minute: [], day: 0};
    h.minute = h.minute.filter(t => now - t < 60e3);
    if (h.minute.length >= perMinute || h.day >= perDay) return "rate_limited";
    h.minute.push(now); h.day++; hits.set(key, h); daily.n++;
    return null;
  };
}
