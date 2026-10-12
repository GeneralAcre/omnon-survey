"use client";

import { useT } from "./app-state";

// A house before and after being jacked up (ดีดบ้าน): same flood level, floor now above it.
export default function JackedDiagram() {
  const { t } = useT();
  return (
    <div className="rounded-2xl bg-card p-3">
      <svg viewBox="0 0 320 168" role="img" aria-label={t("jackedWhat")} className="w-full text-foreground">
        <defs>
          <marker id="jack-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {/* Floodwater, same height in both pictures */}
        <rect x="0" y="104" width="320" height="34" fill="#3b82f6" opacity="0.3" />
        <line x1="0" y1="104" x2="320" y2="104" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 4" />
        <line x1="0" y1="138" x2="320" y2="138" stroke="currentColor" strokeWidth="2" />
        <line x1="160" y1="8" x2="160" y2="138" stroke="currentColor" strokeOpacity="0.2" />

        {/* Before: floor below the flood line */}
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M34 88 L80 58 L126 88 Z" />
          <rect x="42" y="88" width="76" height="34" />
          <rect x="72" y="100" width="16" height="22" />
          <line x1="48" y1="122" x2="48" y2="138" />
          <line x1="112" y1="122" x2="112" y2="138" />
        </g>

        {/* After: same house lifted onto taller posts */}
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M194 44 L240 14 L286 44 Z" />
          <rect x="202" y="44" width="76" height="34" />
          <rect x="232" y="56" width="16" height="22" />
          <line x1="208" y1="78" x2="208" y2="138" />
          <line x1="272" y1="78" x2="272" y2="138" />
          {/* Old post height, to show how much was added */}
          <line x1="204" y1="122" x2="212" y2="122" strokeWidth="1.5" />
          <line x1="268" y1="122" x2="276" y2="122" strokeWidth="1.5" />
        </g>
        <line x1="300" y1="118" x2="300" y2="66" stroke="currentColor" strokeWidth="2" markerEnd="url(#jack-arrow)" />

        <text x="80" y="158" textAnchor="middle" fontSize="12" fill="currentColor">
          {t("jackedBefore")}
        </text>
        <text x="240" y="158" textAnchor="middle" fontSize="12" fill="currentColor">
          {t("jackedAfter")}
        </text>
        <text x="240" y="100" textAnchor="middle" fontSize="10" fill="#3b82f6">
          {t("floodLevel")}
        </text>
      </svg>
      <p className="mt-2 text-sm text-muted-foreground">{t("jackedExplain")}</p>
    </div>
  );
}
