/**
 * Reglas de alarma y disparo del PLC (deterministas). Los umbrales provienen
 * de LIMITS (ilustrativos). El PLC evalúa SIEMPRE la variable medida por el
 * instrumento (p. ej. p_tank_meas), nunca la variable "real" del modelo.
 */
import { LIMITS } from "@/domain/parameters";
import type { VariableId } from "./types";

export interface AlarmRule {
  id: string;
  instrumentId: string;
  componentId: string;
  variable: VariableId;
  unit: string;
  direction: "high" | "low";
  threshold: number;
  deadband: number;
  action: "alarm" | "trip";
  title: string;
  systemResponse: string;
  educationalResponse: string;
}

export const ALARM_RULES: AlarmRule[] = [
  {
    id: "TAH", instrumentId: "TT-101", componentId: "EL-101", variable: "t_stack", unit: "°C", direction: "high",
    threshold: LIMITS.TAH.value, deadband: 2, action: "alarm",
    title: "TAH: temperatura de pila alta",
    systemResponse: "Se anuncia la alarma; la pila sigue operando.",
    educationalResponse: "Revise el lazo de enfriamiento (P-103, HX-101, CH-101) y el calor generado.",
  },
  {
    id: "TAHH", instrumentId: "TT-101", componentId: "EL-101", variable: "t_stack", unit: "°C", direction: "high",
    threshold: LIMITS.TAHH.value, deadband: 2, action: "trip",
    title: "TAHH: disparo por temperatura muy alta",
    systemResponse: "El PLC ordena a PSU-001 cortar la corriente; la pila queda enclavada en paro.",
    educationalResponse: "Sin corriente no hay calor de reacción: la temperatura bajará. No rearme sin corregir la causa.",
  },
  {
    id: "PAH", instrumentId: "PT-201", componentId: "TK-201", variable: "p_tank_meas", unit: "bar", direction: "high",
    threshold: LIMITS.PAH.value, deadband: 1, action: "alarm",
    title: "PAH: presión del tanque alta",
    systemResponse: "Se anuncia la alarma; la producción continúa.",
    educationalResponse: "Compare producción y consumo de H2. ¿Está abierta XV-202? ¿Opera FC-401?",
  },
  {
    id: "PAHH", instrumentId: "PT-201", componentId: "TK-201", variable: "p_tank_meas", unit: "bar", direction: "high",
    threshold: LIMITS.PAHH.value, deadband: 1, action: "trip",
    title: "PAHH: disparo por presión muy alta",
    systemResponse: "El PLC detiene la pila para cortar el aporte de masa al tanque.",
    educationalResponse: "El enclavamiento actúa antes de la PSV: es una capa de protección instrumentada.",
  },
  {
    id: "GDAH", instrumentId: "GD-301", componentId: "ENC-301", variable: "room_lel", unit: "% LIE", direction: "high",
    threshold: LIMITS.GD_AH.value, deadband: 2, action: "alarm",
    title: "GD-301: H2 detectado en el recinto",
    systemResponse: "Se anuncia la alarma de gas.",
    educationalResponse: "Verifique la ventilación (FAN-301) y busque la fuente de la liberación.",
  },
  {
    id: "GDAHH", instrumentId: "GD-301", componentId: "ENC-301", variable: "room_lel", unit: "% LIE", direction: "high",
    threshold: LIMITS.GD_AHH.value, deadband: 2, action: "trip",
    title: "GD-301: disparo por concentración alta de H2",
    systemResponse: "El PLC detiene la pila. La fuga desde el inventario almacenado no se detiene con este disparo.",
    educationalResponse: "Detener la producción no aísla una fuga aguas abajo: se requiere aislamiento y ventilación.",
  },
  {
    id: "LAL", instrumentId: "LT-001", componentId: "TK-001", variable: "di_level", unit: "%", direction: "low",
    threshold: LIMITS.LAL.value, deadband: 2, action: "alarm",
    title: "LAL: nivel bajo de agua DI",
    systemResponse: "Se anuncia la alarma.",
    educationalResponse: "Revise la reposición desde WP-001.",
  },
  {
    id: "LALL", instrumentId: "LT-001", componentId: "TK-001", variable: "di_level", unit: "%", direction: "low",
    threshold: LIMITS.LALL.value, deadband: 2, action: "trip",
    title: "LALL: disparo por nivel muy bajo de agua DI",
    systemResponse: "El PLC detiene la pila para evitar operación sin agua.",
    educationalResponse: "La pila PEM consume agua: 1 mol de H2O por mol de H2.",
  },
];

export const ruleById = new Map(ALARM_RULES.map((r) => [r.id, r]));
