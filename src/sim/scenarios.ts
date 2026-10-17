/** Definición de escenarios documentados y rangos de entradas permitidas. */
import { LIMITS, STORAGE } from "@/domain/parameters";
import type { InputRange, ScenarioDefinition, ScenarioId, ScenarioInputs } from "./types";

export const BASE_INPUTS: ScenarioInputs = {
  durationMin: 60,
  powerSetKw: 3.5,
  sourceMode: "constant",
  fcLoadKw: 1.0,
  ambientC: 25,
  initialTankBar: 20,
  initialStackC: 60,
  faultAtMin: 10,
  interventionEnabled: false,
  interventionAtMin: 30,
  leakNlMin: 10,
};

export const INPUT_RANGES: Record<InputRange["key"], InputRange> = {
  durationMin: { key: "durationMin", label: "Duración simulada", unit: "min", min: 30, max: 120, step: 10, help: "Tiempo de proceso simulado (se calcula de inmediato, no en tiempo real)." },
  powerSetKw: { key: "powerSetKw", label: "Consigna de potencia de la pila", unit: "kW", min: 0.5, max: 5, step: 0.1, help: "Potencia DC solicitada a PSU-001. Limitada por la corriente máxima de la pila." },
  fcLoadKw: { key: "fcLoadKw", label: "Carga de la celda de combustible", unit: "kW", min: 0, max: STORAGE.FC_MAX_KW.value, step: 0.1, help: "Potencia eléctrica demandada a FC-401; define el consumo de H2 del tanque." },
  ambientC: { key: "ambientC", label: "Temperatura ambiente", unit: "°C", min: 15, max: 35, step: 1, help: "Afecta las pérdidas térmicas al ambiente y el volumen real de una fuga." },
  initialTankBar: { key: "initialTankBar", label: "Presión inicial del tanque", unit: "bar", min: 5, max: 28, step: 1, help: "Inventario inicial de H2 en TK-201." },
  initialStackC: { key: "initialStackC", label: "Temperatura inicial de pila", unit: "°C", min: 40, max: 70, step: 1, help: "Condición inicial del modelo térmico." },
  faultAtMin: { key: "faultAtMin", label: "Minuto de la perturbación", unit: "min", min: 1, max: 60, step: 1, help: "Instante en que ocurre la desviación o falla del escenario." },
  interventionAtMin: { key: "interventionAtMin", label: "Minuto de la intervención", unit: "min", min: 2, max: 115, step: 1, help: "Instante en que el operador aplica la acción correctiva." },
  leakNlMin: { key: "leakNlMin", label: "Caudal de fuga hipotética", unit: "NL/min", min: 2, max: 20, step: 1, help: "Caudal de H2 liberado al recinto (litros normales por minuto)." },
};

