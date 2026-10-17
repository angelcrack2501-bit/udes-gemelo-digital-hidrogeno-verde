# Limitaciones y validación — HYDRO-TWIN UDES

## 1. Clasificación honesta del sistema

| Nivel | Estado | Evidencia |
|---|---|---|
| Representación visual digital | ✔ | Escena 3D procedural (`src/scene/`). |
| Modelo de ingeniería interactivo | ✔ | Grafo tipado validado (`src/domain/topology.ts`, `topology.test.ts`). |
| Entorno operativo simulado | ✔ (determinista, educativo) | `src/sim/engine.ts`, 18 pruebas del motor. |
| Gemelo digital conectado a datos | ✘ | No hay sensores, PLC/SCADA ni ingesta de datos. |
| Gemelo digital industrial validado | ✘ | No hay calibración ni comparación con mediciones de la planta. |

La aplicación **no controla equipos físicos**, no es un sistema instrumentado de seguridad y sus escenarios de seguridad son **hipotéticos y educativos**; no constituyen procedimientos de emergencia.

## 2. Procedencia de los datos

| Tipo | Ejemplos | Etiqueta en la UI |
|---|---|---|
| Constantes físicas | F, R, masas molares, PCS/PCI, V_tn, LIE = 4 % vol | `Literatura` |
| Correlaciones de modelo | E_rev(T), σ(T, λ) de Springer, estructura de polarización | `Literatura` (ver matriz: solo metadatos verificados para algunas) |
| Dimensionamiento y umbrales | 20 celdas × 100 cm², tanque 50 L, PSV 35 bar, alarmas, C_th, UA | `Ilustrativo` |
| Configuración de planta y geometría | equipos, conexiones, disposición 3D | `Conceptual` · «No verificado en UDES» |
| Mediciones de la planta UDES | — | **No existen en esta versión** |

Todos los valores de variables mostrados llevan la etiqueta **Simulado**.

## 3. Modelo y supuestos

Ecuaciones completas con unidades, rango de validez y limitaciones: aplicación → **Documentación → Modelo y ecuaciones** (fuente: `src/sim/model-docs.ts`). Resumen:

| Submodelo | Supuestos principales |
|---|---|
| Electroquímica | Cuasi-estacionaria; sin sobrepotencial de transporte de masa; j₀ constante; sin término de Nernst por presión; η_F = 0,98 constante. |
| Térmico | Una temperatura concentrada (pila + lazo); control proporcional de HX-101; sin dinámica del chiller. |
| Tanque | Gas ideal isotérmico a 25 °C (Z ≈ 1,02 a 30 bar → error ≈ 2 %); secador ideal. |
| PSV | Apertura instantánea a 35 bar, recierre a 33 bar, capacidad constante (sin dimensionamiento API 520). |
| Recinto | Mezcla perfecta; **no** representa la estratificación del H2 ni sustituye un análisis CFD (la ref. NLR modela dispersión exterior estacionaria, otro régimen). |
| PV | Perfil seno diurno + nube fija; no usa irradiancia de Bucaramanga. |
| Eficiencia | A nivel de pila; no incluye consumos auxiliares (balance de planta). |

Resultados nominales (ESC-01, 3,5 kW): I ≈ 98 A, V_celda ≈ 1,79 V, 0,072 kg/h (0,80 Nm³/h), η_PCS ≈ 81 %, CEE ≈ 48,4 kWh/kg **a nivel de pila**. Son coherentes con el orden de magnitud de pilas PEM, pero **no están calibrados** contra ningún equipo real.

## 4. Pruebas automatizadas (Vitest) — 43 pruebas, 5 archivos

| Archivo | Qué valida |
|---|---|
| `src/sim/electrochem.test.ts` (7) | E_rev(25 °C) = 1,229 V; conductividad de Springer; V a 1 A/cm² en 1,7–2,0 V; monotonía de la polarización; Faraday contra cálculo manual; inversión P(I); límite de corriente. |
| `src/sim/engine.test.ts` (18) | Determinismo (resultados idénticos en los 6 escenarios); muestreo; *clamping* de entradas; **balance de masa del tanque** (Δn = producido − consumido − venteado − fugado); agua estequiométrica ≈ 8,94 kg/kg; secuencias PAH→PAHH, TAH→TAHH, GD alarma→disparo; PSV no abre en ESC-03; PT-201 congelado → sin PAHH y apertura de PSV; recuperación y rearme; perfil FV. |
| `src/domain/topology.test.ts` (6) | Planta sin errores; detección de referencias rotas, fluidos incompatibles y duplicados; aguas arriba/abajo; rutas de influencia. |
| `src/training/mission.test.ts` (6) | Respuestas esperadas derivadas de las corridas; puntaje 100 con respuestas correctas; «apagar la pila» no obtiene puntaje de producción; tolerancias; `canAdvance` exige acciones reales. |
| `src/guide/engine.test.ts` (6) | Clasificación de intención; explicación del disparo con regla/umbral/causa; números citados provienen de la corrida; comparación con línea base; protección ante preguntas sobre la planta real. |

Comandos: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (todos en verde al cierre de esta versión).

## 5. Verificación en la aplicación (realizada)

Recorrido completo ejecutado en el navegador integrado con el servidor de desarrollo: selección por etiqueta y por *raycasting* 3D, inspector, explorador y ruta de influencia, ESC-03 con y sin intervención, tabla de eventos, comparación con línea base, misión M-01 completa (100/100 con respuestas correctas; un intento de «bajar potencia» fue correctamente penalizado), guía (eventos, cambios, pregunta sobre la planta real), recarga del navegador con re-simulación idéntica de 7 corridas. Capturas a 1600 × 900 con Edge sin interfaz.

Defectos encontrados y corregidos durante la verificación: desbordamiento horizontal de la rejilla en ventanas estrechas; efecto de React que devolvía una `Promise` (`scrollIntoView` en Chromium reciente) y derribaba la interfaz — corregido y aislado con un *error boundary* por panel; clasificación incorrecta de «presión real de la planta UDES ahora».

## 6. Limitaciones conocidas de la interfaz

- Diseñada para ≥ 1366 × 768; en ventanas más estrechas los paneles se comprimen.
- Las etiquetas 3D pueden superponerse en la vista general (las de equipos pequeños aparecen al acercarse, al pasar el cursor o al seleccionar).
- El historial vive en el `localStorage` del navegador (por equipo y navegador; no compartido).
- No hay autenticación ni gestión de cursos (fuera del alcance).

## 7. Trabajo futuro para avanzar hacia un gemelo digital

1. **Levantamiento de la planta UDES**: inventario, P&ID, hojas de datos, fotos/video → reemplazar la configuración conceptual y marcar equipos como verificados.
2. **Calibración**: curva de polarización medida (ajuste de j₀, R, η_F), ensayos térmicos (C_th, UA), volumen real del almacenamiento.
3. **Datos**: adquisición desde PLC/SCADA (OPC UA/Modbus) a una base de series de tiempo; distinguir en la UI medido / simulado / faltante (la arquitectura ya etiqueta la procedencia).
4. **Validación**: protocolo con error de predicción por variable y versionado del modelo.
5. **Física avanzada**: transporte de masa, degradación, compresión, dispersión CFD para el recinto real.
6. **XR**: la escena R3F puede llevarse a WebXR cuando el contenido esté validado.
7. **Evaluación educativa**: estudio pre/post con estudiantes antes de afirmar efectividad pedagógica.
