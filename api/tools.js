/*
 * POST /api/tools: run one Inspection Intelligence tool for a workspace, with no model (intelTools.js). The page uses
 * it for the starting points, figure and breakdown clicks, and evidence: the same tools, scoping and results the model
 * gets, which is also what a future MCP server publishes. The browser sends the tool's name and input, the workspace and
 * when its seed was built; never report data. No API key is involved.
 */
import { runTool, TOOL_DEFS, MAX_LIMIT } from "../src/platform/intelTools.js";
import { send, bodyOf, str, log, workspaceOf, limiter } from "./_lib.js";

const NAMES = new Set(TOOL_DEFS.map(t => t.name));
const limited = limiter({perMinute: 60, perDay: 1000});

export default async function handler(req, res){
  if (req.method !== "POST") return send(res, 405, {error: "method"});
  const t0 = Date.now();
  let b;
  try { b = await bodyOf(req); } catch { return send(res, 400, {error: "bad_request"}); }
  const tool = str(b?.tool, 40);
  if (!tool || !NAMES.has(tool) || (b.input !== undefined && (typeof b.input !== "object" || Array.isArray(b.input)))) return send(res, 400, {error: "bad_request"});
  const W = workspaceOf(b, t0);
  if (!W) return send(res, 404, {error: "not_found"});
  const lim = limited(req, str(b?.client, 64) || "anon", t0);
  if (lim) return send(res, 429, {error: lim});
  const input = {...(b.input || {})};
  if (tool === "find_reports") input.limit = Math.min(MAX_LIMIT, +input.limit || MAX_LIMIT);   // the page lists every row
  let out;
  try { out = runTool(W, tool, input); } catch (e) { log({event: "tools", tool, outcome: "error", reason: e?.name || "exception"}); return send(res, 500, {error: "unavailable"}); }
  log({event: "tools", tool, outcome: out.result.error ? "not_found" : "ok", ms: Date.now() - t0});
  return send(res, out.result.error ? 404 : 200, out.result);
}
