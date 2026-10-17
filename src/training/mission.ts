/**
 * Misión de entrenamiento M-01 y su evaluación por rúbrica.
 *
 * Las respuestas correctas NO están escritas a mano: se derivan de las
 * corridas reales que el estudiante ejecutó (línea base, desviación,
 * decisión). Si cambian los parámetros del modelo, cambian las respuestas
 * esperadas y la retroalimentación cita los valores efectivamente calculados.
 */
import { LIMITS, STORAGE } from "@/domain/parameters";
import type { SimulationResult } from "@/sim/types";

export const MISSION_ID = "M-01";

export type StepKind = "intro" | "inspect" | "baseline" | "deviation" | "decision" | "interpretation" | "summary";

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface MissionQuestion {
  id: string;
  prompt: string;
  type: "number" | "choice";
  unit?: string;
  options?: ChoiceOption[];
}

export interface MissionStep {
  kind: StepKind;
  title: string;
  body: string[];
  questions: MissionQuestion[];
}

export const REQUIRED_INSPECTION = ["EL-101", "TK-201", "PSV-201", "XV-202"];

export const DEVIATION_FAULT_MIN = 10;

export const MISSION = {
  id: MISSION_ID,
  title: "Balance de masa y capas de protección en el almacenamiento de H2",
  objective:
    "Relacionar la producción de H2 (ley de Faraday) con el balance de masa del tanque pulmón, interpretar la secuencia alarma → disparo ante una pérdida de demanda y proponer una acción operativa que evite el disparo sin renunciar a la producción.",
  durationEstimate: "15–20 min",
  steps: [
    {
      kind: "intro",
      title: "Contexto",
      body: [
        "La pila EL-101 produce H2 que se acumula en el tanque pulmón TK-201 y es consumido por la celda de combustible FC-401 a través de XV-202.",
        "Si la producción supera al consumo, la presión del tanque sube. El PLC vigila la presión medida por PT-201 (alarma PAH y disparo PAHH) y, como última barrera mecánica, la válvula PSV-201 alivia a la presión real.",
        "Todo lo que verá es una simulación determinista con parámetros ilustrativos; no representa la planta UDES real.",
      ],
      questions: [],
    },
    {
      kind: "inspect",
      title: "Inspección guiada",
      body: ["Seleccione en la escena 3D (o en el Explorador de proceso) cada uno de los equipos marcados y lea su función y conexiones en el inspector."],
      questions: [
        {
          id: "q_protect",
          prompt: "¿Qué equipo protege a TK-201 contra sobrepresión de forma independiente del PLC?",
          type: "choice",
          options: [
            { value: "PSV-201", label: "PSV-201 — válvula de alivio" },
            { value: "XV-202", label: "XV-202 — válvula de suministro" },
            { value: "PT-201", label: "PT-201 — transmisor de presión" },
            { value: "DRY-201", label: "DRY-201 — secador" },
          ],
        },
      ],
    },
    {
      kind: "baseline",
      title: "Línea base (ESC-01)",
      body: ["Ejecute el escenario de operación nominal con sus valores por defecto y lea los resultados en el panel de KPI y en las gráficas."],
      questions: [
        { id: "q_baseline_h2", prompt: "Producción media de H2 calculada", type: "number", unit: "kg/h" },
        {
          id: "q_baseline_trend",
          prompt: "Durante la corrida, la presión de TK-201…",
          type: "choice",
          options: [
            { value: "up", label: "sube (producción > consumo)" },
            { value: "down", label: "baja (consumo > producción)" },
            { value: "flat", label: "se mantiene prácticamente constante (±0,5 bar)" },
          ],
        },
      ],
    },
    {
      kind: "deviation",
      title: "Desviación (ESC-03)",
      body: [`Ejecute la pérdida de demanda: XV-202 se cierra en el minuto ${DEVIATION_FAULT_MIN}. Observe la línea de tiempo de eventos y la gráfica de presión.`],
      questions: [
        {
          id: "q_first_event",
          prompt: "¿Cuál fue la primera respuesta del sistema de protección después de cerrar XV-202?",
          type: "choice",
          options: [
            { value: "PAH", label: "Alarma PAH (presión alta)" },
            { value: "PAHH", label: "Disparo PAHH (presión muy alta)" },
            { value: "PSV", label: "Apertura de PSV-201" },
            { value: "TAH", label: "Alarma TAH (temperatura alta)" },
          ],
        },
        { id: "q_trip_min", prompt: "¿En qué minuto el PLC disparó la pila?", type: "number", unit: "min" },
      ],
    },
    {
      kind: "decision",
      title: "Decisión de operación",
      body: [
        `Con la misma falla (XV-202 cierra en el minuto ${DEVIATION_FAULT_MIN}), configure la potencia de la pila y/o una intervención (reabrir XV-202) para que en 60 minutos:`,
        `① no ocurra ningún disparo, ② la presión real se mantenga por debajo de PAH (${LIMITS.PAH.value} bar) y ③ se produzca al menos el 80 % del H2 de la línea base.`,
        "Puede intentarlo varias veces; se evalúa el último intento.",
      ],
      questions: [],
    },
    {
      kind: "interpretation",
      title: "Interpretación",
      body: ["Responda usando lo observado en sus corridas."],
      questions: [
        {
          id: "q_psv_why",
          prompt: "En la corrida de desviación, ¿por qué no abrió PSV-201?",
          type: "choice",
          options: [
            { value: "interlock", label: `El disparo PAHH detuvo la pila a ${LIMITS.PAHH.value} bar, antes de la presión de ajuste (${STORAGE.PSV_SET.value} bar)` },
            { value: "broken", label: "La PSV estaba averiada" },
            { value: "temperature", label: "La PSV solo actúa por temperatura" },
            { value: "lowpressure", label: "La presión nunca superó la presión inicial" },
          ],
        },
        {
          id: "q_layer",
          prompt: "Si PT-201 quedara congelado, ¿qué protección seguiría actuando sobre la presión real del tanque?",
          type: "choice",
          options: [
            { value: "PAHH", label: "El disparo PAHH del PLC" },
            { value: "PSV-201", label: "La válvula de alivio PSV-201" },
            { value: "PAH", label: "La alarma PAH" },
            { value: "GD-301", label: "El detector de gas GD-301" },
          ],
        },
      ],
    },
    { kind: "summary", title: "Resultado y retroalimentación", body: [], questions: [] },
  ] satisfies MissionStep[],
};

