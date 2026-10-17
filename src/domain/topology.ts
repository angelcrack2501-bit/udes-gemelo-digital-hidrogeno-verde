/**
 * Grafo tipado del proceso: validación, trazabilidad aguas arriba/abajo y
 * explicación de rutas de influencia entre equipos.
 */
import { z } from "zod";
import type { Connection, Equipment, EquipmentType, Fluid, Instrument } from "./types";
import { CONNECTIONS, EQUIPMENT, INSTRUMENTS, VARIABLES } from "./plant";

/** Fluidos que cada tipo de equipo puede recibir (in) y entregar (out). */
export const PORT_RULES: Record<EquipmentType, { in: Fluid[]; out: Fluid[] }> = {
  pv_array: { in: [], out: ["electric"] },
  power_supply: { in: ["electric", "signal"], out: ["electric"] },
  plc: { in: ["signal"], out: ["signal"] },
  water_purifier: { in: ["raw_water"], out: ["di_water"] },
  di_tank: { in: ["di_water"], out: ["di_water"] },
  pump: { in: ["di_water", "coolant"], out: ["di_water", "coolant"] },
  electrolyzer_stack: { in: ["electric", "di_water"], out: ["h2", "o2"] },
  separator: { in: ["h2", "o2", "di_water"], out: ["h2", "o2", "di_water"] },
  heat_exchanger: { in: ["di_water", "coolant"], out: ["di_water", "coolant"] },
  chiller: { in: ["coolant"], out: ["coolant"] },
  dryer: { in: ["h2"], out: ["h2"] },
  buffer_tank: { in: ["h2"], out: ["h2"] },
  relief_valve: { in: ["h2"], out: ["vent"] },
  isolation_valve: { in: ["h2"], out: ["h2"] },
  vent_stack: { in: ["o2", "vent"], out: [] },
  fuel_cell: { in: ["h2"], out: ["electric"] },
  ventilation_fan: { in: ["signal"], out: ["vent"] },
  enclosure: { in: ["vent"], out: [] },
};

const tagRegex = /^[A-Z]{1,4}-\d{3}$/;

export const EquipmentSchema = z.object({
  id: z.string().regex(tagRegex),
  name: z.string().min(3),
  type: z.enum(Object.keys(PORT_RULES) as [EquipmentType, ...EquipmentType[]]),
  stageId: z.enum(["power", "water", "electrolysis", "gas_conditioning", "storage", "end_use", "safety_control"]),
  role: z.string().min(10),
  verifiedInUdes: z.boolean(),
  variableIds: z.array(z.string()),
});

export const ConnectionSchema = z.object({
  id: z.string().min(1),
  lineTag: z.string().min(3),
  from: z.string().regex(tagRegex),
  to: z.string().regex(tagRegex),
  fluid: z.enum(["electric", "signal", "raw_water", "di_water", "coolant", "h2", "o2", "vent"]),
});

export interface ValidationIssue {
  severity: "error" | "warning";
  ref: string;
  message: string;
}

export interface PlantModel {
  equipment: Equipment[];
  connections: Connection[];
  instruments: Instrument[];
}

