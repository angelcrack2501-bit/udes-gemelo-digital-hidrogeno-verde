/**
 * Recorrido de demostración automatizado (ver docs/GUION_DEMOSTRACION.md).
 *
 * Cada prueba parte de un navegador limpio (localStorage vacío), como la
 * primera visita del profesor. Las respuestas de la misión M-01 no están
 * escritas a mano: se leen de la interfaz (historial, inspector, eventos),
 * igual que lo haría un estudiante.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

/** Número con formato es-CO ("48,8" → 48.8). */
const num = (s: string) => {
  const m = s.match(/-?\d[\d.]*(,\d+)?/);
  if (!m) throw new Error(`Sin número en «${s}»`);
  return Number(m[0].replace(/\./g, "").replace(",", "."));
};

/** Mueve un <input type="range"> como lo haría el usuario (React escucha el evento input). */
async function setRange(input: Locator, value: number) {
  await input.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await expect(input).toHaveValue(String(value));
}

const dock = (page: Page) => page.getByRole("region", { name: "Resultados de simulación" });
const dockTab = (page: Page, name: RegExp) => dock(page).getByRole("button", { name });

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("topbar-status")).toBeVisible();
}

async function runEsc03(page: Page) {
  await page.getByTestId("nav-lab").click();
  await page.getByTestId("scenario-demand_loss").click();
  await page.getByTestId("run-scenario").click();
  await expect(page.getByTestId("run-summary")).toContainText("Resultado R-002");
}

/** Filas de la tabla de eventos como objetos {id, t, title, componentId}. */
async function readEvents(page: Page) {
  await dockTab(page, /^Eventos/).click();
  const rows = page.getByTestId("event-table").locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  return rows.evaluateAll((trs) =>
    trs.map((tr) => {
      const td = [...tr.querySelectorAll("td")].map((c) => c.textContent?.trim() ?? "");
      return { id: td[0], t: td[1], title: td[3], componentId: td[4] };
    }),
  );
}

async function readCompareRow(page: Page, label: string) {
  await dockTab(page, /^Comparación/).click();
  const row = page.getByTestId("compare-table").locator("tbody tr").filter({ hasText: label });
  await expect(row).toHaveCount(1);
  return (await row.locator("td").allTextContents()).map((s) => s.trim());
}

