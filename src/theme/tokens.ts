/**
 * Tokens de color de HYDRO-TWIN UDES — ÚNICA fuente de verdad del tema.
 *
 * Identidad institucional (Manual de Marca UDES):
 *   - Azul UDES   #014C97 → color principal (botones, selección, acentos).
 *   - Dorado UDES #CEA284 → acentos puntuales (franja de marca, indicador activo).
 *   - Nunca más de dos colores institucionales por pieza: solo se usan estos dos.
 *   - Tipografía: Open Sans (ver src/app/layout.tsx). Aachen BT es exclusiva del logo.
 *
 * `brandInk` es un tono del Azul UDES (aclarado en modo oscuro) usado SOLO
 * para texto e iconos sobre fondos oscuros, donde #014C97 no alcanza el
 * contraste mínimo WCAG AA. Los rellenos de marca siempre usan #014C97.
 *
 * Los colores funcionales (ok/warn/crit/fault) son de seguridad y se
 * conservan (verde, ámbar, rojo); se usan solo para estados, nunca como
 * decoración, para que no compitan con la marca.
 *
 * Para cambiar un color: edítelo aquí. `themeCss()` genera las variables CSS
 * (inyectadas en src/app/layout.tsx) y `tokens.test.ts` verifica el contraste.
 */

export const BRAND = {
  azul: "#014C97",
  dorado: "#CEA284",
} as const;

export type ThemeName = "dark" | "light";

export interface ThemeTokens {
  bg: string;
  bg2: string;
  panel: string;
  panel2: string;
  panel3: string;
  line: string;
  line2: string;
  text: string;
  text2: string;
  text3: string;
  /** Relleno de marca (botones primarios, barras de progreso). Siempre Azul UDES. */
  brand: string;
  /** Texto sobre `brand`. */
  onBrand: string;
  /** Texto/iconos de acento sobre fondos del tema. */
  brandInk: string;
  /** Fondo de elementos seleccionados/activos. */
  brandSoft: string;
  /** Borde de elementos seleccionados. */
  brandLine: string;
  /** Dorado UDES: solo decorativo (franjas, indicador activo). */
  gold: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  crit: string;
  critSoft: string;
  fault: string;
  idle: string;
  /** Etiqueta funcional "dato simulado" (no institucional). */
  sim: string;
  simSoft: string;
  sceneBg: string;
  sceneGround: string;
  sceneSlab: string;
  sceneFloor: string;
  sceneWall: string;
  sceneSteel: string;
  labelBg: string;
  labelText: string;
  glass: string;
  chartGrid: string;
  chartAxis: string;
  chartCursor: string;
  /** Series de gráficas: 1 = marca, 2 = neutra, 3–5 = funcionales/distinguibles. */
  series1: string;
  series2: string;
  series3: string;
  series4: string;
  series5: string;
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  dark: {
    bg: "#07101d",
    bg2: "#0a1626",
    panel: "#0d1a2c",
    panel2: "#112238",
    panel3: "#172c47",
    line: "#1e3350",
    line2: "#2c4669",
    text: "#e8eef6",
    text2: "#b6c4d6",
    text3: "#8fa1b8",
    brand: BRAND.azul,
    onBrand: "#ffffff",
    brandInk: "#8dbdf0",
    brandSoft: "#0f2f55",
    brandLine: "#4a88cc",
    gold: BRAND.dorado,
    ok: "#4ade80",
    okSoft: "#0d2a1c",
    warn: "#fbbf24",
    warnSoft: "#2a2010",
    crit: "#f87171",
    critSoft: "#2c1214",
    fault: "#fb923c",
    idle: "#94a3b8",
    sim: "#c4b5fd",
    simSoft: "#1c1833",
    sceneBg: "#0b1522",
    sceneGround: "#1c2735",
    sceneSlab: "#343e4a",
    sceneFloor: "#46525e",
    sceneWall: "#56616c",
    sceneSteel: "#2f3a46",
    labelBg: "rgba(8, 16, 28, 0.86)",
    labelText: "#e8eef6",
    glass: "rgba(13, 26, 44, 0.92)",
    chartGrid: "#1a2c45",
    chartAxis: "#2c4669",
    chartCursor: "#e8eef6",
    series1: "#8dbdf0",
    series2: "#e8eef6",
    series3: "#4ade80",
    series4: "#fb923c",
    series5: "#CEA284",
  },
  light: {
    bg: "#eef2f7",
    bg2: "#e4eaf2",
    panel: "#ffffff",
    panel2: "#f5f8fb",
    panel3: "#e9eff6",
    line: "#d4dde8",
    line2: "#b3c2d4",
    text: "#0f1b2b",
    text2: "#34465c",
    text3: "#526379",
    brand: BRAND.azul,
    onBrand: "#ffffff",
    brandInk: BRAND.azul,
    brandSoft: "#e3edf8",
    brandLine: "#4f86c6",
    gold: BRAND.dorado,
    ok: "#15803d",
    okSoft: "#e8f5ec",
    warn: "#b45309",
    warnSoft: "#fdf3e5",
    crit: "#b91c1c",
    critSoft: "#fdecec",
    fault: "#c2410c",
    idle: "#64748b",
    sim: "#6d28d9",
    simSoft: "#f1ebfd",
    sceneBg: "#d9e2ec",
    sceneGround: "#c3ccd6",
    sceneSlab: "#aab4bf",
    sceneFloor: "#8e9aa7",
    sceneWall: "#9aa5b1",
    sceneSteel: "#4b5866",
    labelBg: "rgba(255, 255, 255, 0.94)",
    labelText: "#0f1b2b",
    glass: "rgba(255, 255, 255, 0.94)",
    chartGrid: "#e3e9f0",
    chartAxis: "#b3c2d4",
    chartCursor: "#0f1b2b",
    series1: BRAND.azul,
    series2: "#334155",
    series3: "#15803d",
    series4: "#c2410c",
    series5: "#8a6040",
  },
};

