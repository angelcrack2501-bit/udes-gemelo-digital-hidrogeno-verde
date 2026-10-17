# Guion de demostración — HYDRO-TWIN UDES (≈ 15 minutos)

**Preparación (antes de la reunión)**

```bash
npm run build && npm start
```

Abrir `http://localhost:3000` a pantalla completa (F11). Para empezar limpio: **Historial → Limpiar sesión**.

---

### 1. Qué es y qué no es (1 min) — *Resumen*

- Leer el recuadro **Alcance honesto** y la **escala de madurez**: niveles 1–3 alcanzados, 4–5 no.
- Mensaje clave: *«Es un entorno educativo con simulación trazable; no está conectado a la planta y no usa mediciones. Está preparado para incorporarlas.»*
- Señalar las etiquetas permanentes de la barra superior: *Planta conceptual · Simulación determinista · Sin conexión a planta*.

### 2. La planta en 3D (2 min) — *Estudio 3D*

- **Vista general** → recorrer el proceso de izquierda a derecha: FV → fuente DC → pila PEM → separadores → secador → tanque → celda de combustible; servicios de agua y enfriamiento.
- Activar **Zonas** e **Instrumentos**; mostrar la figura de referencia de 1,75 m (escala de laboratorio).
- Clic en **EL-101** → inspector: función, variables *simuladas*, relaciones, especificaciones con procedencia, «No verificado en UDES».
- **Aislar** → solo EL-101 y sus conexiones.

### 3. Relaciones de proceso (1 min) — *Explorador*

- Seleccionar **EL-101**; en *Ruta de influencia* elegir **FC-401** → 5 conexiones explícitas (H2-101 … H2-401).
- Mensaje: *«Las relaciones son un grafo tipado y validado, no la proximidad de las mallas.»*

### 4. Simulación de una desviación (3 min) — *Laboratorio*

- **ESC-03 Pérdida de demanda** → leer definición, comportamiento esperado, ecuaciones y supuestos.
- **Ejecutar simulación**. En el dock: gráfica de presión con PAH (30 bar) y PAHH (32 bar); pestaña **Eventos**: E01 cierre de XV-202 (min 10) → E02 PAH (min ≈ 42) → E03 disparo PAHH (min ≈ 48,8), cada uno con regla, umbral, severidad, respuesta esperada y resultado.
- **Reproducir** → ver en 3D cómo el tanque pasa a advertencia y crítico, y cómo la pila se detiene (baliza roja, flujo detenido).

### 5. Decisión y comparación (2 min)

- **Usar como línea base** → activar **intervención** en el minuto 25 → **Ejecutar**.
- Pestaña **Comparación**: sin disparo, presión máx. 26,7 bar vs 32,0 bar, más H2 y disponibilidad del 100 %; la tabla explica qué entradas cambiaron.
- Mencionar el determinismo: *«Recargue la página: las corridas se re-simulan desde sus entradas y dan exactamente lo mismo.»*

### 6. Falla de instrumentación (1,5 min)

- **ESC-05 PT-201 congelado** → Ejecutar → gráfica *Real (modelo)* vs *PT-201 (medida)* divergen; no hay PAH/PAHH; **PSV-201 abre a 35 bar** y ventea H2.
- Mensaje: capas de protección independientes; el PLC actúa sobre lo **medido**, la PSV sobre lo **real**.

### 7. Misión de entrenamiento (3 min) — *Entrenamiento*

- M-01: contexto → inspección guiada (seleccionar EL-101, TK-201, PSV-201, XV-202 en la escena) → línea base → desviación → **decisión** (probar primero «bajar la potencia a 1 kW»: evita el disparo pero produce solo ~31 %, y la rúbrica lo penaliza; luego reabrir XV-202 en el minuto 20) → interpretación → **evaluación** por rúbrica de 100 puntos con retroalimentación que cita los valores calculados.

### 8. Guía de ingeniería (1 min) — *Guía*

- «¿Por qué se disparó el evento?» → hechos del modelo con su fuente + explicación + ecuación.
- Escribir «¿Cuál es la presión real de la planta UDES ahora?» → la guía declara que no conoce la planta real.
- Mensaje: *«Es una guía basada en reglas y lo dice; no es un LLM.»*

### 9. Cierre (0,5 min) — *Documentación*

- Pestañas **Parámetros** (procedencia de cada valor), **Referencias** (estado de verificación) y **Limitaciones**, con la ruta hacia un gemelo digital: levantamiento de la planta → calibración → datos → validación.

---

**Preguntas probables**

| Pregunta | Respuesta corta |
|---|---|
| ¿Los números son de la planta UDES? | No. Son simulados con parámetros ilustrativos; cada parámetro muestra su procedencia. |
| ¿Por qué 48 kWh/kg? | Es el consumo a nivel de pila (sin auxiliares) con V_celda ≈ 1,79 V; un sistema completo consume más. |
| ¿Se puede conectar a la planta? | La arquitectura separa modelo, estado y procedencia; falta levantamiento, adquisición de datos y validación (ver `LIMITACIONES_Y_VALIDACION.md` §7). |
| ¿Qué tan fiable es el escenario de fuga? | Solo orientativo: mezcla perfecta, sin estratificación; no sustituye CFD ni una clasificación de áreas. |
