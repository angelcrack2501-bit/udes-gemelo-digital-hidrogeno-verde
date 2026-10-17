/**
 * Traduce una muestra de simulación al estado visible de cada equipo y
 * conexión. Es la ÚNICA lógica que decide colores/estados de la escena 3D,
 * del explorador y del inspector, para que todos coincidan.
 */
import { LIMITS, STORAGE } from "@/domain/parameters";
import { CONNECTIONS } from "@/domain/plant";
import type { Sample } from "./types";

export type VisualStatus = "nominal" | "idle" | "warning" | "critical" | "fault" | "nodata";

export interface EquipmentState {
  status: VisualStatus;
  label: string;
}

export interface ConnectionState {
  active: boolean;
  /** 0–1, para la velocidad de la animación de flujo. */
  intensity: number;
}

const NO_DATA: EquipmentState = { status: "nodata", label: "Sin simulación" };

/** Formato numérico es-CO (coma decimal), coherente con el resto de la interfaz. */
const n = (x: number, d: number) => x.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

export function equipmentStates(sample: Sample | null): Record<string, EquipmentState> {
  const ids = ["PV-001", "PSU-001", "PLC-001", "WP-001", "TK-001", "P-001", "SEP-102", "P-102", "HX-101", "CH-101", "P-103", "EL-101", "SEP-101", "DRY-201", "TK-201", "PSV-201", "XV-202", "FC-401", "VS-301", "FAN-301", "ENC-301"];
  if (!sample) return Object.fromEntries(ids.map((id) => [id, NO_DATA]));
  const { values: v, flags: f } = sample;
  const running = f.electrolyzer === "running";
  const alarms = new Set(f.activeAlarms);
  const st = (status: VisualStatus, label: string): EquipmentState => ({ status, label });
  const runIdle = (onLabel: string) => (running ? st("nominal", onLabel) : st("idle", "En espera (pila detenida)"));

  const el: EquipmentState =
    f.electrolyzer === "tripped"
      ? st("critical", `Disparada por ${f.tripCause}`)
      : alarms.has("TAH")
        ? st("warning", `Temperatura alta: ${n(v.t_stack, 1)} °C`)
        : running
          ? st("nominal", `Operando · ${n(v.i_stack, 0)} A · ${n(v.t_stack, 1)} °C`)
          : st("idle", "Sin potencia disponible");

  let tank: EquipmentState;
  if (v.p_tank >= STORAGE.PSV_SET.value || f.psvOpen) tank = st("critical", `Sobrepresión: ${n(v.p_tank, 1)} bar (real)`);
  else if (v.p_tank >= LIMITS.PAHH.value) tank = st("critical", `Presión muy alta: ${n(v.p_tank, 1)} bar (real)`);
  else if (v.p_tank >= LIMITS.PAH.value) tank = st("warning", `Presión alta: ${n(v.p_tank, 1)} bar (real)`);
  else tank = st("nominal", `${n(v.p_tank, 1)} bar (real) · PT-201: ${n(v.p_tank_meas, 1)} bar`);
  if (f.pt201Stuck && tank.status === "nominal") tank = st("warning", `PT-201 congelado (${n(v.p_tank_meas, 1)} bar) · real ${n(v.p_tank, 1)} bar`);

  const enc: EquipmentState = alarms.has("GDAHH")
    ? st("critical", `H2 en recinto: ${n(v.room_lel, 1)} % LIE`)
    : alarms.has("GDAH")
      ? st("warning", `H2 en recinto: ${n(v.room_lel, 1)} % LIE`)
      : f.leakActive
        ? st("warning", `Fuga activa · ${n(v.room_lel, 1)} % LIE`)
        : st("nominal", `${n(v.room_lel, 2)} % LIE`);

  return {
    "PV-001": st("nominal", `Disponible: ${n(v.pv_avail, 2)} kW`),
    "PSU-001": f.electrolyzer === "tripped" ? st("critical", "Corriente cortada por el PLC") : f.currentLimited ? st("warning", "Limitada por corriente máxima") : running ? st("nominal", `${n(v.p_stack, 2)} kW entregados`) : st("idle", "Sin consigna"),
    "PLC-001": f.electrolyzer === "tripped" ? st("warning", `Enclavamiento activo: ${f.tripCause}`) : alarms.size ? st("warning", `Alarmas: ${[...alarms].join(", ")}`) : st("nominal", "Sin alarmas"),
    "WP-001": f.refillOn ? st("nominal", "Reponiendo agua DI") : st("idle", "En espera (nivel suficiente)"),
    "TK-001": alarms.has("LALL") ? st("critical", `Nivel ${n(v.di_level, 0)} %`) : alarms.has("LAL") ? st("warning", `Nivel ${n(v.di_level, 0)} %`) : st("nominal", `Nivel ${n(v.di_level, 1)} %`),
    "P-001": runIdle("Reposición al lazo anódico"),
    "SEP-102": runIdle(`O2: ${n(v.o2_nm3h, 3)} Nm³/h`),
    "P-102": st("nominal", "Recirculando agua anódica"),
    "HX-101": f.p103Running ? st("nominal", `Retira ${n(v.q_cool, 2)} kW`) : st("warning", "Sin agua de enfriamiento"),
    "CH-101": f.p103Running ? st("nominal", "Suministrando agua fría") : st("idle", "Sin circulación"),
    "P-103": f.p103Running ? st("nominal", "En marcha") : st("fault", "Detenida (falla)"),
    "EL-101": el,
    "SEP-101": runIdle(`H2: ${n(v.h2_nm3h, 3)} Nm³/h`),
    "DRY-201": runIdle("Secando H2"),
    "TK-201": tank,
    "PSV-201": f.psvOpen ? st("critical", `ABIERTA · ${v.psv_flow} Nm³/h`) : st("nominal", "Cerrada"),
    "XV-202": f.xv202Open ? st("nominal", "Abierta") : st("warning", "Cerrada"),
    "FC-401": f.fcRunning ? st("nominal", `${n(v.fc_power, 2)} kW`) : st("idle", f.xv202Open ? "Detenida" : "Sin suministro (XV-202 cerrada)"),
    "VS-301": f.psvOpen ? st("warning", "Venteando H2 de alivio") : st("nominal", running ? "Venteando O2" : "Sin flujo"),
    "FAN-301": f.fanRunning ? st("nominal", `${v.ach} renov/h`) : st("fault", `Detenido · ${v.ach} renov/h (infiltración)`),
    "ENC-301": enc,
  };
}