const COMMON_ASSUMPTIONS = [
  "Configuración de planta conceptual: no verificada contra la instalación UDES.",
  "Parámetros de dimensionamiento ilustrativos (ver Documentación → Parámetros).",
  "Integración explícita de Euler con paso de 2 s; resultados deterministas.",
];

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "normal",
    code: "ESC-01",
    title: "Operación nominal",
    category: "normal",
    summary: "Línea base: la pila opera a potencia constante y la celda de combustible consume H2 del tanque.",
    learningGoal: "Relacionar potencia eléctrica, corriente, producción de H2 (ley de Faraday) y balance de masa del tanque.",
    adjustable: ["powerSetKw", "fcLoadKw", "initialTankBar", "durationMin"],
    defaults: { ...BASE_INPUTS },
    disturbance: null,
    intervention: null,
    focusEquipment: ["EL-101", "TK-201", "FC-401"],
    expectedBehavior: [
      "La temperatura se estabiliza cerca de la consigna (≈60 °C) gracias al control de HX-101.",
      "La presión del tanque evoluciona lentamente según producción − consumo.",
      "No se activan alarmas con los valores por defecto.",
    ],
    equations: ["faraday", "polarization", "thermal", "tank"],
    assumptions: COMMON_ASSUMPTIONS,
    validation: ["engine.test.ts › escenario nominal sin alarmas", "engine.test.ts › balance de masa del tanque"],
  },
  {
    id: "power_change",
    code: "ESC-02",
    title: "Variación de potencia y perfil fotovoltaico",
    category: "input_change",
    summary: "El estudiante cambia la consigna de potencia o activa un perfil FV ilustrativo con paso de nube.",
    learningGoal: "Observar que más potencia produce más H2 pero con mayor tensión de celda: el consumo específico (kWh/kg) empeora a alta carga.",
    adjustable: ["powerSetKw", "sourceMode", "fcLoadKw", "initialTankBar", "durationMin"],
    defaults: { ...BASE_INPUTS, powerSetKw: 5, sourceMode: "pv_profile" },
    disturbance: "Con perfil FV: nube ilustrativa entre los minutos 20 y 32 reduce la potencia disponible al 35 %.",
    intervention: null,
    focusEquipment: ["PV-001", "PSU-001", "EL-101"],
    expectedBehavior: [
      "La producción de H2 sigue a la corriente (proporcionalidad de Faraday).",
      "La eficiencia (PCS) aumenta a carga parcial y disminuye a carga alta.",
      "Durante la nube cae la producción y el tanque puede despresurizarse.",
    ],
    equations: ["faraday", "polarization", "efficiency", "pv"],
    assumptions: [...COMMON_ASSUMPTIONS, "Perfil FV ilustrativo (seno diurno + nube fija), no derivado de datos meteorológicos de Bucaramanga."],
    validation: ["electrochem.test.ts › monotonía P(I) y eficiencia", "engine.test.ts › perfil FV reduce producción durante la nube"],
  },
  {
    id: "demand_loss",
    code: "ESC-03",
    title: "Pérdida de demanda de H2 (desviación de proceso)",
    category: "process_deviation",
    summary: "La válvula XV-202 se cierra: la celda deja de consumir y el H2 producido se acumula en el tanque.",
    learningGoal: "Comprender cómo un desbalance de masa eleva la presión y cómo actúan la alarma (PAH) y el enclavamiento (PAHH).",
    adjustable: ["powerSetKw", "initialTankBar", "faultAtMin", "interventionEnabled", "interventionAtMin", "durationMin"],
    defaults: { ...BASE_INPUTS },
    disturbance: "XV-202 se cierra en el minuto indicado (demanda de FC-401 = 0).",
    intervention: `Reabrir XV-202 y solicitar el rearme de la pila (permitido cuando PT-201 < ${LIMITS.P_RESET.value} bar).`,
    focusEquipment: ["XV-202", "TK-201", "PT-201", "PLC-001", "EL-101"],
    expectedBehavior: [
      `La presión sube linealmente; PAH a ${LIMITS.PAH.value} bar y disparo PAHH a ${LIMITS.PAHH.value} bar.`,
      "El PLC detiene la pila; la presión se mantiene (no hay consumo).",
      `La PSV-201 (${STORAGE.PSV_SET.value} bar) no debería abrir porque el enclavamiento actúa antes.`,
    ],
    equations: ["faraday", "tank", "alarms"],
    assumptions: [...COMMON_ASSUMPTIONS, "Gas ideal isotérmico en el tanque (Z≈1,02 a 30 bar: error ≈2 %)."],
    validation: ["engine.test.ts › PAH precede a PAHH y la PSV no abre", "engine.test.ts › la intervención temprana evita el disparo"],
  },
  {
    id: "cooling_fault",
    code: "ESC-04",
    title: "Falla de la bomba de enfriamiento (falla de equipo)",
    category: "equipment_fault",
    summary: "La bomba P-103 se detiene: HX-101 deja de retirar calor y la pila se calienta.",
    learningGoal: "Aplicar el balance de energía: el calor (V_celda − V_tn)·I·N debe evacuarse; sin enfriamiento la temperatura sube hasta el disparo.",
    adjustable: ["powerSetKw", "faultAtMin", "interventionEnabled", "interventionAtMin", "ambientC", "durationMin"],
    defaults: { ...BASE_INPUTS },
    disturbance: "P-103 se detiene en el minuto indicado.",
    intervention: `Restablecer P-103 y solicitar el rearme (permitido cuando TT-101 < ${LIMITS.T_RESET.value} °C).`,
    focusEquipment: ["P-103", "HX-101", "CH-101", "EL-101", "TT-101"],
    expectedBehavior: [
      `La temperatura sube ≈1 °C/min a 3,5 kW; TAH a ${LIMITS.TAH.value} °C y disparo TAHH a ${LIMITS.TAHH.value} °C.`,
      "Tras el disparo, la pila se enfría lentamente solo por pérdidas al ambiente.",
      "Con intervención, la temperatura vuelve a la consigna y la producción se reanuda.",
    ],
    equations: ["polarization", "thermal", "alarms"],
    assumptions: [...COMMON_ASSUMPTIONS, "Modelo térmico concentrado (una sola temperatura para pila y lazo)."],
    validation: ["engine.test.ts › TAH precede a TAHH", "engine.test.ts › la recuperación reanuda la producción"],
  },
  {
    id: "sensor_stuck",
    code: "ESC-05",
    title: "Transmisor PT-201 congelado (falla de instrumentación)",
    category: "instrument_fault",
    summary: "PT-201 queda fijo en su última lectura; 5 minutos después se cierra XV-202. El PLC queda 'ciego'.",
    learningGoal: "Distinguir valor medido y valor real, y entender por qué una protección mecánica independiente (PSV) es una capa de protección distinta del control.",
    adjustable: ["powerSetKw", "initialTankBar", "faultAtMin", "interventionEnabled", "interventionAtMin", "durationMin"],
    defaults: { ...BASE_INPUTS, initialTankBar: 24 },
    disturbance: "PT-201 se congela en el minuto indicado; XV-202 se cierra 5 min después.",
    intervention: "Sustituir/recalibrar PT-201: el PLC vuelve a ver la presión real.",
    focusEquipment: ["PT-201", "PLC-001", "TK-201", "PSV-201", "VS-301"],
    expectedBehavior: [
      "La presión real sube mientras PT-201 muestra un valor constante: no hay PAH ni PAHH.",
      `La PSV-201 abre a ${STORAGE.PSV_SET.value} bar (presión real) y ventea H2 a VS-301.`,
      "Con intervención antes de la apertura, el PLC dispara la pila al ver la presión real.",
    ],
    equations: ["tank", "psv", "alarms"],
    assumptions: [...COMMON_ASSUMPTIONS, "La PSV abre instantáneamente a su presión de ajuste con capacidad constante."],
    validation: ["engine.test.ts › sensor congelado: sin PAHH y apertura de PSV", "engine.test.ts › reparar el sensor provoca el disparo"],
  },
  {
    id: "leak_ventilation",
    code: "ESC-06",
    title: "Fuga hipotética de H2 con ventilación detenida",
    category: "safety",
    summary: "Se inicia una fuga en la línea H2-201 y, al mismo tiempo, se detiene FAN-301.",
    learningGoal: "Usar un balance de dilución (mezcla perfecta) para relacionar caudal de fuga, ventilación y concentración frente al LIE.",
    adjustable: ["leakNlMin", "faultAtMin", "interventionEnabled", "interventionAtMin", "durationMin"],
    defaults: { ...BASE_INPUTS },
    disturbance: "Fuga hipotética desde el inventario del tanque + detención de FAN-301.",
    intervention: `Aislar la fuga, restablecer FAN-301 y solicitar rearme (permitido cuando GD-301 < ${LIMITS.GD_RESET.value} % LIE).`,
    focusEquipment: ["ENC-301", "GD-301", "FAN-301", "TK-201", "EL-101"],
    expectedBehavior: [
      `La concentración crece; alarma a ${LIMITS.GD_AH.value} % LIE y disparo de la pila a ${LIMITS.GD_AHH.value} % LIE.`,
      "Detener la pila NO detiene la fuga: el tanque sigue alimentándola.",
      "Con ventilación nominal (6 renov./h) la misma fuga quedaría por debajo de la alarma.",
    ],
    equations: ["dilution", "tank", "alarms"],
    assumptions: [
      ...COMMON_ASSUMPTIONS,
      "Modelo de mezcla perfecta: NO representa la estratificación del H2 bajo el techo ni sustituye un análisis CFD de dispersión.",
      "Escenario hipotético con fines educativos; no es una evaluación de riesgo ni un procedimiento de emergencia.",
    ],
    validation: ["engine.test.ts › fuga: alarma GD antes del disparo y la fuga continúa tras el disparo"],
  },
];

export const scenarioById = new Map<ScenarioId, ScenarioDefinition>(SCENARIOS.map((s) => [s.id, s]));

/** Normaliza entradas a sus rangos permitidos (protección contra valores fuera de dominio). */
export function clampInputs(inputs: ScenarioInputs): ScenarioInputs {
  const out = { ...inputs };
  for (const r of Object.values(INPUT_RANGES)) {
    const v = out[r.key];
    const clamped = Math.min(r.max, Math.max(r.min, Number.isFinite(v) ? v : r.min));
    out[r.key] = Math.round(clamped / r.step) * r.step;
    out[r.key] = Number(out[r.key].toFixed(4));
  }
  out.faultAtMin = Math.min(out.faultAtMin, out.durationMin - 1);
  out.interventionAtMin = Math.min(Math.max(out.interventionAtMin, out.faultAtMin + 1), out.durationMin);
  return out;
}
