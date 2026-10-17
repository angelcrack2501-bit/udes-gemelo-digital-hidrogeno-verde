/**
 * Motor de simulación determinista de HYDRO-TWIN UDES.
 *
 * `simulate()` es una función pura: mismas entradas → misma salida (sin
 * aleatoriedad, sin reloj del sistema, sin estado global). Integra con
 * Euler explícito (paso NUMERICS.DT_S) los balances de energía (pila), de
 * masa (tanque de H2, agua DI) y de dilución (recinto), y evalúa en cada
 * paso la lógica del PLC (alarmas, disparos con enclavamiento, rearme) y la
 * protección mecánica (PSV-201), que actúa sobre la presión REAL.
 */
import { ENCLOSURE, LIMITS, NUMERICS, PHYS, STACK, STORAGE, THERMAL, WATER } from "@/domain/parameters";
import {
  cellVoltage,
  currentForPower,
  heatGenerationW,
  h2MolarRate,
  molPerSecToKgh,
  molPerSecToNm3h,
  stackEfficiencyHHV,
  toKelvin,
} from "./electrochem";
import { clampInputs } from "./scenarios";
import { ALARM_RULES, type AlarmRule } from "./rules";
import type { Kpis, Sample, ScenarioId, ScenarioInputs, SimEvent, SimulationResult, VariableValues } from "./types";

export const MODEL_VERSION = "HT-SIM 1.0.0";

const R = PHYS.R.value;
const NM3_PER_MOL = PHYS.V_M_NORMAL.value;
const BAR = 1e5;
const TANK_T_K = toKelvin(STORAGE.TANK_T_C.value);
const TANK_V = STORAGE.TANK_V_M3.value;

export const barToMol = (bar: number) => (bar * BAR * TANK_V) / (R * TANK_T_K);
export const molToBar = (mol: number) => (mol * R * TANK_T_K) / (TANK_V * BAR);
const nm3hToMolS = (q: number) => q / NM3_PER_MOL / 3600;

/** Perfil FV ilustrativo: fracción de la potencia pico disponible en el minuto `tMin` (inicio 10:00 h solar). */
export function pvAvailabilityFraction(tMin: number): number {
  const hour = 10 + tMin / 60;
  const clear = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
  // Nube ilustrativa: rampa 20→22 min, 35 % hasta 30 min, rampa 30→32 min.
  let cloud = 1;
  if (tMin >= 20 && tMin < 22) cloud = 1 - 0.65 * ((tMin - 20) / 2);
  else if (tMin >= 22 && tMin < 30) cloud = 0.35;
  else if (tMin >= 30 && tMin < 32) cloud = 0.35 + 0.65 * ((tMin - 30) / 2);
  return clear * cloud;
}

interface PlantState {
  tempC: number;
  tankMol: number;
  roomFrac: number;
  diLevelPct: number;
  refillOn: boolean;
  tripped: boolean;
  tripCause: string | null;
  resetRequested: boolean;
  psvOpen: boolean;
  xv202Open: boolean;
  p103Running: boolean;
  fanRunning: boolean;
  pt201Stuck: boolean;
  pt201Frozen: number;
  leakActive: boolean;
  fcStarved: boolean;
  currentLimited: boolean;
  activeAlarms: Set<string>;
}

interface Disturbance {
  atS: number;
  apply: (s: PlantState, emit: Emit) => void;
}

type Emit = (e: Omit<SimEvent, "id" | "scenarioId" | "t" | "outcome" | "ruleId"> & { ruleId?: string | null }) => void;

