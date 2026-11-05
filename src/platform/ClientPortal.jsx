import React from "react";
import "./platform.css";

// The client portal (inspection-dashboard). A placeholder until step 4 builds it; it reads the same
// PlatformStore as the console, so a job changed in one shows in the other.
export function ClientPortal(){
  return (
    <div className="ip">
      <div className="ip-scroll">
        <main><div className="pad greet"><div className="gt"><h1>Client portal</h1></div></div></main>
      </div>
    </div>
  );
}
