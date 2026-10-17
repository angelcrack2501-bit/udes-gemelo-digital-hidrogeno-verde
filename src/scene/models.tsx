"use client";

/**
 * Modelos procedurales de equipos (geometría conceptual a escala de
 * laboratorio). Cada modelo usa <Mat>, que lee del contexto el estado
 * visual (atenuado / resaltado) del equipo al que pertenece.
 */
import { createContext, useContext, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface VisualCtx {
  dim: boolean;
  glow: number;
  glowColor: string;
}

export const EquipmentVisual = createContext<VisualCtx>({ dim: false, glow: 0, glowColor: "#22d3ee" });

export function Mat({ color, metal = 0.2, rough = 0.6, emissive, emissiveIntensity = 0, opacity = 1 }: { color: string; metal?: number; rough?: number; emissive?: string; emissiveIntensity?: number; opacity?: number }) {
  const v = useContext(EquipmentVisual);
  const o = v.dim ? Math.min(opacity, 0.12) : opacity;
  const useGlow = !emissive && v.glow > 0;
  return (
    <meshStandardMaterial
      color={color}
      metalness={metal}
      roughness={rough}
      emissive={useGlow ? v.glowColor : emissive ?? "#000000"}
      emissiveIntensity={useGlow ? v.glow : emissiveIntensity}
      transparent={o < 1}
      opacity={o}
      depthWrite={o >= 1}
    />
  );
}

const STEEL = "#9aa6b2";
const PAINT = "#d5dbe1";
const DARK = "#2a3340";
const FRAME = "#c99a2e";

export function Cabinet({ w = 0.8, h = 2, d = 0.6, color = PAINT, screen = true, accent = "#0ea5e9" }: { w?: number; h?: number; d?: number; color?: string; screen?: boolean; accent?: string }) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.04, 0.1, d + 0.04]} />
        <Mat color={DARK} rough={0.8} />
      </mesh>
      <mesh position={[0, h / 2 + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat color={color} metal={0.35} rough={0.45} />
      </mesh>
      {/* junta de puertas */}
      <mesh position={[0, h / 2 + 0.1, d / 2 + 0.002]}>
        <boxGeometry args={[0.01, h * 0.96, 0.004]} />
        <Mat color="#7b8794" />
      </mesh>
      {screen && (
        <mesh position={[-w * 0.22, h * 0.72, d / 2 + 0.006]}>
          <boxGeometry args={[w * 0.32, h * 0.12, 0.01]} />
          <Mat color="#0b1622" emissive={accent} emissiveIntensity={0.55} />
        </mesh>
      )}
      {[0.55, 0.45, 0.35].map((y, i) => (
        <mesh key={i} position={[w * 0.25, h * y, d / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
          <Mat color={["#16a34a", "#f59e0b", "#dc2626"][i]} emissive={["#16a34a", "#f59e0b", "#dc2626"][i]} emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* rejillas de ventilación */}
      {[0.18, 0.24, 0.3].map((y) => (
        <mesh key={y} position={[0, h * y, d / 2 + 0.003]}>
          <boxGeometry args={[w * 0.6, 0.012, 0.004]} />
          <Mat color="#6b7785" />
        </mesh>
      ))}
    </group>
  );
}

export function VerticalVessel({ r = 0.2, h = 1, color = STEEL, legs = 0.25, metal = 0.85 }: { r?: number; h?: number; color?: string; legs?: number; metal?: number }) {
  const body = h - 2 * r * 0.5;
  return (
    <group>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.75, legs / 2, Math.sin(a) * r * 0.75]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, legs, 8]} />
            <Mat color="#59636e" metal={0.6} rough={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, legs + r * 0.5 + body / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, body, 32]} />
        <Mat color={color} metal={metal} rough={0.28} />
      </mesh>
      <mesh position={[0, legs + r * 0.5 + body, 0]} scale={[1, 0.5, 1]} castShadow>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={color} metal={metal} rough={0.28} />
      </mesh>
      <mesh position={[0, legs + r * 0.5, 0]} scale={[1, 0.5, 1]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={color} metal={metal} rough={0.28} />
      </mesh>
      {/* placa de identificación */}
      <mesh position={[0, legs + r * 0.5 + body * 0.6, r + 0.003]}>
        <boxGeometry args={[r * 0.8, r * 0.4, 0.005]} />
        <Mat color="#e5e7eb" rough={0.9} />
      </mesh>
    </group>
  );
}

export function Pump({ color = "#2563eb", running = true }: { color?: string; running?: boolean }) {
  const fan = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (fan.current && running) fan.current.rotation.x += dt * 12;
  });
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.06, 0.28]} />
        <Mat color={DARK} rough={0.8} />
      </mesh>
      <mesh position={[-0.1, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.3, 24]} />
        <Mat color={color} metal={0.4} rough={0.45} />
      </mesh>
      <mesh ref={fan} position={[-0.27, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.085, 0.085, 0.04, 6]} />
        <Mat color="#334155" />
      </mesh>
      <mesh position={[0.15, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.11, 24, 16]} />
        <Mat color="#8a95a1" metal={0.8} rough={0.35} />
      </mesh>
      <mesh position={[0.15, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.12, 12]} />
        <Mat color={STEEL} metal={0.85} rough={0.3} />
      </mesh>
    </group>
  );
}

