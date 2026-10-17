import { describe, expect, it } from "vitest";
import { answer, ask, classify } from "./engine";
import { simulate } from "@/sim/engine";
import { scenarioById } from "@/sim/scenarios";

const baseline = simulate("normal", scenarioById.get("normal")!.defaults);
const dev = simulate("demand_loss", scenarioById.get("demand_loss")!.defaults);
const ctx = { selectedId: "TK-201", sample: dev.samples.at(-1)!, run: dev, baseline, focusEvent: null };

describe("guía determinista", () => {
  it("clasifica intenciones y etiquetas de equipo", () => {
    expect(classify("¿Qué hace el PT-201?")).toEqual({ intent: "equipment", equipmentId: "TK-201" });
    expect(classify("por qué se disparó la alarma").intent).toBe("events");
    expect(classify("¿con qué está conectado el electrolizador?")).toEqual({ intent: "connections", equipmentId: "EL-101" });
    expect(classify("¿cuál es la presión de la planta real ahora?").intent).toBe("real_plant");
    expect(classify("¿Cuál es la presión real de la planta UDES ahora?").intent).toBe("real_plant");
    // "presión real" del tanque es una variable del modelo, no la planta física
    expect(classify("¿por qué la presión real del tanque supera la medida?").intent).toBe("events");
  });

  it("explica el disparo PAHH con regla, umbral y causa del modelo", () => {
    const a = answer("events", ctx);
    const text = [...a.facts.map((f) => f.text), ...a.explanation].join(" ");
    expect(a.title).toContain("PAHH");
    expect(text).toContain("PT-201 ≥ 32 bar");
    expect(text).toContain("XV-202 cerrada");
    expect(a.facts.every((f) => f.source.length > 0)).toBe(true);
  });

  it("los números citados provienen de la corrida (sin valores inventados)", () => {
    const a = answer("events", ctx);
    const trip = dev.events.find((e) => e.kind === "trip")!;
    const shown = a.facts.map((f) => f.text).join(" ");
    expect(shown).toContain(trip.value!.toLocaleString("es-CO", { maximumFractionDigits: 2 }));
  });

  it("compara con la línea base listando entradas y KPI cambiados", () => {
    const a = answer("changes", ctx);
    expect(a.facts.some((f) => f.text.includes("escenario: normal → demand_loss"))).toBe(true);
    expect(a.facts.some((f) => f.text.startsWith("Primer disparo") || f.text.startsWith("Presión real máx."))).toBe(true);
  });

  it("nunca afirma conocer el estado de la planta real", () => {
    const a = ask("dame la medición real del tanque de la UDES", ctx);
    expect(a.intent).toBe("real_plant");
    expect(a.explanation.join(" ")).toContain("No puedo informar el estado actual de la planta real");
  });

  it("pide una selección si no hay equipo", () => {
    expect(answer("equipment", { ...ctx, selectedId: null }).title).toBe("Seleccione un equipo");
  });
});
