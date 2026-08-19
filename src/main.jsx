import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AccessGate } from "./AccessGate.jsx";
import { OrderStoreProvider } from "./OrderStore.jsx";
import { SavedStoreProvider } from "./SavedStore.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OrderStoreProvider>
      <SavedStoreProvider>
        <AccessGate>
          <App />
        </AccessGate>
      </SavedStoreProvider>
    </OrderStoreProvider>
  </React.StrictMode>
);
