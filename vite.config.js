import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/*
 * In development, serve the Vercel function api/ask.js at /api/ask, so `npm run dev` runs the app and "Ask about your
 * reports" together. Its environment (ANTHROPIC_API_KEY, ASK_MODEL, ASK_DAILY_CAP) comes from .env.local, which is
 * git-ignored; only the server side reads it (nothing here reaches the browser bundle). Production uses Vercel's own
 * function, configured in vercel.json.
 */
function askDev(env){
  return {
    name: "ask-dev", apply: "serve",
    configureServer(server){
      server.middlewares.use("/api/ask", async (req, res) => {
        for (const k of ["ANTHROPIC_API_KEY", "ASK_MODEL", "ASK_DAILY_CAP"]) if (env[k] && !process.env[k]) process.env[k] = env[k];
        try { const { default: handler } = await server.ssrLoadModule("/api/ask.js"); await handler(req, res); }
        catch (e) { server.config.logger.error(`api/ask: ${e?.name || "error"}`); res.statusCode = 503; res.setHeader("content-type", "application/json"); res.end('{"error":"unavailable"}'); }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), askDev(loadEnv(mode, process.cwd(), ""))],
}));
