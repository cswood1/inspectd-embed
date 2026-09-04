import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AccessGate } from "./AccessGate.jsx";
import { OrderStoreProvider } from "./OrderStore.jsx";
import { SavedStoreProvider } from "./SavedStore.jsx";
import { OfferStoreProvider } from "./OfferStore.jsx";
import { JobOffer } from "./JobOffer.jsx";
import { useRoute } from "./router.jsx";
import "./index.css";

/*
 * /job/:token is a tokenized provider link — it renders standalone, ahead of
 * the AccessGate and without the DEV+STAGING chrome. The token is the auth.
 * Everything else keeps the existing gated app.
 */
function Root() {
  const { token } = useRoute();

  if (token) {
    return (
      <OfferStoreProvider>
        <JobOffer token={token} />
      </OfferStoreProvider>
    );
  }

  return (
    <OrderStoreProvider>
      <SavedStoreProvider>
        <AccessGate>
          <App />
        </AccessGate>
      </SavedStoreProvider>
    </OrderStoreProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
