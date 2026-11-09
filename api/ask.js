/*
 * POST /api/ask: a question on Inspection Intelligence (a Vercel function; in development, vite.config.js serves it at the same path).
 * Holds the Anthropic key (ANTHROPIC_API_KEY, never logged or returned), checks the request and the limits, and hands
 * the question to askServer.js, which builds the workspace's report set itself and returns the answer with its worklist,
 * breakdown and evidence attached from the tool results. The browser sends only the question,
 * the workspace, the previous turn and when its seed was built; never report data.
 *
 * Environment: ANTHROPIC_API_KEY; ASK_MODEL ("claude-haiku-5-5" by default, or "claude-sonnet-5-5"); ASK_DAILY_CAP
 * (questions a day for this deployment, default 200). One log line per request: counts only, no question or answer.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ask, MODELS } from "../src/platform/askServer.js";
import { send, bodyOf, str, log, workspaceOf, limiter } from "./_lib.js";

const limited = limiter({perMinute: 10, perDay: 60, dailyCap: () => Math.max(0, parseInt(process.env.ASK_DAILY_CAP || "200", 10) || 0)});

export default async function handler(req, res){
  if (req.method !== "POST") return send(res, 405, {error: "method"});
  const t0 = Date.now();
  let b;
  try { b = await bodyOf(req); } catch { return send(res, 400, {error: "bad_request"}); }
  const question = str(b?.question, 300), client = str(b?.client, 64) || "anon";
  const previous = b?.previous && str(b.previous.question, 300) && str(b.previous.answer, 1200) ? {question: b.previous.question.trim(), answer: b.previous.answer.trim()} : null;
  if (!question || !str(b?.workspace, 40)) return send(res, 400, {error: "bad_request"});
  const W = workspaceOf(b, t0);
  if (!W) return send(res, 404, {error: "not_found"});
  const lim = limited(req, client, t0);
  if (lim) { log({event: "ask", outcome: lim, ms: Date.now() - t0}); return send(res, lim === "paused" ? 503 : 429, {error: lim}); }
  if (!process.env.ANTHROPIC_API_KEY) { log({event: "ask", outcome: "error", reason: "no_key", ms: Date.now() - t0}); return send(res, 503, {error: "unavailable"}); }
  // Haiku by default: fully right on all ten test questions, and about twice as fast (docs/platform/decisions.md)
  const model = Object.values(MODELS).includes(process.env.ASK_MODEL) ? process.env.ASK_MODEL : MODELS.haiku;
  const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});
  let out;
  try { out = await ask({client: anthropic, model, W, question, previous}); }
  catch (e) { out = {status: "error", reason: e?.name || "exception", usage: {}, calls: 0}; }
  log({event: "ask", model, outcome: out.status, reason: out.reason || null, failed_check: out.failed || null, repaired: !!out.repaired, calls: out.calls,
       ...out.usage, ms: Date.now() - t0});
  if (out.status === "error") return send(res, 503, {error: "unavailable"});
  return send(res, 200, {...out.answer, count: out.answer.cited_refs.length});
}
