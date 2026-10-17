import { describe, expect, it } from "vitest";
import { BRAND, CONTRAST_PAIRS, THEMES, contrastRatio, cssVar, themeCss } from "./tokens";

describe("identidad visual UDES", () => {
  it("usa los colores institucionales del Manual de Marca", () => {
    expect(BRAND.azul).toBe("#014C97");
    expect(BRAND.dorado).toBe("#CEA284");
    for (const t of Object.values(THEMES)) {
      expect(t.brand).toBe(BRAND.azul);
      expect(t.gold).toBe(BRAND.dorado);
    }
  });

  it("calcula el contraste WCAG correctamente (blanco/negro = 21:1)", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#014C97", "#ffffff")).toBeGreaterThan(8);
  });

  for (const name of ["dark", "light"] as const) {
    it(`modo ${name === "dark" ? "oscuro" : "claro"}: todos los pares texto/fondo cumplen el mínimo`, () => {
      const t = THEMES[name];
      const failures = CONTRAST_PAIRS.filter((p) => {
        const bg = t[p.bg].startsWith("rgba") ? (name === "dark" ? t.bg : t.panel) : t[p.bg];
        return contrastRatio(t[p.fg], bg) < p.min;
      }).map((p) => `${p.uso}: ${contrastRatio(t[p.fg], t[p.bg]).toFixed(2)} < ${p.min}`);
      expect(failures).toEqual([]);
    });
  }

  it("genera variables CSS para ambos temas", () => {
    const css = themeCss();
    expect(cssVar("brandInk")).toBe("--brand-ink");
    expect(cssVar("series1")).toBe("--series1");
    expect(css).toContain("--brand:#014C97;");
    expect(css).toContain(':root[data-theme="light"]');
  });
});
