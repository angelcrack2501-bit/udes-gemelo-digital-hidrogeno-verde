/**
 * Guía de ingeniería DETERMINISTA (no es un LLM).
 *
 * Responde a partir de: (1) el modelo semántico de la planta, (2) la
 * muestra/corrida de simulación activa, (3) la documentación de ecuaciones.
 * Cada respuesta separa los HECHOS DEL MODELO (autoritativos, citan su
 * origen) de la EXPLICACIÓN (texto pedagógico). La guía nunca inventa
 * mediciones ni afirma conocer el estado de la planta UDES real.
 */
import { equipmentById, instrumentById, STAGES, variableById, EQUIPMENT, INSTRUMENTS } from "@/domain/plant";
import { downstreamOf, FLUID_LABEL, instrumentsOn, upstreamOf } from "@/domain/topology";
import { equationById } from "@/sim/model-docs";
import { compareRuns, inputDiff } from "@/sim/compare";
import { scenarioById, INPUT_RANGES } from "@/sim/scenarios";
import { equipmentStates } from "@/sim/state-map";
import type { Sample, SimEvent, SimulationResult, VariableId } from "@/sim/types";

export type GuideIntent = "equipment" | "connections" | "variables" | "changes" | "events" | "assumptions" | "next" | "real_plant" | "help";

export interface GuideFact {
  text: string;
  source: string;
}

export interface GuideAnswer {
  intent: GuideIntent;
  title: string;
  facts: GuideFact[];
  explanation: string[];
  evidence: string[];
  next: string[];
}

export interface GuideContext {
  selectedId: string | null;
  sample: Sample | null;
  run: SimulationResult | null;
  baseline: SimulationResult | null;
  focusEvent: SimEvent | null;
}

export const QUICK_INTENTS: { intent: GuideIntent; label: string }[] = [
  { intent: "equipment", label: "¿Qué hace el equipo seleccionado?" },
  { intent: "connections", label: "¿Con qué está conectado?" },
  { intent: "variables", label: "¿Qué variables son relevantes?" },
  { intent: "changes", label: "¿Qué cambió frente a la línea base?" },
  { intent: "events", label: "¿Por qué se disparó el evento?" },
  { intent: "assumptions", label: "¿Qué supuestos afectan el resultado?" },
  { intent: "next", label: "¿Qué debería investigar ahora?" },
];

const fmt = (x: number, d = 2) => x.toLocaleString("es-CO", { maximumFractionDigits: d });
const fmtMin = (t: number) => `min ${fmt(t / 60, 1)}`;

/** Clasificación de intención por palabras clave (español). */
export function classify(question: string): { intent: GuideIntent; equipmentId: string | null } {
  const q = question.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const tag = question.toUpperCase().match(/\b([A-Z]{1,4}-\d{3})\b/)?.[1] ?? null;
  const synonyms: [RegExp, string][] = [
    [/electroliz|pila|stack/, "EL-101"],
    [/tanque pulmon|tanque de h|almacenamiento|tk-201/, "TK-201"],
    [/valvula de alivio|psv/, "PSV-201"],
    [/celda de combustible|fuel cell/, "FC-401"],
    [/chiller|enfriador/, "CH-101"],
    [/intercambiador/, "HX-101"],
    [/ventilador|ventilacion/, "FAN-301"],
    [/detector|gd-301/, "ENC-301"],
    [/plc|control/, "PLC-001"],
    [/fotovolta|solar|fv\b/, "PV-001"],
    [/secador/, "DRY-201"],
  ];
  let equipmentId = tag && (equipmentById.has(tag) ? tag : instrumentById.get(tag)?.attachedTo ?? null);
  if (!equipmentId) for (const [re, id] of synonyms) if (re.test(q)) { equipmentId = id; break; }

  let intent: GuideIntent = "help";
  const aboutFacility = /planta|udes|instalacion|laboratorio fisico/.test(q);
  const aboutRealState = /real(es)?|actual|ahora|en vivo|tiempo real|medicion|medid/.test(q);
  if ((aboutFacility && aboutRealState) || /datos reales|sensor(es)? real/.test(q)) intent = "real_plant";
  else if (/por que|porque|causa|disparo|alarma|evento|se activo/.test(q)) intent = "events";
  else if (/cambio|diferencia|compar|linea base|baseline/.test(q)) intent = "changes";
  else if (/supuesto|suposic|limitac|confian|precis|valido/.test(q)) intent = "assumptions";
  else if (/conect|aguas arriba|aguas abajo|relacion|alimenta|depende/.test(q)) intent = "connections";
  else if (/variable|mide|medicion|unidad|instrumento|sensor/.test(q)) intent = "variables";
  else if (/siguiente|investigar|que hago|que deberia|recomiend|ahora/.test(q)) intent = "next";
  else if (/que es|que hace|funcion|para que|sirve|explica/.test(q) || equipmentId) intent = "equipment";
  return { intent, equipmentId };
}

