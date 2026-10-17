import { describe, expect, it } from "vitest";
import { barToMol, molToBar, pvAvailabilityFraction, simulate } from "./engine";
import { BASE_INPUTS, SCENARIOS, clampInputs, scenarioById } from "./scenarios";
import { LIMITS, PHYS, STORAGE } from "@/domain/parameters";
import type { ScenarioId, SimulationResult } from "./types";

const run = (id: ScenarioId, over: Partial<typeof BASE_INPUTS> = {}) => simulate(id, { ...scenarioById.get(id)!.defaults, ...over });
const firstIndex = (r: SimulationResult, pred: (e: SimulationResult["events"][number]) => boolean) => r.events.findIndex(pred);

describe("determinismo y contratos", () => {
  it("mismas entradas producen resultados idénticos en todos los escenarios", () => {
    for (const sc of SCENARIOS) {
      const a = simulate(sc.id, sc.defaults);
      const b = simulate(sc.id, sc.defaults);
      expect(a).toEqual(b);
    }
  });

  it("muestrea cada 10 s durante toda la duración", () => {
    const r = run("normal", { durationMin: 30 });
    expect(r.samples[0].t).toBe(0);
    expect(r.samples.at(-1)!.t).toBe(1800);
    expect(r.samples).toHaveLength(181);
  });

  it("clampInputs restringe valores fuera de rango", () => {
    const c = clampInputs({ ...BASE_INPUTS, powerSetKw: 99, durationMin: 5, faultAtMin: 500 });
    expect(c.powerSetKw).toBe(5);
    expect(c.durationMin).toBe(30);
    expect(c.faultAtMin).toBeLessThan(c.durationMin);
  });

  it("conversión presión ↔ moles del tanque es reversible", () => {
    expect(molToBar(barToMol(23.4))).toBeCloseTo(23.4, 10);
  });
});

describe("ESC-01 operación nominal", () => {
  it("escenario nominal sin alarmas y temperatura cerca de la consigna", () => {
    const r = run("normal");
    expect(r.events).toHaveLength(0);
    expect(r.kpis.firstTripMin).toBeNull();
    expect(r.kpis.maxStackC).toBeLessThan(LIMITS.TAH.value);
    expect(r.samples.at(-1)!.values.t_stack).toBeGreaterThan(58);
    expect(r.samples.at(-1)!.values.t_stack).toBeLessThan(65);
  });

  it("balance de masa del tanque: Δn = producido − consumido − venteado − fugado", () => {
    for (const id of ["normal", "demand_loss", "sensor_stuck", "leak_ventilation"] as ScenarioId[]) {
      const r = run(id);
      const k = r.kpis;
      const dKg = (barToMol(k.finalTankBar) - barToMol(r.inputs.initialTankBar)) * PHYS.M_H2.value;
      expect(dKg).toBeCloseTo(k.h2ProducedKg - k.h2ToFuelCellKg - k.h2VentedKg - k.h2LeakedKg, 3);
    }
  });

  it("consumo específico coherente con energía/masa y agua estequiométrica (~8,94 kg/kg)", () => {
    const k = run("normal").kpis;
    expect(k.secKwhKg!).toBeCloseTo(k.energyKwh / k.h2ProducedKg, 2);
    expect(k.waterConsumedL / k.h2ProducedKg).toBeCloseTo(PHYS.M_H2O.value / PHYS.M_H2.value, 1);
  });
});

describe("ESC-02 variación de potencia", () => {
  it("más potencia → más H2 pero peor consumo específico", () => {
    const lo = run("power_change", { sourceMode: "constant", powerSetKw: 1.5 }).kpis;
    const hi = run("power_change", { sourceMode: "constant", powerSetKw: 5 }).kpis;
    expect(hi.h2ProducedKg).toBeGreaterThan(lo.h2ProducedKg);
    expect(hi.secKwhKg!).toBeGreaterThan(lo.secKwhKg!);
    expect(hi.meanEffHhvPct!).toBeLessThan(lo.meanEffHhvPct!);
  });

  it("perfil FV reduce producción durante la nube", () => {
    expect(pvAvailabilityFraction(25)).toBeLessThan(pvAvailabilityFraction(10) * 0.4);
    const r = run("power_change");
    const at = (min: number) => r.samples.find((s) => s.t === min * 60)!.values;
    expect(at(25).h2_kgh).toBeLessThan(at(10).h2_kgh * 0.5);
    expect(at(40).h2_kgh).toBeGreaterThan(at(25).h2_kgh);
  });
});

