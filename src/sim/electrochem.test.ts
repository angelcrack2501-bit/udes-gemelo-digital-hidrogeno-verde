import { describe, expect, it } from "vitest";
import {
  areaSpecificResistance,
  cellVoltage,
  currentForPower,
  h2MolarRate,
  membraneConductivity,
  molPerSecToKgh,
  molPerSecToNm3h,
  reversibleVoltage,
  stackEfficiencyHHV,
  stackPowerKw,
} from "./electrochem";

describe("modelo electroquímico", () => {
  it("E_rev a 25 °C es 1,229 V y disminuye con la temperatura", () => {
    expect(reversibleVoltage(25)).toBeCloseTo(1.229, 3);
    expect(reversibleVoltage(60)).toBeLessThan(reversibleVoltage(25));
    expect(reversibleVoltage(60)).toBeCloseTo(1.229 - 0.9e-3 * 35, 6);
  });

  it("conductividad de Springer: λ=14 a 30 °C ≈ 0,0687 S/cm y crece con T", () => {
    expect(membraneConductivity(29.85)).toBeCloseTo(0.005139 * 14 - 0.00326, 4);
    expect(membraneConductivity(60)).toBeGreaterThan(membraneConductivity(30));
    expect(areaSpecificResistance(60)).toBeLessThan(areaSpecificResistance(40));
  });

  it("tensión de celda a 1 A/cm² y 60 °C dentro del rango PEM típico (1,7–2,0 V)", () => {
    const v = cellVoltage(1, 60);
    expect(v.vCell).toBeGreaterThan(1.7);
    expect(v.vCell).toBeLessThan(2.0);
    expect(v.vCell).toBeCloseTo(v.eRev + v.vAct + v.vOhm, 10);
  });

  it("la curva de polarización es monótona creciente", () => {
    let prev = 0;
    for (let j = 0.05; j <= 2; j += 0.05) {
      const v = cellVoltage(j, 60).vCell;
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("ley de Faraday: 100 A × 20 celdas × η_F 0,98 → cálculo manual", () => {
    const n = h2MolarRate(100);
    expect(n).toBeCloseTo((0.98 * 20 * 100) / (2 * 96485.33212), 10);
    expect(molPerSecToNm3h(n)).toBeCloseTo(n * 0.022414 * 3600, 10);
    expect(molPerSecToKgh(n)).toBeCloseTo(0.0737, 3);
  });

  it("monotonía P(I) y eficiencia: currentForPower invierte stackPowerKw", () => {
    for (const p of [0.5, 1, 2.5, 3.5, 5]) {
      const { currentA, limited } = currentForPower(p, 60);
      expect(limited).toBe(false);
      expect(stackPowerKw(currentA, 60)).toBeCloseTo(p, 6);
    }
    const lo = currentForPower(1, 60).currentA;
    const hi = currentForPower(5, 60).currentA;
    const vLo = cellVoltage(lo / 100, 60).vCell;
    const vHi = cellVoltage(hi / 100, 60).vCell;
    expect(stackEfficiencyHHV(vLo)).toBeGreaterThan(stackEfficiencyHHV(vHi));
  });

  it("limita la corriente cuando la potencia solicitada excede la alcanzable a j_max", () => {
    const r = currentForPower(50, 60);
    expect(r.limited).toBe(true);
    expect(r.currentA).toBe(200);
  });
});
