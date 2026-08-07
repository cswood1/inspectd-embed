import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import zipDb from "us-zips";
import { providerPayout, formatUsd } from "./OrderStore.jsx";

// Zip → { lat, lng } lookup. us-zips uses latitude/longitude fields.
export function zipCoords(zip) {
  if (!zip) return null;
  const rec = zipDb[String(zip).padStart(5, "0")];
  if (!rec) return null;
  return { lat: rec.latitude, lng: rec.longitude };
}

export function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Custom green pin SVG icon — matches the real portal's marker.
function pinIcon() {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#00D084" stroke="#0f172a" stroke-width="2"/>
             <circle cx="12" cy="9" r="3" fill="#0f172a"/>
           </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

function anchorIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #93c5fd;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8);"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function popupHtml(job) {
  const payout = providerPayout(job.price);
  const payoutStr = formatUsd(payout);
  const [city, state] = String(job.location || "").split(",").map((s) => s.trim());
  return `
    <div style="display:flex;flex-direction:column;gap:6px;min-width:220px;font-family:Inter,system-ui;padding:8px;">
      <div style="font-weight:700;color:#0f172a;font-size:13px;line-height:1.3;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${escapeHtml(job.vehicle)}</div>
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#475569;">
        <div style="font-weight:600;color:#1e293b;">${escapeHtml(job.serviceLevel)}</div>
        <div><span style="font-weight:500;">Req:</span> ${escapeHtml(job.clientType || "INDIVIDUAL")}</div>
        <div><span style="font-weight:500;">Loc:</span> ${escapeHtml(city || "—")}, ${escapeHtml(state || "")}</div>
        <div style="margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(job.zip || "")}</div>
      </div>
      <div style="margin-top:4px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;flex-direction:column;">
          <span style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Payout</span>
          <span style="font-size:18px;font-weight:700;color:#00D084;">${payoutStr}</span>
        </div>
        <button data-job-id="${escapeHtml(job.id)}" style="padding:5px 12px;background:#0f172a;color:#fff;font-size:11px;font-weight:700;border:none;border-radius:4px;cursor:pointer;">Review &amp; Claim</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function VINmap({ jobs, centerCoords, onJobSelect, fullHeight = true }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clusterRef = useRef(null);
  const anchorRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Effect 1: init map once.
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const defaultCenter = centerCoords
      ? [centerCoords.lat, centerCoords.lng]
      : [39.5, -98.35];
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: centerCoords ? 8 : 4,
      zoomControl: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);
    mapInstanceRef.current = map;
    setReady(true);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: update markers/anchor when jobs or centerCoords change.
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    if (anchorRef.current) {
      map.removeLayer(anchorRef.current);
      anchorRef.current = null;
    }

    if (centerCoords) {
      const marker = L.marker([centerCoords.lat, centerCoords.lng], {
        icon: anchorIcon(),
      })
        .addTo(map)
        .bindPopup(
          '<div style="font-family:monospace;font-size:11px;color:#3b82f6;padding:4px;">📍 Your Anchor</div>'
        );
      anchorRef.current = marker;
    }

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    const jobById = new Map();
    for (const job of jobs) {
      const coords = zipCoords(job.zip);
      if (!coords) continue;
      jobById.set(job.id, job);
      const marker = L.marker([coords.lat, coords.lng], {
        icon: pinIcon(),
      }).bindPopup(popupHtml(job));
      cluster.addLayer(marker);
    }

    if (onJobSelect) {
      map.off("popupopen");
      map.on("popupopen", (e) => {
        const container = e.popup.getElement();
        if (!container) return;
        const btn = container.querySelector("button[data-job-id]");
        if (btn) {
          btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const id = btn.getAttribute("data-job-id");
            const job = jobById.get(id);
            if (job) onJobSelect(job);
          });
        }
      });
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;

    if (jobs.length > 0 && !centerCoords) {
      const bounds = cluster.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      }
    }
  }, [jobs, centerCoords, onJobSelect, ready]);

  return (
    <div
      className={
        "relative w-full overflow-hidden rounded-lg border border-portal-border " +
        (fullHeight ? "h-[calc(100vh-14rem)]" : "")
      }
      style={fullHeight ? undefined : { height: "600px" }}
    >
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%", background: "#f8fafc" }}
      />
      <div className="absolute right-4 top-4 z-[1000] rounded border border-portal-border bg-portal-card/90 px-3 py-1.5 backdrop-blur">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-portal-emerald">
          {jobs.length.toLocaleString()} OPEN INSPECTION
          {jobs.length !== 1 ? "S" : ""}
        </span>
      </div>
      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 8px; }
        .leaflet-popup-content { margin: 0 !important; }
      `}</style>
    </div>
  );
}
