"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { allPhotos, groupColor, mapsLink, type SurveyRecord } from "@/lib/schema";
import { STUDY_PLOTS, STUDY_ZONES, buildingId, plotId, plotOf, type StudyPlot } from "@/lib/study-area";
import { useT } from "./app-state";
import { GroupBadge } from "./GroupBadge";
import { photoUrl, retryImage } from "./images";
import { IconDirections, IconLocate, IconPlus, IconX } from "./Icons";

// Zoomed in this far, plot numbers show; further in, every building gets its own chip.
const LABELS_FROM = 16;
const BUILDINGS_FROM = 18;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const boundsOf = (zone?: string) =>
  L.latLngBounds(STUDY_ZONES.filter((z) => !zone || z.zone === zone).flatMap((z) => z.ring));

// The map stops a little past the zones (~300 m): no tiles load, and no panning, outside it.
const AREA = boundsOf().pad(0.12);

// Records matched to plots by their plot number ("Z01L-16A"); the rest with a GPS pin stay loose.
function matchRecords(records: SurveyRecord[]) {
  const byPlot = new Map<string, Map<string, SurveyRecord>>();
  const loose: SurveyRecord[] = [];
  for (const r of records) {
    const covers = plotOf(r);
    if (!covers.length && r.lat != null && r.lng != null) loose.push(r);
    // One record can cover several buildings ("Z01L-15ABCDEF").
    for (const { plot, building } of covers) {
      const codes = byPlot.get(plot.key) ?? new Map<string, SurveyRecord>();
      if (!codes.has(building)) codes.set(building, r);
      byPlot.set(plot.key, codes);
    }
  }
  return { byPlot, loose };
}

