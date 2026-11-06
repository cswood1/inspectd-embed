import React from "react";
import { Portal, portalAt } from "./Portal.jsx";

export { portalAt };

// The client portal (inspection-dashboard), sharing PlatformStore with the Operations console:
// a request sent here is a job on the console's board, and a change made there shows here.
export function ClientPortal({ onExit }){
  return <Portal onExit={onExit} />;
}
