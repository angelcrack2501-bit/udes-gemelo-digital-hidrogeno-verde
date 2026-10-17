"use client";

import { useMemo, useState } from "react";
import { CONNECTIONS, EQUIPMENT, STAGES, equipmentById } from "@/domain/plant";
import { FLUID_LABEL, PLANT_MODEL, influencePath, reachableFrom, validatePlant } from "@/domain/topology";
import type { Fluid } from "@/domain/types";
import { FLUID_COLOR } from "@/scene/layout";
import { equipmentStates } from "@/sim/state-map";
import { useCurrentSample, useTwin } from "@/state/store";
import { PanelHeader, STATUS_CSS } from "../ui";

const POS: Record<string, [number, number]> = {
  "PV-001": [40, 40], "PSU-001": [120, 40], "PLC-001": [40, 110], "EL-101": [200, 120],
  "SEP-101": [280, 60], "DRY-201": [350, 60], "TK-201": [420, 60], "XV-202": [420, 140], "FC-401": [420, 215],
  "PSV-201": [350, 140], "VS-301": [350, 215], "SEP-102": [280, 185], "P-102": [215, 255], "HX-101": [140, 200],
  "CH-101": [40, 250], "P-103": [100, 290], "WP-001": [170, 305], "TK-001": [245, 305], "P-001": [320, 280],
  "FAN-301": [40, 180], "ENC-301": [110, 160],
};