describe("ESC-03 pérdida de demanda", () => {
  it("PAH precede a PAHH y la PSV no abre", () => {
    const r = run("demand_loss");
    const pah = firstIndex(r, (e) => e.ruleId === "PAH" && e.kind === "alarm");
    const pahh = firstIndex(r, (e) => e.ruleId === "PAHH" && e.kind === "trip");
    expect(pah).toBeGreaterThanOrEqual(0);
    expect(pahh).toBeGreaterThan(pah);
    expect(r.events[pahh].value!).toBeGreaterThanOrEqual(LIMITS.PAHH.value);
    expect(r.events.some((e) => e.componentId === "PSV-201")).toBe(false);
    expect(r.kpis.maxTankBar).toBeLessThan(STORAGE.PSV_SET.value);
    expect(r.kpis.tripCause).toBe("PAHH");
    // tras el disparo la pila no produce
    expect(r.samples.at(-1)!.values.h2_kgh).toBe(0);
  });

  it("la intervención temprana evita el disparo", () => {
    const r = run("demand_loss", { interventionEnabled: true, interventionAtMin: 25 });
    expect(r.kpis.firstTripMin).toBeNull();
    expect(r.kpis.maxTankBar).toBeLessThan(LIMITS.PAH.value);
  });

  it("la intervención tardía rearma la pila cuando la presión baja del límite de rearme", () => {
    const r = run("demand_loss", { interventionEnabled: true, interventionAtMin: 52, durationMin: 120 });
    expect(r.kpis.firstTripMin).not.toBeNull();
    const reset = r.events.find((e) => e.kind === "reset");
    expect(reset).toBeDefined();
    const s = r.samples.find((x) => x.t >= reset!.t)!;
    expect(s.values.p_tank_meas).toBeLessThan(LIMITS.P_RESET.value);
  });
});

describe("ESC-04 falla de enfriamiento", () => {
  it("TAH precede a TAHH y la pila se enfría tras el disparo", () => {
    const r = run("cooling_fault");
    const tah = firstIndex(r, (e) => e.ruleId === "TAH" && e.kind === "alarm");
    const tahh = firstIndex(r, (e) => e.ruleId === "TAHH" && e.kind === "trip");
    expect(tah).toBeGreaterThanOrEqual(0);
    expect(tahh).toBeGreaterThan(tah);
    expect(r.kpis.maxStackC).toBeGreaterThanOrEqual(LIMITS.TAHH.value);
    expect(r.kpis.maxStackC).toBeLessThan(LIMITS.TAHH.value + 1);
    expect(r.samples.at(-1)!.values.t_stack).toBeLessThan(r.kpis.maxStackC);
  });

  it("la recuperación reanuda la producción", () => {
    const r = run("cooling_fault", { interventionEnabled: true, interventionAtMin: 45, durationMin: 90 });
    expect(r.kpis.firstTripMin).not.toBeNull();
    expect(r.events.some((e) => e.kind === "reset")).toBe(true);
    expect(r.samples.at(-1)!.flags.electrolyzer).toBe("running");
    expect(r.samples.at(-1)!.values.t_stack).toBeLessThan(LIMITS.TAH.value);
  });
});

describe("ESC-05 sensor congelado", () => {
  it("sensor congelado: sin PAHH y apertura de PSV", () => {
    const r = run("sensor_stuck");
    expect(r.events.some((e) => e.ruleId === "PAH" || e.ruleId === "PAHH")).toBe(false);
    const psv = r.events.find((e) => e.componentId === "PSV-201" && e.kind === "mechanical");
    expect(psv).toBeDefined();
    expect(psv!.value!).toBeGreaterThanOrEqual(STORAGE.PSV_SET.value);
    expect(r.kpis.h2VentedKg).toBeGreaterThan(0);
    expect(r.kpis.maxTankMeasBar).toBeLessThan(r.kpis.maxTankBar);
  });

  it("reparar el sensor provoca el disparo", () => {
    const r = run("sensor_stuck", { interventionEnabled: true, interventionAtMin: 40 });
    expect(r.kpis.tripCause).toBe("PAHH");
    expect(r.kpis.firstTripMin!).toBeCloseTo(40, 0);
    expect(r.events.some((e) => e.componentId === "PSV-201")).toBe(false);
  });
});

describe("ESC-06 fuga con ventilación detenida", () => {
  it("fuga: alarma GD antes del disparo y la fuga continúa tras el disparo", () => {
    const r = run("leak_ventilation");
    const a = firstIndex(r, (e) => e.ruleId === "GDAH");
    const t = firstIndex(r, (e) => e.ruleId === "GDAHH");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(t).toBeGreaterThan(a);
    const tripT = r.events[t].t;
    const after = r.samples.filter((s) => s.t > tripT);
    expect(after.every((s) => s.values.h2_kgh === 0)).toBe(true);
    expect(after.at(-1)!.values.room_lel).toBeGreaterThan(r.events[t].value!);
  });

  it("con ventilación nominal la misma fuga queda bajo la alarma (mezcla perfecta)", () => {
    // Estado estacionario C = Q_fuga / Q_vent con 6 renov/h y 10 NL/min
    const qLeak = (10 * 60) / 1000 * (298.15 / 273.15);
    const cSS = (qLeak / (6 * 40)) * 100 / 4 * 100;
    expect(cSS).toBeLessThan(LIMITS.GD_AH.value);
  });
});
