"use client";

/**
 * Estado compartido de la sesión: selección, corridas, reproducción, capas,
 * misión. La escena 3D, el explorador, el laboratorio, el historial y la
 * guía leen y escriben aquí, por lo que siempre coinciden.
 *
 * Persistencia: se guardan en localStorage solo las ENTRADAS de cada corrida
 * (no los resultados). Al recargar, cada corrida se vuelve a simular; como el
 * motor es determinista, los resultados son idénticos.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { simulate } from "@/sim/engine";
import { scenarioById } from "@/sim/scenarios";
import { equipmentById } from "@/domain/plant";
import type { ScenarioId, ScenarioInputs, SimulationResult } from "@/sim/types";
import { emptyProgress, type MissionProgress } from "@/training/mission";

export type SectionId = "overview" | "studio" | "explorer" | "lab" | "training" | "guide" | "history" | "docs";

export interface RunRecord {
  id: string;
  label: string;
  createdAt: string;
  origin: "laboratorio" | "misión" | "inicio";
  result: SimulationResult;
}

export interface Layers {
  labels: boolean;
  flow: boolean;
  zones: boolean;
  instruments: boolean;
}

export interface GuideEntry {
  id: number;
  question: string;
  intent: string;
  selectedId: string | null;
  runId: string | null;
}

export interface TwinState {
  section: SectionId;
  selectedId: string | null;
  selectionLog: string[];
  runs: RunRecord[];
  activeRunId: string | null;
  baselineRunId: string | null;
  playhead: number;
  playing: boolean;
  speed: number;
  draft: { scenarioId: ScenarioId; inputs: ScenarioInputs };
  layers: Layers;
  isolate: boolean;
  autoFrame: boolean;
  focusEventId: string | null;
  mission: MissionProgress;
  guideLog: GuideEntry[];
  cameraPreset: { name: string; nonce: number } | null;
  hydrated: boolean;
}

type Action =
  | { type: "section"; section: SectionId }
  | { type: "select"; id: string | null }
  | { type: "draft"; scenarioId?: ScenarioId; inputs?: Partial<ScenarioInputs> }
  | { type: "addRun"; run: RunRecord; makeBaseline?: boolean }
  | { type: "activate"; runId: string }
  | { type: "baseline"; runId: string | null }
  | { type: "deleteRun"; runId: string }
  | { type: "playhead"; index: number }
  | { type: "playing"; playing: boolean }
  | { type: "speed"; speed: number }
  | { type: "layer"; key: keyof Layers; value: boolean }
  | { type: "isolate"; value: boolean }
  | { type: "autoFrame"; value: boolean }
  | { type: "focusEvent"; id: string | null }
  | { type: "mission"; progress: MissionProgress }
  | { type: "guide"; entry: Omit<GuideEntry, "id"> }
  | { type: "camera"; name: string }
  | { type: "hydrate"; state: Partial<TwinState> }
  | { type: "clearSession" };

const initialDraft = () => ({ scenarioId: "normal" as ScenarioId, inputs: { ...scenarioById.get("normal")!.defaults } });

const initialState: TwinState = {
  section: "overview",
  selectedId: null,
  selectionLog: [],
  runs: [],
  activeRunId: null,
  baselineRunId: null,
  playhead: 0,
  playing: false,
  speed: 60,
  draft: initialDraft(),
  layers: { labels: true, flow: true, zones: false, instruments: false },
  isolate: false,
  autoFrame: true,
  focusEventId: null,
  mission: emptyProgress(),
  guideLog: [],
  cameraPreset: null,
  hydrated: false,
};

function reducer(s: TwinState, a: Action): TwinState {
  switch (a.type) {
    case "section":
      return { ...s, section: a.section };
    case "select": {
      if (a.id === s.selectedId) return s;
      // La inspección de la misión solo cuenta después de iniciarla (paso ≥ 1).
      const missionActive = s.mission.stepIndex >= 1 && !s.mission.completed;
      const inspected = missionActive && a.id && !s.mission.inspected.includes(a.id) ? [...s.mission.inspected, a.id] : s.mission.inspected;
      return {
        ...s,
        selectedId: a.id,
        selectionLog: a.id ? [...s.selectionLog.slice(-49), a.id] : s.selectionLog,
        mission: { ...s.mission, inspected },
      };
    }
    case "draft":
      return {
        ...s,
        draft: {
          scenarioId: a.scenarioId ?? s.draft.scenarioId,
          inputs: a.scenarioId && !a.inputs ? { ...scenarioById.get(a.scenarioId)!.defaults } : { ...s.draft.inputs, ...a.inputs },
        },
      };
    case "addRun": {
      const result = a.run.result;
      const last = result.samples.length - 1;
      return {
        ...s,
        runs: [...s.runs, a.run],
        activeRunId: a.run.id,
        baselineRunId: a.makeBaseline || !s.baselineRunId ? a.run.id : s.baselineRunId,
        playhead: last,
        playing: false,
        focusEventId: null,
      };
    }
    case "activate": {
      const run = s.runs.find((r) => r.id === a.runId);
      if (!run) return s;
      return { ...s, activeRunId: a.runId, playhead: run.result.samples.length - 1, playing: false, focusEventId: null };
    }
    case "baseline":
      return { ...s, baselineRunId: a.runId };
    case "deleteRun": {
      const runs = s.runs.filter((r) => r.id !== a.runId);
      return {
        ...s,
        runs,
        activeRunId: s.activeRunId === a.runId ? runs.at(-1)?.id ?? null : s.activeRunId,
        baselineRunId: s.baselineRunId === a.runId ? runs[0]?.id ?? null : s.baselineRunId,
      };
    }
    case "playhead":
      return { ...s, playhead: a.index };
    case "playing":
      return { ...s, playing: a.playing };
    case "speed":
      return { ...s, speed: a.speed };
    case "layer":
      return { ...s, layers: { ...s.layers, [a.key]: a.value } };
    case "isolate":
      return { ...s, isolate: a.value };
    case "autoFrame":
      return { ...s, autoFrame: a.value };
    case "focusEvent":
      return { ...s, focusEventId: a.id };
    case "mission":
      return { ...s, mission: a.progress };
    case "guide":
      return { ...s, guideLog: [...s.guideLog.slice(-29), { ...a.entry, id: (s.guideLog.at(-1)?.id ?? 0) + 1 }] };
    case "camera":
      return { ...s, cameraPreset: { name: a.name, nonce: (s.cameraPreset?.nonce ?? 0) + 1 } };
    case "hydrate":
      return { ...s, ...a.state, hydrated: true };
    case "clearSession":
      return { ...initialState, hydrated: true, section: s.section };
  }
}

interface Ctx {
  state: TwinState;
  dispatch: React.Dispatch<Action>;
  activeRun: RunRecord | null;
  baselineRun: RunRecord | null;
  runScenario: (scenarioId: ScenarioId, inputs: ScenarioInputs, origin: RunRecord["origin"], label?: string) => RunRecord;
}

const TwinContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "hydro-twin-udes/session/v1";

interface PersistedRun {
  id: string;
  label: string;
  createdAt: string;
  origin: RunRecord["origin"];
  scenarioId: ScenarioId;
  inputs: ScenarioInputs;
}

interface Persisted {
  runs: PersistedRun[];
  activeRunId: string | null;
  baselineRunId: string | null;
  mission: MissionProgress;
  selectedId: string | null;
  layers: Layers;
}

export function nextRunId(runs: RunRecord[]): string {
  const max = runs.reduce((m, r) => Math.max(m, Number(r.id.slice(2)) || 0), 0);
  return `R-${String(max + 1).padStart(3, "0")}`;
}

export function TwinProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const runsRef = useRef(state.runs);
  useEffect(() => {
    runsRef.current = state.runs;
  }, [state.runs]);

  // Hidratación: re-simula las corridas guardadas (determinismo).
  useEffect(() => {
    let restored: Partial<TwinState> = {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        const runs: RunRecord[] = p.runs
          .filter((r) => scenarioById.has(r.scenarioId))
          .map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt, origin: r.origin, result: simulate(r.scenarioId, r.inputs) }));
        const active = runs.find((r) => r.id === p.activeRunId) ?? runs.at(-1) ?? null;
        restored = {
          runs,
          activeRunId: active?.id ?? null,
          baselineRunId: runs.some((r) => r.id === p.baselineRunId) ? p.baselineRunId : runs[0]?.id ?? null,
          mission: p.mission ?? emptyProgress(),
          selectedId: p.selectedId ?? null,
          layers: p.layers ?? initialState.layers,
          playhead: active ? active.result.samples.length - 1 : 0,
        };
      }
    } catch {
      restored = {};
    }
    if (!restored.runs || restored.runs.length === 0) {
      // Primera visita: línea base nominal para que la escena muestre estado simulado.
      const def = scenarioById.get("normal")!.defaults;
      const result = simulate("normal", def);
      const run: RunRecord = { id: "R-001", label: "ESC-01 · línea base inicial", createdAt: new Date().toISOString(), origin: "inicio", result };
      restored = { ...restored, runs: [run], activeRunId: run.id, baselineRunId: run.id, playhead: result.samples.length - 1 };
    }
    // Enlaces de demostración: ?seccion=studio&sel=TK-201&escenario=demand_loss&t=45
    try {
      const qs = new URLSearchParams(window.location.search);
      const section = qs.get("seccion") as SectionId | null;
      const sel = qs.get("sel");
      const esc = qs.get("escenario") as ScenarioId | null;
      const tMin = qs.get("t");
      if (section && ["overview", "studio", "explorer", "lab", "training", "guide", "history", "docs"].includes(section)) restored.section = section;
      if (sel && equipmentById.has(sel)) restored.selectedId = sel;
      if (esc && scenarioById.has(esc)) {
        const sc = scenarioById.get(esc)!;
        const result = simulate(esc, sc.defaults);
        const runs = restored.runs ?? [];
        const run: RunRecord = { id: nextRunId(runs), label: `${sc.code} · enlace de demostración`, createdAt: new Date().toISOString(), origin: "laboratorio", result };
        restored = { ...restored, runs: [...runs, run], activeRunId: run.id, playhead: result.samples.length - 1, draft: { scenarioId: esc, inputs: { ...sc.defaults } } };
      }
      if (tMin !== null && Number.isFinite(Number(tMin))) {
        const active = (restored.runs ?? []).find((r) => r.id === restored.activeRunId);
        if (active) restored.playhead = Math.min(active.result.samples.length - 1, Math.max(0, Math.round((Number(tMin) * 60) / 10)));
      }
    } catch {
      /* parámetros inválidos: se ignoran */
    }
    dispatch({ type: "hydrate", state: restored });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const p: Persisted = {
      runs: state.runs.map((r) => ({ id: r.id, label: r.label, createdAt: r.createdAt, origin: r.origin, scenarioId: r.result.scenarioId, inputs: r.result.inputs })),
      activeRunId: state.activeRunId,
      baselineRunId: state.baselineRunId,
      mission: state.mission,
      selectedId: state.selectedId,
      layers: state.layers,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* almacenamiento no disponible: la sesión sigue en memoria */
    }
  }, [state.hydrated, state.runs, state.activeRunId, state.baselineRunId, state.mission, state.selectedId, state.layers]);

  const value = useMemo<Ctx>(() => {
    const activeRun = state.runs.find((r) => r.id === state.activeRunId) ?? null;
    const baselineRun = state.runs.find((r) => r.id === state.baselineRunId) ?? null;
    const runScenario: Ctx["runScenario"] = (scenarioId, inputs, origin, label) => {
      const result = simulate(scenarioId, inputs);
      const sc = scenarioById.get(scenarioId)!;
      const run: RunRecord = {
        id: nextRunId(runsRef.current),
        label: label ?? `${sc.code} · ${sc.title}`,
        createdAt: new Date().toISOString(),
        origin,
        result,
      };
      runsRef.current = [...runsRef.current, run];
      dispatch({ type: "addRun", run });
      return run;
    };
    return { state, dispatch, activeRun, baselineRun, runScenario };
  }, [state]);

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwin(): Ctx {
  const ctx = useContext(TwinContext);
  if (!ctx) throw new Error("useTwin debe usarse dentro de <TwinProvider>");
  return ctx;
}

/** Muestra actualmente mostrada (según la posición de reproducción). */
export function useCurrentSample() {
  const { state, activeRun } = useTwin();
  if (!activeRun) return null;
  const samples = activeRun.result.samples;
  return samples[Math.min(state.playhead, samples.length - 1)] ?? null;
}
