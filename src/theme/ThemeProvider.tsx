"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEMES, THEME_STORAGE_KEY, type ThemeName, type ThemeTokens } from "./tokens";

interface ThemeCtx {
  theme: ThemeName;
  tokens: ThemeTokens;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", tokens: THEMES.dark, toggle: () => undefined });

/** El tema vive en <html data-theme>, fijado antes del primer pintado por el script de arranque. */
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getSnapshot = (): ThemeName => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerSnapshot = (): ThemeName => "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: ThemeName = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* sin almacenamiento: el cambio dura solo esta sesión */
    }
  }, []);

  const value = useMemo(() => ({ theme, tokens: THEMES[theme], toggle }), [theme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