const kebab = (k: string) => k.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`).replace(/-(\d)/, "$1");

/** Nombre de la variable CSS de un token (p. ej. brandInk → --brand-ink, series1 → --series1). */
export const cssVar = (k: keyof ThemeTokens) => `--${kebab(k)}`;

/** Hoja de estilo con las variables de ambos temas (modo oscuro por defecto). */
export function themeCss(): string {
  const block = (t: ThemeTokens) => (Object.keys(t) as (keyof ThemeTokens)[]).map((k) => `${cssVar(k)}:${t[k]};`).join("");
  return [
    `:root{--udes-azul:${BRAND.azul};--udes-dorado:${BRAND.dorado};${block(THEMES.dark)}color-scheme:dark;}`,
    `:root[data-theme="light"]{${block(THEMES.light)}color-scheme:light;}`,
  ].join("\n");
}

/** Script que fija el tema antes del primer pintado (evita parpadeo). */
export const THEME_STORAGE_KEY = "hydro-twin-udes/theme";
export const themeBootScript = `try{var q=new URLSearchParams(location.search).get("tema");var t=q==="claro"?"light":q==="oscuro"?"dark":localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

// ---------- Contraste WCAG 2.x ----------

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Pares texto/fondo que la interfaz usa realmente, con el mínimo exigido. */
export const CONTRAST_PAIRS: { fg: keyof ThemeTokens; bg: keyof ThemeTokens; min: number; uso: string }[] = [
  { fg: "text", bg: "bg", min: 7, uso: "Texto principal sobre fondo" },
  { fg: "text", bg: "panel", min: 7, uso: "Texto principal sobre panel" },
  { fg: "text2", bg: "panel", min: 4.5, uso: "Texto secundario sobre panel" },
  { fg: "text2", bg: "panel2", min: 4.5, uso: "Texto secundario sobre tarjeta" },
  { fg: "text3", bg: "panel", min: 4.5, uso: "Texto terciario / etiquetas pequeñas" },
  { fg: "text3", bg: "panel2", min: 4.5, uso: "Texto terciario sobre tarjeta" },
  { fg: "onBrand", bg: "brand", min: 4.5, uso: "Texto de botón primario (Azul UDES)" },
  { fg: "brandInk", bg: "panel", min: 4.5, uso: "Acento de marca (etiquetas, enlaces)" },
  { fg: "brandInk", bg: "brandSoft", min: 4.5, uso: "Elemento activo / seleccionado" },
  { fg: "ok", bg: "panel", min: 4.5, uso: "Estado nominal" },
  { fg: "warn", bg: "panel", min: 4.5, uso: "Advertencia" },
  { fg: "crit", bg: "panel", min: 4.5, uso: "Crítico / disparo" },
  { fg: "sim", bg: "simSoft", min: 4.5, uso: "Etiqueta «Simulado»" },
  { fg: "warn", bg: "warnSoft", min: 4.5, uso: "Aviso de alcance" },
  { fg: "crit", bg: "critSoft", min: 4.5, uso: "Etiqueta «Sin conexión a planta»" },
  { fg: "labelText", bg: "sceneBg", min: 4.5, uso: "Etiquetas 3D (sobre fondo de escena)" },
];
