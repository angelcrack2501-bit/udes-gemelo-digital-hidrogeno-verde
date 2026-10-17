/**
 * Modelo electroquímico de la pila PEM (estado cuasi-estacionario).
 *
 *   V_celda = E_rev(T) + V_act(i) + V_ohm(i, T)
 *   E_rev(T) ≈ 1.229 − 0.9·10⁻³·(T − 298.15)            [V]
 *   V_act   = (R·T / (2·α·F)) · asinh( i / (2·i0) )      [V]
 *   V_ohm   = i · (δ/σ(T) + R_contacto)                 [V]
 *   σ(T)    = (0.005139·λ − 0.00326) · exp(1268·(1/303 − 1/T))  [S/cm]  (Springer et al., 1991)
 *   ṅ_H2    = η_F · N · I / (2F)                        [mol/s]  (ley de Faraday)
 *
 * Simplificaciones declaradas: sin sobrepotencial de transporte de masa,
 * i0 independiente de T, η_F constante, presión de operación sin efecto en
 * E_rev (término de Nernst omitido). Válido aproximadamente para
 * 0 < i ≤ 2 A/cm² y 40–80 °C.
 */
import { PHYS, STACK } from "@/domain/parameters";

const F = PHYS.F.value;
const R = PHYS.R.value;

export const toKelvin = (c: number) => c + 273.15;

export function reversibleVoltage(tC: number): number {
  return 1.229 - 0.9e-3 * (toKelvin(tC) - 298.15);
}

export function membraneConductivity(tC: number, lambda = STACK.LAMBDA.value): number {
  return (0.005139 * lambda - 0.00326) * Math.exp(1268 * (1 / 303 - 1 / toKelvin(tC)));
}

/** Resistencia específica de área total [Ω·cm²]. */
export function areaSpecificResistance(tC: number): number {
  const thicknessCm = STACK.MEMBRANE_UM.value * 1e-4;
  return thicknessCm / membraneConductivity(tC) + STACK.R_CONTACT.value;
}

export interface CellVoltageBreakdown {
  eRev: number;
  vAct: number;
  vOhm: number;
  vCell: number;
}

/** Tensión de celda para una densidad de corriente j [A/cm²] y temperatura [°C]. */
export function cellVoltage(j: number, tC: number): CellVoltageBreakdown {
  const T = toKelvin(tC);
  const eRev = reversibleVoltage(tC);
  if (j <= 0) return { eRev, vAct: 0, vOhm: 0, vCell: eRev };
  const vAct = ((R * T) / (2 * STACK.ALPHA.value * F)) * Math.asinh(j / (2 * STACK.I0_A_CM2.value));
  const vOhm = j * areaSpecificResistance(tC);
  return { eRev, vAct, vOhm, vCell: eRev + vAct + vOhm };
}

/** Potencia de pila [kW] para una corriente I [A]. */
export function stackPowerKw(currentA: number, tC: number): number {
  if (currentA <= 0) return 0;
  const j = currentA / STACK.AREA_CM2.value;
  return (STACK.N_CELLS.value * cellVoltage(j, tC).vCell * currentA) / 1000;
}

export const maxCurrentA = () => STACK.J_MAX.value * STACK.AREA_CM2.value;

/**
 * Resuelve la corriente que consume una potencia dada (bisección; P(I) es
 * monótona creciente). Si la potencia solicitada excede la alcanzable a
 * I_max, se limita a I_max y `limited` = true.
 */
export function currentForPower(powerKw: number, tC: number): { currentA: number; limited: boolean } {
  if (powerKw <= 0) return { currentA: 0, limited: false };
  const iMax = maxCurrentA();
  if (stackPowerKw(iMax, tC) <= powerKw) return { currentA: iMax, limited: true };
  let lo = 0;
  let hi = iMax;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (stackPowerKw(mid, tC) < powerKw) lo = mid;
    else hi = mid;
  }
  return { currentA: (lo + hi) / 2, limited: false };
}

/** Producción de H2 [mol/s] por ley de Faraday. */
export function h2MolarRate(currentA: number): number {
  return (STACK.FARADAIC_EFF.value * STACK.N_CELLS.value * currentA) / (2 * F);
}

export const molPerSecToNm3h = (mol: number) => mol * PHYS.V_M_NORMAL.value * 3600;
export const molPerSecToKgh = (mol: number) => mol * PHYS.M_H2.value * 3600;

/** Eficiencia de pila referida al PCS: η_F · V_tn / V_celda. */
export function stackEfficiencyHHV(vCell: number): number {
  return vCell > 0 ? (STACK.FARADAIC_EFF.value * PHYS.V_TN.value) / vCell : 0;
}

/** Calor generado [W] = N·I·(V_celda − V_tn). Negativo indicaría operación endotérmica. */
export function heatGenerationW(currentA: number, vCell: number): number {
  return STACK.N_CELLS.value * currentA * (vCell - PHYS.V_TN.value);
}

/** Curva de polarización para gráficas educativas. */
export function polarizationCurve(tC: number, points = 40): { j: number; v: number }[] {
  const out: { j: number; v: number }[] = [];
  for (let k = 1; k <= points; k++) {
    const j = (STACK.J_MAX.value * k) / points;
    out.push({ j, v: cellVoltage(j, tC).vCell });
  }
  return out;
}