export function ask(question: string, ctx: GuideContext): GuideAnswer {
  const { intent, equipmentId } = classify(question);
  return answer(intent, { ...ctx, selectedId: equipmentId ?? ctx.selectedId });
}

export function answer(intent: GuideIntent, ctx: GuideContext): GuideAnswer {
  switch (intent) {
    case "equipment": return explainEquipment(ctx);
    case "connections": return explainConnections(ctx);
    case "variables": return explainVariables(ctx);
    case "changes": return explainChanges(ctx);
    case "events": return explainEvent(ctx);
    case "assumptions": return explainAssumptions(ctx);
    case "next": return suggestNext(ctx);
    case "real_plant": return realPlant();
    default: return help();
  }
}

function needSelection(intent: GuideIntent): GuideAnswer {
  return {
    intent, title: "Seleccione un equipo",
    facts: [], explanation: ["Seleccione un equipo en la escena 3D o en el Explorador de proceso, o mencione su etiqueta (p. ej. TK-201) en la pregunta."],
    evidence: [], next: [`Equipos disponibles: ${EQUIPMENT.slice(0, 6).map((e) => e.id).join(", ")}…`],
  };
}

function explainEquipment(ctx: GuideContext): GuideAnswer {
  const eq = ctx.selectedId ? equipmentById.get(ctx.selectedId) : undefined;
  if (!eq) return needSelection("equipment");
  const stage = STAGES.find((s) => s.id === eq.stageId)!;
  const state = equipmentStates(ctx.sample)[eq.id];
  const facts: GuideFact[] = [
    { text: `${eq.id} · ${eq.name} — etapa «${stage.name}».`, source: "Modelo semántico (src/domain/plant.ts)" },
    ...eq.specs.map((s) => ({ text: `${s.label}: ${s.value}`, source: `Especificación (${s.provenance === "illustrative" ? "valor ilustrativo" : s.provenance === "literature" ? "literatura" : "conceptual"})` })),
  ];
  if (state.status !== "nodata") facts.push({ text: `Estado simulado en ${fmtMin(ctx.sample!.t)}: ${state.label}.`, source: `Corrida ${ctx.run ? scenarioById.get(ctx.run.scenarioId)!.code : ""} (simulación)` });
  return {
    intent: "equipment",
    title: `¿Qué hace ${eq.id}?`,
    facts,
    explanation: [eq.role, ...(eq.notes ? [eq.notes] : []), "Este equipo forma parte de una configuración conceptual: no está verificado contra la instalación UDES."],
    evidence: ["Modelo semántico de la planta", "Documentación → Planta conceptual"],
    next: ["Pregunte «¿con qué está conectado?» para ver su posición en el proceso."],
  };
}

