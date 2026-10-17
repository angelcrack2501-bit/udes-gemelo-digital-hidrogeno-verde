/**
 * Definición de la planta conceptual de hidrógeno verde.
 *
 * IMPORTANTE: No se dispuso de documentación de la instalación UDES (P&ID,
 * hojas de datos, videos o fotografías). Esta configuración es una
 * arquitectura PEM de laboratorio típica (fuente renovable → electrólisis →
 * acondicionamiento → almacenamiento → uso) y cada equipo está marcado como
 * `verifiedInUdes: false`. Debe revisarse contra la planta real.
 */
import type { Connection, Equipment, Instrument, ProcessStage, Variable } from "./types";
import { ENCLOSURE, LIMITS, STACK, STORAGE, THERMAL, WATER } from "./parameters";

const fmt = (n: number) => n.toLocaleString("es-CO");

export const STAGES: ProcessStage[] = [
  { id: "power", order: 1, name: "Energía renovable y potencia", description: "Generación fotovoltaica conceptual y conversión a corriente continua para la pila." },
  { id: "water", order: 2, name: "Tratamiento de agua", description: "Purificación del agua de red hasta agua desionizada apta para electrólisis PEM." },
  { id: "electrolysis", order: 3, name: "Electrólisis PEM", description: "Disociación del agua en H2 (cátodo) y O2 (ánodo) mediante corriente continua." },
  { id: "gas_conditioning", order: 4, name: "Separación y acondicionamiento", description: "Separación gas–líquido, gestión térmica y secado del hidrógeno." },
  { id: "storage", order: 5, name: "Almacenamiento", description: "Tanque pulmón de baja presión con protección por sobrepresión." },
  { id: "end_use", order: 6, name: "Uso final", description: "Reconversión del H2 en electricidad mediante celda de combustible." },
  { id: "safety_control", order: 7, name: "Seguridad y control", description: "Control PLC, enclavamientos, ventilación, detección de gas y venteo." },
];

export const VARIABLES: Variable[] = [
  { id: "pv_avail", name: "Potencia FV disponible", symbol: "P_FV", unit: "kW", description: "Potencia que el arreglo FV conceptual puede entregar según el perfil ilustrativo.", source: "model" },
  { id: "p_set", name: "Consigna de potencia", symbol: "P_set", unit: "kW", description: "Potencia DC solicitada a la pila por el operador (entrada del escenario).", source: "input" },
  { id: "p_stack", name: "Potencia de la pila", symbol: "P", unit: "kW", description: "Potencia DC efectivamente entregada a la pila: P = N·V_celda·I.", source: "model" },
  { id: "i_stack", name: "Corriente de pila", symbol: "I", unit: "A", description: "Corriente que atraviesa las celdas en serie.", source: "model" },
  { id: "v_cell", name: "Tensión media de celda", symbol: "V_celda", unit: "V", description: "E_rev + sobrepotencial de activación + caída óhmica.", source: "model" },
  { id: "t_stack", name: "Temperatura de pila", symbol: "T", unit: "°C", description: "Temperatura concentrada de la pila y del lazo de agua.", source: "model" },
  { id: "q_gen", name: "Calor generado", symbol: "Q_gen", unit: "kW", description: "N·I·(V_celda − V_tn): energía eléctrica no convertida en entalpía química.", source: "model" },
  { id: "q_cool", name: "Calor retirado por HX-101", symbol: "Q_enf", unit: "kW", description: "Calor extraído por el intercambiador con el agua del chiller.", source: "model" },
  { id: "h2_nm3h", name: "Producción de H2", symbol: "Q_H2", unit: "Nm³/h", description: "Ley de Faraday: η_F·N·I/(2F), en volumen normal.", source: "model" },
  { id: "h2_kgh", name: "Producción másica de H2", symbol: "ṁ_H2", unit: "kg/h", description: "Producción de H2 expresada en masa.", source: "model" },
  { id: "o2_nm3h", name: "Producción de O2", symbol: "Q_O2", unit: "Nm³/h", description: "Mitad molar de la producción de H2 (estequiometría).", source: "model" },
  { id: "eff_hhv", name: "Eficiencia de la pila (PCS)", symbol: "η", unit: "%", description: "η_F·V_tn/V_celda: energía química (PCS) por energía eléctrica.", source: "model" },
  { id: "sec", name: "Consumo específico de energía", symbol: "CEE", unit: "kWh/kg", description: "Energía eléctrica de la pila por kg de H2 producido.", source: "model" },
  { id: "p_tank", name: "Presión real del tanque", symbol: "p", unit: "bar", description: "Presión calculada por gas ideal isotérmico: p = nRT/V.", source: "model" },
  { id: "p_tank_meas", name: "Presión medida PT-201", symbol: "p_med", unit: "bar", description: "Lectura del transmisor PT-201 (puede diferir de la real si el instrumento falla).", source: "instrument_model" },
  { id: "psv_flow", name: "Caudal de alivio PSV-201", symbol: "Q_PSV", unit: "Nm³/h", description: "Caudal venteado por la válvula de alivio cuando está abierta.", source: "model" },
  { id: "fc_power", name: "Potencia de la celda de combustible", symbol: "P_FC", unit: "kW", description: "Potencia eléctrica entregada por FC-401.", source: "model" },
  { id: "fc_h2", name: "Consumo de H2 de FC-401", symbol: "ṁ_FC", unit: "kg/h", description: "P_FC/(η_FC·PCI).", source: "model" },
  { id: "di_level", name: "Nivel TK-001", symbol: "L", unit: "%", description: "Nivel del tanque de agua desionizada.", source: "model" },
  { id: "conductivity", name: "Conductividad del agua DI", symbol: "κ", unit: "µS/cm", description: "Constante en esta versión (calidad del agua no modelada dinámicamente).", source: "model" },
  { id: "leak_nm3h", name: "Caudal de fuga hipotética", symbol: "Q_fuga", unit: "Nm³/h", description: "Fuga de H2 al recinto (solo en el escenario de fuga).", source: "input" },
  { id: "room_lel", name: "Concentración de H2 en el recinto", symbol: "C", unit: "% LIE", description: "Modelo de mezcla perfecta; % del límite inferior de inflamabilidad (4 % vol).", source: "model" },
  { id: "ach", name: "Renovaciones de aire", symbol: "ACH", unit: "1/h", description: "Caudal de ventilación / volumen del recinto.", source: "model" },
];

