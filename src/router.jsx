import { useEffect, useState } from "react";

/*
 * Minimal routing.
 *
 * The app is otherwise a view-state switcher with no URL involvement, and this
 * adds exactly one real route: /job/:token. Hand-rolled rather than pulling in
 * a router — pathname match plus a popstate listener covers it.
 *
 * Vite's default appType "spa" already serves index.html for unknown paths in
 * dev and preview, so no config change is needed locally. A production host
 * needs a rewrite rule pointing /job/* at index.html.
 */

const JOB_PATH = /^\/job\/([A-Za-z0-9_-]+)\/?$/;

export function matchJobToken(pathname) {
  const m = JOB_PATH.exec(pathname || "");
  return m ? m[1] : null;
}

export function navigate(to) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return { path, token: matchJobToken(path) };
}

// Read once at mount — flipping a query param in this demo means a reload.
export function useQueryFlag(name) {
  const [on] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has(name);
    } catch {
      return false;
    }
  });
  return on;
}
