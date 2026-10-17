"use client";

import { useEffect, useRef, useState } from "react";
import { equipmentById } from "@/domain/plant";
import { QUICK_INTENTS, answer, ask, type GuideAnswer, type GuideContext, type GuideIntent } from "@/guide/engine";
import { scenarioById } from "@/sim/scenarios";
import { useCurrentSample, useTwin } from "@/state/store";
import { PanelHeader } from "../ui";

interface Turn {
  id: number;
  question: string;
  answer: GuideAnswer;
  contextLabel: string;
}

export default function GuidePanel() {
  const { state, dispatch, activeRun, baselineRun } = useTwin();
  const sample = useCurrentSample();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Bloque explícito: en Chromium reciente scrollIntoView puede devolver una Promise,
    // y un efecto de React solo puede devolver una función de limpieza.
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  const ctx: GuideContext = {
    selectedId: state.selectedId,
    sample,
    run: activeRun?.result ?? null,
    baseline: baselineRun?.result ?? null,
    focusEvent: activeRun?.result.events.find((e) => e.id === state.focusEventId) ?? null,
  };
  const contextLabel = [
    state.selectedId ? `equipo ${state.selectedId}` : "sin selección",
    activeRun ? `corrida ${activeRun.id} (${scenarioById.get(activeRun.result.scenarioId)!.code})` : "sin corrida",
    sample ? `t = ${(sample.t / 60).toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min` : "",
  ].filter(Boolean).join(" · ");

  const push = (question: string, a: GuideAnswer) => {
    setTurns((t) => [...t.slice(-19), { id: (t.at(-1)?.id ?? 0) + 1, question, answer: a, contextLabel }]);
    dispatch({ type: "guide", entry: { question, intent: a.intent, selectedId: state.selectedId, runId: activeRun?.id ?? null } });
  };
  const quick = (intent: GuideIntent, label: string) => push(label, answer(intent, ctx));
  const submit = () => {
    const q = text.trim();
    if (!q) return;
    const a = ask(q, ctx);
    push(q, a);
    setText("");
  };

  return (
    <>
      <PanelHeader title="Guía de ingeniería" subtitle="Asistente determinista basado en reglas · no es un modelo de lenguaje" />
      <div className="side-body flex flex-col !pb-3" data-testid="guide-panel">
        <div className="notice notice-info tiny mb-3">
          Responde solo con el modelo de planta, la corrida activa y la documentación de ecuaciones. Separa <b>hechos del modelo</b> (con su fuente) de la <b>explicación</b>. No conoce el estado de la planta UDES real.
        </div>
        <div className="tiny muted mb-2">Contexto: <span className="mono text-[var(--text-2)]">{contextLabel}</span></div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_INTENTS.map((q) => (
            <button key={q.intent} className="btn btn-sm" onClick={() => quick(q.intent, q.label)} data-testid={`guide-${q.intent}`}>{q.label}</button>
          ))}
        </div>

        <div className="flex-1 space-y-3 min-h-[120px]">
          {turns.length === 0 && <p className="small muted">Seleccione un equipo o ejecute un escenario y use las preguntas rápidas, o escriba la suya (p. ej. «¿por qué abrió la PSV?»).</p>}
          {turns.map((t) => (
            <div key={t.id} className="space-y-1.5">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg px-3 py-1.5 small bg-[var(--brand-soft)] border border-[var(--brand-line)]">{t.question}</div>
              </div>
              <div className="card !p-3" data-testid="guide-answer">
                <div className="small font-semibold mb-1">{t.answer.title}</div>
                {t.answer.facts.length > 0 && (
                  <div className="mb-2">
                    <div className="tiny uppercase tracking-wider text-[var(--sim)] mb-1">Hechos del modelo</div>
                    <ul className="space-y-1">
                      {t.answer.facts.map((f, i) => (
                        <li key={i} className="small leading-snug">
                          {f.text} <span className="tiny muted">[{f.source}]</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.answer.explanation.length > 0 && (
                  <div className="mb-2">
                    <div className="tiny uppercase tracking-wider text-[var(--accent)] mb-1">Explicación de la guía</div>
                    {t.answer.explanation.map((e, i) => <p key={i} className="small leading-relaxed text-[var(--text-2)] mb-1">{e}</p>)}
                  </div>
                )}
                {t.answer.evidence.length > 0 && <div className="tiny muted">Evidencia: {t.answer.evidence.join(" · ")}</div>}
                {t.answer.next.length > 0 && <div className="tiny mt-1 text-[var(--text-2)]">→ {t.answer.next.join(" ")}</div>}
                <div className="tiny muted mt-1.5 opacity-70">Contexto al preguntar: {t.contextLabel}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form className="flex gap-2 mt-3 sticky bottom-0 bg-[var(--panel)] pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            className="input"
            placeholder={state.selectedId ? `Pregunte sobre ${equipmentById.get(state.selectedId)?.name ?? state.selectedId}…` : "Escriba una pregunta…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Pregunta para la guía"
            data-testid="guide-input"
          />
          <button className="btn btn-primary" type="submit">Preguntar</button>
        </form>
      </div>
    </>
  );
}
