"use client";

import { useState } from "react";
import { PARAMETER_GROUPS } from "@/domain/parameters";
import { EQUIPMENT, stageById } from "@/domain/plant";
import { EQUATIONS } from "@/sim/model-docs";
import { SCENARIOS } from "@/sim/scenarios";
import { ALARM_RULES } from "@/sim/rules";
import { useTwin } from "@/state/store";
import { Icon } from "./icons";
import { ProvenanceChip, fmt } from "./ui";

type Tab = "model" | "params" | "scenarios" | "plant" | "refs" | "limits";

const REFS = [
  {
    cite: "Shah, M. P. et al. (2026). Development of a Digital Twin for Hydrogen Dispersion and Safety Assessment in an Electrolyzer-Based Hydrogen Production Facility: Preprint. NLR/CP-5700-94061. National Laboratory of the Rockies (antes NREL).",
    url: "https://docs.nlr.gov/docs/fy26osti/94061.pdf",
    status: "Texto completo leído",
    use: "Marco de seguridad y dispersión (CFD estacionario, exterior). NO valida nuestro modelo de mezcla perfecta.",
  },
  {
    cite: "Clennar, T.; Du, Y.; Liu, Z. (2026). Lab-scale green hydrogen and fuel cell microgrid digital twin. Energy Conversion and Management, 350, 120928.",
    url: "https://doi.org/10.1016/j.enconman.2025.120928",
    status: "Solo resumen accesible",
    use: "Referente para una fase futura con lazo físico-digital a escala de laboratorio.",
  },
  {
    cite: "Monopoli, D. et al. (2024). How to build a Digital Twin for operating PEM-Electrolyser system – A reference approach. Annual Reviews in Control, 57, 100943.",
    url: "https://doi.org/10.1016/j.arcontrol.2024.100943",
    status: "Solo resumen parcial",
    use: "Marco conceptual para distinguir qué componentes de un gemelo existen y cuáles no.",
  },
  {
    cite: "Deshmukh, R. S. et al. (2025). Real-time digital twin implementation of power electronics-based hydrogen production system. Energy Reports, 13, 5006–5015.",
    url: "https://doi.org/10.1016/j.egyr.2025.04.017",
    status: "Texto completo leído",
    use: "Estructura análoga de curva de polarización (electrolizador ALCALINO, no PEM).",
  },
  {
    cite: "Springer, T. E.; Zawodzinski, T. A.; Gottesfeld, S. (1991). Polymer Electrolyte Fuel Cell Model. J. Electrochem. Soc., 138(8), 2334–2342.",
    url: "https://doi.org/10.1149/1.2085971",
    status: "Solo metadatos",
    use: "Correlación de conductividad σ(T, λ) de la membrana.",
  },
  {
    cite: "Falcão, D. S.; Pinto, A. M. F. R. (2020). A review on PEM electrolyzer modelling: Guidelines for beginners. J. Cleaner Production, 261, 121184.",
    url: "https://doi.org/10.1016/j.jclepro.2020.121184",
    status: "Solo metadatos",
    use: "Estructura V = E_rev + η_act + η_ohm del modelo PEM.",
  },
  {
    cite: "NOAA CAMEO Chemicals — Hydrogen (LEL 4 %, UEL 75 %).",
    url: "https://cameochemicals.noaa.gov/chemical/8729",
    status: "Verificada",
    use: "Límite inferior de inflamabilidad usado en % LIE.",
  },
];

