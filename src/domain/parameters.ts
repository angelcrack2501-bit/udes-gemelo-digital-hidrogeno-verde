/**
 * Parámetros del modelo. ÚNICA fuente de verdad para constantes físicas,
 * dimensionamiento ilustrativo y umbrales de alarma. La simulación, las
 * especificaciones del inspector, la guía y la documentación leen de aquí.
 *
 * Ningún valor proviene de la planta UDES: no se dispuso de hojas de datos,
 * P&ID ni mediciones. Los valores "illustrative" son plausibles para un
 * sistema PEM de laboratorio (~5 kW) y deben reemplazarse cuando existan
 * datos verificados de la instalación.
 */
import type { Provenance } from "./types";

export interface Parameter {
  value: number;
  unit: string;
  label: string;
  provenance: Provenance;
  source: string;
}

const p = (value: number, unit: string, label: string, provenance: Provenance, source: string): Parameter => ({
  value,
  unit,
  label,
  provenance,
  source,
});

/** Constantes físicas (literatura / CODATA). */
export const PHYS = {
  F: p(96485.33212, "C/mol", "Constante de Faraday", "literature", "CODATA 2018"),
  R: p(8.314462618, "J/(mol·K)", "Constante de los gases", "literature", "CODATA 2018"),
  M_H2: p(2.01588e-3, "kg/mol", "Masa molar H2", "literature", "IUPAC"),
  M_H2O: p(18.01528e-3, "kg/mol", "Masa molar H2O", "literature", "IUPAC"),
  V_M_NORMAL: p(0.022414, "m³/mol", "Volumen molar normal (0 °C, 1 atm)", "literature", "Gas ideal a condiciones normales"),
  HHV_H2: p(39.41, "kWh/kg", "Poder calorífico superior H2", "literature", "Valor estándar (≈141,8 MJ/kg)"),
  LHV_H2: p(33.33, "kWh/kg", "Poder calorífico inferior H2", "literature", "Valor estándar (≈120 MJ/kg)"),
  V_TN: p(1.481, "V", "Tensión termoneutra (HHV)", "literature", "ΔH/(2F) a 25 °C"),
  LFL_H2: p(4.0, "% vol", "Límite inferior de inflamabilidad H2 en aire", "literature", "Ver docs/MATRIZ_INVESTIGACION.md"),
} as const;

/** Pila PEM ilustrativa (20 celdas × 100 cm²). */
export const STACK = {
  N_CELLS: p(20, "—", "Número de celdas", "illustrative", "Dimensionamiento de laboratorio supuesto"),
  AREA_CM2: p(100, "cm²", "Área activa por celda", "illustrative", "Dimensionamiento de laboratorio supuesto"),
  J_MAX: p(2.0, "A/cm²", "Densidad de corriente máxima", "illustrative", "Rango típico PEM 1–2 A/cm²"),
  P_RATED_KW: p(5.0, "kW", "Potencia nominal de la fuente DC", "illustrative", "Dimensionamiento supuesto"),
  I0_A_CM2: p(1.0e-6, "A/cm²", "Densidad de corriente de intercambio (ánodo)", "illustrative", "Orden de magnitud de literatura PEM (ánodo IrO2)"),
  ALPHA: p(0.5, "—", "Coeficiente de transferencia de carga", "literature", "Valor simétrico habitual en modelos Butler–Volmer"),
  MEMBRANE_UM: p(178, "µm", "Espesor de membrana (tipo Nafion 117)", "literature", "Espesor nominal Nafion 117"),
  LAMBDA: p(14, "—", "Contenido de agua de la membrana λ", "literature", "Membrana hidratada en contacto con vapor saturado (Springer 1991)"),
  R_CONTACT: p(0.02, "Ω·cm²", "Resistencia de contacto/placas", "illustrative", "Orden de magnitud de literatura"),
  FARADAIC_EFF: p(0.98, "—", "Eficiencia faradaica (permeación de gases)", "illustrative", "Constante; en la realidad depende de j y presión"),
} as const;

/** Modelo térmico concentrado de la pila y lazo de agua. */
export const THERMAL = {
  C_TH: p(40000, "J/K", "Capacidad térmica concentrada (pila + agua del lazo)", "illustrative", "≈20 kg de pila + ≈5 L de agua"),
  T_SET: p(60, "°C", "Consigna de temperatura de operación", "illustrative", "Rango PEM típico 50–80 °C"),
  K_COOL: p(300, "W/K", "Ganancia del control de enfriamiento (válvula de 3 vías)", "illustrative", "Control proporcional supuesto"),
  UA_HX: p(250, "W/K", "UA máximo del intercambiador HX-101", "illustrative", "Dimensionamiento supuesto"),
  T_CW: p(20, "°C", "Temperatura de suministro del chiller CH-101", "illustrative", "Supuesto"),
  UA_AMB: p(4, "W/K", "Pérdidas al ambiente", "illustrative", "Supuesto"),
} as const;

