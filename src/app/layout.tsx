import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { themeBootScript, themeCss } from "@/theme/tokens";
import "./globals.css";

// Tipografía institucional para todos los textos (Manual de Marca UDES).
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "HYDRO-TWIN UDES — Gemelo digital de hidrógeno verde",
  description:
    "Proyecto académico de la Universidad de Santander (UDES), Ingeniería de Inteligencia Artificial: representación 3D interactiva de una planta PEM conceptual, simulación determinista trazable, misiones de entrenamiento y guía basada en reglas. No conectado a planta; sin datos medidos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={openSans.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <style id="udes-theme" dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