export interface MissionProgress {
  stepIndex: number;
  inspected: string[];
  answers: Record<string, string>;
  runIds: { baseline?: string; deviation?: string; decision?: string };
  completed: boolean;
}

export const emptyProgress = (): MissionProgress => ({ stepIndex: 0, inspected: [], answers: {}, runIds: {}, completed: false });

export interface MissionRuns {
  baseline?: SimulationResult;
  deviation?: SimulationResult;
  decision?: SimulationResult;
}

export interface CriterionResult {
  id: string;
  title: string;
  max: number;
  score: number;
  feedback: string[];
}

export interface MissionEvaluation {
  criteria: CriterionResult[];
  total: number;
  max: number;
  level: "Excelente" | "Satisfactorio" | "En desarrollo" | "Insuficiente";
}

/** Respuestas esperadas derivadas de las corridas reales. */
export function expectedAnswers(runs: MissionRuns) {
  const b = runs.baseline;
  const d = runs.deviation;
  const trend = b ? (b.kpis.finalTankBar - b.inputs.initialTankBar > 0.5 ? "up" : b.kpis.finalTankBar - b.inputs.initialTankBar < -0.5 ? "down" : "flat") : undefined;
  const firstProtective = d?.events.find((e) => e.kind === "alarm" || e.kind === "trip" || e.kind === "mechanical");
  const firstEvent = firstProtective ? (firstProtective.kind === "mechanical" ? "PSV" : firstProtective.ruleId ?? undefined) : undefined;
  const psvOpened = d?.events.some((e) => e.componentId === "PSV-201" && e.kind === "mechanical");
  return {
    q_protect: "PSV-201",
    q_baseline_h2: b?.kpis.meanH2Kgh,
    q_baseline_trend: trend,
    q_first_event: firstEvent,
    q_trip_min: d?.kpis.firstTripMin ?? undefined,
    q_psv_why: d && !psvOpened && d.kpis.tripCause === "PAHH" ? "interlock" : undefined,
    q_layer: "PSV-201",
  };
}