function buildTimeline(id: ScenarioId, inp: ScenarioInputs): Disturbance[] {
  const fault = inp.faultAtMin * 60;
  const fix = inp.interventionAtMin * 60;
  const list: Disturbance[] = [];
  const intervention = (apply: (s: PlantState) => void, title: string, text: string, componentId: string) => {
    if (!inp.interventionEnabled) return;
    list.push({
      atS: fix,
      apply: (s, emit) => {
        apply(s);
        s.resetRequested = true;
        emit({
          kind: "intervention", componentId, instrumentId: null, variable: null, value: null, unit: null, threshold: null,
          rule: "Acción del operador definida en las entradas del escenario",
          severity: "info", severityBasis: "Acción correctiva, no es una condición anormal",
          title, expectedSystemResponse: text,
          educationalResponse: "Verifique que la variable afectada regrese a su rango y que el rearme ocurra solo cuando el PLC lo permite.",
        });
      },
    });
  };

  switch (id) {
    case "demand_loss":
      list.push({
        atS: fault,
        apply: (s, emit) => {
          s.xv202Open = false;
          emit({
            kind: "disturbance", componentId: "XV-202", instrumentId: null, variable: "fc_h2", value: 0, unit: "kg/h", threshold: null,
            rule: "Perturbación del escenario ESC-03", severity: "advertencia",
            severityBasis: "Desviación de proceso que crea un desbalance de masa en TK-201",
            title: "XV-202 cerrada: se pierde la demanda de H2",
            expectedSystemResponse: "Sin consumo, la producción se acumula en TK-201 y la presión aumenta.",
            educationalResponse: "Identifique el desbalance producción − consumo y estime la velocidad de subida de presión.",
          });
        },
      });
      intervention((s) => { s.xv202Open = true; }, "Reapertura de XV-202 y solicitud de rearme",
        `Se restablece el consumo de FC-401; el rearme se permite si PT-201 < ${LIMITS.P_RESET.value} bar.`, "XV-202");
      break;
    case "cooling_fault":
      list.push({
        atS: fault,
        apply: (s, emit) => {
          s.p103Running = false;
          emit({
            kind: "disturbance", componentId: "P-103", instrumentId: null, variable: "q_cool", value: 0, unit: "kW", threshold: null,
            rule: "Perturbación del escenario ESC-04", severity: "advertencia",
            severityBasis: "Falla de equipo que elimina la evacuación de calor",
            title: "P-103 detenida: HX-101 sin agua de enfriamiento",
            expectedSystemResponse: "El calor generado ya no se retira; la temperatura de la pila aumenta.",
            educationalResponse: "Calcule Q_gen = N·I·(V_celda − V_tn) y estime la velocidad de calentamiento Q_gen/C_th.",
          });
        },
      });
      intervention((s) => { s.p103Running = true; }, "Restablecimiento de P-103 y solicitud de rearme",
        `Se recupera el enfriamiento; el rearme se permite si TT-101 < ${LIMITS.T_RESET.value} °C.`, "P-103");
      break;
    case "sensor_stuck":
      list.push({
        atS: fault,
        apply: (s, emit) => {
          s.pt201Stuck = true;
          s.pt201Frozen = molToBar(s.tankMol);
          emit({
            kind: "disturbance", componentId: "TK-201", instrumentId: "PT-201", variable: "p_tank_meas", value: s.pt201Frozen, unit: "bar", threshold: null,
            rule: "Perturbación del escenario ESC-05", severity: "advertencia",
            severityBasis: "Falla de instrumentación no detectada: el PLC pierde observabilidad de la presión",
            title: "PT-201 congelado en su última lectura",
            expectedSystemResponse: "La lectura deja de seguir a la presión real; alarmas y disparo por presión quedan inhabilitados de hecho.",
            educationalResponse: "Compare la presión real (modelo) con la medida. ¿Qué protección no depende de PT-201?",
          });
        },
      });
      list.push({
        atS: fault + 300,
        apply: (s, emit) => {
          s.xv202Open = false;
          emit({
            kind: "disturbance", componentId: "XV-202", instrumentId: null, variable: "fc_h2", value: 0, unit: "kg/h", threshold: null,
            rule: "Perturbación del escenario ESC-05", severity: "advertencia",
            severityBasis: "Desviación de proceso que crea un desbalance de masa en TK-201",
            title: "XV-202 cerrada: se pierde la demanda de H2",
            expectedSystemResponse: "La presión real sube; PT-201 no lo refleja.",
            educationalResponse: "Observe la divergencia entre presión real y medida.",
          });
        },
      });
      intervention((s) => { s.pt201Stuck = false; }, "Sustitución/recalibración de PT-201",
        "El PLC vuelve a recibir la presión real y aplica la lógica PAH/PAHH.", "TK-201");
      break;
    case "leak_ventilation":
      list.push({
        atS: fault,
        apply: (s, emit) => {
          s.leakActive = true;
          s.fanRunning = false;
          emit({
            kind: "disturbance", componentId: "ENC-301", instrumentId: null, variable: "leak_nm3h", value: (inp.leakNlMin * 60) / 1000, unit: "Nm³/h", threshold: null,
            rule: "Perturbación del escenario ESC-06 (hipotética)", severity: "advertencia",
            severityBasis: "Liberación hipotética de H2 en un recinto con ventilación degradada",
            title: "Fuga hipotética en H2-201 y FAN-301 detenido",
            expectedSystemResponse: "La concentración de H2 en el recinto aumenta según el balance de dilución.",
            educationalResponse: "Compare el caudal de fuga con el caudal de ventilación disponible.",
          });
        },
      });
      intervention((s) => { s.leakActive = false; s.fanRunning = true; }, "Aislamiento de la fuga y restablecimiento de FAN-301",
        `Cesa el aporte de H2 y la ventilación diluye la mezcla; rearme permitido si GD-301 < ${LIMITS.GD_RESET.value} % LIE.`, "ENC-301");
      break;
    default:
      break;
  }
  return list.sort((a, b) => a.atS - b.atS);
}

