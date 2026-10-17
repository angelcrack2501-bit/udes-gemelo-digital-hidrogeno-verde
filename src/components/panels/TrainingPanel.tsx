"use client";

import { useState } from "react";
import { LIMITS } from "@/domain/parameters";
import { equipmentById } from "@/domain/plant";
import { scenarioById } from "@/sim/scenarios";
import { useTwin } from "@/state/store";
import {
  DEVIATION_FAULT_MIN, MISSION, REQUIRED_INSPECTION, canAdvance, emptyProgress, evaluateMission,
  type MissionProgress, type MissionQuestion, type MissionRuns,
} from "@/training/mission";
import { Icon } from "../icons";
import { PanelHeader, SimChip, fmt } from "../ui";

export default function TrainingPanel() {
  const { state, dispatch, runScenario } = useTwin();
  const p = state.mission;
  const step = MISSION.steps[p.stepIndex];
  const set = (patch: Partial<MissionProgress>) => dispatch({ type: "mission", progress: { ...p, ...patch } });
  const answer = (id: string, v: string) => set({ answers: { ...p.answers, [id]: v } });
  const runOf = (id?: string) => state.runs.find((r) => r.id === id)?.result;
  const runs: MissionRuns = { baseline: runOf(p.runIds.baseline), deviation: runOf(p.runIds.deviation), decision: runOf(p.runIds.decision) };
  const adv = canAdvance(step.kind, p);
  const [power, setPower] = useState(3.5);
  const [interv, setInterv] = useState(false);
  const [intervMin, setIntervMin] = useState(20);

  const runMission = (kind: "baseline" | "deviation" | "decision") => {
    const sc = kind === "baseline" ? "normal" : "demand_loss";
    const def = scenarioById.get(sc)!.defaults;
    const inputs = kind === "decision"
      ? { ...def, faultAtMin: DEVIATION_FAULT_MIN, durationMin: 60, powerSetKw: power, interventionEnabled: interv, interventionAtMin: intervMin }
      : { ...def, faultAtMin: DEVIATION_FAULT_MIN, durationMin: 60 };
    const label = { baseline: "M-01 · línea base", deviation: "M-01 · desviación", decision: "M-01 · decisión" }[kind];
    const run = runScenario(sc, inputs, "misión", label);
    if (kind === "baseline") dispatch({ type: "baseline", runId: run.id });
    dispatch({ type: "mission", progress: { ...p, runIds: { ...p.runIds, [kind]: run.id } } });
  };

  const evaluation = step.kind === "summary" ? evaluateMission(p, runs) : null;

  return (
    <>
      <PanelHeader title="Centro de entrenamiento" subtitle={`Misión ${MISSION.id} · ${MISSION.durationEstimate}`} />
      <div className="side-body" data-testid="training-panel">
        <div className="card">
          <div className="text-[13.5px] font-semibold leading-snug">{MISSION.title}</div>
          <p className="small muted mt-1 leading-relaxed">{MISSION.objective}</p>
          <div className="flex gap-1 mt-3" aria-label="Progreso de la misión">
            {MISSION.steps.map((s, i) => (
              <div key={s.kind} title={s.title} className="h-1.5 flex-1 rounded-full" style={{ background: i < p.stepIndex ? "var(--accent-2)" : i === p.stepIndex ? "var(--accent)" : "#22324a" }} />
            ))}
          </div>
          <div className="tiny muted mt-1">Paso {p.stepIndex + 1} de {MISSION.steps.length}: {step.title}</div>
        </div>

        <div className="section-title">{step.title}</div>
        <div className="space-y-2 small leading-relaxed text-[var(--text-2)]">
          {step.body.map((b) => <p key={b}>{b}</p>)}
        </div>

        {step.kind === "inspect" && (
          <div className="card mt-3">
            <div className="card-title">Equipos a inspeccionar</div>
            <ul className="space-y-1">
              {REQUIRED_INSPECTION.map((id) => {
                const done = p.inspected.includes(id);
                return (
                  <li key={id}>
                    <button className="w-full flex items-center justify-between small hover:text-[var(--accent)]" onClick={() => dispatch({ type: "select", id })}>
                      <span className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded grid place-items-center text-[10px] ${done ? "bg-[var(--accent-2)] text-[#042f2e]" : "border border-[var(--line-2)]"}`}>{done ? "✓" : ""}</span>
                        <span className="mono">{id}</span> {equipmentById.get(id)!.name}
                      </span>
                      <span className="tiny muted">{done ? "inspeccionado" : "seleccionar"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(step.kind === "baseline" || step.kind === "deviation") && (
          <div className="card mt-3">
            {(() => {
              const kind = step.kind as "baseline" | "deviation";
              const r = runs[kind];
              return (
                <>
                  <button className="btn btn-primary w-full" onClick={() => runMission(kind)} data-testid={`mission-run-${kind}`}>
                    <Icon.run width={15} /> {r ? "Volver a ejecutar" : "Ejecutar"} {kind === "baseline" ? "ESC-01 (línea base)" : "ESC-03 (pérdida de demanda)"}
                  </button>
                  {r && (
                    <div className="small mt-2 flex items-center justify-between">
                      <span className="muted">Corrida {p.runIds[kind]} lista · revise KPI, gráficas y eventos abajo.</span>
                      <SimChip />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {step.kind === "decision" && (
          <div className="card mt-3 space-y-3">
            <label className="field !mb-0">
              <div className="field-label"><span>Consigna de potencia</span><span className="val mono">{fmt(power, 1)} kW</span></div>
              <input type="range" min={0.5} max={5} step={0.1} value={power} onChange={(e) => setPower(Number(e.target.value))} aria-label="Potencia de la decisión" />
            </label>
            <label className="flex items-center gap-2 small cursor-pointer">
              <input type="checkbox" className="accent-[var(--accent)]" checked={interv} onChange={(e) => setInterv(e.target.checked)} data-testid="mission-intervention" />
              Reabrir XV-202 (intervención del operador)
            </label>
            <label className={`field !mb-0 ${interv ? "" : "opacity-50"}`}>
              <div className="field-label"><span>Minuto de la intervención</span><span className="val mono">{intervMin} min</span></div>
              <input type="range" min={DEVIATION_FAULT_MIN + 1} max={60} step={1} value={intervMin} disabled={!interv} onChange={(e) => setIntervMin(Number(e.target.value))} aria-label="Minuto de intervención" data-testid="mission-intervention-min" />
            </label>
            <button className="btn btn-primary w-full" onClick={() => runMission("decision")} data-testid="mission-run-decision">
              <Icon.run width={15} /> Ejecutar decisión (intento)
            </button>
            {runs.decision && (
              <div className="small space-y-1">
                <div className="muted">Último intento ({p.runIds.decision}):</div>
                <Criterion ok={runs.decision.kpis.firstTripMin === null} text={runs.decision.kpis.firstTripMin === null ? "Sin disparos" : `Disparo ${runs.decision.kpis.tripCause} en ${fmt(runs.decision.kpis.firstTripMin, 1)} min`} />
                <Criterion ok={runs.decision.kpis.maxTankBar < LIMITS.PAH.value} text={`Presión máxima ${fmt(runs.decision.kpis.maxTankBar, 2)} bar (límite ${LIMITS.PAH.value})`} />
                {runs.baseline && (
                  <Criterion
                    ok={runs.decision.kpis.h2ProducedKg / runs.baseline.kpis.h2ProducedKg >= 0.8}
                    text={`Producción ${fmt((runs.decision.kpis.h2ProducedKg / runs.baseline.kpis.h2ProducedKg) * 100, 0)} % de la línea base (mín. 80 %)`}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {step.questions.length > 0 && (
          <div className="mt-4 space-y-4">
            {step.questions.map((q) => <Question key={q.id} q={q} value={p.answers[q.id] ?? ""} onChange={(v) => answer(q.id, v)} />)}
          </div>
        )}

        {evaluation && (
          <div className="mt-2 space-y-3" data-testid="mission-summary">
            <div className="card text-center">
              <div className="tiny muted uppercase tracking-wider">Puntaje</div>
              <div className="text-[34px] font-semibold mono leading-tight">{evaluation.total}<span className="text-[16px] muted">/{evaluation.max}</span></div>
              <div className="small" style={{ color: evaluation.total >= 70 ? "var(--ok)" : evaluation.total >= 50 ? "var(--warn)" : "var(--crit)" }}>{evaluation.level}</div>
            </div>
            {evaluation.criteria.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="small font-medium"><span className="mono muted mr-1">{c.id}</span>{c.title}</span>
                  <span className="mono small">{c.score}/{c.max}</span>
                </div>
                <div className="h-1 rounded-full bg-[#22324a] mt-1.5"><div className="h-1 rounded-full bg-[var(--accent-2)]" style={{ width: `${(c.score / c.max) * 100}%` }} /></div>
                <ul className="mt-2 space-y-1 tiny text-[var(--text-2)] list-disc pl-4">{c.feedback.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ))}
            <p className="tiny muted">Rúbrica: C1 Inspección (10) · C2 Línea base (20) · C3 Eventos (20) · C4 Decisión (30) · C5 Capas de protección (20). Las respuestas esperadas se calculan a partir de las corridas que usted ejecutó.</p>
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => dispatch({ type: "section", section: "studio" })}>Volver a la escena</button>
              <button className="btn" onClick={() => dispatch({ type: "mission", progress: emptyProgress() })}>Reiniciar misión</button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-6 pt-3 border-t border-[var(--line)]">
          <button className="btn" disabled={p.stepIndex === 0} onClick={() => set({ stepIndex: p.stepIndex - 1 })}>Atrás</button>
          {!adv.ok && <span className="tiny text-[var(--warn)] text-center">{adv.reason}</span>}
          {p.stepIndex < MISSION.steps.length - 1 && (
            <button
              className="btn btn-primary"
              disabled={!adv.ok}
              onClick={() => set({ stepIndex: p.stepIndex + 1, completed: p.stepIndex + 1 === MISSION.steps.length - 1 })}
              data-testid="mission-next"
            >
              {p.stepIndex === 0 ? "Comenzar" : p.stepIndex === MISSION.steps.length - 2 ? "Ver evaluación" : "Siguiente"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Criterion({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: ok ? "var(--ok)" : "var(--crit)" }}>{ok ? "✓" : "✗"}</span>
      <span>{text}</span>
    </div>
  );
}

function Question({ q, value, onChange }: { q: MissionQuestion; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="small font-medium mb-1.5">{q.prompt}</legend>
      {q.type === "number" ? (
        <div className="flex items-center gap-2">
          <input className="input mono" inputMode="decimal" placeholder="valor" value={value} onChange={(e) => onChange(e.target.value)} aria-label={q.prompt} data-testid={`q-${q.id}`} />
          <span className="small muted whitespace-nowrap">{q.unit}</span>
        </div>
      ) : (
        <div className="space-y-1">
          {q.options!.map((o) => (
            <label key={o.value} className={`list-btn !py-2 flex items-start gap-2 cursor-pointer small ${value === o.value ? "on" : ""}`}>
              <input type="radio" name={q.id} className="mt-0.5 accent-[var(--accent)]" checked={value === o.value} onChange={() => onChange(o.value)} data-testid={`q-${q.id}-${o.value}`} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
