"use client";

import { equipmentById, stageById, variableById } from "@/domain/plant";
import { FLUID_LABEL, downstreamOf, instrumentsOn, upstreamOf } from "@/domain/topology";
import { SCENARIOS } from "@/sim/scenarios";
import { equipmentStates } from "@/sim/state-map";
import type { VariableId } from "@/sim/types";
import { useCurrentSample, useTwin } from "@/state/store";
import { Icon } from "./icons";
import { ProvenanceChip, SeverityTag, SimChip, StatusPill, fmt, fmtMin } from "./ui";
import { FLUID_COLOR } from "@/scene/layout";

const TYPE_LABEL: Record<string, string> = {
  pv_array: "Generación fotovoltaica", power_supply: "Electrónica de potencia", plc: "Control", water_purifier: "Tratamiento de agua",
  di_tank: "Tanque de agua", pump: "Bomba", electrolyzer_stack: "Electrolizador PEM", separator: "Separador gas–líquido",
  heat_exchanger: "Intercambiador de calor", chiller: "Enfriador", dryer: "Secador de gas", buffer_tank: "Recipiente a presión",
  relief_valve: "Válvula de seguridad", isolation_valve: "Válvula de aislamiento", vent_stack: "Venteo", fuel_cell: "Celda de combustible",
  ventilation_fan: "Ventilación", enclosure: "Recinto",
};