function explainConnections(ctx: GuideContext): GuideAnswer {
  const eq = ctx.selectedId ? equipmentById.get(ctx.selectedId) : undefined;
  if (!eq) return needSelection("connections");
  const up = upstreamOf(eq.id);
  const down = downstreamOf(eq.id);
  const facts: GuideFact[] = [
    ...up.map((n) => ({ text: `Aguas arriba: ${n.equipmentId} (${equipmentById.get(n.equipmentId)!.name}) por ${n.connection.lineTag} — ${FLUID_LABEL[n.connection.fluid]}.`, source: `Conexión ${n.connection.id}` })),
    ...down.map((n) => ({ text: `Aguas abajo: ${n.equipmentId} (${equipmentById.get(n.equipmentId)!.name}) por ${n.connection.lineTag} — ${FLUID_LABEL[n.connection.fluid]}.`, source: `Conexión ${n.connection.id}` })),
  ];
  const ins = instrumentsOn(eq.id);
  for (const i of ins) facts.push({ text: `Instrumento ${i.id}: ${i.name}${i.realization === "soft" ? " (sensor virtual calculado)" : ""}.`, source: "Lista de instrumentos" });
  return {
    intent: "connections",
    title: `Relaciones de proceso de ${eq.id}`,
    facts: facts.length ? facts : [{ text: "Sin conexiones registradas.", source: "Modelo semántico" }],
    explanation: [
      "Las relaciones provienen de conexiones explícitas del grafo de proceso, no de la proximidad geométrica en 3D.",
      up.length && down.length ? `Una perturbación aguas arriba de ${eq.id} puede propagarse a ${down.map((d) => d.equipmentId).join(", ")}.` : "",
    ].filter(Boolean),
    evidence: ["Grafo tipado (src/domain/topology.ts) validado por pruebas automatizadas"],
    next: ["Use el Explorador de proceso para ver la ruta de influencia completa."],
  };
}

function explainVariables(ctx: GuideContext): GuideAnswer {
  const eq = ctx.selectedId ? equipmentById.get(ctx.selectedId) : undefined;
  if (!eq) return needSelection("variables");
  const facts: GuideFact[] = eq.variableIds.map((vid) => {
    const v = variableById.get(vid)!;
    const val = ctx.sample ? ctx.sample.values[vid as VariableId] : undefined;
    return {
      text: `${v.name} (${v.symbol}, ${v.unit})${val !== undefined ? ` = ${fmt(val, 3)} ${v.unit} en ${fmtMin(ctx.sample!.t)}` : ""} — ${v.description}`,
      source: v.source === "input" ? "Entrada del escenario" : v.source === "instrument_model" ? "Modelo del instrumento" : "Salida del modelo",
    };
  });
  return {
    intent: "variables",
    title: `Variables asociadas a ${eq.id}`,
    facts: facts.length ? facts : [{ text: "Este equipo no tiene variables simuladas propias.", source: "Modelo semántico" }],
    explanation: [ctx.sample ? "Los valores mostrados son SIMULADOS, no mediciones de la planta." : "Ejecute una simulación para ver valores."],
    evidence: ["Catálogo de variables (src/domain/plant.ts)"],
    next: [],
  };
}

function explainChanges(ctx: GuideContext): GuideAnswer {
  if (!ctx.run) return { intent: "changes", title: "Sin corrida activa", facts: [], explanation: ["Ejecute un escenario en el Laboratorio de simulación."], evidence: [], next: [] };
  if (!ctx.baseline || ctx.baseline === ctx.run) {
    return { intent: "changes", title: "Sin línea base distinta", facts: [], explanation: ["Seleccione en el Historial una corrida como línea base distinta de la activa para comparar."], evidence: [], next: [] };
  }
  const diffs = inputDiff(ctx.baseline, ctx.run);
  const deltas = compareRuns(ctx.baseline, ctx.run).filter((d) => d.delta !== null && d.verdict !== "igual");
  const facts: GuideFact[] = [
    ...diffs.map((d) => ({
      text: `Entrada cambiada — ${d.key === "scenarioId" ? "escenario" : INPUT_RANGES[d.key as keyof typeof INPUT_RANGES]?.label ?? d.key}: ${String(d.base)} → ${String(d.mod)}`,
      source: "Entradas registradas de ambas corridas",
    })),
    ...deltas.slice(0, 8).map((d) => ({
      text: `${d.def.label}: ${fmt(d.base!, d.def.digits)} → ${fmt(d.mod!, d.def.digits)} ${d.def.unit} (${d.verdict === "n/a" ? "informativo" : d.verdict})`,
      source: "KPI calculado por el motor de simulación",
    })),
  ];
  const sc = scenarioById.get(ctx.run.scenarioId)!;
  return {
    intent: "changes",
    title: `Cambios: ${scenarioById.get(ctx.baseline.scenarioId)!.code} → ${sc.code}`,
    facts,
    explanation: [
      sc.disturbance ? `El escenario introduce: ${sc.disturbance}` : "No hay perturbación: las diferencias provienen solo de las entradas.",
      "La comparación es causal dentro del modelo: con las mismas entradas el resultado es idéntico (simulación determinista).",
    ],
    evidence: ["Comparador de corridas (src/sim/compare.ts)"],
    next: ["Revise en la gráfica qué variable diverge primero entre ambas corridas."],
  };
}

