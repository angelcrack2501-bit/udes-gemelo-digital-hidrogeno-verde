# Arquitectura y decisiones técnicas — HYDRO-TWIN UDES

## 1. Punto de partida (análisis forense, 2026-10-16)

| Elemento | Hallazgo verificado |
|---|---|
| Carpeta de trabajo de la sesión | `Desktop\HIDRO-TWIN UDES` — **vacía**, sin Git. |
| Repositorio conocido | `Desktop\Construction-Intelligence-Digital-Twin` (rama `master`, 9 commits, último `346c7aa chore: ignore logs`). Cambios sin confirmar del usuario: `public/models/gemelo_digital_demo.glb`, `src/components/UnitInteriorView.tsx`, carpeta `public/renders/` sin seguimiento. |
| Pila real | Next.js 16.3.5 (Turbopack), React 19.2.8, Tailwind 4, Prisma 5.22 + SQLite, three 0.186, @react-three/fiber 9.7, drei 10.7, Vitest 5, zod 4. |
| Línea base del repositorio previo | `tsc --noEmit` ✔ (0 errores) · `eslint` ✔ (0 problemas) · `vitest run` ✔ **297/297 pruebas, 44 archivos**. No se ejecutó `next build` allí para no tocar su `.next`. |
| Trabajo previo de hidrógeno | `src/lib/world-engine/domains/hydrogen-plant.ts` (+ pruebas) y `src/app/world-studio/*`: 5 entidades (electrolizador, compresor, tanque 350 bar, PSV, celda), dinámica en «kg/paso» con constantes de ajuste pedagógico explícitamente no físicas, acoplada al World Engine + Prisma del PoC de construcción. |
| Referencias de la planta UDES | **Ninguna** en Escritorio, Documentos, Descargas, Videos o Imágenes (búsqueda por nombres: hidro, hydro, udes, electroli, h2, planta, verde, axon). |
| Hardware | Windows 11, AMD Ryzen 5 5600H, NVIDIA GTX 1650 4 GB + Radeon integrada, **≈7,3 GB de RAM** visibles (no «abundante»). |

### Decisión: aplicación dedicada en la carpeta de la sesión

Se construyó HYDRO-TWIN UDES en `Desktop\HIDRO-TWIN UDES` (la carpeta que el usuario creó y abrió para esta sesión) **con la misma pila verificada** del repositorio previo, en lugar de modificar `Construction-Intelligence-Digital-Twin`. Razones:

1. El repositorio previo es un PoC de construcción (torres, apartamentos, presupuesto) con cambios del usuario sin confirmar; modificarlo arriesgaba ese trabajo.
2. El dominio de hidrógeno existente está acoplado al World Engine y a Prisma, y usa unidades «por paso» sin significado físico. El encargo exige ecuaciones con unidades y supuestos declarados.
3. Se **reutilizaron conceptos y patrones** que funcionaban, no código copiado: separación «hechos observados vs. explicación» de la guía, estados visuales por equipo calculados desde el estado simulado, renderizado procedural con R3F/drei, convenciones de pruebas con Vitest.

El repositorio previo **no fue modificado**.

## 2. Arquitectura

```
                   ┌─────────────────────────── Interfaz (React, Tailwind) ───────────────────────────┐
                   │ Resumen · Estudio 3D · Explorador · Laboratorio · Entrenamiento · Guía ·          │
                   │ Historial · Documentación · Inspector · Dock (gráficas, eventos, comparación)     │
                   └───────────────▲───────────────────────────────▲────────────────────────▲─────────┘
                                   │ estado compartido              │                        │
                         ┌─────────┴──────────┐           ┌─────────┴─────────┐    ┌─────────┴────────┐
                         │ state/store.tsx    │           │ scene/ (R3F)      │    │ guide/engine.ts  │
                         │ selección, corridas│──────────▶│ layout conceptual │    │ reglas → hechos  │
                         │ reproducción, misión│          │ modelos, tuberías │    │ + explicación    │
                         └─────────┬──────────┘           └─────────▲─────────┘    └─────────▲────────┘
                                   │ simulate(escenario, entradas)  │ state-map.ts           │
                         ┌─────────▼──────────────────────────────────────────────────────────┴───────┐
                         │ sim/: engine.ts (función pura) · electrochem.ts · rules.ts · scenarios.ts  │
                         │       compare.ts · state-map.ts · model-docs.ts                            │
                         └─────────▲──────────────────────────────────────────────────────────────────┘
                                   │
                         ┌─────────┴──────────────────────────────────────────────┐   ┌───────────────┐
                         │ domain/: types.ts · parameters.ts (única fuente) ·      │   │ training/     │
                         │          plant.ts · topology.ts (zod + grafo)           │   │ mission.ts    │
                         └─────────────────────────────────────────────────────────┘   └───────────────┘
```

### Contratos clave

