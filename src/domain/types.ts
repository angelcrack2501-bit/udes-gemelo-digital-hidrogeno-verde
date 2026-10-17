/**
 * Tipos del modelo semántico del proceso (HYDRO-TWIN UDES).
 *
 * El modelo describe QUÉ equipos existen, CÓMO se conectan y QUÉ se mide,
 * independientemente de la geometría 3D (ver src/scene/layout.ts) y de la
 * simulación (ver src/sim). Una tubería se considera conectada solo si existe
 * una `Connection` explícita aquí, nunca porque dos mallas se toquen.
 */

/**
 * Procedencia de un dato o de una decisión de configuración.
 * - conceptual: configuración/geometría supuesta (no verificada contra la planta UDES).
 * - literature: valor o ecuación tomada de una referencia citada.
 * - illustrative: valor plausible elegido para la demostración, sin respaldo de planta.
 * - measured: medición real de la planta UDES (no existe ninguna en esta versión).
 */
export type Provenance = "conceptual" | "literature" | "illustrative" | "measured";

export type Fluid =
  | "electric"
  | "signal"
  | "raw_water"
  | "di_water"
  | "coolant"
  | "h2"
  | "o2"
  | "vent";

export type StageId =
  | "power"
  | "water"
  | "electrolysis"
  | "gas_conditioning"
  | "storage"
  | "end_use"
  | "safety_control";

export type EquipmentType =
  | "pv_array"
  | "power_supply"
  | "plc"
  | "water_purifier"
  | "di_tank"
  | "pump"
  | "electrolyzer_stack"
  | "separator"
  | "heat_exchanger"
  | "chiller"
  | "dryer"
  | "buffer_tank"
  | "relief_valve"
  | "isolation_valve"
  | "vent_stack"
  | "fuel_cell"
  | "ventilation_fan"
  | "enclosure";

export interface ProcessStage {
  id: StageId;
  name: string;
  order: number;
  description: string;
}

export interface EquipmentSpec {
  label: string;
  value: string;
  provenance: Provenance;
}

export interface Equipment {
  /** Etiqueta estable estilo ISA-5.1 (p. ej. "EL-101"). */
  id: string;
  name: string;
  type: EquipmentType;
  stageId: StageId;
  /** Función del equipo dentro del proceso (texto educativo). */
  role: string;
  /** Especificaciones mostradas en el inspector; cada una con su procedencia. */
  specs: EquipmentSpec[];
  /** ¿El equipo existe con certeza en la instalación UDES? En esta versión ninguno está verificado. */
  verifiedInUdes: boolean;
  /** Procedencia de la inclusión del equipo en el modelo. */
  provenance: Provenance;
  /** Variables de simulación asociadas (ids de `VARIABLES`). */
  variableIds: string[];
  /** Notas de documentación / conceptos para la guía. */
  notes?: string;
}

export interface Connection {
  id: string;
  /** Etiqueta de línea (p. ej. "H2-201"). */
  lineTag: string;
  from: string;
  to: string;
  fluid: Fluid;
  description: string;
}

export type InstrumentKind =
  | "power"
  | "current"
  | "voltage"
  | "temperature"
  | "pressure"
  | "flow"
  | "conductivity"
  | "level"
  | "gas_detector";

export interface Instrument {
  /** Etiqueta ISA-5.1 (p. ej. "PT-201"). */
  id: string;
  name: string;
  kind: InstrumentKind;
  attachedTo: string;
  variableId: string;
  /** "physical" = transmisor (conceptual); "soft" = valor calculado por el modelo. */
  realization: "physical" | "soft";
  description: string;
}

export interface Variable {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  description: string;
  /** Cómo se obtiene el valor en esta versión. */
  source: "model" | "input" | "instrument_model";
}