function resetPermitted(v: VariableValues): boolean {
  return v.t_stack < LIMITS.T_RESET.value && v.p_tank_meas < LIMITS.P_RESET.value && v.room_lel < LIMITS.GD_RESET.value && v.di_level > LIMITS.LAL.value;
}

const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;

export function simulate(scenarioId: ScenarioId, rawInputs: ScenarioInputs): SimulationResult {
  const inp = clampInputs(rawInputs);
  const dt = NUMERICS.DT_S;
  const totalS = inp.durationMin * 60;
  const events: SimEvent[] = [];
  let t = 0;
  const emit: Emit = (e) => {
    events.push({ ruleId: null, ...e, id: `E${String(events.length + 1).padStart(2, "0")}`, scenarioId, t, outcome: "" });
  };

  const s: PlantState = {
    tempC: inp.initialStackC,
    tankMol: barToMol(inp.initialTankBar),
    roomFrac: 0,
    diLevelPct: 70,
    refillOn: false,
    tripped: false,
    tripCause: null,
    resetRequested: false,
    psvOpen: false,
    xv202Open: true,
    p103Running: true,
    fanRunning: true,
    pt201Stuck: false,
    pt201Frozen: 0,
    leakActive: false,
    fcStarved: false,
    currentLimited: false,
    activeAlarms: new Set(),
  };

  const timeline = buildTimeline(scenarioId, inp);
  const samples: Sample[] = [];
  const acc = { h2Mol: 0, energyJ: 0, ventMol: 0, leakMol: 0, fcMol: 0, fcJ: 0, runningS: 0, waterKg: 0, effWeighted: 0 };
  let maxT = s.tempC;
  let maxP = inp.initialTankBar;
  let maxPm = inp.initialTankBar;
  let maxLel = 0;
  let firstTrip: { t: number; cause: string } | null = null;
  const leakNm3h = (inp.leakNlMin * 60) / 1000;

  const steps = Math.round(totalS / dt);
  for (let k = 0; k <= steps; k++) {
    t = k * dt;
    while (timeline.length && timeline[0].atS <= t) timeline.shift()!.apply(s, emit);

    // ---- Potencia y electroquímica ----
    const tMin = t / 60;
    const pvAvail = STACK.P_RATED_KW.value * pvAvailabilityFraction(tMin);
    const pSet = inp.powerSetKw;
    const pCmd = s.tripped ? 0 : inp.sourceMode === "pv_profile" ? Math.min(pSet, pvAvail) : pSet;
    const { currentA, limited } = currentForPower(pCmd, s.tempC);
    if (limited !== s.currentLimited) {
      s.currentLimited = limited;
      if (limited) emit({
        kind: "operational", componentId: "PSU-001", instrumentId: "IT-101", variable: "i_stack", value: currentA, unit: "A", threshold: currentA,
        rule: `I ≤ j_max·A = ${STACK.J_MAX.value * STACK.AREA_CM2.value} A`, severity: "info", severityBasis: "Límite operativo del modelo, no es condición insegura",
        title: "Consigna limitada por corriente máxima", expectedSystemResponse: "PSU-001 entrega la potencia correspondiente a I_max.",
        educationalResponse: "Compare la consigna con la potencia realmente entregada.",
      });
    }
    const j = currentA / STACK.AREA_CM2.value;
    const volt = cellVoltage(j, s.tempC);
    const vCell = currentA > 0 ? volt.vCell : 0;
    const pStackKw = (STACK.N_CELLS.value * vCell * currentA) / 1000;
    const nH2 = h2MolarRate(currentA);

    // ---- Térmico ----
    const qGen = currentA > 0 ? heatGenerationW(currentA, vCell) : 0;
    const qCool = s.p103Running
      ? Math.min(Math.max(0, THERMAL.K_COOL.value * (s.tempC - THERMAL.T_SET.value)), Math.max(0, THERMAL.UA_HX.value * (s.tempC - THERMAL.T_CW.value)))
      : 0;
    const qLoss = THERMAL.UA_AMB.value * (s.tempC - inp.ambientC);

    // ---- Tanque, PSV, celda de combustible, fuga ----
    const pTrue = molToBar(s.tankMol);
    if (!s.psvOpen && pTrue >= STORAGE.PSV_SET.value) {
      s.psvOpen = true;
      emit({
        kind: "mechanical", componentId: "PSV-201", instrumentId: null, variable: "p_tank", value: pTrue, unit: "bar", threshold: STORAGE.PSV_SET.value,
        rule: `p_real ≥ ${STORAGE.PSV_SET.value} bar (ajuste mecánico)`, severity: "critica",
        severityBasis: "Actuación de la última capa de protección mecánica: indica que las capas previas no detuvieron la sobrepresión",
        title: "PSV-201 abre y ventea H2 a VS-301", expectedSystemResponse: "Se libera H2 a lugar seguro hasta la presión de recierre.",
        educationalResponse: "Pregúntese por qué el enclavamiento PAHH no actuó antes. ¿La medición era confiable?",
      });
    } else if (s.psvOpen && pTrue < STORAGE.PSV_RESEAT.value) {
      s.psvOpen = false;
      emit({
        kind: "mechanical", componentId: "PSV-201", instrumentId: null, variable: "p_tank", value: pTrue, unit: "bar", threshold: STORAGE.PSV_RESEAT.value,
        rule: `p_real < ${STORAGE.PSV_RESEAT.value} bar (recierre)`, severity: "info", severityBasis: "Retorno a condición segura de la válvula",
        title: "PSV-201 recierra", expectedSystemResponse: "Se detiene el venteo.", educationalResponse: "Observe el ciclo de apertura/recierre (purga).",
      });
    }
    const ventMolS = s.psvOpen ? nm3hToMolS(STORAGE.PSV_CAPACITY_NM3H.value) : 0;

    const fcAvailable = s.xv202Open && pTrue > STORAGE.FC_MIN_INLET_BAR.value && inp.fcLoadKw > 0;
    const starved = s.xv202Open && inp.fcLoadKw > 0 && pTrue <= STORAGE.FC_MIN_INLET_BAR.value;
    if (starved !== s.fcStarved) {
      s.fcStarved = starved;
      if (starved) emit({
        kind: "operational", componentId: "FC-401", instrumentId: "PT-201", variable: "p_tank", value: pTrue, unit: "bar", threshold: STORAGE.FC_MIN_INLET_BAR.value,
        rule: `p ≤ ${STORAGE.FC_MIN_INLET_BAR.value} bar en la entrada de FC-401`, severity: "advertencia", severityBasis: "Pérdida de servicio del consumidor (no es una condición insegura)",
        title: "FC-401 sin presión suficiente de H2", expectedSystemResponse: "La celda de combustible se detiene por falta de suministro.",
        educationalResponse: "El consumo superó la producción durante demasiado tiempo: revise el balance de masa.",
      });
    }
    const fcPowerKw = fcAvailable ? inp.fcLoadKw : 0;
    const fcKgh = fcPowerKw / (STORAGE.FC_EFF_LHV.value * PHYS.LHV_H2.value);
    const fcMolS = fcKgh / 3600 / PHYS.M_H2.value;
    const leakMolS = s.leakActive && pTrue > 1.05 ? nm3hToMolS(leakNm3h) : 0;

    // ---- Recinto (mezcla perfecta) ----
    const ach = s.fanRunning ? ENCLOSURE.ACH_NOMINAL.value : ENCLOSURE.ACH_DEGRADED.value;
    const vRoom = ENCLOSURE.VOLUME_M3.value;
    const leakM3s = leakMolS * NM3_PER_MOL * (toKelvin(inp.ambientC) / 273.15);
    const roomLel = (s.roomFrac * 100 * 100) / PHYS.LFL_H2.value;

    // ---- Agua ----
    const waterKgS = nH2 * PHYS.M_H2O.value;
    if (!s.refillOn && s.diLevelPct <= WATER.REFILL_ON_PCT.value) s.refillOn = true;
    if (s.refillOn && s.diLevelPct >= WATER.REFILL_OFF_PCT.value) s.refillOn = false;

    // ---- Medición ----
    const pMeas = s.pt201Stuck ? s.pt201Frozen : pTrue;

    const h2Nm3h = molPerSecToNm3h(nH2);
    const h2Kgh = molPerSecToKgh(nH2);
    const values: VariableValues = {
      pv_avail: round(pvAvail, 3),
      p_set: pSet,
      p_stack: round(pStackKw, 4),
      i_stack: round(currentA, 3),
      v_cell: round(vCell, 4),
      t_stack: round(s.tempC, 3),
      q_gen: round(qGen / 1000, 4),
      q_cool: round(qCool / 1000, 4),
      h2_nm3h: round(h2Nm3h, 5),
      h2_kgh: round(h2Kgh, 6),
      o2_nm3h: round(h2Nm3h / 2, 5),
      eff_hhv: round(currentA > 0 ? stackEfficiencyHHV(vCell) * 100 : 0, 3),
      sec: round(h2Kgh > 0 ? pStackKw / h2Kgh : 0, 3),
      p_tank: round(pTrue, 4),
      p_tank_meas: round(pMeas, 4),
      psv_flow: s.psvOpen ? STORAGE.PSV_CAPACITY_NM3H.value : 0,
      fc_power: fcPowerKw,
      fc_h2: round(fcKgh, 6),
      di_level: round(s.diLevelPct, 3),
      conductivity: WATER.CONDUCTIVITY.value,
      leak_nm3h: leakMolS > 0 ? leakNm3h : 0,
      room_lel: round(roomLel, 4),
      ach,
    };

    // ---- Lógica del PLC: alarmas y disparos ----
    evaluateRules(values, s, emit, (cause) => {
      if (!firstTrip) firstTrip = { t, cause };
    });
    if (s.tripped && s.resetRequested && resetPermitted(values)) {
      s.tripped = false;
      s.resetRequested = false;
      emit({
        kind: "reset", componentId: "EL-101", instrumentId: null, variable: null, value: null, unit: null, threshold: null,
        rule: `Rearme permitido: T < ${LIMITS.T_RESET.value} °C, p_med < ${LIMITS.P_RESET.value} bar, GD < ${LIMITS.GD_RESET.value} % LIE`,
        severity: "info", severityBasis: "Retorno a operación tras confirmar condiciones seguras",
        title: `Rearme de la pila (disparo previo: ${s.tripCause})`, expectedSystemResponse: "PSU-001 vuelve a entregar la consigna de potencia.",
        educationalResponse: "Un rearme solo es válido si la causa raíz fue corregida.",
      });
      s.tripCause = null;
    }

    if (k % Math.round(NUMERICS.SAMPLE_EVERY_S / dt) === 0) {
      samples.push({
        t,
        values,
        flags: {
          electrolyzer: s.tripped ? "tripped" : currentA > 0 ? "running" : "standby",
          tripCause: s.tripCause,
          currentLimited: s.currentLimited,
          psvOpen: s.psvOpen,
          xv202Open: s.xv202Open,
          p103Running: s.p103Running,
          fanRunning: s.fanRunning,
          pt201Stuck: s.pt201Stuck,
          fcRunning: fcPowerKw > 0,
          refillOn: s.refillOn,
          leakActive: s.leakActive,
          activeAlarms: [...s.activeAlarms].sort(),
        },
      });
    }

    maxT = Math.max(maxT, s.tempC);
    maxP = Math.max(maxP, pTrue);
    maxPm = Math.max(maxPm, pMeas);
    maxLel = Math.max(maxLel, roomLel);
    if (k === steps) break;

    // ---- Integración (Euler explícito) ----
    s.tempC += (dt * (qGen - qCool - qLoss)) / THERMAL.C_TH.value;
    s.tankMol = Math.max(0, s.tankMol + dt * (nH2 - fcMolS - ventMolS - leakMolS));
    s.roomFrac = Math.max(0, s.roomFrac + (dt * (leakM3s - s.roomFrac * (ach * vRoom) / 3600)) / vRoom);
    const levelL = (s.diLevelPct / 100) * WATER.DI_TANK_L.value - dt * waterKgS + (s.refillOn ? (dt * WATER.REFILL_LPH.value) / 3600 : 0);
    s.diLevelPct = Math.max(0, (levelL / WATER.DI_TANK_L.value) * 100);

    acc.h2Mol += nH2 * dt;
    acc.energyJ += pStackKw * 1000 * dt;
    acc.ventMol += ventMolS * dt;
    acc.leakMol += leakMolS * dt;
    acc.fcMol += fcMolS * dt;
    acc.fcJ += fcPowerKw * 1000 * dt;
    acc.waterKg += waterKgS * dt;
    if (currentA > 0) {
      acc.runningS += dt;
      acc.effWeighted += stackEfficiencyHHV(vCell) * pStackKw * dt;
    }
  }

  annotateOutcomes(events);

  const h2Kg = acc.h2Mol * PHYS.M_H2.value;
  const energyKwh = acc.energyJ / 3.6e6;
  const kpis: Kpis = {
    h2ProducedKg: round(h2Kg, 5),
    energyKwh: round(energyKwh, 4),
    secKwhKg: h2Kg > 1e-6 ? round(energyKwh / h2Kg, 3) : null,
    meanEffHhvPct: acc.energyJ > 0 ? round((acc.effWeighted * 1000 * 100) / acc.energyJ, 3) : null,
    meanH2Kgh: round(h2Kg / (totalS / 3600), 5),
    maxStackC: round(maxT, 3),
    maxTankBar: round(maxP, 3),
    maxTankMeasBar: round(maxPm, 3),
    finalTankBar: round(molToBar(s.tankMol), 3),
    firstTripMin: firstTrip ? round((firstTrip as { t: number }).t / 60, 3) : null,
    tripCause: firstTrip ? (firstTrip as { cause: string }).cause : null,
    h2VentedKg: round(acc.ventMol * PHYS.M_H2.value, 5),
    h2LeakedKg: round(acc.leakMol * PHYS.M_H2.value, 5),
    h2ToFuelCellKg: round(acc.fcMol * PHYS.M_H2.value, 5),
    fcEnergyKwh: round(acc.fcJ / 3.6e6, 4),
    maxRoomLel: round(maxLel, 3),
    availabilityPct: round((acc.runningS / totalS) * 100, 2),
    alarmCount: events.filter((e) => e.kind === "alarm" || e.kind === "trip").length,
    waterConsumedL: round(acc.waterKg, 4),
  };

  return { modelVersion: MODEL_VERSION, scenarioId, inputs: inp, samples, events, kpis };
}