/** Almacenamiento y uso de H2. */
export const STORAGE = {
  TANK_V_M3: p(0.05, "m³", "Volumen del tanque pulmón TK-201", "illustrative", "50 L, escala de laboratorio"),
  TANK_T_C: p(25, "°C", "Temperatura del gas en el tanque (isotérmico)", "illustrative", "Supuesto isotérmico"),
  TANK_MAWP: p(40, "bar", "Presión máxima de trabajo admisible TK-201", "illustrative", "Supuesto"),
  PSV_SET: p(35, "bar", "Presión de ajuste PSV-201", "illustrative", "Supuesto, < MAWP"),
  PSV_RESEAT: p(33, "bar", "Presión de recierre PSV-201", "illustrative", "Purga (blowdown) ≈6 %"),
  PSV_CAPACITY_NM3H: p(3.0, "Nm³/h", "Capacidad de alivio PSV-201", "illustrative", "> producción máxima"),
  FC_EFF_LHV: p(0.5, "—", "Eficiencia eléctrica de la celda de combustible (PCI)", "illustrative", "Rango PEMFC típico 40–60 %"),
  FC_MIN_INLET_BAR: p(2, "bar", "Presión mínima de entrada a FC-401", "illustrative", "Regulador supuesto"),
  FC_MAX_KW: p(2.0, "kW", "Potencia máxima FC-401", "illustrative", "Supuesto"),
} as const;

/** Agua desionizada. */
export const WATER = {
  DI_TANK_L: p(20, "L", "Volumen TK-001", "illustrative", "Supuesto"),
  REFILL_LPH: p(6, "L/h", "Caudal de reposición WP-001", "illustrative", "Supuesto"),
  REFILL_ON_PCT: p(40, "%", "Nivel de arranque de reposición", "illustrative", "Supuesto"),
  REFILL_OFF_PCT: p(80, "%", "Nivel de parada de reposición", "illustrative", "Supuesto"),
  CONDUCTIVITY: p(0.3, "µS/cm", "Conductividad del agua DI (constante)", "illustrative", "Agua tipo II < 1 µS/cm"),
} as const;

/** Recinto ventilado (modelo de mezcla perfecta). */
export const ENCLOSURE = {
  VOLUME_M3: p(40, "m³", "Volumen libre del recinto de proceso", "illustrative", "Supuesto, contenedor pequeño"),
  ACH_NOMINAL: p(6, "1/h", "Renovaciones de aire nominales (FAN-301)", "illustrative", "Supuesto"),
  ACH_DEGRADED: p(0.5, "1/h", "Renovaciones con ventilador detenido (infiltración)", "illustrative", "Supuesto"),
} as const;

/**
 * Umbrales de alarma y disparo. Todos ilustrativos: NO son límites de
 * seguridad de la planta UDES ni recomendaciones operativas reales.
 */
export const LIMITS = {
  TAH: p(75, "°C", "Alarma alta TT-101", "illustrative", "Umbral educativo"),
  TAHH: p(80, "°C", "Disparo muy alto TT-101 (paro de pila)", "illustrative", "Umbral educativo"),
  T_RESET: p(65, "°C", "Temperatura máxima para rearme", "illustrative", "Umbral educativo"),
  PAH: p(30, "bar", "Alarma alta PT-201", "illustrative", "Umbral educativo"),
  PAHH: p(32, "bar", "Disparo muy alto PT-201 (paro de pila)", "illustrative", "Umbral educativo"),
  P_RESET: p(28, "bar", "Presión máxima para rearme", "illustrative", "Umbral educativo"),
  GD_AH: p(10, "% LIE", "Alarma GD-301", "illustrative", "Práctica común de detección 10 % LIE"),
  GD_AHH: p(25, "% LIE", "Disparo GD-301 (paro de pila)", "illustrative", "Práctica común de detección 20–25 % LIE"),
  GD_RESET: p(5, "% LIE", "Concentración máxima para rearme", "illustrative", "Umbral educativo"),
  LAL: p(20, "%", "Alarma baja LT-001", "illustrative", "Umbral educativo"),
  LALL: p(10, "%", "Disparo muy bajo LT-001", "illustrative", "Umbral educativo"),
} as const;

/** Configuración numérica de la integración. */
export const NUMERICS = {
  DT_S: 2,
  SAMPLE_EVERY_S: 10,
} as const;

export const PARAMETER_GROUPS: { title: string; params: Record<string, Parameter> }[] = [
  { title: "Constantes físicas", params: PHYS },
  { title: "Pila PEM (ilustrativa)", params: STACK },
  { title: "Modelo térmico", params: THERMAL },
  { title: "Almacenamiento y uso de H2", params: STORAGE },
  { title: "Agua desionizada", params: WATER },
  { title: "Recinto ventilado", params: ENCLOSURE },
  { title: "Umbrales de alarma y disparo", params: LIMITS },
];