/** Pila PEM sobre bastidor: placas terminales, celdas, tirantes y barras colectoras. */
export function StackSkid({ cells = 20 }: { cells?: number }) {
  const plates = useMemo(() => Array.from({ length: cells }, (_, i) => i), [cells]);
  const len = 0.5;
  return (
    <group>
      {/* bastidor */}
      {[-0.65, 0.65].map((x) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.32, z]} castShadow>
            <boxGeometry args={[0.06, 0.64, 0.06]} />
            <Mat color={FRAME} metal={0.3} rough={0.55} />
          </mesh>
        )),
      )}
      {[0.05, 0.62].map((y) => (
        <group key={y}>
          {[-0.5, 0.5].map((z) => (
            <mesh key={z} position={[0, y, z]} castShadow>
              <boxGeometry args={[1.36, 0.06, 0.06]} />
              <Mat color={FRAME} metal={0.3} rough={0.55} />
            </mesh>
          ))}
          {[-0.65, 0.65].map((x) => (
            <mesh key={x} position={[x, y, 0]} castShadow>
              <boxGeometry args={[0.06, 0.06, 1.06]} />
              <Mat color={FRAME} metal={0.3} rough={0.55} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.66, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.36, 0.03, 1.06]} />
        <Mat color="#4b5563" metal={0.5} rough={0.6} />
      </mesh>
      {/* placas terminales */}
      {[-len / 2 - 0.05, len / 2 + 0.05].map((x) => (
        <mesh key={x} position={[x, 0.93, 0]} castShadow>
          <boxGeometry args={[0.08, 0.5, 0.5]} />
          <Mat color="#3b4654" metal={0.7} rough={0.35} />
        </mesh>
      ))}
      {/* celdas */}
      {plates.map((i) => (
        <mesh key={i} position={[-len / 2 + (i + 0.5) * (len / cells), 0.93, 0]} castShadow>
          <boxGeometry args={[len / cells - 0.004, 0.4, 0.4]} />
          <Mat color={i % 2 ? "#6b7280" : "#1f2937"} metal={0.6} rough={0.4} />
        </mesh>
      ))}
      {/* tirantes */}
      {[-0.19, 0.19].map((y) =>
        [-0.19, 0.19].map((z) => (
          <mesh key={`${y}${z}`} position={[0, 0.93 + y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, len + 0.26, 8]} />
            <Mat color="#cbd5e1" metal={0.95} rough={0.2} />
          </mesh>
        )),
      )}
      {/* barras colectoras de cobre */}
      {[-len / 2 - 0.1, len / 2 + 0.1].map((x) => (
        <mesh key={x} position={[x, 1.08, 0.15]} castShadow>
          <boxGeometry args={[0.02, 0.18, 0.06]} />
          <Mat color="#b87333" metal={0.9} rough={0.3} />
        </mesh>
      ))}
      {/* colectores de gas */}
      {[-0.35, 0.35].map((z) => (
        <mesh key={z} position={[0.2, 1.05, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 12]} />
          <Mat color={STEEL} metal={0.9} rough={0.25} />
        </mesh>
      ))}
    </group>
  );
}

export function PVArray() {
  const panels = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) out.push([c, r]);
    return out;
  }, []);
  return (
    <group>
      {panels.map(([c, r]) => {
        const x = (c - 1.5) * 1.08;
        const z = (r - 0.5) * 2.4;
        return (
          <group key={`${c}${r}`} position={[x, 0, z]}>
            {[-0.35, 0.35].map((dz) => (
              <mesh key={dz} position={[0, 0.45 + (dz < 0 ? 0.25 : 0), dz]} castShadow>
                <boxGeometry args={[0.05, 0.9 + (dz < 0 ? 0.5 : 0), 0.05]} />
                <Mat color="#8b96a3" metal={0.7} rough={0.4} />
              </mesh>
            ))}
            <group position={[0, 1.1, 0]} rotation={[-0.42, 0, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1.02, 0.04, 1.7]} />
                <Mat color="#c0c7cf" metal={0.8} rough={0.3} />
              </mesh>
              <mesh position={[0, 0.022, 0]}>
                <boxGeometry args={[0.96, 0.005, 1.64]} />
                <Mat color="#10264a" metal={0.6} rough={0.12} />
              </mesh>
              {[-0.5, -0.17, 0.17, 0.5].map((dz) => (
                <mesh key={dz} position={[0, 0.026, dz * 1.6]}>
                  <boxGeometry args={[0.96, 0.002, 0.008]} />
                  <Mat color="#94a3b8" />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}

export function Chiller({ running = true }: { running?: boolean }) {
  const fans = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (fans.current && running) fans.current.children.forEach((c) => (c.rotation.y += dt * 8));
  });
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.1, 0.9]} />
        <Mat color="#e2e8f0" metal={0.3} rough={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0.452]}>
        <boxGeometry args={[1.2, 0.8, 0.004]} />
        <Mat color="#94a3b8" metal={0.5} rough={0.7} />
      </mesh>
      <group ref={fans}>
        {[-0.35, 0.35].map((x) => (
          <group key={x} position={[x, 1.16, 0]}>
            {[0, 1, 2].map((k) => (
              <mesh key={k} rotation={[0, (k * Math.PI * 2) / 3, 0]} position={[0, 0, 0]}>
                <boxGeometry args={[0.5, 0.01, 0.07]} />
                <Mat color="#334155" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.3, 32]} />
          <Mat color="#475569" />
        </mesh>
      ))}
    </group>
  );
}

export function Dryer() {
  return (
    <group>
      {[-0.13, 0.13].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <VerticalVessel r={0.1} h={1.1} legs={0.15} color="#b6c0ca" />
        </group>
      ))}
      <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 10]} />
        <Mat color={STEEL} metal={0.9} rough={0.25} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 10]} />
        <Mat color={STEEL} metal={0.9} rough={0.25} />
      </mesh>
    </group>
  );
}

