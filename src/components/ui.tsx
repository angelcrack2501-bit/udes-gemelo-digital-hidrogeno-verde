"use client";

import type { ReactNode } from "react";
import type { Provenance } from "@/domain/types";
import type { VisualStatus } from "@/sim/state-map";
import type { Severity } from "@/sim/types";

export const fmt = (x: number | null | undefined, digits = 2) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : x.toLocaleString("es-CO", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const fmtMin = (seconds: number) => `${(seconds / 60).toLocaleString("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} min`;

const PROV: Record<Provenance, { cls: string; label: string; title: string }> = {
  conceptual: { cls: "chip-concept", label: "Conceptual", title: "Configuración supuesta, no verificada contra la planta UDES" },
  illustrative: { cls: "chip-concept", label: "Ilustrativo", title: "Valor plausible elegido para la demostración, sin respaldo de planta" },
  literature: { cls: "chip-lit", label: "Literatura", title: "Valor o ecuación tomada de una referencia citada" },
  measured: { cls: "chip-ok", label: "Medido", title: "Medición real de la planta UDES" },
};

export function ProvenanceChip({ p }: { p: Provenance }) {
  const d = PROV[p];
  return (
    <span className={`chip ${d.cls}`} title={d.title}>
      {d.label}
    </span>
  );
}

export function SimChip({ children = "Simulado" }: { children?: ReactNode }) {
  return (
    <span className="chip chip-sim" title="Valor calculado por el modelo determinista; no es una medición">
      {children}
    </span>
  );
}

export const STATUS_LABEL: Record<VisualStatus, string> = {
  nominal: "Nominal",
  idle: "En espera",
  warning: "Advertencia",
  critical: "Crítico",
  fault: "Falla",
  nodata: "Sin datos",
};

export const STATUS_CSS: Record<VisualStatus, string> = {
  nominal: "var(--ok)",
  idle: "var(--idle)",
  warning: "var(--warn)",
  critical: "var(--crit)",
  fault: "var(--fault)",
  nodata: "var(--idle)",
};

export function StatusPill({ status, label }: { status: VisualStatus; label?: string }) {
  return (
    <span className="chip" style={{ borderColor: `color-mix(in srgb, ${STATUS_CSS[status]} 45%, transparent)`, color: STATUS_CSS[status] }}>
      <span className="dot" style={{ background: STATUS_CSS[status] }} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

export const SEVERITY_LABEL: Record<Severity, string> = { info: "Info", advertencia: "Advertencia", critica: "Crítica" };

export function SeverityTag({ s }: { s: Severity }) {
  return <span className={`tiny mono sev-${s}`}>{SEVERITY_LABEL[s].toUpperCase()}</span>;
}

export function PanelHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="side-head flex items-start justify-between gap-3">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-content-center gap-1 text-center p-6 h-full">
      <div className="text-[13px] font-semibold text-[var(--text-2)]">{title}</div>
      {children && <div className="small muted max-w-[420px]">{children}</div>}
    </div>
  );
}