export function connectionStates(sample: Sample | null): Record<string, ConnectionState> {
  const out: Record<string, ConnectionState> = {};
  for (const c of CONNECTIONS) out[c.id] = { active: false, intensity: 0 };
  if (!sample) return out;
  const { values: v, flags: f } = sample;
  const running = f.electrolyzer === "running";
  const h2 = Math.min(1, v.h2_nm3h / 1.7);
  const set = (id: string, active: boolean, intensity: number) => (out[id] = { active, intensity: active ? Math.max(0.15, Math.min(1, intensity)) : 0 });
  set("C01", v.pv_avail > 0, v.pv_avail / 5);
  set("C02", running, v.p_stack / 5);
  set("C03", true, 0.2);
  set("C04", f.refillOn, 0.5);
  set("C05", running, 0.3);
  set("C06", running, 0.3);
  for (const id of ["C07", "C08", "C09"]) set(id, true, 0.6);
  set("C10", running, h2);
  set("C11", running, h2);
  for (const id of ["C12", "C13", "C14"]) set(id, running, h2);
  set("C15", f.psvOpen, 1);
  set("C16", f.psvOpen, 1);
  set("C17", f.fcRunning, v.fc_h2 / 0.12);
  set("C18", f.fcRunning, v.fc_h2 / 0.12);
  for (const id of ["C19", "C20", "C21"]) set(id, f.p103Running, 0.6);
  set("C22", true, 0.2);
  set("C23", f.fanRunning, 0.7);
  return out;
}
