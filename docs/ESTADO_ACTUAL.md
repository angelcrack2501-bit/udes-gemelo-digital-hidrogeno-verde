# Estado actual del proyecto — HYDRO-TWIN UDES

**Fecha de corte:** 16 de octubre de 2026 · **Rama:** `main`

Resumen para la presentación ante la UDES: qué funciona y está verificado, qué está parcial, cuáles son las limitaciones y qué sigue.

## Nivel de madurez

| Nivel | Estado |
|---|---|
| 1. Representación visual digital | ✅ Alcanzado |
| 2. Modelo de ingeniería interactivo | ✅ Alcanzado |
| 3. Entorno operativo simulado (determinista, educativo) | ✅ Alcanzado |
| 4. Gemelo digital conectado a datos de la planta | ❌ No alcanzado: no hay sensores ni datos medidos |
| 5. Gemelo digital industrial validado | ❌ No alcanzado: no hay calibración contra la planta real |

En rigor, hoy es un **entorno digital educativo con simulación trazable**, preparado para convertirse en gemelo digital cuando existan datos de la planta.

## 🟢 Completo y verificado

| Función | Cómo se verificó |
|---|---|
| Escena 3D interactiva: orbitar, encuadres, selección por etiqueta y por clic, inspector, capas, aislar, flujo animado | Recorrido manual en el navegador y prueba automática con Playwright |
| Modelo del proceso: 21 equipos, 23 conexiones tipadas, 9 instrumentos, validación de topología y rutas de influencia | 6 pruebas unitarias |
| Simulación determinista con 6 escenarios, eventos (regla, umbral, severidad, respuesta, resultado) y recuperación | 25 pruebas unitarias (física y motor), incluido el balance de masa y el determinismo |
| Comparación contra línea base e historial de corridas (se re-simulan idénticas al recargar) | Pruebas unitarias y prueba de recarga con Playwright |
| Misión M-01 con rúbrica de 100 puntos derivada de las corridas del estudiante | 6 pruebas unitarias y recorrido completo con Playwright (100/100) |
| Guía de ingeniería basada en reglas, que separa hechos del modelo y explicación, y no responde sobre la planta real | 6 pruebas unitarias y prueba con Playwright |
| Identidad visual UDES: Azul `#014C97`, Dorado `#CEA284`, Open Sans, modo claro y oscuro | Prueba automática de contraste WCAG en ambos modos (ver [`IDENTIDAD_VISUAL.md`](IDENTIDAD_VISUAL.md)) |
| Calidad del código | `lint` sin errores, `typecheck` sin errores, **48/48** pruebas unitarias, **8/8** pruebas del recorrido (Playwright), compilación de producción correcta |

Rendimiento medido: unos 113 cuadros por segundo en el navegador integrado con la GPU integrada AMD Radeon, en una ventana pequeña. No se midió en la GTX 1650 ni a pantalla completa.

## 🟡 Parcial

- **Modelo físico:** las ecuaciones son estándar y tienen unidades, pero los parámetros (tamaño de la pila, tanque, umbrales) son **ilustrativos**. Los resultados (≈ 48 kWh/kg, ≈ 81 % de eficiencia a nivel de pila) son plausibles pero **no están calibrados**.
- **Escenario de fuga:** usa un modelo de mezcla perfecta. No representa la acumulación del hidrógeno bajo el techo ni sustituye un estudio de dispersión (CFD).
- **Logo:** hay un espacio reservado. Falta el archivo oficial en `public/brand/logo-udes.svg` o `.png`.
- **Pantallas pequeñas:** la interfaz está pensada para 1366 × 768 o más; en ventanas estrechas se comprime. Las etiquetas 3D pueden superponerse en la vista general.
- **Historial:** se guarda en el navegador de cada computador; no se comparte entre equipos.
- **Dependencias:** `npm install` reporta avisos de seguridad en algunas librerías (entre ellas la versión instalada de Next.js). No afectan el uso local de la demostración, pero conviene actualizarlas con pruebas antes de publicarla en un servidor.

## ⚠️ Limitaciones importantes

1. **La planta es conceptual.** No se tuvo acceso a planos, P&ID, hojas de datos, fotos ni videos de la planta de la UDES. Ningún equipo está verificado contra la instalación real, y la interfaz lo indica con la etiqueta «No verificado en UDES».
2. **Los valores son ilustrativos.** Cada parámetro muestra su procedencia en la aplicación (Documentación → Parámetros): literatura, ilustrativo o conceptual. Ninguno es una medición.
3. **No hay conexión con la planta.** No lee sensores ni controla equipos, y no es un sistema de seguridad.
4. **Los escenarios de seguridad son educativos.** No son procedimientos de emergencia reales.
5. **La guía no es una IA generativa.** Es un sistema de reglas transparente; no hay un modelo de lenguaje integrado.

## Próximos pasos

| Prioridad | Paso | Qué se necesita |
|---|---|---|
| 1 | **Levantamiento de la planta UDES**: lista de equipos, P&ID, hojas de datos, fotos y video | Acceso a la planta y a su documentación técnica |
| 2 | **Reemplazar la configuración conceptual** por la real y marcar los equipos como verificados | Resultado del paso 1 |
| 3 | **Calibrar el modelo**: curva de polarización medida, ensayos térmicos, volumen real de almacenamiento | Mediciones del electrolizador |
| 4 | **Conectar datos** desde el PLC/SCADA de la planta y distinguir en la interfaz lo medido de lo simulado | Autorización y protocolo (OPC UA o Modbus) |
| 5 | **Validar**: error de predicción por variable y versiones del modelo | Datos históricos de operación |
| 6 | **Evaluar el impacto educativo** con estudiantes (prueba antes y después) | Grupo piloto y aval del docente |
| 7 | Extensiones: IA generativa con fuentes controladas, realidad virtual (WebXR) y física avanzada | Tras validar el modelo |

## Documentos relacionados

- [`GUION_DEMOSTRACION.md`](GUION_DEMOSTRACION.md): guion de demostración para el profesor.
- [`ARQUITECTURA.md`](ARQUITECTURA.md): arquitectura y decisiones técnicas.
- [`LIMITACIONES_Y_VALIDACION.md`](LIMITACIONES_Y_VALIDACION.md): modelo, supuestos, pruebas y trabajo futuro.
- [`MATRIZ_INVESTIGACION.md`](MATRIZ_INVESTIGACION.md): referencias verificadas.
- [`IDENTIDAD_VISUAL.md`](IDENTIDAD_VISUAL.md): Manual de Marca aplicado y contraste.