function evaluateRules(v: VariableValues, s: PlantState, emit: Emit, onTrip: (cause: string) => void) {
  for (const rule of ALARM_RULES) {
    const value = v[rule.variable];
    const active = s.activeAlarms.has(rule.id);
    const crossed = rule.direction === "high" ? value >= rule.threshold : value <= rule.threshold;
    const cleared = rule.direction === "high" ? value < rule.threshold - rule.deadband : value > rule.threshold + rule.deadband;
    if (!active && crossed) {
      s.activeAlarms.add(rule.id);
      emitRule(rule, value, emit, "activate");
      if (rule.action === "trip" && !s.tripped) {
        s.tripped = true;
        s.tripCause = rule.id;
        onTrip(rule.id);
      }
    } else if (active && cleared) {
      s.activeAlarms.delete(rule.id);
      emitRule(rule, value, emit, "clear");
    }
  }
}

function emitRule(rule: AlarmRule, value: number, emit: Emit, mode: "activate" | "clear") {
  const cmp = rule.direction === "high" ? "≥" : "≤";
  if (mode === "activate") {
    emit({
      kind: rule.action === "trip" ? "trip" : "alarm",
      ruleId: rule.id,
      componentId: rule.componentId, instrumentId: rule.instrumentId, variable: rule.variable, value: round(value, 3), unit: rule.unit, threshold: rule.threshold,
      rule: `${rule.instrumentId} ${cmp} ${rule.threshold} ${rule.unit}`,
      severity: rule.action === "trip" ? "critica" : "advertencia",
      severityBasis: rule.action === "trip"
        ? "Disparo automático con enclavamiento: el PLC detiene la pila (función de protección)"
        : "Alarma de proceso: requiere atención del operador antes de alcanzar el disparo",
      title: rule.title,
      expectedSystemResponse: rule.systemResponse,
      educationalResponse: rule.educationalResponse,
    });
  } else {
    emit({
      kind: "alarm_clear",
      ruleId: rule.id,
      componentId: rule.componentId, instrumentId: rule.instrumentId, variable: rule.variable, value: round(value, 3), unit: rule.unit, threshold: rule.threshold,
      rule: `${rule.instrumentId} retorna con banda muerta de ${rule.deadband} ${rule.unit}`,
      severity: "info", severityBasis: "Retorno de la variable a su rango",
      title: `${rule.id} despejada`, expectedSystemResponse: "La alarma deja de estar activa (el disparo, si ocurrió, sigue enclavado).",
      educationalResponse: "Despejar una alarma no equivale a rearmar un disparo.",
    });
  }
}

