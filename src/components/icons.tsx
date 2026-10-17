import type { SVGProps } from "react";

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };

export const Icon = {
  overview: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
  ),
  studio: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="m3 7 9 5 9-5M12 12v10" /></svg>
  ),
  explorer: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M7.5 6h9M6.3 8.2l4.4 7.6M17.7 8.2l-4.4 7.6" /></svg>
  ),
  lab: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /><path d="M7 15h10" /></svg>
  ),
  training: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><path d="m2 8 10-5 10 5-10 5z" /><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 8v6" /></svg>
  ),
  guide: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></svg>
  ),
  history: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>
  ),
  docs: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h7" /></svg>
  ),
  play: (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M7 4v16l13-8z" fill="currentColor" /></svg>),
  pause: (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" /></svg>),
  close: (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>),
  target: (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>),
  chevron: (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>),
  run: (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M5 12h11M12 6l6 6-6 6" /></svg>),
};