export const EQUIPMENT: Equipment[] = [
  {
    id: "PV-001", name: "Arreglo fotovoltaico", type: "pv_array", stageId: "power",
    role: "Fuente renovable conceptual que suministra la potencia eléctrica para la electrólisis ('verde' por su origen).",
    specs: [{ label: "Potencia pico", value: `${STACK.P_RATED_KW.value} kWp`, provenance: "illustrative" }],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["pv_avail"],
  },
  {
    id: "PSU-001", name: "Fuente DC / convertidor de potencia", type: "power_supply", stageId: "power",
    role: "Convierte la energía disponible en corriente continua regulada para la pila y ejecuta los disparos del PLC.",
    specs: [
      { label: "Potencia máxima", value: `${STACK.P_RATED_KW.value} kW`, provenance: "illustrative" },
      { label: "Corriente máxima", value: `${STACK.J_MAX.value * STACK.AREA_CM2.value} A`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["p_set", "p_stack", "i_stack"],
  },
  {
    id: "PLC-001", name: "Gabinete de control (PLC)", type: "plc", stageId: "safety_control",
    role: "Ejecuta la lógica de control y los enclavamientos: compara las lecturas de los instrumentos con umbrales y detiene la pila si se superan.",
    specs: [{ label: "Lógica", value: "Alarmas + disparos con enclavamiento (latch)", provenance: "conceptual" }],
    verifiedInUdes: false, provenance: "conceptual", variableIds: [],
    notes: "El PLC actúa sobre lecturas MEDIDAS; si un transmisor falla, el PLC puede quedar 'ciego'.",
  },
  {
    id: "WP-001", name: "Unidad de purificación de agua", type: "water_purifier", stageId: "water",
    role: "Ósmosis inversa + desionización: produce agua de baja conductividad para proteger la membrana PEM.",
    specs: [
      { label: "Caudal de reposición", value: `${WATER.REFILL_LPH.value} L/h`, provenance: "illustrative" },
      { label: "Conductividad de salida", value: `${WATER.CONDUCTIVITY.value} µS/cm`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["conductivity"],
  },
  {
    id: "TK-001", name: "Tanque de agua desionizada", type: "di_tank", stageId: "water",
    role: "Almacena agua DI de reposición para compensar el agua consumida por la reacción.",
    specs: [{ label: "Volumen", value: `${WATER.DI_TANK_L.value} L`, provenance: "illustrative" }],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["di_level"],
  },
  {
    id: "P-001", name: "Bomba de reposición de agua", type: "pump", stageId: "water",
    role: "Envía agua DI al separador de O2, que actúa como depósito del lazo anódico.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: [],
  },
  {
    id: "SEP-102", name: "Separador gas–líquido O2 (ánodo)", type: "separator", stageId: "gas_conditioning",
    role: "Separa el O2 del agua de recirculación anódica; el O2 se ventea y el agua vuelve a la pila.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: ["o2_nm3h"],
  },
  {
    id: "P-102", name: "Bomba de recirculación anódica", type: "pump", stageId: "electrolysis",
    role: "Hace circular el agua del ánodo a través del intercambiador y la pila (reactivo y medio de enfriamiento).",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: [],
  },
  {
    id: "HX-101", name: "Intercambiador de calor del lazo", type: "heat_exchanger", stageId: "gas_conditioning",
    role: "Retira el calor generado en la pila transfiriéndolo al agua fría del chiller.",
    specs: [
      { label: "UA máximo", value: `${THERMAL.UA_HX.value} W/K`, provenance: "illustrative" },
      { label: "Consigna de temperatura", value: `${THERMAL.T_SET.value} °C`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["q_cool"],
  },
  {
    id: "CH-101", name: "Enfriador (chiller)", type: "chiller", stageId: "gas_conditioning",
    role: "Suministra agua de enfriamiento al intercambiador HX-101.",
    specs: [{ label: "Temperatura de suministro", value: `${THERMAL.T_CW.value} °C`, provenance: "illustrative" }],
    verifiedInUdes: false, provenance: "conceptual", variableIds: [],
  },
  {
    id: "P-103", name: "Bomba de agua de enfriamiento", type: "pump", stageId: "gas_conditioning",
    role: "Circula el agua del chiller por HX-101. Si falla, la pila pierde su principal vía de evacuación de calor.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: ["q_cool"],
  },
  {
    id: "EL-101", name: "Pila de electrólisis PEM", type: "electrolyzer_stack", stageId: "electrolysis",
    role: "Núcleo del proceso: con corriente continua disocia el agua; H2 en el cátodo, O2 en el ánodo.",
    specs: [
      { label: "Celdas", value: `${STACK.N_CELLS.value}`, provenance: "illustrative" },
      { label: "Área activa", value: `${STACK.AREA_CM2.value} cm²/celda`, provenance: "illustrative" },
      { label: "Membrana", value: `${STACK.MEMBRANE_UM.value} µm (tipo Nafion 117)`, provenance: "literature" },
      { label: "Densidad de corriente máx.", value: `${STACK.J_MAX.value} A/cm²`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual",
    variableIds: ["i_stack", "v_cell", "p_stack", "t_stack", "q_gen", "h2_nm3h", "h2_kgh", "eff_hhv", "sec"],
  },
  {
    id: "SEP-101", name: "Separador gas–líquido H2 (cátodo)", type: "separator", stageId: "gas_conditioning",
    role: "Separa el agua arrastrada por el H2 húmedo que sale del cátodo.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: ["h2_nm3h"],
  },
  {
    id: "DRY-201", name: "Secador / purificador de H2", type: "dryer", stageId: "gas_conditioning",
    role: "Elimina humedad (y trazas de O2) del hidrógeno antes del almacenamiento. Modelado como ideal, sin pérdidas.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: [],
  },
  {
    id: "TK-201", name: "Tanque pulmón de H2", type: "buffer_tank", stageId: "storage",
    role: "Acumula H2 y amortigua la diferencia entre producción y consumo. Su presión refleja el balance de masa.",
    specs: [
      { label: "Volumen", value: `${fmt(STORAGE.TANK_V_M3.value * 1000)} L`, provenance: "illustrative" },
      { label: "MAWP", value: `${STORAGE.TANK_MAWP.value} bar`, provenance: "illustrative" },
      { label: "Alarma / disparo", value: `${LIMITS.PAH.value} / ${LIMITS.PAHH.value} bar`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["p_tank", "p_tank_meas"],
  },
  {
    id: "PSV-201", name: "Válvula de alivio de presión", type: "relief_valve", stageId: "safety_control",
    role: "Protección mecánica independiente del PLC: abre por la presión REAL del tanque y ventea H2 a lugar seguro.",
    specs: [
      { label: "Presión de ajuste", value: `${STORAGE.PSV_SET.value} bar`, provenance: "illustrative" },
      { label: "Recierre", value: `${STORAGE.PSV_RESEAT.value} bar`, provenance: "illustrative" },
      { label: "Capacidad", value: `${STORAGE.PSV_CAPACITY_NM3H.value} Nm³/h`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["psv_flow"],
  },
  {
    id: "XV-202", name: "Válvula de suministro a la celda", type: "isolation_valve", stageId: "storage",
    role: "Válvula de aislamiento entre el tanque y la celda de combustible. Si se cierra, desaparece la demanda de H2.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: [],
  },
  {
    id: "FC-401", name: "Celda de combustible PEM", type: "fuel_cell", stageId: "end_use",
    role: "Reconvierte H2 en electricidad (consumidor del sistema). Su demanda determina la salida de masa del tanque.",
    specs: [
      { label: "Potencia máxima", value: `${STORAGE.FC_MAX_KW.value} kW`, provenance: "illustrative" },
      { label: "Eficiencia (PCI)", value: `${STORAGE.FC_EFF_LHV.value * 100} %`, provenance: "illustrative" },
    ],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["fc_power", "fc_h2"],
  },
  {
    id: "VS-301", name: "Chimenea de venteo", type: "vent_stack", stageId: "safety_control",
    role: "Descarga a lugar seguro el O2 del ánodo y el H2 aliviado por la PSV.",
    specs: [], verifiedInUdes: false, provenance: "conceptual", variableIds: ["psv_flow"],
  },
  {
    id: "FAN-301", name: "Ventilador de extracción", type: "ventilation_fan", stageId: "safety_control",
    role: "Renueva el aire del recinto para diluir cualquier fuga de H2 por debajo de los umbrales de detección.",
    specs: [{ label: "Renovaciones nominales", value: `${ENCLOSURE.ACH_NOMINAL.value} /h`, provenance: "illustrative" }],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["ach"],
  },
  {
    id: "ENC-301", name: "Recinto de proceso", type: "enclosure", stageId: "safety_control",
    role: "Volumen ventilado que contiene los equipos de gas; donde se acumularía una fuga.",
    specs: [{ label: "Volumen libre", value: `${ENCLOSURE.VOLUME_M3.value} m³`, provenance: "illustrative" }],
    verifiedInUdes: false, provenance: "conceptual", variableIds: ["room_lel", "leak_nm3h"],
  },
];

export const CONNECTIONS: Connection[] = [
  { id: "C01", lineTag: "E-001", from: "PV-001", to: "PSU-001", fluid: "electric", description: "Bus DC del arreglo fotovoltaico" },
  { id: "C02", lineTag: "E-101", from: "PSU-001", to: "EL-101", fluid: "electric", description: "Corriente continua de la pila" },
  { id: "C03", lineTag: "S-101", from: "PLC-001", to: "PSU-001", fluid: "signal", description: "Consigna de potencia y orden de disparo" },
  { id: "C04", lineTag: "W-001", from: "WP-001", to: "TK-001", fluid: "di_water", description: "Agua desionizada de reposición" },
  { id: "C05", lineTag: "W-002", from: "TK-001", to: "P-001", fluid: "di_water", description: "Succión de la bomba de reposición" },
  { id: "C06", lineTag: "W-003", from: "P-001", to: "SEP-102", fluid: "di_water", description: "Reposición al lazo anódico" },
  { id: "C07", lineTag: "W-101", from: "SEP-102", to: "P-102", fluid: "di_water", description: "Agua de recirculación anódica" },
  { id: "C08", lineTag: "W-102", from: "P-102", to: "HX-101", fluid: "di_water", description: "Agua anódica hacia el intercambiador" },
  { id: "C09", lineTag: "W-103", from: "HX-101", to: "EL-101", fluid: "di_water", description: "Agua anódica enfriada hacia la pila" },
  { id: "C10", lineTag: "O2-101", from: "EL-101", to: "SEP-102", fluid: "o2", description: "Mezcla O2/agua del ánodo" },
  { id: "C11", lineTag: "O2-102", from: "SEP-102", to: "VS-301", fluid: "o2", description: "Venteo de O2" },
  { id: "C12", lineTag: "H2-101", from: "EL-101", to: "SEP-101", fluid: "h2", description: "H2 húmedo del cátodo" },
  { id: "C13", lineTag: "H2-102", from: "SEP-101", to: "DRY-201", fluid: "h2", description: "H2 hacia el secador" },
  { id: "C14", lineTag: "H2-201", from: "DRY-201", to: "TK-201", fluid: "h2", description: "H2 seco hacia el tanque pulmón" },
  { id: "C15", lineTag: "H2-202", from: "TK-201", to: "PSV-201", fluid: "h2", description: "Conexión de la válvula de alivio" },
  { id: "C16", lineTag: "V-201", from: "PSV-201", to: "VS-301", fluid: "vent", description: "Descarga de alivio a venteo" },
  { id: "C17", lineTag: "H2-203", from: "TK-201", to: "XV-202", fluid: "h2", description: "Salida de H2 del tanque" },
  { id: "C18", lineTag: "H2-401", from: "XV-202", to: "FC-401", fluid: "h2", description: "Suministro a la celda de combustible" },
  { id: "C19", lineTag: "CW-101", from: "CH-101", to: "P-103", fluid: "coolant", description: "Agua fría del chiller" },
  { id: "C20", lineTag: "CW-102", from: "P-103", to: "HX-101", fluid: "coolant", description: "Agua fría hacia HX-101" },
  { id: "C21", lineTag: "CW-103", from: "HX-101", to: "CH-101", fluid: "coolant", description: "Retorno de agua de enfriamiento" },
  { id: "C22", lineTag: "S-301", from: "PLC-001", to: "FAN-301", fluid: "signal", description: "Mando del ventilador de extracción" },
  { id: "C23", lineTag: "A-301", from: "FAN-301", to: "ENC-301", fluid: "vent", description: "Extracción de aire del recinto" },
];

export const INSTRUMENTS: Instrument[] = [
  { id: "JT-101", name: "Medidor de potencia DC", kind: "power", attachedTo: "PSU-001", variableId: "p_stack", realization: "physical", description: "Potencia entregada a la pila." },
  { id: "IT-101", name: "Transmisor de corriente", kind: "current", attachedTo: "PSU-001", variableId: "i_stack", realization: "physical", description: "Corriente de pila." },
  { id: "ET-101", name: "Tensión media de celda", kind: "voltage", attachedTo: "EL-101", variableId: "v_cell", realization: "physical", description: "Tensión total de pila dividida por el número de celdas." },
  { id: "TT-101", name: "Transmisor de temperatura de pila", kind: "temperature", attachedTo: "EL-101", variableId: "t_stack", realization: "physical", description: `Alarma ${LIMITS.TAH.value} °C · disparo ${LIMITS.TAHH.value} °C.` },
  { id: "FT-201", name: "Caudal de H2 (sensor virtual)", kind: "flow", attachedTo: "SEP-101", variableId: "h2_nm3h", realization: "soft", description: "Calculado por ley de Faraday a partir de IT-101 (no es un caudalímetro físico)." },
  { id: "PT-201", name: "Transmisor de presión del tanque", kind: "pressure", attachedTo: "TK-201", variableId: "p_tank_meas", realization: "physical", description: `Alarma ${LIMITS.PAH.value} bar · disparo ${LIMITS.PAHH.value} bar.` },
  { id: "CT-001", name: "Conductivímetro de agua DI", kind: "conductivity", attachedTo: "TK-001", variableId: "conductivity", realization: "physical", description: "Calidad del agua de alimentación." },
  { id: "LT-001", name: "Transmisor de nivel TK-001", kind: "level", attachedTo: "TK-001", variableId: "di_level", realization: "physical", description: `Alarma baja ${LIMITS.LAL.value} % · disparo ${LIMITS.LALL.value} %.` },
  { id: "GD-301", name: "Detector de H2 del recinto", kind: "gas_detector", attachedTo: "ENC-301", variableId: "room_lel", realization: "physical", description: `Alarma ${LIMITS.GD_AH.value} % LIE · disparo ${LIMITS.GD_AHH.value} % LIE.` },
];

export const equipmentById = new Map(EQUIPMENT.map((e) => [e.id, e]));
export const variableById = new Map(VARIABLES.map((v) => [v.id, v]));
export const instrumentById = new Map(INSTRUMENTS.map((i) => [i.id, i]));
export const stageById = new Map(STAGES.map((s) => [s.id, s]));
