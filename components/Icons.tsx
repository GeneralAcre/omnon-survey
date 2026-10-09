type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const IconPlus = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconCamera = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const IconImage = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);
export const IconCheck = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconBack = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconNext = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="m9 18 6-6-6-6" /></svg>
);
export const IconX = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconSearch = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconDownload = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" /></svg>
);
export const IconUser = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const IconDots = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);
export const IconPalette = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z" />
    <circle cx="7.5" cy="10.5" r="1" />
    <circle cx="12" cy="7.5" r="1" />
    <circle cx="16.5" cy="10.5" r="1" />
  </svg>
);
export const IconTrash = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
);
export const IconAlert = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);
export const IconPin = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
