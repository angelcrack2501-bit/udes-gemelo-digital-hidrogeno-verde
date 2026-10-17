"use client";

import { useState } from "react";
import { equationById } from "@/sim/model-docs";
import { INPUT_RANGES, SCENARIOS, scenarioById } from "@/sim/scenarios";
import type { NumericInputKey } from "@/sim/types";
import { KPI_DEFS } from "@/sim/compare";
import { useTwin } from "@/state/store";
import { Icon } from "../icons";
import { PanelHeader, SimChip, fmt } from "../ui";

const CATEGORY_LABEL = {
  normal: "Operación normal",
  input_change: "Cambio de entrada",
  process_deviation: "Desviación de proceso",
  equipment_fault: "Falla de equipo",
  instrument_fault: "Falla de instrumentación",
  safety: "Seguridad (hipotético)",
} as const;

export default function LabPanel() {
  const { state, dispatch, runScenario, activeRun, baselineRun } = useTwin();
  const { scenarioId, inputs } = state.draft;
  const sc = scenarioById.get(scenarioId)!;
  const [showDetails, setShowDetails] = useState(true);
  const adjustable = new Set(sc.adjustable);
  const numericKeys: NumericInputKey[] = ["powerSetKw", "fcLoadKw", "initialTankBar", "initialStackC", "ambientC", "leakNlMin", "faultAtMin", "interventionAtMin", "durationMin"];
  const visibleKeys = numericKeys.filter((k) => adjustable.has(k) || (k === "faultAtMin" && sc.disturbance && scenarioId !== "power_change"));
  const lastIsThis = activeRun && activeRun.result.scenarioId === scenarioId;

  return (
    <>
      <PanelHeader title="Laboratorio de simulación" subtitle="Escenarios deterministas y reproducibles · modelo HT-SIM 1.0.0" />
      <div className="side-body">
        <div className="space-y-1.5" role="listbox" aria-label="Escenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              role="option"
              aria-selected={s.id === scenarioId}
              className={`list-btn ${s.id === scenarioId ? "on" : ""}`}
              onClick={() => dispatch({ type: "draft", scenarioId: s.id })}
              data-testid={`scenario-${s.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium"><span className="mono text-[var(--accent)] mr-1.5">{s.code}</span>{s.title}</span>
              </div>
              <div className="tiny muted mt-0.5">{CATEGORY_LABEL[s.category]}</div>
            </button>
          ))}
        </div>

        <div className="card mt-4">
          <div className="flex items-center justify-between">
            <div className="card-title !mb-1">{sc.code} · definición</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>{showDetails ? "Ocultar" : "Mostrar"}</button>
          </div>
          <p className="small text-[var(--text-2)]">{sc.summary}</p>
          {showDetails && (
            <div className="mt-2 space-y-2 small">
              <div><span className="muted">Objetivo de aprendizaje: </span>{sc.learningGoal}</div>
              {sc.disturbance && <div><span className="muted">Perturbación: </span>{sc.disturbance}</div>}
              {sc.intervention && <div><span className="muted">Intervención disponible: </span>{sc.intervention}</div>}
              <div>
                <div className="muted">Comportamiento esperado:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[var(--text-2)]">{sc.expectedBehavior.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
              <div className="flex flex-wrap gap-1">
                {sc.equations.map((e) => <span key={e} className="chip" title={equationById.get(e)?.expressions.join("\n")}>{equationById.get(e)?.title}</span>)}
              </div>
              <details>
                <summary className="cursor-pointer muted">Supuestos y validación</summary>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[var(--text-2)]">{sc.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                <div className="muted mt-1">Pruebas automatizadas:</div>
                <ul className="list-disc pl-4 space-y-0.5 mono tiny text-[var(--text-2)]">{sc.validation.map((v) => <li key={v}>{v}</li>)}</ul>
              </details>
            </div>
          )}
        </div>

        <div className="section-title">Entradas permitidas</div>
        {sc.adjustable.includes("sourceMode") && (
          <div className="field">
            <div className="field-label">Fuente de potencia</div>
            <div className="seg">
              <button className={inputs.sourceMode === "constant" ? "on" : ""} onClick={() => dispatch({ type: "draft", inputs: { sourceMode: "constant" } })}>Constante</button>
              <button className={inputs.sourceMode === "pv_profile" ? "on" : ""} onClick={() => dispatch({ type: "draft", inputs: { sourceMode: "pv_profile" } })}>Perfil FV ilustrativo</button>
            </div>
          </div>
        )}
        {visibleKeys.map((k) => {
          const r = INPUT_RANGES[k];
          const disabled = k === "interventionAtMin" && !inputs.interventionEnabled;
          const max = k === "faultAtMin" ? Math.min(r.max, inputs.durationMin - 1) : k === "interventionAtMin" ? inputs.durationMin : r.max;
          const min = k === "interventionAtMin" ? Math.max(r.min, inputs.faultAtMin + 1) : r.min;
          return (
            <label key={k} className={`field ${disabled ? "opacity-50" : ""}`} title={r.help}>
              <div className="field-label">
                <span>{r.label}</span>
                <span className="val mono">{fmt(inputs[k], 2)} {r.unit}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={r.step}
                value={inputs[k]}
                disabled={disabled}
                onChange={(e) => dispatch({ type: "draft", inputs: { [k]: Number(e.target.value) } })}
                aria-label={r.label}
                data-testid={`input-${k}`}
              />
              <div className="tiny muted mt-0.5">{disabled ? "Active la intervención para elegir el minuto." : r.help}</div>
            </label>
          );
        })}
        {sc.intervention && (
          <label className="flex items-start gap-2 small mb-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-[var(--accent)]"
              checked={inputs.interventionEnabled}
              onChange={(e) => dispatch({ type: "draft", inputs: { interventionEnabled: e.target.checked } })}
              data-testid="input-intervention"
            />
            <span><span className="font-medium">Aplicar intervención del operador.</span> <span className="muted">{sc.intervention}</span></span>
          </label>
        )}
        <p className="tiny muted mb-3">Las entradas que no aparecen se mantienen en los valores por defecto del escenario para aislar el efecto estudiado.</p>

        <div className="flex gap-2">
          <button
            className="btn btn-primary flex-1"
            onClick={() => runScenario(scenarioId, inputs, "laboratorio")}
            data-testid="run-scenario"
          >
            <Icon.run width={15} /> Ejecutar simulación
          </button>
          <button className="btn" onClick={() => dispatch({ type: "draft", scenarioId })} title="Restaurar valores por defecto">Restablecer</button>
        </div>

        {lastIsThis && activeRun && (
          <div className="card mt-4" data-testid="run-summary">
            <div className="flex items-center justify-between">
              <div className="card-title !mb-1">Resultado {activeRun.id}</div>
              <SimChip />
            </div>
            <dl className="kv mt-1">
              {KPI_DEFS.filter((d) => ["h2ProducedKg", "secKwhKg", "meanEffHhvPct", "maxStackC", "maxTankBar", "firstTripMin", "h2VentedKg", "maxRoomLel"].includes(d.key)).map((d) => [
                <dt key={`${d.key}t`}>{d.label}</dt>,
                <dd key={`${d.key}d`} className="mono">{fmt(activeRun.result.kpis[d.key] as number | null, d.digits)} {activeRun.result.kpis[d.key] !== null && <span className="muted">{d.unit}</span>}</dd>,
              ])}
            </dl>
            <div className="small mt-2">
              {activeRun.result.events.length === 0 ? <span className="muted">Sin eventos.</span> : (
                <span>{activeRun.result.events.filter((e) => e.kind === "alarm" || e.kind === "trip").length} alarmas/disparos · ver pestaña <b>Eventos</b> abajo.</span>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-sm" disabled={baselineRun?.id === activeRun.id} onClick={() => dispatch({ type: "baseline", runId: activeRun.id })}>
                {baselineRun?.id === activeRun.id ? "Es la línea base" : "Usar como línea base"}
              </button>
              <button className="btn btn-sm" onClick={() => { dispatch({ type: "playhead", index: 0 }); dispatch({ type: "playing", playing: true }); }}>Reproducir en la escena</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
