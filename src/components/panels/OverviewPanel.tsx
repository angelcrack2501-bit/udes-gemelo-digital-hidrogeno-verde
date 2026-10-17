"use client";

import { useMemo } from "react";
import { CONNECTIONS, EQUIPMENT, INSTRUMENTS, STAGES } from "@/domain/plant";
import { PLANT_MODEL, validatePlant } from "@/domain/topology";
import { SCENARIOS, scenarioById } from "@/sim/scenarios";
import { MODEL_VERSION } from "@/sim/engine";
import { MISSION } from "@/training/mission";
import { useTwin } from "@/state/store";
import { PanelHeader } from "../ui";

const LADDER = [
  { level: "Representación visual digital", status: "yes", note: "Escena 3D procedural de una planta PEM conceptual." },
  { level: "Modelo de ingeniería interactivo", status: "yes", note: "Grafo de proceso tipado, equipos e instrumentos con procedencia." },
  { level: "Entorno operativo simulado", status: "yes", note: "Simulación determinista con ecuaciones documentadas y escenarios." },
  { level: "Gemelo digital conectado a datos", status: "no", note: "Sin sensores, SCADA ni datos medidos de la planta UDES." },
  { level: "Gemelo digital industrial validado", status: "no", note: "Sin calibración ni validación contra la instalación real." },
] as const;

export default function OverviewPanel() {
  const { state, dispatch, runScenario } = useTwin();
  const issues = useMemo(() => validatePlant(PLANT_MODEL), []);
  const demo = (k: "inspect" | "deviation" | "mission") => {
    if (k === "inspect") {
      dispatch({ type: "section", section: "studio" });
      dispatch({ type: "select", id: "EL-101" });
    } else if (k === "deviation") {
      const sc = scenarioById.get("demand_loss")!;
      dispatch({ type: "draft", scenarioId: "demand_loss" });
      runScenario("demand_loss", sc.defaults, "laboratorio");
      dispatch({ type: "section", section: "lab" });
      dispatch({ type: "select", id: "TK-201" });
    } else {
      dispatch({ type: "section", section: "training" });
    }
  };

  return (
    <>
      <PanelHeader title="Resumen del proyecto" subtitle="Universidad de Santander (UDES) · Ingeniería" />
      <div className="side-body" data-testid="overview-panel">
        <div className="card">
          <div className="text-[16px] font-semibold leading-snug">HYDRO-TWIN UDES</div>
          <p className="small text-[var(--text-2)] mt-1 leading-relaxed">
            Entorno digital educativo de una planta de hidrógeno verde por electrólisis PEM: escena 3D interactiva, modelo semántico del proceso, simulación determinista trazable, misiones de entrenamiento y una guía de ingeniería basada en reglas.
          </p>
          <div className="notice mt-3">
            <strong>Alcance honesto.</strong> No se dispuso de planos, hojas de datos ni mediciones de la planta UDES. La configuración es <b>conceptual</b>, los parámetros son <b>ilustrativos</b> y todos los valores son <b>simulados</b>.
          </div>
        </div>

        <div className="section-title">Nivel de madurez actual</div>
        <ol className="space-y-1.5" data-testid="maturity-ladder">
          {LADDER.map((l, i) => (
            <li key={l.level} className="flex items-start gap-2.5">
              <span className={`mt-0.5 w-5 h-5 rounded-full grid place-items-center text-[10px] mono flex-none ${l.status === "yes" ? "bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]" : "bg-[var(--panel2)] text-[var(--text-3)] border border-[var(--line-2)]"}`}>{i + 1}</span>
              <div>
                <div className={`small font-medium ${l.status === "yes" ? "" : "text-[var(--text-3)]"}`}>{l.level} {l.status === "yes" ? <span className="text-[var(--ok)]">✓</span> : <span className="tiny muted">— no alcanzado</span>}</div>
                <div className="tiny muted">{l.note}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="section-title">Estado del modelo</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Equipos", EQUIPMENT.length, "Todos conceptuales"],
            ["Conexiones tipadas", CONNECTIONS.length, issues.length === 0 ? "Topología válida" : `${issues.length} observaciones`],
            ["Instrumentos", INSTRUMENTS.length, "Lecturas del modelo"],
            ["Etapas de proceso", STAGES.length, "Del FV al uso final"],
            ["Escenarios", SCENARIOS.length, "Deterministas"],
            ["Corridas en sesión", state.runs.length, MODEL_VERSION],
          ].map(([k, v, n]) => (
            <div key={k as string} className="card !p-2.5">
              <div className="tiny muted">{k}</div>
              <div className="text-[20px] font-semibold mono leading-tight">{v}</div>
              <div className="tiny muted">{n}</div>
            </div>
          ))}
        </div>
        <p className="tiny muted mt-1.5">Cifras calculadas en vivo a partir del modelo cargado; no son estadísticas de la planta.</p>

        <div className="section-title">Demostraciones disponibles</div>
        <div className="space-y-1.5">
          <button className="list-btn" onClick={() => demo("inspect")} data-testid="demo-inspect">
            <div className="small font-medium">1 · Inspeccionar la pila PEM</div>
            <div className="tiny muted">Selecciona EL-101 en la escena y abre su inspector.</div>
          </button>
          <button className="list-btn" onClick={() => demo("deviation")} data-testid="demo-deviation">
            <div className="small font-medium">2 · Ejecutar ESC-03 (pérdida de demanda)</div>
            <div className="tiny muted">Corrida con alarma PAH → disparo PAHH y comparación con la línea base.</div>
          </button>
          <button className="list-btn" onClick={() => demo("mission")} data-testid="demo-mission">
            <div className="small font-medium">3 · Misión {MISSION.id}</div>
            <div className="tiny muted">{MISSION.title}</div>
          </button>
        </div>

        <div className="section-title">Proceso representado</div>
        <ol className="space-y-1 small">
          {STAGES.map((s) => (
            <li key={s.id} className="flex gap-2"><span className="mono muted">{s.order}</span><span><b className="font-medium">{s.name}.</b> <span className="text-[var(--text-2)]">{s.description}</span></span></li>
          ))}
        </ol>
      </div>
    </>
  );
}
