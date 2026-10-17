"use client";

import { scenarioById } from "@/sim/scenarios";
import { useTwin } from "@/state/store";
import { PanelHeader, SeverityTag, fmt, fmtMin } from "../ui";

export default function HistoryPanel() {
  const { state, dispatch } = useTwin();
  const runs = [...state.runs].reverse();
  const allEvents = state.runs.flatMap((r) => r.result.events.filter((e) => e.kind === "alarm" || e.kind === "trip" || e.kind === "mechanical" || e.kind === "intervention").map((e) => ({ run: r, e })));

  return (
    <>
      <PanelHeader
        title="Historial de eventos y escenarios"
        subtitle={`${state.runs.length} corridas en esta sesión`}
        actions={
          <button className="btn btn-sm" onClick={() => { if (window.confirm("¿Borrar todas las corridas y el progreso de la misión de esta sesión?")) dispatch({ type: "clearSession" }); }}>
            Limpiar sesión
          </button>
        }
      />
      <div className="side-body" data-testid="history-panel">
        <p className="tiny muted mb-3">
          Se guardan las entradas de cada corrida en este navegador. Al recargar, cada corrida se re-simula: el motor es determinista, por lo que se obtienen exactamente los mismos resultados.
        </p>
        <div className="space-y-2">
          {runs.map((r) => {
            const sc = scenarioById.get(r.result.scenarioId)!;
            const active = r.id === state.activeRunId;
            const base = r.id === state.baselineRunId;
            const k = r.result.kpis;
            return (
              <div key={r.id} className={`list-btn ${active ? "on" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <button className="text-left min-w-0" onClick={() => dispatch({ type: "activate", runId: r.id })}>
                    <div className="small font-medium truncate"><span className="mono text-[var(--accent)] mr-1.5">{r.id}</span>{r.label}</div>
                    <div className="tiny muted">
                      {sc.code} · {r.origin} · {new Date(r.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1">
                    {active && <span className="chip chip-ok">activa</span>}
                    {base && <span className="chip">línea base</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 tiny">
                  <div><div className="muted">H2</div><div className="mono">{fmt(k.h2ProducedKg, 4)} kg</div></div>
                  <div><div className="muted">p máx.</div><div className="mono">{fmt(k.maxTankBar, 1)} bar</div></div>
                  <div><div className="muted">Disparo</div><div className="mono">{k.firstTripMin === null ? "—" : `${fmt(k.firstTripMin, 1)} min`}</div></div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {!active && <button className="btn btn-sm" onClick={() => dispatch({ type: "activate", runId: r.id })}>Mostrar</button>}
                  {!base && <button className="btn btn-sm" onClick={() => dispatch({ type: "baseline", runId: r.id })}>Usar como base</button>}
                  <button className="btn btn-sm" onClick={() => { dispatch({ type: "draft", scenarioId: r.result.scenarioId, inputs: r.result.inputs }); dispatch({ type: "section", section: "lab" }); }}>Reabrir entradas</button>
                  {state.runs.length > 1 && <button className="btn btn-sm btn-ghost" onClick={() => dispatch({ type: "deleteRun", runId: r.id })}>Eliminar</button>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-title">Eventos relevantes de la sesión</div>
        {allEvents.length === 0 ? <p className="small muted">Ninguna corrida ha generado alarmas, disparos o intervenciones.</p> : (
          <ul className="space-y-1.5">
            {allEvents.map(({ run, e }) => (
              <li key={`${run.id}-${e.id}`}>
                <button
                  className="w-full text-left small hover:text-[var(--accent)]"
                  onClick={() => {
                    dispatch({ type: "activate", runId: run.id });
                    dispatch({ type: "playhead", index: Math.round(e.t / 10) });
                    dispatch({ type: "focusEvent", id: e.id });
                    dispatch({ type: "select", id: e.componentId });
                  }}
                >
                  <span className="mono muted">{run.id}·{e.id}</span> <span className="mono muted">{fmtMin(e.t)}</span> <SeverityTag s={e.severity} /> {e.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="section-title">Preguntas a la guía</div>
        {state.guideLog.length === 0 ? <p className="small muted">Sin consultas.</p> : (
          <ul className="space-y-1 small">
            {state.guideLog.map((g) => (
              <li key={g.id} className="text-[var(--text-2)]">
                «{g.question}» <span className="tiny muted">({g.intent}{g.selectedId ? ` · ${g.selectedId}` : ""}{g.runId ? ` · ${g.runId}` : ""})</span>
              </li>
            ))}
          </ul>
        )}

        <div className="section-title">Recorrido de selección</div>
        <p className="small mono text-[var(--text-2)] break-words">{state.selectionLog.length ? state.selectionLog.join(" → ") : "—"}</p>
      </div>
    </>
  );
}