| Módulo | Contrato |
|---|---|
| `domain/parameters.ts` | Cada constante tiene valor, unidad, procedencia (`literature`/`illustrative`/…) y fuente. Simulación, inspector, guía y documentación leen de aquí: no hay números duplicados en la UI. |
| `domain/plant.ts` | Equipos con etiqueta ISA-5.1 estable, tipo, etapa, función, especificaciones con procedencia y `verifiedInUdes: false`. Conexiones explícitas con etiqueta de línea y fluido. |
| `domain/topology.ts` | `validatePlant` (esquema zod, unicidad, integridad referencial, compatibilidad de fluidos por `PORT_RULES`), `upstreamOf/downstreamOf`, `reachableFrom`, `influencePath` (BFS). |
| `sim/engine.ts` | `simulate(id, entradas) → SimulationResult` **puro y determinista**: muestras cada 10 s, eventos con regla/umbral/severidad/respuesta/resultado, KPI integrados por paso. |
| `sim/state-map.ts` | Única traducción muestra → estado visual de equipos y conexiones; la usan la escena, el explorador y el inspector. |
| `state/store.tsx` | Reducer único. Persiste solo **entradas** de corridas en `localStorage`; al recargar, re-simula (prueba viva del determinismo). |

## 3. Decisiones técnicas

| Decisión | Motivo | Alternativa descartada |
|---|---|---|
| Next.js 16 + R3F (misma pila) | Pila ya verificada en la máquina; sin riesgo de compatibilidad. | Reescribir en otro motor 3D. |
| Sin base de datos | Nada requiere persistencia multiusuario; las corridas se reproducen desde sus entradas. | Prisma/SQLite: migraciones sin beneficio para la demo. |
| Geometría procedural | Sin modelos de la planta UDES; evita presentar un activo descargado como «la planta». Controla el presupuesto de polígonos. | Buscar/descargar modelos GLB genéricos. |
| Entorno de iluminación con `Lightformer` | Reflejos sin descargar HDRI (los *presets* de drei usan CDN): funciona sin conexión. | `Environment preset=…`. |
| Gráficas SVG propias | ~150 líneas, sin dependencia, manejan unidades, umbrales, cursor, marcadores y estado vacío. | Recharts/Chart.js (nueva dependencia). |
| Guía determinista | No hay proveedor de LLM configurado; el encargo prohíbe simular un LLM. Respuestas trazables y probadas. | Integración LLM no verificable. |
| Euler explícito, Δt = 2 s | Estable para las constantes de tiempo del modelo (térmica ≈ 130 s, recinto ≈ 600 s); 1 800 pasos por hora simulada (< 5 ms). | Integradores adaptativos (complejidad sin beneficio). |
| Disparos con enclavamiento y rearme condicionado | Refleja la práctica de seguridad funcional a nivel conceptual: despejar una alarma ≠ rearmar. | Disparos que se autorearman. |
| PLC actúa sobre la variable **medida**; PSV sobre la **real** | Permite el escenario pedagógico de falla de instrumentación (capas de protección independientes). | Una sola presión. |
| Pruebas E2E con `@playwright/test` (`e2e/demo.e2e.ts`) | El recorrido de demostración de 13 pasos se verificaba a mano; ahora se repite con `npm run e2e` antes de cada presentación. Playwright arranca la compilación de producción (`npm run build && npm start`), maneja WebGL real (las etiquetas 3D de drei son DOM), espera solo lo necesario (*auto-waiting*), permite usar el Edge instalado (`PW_CHANNEL=msedge`) si no se pueden descargar navegadores, y deja traza y captura cuando algo falla. Archivos `*.e2e.ts` para que Vitest no los recoja. | Cypress (iframe propio, WebGL e hidratación más frágiles, dependencia más pesada); `@testing-library` + jsdom en Vitest (sin WebGL ni navegador real: no prueba la escena ni la persistencia al recargar). |

Dependencias nuevas respecto al repositorio previo: **ninguna** (se quitaron Prisma, date-fns y postprocessing; se añadió `@types/three` y se actualizó `@types/node` a ^24 para resolver un conflicto de *peer dependencies* con Vitest 5 sin usar `--legacy-peer-deps`). Después se añadió una sola dependencia de desarrollo, `@playwright/test`, para las pruebas E2E (no forma parte del paquete que se sirve).

## 4. Rendimiento (medido)

- Simulación: 60 min simulados = 1 800 pasos; la suite completa (≈25 corridas) se ejecuta en < 1 s.
- Renderizado medido en el panel del navegador integrado (Chromium, **GPU integrada AMD Radeon** vía ANGLE/D3D11, lienzo 824 × 442 px): **112,8 fps** promedio en 5 s, con animaciones de flujo activas. No se midió en la GTX 1650 ni a pantalla completa.
- Presupuesto: sombras 2048², `dpr` máx. 1,5, geometrías simples, partículas de flujo en `InstancedMesh` (una por conexión).
