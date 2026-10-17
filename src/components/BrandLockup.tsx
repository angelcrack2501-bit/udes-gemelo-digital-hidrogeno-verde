"use client";

import { useEffect, useState } from "react";

/**
 * Bloque institucional UDES. El logo NO se recrea: se carga el archivo
 * oficial desde /public/brand/ (logo-udes.svg o logo-udes.png). Mientras no
 * exista, se muestra un espacio reservado claramente identificado.
 */
const SOURCES = ["/brand/logo-udes.svg", "/brand/logo-udes.png"];

export default function BrandLockup() {
  const [logo, setLogo] = useState<string | null>(null);

  // Se comprueba la existencia del archivo antes de pintarlo, para no mostrar nunca una imagen rota.
  useEffect(() => {
    let cancelled = false;
    const probe = (i: number) => {
      if (i >= SOURCES.length) return;
      const img = new Image();
      img.onload = () => { if (!cancelled) setLogo(SOURCES[i]); };
      img.onerror = () => probe(i + 1);
      img.src = SOURCES[i];
    };
    probe(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="brand-lockup" aria-label="Universidad de Santander — Vigilada Mineducación">
      {logo ? (
        <div className="logo-slot">
          {/* eslint-disable-next-line @next/next/no-img-element -- archivo oficial opcional servido desde /public/brand */}
          <img src={logo} alt="Logo oficial de la Universidad de Santander (UDES)" />
        </div>
      ) : (
        <div className="logo-slot is-empty" title="Coloque el logo oficial en /public/brand/logo-udes.svg o logo-udes.png" data-testid="logo-placeholder">
          LOGO
          <br />
          UDES
        </div>
      )}
      <div className="whitespace-nowrap">
        <div className="uni-name">Universidad de Santander</div>
        <div className="vigilada">VIGILADA MINEDUCACIÓN</div>
      </div>
    </div>
  );
}