export function HXShell() {
  return (
    <group>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]} castShadow>
          <boxGeometry args={[0.06, 0.5, 0.3]} />
          <Mat color="#59636e" metal={0.5} rough={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.0, 32]} />
        <Mat color={STEEL} metal={0.85} rough={0.3} />
      </mesh>
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.19, 0.19, 0.05, 32]} />
          <Mat color="#6b7785" metal={0.8} rough={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function ReliefValve() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.12, 16]} />
        <Mat color="#dc2626" metal={0.4} rough={0.45} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.045, 0.16, 16]} />
        <Mat color="#dc2626" metal={0.4} rough={0.45} />
      </mesh>
      <mesh position={[0.07, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 12]} />
        <Mat color={STEEL} metal={0.9} rough={0.25} />
      </mesh>
    </group>
  );
}

export function IsolationValve({ open = true }: { open?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 10]} />
        <Mat color="#6b7785" metal={0.7} rough={0.4} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.16, 16]} />
        <Mat color="#334155" metal={0.6} rough={0.4} />
      </mesh>
      <mesh position={[0, 1.13, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <Mat color={open ? "#16a34a" : "#dc2626"} metal={0.3} rough={0.5} />
      </mesh>
    </group>
  );
}

export function VentStack() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <Mat color="#6b7280" rough={0.9} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 5, 16]} />
        <Mat color={STEEL} metal={0.85} rough={0.3} />
      </mesh>
      <mesh position={[0, 5.2, 0]} castShadow>
        <coneGeometry args={[0.16, 0.14, 16]} />
        <Mat color="#9ca3af" metal={0.8} rough={0.3} />
      </mesh>
      {[1.2, 3.6].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.075, 0.012, 8, 24]} />
          <Mat color="#facc15" />
        </mesh>
      ))}
    </group>
  );
}

export function WallFan({ running = true }: { running?: boolean }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current && running) blades.current.rotation.z += dt * 10;
  });
  return (
    <group>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.32, 0.04, 12, 40]} />
        <Mat color="#cbd5e1" metal={0.6} rough={0.4} />
      </mesh>
      <group ref={blades}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[0, 0.35, (k * Math.PI) / 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.55, 0.1, 0.01]} />
            <Mat color="#475569" />
          </mesh>
        ))}
      </group>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
        <Mat color="#1f2937" />
      </mesh>
    </group>
  );
}

export function WaterPurifier() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.0, 0.1, 0.5]} />
        <Mat color={DARK} rough={0.8} />
      </mesh>
      {[-0.32, -0.12, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 1.0, 20]} />
          <Mat color="#e5e7eb" metal={0.1} rough={0.35} />
        </mesh>
      ))}
      <mesh position={[0.32, 0.55, 0]} castShadow>
        <boxGeometry args={[0.26, 0.9, 0.36]} />
        <Mat color="#cbd5e1" metal={0.3} rough={0.5} />
      </mesh>
      <mesh position={[0.32, 0.8, 0.182]}>
        <boxGeometry args={[0.16, 0.08, 0.005]} />
        <Mat color="#0b1622" emissive="#22d3ee" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** Figura de referencia de escala (1,75 m). */
export function ScaleFigure() {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.17, 1.05, 6, 16]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.12, 20, 16]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.135, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color="#facc15" roughness={0.5} />
      </mesh>
    </group>
  );
}
