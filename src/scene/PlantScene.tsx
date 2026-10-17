"use client";

/**
 * Escena 3D interactiva de la planta conceptual. Lee la selección, la corrida
 * activa y la posición de reproducción del store compartido; los estados de
 * equipos y conexiones provienen de src/sim/state-map.ts.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CONNECTIONS, EQUIPMENT, INSTRUMENTS, equipmentById } from "@/domain/plant";
import { connectionStates, equipmentStates, type EquipmentState, type VisualStatus } from "@/sim/state-map";
import { useCurrentSample, useTwin } from "@/state/store";
import { CAMERA_PRESETS, FLUID_COLOR, FLUID_RADIUS, PLACEMENTS, ROOM, routeConnection, type Vec3 } from "./layout";
import {
  Cabinet, Chiller, Dryer, EquipmentVisual, HXShell, IsolationValve, PVArray, Pump, ReliefValve,
  ScaleFigure, StackSkid, VentStack, VerticalVessel, WallFan, WaterPurifier,
} from "./models";
import type { Sample } from "@/sim/types";

export const STATUS_COLOR: Record<VisualStatus, string> = {
  nominal: "#2dd4bf",
  idle: "#64748b",
  warning: "#f59e0b",
  critical: "#ef4444",
  fault: "#f97316",
  nodata: "#475569",
};

function EquipmentModel({ id, sample }: { id: string; sample: Sample | null }) {
  const f = sample?.flags;
  switch (id) {
    case "PV-001": return <PVArray />;
    case "PSU-001": return <Cabinet w={0.8} h={2.0} d={0.6} accent="#f2b33d" />;
    case "PLC-001": return <Cabinet w={0.6} h={1.85} d={0.45} color="#c7cfd8" accent="#22d3ee" />;
    case "WP-001": return <WaterPurifier />;
    case "TK-001": return <VerticalVessel r={0.2} h={1.0} legs={0.15} color="#dbe4ee" metal={0.15} />;
    case "P-001": return <Pump color="#2563eb" running={f?.electrolyzer === "running"} />;
    case "P-102": return <Pump color="#0891b2" running />;
    case "P-103": return <Pump color="#16a34a" running={f ? f.p103Running : true} />;
    case "SEP-101": return <VerticalVessel r={0.15} h={1.15} legs={0.2} />;
    case "SEP-102": return <VerticalVessel r={0.15} h={1.15} legs={0.2} />;
    case "HX-101": return <HXShell />;
    case "CH-101": return <Chiller running={f ? f.p103Running : true} />;
    case "EL-101": return <StackSkid />;
    case "DRY-201": return <Dryer />;
    case "TK-201": return <VerticalVessel r={0.18} h={0.85} legs={0.22} color="#e8edf2" metal={0.5} />;
    case "PSV-201": return <ReliefValve />;
    case "XV-202": return <IsolationValve open={f ? f.xv202Open : true} />;
    case "FC-401": return <Cabinet w={0.8} h={1.3} d={0.6} color="#e7ecf1" accent="#22c55e" />;
    case "VS-301": return <VentStack />;
    case "FAN-301": return <WallFan running={f ? f.fanRunning : true} />;
    default: return null;
  }
}

function StatusBeacon({ y, status }: { y: number; status: VisualStatus }) {
  const ref = useRef<THREE.Mesh>(null);
  const alert = status === "critical" || status === "warning" || status === "fault";
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = alert ? 1.2 + Math.sin(clock.elapsedTime * (status === "critical" ? 8 : 4)) * 0.8 : 0.9;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <sphereGeometry args={[0.055, 16, 12]} />
      <meshStandardMaterial color={STATUS_COLOR[status]} emissive={STATUS_COLOR[status]} emissiveIntensity={1} toneMapped={false} />
    </mesh>
  );
}

function SelectionRing({ r, color, pulse }: { r: number; color: string; pulse: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current && pulse) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.04);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <ringGeometry args={[r, r + 0.05, 64]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.95} />
    </mesh>
  );
}

function EquipmentNode({
  id, state, sample, selected, hovered, dim, showLabel, onHover, onSelect,
}: {
  id: string; state: EquipmentState; sample: Sample | null; selected: boolean; hovered: boolean; dim: boolean; showLabel: boolean;
  onHover: (id: string | null) => void; onSelect: (id: string) => void;
}) {
  const p = PLACEMENTS[id];
  const eq = equipmentById.get(id)!;
  const visual = useMemo(() => ({ dim, glow: selected ? 0.28 : hovered ? 0.16 : 0, glowColor: "#22d3ee" }), [dim, selected, hovered]);
  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(id); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { onHover(null); document.body.style.cursor = ""; },
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(id); },
  };
  if (id === "ENC-301") {
    return showLabel ? (
      <group position={p.position}>
        <Html position={[0, p.labelY, 0]} center zIndexRange={[20, 0]}>
          <LabelChip id={id} name={eq.name} state={state} selected={selected} onSelect={onSelect} />
        </Html>
      </group>
    ) : null;
  }
  return (
    <group position={p.position} rotation={[0, p.rotationY ?? 0, 0]}>
      <EquipmentVisual.Provider value={visual}>
        <group {...handlers}>
          <EquipmentModel id={id} sample={sample} />
        </group>
      </EquipmentVisual.Provider>
      {!dim && p.position[1] < 0.5 && (selected || hovered) && <SelectionRing r={p.ring} color={selected ? "#22d3ee" : "#94a3b8"} pulse={selected} />}
      {!dim && state.status !== "nodata" && <StatusBeacon y={p.labelY - 0.22} status={state.status} />}
      {showLabel && !dim && (
        <LodLabel y={p.labelY} minor={MINOR_LABELS.has(id) && !selected && !hovered}>
          <LabelChip id={id} name={eq.name} state={state} selected={selected} onSelect={onSelect} />
        </LodLabel>
      )}
    </group>
  );
}

/** Equipos pequeños: su etiqueta solo aparece de cerca, al pasar el cursor o al seleccionarlos. */
const MINOR_LABELS = new Set(["P-001", "P-102", "P-103", "PSV-201", "XV-202", "SEP-101", "SEP-102", "DRY-201", "TK-001", "PLC-001"]);

