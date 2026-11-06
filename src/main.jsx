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
import "./index.css";

/*
 * /job/:token is a tokenized provider link — it renders standalone, ahead of
 * the AccessGate and without the DEV+STAGING chrome. The token is the auth.
 * The client portal's /r/:token (a customer's report) and /inspect/:token (an inspector's job) work the same way.
 * Everything else keeps the existing gated app.
 */
function Root() {
  const { token, share, inspect } = useRoute();

  // OfferStoreProvider wraps both branches: the console writes offers when it
  // dispatches, and a real second tab at /job/:token reads the same
  // localStorage back.
  if (token) return <JobOffer token={token} />;
  // the client portal's link pages read and write the same PlatformStore as the gated app, in its own provider
  if (share) return <PlatformStoreProvider><SharedReport token={share} /></PlatformStoreProvider>;
  if (inspect) return <PlatformStoreProvider><InspectPage token={inspect} /></PlatformStoreProvider>;

  return (
    <OrderStoreProvider>
      <SavedStoreProvider>
        <PlatformStoreProvider>
          <AccessGate>
            <App />
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
