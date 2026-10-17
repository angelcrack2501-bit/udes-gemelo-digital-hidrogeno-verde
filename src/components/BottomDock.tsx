"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, NUMERICS, STORAGE, THERMAL } from "@/domain/parameters";
import { equipmentById } from "@/domain/plant";
import { compareRuns, inputDiff } from "@/sim/compare";
import { INPUT_RANGES, scenarioById } from "@/sim/scenarios";
import type { SimulationResult, VariableId } from "@/sim/types";
import { useTwin } from "@/state/store";
import LineChart, { type ChartMarker, type ChartSeries, type ChartThreshold } from "./LineChart";
import { Icon } from "./icons";
import { EmptyState, SeverityTag, SimChip, fmt, fmtMin } from "./ui";

type GroupId = "pressure" | "temperature" | "production" | "power" | "efficiency" | "room";

const GROUPS: Record<GroupId, { title: string; unit: string; vars: { id: VariableId; label: string; color: string }[]; thresholds: ChartThreshold[] }> = {
  pressure: {
    title: "Presión TK-201", unit: "bar",
    vars: [{ id: "p_tank", label: "Real (modelo)", color: "#22d3ee" }, { id: "p_tank_meas", label: "PT-201 (medida)", color: "#f8fafc" }],
    thresholds: [{ value: LIMITS.PAH.value, label: "PAH", color: "#f59e0b" }, { value: LIMITS.PAHH.value, label: "PAHH", color: "#ef4444" }, { value: STORAGE.PSV_SET.value, label: "PSV", color: "#f472b6" }],
  },
  temperature: {
    title: "Temperatura de pila TT-101", unit: "°C",
    vars: [{ id: "t_stack", label: "T pila", color: "#fb923c" }],
    thresholds: [{ value: THERMAL.T_SET.value, label: "Consigna", color: "#64748b" }, { value: LIMITS.TAH.value, label: "TAH", color: "#f59e0b" }, { value: LIMITS.TAHH.value, label: "TAHH", color: "#ef4444" }],
  },
  production: {
    title: "Producción y consumo de H2", unit: "kg/h",
    vars: [{ id: "h2_kgh", label: "Producción", color: "#22d3ee" }, { id: "fc_h2", label: "Consumo FC-401", color: "#a3e635" }],
    thresholds: [],
  },
  power: {
    title: "Potencia", unit: "kW",
    vars: [{ id: "p_stack", label: "Pila", color: "#f2b33d" }, { id: "pv_avail", label: "FV disponible", color: "#fde68a" }, { id: "fc_power", label: "FC-401", color: "#a3e635" }],
    thresholds: [],
  },
  efficiency: {
    title: "Eficiencia de pila (PCS)", unit: "%",
    vars: [{ id: "eff_hhv", label: "η PCS", color: "#2dd4bf" }],
    thresholds: [],
  },
  room: {
    title: "H2 en el recinto GD-301", unit: "% LIE",
    vars: [{ id: "room_lel", label: "Concentración", color: "#f472b6" }],
    thresholds: [{ value: LIMITS.GD_AH.value, label: "Alarma", color: "#f59e0b" }, { value: LIMITS.GD_AHH.value, label: "Disparo", color: "#ef4444" }],
  },
};

const DEFAULT_GROUPS: Record<string, [GroupId, GroupId]> = {
  normal: ["production", "pressure"],
  power_change: ["power", "efficiency"],
  demand_loss: ["pressure", "production"],
  cooling_fault: ["temperature", "power"],
  sensor_stuck: ["pressure", "production"],
  leak_ventilation: ["room", "pressure"],
};

function seriesFor(run: SimulationResult, group: GroupId, dashed = false, suffix = ""): ChartSeries[] {
  return GROUPS[group].vars.map((v) => ({
    id: `${v.id}${suffix}`,
    label: `${v.label}${suffix}`,
    color: v.color,
    dashed,
    points: run.samples.map((s) => ({ t: s.t, v: s.values[v.id] })),
  }));
}

function markersFor(run: SimulationResult): ChartMarker[] {
  return run.events
    .filter((e) => e.kind !== "alarm_clear")
    .map((e) => ({ t: e.t, color: e.severity === "critica" ? "#ef4444" : e.severity === "advertencia" ? "#f59e0b" : "#93c5fd", label: `${e.id} ${e.title}` }));
}

