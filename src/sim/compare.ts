/** Comparación línea base vs escenario modificado (KPI con dirección explícita). */
import type { Kpis, SimulationResult } from "./types";

export interface KpiDefinition {
  key: keyof Kpis;
  label: string;
  unit: string;
  digits: number;
  /** "lower"/"higher" = mejor; null = sin dirección (informativo). */
  better: "lower" | "higher" | null;
  description: string;
}

export const KPI_DEFS: KpiDefinition[] = [
  { key: "h2ProducedKg", label: "H2 producido", unit: "kg", digits: 4, better: "higher", description: "Integral de la ley de Faraday durante la corrida." },
  { key: "meanH2Kgh", label: "Producción media", unit: "kg/h", digits: 4, better: "higher", description: "H2 producido / duración simulada." },
  { key: "energyKwh", label: "Energía a la pila", unit: "kWh", digits: 3, better: null, description: "Integral de la potencia DC entregada a EL-101." },
  { key: "secKwhKg", label: "Consumo específico", unit: "kWh/kg", digits: 2, better: "lower", description: "Energía / H2 producido (nivel de pila, sin balance de planta)." },
  { key: "meanEffHhvPct", label: "Eficiencia media (PCS)", unit: "%", digits: 1, better: "higher", description: "Promedio ponderado por energía de η_F·V_tn/V_celda." },
  { key: "maxStackC", label: "Temperatura máx. de pila", unit: "°C", digits: 1, better: "lower", description: "Máximo de TT-101 (modelo)." },
  { key: "maxTankBar", label: "Presión real máx.", unit: "bar", digits: 2, better: "lower", description: "Máximo de la presión calculada en TK-201." },
  { key: "maxTankMeasBar", label: "Presión medida máx.", unit: "bar", digits: 2, better: null, description: "Máximo de la lectura de PT-201." },
  { key: "finalTankBar", label: "Presión final", unit: "bar", digits: 2, better: null, description: "Presión real de TK-201 al final de la corrida." },
  { key: "firstTripMin", label: "Primer disparo", unit: "min", digits: 1, better: null, description: "Instante del primer enclavamiento (— si no ocurrió)." },
  { key: "h2VentedKg", label: "H2 venteado (PSV)", unit: "kg", digits: 4, better: "lower", description: "H2 liberado por PSV-201 a VS-301." },
  { key: "h2LeakedKg", label: "H2 fugado", unit: "kg", digits: 4, better: "lower", description: "H2 liberado al recinto (escenario de fuga)." },
  { key: "maxRoomLel", label: "Concentración máx. recinto", unit: "% LIE", digits: 1, better: "lower", description: "Máximo de GD-301 (mezcla perfecta)." },
  { key: "fcEnergyKwh", label: "Energía de FC-401", unit: "kWh", digits: 3, better: "higher", description: "Electricidad entregada por la celda de combustible." },
  { key: "availabilityPct", label: "Disponibilidad de la pila", unit: "%", digits: 1, better: "higher", description: "Fracción del tiempo con corriente > 0." },
  { key: "alarmCount", label: "Alarmas + disparos", unit: "", digits: 0, better: "lower", description: "Número de activaciones de alarmas y disparos." },
];

export interface KpiDelta {
  def: KpiDefinition;
  base: number | null;
  mod: number | null;
  delta: number | null;
  verdict: "mejor" | "peor" | "igual" | "n/a";
}

export function compareRuns(base: SimulationResult, mod: SimulationResult): KpiDelta[] {
  return KPI_DEFS.map((def) => {
    const b = base.kpis[def.key] as number | null;
    const m = mod.kpis[def.key] as number | null;
    if (b === null || m === null || typeof b !== "number" || typeof m !== "number") return { def, base: b, mod: m, delta: null, verdict: "n/a" as const };
    const delta = m - b;
    const tol = 10 ** -def.digits / 2;
    let verdict: KpiDelta["verdict"] = "igual";
    if (Math.abs(delta) > tol && def.better) verdict = (def.better === "lower" ? delta < 0 : delta > 0) ? "mejor" : "peor";
    else if (Math.abs(delta) > tol) verdict = "n/a";
    return { def, base: b, mod: m, delta, verdict };
  });
}

/** Diferencias de entradas entre dos corridas (para explicar QUÉ cambió). */
export function inputDiff(base: SimulationResult, mod: SimulationResult): { key: string; base: unknown; mod: unknown }[] {
  const out: { key: string; base: unknown; mod: unknown }[] = [];
  if (base.scenarioId !== mod.scenarioId) out.push({ key: "scenarioId", base: base.scenarioId, mod: mod.scenarioId });
  for (const k of Object.keys(mod.inputs) as (keyof typeof mod.inputs)[]) {
    if (base.inputs[k] !== mod.inputs[k]) out.push({ key: k, base: base.inputs[k], mod: mod.inputs[k] });
  }
  return out;
}
