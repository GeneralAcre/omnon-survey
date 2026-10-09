"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { allPhotos, groupColor, type SurveyRecord } from "@/lib/schema";
import { photoUrl } from "./images";

// Roughly the middle of the three workshop zones on Khlong Om Non.
const DEFAULT_CENTER: L.LatLngExpression = [13.842, 100.468];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default function PlacesMap({ records, noPlaceLabel }: { records: SurveyRecord[]; noPlaceLabel: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(DEFAULT_CENTER, 15);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 20,
      maxNativeZoom: 19,
      attribution: "Imagery © Esri",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const placed = records.filter((r) => r.lat != null && r.lng != null);
    for (const r of placed) {
      const c = groupColor(r.group);
      const cover = r.images.front?.photos[0] ?? allPhotos(r)[0];
      const icon = L.divIcon({
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<div style="width:30px;height:30px;border-radius:999px;background:${c.bg};border:3px solid #000;box-shadow:0 0 0 2px ${c.bg}66;display:flex;align-items:center;justify-content:center;color:${c.fg};font:700 11px/1 sans-serif">${r.group}</div>`,
      });
      const img = cover ? `<img src="${photoUrl(cover.file, "thumb")}" style="width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:8px" />` : "";
      L.marker([r.lat!, r.lng!], { icon })
        .bindPopup(
          `<a href="/r/${esc(r.id)}" style="display:block;width:180px;color:inherit;text-decoration:none">${img}<div style="font-weight:700;font-size:16px">${esc(r.plotNo)}</div><div style="opacity:.7;font-size:12px">${esc(r.updatedBy.name)} · G${esc(r.group)} · ${allPhotos(r).length} 📷</div></a>`,
        )
        .addTo(g);
    }
    if (placed.length) {
      m.fitBounds(L.latLngBounds(placed.map((r) => [r.lat!, r.lng!] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 18 });
    }
  }, [records]);

  const missing = records.filter((r) => r.lat == null).length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line">
      <div ref={el} className="h-[62dvh] w-full bg-surface" />
      {missing > 0 && (
        <div className="pointer-events-none absolute top-3 left-3 z-[400] rounded-full bg-black/70 px-3 py-1.5 text-xs text-muted backdrop-blur">
          {missing} {noPlaceLabel}
        </div>
      )}
    </div>
  );
}
