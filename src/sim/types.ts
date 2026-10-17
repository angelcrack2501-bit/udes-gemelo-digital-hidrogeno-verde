/** Contratos de datos de la simulación. */

export type ScenarioId = "normal" | "power_change" | "demand_loss" | "cooling_fault" | "sensor_stuck" | "leak_ventilation";

export type ScenarioCategory = "normal" | "input_change" | "process_deviation" | "equipment_fault" | "instrument_fault" | "safety";

export interface ScenarioInputs {
  durationMin: number;
  powerSetKw: number;
  sourceMode: "constant" | "pv_profile";
  fcLoadKw: number;
  ambientC: number;
  initialTankBar: number;
  initialStackC: number;
  faultAtMin: number;
  interventionEnabled: boolean;
  interventionAtMin: number;
  leakNlMin: number;
}

export type NumericInputKey = Exclude<keyof ScenarioInputs, "sourceMode" | "interventionEnabled">;

export interface InputRange {
  key: NumericInputKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  help: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  code: string;
  title: string;
  category: ScenarioCategory;
  summary: string;
  learningGoal: string;
  /** Entradas que el estudiante puede modificar en este escenario. */
  adjustable: (NumericInputKey | "sourceMode" | "interventionEnabled")[];
  defaults: ScenarioInputs;
  /** Qué ocurre en `faultAtMin` (texto). null si no hay perturbación. */
  disturbance: string | null;
  /** Acción correctiva disponible (texto). null si no aplica. */
  intervention: string | null;
  /** Componentes protagonistas (para resaltar en la escena). */
  focusEquipment: string[];
  expectedBehavior: string[];
  /** Ids de ecuaciones documentadas en src/sim/model-docs.ts. */
  equations: string[];
  assumptions: string[];
  /** Pruebas automatizadas que validan el escenario. */
  validation: string[];
}

export type ElectrolyzerStatus = "running" | "standby" | "tripped";

export interface SampleFlags {
  electrolyzer: ElectrolyzerStatus;
  tripCause: string | null;
  currentLimited: boolean;
  psvOpen: boolean;
  xv202Open: boolean;
  p103Running: boolean;
  fanRunning: boolean;
  pt201Stuck: boolean;
  fcRunning: boolean;
  refillOn: boolean;
  leakActive: boolean;
  activeAlarms: string[];
}

export type VariableValues = Record<
  | "pv_avail" | "p_set" | "p_stack" | "i_stack" | "v_cell" | "t_stack" | "q_gen" | "q_cool"
  | "h2_nm3h" | "h2_kgh" | "o2_nm3h" | "eff_hhv" | "sec" | "p_tank" | "p_tank_meas" | "psv_flow"
  | "fc_power" | "fc_h2" | "di_level" | "conductivity" | "leak_nm3h" | "room_lel" | "ach",
  number
>;

export type VariableId = keyof VariableValues;

export interface Sample {
  t: number;
  values: VariableValues;
  flags: SampleFlags;
}

export type Severity = "info" | "advertencia" | "critica";

export interface SimEvent {
  id: string;
  /** Tiempo simulado [s]. */
  t: number;
  scenarioId: ScenarioId;
  kind: "alarm" | "alarm_clear" | "trip" | "reset" | "mechanical" | "disturbance" | "intervention" | "operational";
  componentId: string;
  instrumentId: string | null;
  variable: string | null;
  value: number | null;
  unit: string | null;
  threshold: number | null;
  rule: string;
  /** Id de la regla de alarma (ALARM_RULES) cuando aplica. */
  ruleId: string | null;
  severity: Severity;
  severityBasis: string;
  title: string;
  expectedSystemResponse: string;
  educationalResponse: string;
  /** Resultado observado después (calculado al terminar la corrida). */
  outcome: string;
}

export interface Kpis {
  h2ProducedKg: number;
  energyKwh: number;
  secKwhKg: number | null;
  meanEffHhvPct: number | null;
  meanH2Kgh: number;
  maxStackC: number;
  maxTankBar: number;
  maxTankMeasBar: number;
  finalTankBar: number;
  firstTripMin: number | null;
  tripCause: string | null;
  h2VentedKg: number;
  h2LeakedKg: number;
  h2ToFuelCellKg: number;
  fcEnergyKwh: number;
  maxRoomLel: number;
  availabilityPct: number;
  alarmCount: number;
  waterConsumedL: number;
}

export interface SimulationResult {
  modelVersion: string;
  scenarioId: ScenarioId;
  inputs: ScenarioInputs;
  samples: Sample[];
  events: SimEvent[];
  kpis: Kpis;
}
