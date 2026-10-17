# HYDRO-TWIN UDES

**Entorno digital educativo de hidrógeno verde — Universidad de Santander (UDES)**

Aplicación de escritorio vía navegador que combina:

- una **escena 3D interactiva** de una planta de electrólisis PEM a escala de laboratorio (geometría procedural, conceptual);
- un **modelo semántico del proceso** (21 equipos, 23 conexiones tipadas, 9 instrumentos) con validación de topología;
- una **simulación determinista y trazable** (ley de Faraday, curva de polarización PEM, balance térmico, balance de masa del tanque, dilución en el recinto, lógica de alarmas/disparos y PSV);
- **6 escenarios documentados** (normal, cambio de entrada, desviación, falla de equipo, falla de instrumento, fuga hipotética) con intervención/recuperación;
- una **misión de entrenamiento** completa con rúbrica de 100 puntos calculada a partir de las corridas del estudiante;
- una **guía de ingeniería determinista** (basada en reglas, *no* es un LLM) que separa hechos del modelo y explicación;
- **historial** de corridas y eventos y **comparación** contra una línea base.

> **Alcance honesto.** No se dispuso de planos, hojas de datos, videos ni mediciones de la planta UDES. La configuración es **conceptual**, los parámetros son **ilustrativos** y todos los valores son **simulados**. La aplicación **no** está conectada a sensores ni controla equipos. En la escala de madurez es: representación visual ✔ · modelo de ingeniería interactivo ✔ · entorno operativo simulado ✔ · gemelo conectado a datos ✘ · gemelo industrial validado ✘.

## Requisitos

- Node.js ≥ 20 (verificado con Node 24.19, npm 11.17)
- Navegador con WebGL 2 (Edge/Chrome actuales)
- Sin base de datos, sin claves de API, sin conexión a internet en tiempo de ejecución (las fuentes se incorporan en la compilación).

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>. Para una demostración más fluida, usar la compilación de producción:

```bash
npm run build
npm start
```

Pantalla recomendada: ≥ 1366 × 768 (diseñada para 1600 × 900 o superior).

### Enlaces directos de demostración

| Enlace | Qué abre |
|---|---|
| `/?seccion=studio&sel=EL-101` | Estudio 3D con la pila PEM seleccionada |
| `/?seccion=lab&escenario=demand_loss&t=45&sel=TK-201` | ESC-03 en el minuto 45 con el tanque seleccionado |
| `/?seccion=lab&escenario=sensor_stuck&t=55&sel=PSV-201` | ESC-05: PT-201 congelado y PSV abierta |
| `/?seccion=training` | Misión M-01 |

## Verificación

```bash
npm run lint        # ESLint (configuración de Next.js)
npm run typecheck   # TypeScript estricto
npm test            # 43 pruebas (Vitest): electroquímica, motor, escenarios, topología, misión, guía
npm run build       # compilación de producción
npm run e2e         # recorrido de demostración en el navegador (Playwright, 8 pruebas)
```

`npm run e2e` compila y arranca la versión de producción en el puerto 3000 y recorre la demostración: carga con R-001, etiqueta 3D → inspector, árbol del explorador, ESC-03 con disparo PAHH ≈ 48,8 min, intervención en el minuto 25 («mejor» en presión máx.), misión M-01 con 100/100, la guía ante «¿Cuál es la presión real de la planta UDES ahora?» y determinismo al recargar. La primera vez: `npx playwright install chromium`. Sin descarga posible: `PW_CHANNEL=msedge npm run e2e`. Con el puerto 3000 ocupado: `E2E_PORT=3100 npm run e2e`. Informe HTML de fallos: `npx playwright show-report`.

## Recorrido de demostración (resumen)

1. **Resumen** → leer el alcance y la escala de madurez.
2. **Estudio 3D** → orbitar; clic en una etiqueta o en un equipo → inspector con función, variables simuladas, relaciones, especificaciones con procedencia.
3. **Explorador** → esquema de topología y *ruta de influencia* (p. ej. EL-101 → FC-401).
4. **Laboratorio** → ESC-03 → *Ejecutar* → ver alarma PAH y disparo PAHH en **Eventos**.
5. Marcar como línea base, activar la intervención (minuto 25) → *Ejecutar* → pestaña **Comparación**.
6. **Entrenamiento** → misión M-01 completa → evaluación por rúbrica.
7. **Guía** → «¿Por qué se disparó el evento?», «¿Qué cambió frente a la línea base?».

El guion completo para el profesor está en [`docs/GUION_DEMOSTRACION.md`](docs/GUION_DEMOSTRACION.md).

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Arquitectura, decisiones técnicas, mapa de módulos, relación con el repositorio previo |
| [`docs/LIMITACIONES_Y_VALIDACION.md`](docs/LIMITACIONES_Y_VALIDACION.md) | Modelo, supuestos, pruebas, limitaciones, procedencia de datos, trabajo futuro |
| [`docs/MATRIZ_INVESTIGACION.md`](docs/MATRIZ_INVESTIGACION.md) | Matriz de investigación con referencias verificadas |
| [`docs/GUION_DEMOSTRACION.md`](docs/GUION_DEMOSTRACION.md) | Guion de demostración paso a paso |
| En la aplicación → **Documentación** | Ecuaciones, parámetros con procedencia, escenarios, planta conceptual, referencias, limitaciones |

## Estructura

```
src/
  domain/     modelo semántico: tipos, parámetros (única fuente de verdad), planta, topología
  sim/        motor determinista, electroquímica, reglas de alarma, escenarios, comparación, mapa de estados
  training/   misión M-01 y rúbrica
  guide/      guía determinista basada en reglas
  state/      estado compartido de la sesión (selección, corridas, reproducción, misión)
  scene/      escena 3D (React Three Fiber): disposición conceptual, modelos procedurales
  components/ interfaz: paneles, inspector, gráficas SVG, dock de resultados, documentación
```
