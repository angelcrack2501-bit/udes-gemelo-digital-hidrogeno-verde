/**
 * Disposición espacial CONCEPTUAL de la planta (metros, y = altura).
 * No proviene de planos de la instalación UDES. Las tuberías se generan a
 * partir de las conexiones del modelo semántico; la geometría nunca define
 * la topología.
 */
import type { Fluid } from "@/domain/types";
import { CONNECTIONS } from "@/domain/plant";

export type Vec3 = [number, number, number];

export interface Placement {
  position: Vec3;
  rotationY?: number;
  /** Altura de la etiqueta / baliza sobre el piso. */
  labelY: number;
  /** Radio del anillo de selección. */
  ring: number;
  /** Punto de conexión por defecto (relativo a `position`). */
  nozzle: Vec3;
}

export const ROOM = { minX: -3.2, maxX: 7.2, minZ: -3, maxZ: 3, height: 3.2 };

export const PLACEMENTS: Record<string, Placement> = {
  "PV-001": { position: [-7.6, 0, 0], labelY: 2.4, ring: 3.2, nozzle: [2.2, 0.5, 0] },
  "PSU-001": { position: [-2.4, 0, -2.45], labelY: 2.55, ring: 0.8, nozzle: [0, 2.1, 0] },
  "PLC-001": { position: [-1.3, 0, -2.55], labelY: 2.4, ring: 0.6, nozzle: [0, 1.95, 0] },
  "WP-001": { position: [-2.3, 0, 2.2], labelY: 1.9, ring: 0.9, nozzle: [0.6, 0.3, 0] },
  "TK-001": { position: [-1.1, 0, 2.35], labelY: 1.6, ring: 0.45, nozzle: [0, 0.15, 0] },
  "P-001": { position: [-0.2, 0, 2.3], labelY: 1.0, ring: 0.4, nozzle: [0, 0.25, 0] },
  "SEP-102": { position: [2.3, 0, 1.15], labelY: 1.9, ring: 0.4, nozzle: [0, 1.5, 0] },
  "P-102": { position: [0.6, 0, 1.6], labelY: 1.0, ring: 0.4, nozzle: [0, 0.25, 0] },
  "HX-101": { position: [1.4, 0, 2.3], labelY: 1.35, ring: 0.7, nozzle: [0, 0.7, 0] },
  "CH-101": { position: [8.9, 0, -1.6], labelY: 2.0, ring: 1.0, nozzle: [0, 1.0, 0] },
  "P-103": { position: [6.3, 0, -2.35], labelY: 1.0, ring: 0.4, nozzle: [0, 0.3, 0] },
  "EL-101": { position: [0.6, 0, -0.1], labelY: 2.0, ring: 1.05, nozzle: [0, 1.25, 0] },
  "SEP-101": { position: [2.3, 0, -1.2], labelY: 1.9, ring: 0.4, nozzle: [0, 1.5, 0] },
  "DRY-201": { position: [3.5, 0, -1.4], labelY: 1.95, ring: 0.5, nozzle: [0, 1.55, 0] },
  "TK-201": { position: [4.75, 0, -1.4], labelY: 2.05, ring: 0.5, nozzle: [0, 1.15, 0] },
  "PSV-201": { position: [4.75, 1.2, -1.4], labelY: 1.95, ring: 0.3, nozzle: [0, 0.25, 0] },
  "XV-202": { position: [5.6, 0, -0.4], labelY: 1.55, ring: 0.3, nozzle: [0, 1.05, 0] },
  "FC-401": { position: [6.1, 0, 1.2], labelY: 1.9, ring: 0.8, nozzle: [0, 1.45, 0] },
  "VS-301": { position: [6.0, 0, -4.1], labelY: 5.6, ring: 0.4, nozzle: [0, 2.6, 0] },
  "FAN-301": { position: [7.15, 2.35, 1.9], rotationY: -Math.PI / 2, labelY: 3.0, ring: 0.5, nozzle: [0, 0, 0] },
  "ENC-301": { position: [ROOM.maxX - 0.4, 0, ROOM.maxZ - 0.3], labelY: 3.5, ring: 0.01, nozzle: [0, 0.3, 0] },
};

