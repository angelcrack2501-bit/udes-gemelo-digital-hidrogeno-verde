import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo del recorrido de demostración.
 *
 * Se ejecutan contra la compilación de producción (`npm run build && npm start`),
 * la misma que se usa en la presentación. Por defecto usan el Chromium que
 * descarga `npx playwright install chromium`; si no se puede descargar,
 * `PW_CHANNEL=msedge npm run e2e` usa el Microsoft Edge instalado en Windows.
 *
 * Nunca reutiliza un servidor ya abierto (podría ser `next dev` o una versión
 * vieja): si el puerto 3000 está ocupado, ciérrelo o use `E2E_PORT=3100`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  // *.e2e.ts (no *.spec.ts) para que Vitest no intente ejecutarlas.
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-CO",
    viewport: { width: 1600, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: channel ?? "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1600, height: 1000 },
        ...(channel ? { channel } : {}),
        // Sin GPU, Chromium sin interfaz dibuja la escena WebGL por software y
        // cada clic tarda segundos; estas opciones usan la GPU real si existe.
        launchOptions: { args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=d3d11"] },
      },
    },
  ],
  webServer: {
    command: `npm run build && npm start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
