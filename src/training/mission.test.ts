import { describe, expect, it } from "vitest";
import { simulate } from "@/sim/engine";
import { scenarioById } from "@/sim/scenarios";
import { canAdvance, emptyProgress, evaluateMission, expectedAnswers, REQUIRED_INSPECTION, type MissionRuns } from "./mission";

const baseline = simulate("normal", scenarioById.get("normal")!.defaults);
const deviation = simulate("demand_loss", scenarioById.get("demand_loss")!.defaults);
const goodDecision = simulate("demand_loss", { ...scenarioById.get("demand_loss")!.defaults, interventionEnabled: true, interventionAtMin: 20 });
const lazyDecision = simulate("demand_loss", { ...scenarioById.get("demand_loss")!.defaults, powerSetKw: 0.5 });
const runs: MissionRuns = { baseline, deviation, decision: goodDecision };

function perfectAnswers(r: MissionRuns) {
  const e = expectedAnswers(r);
  return {
    q_protect: e.q_protect,
    q_baseline_h2: String(e.q_baseline_h2),
    q_baseline_trend: e.q_baseline_trend!,
    q_first_event: e.q_first_event!,
    q_trip_min: String(e.q_trip_min),
    q_psv_why: e.q_psv_why!,
    q_layer: e.q_layer,
  };
}

describe("misión M-01", () => {
  it("las respuestas esperadas se derivan de las corridas reales", () => {
    const e = expectedAnswers(runs);
    expect(e.q_baseline_h2).toBe(baseline.kpis.meanH2Kgh);
    expect(e.q_first_event).toBe("PAH");
    expect(e.q_trip_min).toBe(deviation.kpis.firstTripMin);
    expect(e.q_psv_why).toBe("interlock");
    expect(e.q_baseline_trend).toBe("up");
  });

  it("respuestas correctas + decisión válida = 100 puntos", () => {
    const ev = evaluateMission({ ...emptyProgress(), inspected: REQUIRED_INSPECTION, answers: perfectAnswers(runs) }, runs);
    expect(ev.total).toBe(100);
    expect(ev.level).toBe("Excelente");
  });

  it("apagar la pila evita el disparo pero no obtiene puntaje de producción", () => {
    const ev = evaluateMission({ ...emptyProgress(), inspected: REQUIRED_INSPECTION, answers: perfectAnswers(runs) }, { ...runs, decision: lazyDecision });
    const c4 = ev.criteria.find((c) => c.id === "C4")!;
    expect(lazyDecision.kpis.firstTripMin).toBeNull();
    expect(c4.score).toBe(20);
    expect(c4.feedback.join(" ")).toContain("sacrifica producción");
  });

  it("respuestas incorrectas reciben retroalimentación con los valores del modelo", () => {
    const ev = evaluateMission({ ...emptyProgress(), inspected: ["EL-101"], answers: { q_protect: "PT-201", q_baseline_h2: "1", q_first_event: "PSV", q_trip_min: "5" } }, runs);
    expect(ev.total).toBeLessThan(40);
    const text = ev.criteria.flatMap((c) => c.feedback).join(" ");
    expect(text).toContain("PT-201 solo mide");
    expect(text).toContain("Faltó inspeccionar");
  });

  it("tolerancias: ±5 % puntaje completo, ±15 % parcial", () => {
    const ans = perfectAnswers(runs);
    const ref = baseline.kpis.meanH2Kgh;
    const c2 = (v: number) => evaluateMission({ ...emptyProgress(), answers: { ...ans, q_baseline_h2: String(v) } }, runs).criteria.find((c) => c.id === "C2")!.score;
    expect(c2(ref * 1.04)).toBe(20);
    expect(c2(ref * 1.1)).toBe(14);
    expect(c2(ref * 2)).toBe(8);
  });

  it("canAdvance exige acciones reales, no solo clics", () => {
    const p = emptyProgress();
    expect(canAdvance("inspect", p).ok).toBe(false);
    expect(canAdvance("inspect", { ...p, inspected: REQUIRED_INSPECTION, answers: { q_protect: "PSV-201" } }).ok).toBe(true);
    expect(canAdvance("baseline", { ...p, answers: { q_baseline_h2: "0.07", q_baseline_trend: "up" } }).ok).toBe(false);
    expect(canAdvance("decision", p).ok).toBe(false);
  });
});