/** Puntos de conexión específicos (relativos al equipo) por conexión y extremo. */
const NOZZLE_OVERRIDES: Record<string, { from?: Vec3; to?: Vec3 }> = {
  C02: { to: [-0.55, 1.05, 0] },
  C03: { from: [0, 1.95, 0], to: [0.25, 2.1, 0] },
  C06: { to: [0, 0.3, 0] },
  C07: { from: [0, 0.2, 0] },
  C09: { from: [0.55, 0.7, 0], to: [0, 0.75, 0.35] },
  C10: { from: [0.2, 1.05, 0.35] },
  C11: { from: [0, 1.5, 0], to: [0, 2.6, 0] },
  C12: { from: [0.2, 1.05, -0.35] },
  C15: { from: [0, 1.15, 0], to: [0, 0, 0] },
  C16: { from: [0, 0.25, 0] },
  C17: { from: [0.18, 0.45, 0] },
  C18: { to: [0, 1.45, -0.2] },
  C20: { to: [-0.55, 0.7, 0] },
  C21: { from: [0.55, 0.7, 0] },
  C22: { from: [-0.2, 1.95, 0] },
  C23: { from: [0, 0, 0], to: [0, 0.3, 0] },
};

/** Altura de tendido por fluido (separa visualmente los servicios). */
const RACK_Y: Record<Fluid, number> = {
  electric: 2.75,
  signal: 2.9,
  raw_water: 0.2,
  di_water: 0.2,
  coolant: 0.45,
  h2: 2.3,
  o2: 2.5,
  vent: 2.6,
};

/** Código de colores de fluidos (funcional, tipo P&ID); legible en modo claro y oscuro. */
export const FLUID_COLOR: Record<Fluid, string> = {
  electric: "#eab308",
  signal: "#8b5cf6",
  raw_water: "#60a5fa",
  di_water: "#3b82f6",
  coolant: "#22c55e",
  h2: "#06b6d4",
  o2: "#9fb0c3",
  vent: "#64748b",
};

export const FLUID_RADIUS: Record<Fluid, number> = {
  electric: 0.045,
  signal: 0.018,
  raw_water: 0.03,
  di_water: 0.03,
  coolant: 0.035,
  h2: 0.028,
  o2: 0.03,
  vent: 0.04,
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Ruta ortogonal (tramos rectos) entre dos equipos. */
export function routeConnection(id: string): Vec3[] {
  const c = CONNECTIONS.find((k) => k.id === id)!;
  const pf = PLACEMENTS[c.from];
  const pt = PLACEMENTS[c.to];
  const ov = NOZZLE_OVERRIDES[id] ?? {};
  const a = add(pf.position, ov.from ?? pf.nozzle);
  const b = add(pt.position, ov.to ?? pt.nozzle);
  let y = RACK_Y[c.fluid];
  // Las líneas de venteo exteriores suben por encima del techo.
  if (c.to === "VS-301") y = Math.max(y, 2.6);
  // Para equipos elevados (PSV sobre el tanque) se evita bajar al rack.
  if (c.id === "C15") return [a, b];
  if (c.id === "C23") return [a, [a[0] - 0.4, a[1], a[2]], [a[0] - 0.4, b[1] + 2.2, b[2]]];
  const pts: Vec3[] = [a, [a[0], y, a[2]], [b[0], y, a[2]], [b[0], y, b[2]], b];
  // Elimina puntos duplicados consecutivos.
  return pts.filter((p, i) => i === 0 || p.some((v, k) => Math.abs(v - pts[i - 1][k]) > 1e-6));
}

export const CAMERA_PRESETS: Record<string, { position: Vec3; target: Vec3; label: string }> = {
  general: { position: [3.2, 7.2, 12.5], target: [1.4, 0.6, -0.3], label: "Vista general" },
  electrolysis: { position: [1.0, 3.0, 5.4], target: [1.3, 0.9, 0.0], label: "Electrólisis" },
  storage: { position: [7.8, 3.4, 4.2], target: [4.6, 1.0, -0.8], label: "Almacenamiento" },
  water: { position: [-2.0, 3.4, 7.0], target: [-1.4, 0.7, 0.4], label: "Agua y potencia" },
  safety: { position: [9.5, 6.5, 7.5], target: [4.5, 1.4, -1.0], label: "Seguridad" },
};