const num = (s: string | undefined) => (s === undefined || s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const f = (x: number, d = 3) => x.toLocaleString("es-CO", { maximumFractionDigits: d, minimumFractionDigits: 0 });

export function evaluateMission(progress: MissionProgress, runs: MissionRuns): MissionEvaluation {
  const exp = expectedAnswers(runs);
  const a = progress.answers;
  const criteria: CriterionResult[] = [];

  // C1 — Inspección
  {
    const fb: string[] = [];
    const missing = REQUIRED_INSPECTION.filter((id) => !progress.inspected.includes(id));
    let score = missing.length === 0 ? 5 : Math.round((5 * (REQUIRED_INSPECTION.length - missing.length)) / REQUIRED_INSPECTION.length);
    fb.push(missing.length === 0 ? "Inspeccionó todos los equipos requeridos." : `Faltó inspeccionar: ${missing.join(", ")}.`);
    if (a.q_protect === exp.q_protect) {
      score += 5;
      fb.push("Correcto: PSV-201 actúa mecánicamente sobre la presión real, sin depender del PLC ni de PT-201.");
    } else {
      fb.push(`Respuesta '${a.q_protect ?? "sin responder"}' incorrecta: la protección independiente es PSV-201; ${a.q_protect === "PT-201" ? "PT-201 solo mide, no protege" : "las demás no limitan la presión"}.`);
    }
    criteria.push({ id: "C1", title: "Inspección guiada del sistema", max: 10, score, feedback: fb });
  }

  // C2 — Línea base
  {
    const fb: string[] = [];
    let score = 0;
    if (!runs.baseline) fb.push("No se ejecutó la corrida de línea base.");
    else {
      const given = num(a.q_baseline_h2);
      const ref = exp.q_baseline_h2!;
      const err = Math.abs(given - ref) / ref;
      if (Number.isFinite(err) && err <= 0.05) {
        score += 12;
        fb.push(`Producción leída correctamente (${f(given, 4)} kg/h; modelo: ${f(ref, 4)} kg/h).`);
      } else if (Number.isFinite(err) && err <= 0.15) {
        score += 6;
        fb.push(`Producción aproximada (${f(given, 4)} kg/h vs ${f(ref, 4)} kg/h, error ${f(err * 100, 1)} %). Revise el KPI 'Producción media'.`);
      } else {
        fb.push(`Producción esperada ${f(ref, 4)} kg/h (= η_F·N·I/(2F)·M_H2·3600 con I ≈ ${f(runs.baseline.samples[0].values.i_stack, 1)} A). Respuesta: ${a.q_baseline_h2 ?? "—"}.`);
      }
      const dp = runs.baseline.kpis.finalTankBar - runs.baseline.inputs.initialTankBar;
      if (a.q_baseline_trend === exp.q_baseline_trend) {
        score += 8;
        fb.push(`Tendencia correcta: Δp = ${f(dp, 2)} bar en la corrida.`);
      } else {
        fb.push(`La presión cambió ${f(dp, 2)} bar: producción (${f(runs.baseline.kpis.h2ProducedKg, 4)} kg) frente a consumo de FC-401 (${f(runs.baseline.kpis.h2ToFuelCellKg, 4)} kg).`);
      }
    }
    criteria.push({ id: "C2", title: "Lectura de la línea base", max: 20, score, feedback: fb });
  }

  // C3 — Eventos
  {
    const fb: string[] = [];
    let score = 0;
    if (!runs.deviation) fb.push("No se ejecutó la corrida de desviación.");
    else {
      if (a.q_first_event === exp.q_first_event) {
        score += 10;
        fb.push("Correcto: la alarma PAH (operador) precede al disparo PAHH (automático).");
      } else {
        fb.push(`La primera respuesta registrada fue ${exp.q_first_event}. Las alarmas avisan al operador antes de que actúe el enclavamiento.`);
      }
      const ref = exp.q_trip_min;
      const given = num(a.q_trip_min);
      if (ref === undefined) fb.push("En su corrida de desviación no hubo disparo.");
      else if (Math.abs(given - ref) <= 1.5) {
        score += 10;
        fb.push(`Minuto de disparo correcto (modelo: ${f(ref, 1)} min).`);
      } else if (Math.abs(given - ref) <= 5) {
        score += 5;
        fb.push(`Minuto aproximado (modelo: ${f(ref, 1)} min). Use la línea de tiempo de eventos para mayor precisión.`);
      } else {
        fb.push(`El disparo ocurrió en el minuto ${f(ref, 1)}. Respuesta: ${a.q_trip_min ?? "—"}.`);
      }
    }
    criteria.push({ id: "C3", title: "Interpretación de la secuencia de eventos", max: 20, score, feedback: fb });
  }

  // C4 — Decisión
  {
    const fb: string[] = [];
    let score = 0;
    const d = runs.decision;
    if (!d) fb.push("No se ejecutó ninguna corrida de decisión.");
    else if (d.scenarioId !== "demand_loss" || d.inputs.faultAtMin !== DEVIATION_FAULT_MIN || d.inputs.durationMin !== 60) {
      fb.push("La corrida de decisión debe ser ESC-03 con la falla en el minuto 10 y 60 min de duración.");
    } else {
      if (d.kpis.firstTripMin === null) {
        score += 15;
        fb.push("① Sin disparos durante la corrida.");
      } else fb.push(`① Hubo disparo (${d.kpis.tripCause}) en el minuto ${f(d.kpis.firstTripMin, 1)}.`);
      if (d.kpis.maxTankBar < LIMITS.PAH.value) {
        score += 5;
        fb.push(`② Presión máxima ${f(d.kpis.maxTankBar, 2)} bar < ${LIMITS.PAH.value} bar.`);
      } else fb.push(`② Presión máxima ${f(d.kpis.maxTankBar, 2)} bar ≥ ${LIMITS.PAH.value} bar.`);
      const ref = runs.baseline?.kpis.h2ProducedKg;
      if (ref !== undefined) {
        const ratio = d.kpis.h2ProducedKg / ref;
        if (ratio >= 0.8) {
          score += 10;
          fb.push(`③ Producción ${f(ratio * 100, 0)} % de la línea base.`);
        } else fb.push(`③ Producción solo ${f(ratio * 100, 0)} % de la línea base: reducir potencia evita el disparo pero sacrifica producción; reabrir XV-202 a tiempo restituye el consumo.`);
      } else fb.push("③ No hay línea base para comparar la producción.");
      if (d.inputs.interventionEnabled) fb.push(`Estrategia usada: intervención en el minuto ${d.inputs.interventionAtMin} con ${f(d.inputs.powerSetKw, 1)} kW.`);
      else fb.push(`Estrategia usada: solo ajuste de potencia (${f(d.inputs.powerSetKw, 1)} kW), sin intervención.`);
    }
    criteria.push({ id: "C4", title: "Calidad de la decisión de operación", max: 30, score, feedback: fb });
  }

  // C5 — Capas de protección
  {
    const fb: string[] = [];
    let score = 0;
    if (exp.q_psv_why && a.q_psv_why === exp.q_psv_why) {
      score += 10;
      fb.push(`Correcto: la presión máxima fue ${f(runs.deviation!.kpis.maxTankBar, 2)} bar, por debajo del ajuste de la PSV (${STORAGE.PSV_SET.value} bar).`);
    } else if (!exp.q_psv_why) {
      fb.push("Su corrida de desviación no permite evaluar esta pregunta (no hubo disparo PAHH o abrió la PSV).");
    } else {
      fb.push(`El enclavamiento PAHH detuvo el aporte de masa a ${LIMITS.PAHH.value} bar; la PSV (${STORAGE.PSV_SET.value} bar) nunca fue solicitada.`);
    }
    if (a.q_layer === exp.q_layer) {
      score += 10;
      fb.push("Correcto: PAH y PAHH dependen de PT-201; PSV-201 responde a la presión real. Compruébelo en ESC-05.");
    } else {
      fb.push("Las funciones del PLC (PAH/PAHH) quedan ciegas si PT-201 falla; solo PSV-201 actúa sobre la presión real. Compruébelo en ESC-05.");
    }
    criteria.push({ id: "C5", title: "Razonamiento sobre capas de protección", max: 20, score, feedback: fb });
  }

  const total = criteria.reduce((s, c) => s + c.score, 0);
  const max = criteria.reduce((s, c) => s + c.max, 0);
  const pct = total / max;
  const level = pct >= 0.9 ? "Excelente" : pct >= 0.7 ? "Satisfactorio" : pct >= 0.5 ? "En desarrollo" : "Insuficiente";
  return { criteria, total, max, level };
}

/** Condición para avanzar desde cada paso (la interfaz bloquea el botón "Siguiente"). */
export function canAdvance(stepKind: StepKind, progress: MissionProgress): { ok: boolean; reason?: string } {
  const answered = (ids: string[]) => ids.every((id) => (progress.answers[id] ?? "").trim() !== "");
  switch (stepKind) {
    case "inspect": {
      const missing = REQUIRED_INSPECTION.filter((id) => !progress.inspected.includes(id));
      if (missing.length) return { ok: false, reason: `Seleccione: ${missing.join(", ")}` };
      return answered(["q_protect"]) ? { ok: true } : { ok: false, reason: "Responda la pregunta" };
    }
    case "baseline":
      if (!progress.runIds.baseline) return { ok: false, reason: "Ejecute la línea base" };
      return answered(["q_baseline_h2", "q_baseline_trend"]) ? { ok: true } : { ok: false, reason: "Responda las preguntas" };
    case "deviation":
      if (!progress.runIds.deviation) return { ok: false, reason: "Ejecute la desviación" };
      return answered(["q_first_event", "q_trip_min"]) ? { ok: true } : { ok: false, reason: "Responda las preguntas" };
    case "decision":
      return progress.runIds.decision ? { ok: true } : { ok: false, reason: "Ejecute al menos un intento" };
    case "interpretation":
      return answered(["q_psv_why", "q_layer"]) ? { ok: true } : { ok: false, reason: "Responda las preguntas" };
    default:
      return { ok: true };
  }
}
