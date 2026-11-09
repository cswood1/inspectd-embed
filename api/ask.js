/*
 * POST /api/ask: "Ask about your reports" (a Vercel function; in development, vite.config.js serves it at the same path).
 * Holds the Anthropic key (ANTHROPIC_API_KEY, never logged or returned), checks the request and the limits, and hands
 * the question to askServer.js, which builds the workspace's report set itself. The browser sends only the question,
 * the workspace, the previous turn and when its seed was built; never report data.
 *
 * Environment: ANTHROPIC_API_KEY; ASK_MODEL ("claude-haiku-5-5" by default, or "claude-sonnet-5-5"); ASK_DAILY_CAP
 * (questions a day for this deployment, default 200). One log line per request: counts only, no question or answer.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { ask, workspaceFor, MODELS } from "../src/platform/askServer.js";

const REPORT_ID = /^\d{8}-\d{6}-[a-f0-9]{6}$/;
const loadDoc = id => {
  if (!REPORT_ID.test(id)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "portal", "reports", id, "report.json"), "utf8")); }
  catch { return null; }
};

/* ---- limits: best effort, per running copy (the Anthropic spend limit is the backstop) ---- */
const PER_MINUTE = 10, PER_DAY = 60;
const hits = new Map(), daily = {day: "", n: 0};
function limited(key, now){
  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== day) { daily.day = day; daily.n = 0; hits.clear(); }
  const cap = Math.max(0, parseInt(process.env.ASK_DAILY_CAP || "200", 10) || 0);
  if (daily.n >= cap) return "paused";
  const h = hits.get(key) || {minute: [], day: 0};
  h.minute = h.minute.filter(t => now - t < 60e3);
  if (h.minute.length >= PER_MINUTE || h.day >= PER_DAY) return "rate_limited";
  h.minute.push(now); h.day++; hits.set(key, h); daily.n++;
  return null;
}

const send = (res, status, body) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.setHeader("cache-control", "no-store"); res.end(JSON.stringify(body)); };
async function bodyOf(req){
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 16e3) throw new Error("too large"); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
const str = (v, max) => typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null;
const log = line => console.log(JSON.stringify({event: "ask", at: new Date().toISOString(), ...line}));

export default async function handler(req, res){
  if (req.method !== "POST") return send(res, 405, {error: "method"});
  const t0 = Date.now();
  let b;
  try { b = await bodyOf(req); } catch { return send(res, 400, {error: "bad_request"}); }
  const question = str(b?.question, 300), workspace = str(b?.workspace, 40), client = str(b?.client, 64) || "anon";
  const seededAt = Date.parse(b?.seeded_at || ""), previous = b?.previous && str(b.previous.question, 300) && str(b.previous.answer, 1200)
    ? {question: b.previous.question.trim(), answer: b.previous.answer.trim()} : null;
  if (!question || !workspace) return send(res, 400, {error: "bad_request"});
  // the seed the browser lists: built within the last year, not in the future; otherwise today's
  const seed = Number.isFinite(seededAt) && seededAt <= t0 + 60e3 && t0 - seededAt < 366 * 864e5 ? seededAt : t0;
  const W = workspaceFor(workspace, {seededAt: seed, now: t0, loadDoc});
  if (!W) return send(res, 404, {error: "not_found"});
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  const key = crypto.createHash("sha256").update(`${client}|${ip}`).digest("hex").slice(0, 16);
  const lim = limited(key, t0);
  if (lim) { log({outcome: lim, ms: Date.now() - t0}); return send(res, lim === "paused" ? 503 : 429, {error: lim}); }
  if (!process.env.ANTHROPIC_API_KEY) { log({outcome: "error", reason: "no_key", ms: Date.now() - t0}); return send(res, 503, {error: "unavailable"}); }
  // Haiku by default: fully right on all ten test questions, and about twice as fast (docs/platform/decisions.md)
  const model = Object.values(MODELS).includes(process.env.ASK_MODEL) ? process.env.ASK_MODEL : MODELS.haiku;
  const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
  let out;
  try { out = await ask({client: anthropic, model, W, question, previous}); }
  catch (e) { out = {status: "error", reason: e?.name || "exception", usage: {}, calls: 0}; }
  log({model, outcome: out.status, reason: out.reason || null, failed_check: out.failed || null, repaired: !!out.repaired, calls: out.calls,
       ...out.usage, ms: Date.now() - t0});
  if (out.status === "error") return send(res, 503, {error: "unavailable"});
  return send(res, 200, {...out.answer, count: out.answer.cited_refs.length});
}