/** Valida esquema, unicidad, integridad referencial y compatibilidad de fluidos. */
export function validatePlant(model: PlantModel, variableIds: Set<string> = new Set(VARIABLES.map((v) => v.id))): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const eq of model.equipment) {
    const parsed = EquipmentSchema.safeParse(eq);
    if (!parsed.success) issues.push({ severity: "error", ref: eq.id, message: `Esquema inválido: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}` });
    if (ids.has(eq.id)) issues.push({ severity: "error", ref: eq.id, message: "Identificador de equipo duplicado" });
    ids.add(eq.id);
    for (const v of eq.variableIds) if (!variableIds.has(v)) issues.push({ severity: "error", ref: eq.id, message: `Variable inexistente: ${v}` });
  }
  const byId = new Map(model.equipment.map((e) => [e.id, e]));
  const connIds = new Set<string>();
  for (const c of model.connections) {
    const parsed = ConnectionSchema.safeParse(c);
    if (!parsed.success) issues.push({ severity: "error", ref: c.id, message: "Esquema de conexión inválido" });
    if (connIds.has(c.id)) issues.push({ severity: "error", ref: c.id, message: "Identificador de conexión duplicado" });
    connIds.add(c.id);
    if (c.from === c.to) issues.push({ severity: "error", ref: c.id, message: "Conexión de un equipo consigo mismo" });
    const from = byId.get(c.from);
    const to = byId.get(c.to);
    if (!from) issues.push({ severity: "error", ref: c.id, message: `Origen inexistente: ${c.from}` });
    if (!to) issues.push({ severity: "error", ref: c.id, message: `Destino inexistente: ${c.to}` });
    if (from && !PORT_RULES[from.type].out.includes(c.fluid)) issues.push({ severity: "error", ref: c.id, message: `${from.id} (${from.type}) no puede entregar '${c.fluid}'` });
    if (to && !PORT_RULES[to.type].in.includes(c.fluid)) issues.push({ severity: "error", ref: c.id, message: `${to.id} (${to.type}) no puede recibir '${c.fluid}'` });
  }
  for (const ins of model.instruments) {
    if (!byId.has(ins.attachedTo)) issues.push({ severity: "error", ref: ins.id, message: `Instrumento montado en equipo inexistente: ${ins.attachedTo}` });
    if (!variableIds.has(ins.variableId)) issues.push({ severity: "error", ref: ins.id, message: `Variable inexistente: ${ins.variableId}` });
  }
  for (const eq of model.equipment) {
    const connected = model.connections.some((c) => c.from === eq.id || c.to === eq.id);
    if (!connected) issues.push({ severity: "warning", ref: eq.id, message: "Equipo sin conexiones de proceso" });
  }
  return issues;
}

export interface Neighbor {
  equipmentId: string;
  connection: Connection;
}

export function upstreamOf(id: string, connections: Connection[] = CONNECTIONS): Neighbor[] {
  return connections.filter((c) => c.to === id).map((c) => ({ equipmentId: c.from, connection: c }));
}

export function downstreamOf(id: string, connections: Connection[] = CONNECTIONS): Neighbor[] {
  return connections.filter((c) => c.from === id).map((c) => ({ equipmentId: c.to, connection: c }));
}

/** Todos los equipos alcanzables siguiendo el sentido del flujo. */
export function reachableFrom(id: string, direction: "down" | "up", connections: Connection[] = CONNECTIONS): string[] {
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const next = direction === "down" ? downstreamOf(cur, connections) : upstreamOf(cur, connections);
    for (const n of next) {
      if (!seen.has(n.equipmentId)) {
        seen.add(n.equipmentId);
        queue.push(n.equipmentId);
      }
    }
  }
  seen.delete(id);
  return [...seen];
}

/**
 * Ruta más corta (BFS) en el sentido del flujo entre dos equipos.
 * Devuelve la secuencia de conexiones o null si `to` no es alcanzable desde `from`.
 */
export function influencePath(from: string, to: string, connections: Connection[] = CONNECTIONS): Connection[] | null {
  if (from === to) return [];
  const prev = new Map<string, Connection>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const c of connections.filter((k) => k.from === cur)) {
      if (seen.has(c.to)) continue;
      seen.add(c.to);
      prev.set(c.to, c);
      if (c.to === to) {
        const path: Connection[] = [];
        let node = to;
        while (node !== from) {
          const edge = prev.get(node)!;
          path.unshift(edge);
          node = edge.from;
        }
        return path;
      }
      queue.push(c.to);
    }
  }
  return null;
}

export const FLUID_LABEL: Record<Fluid, string> = {
  electric: "Energía eléctrica",
  signal: "Señal de control",
  raw_water: "Agua de red",
  di_water: "Agua desionizada",
  coolant: "Agua de enfriamiento",
  h2: "Hidrógeno",
  o2: "Oxígeno",
  vent: "Venteo / aire",
};

export function instrumentsOn(id: string, instruments: Instrument[] = INSTRUMENTS): Instrument[] {
  return instruments.filter((i) => i.attachedTo === id);
}

export const PLANT_MODEL: PlantModel = { equipment: EQUIPMENT, connections: CONNECTIONS, instruments: INSTRUMENTS };
