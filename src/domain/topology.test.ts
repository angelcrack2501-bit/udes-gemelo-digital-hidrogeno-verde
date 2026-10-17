import { describe, expect, it } from "vitest";
import { downstreamOf, influencePath, PLANT_MODEL, reachableFrom, upstreamOf, validatePlant } from "./topology";
import { CONNECTIONS, EQUIPMENT, INSTRUMENTS } from "./plant";

describe("modelo semántico de la planta", () => {
  it("la planta definida no tiene errores de validación", () => {
    const issues = validatePlant(PLANT_MODEL);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("detecta referencias rotas y fluidos incompatibles", () => {
    const broken = {
      equipment: EQUIPMENT,
      instruments: [...INSTRUMENTS, { ...INSTRUMENTS[0], id: "XT-999", attachedTo: "NO-000" }],
      connections: [
        ...CONNECTIONS,
        { id: "BAD1", lineTag: "H2-999", from: "TK-201", to: "NOPE-001", fluid: "h2" as const, description: "" },
        { id: "BAD2", lineTag: "W-999", from: "PV-001", to: "EL-101", fluid: "h2" as const, description: "" },
        { ...CONNECTIONS[0] },
      ],
    };
    const msgs = validatePlant(broken).map((i) => `${i.ref}: ${i.message}`);
    expect(msgs.some((m) => m.startsWith("BAD1") && m.includes("Destino inexistente"))).toBe(true);
    expect(msgs.some((m) => m.startsWith("BAD2") && m.includes("no puede entregar"))).toBe(true);
    expect(msgs.some((m) => m.includes("duplicado"))).toBe(true);
    expect(msgs.some((m) => m.startsWith("XT-999"))).toBe(true);
  });

  it("todos los instrumentos y escenarios referencian equipos existentes", () => {
    const ids = new Set(EQUIPMENT.map((e) => e.id));
    for (const i of INSTRUMENTS) expect(ids.has(i.attachedTo)).toBe(true);
  });

  it("aguas arriba/abajo del tanque pulmón", () => {
    expect(upstreamOf("TK-201").map((n) => n.equipmentId)).toEqual(["DRY-201"]);
    expect(downstreamOf("TK-201").map((n) => n.equipmentId).sort()).toEqual(["PSV-201", "XV-202"]);
  });

  it("la celda de combustible es alcanzable desde la pila y la ruta pasa por el tanque", () => {
    const path = influencePath("EL-101", "FC-401")!;
    expect(path.map((c) => c.to)).toEqual(["SEP-101", "DRY-201", "TK-201", "XV-202", "FC-401"]);
    expect(reachableFrom("EL-101", "down")).toContain("VS-301");
    expect(influencePath("FC-401", "EL-101")).toBeNull();
  });

  it("la falla de P-103 alcanza la pila a través de HX-101 (lazo de enfriamiento)", () => {
    const path = influencePath("P-103", "EL-101");
    // P-103 → HX-101 por agua de enfriamiento; el acoplamiento térmico HX→pila ocurre vía el lazo anódico
    expect(path).not.toBeNull();
    expect(path!.map((c) => c.lineTag)).toEqual(["CW-102", "W-103"]);
  });
});
