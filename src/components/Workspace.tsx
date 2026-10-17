"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import { scenarioById } from "@/sim/scenarios";
import { CAMERA_PRESETS, FLUID_COLOR } from "@/scene/layout";
import { FLUID_LABEL } from "@/domain/topology";
import type { Fluid } from "@/domain/types";
import { TwinProvider, useCurrentSample, useTwin, type SectionId } from "@/state/store";
import BottomDock from "./BottomDock";
import DocsView from "./DocsView";
import Inspector from "./Inspector";
import { Icon } from "./icons";
import ExplorerPanel from "./panels/ExplorerPanel";
import GuidePanel from "./panels/GuidePanel";
import HistoryPanel from "./panels/HistoryPanel";
import LabPanel from "./panels/LabPanel";
import OverviewPanel from "./panels/OverviewPanel";
import TrainingPanel from "./panels/TrainingPanel";
import { STATUS_CSS, fmtMin } from "./ui";

const PlantScene = dynamic(() => import("@/scene/PlantScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-content-center text-center gap-2">
      <div className="mx-auto w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      <div className="small muted">Cargando escena 3D…</div>
    </div>
  ),
});

const NAV: { id: SectionId; label: string; icon: keyof typeof Icon }[] = [
  { id: "overview", label: "Resumen", icon: "overview" },
  { id: "studio", label: "Estudio 3D", icon: "studio" },
  { id: "explorer", label: "Explorador", icon: "explorer" },
  { id: "lab", label: "Laboratorio", icon: "lab" },
  { id: "training", label: "Entrena-\nmiento", icon: "training" },
  { id: "guide", label: "Guía", icon: "guide" },
  { id: "history", label: "Historial", icon: "history" },
  { id: "docs", label: "Documen-\ntación", icon: "docs" },
];

function TopBar() {
  const { activeRun } = useTwin();
  const sample = useCurrentSample();
  const sc = activeRun ? scenarioById.get(activeRun.result.scenarioId)! : null;
  const alarms = sample?.flags.activeAlarms ?? [];
  const el = sample?.flags.electrolyzer;
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">H₂</div>
        <div>
          <div className="brand-title">HYDRO-TWIN UDES</div>
          <div className="brand-sub">Entorno digital educativo · hidrógeno verde</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="chip chip-concept" title="Configuración de planta no verificada contra la instalación UDES">Planta conceptual</span>
        <span className="chip chip-sim" title="Todas las variables provienen del modelo determinista HT-SIM">Simulación determinista</span>
        <span className="chip chip-off" title="No hay conexión con sensores ni con el sistema de control de la planta">Sin conexión a planta</span>
      </div>
      <div className="flex-1" />
      {sc && sample && (
        <div className="flex items-center gap-3 small" data-testid="topbar-status">
          <span className="muted">Corrida <span className="mono text-[var(--text)]">{activeRun!.id}</span> · <span className="mono text-[var(--accent)]">{sc.code}</span> {sc.title}</span>
          <span className="mono">{fmtMin(sample.t)}</span>
          <span className="chip" style={{ color: el === "tripped" ? "var(--crit)" : el === "running" ? "var(--ok)" : "var(--text-3)" }}>
            <span className="dot" style={{ background: el === "tripped" ? "var(--crit)" : el === "running" ? "var(--ok)" : "var(--idle)" }} />
            EL-101 {el === "tripped" ? `disparada (${sample.flags.tripCause})` : el === "running" ? "operando" : "en espera"}
          </span>
          <span className="chip" style={{ color: alarms.length ? "var(--warn)" : "var(--text-3)" }}>{alarms.length ? `Alarmas: ${alarms.join(", ")}` : "Sin alarmas activas"}</span>
        </div>
      )}
    </header>
  );
}