export default function Inspector() {
  const { state, dispatch, activeRun } = useTwin();
  const sample = useCurrentSample();
  const id = state.selectedId;
  const eq = id ? equipmentById.get(id) : null;
  if (!eq) return null;
  const st = equipmentStates(sample)[eq.id];
  const up = upstreamOf(eq.id);
  const down = downstreamOf(eq.id);
  const ins = instrumentsOn(eq.id);
  const run = activeRun?.result;
  const events = run ? run.events.filter((e) => e.componentId === eq.id && e.kind !== "alarm_clear") : [];
  const scenarios = SCENARIOS.filter((s) => s.focusEquipment.includes(eq.id));
  const select = (x: string) => dispatch({ type: "select", id: x });

  return (
    <aside className="overlay glass inspector" aria-label={`Inspector de ${eq.id}`} data-testid="inspector">
      <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2 border-b border-[var(--line)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono text-[var(--accent)] font-medium">{eq.id}</span>
            <span className="tiny muted">{TYPE_LABEL[eq.type]}</span>
          </div>
          <h3 className="text-[15px] font-semibold leading-tight mt-0.5">{eq.name}</h3>
          <div className="tiny muted mt-0.5">Etapa: {stageById.get(eq.stageId)!.name}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: "select", id: null })} aria-label="Cerrar inspector">
          <Icon.close width={14} />
        </button>
      </div>
      <div className="inspector-body space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={st.status} />
          <ProvenanceChip p={eq.provenance} />
          {!eq.verifiedInUdes && <span className="chip chip-off" title="No existe evidencia de que este equipo esté en la instalación UDES">No verificado en UDES</span>}
        </div>
        {st.status !== "nodata" && (
          <div className="small">
            <span className="muted">Estado simulado{sample ? ` en ${fmtMin(sample.t)}` : ""}: </span>
            {st.label}
          </div>
        )}
        <p className="small leading-relaxed text-[var(--text-2)]">{eq.role}</p>
        {eq.notes && <p className="tiny notice notice-info">{eq.notes}</p>}

        {eq.variableIds.length > 0 && (
          <div>
            <div className="card-title flex items-center justify-between">Variables <SimChip /></div>
            <dl className="kv">
              {eq.variableIds.map((vid) => {
                const v = variableById.get(vid)!;
                const val = sample ? sample.values[vid as VariableId] : null;
                return [
                  <dt key={`${vid}t`} title={v.description}>{v.name}</dt>,
                  <dd key={`${vid}d`} className="mono">{fmt(val, 3)} <span className="muted">{v.unit}</span></dd>,
                ];
              })}
            </dl>
          </div>
        )}

        {ins.length > 0 && (
          <div>
            <div className="card-title">Instrumentos</div>
            <ul className="space-y-1">
              {ins.map((i) => {
                const v = variableById.get(i.variableId)!;
                const val = sample ? sample.values[i.variableId as VariableId] : null;
                const stuck = i.id === "PT-201" && sample?.flags.pt201Stuck;
                return (
                  <li key={i.id} className="flex items-center justify-between gap-2 small">
                    <span><span className="mono">{i.id}</span> <span className="muted">{i.realization === "soft" ? "· virtual" : ""}</span></span>
                    <span className="mono">{fmt(val, 2)} {v.unit} {stuck && <span className="chip chip-off ml-1">congelado</span>}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <div className="card-title">Relaciones de proceso</div>
          {up.length + down.length === 0 && <p className="small muted">Sin conexiones.</p>}
          <ul className="space-y-1">
            {up.map((n) => (
              <li key={n.connection.id}>
                <button className="w-full flex items-center justify-between gap-2 small hover:text-[var(--accent)]" onClick={() => select(n.equipmentId)}>
                  <span className="flex items-center gap-1.5"><span className="muted">←</span><span className="mono">{n.equipmentId}</span> <span className="truncate">{equipmentById.get(n.equipmentId)!.name}</span></span>
                  <span className="tiny mono" style={{ color: FLUID_COLOR[n.connection.fluid] }}>{n.connection.lineTag}</span>
                </button>
              </li>
            ))}
            {down.map((n) => (
              <li key={n.connection.id}>
                <button className="w-full flex items-center justify-between gap-2 small hover:text-[var(--accent)]" onClick={() => select(n.equipmentId)}>
                  <span className="flex items-center gap-1.5"><span className="muted">→</span><span className="mono">{n.equipmentId}</span> <span className="truncate">{equipmentById.get(n.equipmentId)!.name}</span></span>
                  <span className="tiny mono" style={{ color: FLUID_COLOR[n.connection.fluid] }} title={FLUID_LABEL[n.connection.fluid]}>{n.connection.lineTag}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {eq.specs.length > 0 && (
          <div>
            <div className="card-title">Especificaciones</div>
            <ul className="space-y-1">
              {eq.specs.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 small">
                  <span className="muted">{s.label}</span>
                  <span className="flex items-center gap-1.5"><span className="mono">{s.value}</span><ProvenanceChip p={s.provenance} /></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {run && (
          <div>
            <div className="card-title">Eventos en la corrida {activeRun!.id}</div>
            {events.length === 0 ? <p className="small muted">Sin eventos para este equipo.</p> : (
              <ul className="space-y-1">
                {events.map((e) => (
                  <li key={e.id}>
                    <button
                      className="w-full text-left small hover:text-[var(--accent)]"
                      onClick={() => { dispatch({ type: "focusEvent", id: e.id }); dispatch({ type: "playhead", index: Math.round(e.t / 10) }); }}
                    >
                      <span className="mono muted">{fmtMin(e.t)}</span> <SeverityTag s={e.severity} /> {e.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <div className="card-title">Interacciones</div>
          <div className="flex flex-wrap gap-1.5">
            <button className="btn btn-sm" onClick={() => dispatch({ type: "isolate", value: !state.isolate })}>{state.isolate ? "Mostrar todo" : "Aislar con conexiones"}</button>
            <button className="btn btn-sm" onClick={() => dispatch({ type: "section", section: "explorer" })}>Ver en explorador</button>
            <button className="btn btn-sm" onClick={() => dispatch({ type: "section", section: "guide" })}>Preguntar a la guía</button>
          </div>
          {scenarios.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="tiny muted">Escenarios donde este equipo es protagonista:</div>
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left small hover:text-[var(--accent)]"
                  onClick={() => { dispatch({ type: "draft", scenarioId: s.id }); dispatch({ type: "section", section: "lab" }); }}
                >
                  <span className="mono text-[var(--accent)]">{s.code}</span> {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="notice tiny">
          <strong>Procedencia y confianza:</strong> configuración {eq.provenance === "conceptual" ? "conceptual" : eq.provenance}; no verificada en la planta UDES. Los valores mostrados son salidas de una simulación determinista con parámetros ilustrativos — confianza adecuada para fines educativos, no para diseño ni operación.
        </div>
      </div>
    </aside>
  );
}