export default function DocsView() {
  const { dispatch } = useTwin();
  const [tab, setTab] = useState<Tab>("model");
  const tabs: [Tab, string][] = [["model", "Modelo y ecuaciones"], ["params", "Parámetros"], ["scenarios", "Escenarios"], ["plant", "Planta conceptual"], ["refs", "Referencias"], ["limits", "Limitaciones"]];

  return (
    <div className="absolute inset-0 z-40 bg-[var(--bg)] flex flex-col" data-testid="docs-view">
      <div className="flex items-center justify-between px-6 h-12 border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-semibold">Documentación técnica</h2>
          <div className="tabs">
            {tabs.map(([id, label]) => <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>)}
          </div>
        </div>
        <button className="btn btn-sm" onClick={() => dispatch({ type: "section", section: "studio" })}><Icon.close width={14} /> Cerrar</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-6 py-6 prose-doc">
          {tab === "model" && (
            <>
              <p>El motor <span className="mono">HT-SIM 1.0.0</span> integra con Euler explícito (paso de 2 s) los balances de energía, masa y dilución, y evalúa en cada paso la lógica del PLC y la PSV. Es una función pura: mismas entradas → mismas salidas. El código está en <span className="mono">src/sim/</span> y lo validan pruebas automatizadas.</p>
              {EQUATIONS.map((e) => (
                <section key={e.id} className="card !mt-4">
                  <h3 className="!mt-0">{e.title}</h3>
                  <div className="formula">{e.expressions.map((x) => <div key={x}>{x}</div>)}</div>
                  <p className="!mt-2"><b className="text-[var(--text)]">Base:</b> {e.basis}</p>
                  <p><b className="text-[var(--text)]">Unidades:</b> {e.units} · <b className="text-[var(--text)]">Rango de validez:</b> {e.validRange}</p>
                  <ul className="!mt-1">{e.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
                </section>
              ))}
              <h3>Reglas de alarma y disparo</h3>
              <table className="table">
                <thead><tr><th>Regla</th><th>Instrumento</th><th>Condición</th><th>Acción</th><th>Respuesta del sistema</th></tr></thead>
                <tbody>
                  {ALARM_RULES.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td className="mono">{r.instrumentId}</td>
                      <td className="mono">{r.direction === "high" ? "≥" : "≤"} {r.threshold} {r.unit} (banda {r.deadband})</td>
                      <td>{r.action === "trip" ? "Disparo con enclavamiento" : "Alarma"}</td>
                      <td>{r.systemResponse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {tab === "params" && (
            <>
              <p>Única fuente de verdad: <span className="mono">src/domain/parameters.ts</span>. Ningún valor proviene de la planta UDES.</p>
              {PARAMETER_GROUPS.map((g) => (
                <section key={g.title}>
                  <h3>{g.title}</h3>
                  <table className="table">
                    <thead><tr><th>Parámetro</th><th className="text-right">Valor</th><th>Unidad</th><th>Procedencia</th><th>Fuente / justificación</th></tr></thead>
                    <tbody>
                      {Object.entries(g.params).map(([k, p]) => (
                        <tr key={k}>
                          <td>{p.label}</td>
                          <td className="text-right mono">{fmt(p.value, 6)}</td>
                          <td className="mono">{p.unit}</td>
                          <td><ProvenanceChip p={p.provenance} /></td>
                          <td className="muted">{p.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </>
          )}
          {tab === "scenarios" && SCENARIOS.map((s) => (
            <section key={s.id} className="card !mt-4">
              <h3 className="!mt-0"><span className="mono text-[var(--accent)]">{s.code}</span> {s.title}</h3>
              <p>{s.summary}</p>
              <p><b className="text-[var(--text)]">Objetivo:</b> {s.learningGoal}</p>
              <p><b className="text-[var(--text)]">Condiciones iniciales:</b> potencia {s.defaults.powerSetKw} kW, carga FC {s.defaults.fcLoadKw} kW, tanque {s.defaults.initialTankBar} bar, pila {s.defaults.initialStackC} °C, ambiente {s.defaults.ambientC} °C, duración {s.defaults.durationMin} min.</p>
              <p><b className="text-[var(--text)]">Entradas ajustables:</b> {s.adjustable.join(", ")}</p>
              {s.disturbance && <p><b className="text-[var(--text)]">Perturbación:</b> {s.disturbance}</p>}
              {s.intervention && <p><b className="text-[var(--text)]">Intervención:</b> {s.intervention}</p>}
              <p><b className="text-[var(--text)]">Comportamiento esperado:</b></p>
              <ul>{s.expectedBehavior.map((b) => <li key={b}>{b}</li>)}</ul>
              <p><b className="text-[var(--text)]">Supuestos:</b></p>
              <ul>{s.assumptions.map((b) => <li key={b}>{b}</li>)}</ul>
              <p><b className="text-[var(--text)]">Pruebas de validación:</b> <span className="mono">{s.validation.join(" · ")}</span></p>
            </section>
          ))}
          {tab === "plant" && (
            <>
              <p>Arquitectura PEM de laboratorio típica. Ningún equipo está verificado contra la instalación UDES; la geometría 3D es procedural y su disposición es conceptual.</p>
              <table className="table">
                <thead><tr><th>Etiqueta</th><th>Equipo</th><th>Etapa</th><th>Procedencia</th><th>¿Verificado en UDES?</th><th>Función</th></tr></thead>
                <tbody>
                  {EQUIPMENT.map((e) => (
                    <tr key={e.id}>
                      <td className="mono">{e.id}</td>
                      <td>{e.name}</td>
                      <td className="muted">{stageById.get(e.stageId)!.name}</td>
                      <td><ProvenanceChip p={e.provenance} /></td>
                      <td>{e.verifiedInUdes ? "Sí" : "No"}</td>
                      <td className="muted">{e.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {tab === "refs" && (
            <>
              <p>Verificadas el 2026-10-16. La matriz completa (problema, metodología, datos, limitaciones, qué no afirmar) está en <span className="mono">docs/MATRIZ_INVESTIGACION.md</span>.</p>
              <ol className="list-decimal pl-5 space-y-3 !mt-3">
                {REFS.map((r) => (
                  <li key={r.url}>
                    <p className="!text-[var(--text)]">{r.cite}</p>
                    <p><a className="text-[var(--accent)] underline break-all" href={r.url} target="_blank" rel="noreferrer">{r.url}</a> · <span className="chip">{r.status}</span></p>
                    <p>Uso en este proyecto: {r.use}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
          {tab === "limits" && (
            <>
              <h3>Qué es y qué no es</h3>
              <ul>
                <li>Es una representación visual digital, un modelo de ingeniería interactivo y un entorno operativo simulado con fines educativos.</li>
                <li>No es un gemelo digital conectado a datos ni validado: no hay sensores, SCADA, ni mediciones de la planta UDES.</li>
                <li>No controla equipos físicos ni es un sistema instrumentado de seguridad.</li>
                <li>Los escenarios de seguridad son hipotéticos y educativos; no constituyen procedimientos de emergencia.</li>
              </ul>
              <h3>Limitaciones del modelo</h3>
              <ul>
                {EQUATIONS.flatMap((e) => e.limitations.map((l) => <li key={e.id + l}><b className="text-[var(--text)]">{e.title}:</b> {l}</li>))}
              </ul>
              <h3>Para avanzar hacia un gemelo digital</h3>
              <ul>
                <li>Inventario verificado de equipos, P&ID y hojas de datos de la planta UDES.</li>
                <li>Curva de polarización medida para calibrar j₀, R y η_F; ensayos térmicos para C_th y UA.</li>
                <li>Adquisición de datos (PLC/SCADA → base de series de tiempo) y sincronización con el modelo.</li>
                <li>Protocolo de validación (error de predicción por variable) y gestión de versiones del modelo.</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