function NavRail() {
  const { state, dispatch } = useTwin();
  return (
    <nav className="rail" aria-label="Secciones">
      {NAV.map((n) => {
        const I = Icon[n.icon];
        return (
          <button
            key={n.id}
            className={`rail-btn ${state.section === n.id ? "active" : ""}`}
            onClick={() => dispatch({ type: "section", section: n.id })}
            aria-current={state.section === n.id ? "page" : undefined}
            data-testid={`nav-${n.id}`}
          >
            <I />
            <span className="whitespace-pre-line">{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ViewToolbar() {
  const { state, dispatch } = useTwin();
  const L = state.layers;
  return (
    <div className="overlay glass toolbar left-3 top-3" role="toolbar" aria-label="Controles de vista">
      {Object.entries(CAMERA_PRESETS).map(([k, p]) => (
        <button key={k} className="tool" onClick={() => dispatch({ type: "camera", name: k })} title={`Cámara: ${p.label}`}>{p.label}</button>
      ))}
      <span className="sep" />
      {([["labels", "Etiquetas"], ["flow", "Flujo"], ["instruments", "Instrumentos"], ["zones", "Zonas"]] as const).map(([k, label]) => (
        <button key={k} className={`tool ${L[k] ? "on" : ""}`} onClick={() => dispatch({ type: "layer", key: k, value: !L[k] })} aria-pressed={L[k]}>{label}</button>
      ))}
      <span className="sep" />
      <button className={`tool ${state.isolate ? "on" : ""}`} disabled={!state.selectedId} onClick={() => dispatch({ type: "isolate", value: !state.isolate })} title={state.selectedId ? "Atenúa los equipos no conectados al seleccionado" : "Seleccione un equipo para aislar"} aria-pressed={state.isolate}>Aislar</button>
      <button className={`tool ${state.autoFrame ? "on" : ""}`} onClick={() => dispatch({ type: "autoFrame", value: !state.autoFrame })} aria-pressed={state.autoFrame} title="Encuadrar automáticamente el equipo seleccionado"><Icon.target width={14} />Encuadre</button>
    </div>
  );
}

function Legend() {
  const fluids: Fluid[] = ["h2", "o2", "di_water", "coolant", "electric", "vent"];
  return (
    <div className="overlay glass left-3 bottom-3 px-3 py-2 tiny space-y-1 pointer-events-none">
      <div className="flex gap-3">
        {(["nominal", "warning", "critical", "fault", "idle"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1 muted"><span className="dot" style={{ background: STATUS_CSS[s] }} />{{ nominal: "Nominal", warning: "Advertencia", critical: "Crítico", fault: "Falla", idle: "En espera" }[s]}</span>
        ))}
      </div>
      <div className="flex gap-3">
        {fluids.map((f) => (
          <span key={f} className="flex items-center gap-1 muted"><span className="inline-block w-3 h-[3px] rounded" style={{ background: FLUID_COLOR[f] }} />{FLUID_LABEL[f]}</span>
        ))}
      </div>
      <div className="muted opacity-80">Geometría conceptual a escala de laboratorio · clic: seleccionar · arrastrar: orbitar · rueda: zoom · clic derecho: desplazar</div>
    </div>
  );
}

class PanelBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null; key: string }> {
  state = { error: null as string | null, key: this.props.resetKey };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  static getDerivedStateFromProps(p: { resetKey: string }, s: { error: string | null; key: string }) {
    return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null;
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 small" role="alert">
          <div className="notice">
            <strong>Este panel encontró un error y se detuvo.</strong> La escena, la simulación y las demás secciones siguen disponibles.
            <div className="mono tiny mt-1">{this.state.error}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const { state } = useTwin();
  const panel =
    state.section === "overview" ? <OverviewPanel /> :
    state.section === "explorer" ? <ExplorerPanel /> :
    state.section === "lab" ? <LabPanel /> :
    state.section === "training" ? <TrainingPanel /> :
    state.section === "guide" ? <GuidePanel /> :
    state.section === "history" ? <HistoryPanel /> : null;
  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <NavRail />
        {panel && <aside className="side" aria-label="Panel de sección"><PanelBoundary resetKey={state.section}>{panel}</PanelBoundary></aside>}
        <main className="viewport" aria-label="Estudio del gemelo digital 3D">
          {state.hydrated && <PlantScene />}
          <ViewToolbar />
          <Legend />
          <Inspector />
          {state.section === "docs" && <DocsView />}
        </main>
      </div>
      <BottomDock />
    </div>
  );
}

export default function Workspace() {
  return (
    <TwinProvider>
      <Shell />
    </TwinProvider>
  );
}