test.describe("Recorrido de demostración HYDRO-TWIN UDES", () => {
  test("1 · carga e hidrata la corrida de línea base R-001", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("topbar-status")).toContainText("R-001");
    await expect(page.getByTestId("topbar-status")).toContainText("ESC-01");
    await expect(page.getByTestId("overview-panel")).toBeVisible();
    await expect(page.getByTestId("plant-canvas")).toBeVisible();
  });

  test("2 · clic en una etiqueta 3D abre el inspector", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("nav-studio").click();
    const label = page.getByTestId("label-EL-101");
    await expect(label).toBeVisible();
    await label.click();
    await expect(page.getByRole("complementary", { name: "Inspector de EL-101" })).toBeVisible();
    await expect(page.getByTestId("inspector")).toContainText("No verificado en UDES");
  });

  test("3 · el árbol del explorador selecciona el equipo", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("nav-explorer").click();
    await page.getByTestId("tree-TK-201").click();
    await expect(page.getByRole("complementary", { name: "Inspector de TK-201" })).toBeVisible();
    await expect(page.getByTestId("label-TK-201")).toHaveClass(/is-selected/);
  });

  test("4 · ESC-03 dispara PAHH cerca del minuto 48,8", async ({ page }) => {
    await openApp(page);
    await runEsc03(page);
    const events = await readEvents(page);
    const trip = events.find((e) => e.title.startsWith("PAHH"));
    expect(trip, "evento de disparo PAHH").toBeDefined();
    expect(num(trip!.t)).toBeCloseTo(48.8, 0);
    const pah = events.find((e) => e.title.startsWith("PAH:"));
    expect(num(pah!.t)).toBeLessThan(num(trip!.t));
  });

  test("5 · la intervención en el minuto 25 elimina el disparo y la comparación lo muestra", async ({ page }) => {
    await openApp(page);
    await runEsc03(page);
    await page.getByRole("button", { name: "Usar como línea base" }).click();
    await page.getByTestId("input-intervention").check();
    await setRange(page.getByTestId("input-interventionAtMin"), 25);
    await page.getByTestId("run-scenario").click();
    await expect(page.getByTestId("run-summary")).toContainText("Resultado R-003");

    const events = await readEvents(page);
    expect(events.some((e) => e.title.startsWith("PAHH"))).toBe(false);

    const [, base, mod, , verdict] = await readCompareRow(page, "Presión real máx.");
    expect(verdict).toBe("mejor");
    expect(num(mod)).toBeLessThan(num(base));
    const trip = await readCompareRow(page, "Primer disparo");
    expect(trip[2]).toBe("—");
  });

  test("6 · misión M-01 completa con 100/100 usando respuestas leídas de la interfaz", async ({ page }) => {
    await openApp(page);
    const panel = page.getByTestId("training-panel");
    const next = page.getByTestId("mission-next");
    await page.getByTestId("nav-training").click();
    await next.click(); // Comenzar

    // Inspección guiada: seleccionar los cuatro equipos y leer quién protege TK-201.
    for (const id of ["EL-101", "TK-201", "PSV-201", "XV-202"]) {
      await panel.getByRole("button", { name: new RegExp(id) }).first().click();
      await expect(page.getByRole("complementary", { name: `Inspector de ${id}` })).toBeVisible();
      if (id === "PSV-201") await expect(page.getByTestId("inspector")).toContainText("Válvula de seguridad");
    }
    await expect(panel.getByText("inspeccionado")).toHaveCount(4);
    await page.getByTestId("q-q_protect-PSV-201").check();
    await next.click();

    // Línea base: producción media desde el historial; tendencia desde PT-201 al inicio y al final.
    await page.getByTestId("mission-run-baseline").click();
    const baselineId = (await panel.getByText(/Corrida R-\d+ lista/).textContent())!.match(/R-\d+/)![0];
    await page.getByTestId("nav-history").click();
    const card = page.getByTestId("history-panel").locator(".list-btn").filter({ hasText: `${baselineId}M-01 · línea base` });
    const h2Kg = num((await card.getByText(/ kg$/).textContent())!);
    const meanKgh = h2Kg / (60 / 60); // corrida de 60 min
    await page.getByTestId("nav-explorer").click();
    await page.getByTestId("tree-TK-201").click();
    const pt201 = page.getByTestId("inspector").locator("li").filter({ hasText: "PT-201" });
    const slider = dock(page).getByRole("slider", { name: "Posición en la corrida" });
    await slider.focus();
    await page.keyboard.press("Home");
    const p0 = num((await pt201.textContent())!.replace("PT-201", ""));
    await page.keyboard.press("End");
    const p1 = num((await pt201.textContent())!.replace("PT-201", ""));
    const trend = p1 - p0 > 0.5 ? "up" : p1 - p0 < -0.5 ? "down" : "flat";

    await page.getByTestId("nav-training").click();
    await page.getByTestId("q-q_baseline_h2").fill(meanKgh.toFixed(4).replace(".", ","));
    await page.getByTestId(`q-q_baseline_trend-${trend}`).check();
    await next.click();

    // Desviación: primer evento de protección y minuto del disparo desde la tabla de eventos.
    await page.getByTestId("mission-run-deviation").click();
    await expect(panel.getByText(/Corrida R-\d+ lista/)).toBeVisible();
    const events = await readEvents(page);
    const protective = events.find((e) => /^(PAHH?|TAHH?):|^PSV-201 abre/.test(e.title))!;
    const firstEvent = protective.title.startsWith("PSV") ? "PSV" : protective.title.split(":")[0];
    const trip = events.find((e) => e.title.startsWith("PAHH"))!;
    const psvOpened = events.some((e) => e.title.startsWith("PSV-201 abre"));
    await page.getByTestId(`q-q_first_event-${firstEvent}`).check();
    await page.getByTestId("q-q_trip_min").fill(trip.t.replace(" min", ""));
    await next.click();

    // Decisión: reabrir XV-202 en el minuto 20 con la potencia nominal.
    await page.getByTestId("mission-intervention").check();
    await setRange(page.getByTestId("mission-intervention-min"), 20);
    await page.getByTestId("mission-run-decision").click();
    await expect(panel.getByText("Sin disparos")).toBeVisible();
    await next.click();

    // Interpretación: la PSV no abrió porque el disparo PAHH actuó antes.
    expect(psvOpened).toBe(false);
    await page.getByTestId("q-q_psv_why-interlock").check();
    await page.getByTestId("q-q_layer-PSV-201").check();
    await next.click(); // Ver evaluación

    const summary = page.getByTestId("mission-summary");
    await expect(summary).toContainText("100/100");
    await expect(summary).toContainText("Excelente");
  });

  test("7 · la guía declara que no conoce la planta UDES real", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("nav-guide").click();
    await page.getByTestId("guide-input").fill("¿Cuál es la presión real de la planta UDES ahora?");
    await page.getByTestId("guide-input").press("Enter");
    const answer = page.getByTestId("guide-answer").last();
    await expect(answer).toContainText("Sobre la planta UDES real");
    await expect(answer).toContainText("no está conectada a ningún sensor");
    await expect(answer).toContainText("No puedo informar el estado actual de la planta real");
  });

  test("8 · recargar reproduce KPI idénticos (determinismo)", async ({ page }) => {
    await openApp(page);
    await runEsc03(page);
    await page.getByRole("button", { name: "Usar como línea base" }).click();
    await page.getByTestId("input-intervention").check();
    await setRange(page.getByTestId("input-interventionAtMin"), 25);
    await page.getByTestId("run-scenario").click();
    await expect(page.getByTestId("run-summary")).toContainText("Resultado R-003");

    await dockTab(page, /^Comparación/).click();
    const before = await page.getByTestId("compare-table").innerText();
    const summaryBefore = await page.getByTestId("run-summary").locator("dl").innerText();

    await page.reload();
    await expect(page.getByTestId("topbar-status")).toContainText("R-003");
    await dockTab(page, /^Comparación/).click();
    expect(await page.getByTestId("compare-table").innerText()).toBe(before);

    await page.getByTestId("nav-lab").click();
    await page.getByTestId("scenario-demand_loss").click();
    await expect(page.getByTestId("run-summary")).toContainText("Resultado R-003");
    expect(await page.getByTestId("run-summary").locator("dl").innerText()).toBe(summaryBefore);
  });
});