function explainEvent(ctx: GuideContext): GuideAnswer {
  const run = ctx.run;
  const ev = ctx.focusEvent ?? run?.events.find((e) => e.kind === "trip" || e.kind === "mechanical") ?? run?.events.find((e) => e.kind === "alarm") ?? null;
  if (!run || !ev) {
    return { intent: "events", title: "No hay eventos que explicar", facts: [], explanation: [run ? "La corrida activa no generó alarmas ni disparos." : "Ejecute un escenario primero."], evidence: [], next: ["Pruebe ESC-03 o ESC-04 para observar una secuencia de alarmas."] };
  }
  const eq = equipmentById.get(ev.componentId);
  const facts: GuideFact[] = [
    { text: `${ev.id} · ${ev.title} en ${fmtMin(ev.t)}.`, source: `Corrida ${scenarioById.get(run.scenarioId)!.code}` },
    { text: `Regla: ${ev.rule}.`, source: ev.ruleId ? `Regla ${ev.ruleId} (src/sim/rules.ts)` : "Lógica del escenario" },
  ];
  if (ev.value !== null && ev.unit) facts.push({ text: `Valor al activarse: ${fmt(ev.value, 2)} ${ev.unit}${ev.threshold !== null ? ` (umbral ${ev.threshold} ${ev.unit})` : ""}.`, source: "Salida del modelo" });
  facts.push({ text: `Severidad: ${{ info: "informativa", advertencia: "advertencia", critica: "crítica" }[ev.severity]} — ${ev.severityBasis}.`, source: "Clasificación educativa" });
  facts.push({ text: `Resultado posterior: ${ev.outcome}`, source: "Análisis de la corrida" });

  // Cadena causal: perturbación previa y relación topológica
  const cause = run.events.filter((e) => e.kind === "disturbance" && e.t <= ev.t).at(-1);
  const explanation: string[] = [];
  if (cause) explanation.push(`Causa en el modelo: «${cause.title}» (${fmtMin(cause.t)}). ${cause.expectedSystemResponse}`);
  if (ev.ruleId === "PAH" || ev.ruleId === "PAHH") explanation.push("Mecanismo: dn/dt = producción − consumo − alivio; con el consumo en cero, la presión p = nRT/V crece proporcionalmente a la producción de H2.");
  if (ev.ruleId === "TAH" || ev.ruleId === "TAHH") explanation.push("Mecanismo: sin agua de enfriamiento, C_th·dT/dt ≈ Q_gen = N·I·(V_celda − V_tn); el calor ya no se retira por HX-101.");
  if (ev.ruleId?.startsWith("GD")) explanation.push("Mecanismo: V·dC/dt = Q_fuga − C·Q_vent; con la ventilación degradada, la concentración media crece hacia Q_fuga/Q_vent.");
  if (ev.componentId === "PSV-201") explanation.push("La PSV actúa sobre la presión REAL; si abrió, el PLC no detuvo antes el aporte de masa (p. ej. porque PT-201 no reflejaba la presión).");
  explanation.push(`Respuesta educativa sugerida: ${ev.educationalResponse}`);
  if (eq) explanation.push(`Equipo afectado: ${eq.id} (${eq.name}).`);
  const eqDoc = ev.ruleId?.startsWith("P") ? "tank" : ev.ruleId?.startsWith("T") ? "thermal" : ev.ruleId?.startsWith("GD") ? "dilution" : ev.componentId === "PSV-201" ? "psv" : "alarms";
  return {
    intent: "events",
    title: `¿Por qué ocurrió «${ev.title}»?`,
    facts,
    explanation,
    evidence: [`Ecuación: ${equationById.get(eqDoc)!.title}`, "Umbrales ilustrativos (Documentación → Parámetros)"],
    next: ["Compare el instante del evento con la gráfica de la variable involucrada."],
  };
}

