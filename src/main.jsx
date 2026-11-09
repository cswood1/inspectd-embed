import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AccessGate } from "./AccessGate.jsx";
import { OrderStoreProvider } from "./OrderStore.jsx";
import { SavedStoreProvider } from "./SavedStore.jsx";
import { OfferStoreProvider } from "./OfferStore.jsx";
import { PlatformStoreProvider } from "./platform/PlatformStore.jsx";
import { JobOffer } from "./JobOffer.jsx";
import { SharedReport, InspectPage } from "./platform/PublicPages.jsx";
import { useRoute } from "./router.jsx";
import { portalAt } from "./platform/ClientPortal.jsx";
import "./index.css";

/*
 * /job/:token is a tokenized provider link — it renders standalone, ahead of
 * the AccessGate and without the DEV+STAGING chrome. The token is the auth.
 * The client portal's /r/:token (a customer's report) and /inspect/:token (an inspector's job) work the same way.
 * Everything else keeps the existing gated app.
 */
let deepLinked = false;
function Root() {
  const { token, share, inspect, path } = useRoute();

  // OfferStoreProvider wraps both branches: the console writes offers when it
  // dispatches, and a real second tab at /job/:token reads the same
  // localStorage back.
  if (token) return <JobOffer token={token} />;
  // the client portal's link pages read and write the same PlatformStore as the gated app, in its own provider
  if (share) return <PlatformStoreProvider><SharedReport token={share} /></PlatformStoreProvider>;
  if (inspect) return <PlatformStoreProvider><InspectPage token={inspect} /></PlatformStoreProvider>;

  // /reports/<report id>: a report's own link (Inspection Intelligence's CSV gives one per row). It opens the client
  // portal at that report, behind the access gate, in the workspace that keeps it.
  const report = /^\/reports\/(\d{8}-\d{6}-[a-f0-9]{6})\/?$/.exec(path)?.[1];
  if (report && !deepLinked) { deepLinked = true; portalAt(`/reports/${report}`, {report}); }   // once per page load
  return (
    <OrderStoreProvider>
      <SavedStoreProvider>
        <PlatformStoreProvider>
          <AccessGate>
            <App initialView={report ? "platform-portal" : undefined} />
          </AccessGate>
        </PlatformStoreProvider>
      </SavedStoreProvider>
    </OrderStoreProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OfferStoreProvider>
      <Root />
    </OfferStoreProvider>
  </React.StrictMode>
);