export default function BottomDock() {
  const { state, dispatch, activeRun, baselineRun } = useTwin();
  const [tab, setTab] = useState<"charts" | "events" | "compare">("charts");
  const [open, setOpen] = useState(true);
  const [groups, setGroups] = useState<[GroupId, GroupId] | null>(null);
  const run = activeRun?.result ?? null;
  const g: [GroupId, GroupId] = groups ?? (run ? DEFAULT_GROUPS[run.scenarioId] : ["production", "pressure"]);
  const samples = run?.samples ?? [];
  const sample = samples[Math.min(state.playhead, samples.length - 1)];
  const xMax = run ? run.inputs.durationMin * 60 : 3600;

  // Reproducción: avanza la posición según la velocidad (s simulados por s real).
  const acc = useRef(0);
  useEffect(() => {
    if (!state.playing || !run) return;
    const id = window.setInterval(() => {
      acc.current += (state.speed * 0.1) / NUMERICS.SAMPLE_EVERY_S;
      const steps = Math.floor(acc.current);
      if (steps > 0) {
        acc.current -= steps;
        const next = state.playhead + steps;
        if (next >= run.samples.length - 1) {
          dispatch({ type: "playhead", index: run.samples.length - 1 });
          dispatch({ type: "playing", playing: false });
        } else dispatch({ type: "playhead", index: next });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [state.playing, state.speed, state.playhead, run, dispatch]);

  const seek = (t: number) => dispatch({ type: "playhead", index: Math.round(t / NUMERICS.SAMPLE_EVERY_S) });
  const compareSame = !baselineRun || !activeRun || baselineRun.id === activeRun.id;

  return (
    <section className="dock" aria-label="Resultados de simulación">
      <div className="dock-bar">
        <div className="flex items-center gap-1">
          <button
            className="btn btn-sm"
            disabled={!run}
            onClick={() => {
              if (!run) return;
              if (state.playhead >= run.samples.length - 1) dispatch({ type: "playhead", index: 0 });
              dispatch({ type: "playing", playing: !state.playing });
            }}
            aria-label={state.playing ? "Pausar reproducción" : "Reproducir corrida"}
            data-testid="play"
          >
            {state.playing ? <Icon.pause width={14} /> : <Icon.play width={14} />}
            {state.playing ? "Pausa" : "Reproducir"}
          </button>
          <select className="input !h-[26px] !w-[78px] !text-[12px] !px-1" value={state.speed} onChange={(e) => dispatch({ type: "speed", speed: Number(e.target.value) })} aria-label="Velocidad">
            {[30, 60, 120, 300].map((s) => <option key={s} value={s}>×{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={Math.max(0, samples.length - 1)}
            value={Math.min(state.playhead, Math.max(0, samples.length - 1))}
            disabled={!run}
            onChange={(e) => dispatch({ type: "playhead", index: Number(e.target.value) })}
            aria-label="Posición en la corrida"
          />
          <span className="mono small whitespace-nowrap w-[150px] text-right">{sample ? `${fmtMin(sample.t)} / ${fmtMin(xMax)}` : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          {activeRun && (
            <span className="chip mono" title="Corrida mostrada en la escena">
              {activeRun.id} · {scenarioById.get(activeRun.result.scenarioId)!.code}
            </span>
          )}
          <SimChip />
        </div>
        <div className="tabs ml-2">
          <button className={`tab ${tab === "charts" ? "on" : ""}`} onClick={() => { setTab("charts"); setOpen(true); }}>Variables</button>
          <button className={`tab ${tab === "events" ? "on" : ""}`} onClick={() => { setTab("events"); setOpen(true); }}>
            Eventos{run && run.events.length ? ` (${run.events.length})` : ""}
          </button>
          <button className={`tab ${tab === "compare" ? "on" : ""}`} onClick={() => { setTab("compare"); setOpen(true); }}>Comparación</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-label={open ? "Contraer panel" : "Expandir panel"}>
          {open ? "▾" : "▴"}
        </button>
      </div>
      {open && (
        <div className="dock-content">
          {!run ? (
            <EmptyState title="Sin corridas">Abra el Laboratorio de simulación y ejecute un escenario.</EmptyState>
          ) : tab === "charts" ? (
            <div className="grid grid-cols-2 gap-4 h-full p-3">
              {[0, 1].map((k) => {
                const gid = g[k];
                const grp = GROUPS[gid];
                const series = [...seriesFor(run, gid)];
                if (!compareSame && baselineRun) series.push(...seriesFor(baselineRun.result, gid, true, " (base)"));
                return (
                  <div key={k} className="flex flex-col min-w-0">
                    <LineChart
                      title={grp.title}
                      unit={grp.unit}
                      series={series}
                      thresholds={grp.thresholds}
                      markers={markersFor(run)}
                      cursorT={sample?.t}
                      xMax={Math.max(xMax, !compareSame && baselineRun ? baselineRun.result.inputs.durationMin * 60 : 0)}
                      height={158}
                      onSeek={seek}
                      badge={
                        <select
                          className="input !h-[22px] !w-auto !text-[11px] !px-1"
                          value={gid}
                          onChange={(e) => setGroups(k === 0 ? [e.target.value as GroupId, g[1]] : [g[0], e.target.value as GroupId])}
                          aria-label={`Variable de la gráfica ${k + 1}`}
                        >
                          {(Object.keys(GROUPS) as GroupId[]).map((id) => <option key={id} value={id}>{GROUPS[id].title}</option>)}
                        </select>
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : tab === "events" ? (
            <EventTable run={run} />
          ) : (
            <CompareView />
          )}
        </div>
      )}
    </section>
  );
}

function EventTable({ run }: { run: SimulationResult }) {
  const { state, dispatch } = useTwin();
  if (run.events.length === 0) return <EmptyState title="La corrida no generó eventos">Ninguna variable cruzó umbrales de alarma y no hubo perturbaciones.</EmptyState>;
  return (
    <div className="h-full overflow-auto px-3 pb-3">
      <table className="table" data-testid="event-table">
        <thead className="sticky top-0 bg-[var(--panel)]">
          <tr><th>ID</th><th>t</th><th>Severidad</th><th>Evento</th><th>Equipo</th><th>Regla / umbral</th><th>Valor</th><th>Respuesta esperada del sistema</th><th>Resultado</th></tr>
        </thead>
        <tbody>
          {run.events.map((e) => (
            <tr
              key={e.id}
              className={`cursor-pointer hover:bg-[#13202f] ${state.focusEventId === e.id ? "bg-[#0d2533]" : ""}`}
              onClick={() => {
                dispatch({ type: "focusEvent", id: e.id });
                dispatch({ type: "playhead", index: Math.round(e.t / NUMERICS.SAMPLE_EVERY_S) });
                dispatch({ type: "select", id: e.componentId });
              }}
            >
              <td className="mono">{e.id}</td>
              <td className="mono whitespace-nowrap">{fmtMin(e.t)}</td>
              <td><SeverityTag s={e.severity} /></td>
              <td className="min-w-[200px]">{e.title}</td>
              <td className="mono" title={equipmentById.get(e.componentId)?.name}>{e.componentId}</td>
              <td className="mono min-w-[150px]">{e.rule}</td>
              <td className="mono whitespace-nowrap">{e.value !== null ? `${fmt(e.value, 2)} ${e.unit ?? ""}` : "—"}</td>
              <td className="min-w-[220px] muted">{e.expectedSystemResponse}</td>
              <td className="min-w-[200px]">{e.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareView() {
  const { activeRun, baselineRun } = useTwin();
  if (!activeRun || !baselineRun) return <EmptyState title="Faltan corridas" />;
  if (activeRun.id === baselineRun.id) {
    return <EmptyState title="La corrida activa es la línea base">Ejecute otro escenario o elija una línea base distinta en el Historial para comparar.</EmptyState>;
  }
  const deltas = compareRuns(baselineRun.result, activeRun.result);
  const diffs = inputDiff(baselineRun.result, activeRun.result);
  const verdictColor = { mejor: "var(--ok)", peor: "var(--crit)", igual: "var(--text-3)", "n/a": "var(--text-3)" } as const;
  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 h-full p-3 overflow-hidden">
      <div className="overflow-auto">
        <table className="table" data-testid="compare-table">
          <thead className="sticky top-0 bg-[var(--panel)]">
            <tr>
              <th>Indicador</th>
              <th className="text-right">Base · {baselineRun.id}</th>
              <th className="text-right">Activa · {activeRun.id}</th>
              <th className="text-right">Δ</th>
              <th>Lectura</th>
            </tr>
          </thead>
          <tbody>
            {deltas.map((d) => (
              <tr key={d.def.key} title={d.def.description}>
                <td>{d.def.label} <span className="muted tiny">{d.def.unit}</span></td>
                <td className="text-right mono">{fmt(d.base, d.def.digits)}</td>
                <td className="text-right mono">{fmt(d.mod, d.def.digits)}</td>
                <td className="text-right mono">{d.delta === null ? "—" : `${d.delta > 0 ? "+" : ""}${fmt(d.delta, d.def.digits)}`}</td>
                <td style={{ color: verdictColor[d.verdict] }} className="small">{d.verdict === "n/a" ? (d.delta === null ? "—" : "informativo") : d.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card overflow-auto">
        <div className="card-title">Qué cambió en las entradas</div>
        {diffs.length === 0 ? <p className="small muted">Mismas entradas: resultados idénticos (determinismo).</p> : (
          <ul className="space-y-1.5 small">
            {diffs.map((d) => (
              <li key={d.key} className="flex justify-between gap-2">
                <span className="muted">{d.key === "scenarioId" ? "Escenario" : INPUT_RANGES[d.key as keyof typeof INPUT_RANGES]?.label ?? (d.key === "sourceMode" ? "Fuente de potencia" : d.key === "interventionEnabled" ? "Intervención" : d.key)}</span>
                <span className="mono text-right">{String(d.base)} → {String(d.mod)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="tiny muted mt-3">«Mejor/peor» usa la dirección declarada de cada indicador (p. ej. menor presión máxima = mejor). Las curvas de la línea base aparecen discontinuas en la pestaña Variables.</p>
      </div>
    </div>
  );
}