function explainAssumptions(ctx: GuideContext): GuideAnswer {
  const sc = ctx.run ? scenarioById.get(ctx.run.scenarioId)! : null;
  const eqs = sc ? sc.equations.map((id) => equationById.get(id)!).filter(Boolean) : [];
  return {
    intent: "assumptions",
    title: sc ? `Supuestos que afectan ${sc.code}` : "Supuestos generales del modelo",
    facts: (sc?.assumptions ?? ["Configuración conceptual, parámetros ilustrativos, integración determinista."]).map((a) => ({ text: a, source: "Definición del escenario" })),
    explanation: eqs.flatMap((e) => e.limitations.map((l) => `${e.title}: ${l}`)),
    evidence: ["Documentación → Modelo y supuestos", "docs/LIMITACIONES_Y_VALIDACION.md"],
    next: ["Para validar el modelo se necesitan una curva de polarización y registros de operación de la planta UDES."],
  };
}

function suggestNext(ctx: GuideContext): GuideAnswer {
  const next: string[] = [];
  if (!ctx.run) next.push("Ejecute ESC-01 (operación nominal) para establecer una línea base.");
  else {
    const sc = ctx.run.scenarioId;
    if (sc === "normal") next.push("Ejecute ESC-02 y compare el consumo específico a 1,5 kW y 5 kW.", "Ejecute ESC-03 para ver la respuesta a una pérdida de demanda.");
    if (sc === "power_change") next.push("Explique por qué la eficiencia baja a alta potencia usando la curva V_celda(j).");
    if (sc === "demand_loss") next.push(ctx.run.inputs.interventionEnabled ? "Busque el minuto más tardío de intervención que aún evita el disparo." : "Active la intervención y pruebe distintos minutos de reapertura de XV-202.", "Ejecute ESC-05: ¿qué pasa si PT-201 falla durante la misma desviación?");
    if (sc === "cooling_fault") next.push("Estime la velocidad de calentamiento con Q_gen/C_th y compárela con la gráfica.", "Pruebe una potencia menor: ¿cuánto se retrasa el disparo?");
    if (sc === "sensor_stuck") next.push("Compare presión real y medida: ¿cuánto H2 se venteó?", "Active la intervención antes de la apertura de la PSV.");
    if (sc === "leak_ventilation") next.push("Calcule C_∞ = Q_fuga/Q_vent con ventilación nominal y degradada.", "Observe que la fuga continúa tras el disparo de la pila.");
  }
  const sel = ctx.selectedId ? equipmentById.get(ctx.selectedId) : null;
  if (sel) next.push(`Revise las variables de ${sel.id} y su evolución en la gráfica.`);
  return { intent: "next", title: "Siguientes pasos sugeridos", facts: [], explanation: next, evidence: ["Sugerencias derivadas del escenario activo (reglas deterministas)"], next: [] };
}

function realPlant(): GuideAnswer {
  return {
    intent: "real_plant",
    title: "Sobre la planta UDES real",
    facts: [
      { text: "Esta aplicación no está conectada a ningún sensor ni sistema de control de la planta UDES.", source: "Arquitectura del sistema" },
      { text: `Ningún valor es una medición: ${INSTRUMENTS.length} instrumentos son conceptuales y sus lecturas provienen del modelo.`, source: "Catálogo de instrumentos" },
    ],
    explanation: [
      "No puedo informar el estado actual de la planta real. Puedo explicar el comportamiento del modelo simulado y sus supuestos.",
      "La integración con datos reales requiere: P&ID verificado, hojas de datos de equipos, acceso a registros del PLC/SCADA y un protocolo de validación.",
    ],
    evidence: ["docs/LIMITACIONES_Y_VALIDACION.md"],
    next: [],
  };
}

function help(): GuideAnswer {
  return {
    intent: "help",
    title: "¿En qué puedo ayudar?",
    facts: [],
    explanation: [
      "Soy una guía determinista basada en reglas: respondo con el modelo de planta, la corrida activa y la documentación de ecuaciones. No soy un modelo de lenguaje.",
      "Ejemplos: «¿qué hace TK-201?», «¿con qué está conectado el electrolizador?», «¿por qué se disparó la alarma?», «¿qué cambió frente a la línea base?», «¿qué supuestos afectan el resultado?».",
    ],
    evidence: [],
    next: [],
  };
}