// The study area on a plain light map: zone banks outlined, one dot per land plot,
// building chips when zoomed in. Tapping one opens its buildings and survey status.
// `preview` is a still thumbnail (no panning, no taps).
export default function StudyMap({
  records,
  zone,
  preview = false,
  className = "h-[62dvh] lg:h-[72dvh]",
}: {
  records: SurveyRecord[];
  zone?: string;
  preview?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const plotsLayer = useRef<L.LayerGroup | null>(null);
  const buildingsLayer = useRef<L.LayerGroup | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const [picked, setPicked] = useState<{ key: string; code?: string } | null>(null);

  const { byPlot, loose } = useMemo(() => matchRecords(records), [records]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const box = el.current;
    const m = L.map(box, {
      zoomControl: false,
      zoomSnap: 0.5,
      maxZoom: 20,
      maxBounds: AREA,
      maxBoundsViscosity: 1,
      ...(preview && { dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false }),
    });
    m.attributionControl.setPrefix(false);
    if (!preview) L.control.zoom({ position: "topleft" }).addTo(m);
    // Plain OpenStreetMap (no key needed), washed out to grey in CSS (.sm-tiles) for a quiet base.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      maxNativeZoom: 19,
      bounds: AREA,
      className: "sm-tiles",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);

    for (const z of STUDY_ZONES) {
      const c = groupColor(z.zone).bg;
      L.polygon(z.ring, { color: c, weight: 1.5, opacity: 0.9, fillColor: c, fillOpacity: 0.1, interactive: false }).addTo(m);
      // "Z01 L" in the middle of each bank, until plot numbers take over.
      const ps = STUDY_PLOTS.filter((p) => p.zone === z.zone && p.side === z.side);
      if (!ps.length) continue;
      const at: L.LatLngTuple = [ps.reduce((s, p) => s + p.lat, 0) / ps.length, ps.reduce((s, p) => s + p.lng, 0) / ps.length];
      L.marker(at, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "sm-anchor", iconSize: [0, 0], html: `<span class="sm-zone" style="color:${c}">Z${z.zone.padStart(2, "0")} ${z.side}</span>` }),
      }).addTo(m);
    }

    // Zoomed all the way out = the whole study area on screen, no further.
    m.fitBounds(boundsOf(), { padding: [16, 16] });
    m.setMinZoom(m.getZoom());
    plotsLayer.current = L.layerGroup().addTo(m);
    buildingsLayer.current = L.layerGroup();

    const onZoom = () => {
      const z = m.getZoom();
      box.dataset.labels = z >= LABELS_FROM ? "on" : "off";
      box.dataset.far = z < 15 ? "on" : "off";
      const near = z >= BUILDINGS_FROM;
      if (near && !m.hasLayer(buildingsLayer.current!)) {
        m.addLayer(buildingsLayer.current!);
        m.removeLayer(plotsLayer.current!);
      } else if (!near && !m.hasLayer(plotsLayer.current!)) {
        m.addLayer(plotsLayer.current!);
        m.removeLayer(buildingsLayer.current!);
      }
    };
    m.on("zoomend", onZoom);
    onZoom();

    m.on("locationfound", (e: L.LocationEvent) => {
      me.current?.remove();
      me.current = L.circleMarker(e.latlng, { radius: 7, color: "#fff", weight: 3, fillColor: "#0a84ff", fillOpacity: 1, interactive: false }).addTo(m);
    });
    m.on("locationerror", () => toast(t("locateFailed")));

    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // `t` only feeds the error toast; the map is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  // Fly to the zone picked in the filter chips.
  useEffect(() => {
    const m = map.current;
    // A hidden map has no size to fit into, and Leaflet would throw on the NaN zoom.
    if (!m || !m.getSize().x || !m.getSize().y) return;
    m.flyToBounds(boundsOf(zone), { padding: [16, 16], duration: 0.6 });
  }, [zone]);

  // Dots and chips, redrawn when records or the picked plot change.
  useEffect(() => {
    const plots = plotsLayer.current;
    const buildings = buildingsLayer.current;
    if (!plots || !buildings) return;
    plots.clearLayers();
    buildings.clearLayers();
    const icon = (html: string, cls = "") => L.divIcon({ className: `sm-anchor ${cls}`, iconSize: [0, 0], html });

    for (const p of STUDY_PLOTS) {
      const c = groupColor(p.zone);
      const done = byPlot.get(p.key);
      const isPicked = picked?.key === p.key;
      const dot = done ? `background:${c.bg};border-color:#fff` : `background:#fff;border-color:${c.bg}`;
      const plot = L.marker([p.lat, p.lng], {
        interactive: !preview,
        keyboard: false,
        title: plotId(p),
        icon: icon(`<span class="sm-dot" style="${dot}"></span><span class="sm-label">${esc(p.plot)}</span>`, isPicked ? "sm-picked" : ""),
      });
      if (!preview) plot.on("click", () => setPicked({ key: p.key }));
      plots.addLayer(plot);

      for (const [code, lat, lng] of p.buildings) {
        const has = done?.has(code);
        const style = has ? `background:${c.bg};color:${c.fg};border-color:#fff` : `background:#fff;color:#1c1c1e;border-color:${c.bg}`;
        const chip = L.marker([lat, lng], {
          interactive: !preview,
          keyboard: false,
          title: buildingId(p, code),
          icon: icon(`<span class="sm-chip" style="${style}">${esc(p.plot + code)}</span>`, isPicked && picked?.code === code ? "sm-picked" : ""),
        });
        if (!preview) chip.on("click", () => setPicked({ key: p.key, code }));
        buildings.addLayer(chip);
      }
    }

    // Buildings with a GPS pin whose plot number isn't on the study map.
    for (const r of loose) {
      const c = groupColor(r.group);
      const pin = L.marker([r.lat!, r.lng!], {
        interactive: !preview,
        keyboard: false,
        title: r.plotNo,
        icon: icon(`<span class="sm-dot sm-loose" style="background:${c.bg}"></span><span class="sm-label">${esc(r.plotNo)}</span>`),
      });
      if (!preview) pin.on("click", () => router.push(`/r/${r.id}`));
      plots.addLayer(pin);
      buildings.addLayer(L.marker([r.lat!, r.lng!], { interactive: false, icon: icon(`<span class="sm-chip" style="background:${c.bg};color:${c.fg};border-color:#000">${esc(r.plotNo)}</span>`) }));
    }
  }, [byPlot, loose, picked, preview, router]);

  const plot = picked ? STUDY_PLOTS.find((p) => p.key === picked.key) : undefined;

  // Keep the picked plot clear of the card at the bottom.
  useEffect(() => {
    if (plot) map.current?.panInside([plot.lat, plot.lng], { paddingTopLeft: [24, 24], paddingBottomRight: [24, 300] });
  }, [plot]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border ${preview ? "pointer-events-none" : ""}`}>
      <div ref={el} className={`study-map w-full bg-card ${className}`} />
      {!preview && (
        <button
          type="button"
          onClick={() => map.current?.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true })}
          aria-label={t("locateMe")}
          title={t("locateMe")}
          className="absolute top-3 right-3 z-[500] flex size-11 items-center justify-center rounded-full bg-background/95 shadow-[0_2px_10px_rgba(0,0,0,0.15)] backdrop-blur active:scale-95"
        >
          <IconLocate />
        </button>
      )}
      {plot && <PlotCard plot={plot} code={picked?.code} surveyed={byPlot.get(plot.key)} onClose={() => setPicked(null)} />}
    </div>
  );
}

function PlotCard({ plot, code, surveyed, onClose }: { plot: StudyPlot; code?: string; surveyed?: Map<string, SurveyRecord>; onClose: () => void }) {
  const { t } = useT();
  // Letters from the map, plus any a surveyor typed that the map doesn't have.
  const codes = [...plot.buildings.map(([c]) => c), ...[...(surveyed?.keys() ?? [])].filter((c) => !plot.buildings.some(([b]) => b === c))].sort(
    (a, b) => a.length - b.length || a.localeCompare(b),
  );
  const done = codes.filter((c) => surveyed?.has(c)).length;
  const c = groupColor(plot.zone);

  return (
    <div className="absolute inset-x-2 bottom-2 z-[500] max-h-[55%] overflow-y-auto rounded-3xl bg-background/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:inset-x-auto sm:left-3 sm:w-[24rem]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <GroupBadge group={plot.zone} />
            <span className="text-xs text-muted-foreground">{t(plot.side === "L" ? "bankL" : "bankR")}</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold tracking-tight">{plotId(plot)}</h3>
          <p className="text-sm text-muted-foreground">
            {done}/{codes.length} {t("surveyedOf")}
          </p>
        </div>
        <a
          href={mapsLink(plot.lat, plot.lng)}
          target="_blank"
          rel="noreferrer"
          aria-label={t("directions")}
          title={t("directions")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary active:scale-95"
        >
          <IconDirections />
        </a>
        <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary active:scale-95">
          <IconX className="size-5" />
        </button>
      </div>

      <ul className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {codes.map((code2) => {
          const r = surveyed?.get(code2);
          const label = code2 ? plot.plot + code2 : plotId(plot);
          const ring = code2 === code ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "";
          if (r) {
            const cover = r.images.front?.photos[0] ?? allPhotos(r)[0];
            return (
              <li key={code2}>
                <Link href={`/r/${r.id}`} className={`relative block aspect-square overflow-hidden rounded-xl ${ring}`} style={{ background: c.bg }}>
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(cover.file, "thumb")} onError={retryImage} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-0.5 left-0.5 rounded-md px-1 py-0.5 text-[10px] font-bold" style={{ background: c.bg, color: c.fg }}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={code2}>
              <Link
                href={`/new?plot=${encodeURIComponent(buildingId(plot, code2))}`}
                aria-label={`${t("surveyThis")} ${buildingId(plot, code2)}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed text-xs font-bold active:scale-95 ${ring}`}
                style={{ borderColor: c.bg }}
              >
                {label}
                <IconPlus className="size-3.5 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t("plotCardHint")}</p>
    </div>
  );
}