/** Completa `outcome` de cada evento con lo que realmente ocurrió después en la corrida. */
function annotateOutcomes(events: SimEvent[]) {
  const fmtMin = (t: number) => `min ${(t / 60).toFixed(1)}`;
  for (const e of events) {
    const later = events.filter((x) => x.t >= e.t && x !== e);
    if (e.kind === "alarm" || e.kind === "trip") {
      const clear = later.find((x) => x.kind === "alarm_clear" && x.ruleId === e.ruleId);
      const base = clear ? `Despejada en ${fmtMin(clear.t)}.` : "Permaneció activa hasta el final de la corrida.";
      if (e.kind === "trip") {
        const reset = later.find((x) => x.kind === "reset");
        e.outcome = `${base} ${reset ? `Pila rearmada en ${fmtMin(reset.t)}.` : "La pila permaneció detenida (sin rearme)."}`;
      } else {
        const trip = later.find((x) => x.kind === "trip" && x.instrumentId === e.instrumentId);
        e.outcome = `${base}${trip ? ` Escaló a disparo en ${fmtMin(trip.t)}.` : ""}`;
      }
    } else if (e.kind === "mechanical" && e.title.includes("abre")) {
      const close = later.find((x) => x.kind === "mechanical" && x.componentId === e.componentId && x.title.includes("recierra"));
      e.outcome = close ? `Recerró en ${fmtMin(close.t)}.` : "Permaneció abierta hasta el final de la corrida.";
    } else if (e.kind === "intervention") {
      const reset = later.find((x) => x.kind === "reset");
      const tripBefore = events.some((x) => x.kind === "trip" && x.t <= e.t);
      e.outcome = reset ? `Rearme exitoso en ${fmtMin(reset.t)}.` : tripBefore ? "El rearme no se alcanzó dentro de la corrida (condiciones aún fuera de rango)." : "Aplicada antes de cualquier disparo: no fue necesario rearmar.";
    } else if (e.kind === "disturbance") {
      const next = later.find((x) => x.kind === "alarm" || x.kind === "trip" || x.kind === "mechanical");
      e.outcome = next ? `Primera consecuencia: ${next.title} (${fmtMin(next.t)}).` : "No produjo alarmas dentro de la corrida.";
    } else {
      e.outcome = "—";
    }
  }
}
