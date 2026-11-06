import { useEffect, useState } from "react";

/*
 * Minimal routing.
 *
 * The app is otherwise a view-state switcher with no URL involvement, and this
 * adds three real routes: /job/:token, and the portal's /r/:token and /inspect/:token. Hand-rolled rather than pulling in
 * a router — pathname match plus a popstate listener covers it.
 *
 * Vite's default appType "spa" already serves index.html for unknown paths in
 * dev and preview, so no config change is needed locally. A production host
 * needs a rewrite rule pointing /job/*, /r/* and /inspect/* at index.html.
 */

const JOB_PATH = /^\/job\/([A-Za-z0-9_-]+)\/?$/;

export function matchJobToken(pathname) {
  const m = JOB_PATH.exec(pathname || "");
  return m ? m[1] : null;
}

// The client portal's two link pages (inspection-dashboard share-client and inspect-client): the customer's
// report, /r/<token>, and the inspector's job, /inspect/<token>. The token is the credential, as above.
const SHARE_PATH = /^\/r\/([A-Za-z0-9_-]+)\/?$/;
const INSPECT_PATH = /^\/inspect\/([A-Za-z0-9_-]+)\/?$/;
const match = (re, pathname) => { const m = re.exec(pathname || ""); return m ? m[1] : null; };

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
  return { path, token: matchJobToken(path), share: match(SHARE_PATH, path), inspect: match(INSPECT_PATH, path) };
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