function LodLabel({ y, minor, children }: { y: number; minor: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const div = useRef<HTMLDivElement>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    if (!group.current || !div.current) return;
    const d = camera.position.distanceTo(group.current.getWorldPosition(tmp));
    const visible = !minor || d < 7.5;
    div.current.style.opacity = visible ? "1" : "0";
    div.current.style.pointerEvents = visible ? "auto" : "none";
  });
  return (
    <group ref={group} position={[0, y, 0]}>
      <Html center zIndexRange={[20, 0]}>
        <div ref={div} style={{ transition: "opacity 0.2s" }}>{children}</div>
      </Html>
    </group>
  );
}

function LabelChip({ id, name, state, selected, onSelect }: { id: string; name: string; state: EquipmentState; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      className={`scene-label ${selected ? "is-selected" : ""}`}
      title={`${name} — ${state.label}`}
      data-testid={`label-${id}`}
    >
      <span className="dot" style={{ background: STATUS_COLOR[state.status] }} />
      <span className="tag">{id}</span>
      {selected && <span className="name">{name}</span>}
    </button>
  );
}

function segmentInfo(points: Vec3[]) {
  const v = points.map((p) => new THREE.Vector3(...p));
  const lengths: number[] = [0];
  for (let i = 1; i < v.length; i++) lengths.push(lengths[i - 1] + v[i].distanceTo(v[i - 1]));
  return { v, lengths, total: lengths.at(-1)! };
}