function Schematic({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const sample = useCurrentSample();
  const states = equipmentStates(sample);
  const down = useMemo(() => new Set(selected ? reachableFrom(selected, "down") : []), [selected]);
  const up = useMemo(() => new Set(selected ? reachableFrom(selected, "up") : []), [selected]);
  const W = 54;
  const H = 22;
  return (
    <svg viewBox="0 0 470 330" className="w-full h-auto select-none" role="img" aria-label="Esquema de topología del proceso" data-testid="schematic">
      <defs>
        {(Object.keys(FLUID_COLOR) as Fluid[]).map((f) => (
          <marker key={f} id={`arr-${f}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={FLUID_COLOR[f]} />
          </marker>
        ))}
      </defs>
      {CONNECTIONS.map((c) => {
        const [x1, y1] = POS[c.from];
        const [x2, y2] = POS[c.to];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        // recorta la línea al borde de las cajas
        const t1 = Math.min(Math.abs((W / 2) / (dx || 1e-6)), Math.abs((H / 2) / (dy || 1e-6))) * len;
        const sx = x1 + (dx / len) * Math.min(t1, len / 2);
        const sy = y1 + (dy / len) * Math.min(t1, len / 2);
        const ex = x2 - (dx / len) * Math.min(t1 + 2, len / 2);
        const ey = y2 - (dy / len) * Math.min(t1 + 2, len / 2);
        const incident = selected && (c.from === selected || c.to === selected);
        const faded = selected && !incident;
        return (
          <line
            key={c.id}
            x1={sx} y1={sy} x2={ex} y2={ey}
            stroke={FLUID_COLOR[c.fluid]}
            strokeWidth={incident ? 2.4 : 1.3}
            strokeOpacity={faded ? 0.25 : 0.9}
            strokeDasharray={c.fluid === "signal" ? "3 3" : undefined}
            markerEnd={`url(#arr-${c.fluid})`}
          >
            <title>{`${c.lineTag}: ${c.from} → ${c.to} (${FLUID_LABEL[c.fluid]})`}</title>
          </line>
        );
      })}
      {EQUIPMENT.map((e) => {
        const [x, y] = POS[e.id];
        const isSel = e.id === selected;
        const rel = down.has(e.id) ? "down" : up.has(e.id) ? "up" : null;
        const st = states[e.id];
        return (
          <g key={e.id} transform={`translate(${x - W / 2},${y - H / 2})`} className="cursor-pointer" onClick={() => onSelect(e.id)}>
            <rect
              width={W} height={H} rx={4}
              fill={isSel ? "#0d3546" : "#111c2a"}
              stroke={isSel ? "#22d3ee" : rel === "down" ? "#22d3ee88" : rel === "up" ? "#f59e0b88" : "#2c405c"}
              strokeWidth={isSel ? 1.8 : 1}
            />
            <circle cx={7} cy={H / 2} r={3} fill={STATUS_CSS[st.status]} />
            <text x={W / 2 + 4} y={H / 2 + 3.5} textAnchor="middle" fontSize={9.5} fill={isSel ? "#e0fbff" : "#c3d1e0"} fontFamily="var(--font-plex-mono)">{e.id}</text>
            <title>{`${e.name} — ${st.label}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default function ExplorerPanel() {
  const { state, dispatch } = useTwin();
  const sample = useCurrentSample();
  const states = equipmentStates(sample);
  const sel = state.selectedId;
  const [target, setTarget] = useState<string>("FC-401");
  const issues = useMemo(() => validatePlant(PLANT_MODEL), []);
  const path = sel ? influencePath(sel, target) : null;
  const select = (id: string) => dispatch({ type: "select", id });

  return (
    <>
      <PanelHeader title="Explorador de proceso" subtitle={`${EQUIPMENT.length} equipos · ${CONNECTIONS.length} conexiones tipadas`} />
      <div className="side-body">
        <div className="card !p-2">
          <Schematic selected={sel} onSelect={select} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1">
            {(["h2", "o2", "di_water", "coolant", "electric", "signal", "vent"] as Fluid[]).map((f) => (
              <span key={f} className="tiny flex items-center gap-1 muted">
                <span className="inline-block w-3 h-[2px]" style={{ background: FLUID_COLOR[f] }} /> {FLUID_LABEL[f]}
              </span>
            ))}
          </div>
          {sel && <p className="tiny muted px-1 pt-1">Borde cian: aguas abajo de {sel} · borde ámbar: aguas arriba.</p>}
        </div>

        <div className="card">
          <div className="card-title">Ruta de influencia</div>
          {!sel ? <p className="small muted">Seleccione un equipo de origen.</p> : (
            <>
              <div className="flex items-center gap-2 small mb-2">
                <span className="mono text-[var(--accent)]">{sel}</span>
                <span className="muted">→</span>
                <select className="input !h-[28px]" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Equipo de destino">
                  {EQUIPMENT.filter((e) => e.id !== sel).map((e) => <option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}
                </select>
              </div>
              {path === null ? (
                <p className="small muted">{target} no es alcanzable desde {sel} siguiendo el sentido del flujo: un cambio en {sel} no se propaga a {target} a través de las conexiones modeladas.</p>
              ) : (
                <ol className="space-y-1 small">
                  {path.map((c, i) => (
                    <li key={c.id} className="flex items-start gap-2">
                      <span className="mono muted w-4 text-right">{i + 1}</span>
                      <span>
                        <button className="mono hover:text-[var(--accent)]" onClick={() => select(c.from)}>{c.from}</button>
                        <span className="muted"> → </span>
                        <button className="mono hover:text-[var(--accent)]" onClick={() => select(c.to)}>{c.to}</button>
                        <span className="tiny ml-1.5" style={{ color: FLUID_COLOR[c.fluid] }}>{c.lineTag} · {FLUID_LABEL[c.fluid]}</span>
                        <div className="tiny muted">{c.description}</div>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        <div className="section-title">Equipos por etapa</div>
        {STAGES.map((st) => (
          <div key={st.id} className="mb-3">
            <div className="small font-medium flex items-center gap-2"><span className="mono muted">{st.order}</span>{st.name}</div>
            <div className="tiny muted mb-1">{st.description}</div>
            <div className="space-y-1">
              {EQUIPMENT.filter((e) => e.stageId === st.id).map((e) => (
                <button key={e.id} className={`list-btn !py-1.5 ${sel === e.id ? "on" : ""}`} onClick={() => select(e.id)} data-testid={`tree-${e.id}`}>
                  <div className="flex items-center justify-between gap-2 small">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="dot" style={{ background: STATUS_CSS[states[e.id].status] }} />
                      <span className="mono">{e.id}</span>
                      <span className="truncate text-[var(--text-2)]">{e.name}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={`notice ${issues.length ? "" : "notice-info"}`}>
          <strong>Validación de topología:</strong>{" "}
          {issues.length === 0
            ? "sin errores — identificadores únicos, referencias íntegras y fluidos compatibles en todas las conexiones."
            : `${issues.length} observaciones: ${issues.map((i) => `${i.ref} ${i.message}`).join("; ")}`}
          <div className="tiny mt-1 opacity-80">Las relaciones provienen de conexiones explícitas, no de la proximidad geométrica. Equipos: {equipmentById.size}.</div>
        </div>
      </div>
    </>
  );
}