function Pipe({ id, active, intensity, highlight, dim, showFlow }: { id: string; active: boolean; intensity: number; highlight: boolean; dim: boolean; showFlow: boolean }) {
  const conn = CONNECTIONS.find((c) => c.id === id)!;
  const points = useMemo(() => routeConnection(id), [id]);
  const { v, lengths, total } = useMemo(() => segmentInfo(points), [points]);
  const color = FLUID_COLOR[conn.fluid];
  const radius = FLUID_RADIUS[conn.fluid];
  const segments = useMemo(
    () =>
      v.slice(1).map((b, i) => {
        const a = v[i];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const len = a.distanceTo(b);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        return { mid, len, q };
      }),
    [v],
  );
  const dots = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(3, Math.round(total / 0.45));
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const offset = useRef(0);
  useFrame((_, dt) => {
    const mesh = dots.current;
    if (!mesh) return;
    offset.current = (offset.current + dt * (0.25 + intensity * 1.2)) % 1;
    for (let k = 0; k < count; k++) {
      const s = (((k / count + offset.current) % 1) * total);
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < s) i++;
      const t = (s - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
      tmp.position.copy(v[i - 1]).lerp(v[i], t);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      mesh.setMatrixAt(k, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  const opacity = dim ? 0.08 : 1;
  return (
    <group>
      {segments.map((s, i) => (
        <mesh key={i} position={s.mid} quaternion={s.q} castShadow={!dim}>
          <cylinderGeometry args={[radius, radius, s.len + radius * 1.2, 10]} />
          <meshStandardMaterial
            color={color}
            metalness={conn.fluid === "electric" || conn.fluid === "signal" ? 0.2 : 0.65}
            roughness={0.35}
            emissive={highlight ? color : "#000000"}
            emissiveIntensity={highlight ? 0.45 : 0}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      ))}
      {v.slice(1, -1).map((p, i) => (
        <mesh key={`j${i}`} position={p}>
          <sphereGeometry args={[radius * 1.25, 10, 8]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      ))}
      {showFlow && active && !dim && conn.fluid !== "signal" && (
        <instancedMesh ref={dots} args={[undefined, undefined, count]} frustumCulled={false}>
          <sphereGeometry args={[radius * 1.6, 8, 6]} />
          <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1.6} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}

function Room({ showZones }: { showZones: boolean }) {
  const w = ROOM.maxX - ROOM.minX;
  const d = ROOM.maxZ - ROOM.minZ;
  const cx = (ROOM.maxX + ROOM.minX) / 2;
  const cz = (ROOM.maxZ + ROOM.minZ) / 2;
  const posts: Vec3[] = [
    [ROOM.minX, 0, ROOM.minZ], [ROOM.maxX, 0, ROOM.minZ], [ROOM.minX, 0, ROOM.maxZ], [ROOM.maxX, 0, ROOM.maxZ],
    [cx, 0, ROOM.minZ], [cx, 0, ROOM.maxZ],
  ];
  return (
    <group>
      {/* terreno */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#222c38" roughness={0.95} />
      </mesh>
      {/* losa exterior */}
      <mesh position={[0.5, -0.01, -0.5]} receiveShadow>
        <boxGeometry args={[24, 0.02, 12]} />
        <meshStandardMaterial color="#3b434d" roughness={0.92} />
      </mesh>
      {/* piso epóxico del recinto */}
      <mesh position={[cx, 0.002, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#4a5560" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* líneas de pasillo */}
      {[ROOM.minZ + 0.15, ROOM.maxZ - 0.15].map((z) => (
        <mesh key={z} position={[cx, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.3, 0.06]} />
          <meshBasicMaterial color="#d4a72c" />
        </mesh>
      ))}
      {/* muro posterior (corte de visualización: sin muro frontal ni techo) */}
      <mesh position={[cx, ROOM.height / 2, ROOM.minZ - 0.06]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.12, ROOM.height, 0.12]} />
        <meshStandardMaterial color="#5b6672" roughness={0.85} />
      </mesh>
      <mesh position={[ROOM.minX - 0.03, ROOM.height / 2, cz]}>
        <boxGeometry args={[0.04, ROOM.height, d]} />
        <meshStandardMaterial color="#8fb3c9" transparent opacity={0.1} roughness={0.1} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* murete inferior izquierdo */}
      <mesh position={[ROOM.minX - 0.06, 0.45, cz]} receiveShadow castShadow>
        <boxGeometry args={[0.12, 0.9, d]} />
        <meshStandardMaterial color="#56616c" roughness={0.85} />
      </mesh>
      {/* muro lateral derecho translúcido */}
      <mesh position={[ROOM.maxX + 0.03, ROOM.height / 2, cz]}>
        <boxGeometry args={[0.04, ROOM.height, d]} />
        <meshStandardMaterial color="#8fb3c9" transparent opacity={0.1} roughness={0.1} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* estructura de acero */}
      {posts.map((p, i) => (
        <mesh key={i} position={[p[0], ROOM.height / 2, p[2]]} castShadow>
          <boxGeometry args={[0.12, ROOM.height, 0.12]} />
          <meshStandardMaterial color="#2f3a46" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {[ROOM.minZ, ROOM.maxZ].map((z) => (
        <mesh key={z} position={[cx, ROOM.height, z]} castShadow>
          <boxGeometry args={[w + 0.12, 0.16, 0.12]} />
          <meshStandardMaterial color="#2f3a46" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {[ROOM.minX, cx, ROOM.maxX].map((x) => (
        <mesh key={x} position={[x, ROOM.height, cz]} castShadow>
          <boxGeometry args={[0.12, 0.16, d]} />
          <meshStandardMaterial color="#2f3a46" metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {/* soportes del rack de tuberías */}
      {[-0.6, 1.6, 3.9, 6.2].map((x) => (
        <group key={x}>
          {[-1.95, 1.95].map((z) => (
            <mesh key={z} position={[x, 1.5, z]} castShadow>
              <boxGeometry args={[0.06, 3.0, 0.06]} />
              <meshStandardMaterial color="#556270" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[x, 2.2, 0]} castShadow>
            <boxGeometry args={[0.06, 0.06, 3.96]} />
            <meshStandardMaterial color="#556270" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {showZones && (
        <group>
          <mesh position={[4.3, 0.006, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.6, 3.6]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} depthWrite={false} />
          </mesh>
          <Html position={[4.3, 0.05, 1.1]} center zIndexRange={[10, 0]}>
            <div className="zone-label">Área de equipos de H2 · indicativa (no es clasificación de áreas)</div>
          </Html>
          <mesh position={[-6.6, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5.2, 5.6]} />
            <meshBasicMaterial color="#f2b33d" transparent opacity={0.08} depthWrite={false} />
          </mesh>
          <Html position={[-7.6, 0.05, 3.0]} center zIndexRange={[10, 0]}>
            <div className="zone-label">Exterior · generación FV conceptual</div>
          </Html>
        </group>
      )}
    </group>
  );
}

const INSTRUMENT_OFFSET: Record<string, Vec3> = {
  "JT-101": [0.25, 1.6, 0.32], "IT-101": [0.05, 1.6, 0.32], "ET-101": [-0.4, 1.3, 0.3], "TT-101": [0.4, 1.3, 0.3],
  "FT-201": [0, 1.65, 0.18], "PT-201": [0.22, 0.9, 0.1], "CT-001": [0.22, 0.8, 0.1], "LT-001": [-0.22, 0.9, 0.1],
  "GD-301": [-3.8, 3.05, -2.6],
};

function InstrumentMarkers({ dimAll, selectedId, onSelect }: { dimAll: boolean; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <group>
      {INSTRUMENTS.map((ins) => {
        const p = PLACEMENTS[ins.attachedTo];
        const o = INSTRUMENT_OFFSET[ins.id] ?? [0, 1, 0];
        const pos: Vec3 = [p.position[0] + o[0], p.position[1] + o[1], p.position[2] + o[2]];
        const dim = dimAll && selectedId !== ins.attachedTo;
        if (dim) return null;
        return (
          <group key={ins.id} position={pos}>
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(ins.attachedTo); }}>
              <cylinderGeometry args={[0.045, 0.045, 0.07, 14]} />
              <meshStandardMaterial color={ins.realization === "soft" ? "#a78bfa" : "#f8fafc"} metalness={0.4} roughness={0.4} />
            </mesh>
            <Html position={[0, 0.12, 0]} center zIndexRange={[15, 0]}>
              <div className={`inst-label ${ins.realization === "soft" ? "soft" : ""}`} title={ins.name}>{ins.id}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { state } = useTwin();
  const { camera } = useThree();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);
  const lastSel = useRef<string | null>(null);

  useEffect(() => {
    if (!state.cameraPreset) return;
    const p = CAMERA_PRESETS[state.cameraPreset.name];
    if (p) goal.current = { pos: new THREE.Vector3(...p.position), target: new THREE.Vector3(...p.target), t: 0 };
  }, [state.cameraPreset]);

  useEffect(() => {
    const id = state.selectedId;
    if (!id || id === lastSel.current || !state.autoFrame) {
      lastSel.current = id;
      return;
    }
    lastSel.current = id;
    const pl = PLACEMENTS[id];
    const target = id === "ENC-301" ? new THREE.Vector3(2, 1, 0) : new THREE.Vector3(pl.position[0], pl.position[1] + Math.min(pl.labelY, 2.4) * 0.45, pl.position[2]);
    const ctl = controls.current;
    const dir = camera.position.clone().sub(ctl ? ctl.target : new THREE.Vector3()).normalize();
    if (dir.y < 0.25) dir.y = 0.35;
    dir.normalize();
    const dist = id === "ENC-301" ? 13 : id === "PV-001" ? 9 : Math.max(2.8, pl.ring * 4 + 2.2);
    goal.current = { pos: target.clone().add(dir.multiplyScalar(dist)), target, t: 0 };
  }, [state.selectedId, state.autoFrame, camera, controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    const ctl = controls.current;
    if (!g || !ctl) return;
    g.t = Math.min(1, g.t + dt / 0.9);
    const k = 1 - Math.pow(1 - g.t, 3);
    camera.position.lerp(g.pos, k * 0.18 + 0.02);
    ctl.target.lerp(g.target, k * 0.18 + 0.02);
    ctl.update();
    if (g.t >= 1 && camera.position.distanceTo(g.pos) < 0.02) goal.current = null;
  });
  return null;
}

function SceneContent() {
  const { state, dispatch } = useTwin();
  const sample = useCurrentSample();
  const controls = useRef<OrbitControlsImpl>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const eqStates = useMemo(() => equipmentStates(sample), [sample]);
  const connStates = useMemo(() => connectionStates(sample), [sample]);
  const sel = state.selectedId;
  const related = useMemo(() => {
    if (!sel) return new Set<string>();
    const s = new Set([sel]);
    for (const c of CONNECTIONS) {
      if (c.from === sel) s.add(c.to);
      if (c.to === sel) s.add(c.from);
    }
    if (sel === "TK-201") s.add("PSV-201");
    return s;
  }, [sel]);
  const isolate = state.isolate && !!sel;
  const select = (id: string) => dispatch({ type: "select", id });
  const initial = CAMERA_PRESETS.general;

  return (
    <>
      <color attach="background" args={["#0d141e"]} />
      <fog attach="fog" args={["#0b1018", 28, 60]} />
      <hemisphereLight args={["#d6ecff", "#2a3442", 0.9]} />
      <directionalLight
        position={[8, 14, 9]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[0.5, 2.9, 0]} intensity={9} distance={10} color="#e6f2ff" />
      <pointLight position={[4.8, 2.9, 0]} intensity={9} distance={10} color="#e6f2ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.6} position={[0, 6, -6]} scale={[14, 4, 1]} color="#dbeafe" />
        <Lightformer intensity={0.8} position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} color="#7dd3fc" />
        <Lightformer intensity={0.6} position={[8, 3, 4]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} color="#fde68a" />
        <Lightformer intensity={0.4} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#1e293b" />
      </Environment>

      <group onPointerMissed={() => undefined}>
        <Room showZones={state.layers.zones} />
        <group position={[-1.7, 0, 0.6]}>
          <ScaleFigure />
          {state.layers.labels && (
            <Html position={[0, 2.05, 0]} center zIndexRange={[10, 0]}>
              <div className="zone-label">Referencia 1,75 m</div>
            </Html>
          )}
        </group>
        {EQUIPMENT.map((e) => (
          <EquipmentNode
            key={e.id}
            id={e.id}
            state={eqStates[e.id]}
            sample={sample}
            selected={sel === e.id}
            hovered={hovered === e.id}
            dim={isolate && !related.has(e.id)}
            showLabel={state.layers.labels}
            onHover={setHovered}
            onSelect={select}
          />
        ))}
        {CONNECTIONS.map((c) => (
          <Pipe
            key={c.id}
            id={c.id}
            active={connStates[c.id].active}
            intensity={connStates[c.id].intensity}
            highlight={!!sel && (c.from === sel || c.to === sel)}
            dim={isolate && !(c.from === sel || c.to === sel)}
            showFlow={state.layers.flow}
          />
        ))}
        {state.layers.instruments && <InstrumentMarkers dimAll={isolate} selectedId={sel} onSelect={select} />}
      </group>

      <OrbitControls
        ref={controls}
        makeDefault
        target={initial.target}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.05}
      />
      <CameraRig controls={controls} />
    </>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="scene-fallback" role="alert">
          <strong>No fue posible iniciar la vista 3D.</strong>
          <p>El navegador no pudo crear un contexto WebGL o la escena falló al renderizar. El resto de la aplicación (simulación, explorador, misiones) sigue disponible.</p>
          <code>{this.state.error}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PlantScene() {
  const initial = CAMERA_PRESETS.general;
  const { dispatch } = useTwin();
  return (
    <SceneErrorBoundary>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: initial.position, fov: 42, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: "high-performance", toneMappingExposure: 1.15 }}
        onPointerMissed={(e) => { if (e.type === "click") dispatch({ type: "select", id: null }); }}
        data-testid="plant-canvas"
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  );
}

