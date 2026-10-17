# Matriz de investigación – HYDRO-TWIN UDES

**Propósito.** Verificar y resumir las referencias que respaldan el diseño de HYDRO-TWIN UDES (entorno educativo digital de hidrógeno verde por electrólisis PEM: escena 3D en navegador, simulación determinista simplificada, misiones de entrenamiento y guía basada en reglas). El demostrador **no está conectado a ninguna planta real y no usa datos medidos**.

**Fecha de verificación:** 2026-10-16.

**Método de acceso.** Metadatos vía API de Crossref, OpenAlex y Semantic Scholar; resúmenes vía OpenAlex y fragmentos de búsqueda web; textos completos descargados solo cuando eran de acceso libre (servidor de documentos del laboratorio nacional y repositorio institucional de TU Delft). ScienceDirect devolvió HTTP 403 a las peticiones automáticas, así que no se leyó ningún artículo en la web de Elsevier.

**Nota de honestidad.** En cada referencia se indica qué se leyó realmente. Cuando solo se tuvo el resumen, las afirmaciones se limitan a ese resumen y a los metadatos. Nada de lo que sigue implica que HYDRO-TWIN UDES alcance las capacidades descritas en estos trabajos.

---

## 1. Gemelo digital de dispersión de H2 en ARIES (NREL/NLR)

| Campo | Contenido |
|---|---|
| **Referencia y fecha** | Shah, M. P.; Peaslee, D.; Salahshoor, S.; Ali, R.; Hartmann, K.; Gifford, J.; Ma, Z.; Buttner, W. *Development of a Digital Twin for Hydrogen Dispersion and Safety Assessment in an Electrolyzer-Based Hydrogen Production Facility: Preprint*. Conference Paper NLR/CP-5700-94061, enero de 2026. National Laboratory of the Rockies (antes NREL) y GTI Energy. Presentado en la International Conference on Hydrogen Safety (ICHS), Seúl, 23-09-2025. URL citada: https://www.nrel.gov/docs/fy26osti/94061.pdf (el dominio `docs.nrel.gov` no resolvió por DNS; el PDF se obtuvo en `https://docs.nlr.gov/docs/fy26osti/94061.pdf`). |
| **Problema abordado** | Seguridad y ubicación de sensores en la instalación de producción de H2 con electrolizador PEM de 1,25 MW del banco de pruebas ARIES (campus Flatirons). Se trata de una instalación **al aire libre**, donde las fugas y venteos se dispersan según el viento. |
| **Metodología de modelado** | Proceso por etapas, del que solo están implementadas las dos primeras: (1) metadatos de la instalación (16 componentes, ubicaciones de liberación y fuga) y (2) dispersión en estado estacionario. CFD en ANSYS Fluent con RANS k-ω SST, flotabilidad completa y transporte de especies (H2, N2, O2), unos 3 millones de elementos y dominio octogonal cuyas caras cambian entre entrada y salida según la dirección del viento. Perfil de viento por ley de potencia ajustado con mediciones a 2, 5, 10, 20 y 50 m. El marco CFD se validó contra un caso transitorio de la literatura (Giannissi et al., 18 L/min en recinto cerrado). |
| **Requisitos de datos** | Un año de meteorología del sitio (2023, torre M2 del MIDC), que se condensó por estadística (prueba de Kolmogorov-Smirnov) en 30 perfiles de viento × 8 direcciones = 240 escenarios. También requiere geometría y metadatos reales (caudales de liberación, altura del venteo de unos 10 m). |
| **Capacidades de simulación** | Biblioteca precalculada de penachos estacionarios. La interfaz 3D ofrece selector de escenarios, filtros de viento, nube de puntos de concentración e isosuperficies (>0,01, >0,1 y >1 % vol). Con viento alto domina el momento horizontal; con viento bajo, la flotabilidad. |
| **Aplicaciones de seguridad/operación** | Evaluación preliminar de riesgo, ubicación de sensores según su rango de detección (sensores de <100 ppm lejos de los equipos y de >1 % vol cerca) y planificación de la distribución del sitio. El texto menciona el **entrenamiento** como uso futuro. |
| **Limitaciones (declaradas)** | Solo estado estacionario y solo el venteo principal. Las fugas transitorias o no controladas, la humedad, la integración de sensores en tiempo real y el ML/IA quedan como trabajo **planificado**. El propio documento es un *preprint* de conferencia. |
| **Lecciones para HYDRO-TWIN UDES** | (a) Incluso un laboratorio nacional llama “gemelo digital” a una fase sin datos en tiempo real, pero lo declara de forma explícita como etapa inicial: debemos hacer lo mismo. (b) Los escenarios precalculados con trazabilidad de metadatos (velocidad del viento, ubicación de la liberación) son un buen patrón para nuestros escenarios. (c) Su caso es **exterior**. Nuestro modelo de sala bien mezclada es otro régimen (recinto cerrado) y no puede apoyarse en este trabajo para validarse. |
| **Qué NO debemos afirmar** | Que nuestro modelo reproduce resultados CFD de NREL/NLR. Que nuestra concentración en la sala predice penachos o sirve para ubicar sensores. Que este trabajo valida el modelo de mezcla perfecta. |
| **Estado de verificación** | **Texto completo** (PDF de 11 páginas más portada, leído). |

## 2. Microrred de H2 verde y celda de combustible a escala de laboratorio (James Cook University)

| Campo | Contenido |
|---|---|
| **Referencia y fecha** | Clennar, T.; Du, Y.; Liu, Z. “Lab-scale green hydrogen and fuel cell microgrid digital twin.” *Energy Conversion and Management*, vol. 350, art. 120928, febrero de 2026 (en línea desde aprox. el 16/17-12-2025). DOI: 10.1016/j.enconman.2025.120928. Licencia CC BY 4.0. Afiliación según OpenAlex: James Cook University (Australia). |
| **Problema abordado** | Falta de una plataforma de investigación de bajo coste para microrredes de H2 verde que integren FV, electrolizador, almacenamiento de H2, baterías y celda de combustible. |
| **Metodología de modelado** | El resumen solo dice que se construyó una microrred física de laboratorio y su gemelo digital, con una interfaz ciberfísica. **No se pudo leer** el tipo de modelo del electrolizador ni de la celda. |
| **Requisitos de datos** | Según el resumen, monitorización del estado del sistema físico (implica sensores y adquisición de datos). Detalles no verificados. |
| **Capacidades de simulación** | Monitorización, simulación y control en tiempo real a través del gemelo, con interacción bidireccional física-digital demostrada como prueba de concepto. |
| **Aplicaciones de seguridad/operación** | El resumen menciona control óptimo y mantenimiento predictivo como motivación. No se verificaron aplicaciones de seguridad concretas. |
| **Limitaciones** | Los propios autores la presentan como “prueba de concepto funcional”. Otras limitaciones no verificables sin el texto completo. |
| **Lecciones para HYDRO-TWIN UDES** | Es el referente más cercano para una posible fase 2 de adaptación a una instalación real de UDES: un gemelo a escala de laboratorio y de bajo coste con lazo ciberfísico. Muestra que el salto de “modelo” a “gemelo” exige hardware, sensores e interfaz de control, que hoy no tenemos. |
| **Qué NO debemos afirmar** | Que HYDRO-TWIN UDES es un gemelo digital en el mismo sentido (no tenemos enlace físico). Detalles metodológicos de este artículo que no se leyeron. |
| **Estado de verificación** | **Solo resumen accesible** (resumen completo vía OpenAlex y metadatos Crossref). Es de acceso abierto, pero ScienceDirect bloqueó la descarga automática; puede leerse manualmente en el DOI. |

## 3. Enfoque de referencia para el gemelo digital de un electrolizador PEM en operación

| Campo | Contenido |
|---|---|
| **Referencia y fecha** | Monopoli, D.; Semeraro, C.; Abdelkareem, M. A.; Alami, A. H.; Olabi, A. G.; Dassisti, M. “How to build a Digital Twin for operating PEM-Electrolyser system – A reference approach.” *Annual Reviews in Control*, vol. 57, art. 100943, 2024. DOI: 10.1016/j.arcontrol.2024.100943. Afiliaciones (OpenAlex): University of Sharjah y Politecnico di Bari. Acceso cerrado. |
| **Problema abordado** | Según los fragmentos del resumen: la operación de electrolizadores tiene problemas de eficiencia y vida útil, y la literatura carece de una guía completa para diseñar y construir su gemelo digital. |
| **Metodología de modelado** | Guía paso a paso: primero se presenta la arquitectura del gemelo digital y después se analizan sus componentes. Los modelos concretos (electroquímico, térmico, de datos) **no se verificaron**. |
| **Requisitos de datos** | No verificado (se infiere que hace falta un sistema en operación, pero el texto no se leyó). |
| **Capacidades de simulación** | No verificado. |
| **Aplicaciones de seguridad/operación** | Según el resumen, mejorar el control en línea y ofrecer servicios de detección, diagnóstico y predicción de fallos. |
| **Limitaciones** | No verificables sin el texto completo. |
| **Lecciones para HYDRO-TWIN UDES** | Útil como marco conceptual (arquitectura y componentes) para documentar qué partes de un gemelo tenemos (modelo, visualización) y cuáles no (adquisición de datos, sincronización, diagnóstico sobre datos reales). |
| **Qué NO debemos afirmar** | Que seguimos o cumplimos su arquitectura de referencia. Que hacemos detección o diagnóstico de fallos (nuestra guía es de reglas sobre una simulación). |
| **Estado de verificación** | **Solo resumen accesible, y además parcial**: frases del resumen obtenidas de fragmentos de búsqueda web, más metadatos de Crossref, OpenAlex y Semantic Scholar. Ni OpenAlex ni Crossref incluyen el resumen. |

## 4. Gemelo digital en tiempo real de un sistema de producción de H2 basado en electrónica de potencia (TU Delft)

| Campo | Contenido |
|---|---|
| **Referencia y fecha** | Deshmukh, R. S.; Rituraj, G.; Bauer, P.; Vahedi, H. “Real-time digital twin implementation of power electronics-based hydrogen production system.” *Energy Reports*, vol. 13, pp. 5006–5015, junio de 2025 (licencia desde el 08-04-2025). DOI: 10.1016/j.egyr.2025.04.017. Licencia CC BY 4.0. Delft University of Technology. |
| **Problema abordado** | Diseño del convertidor DC/DC (Dual Active Bridge, DAB) que alimenta un electrolizador. El objetivo es elegir la inductancia serie que minimiza la corriente RMS en todo el rango de potencia. |
| **Metodología de modelado** | Modelo **eléctrico** I-V de un electrolizador **alcalino** de 10 kW (no PEM), con potenciales reversible, de activación y óhmico y constantes dependientes de la temperatura tomadas de Ursúa y Sanchis (2012). Análisis de sensibilidad (temperatura, molaridad, área del electrodo, etc.), barrido paramétrico en PLECS y gemelo en tiempo real en el simulador OPAL-RT OP4610XG con paso FPGA de 120 ns y control PI de corriente. |
| **Requisitos de datos** | Parámetros del modelo tomados de la literatura. En el texto no aparecen mediciones de un electrolizador físico. |
| **Capacidades de simulación** | Operación del 40 al 100 % de la potencia nominal y a temperaturas de pila de 15, 35 y 55 °C. Inductancia óptima de 235 µH, con corriente RMS media de 5,96 A en el rango de 4 a 10 kW. |
| **Aplicaciones de seguridad/operación** | Probar diseños de convertidores **sin un electrolizador físico** (prueba segura y de bajo coste). No trata la seguridad del H2 (fugas, inflamabilidad). |
| **Limitaciones** | La “validación” del gemelo es una comparación **contra la simulación PLECS**, no contra hardware de electrolizador. El electrolizador se representa como resistencia variable en el gemelo. La tecnología es alcalina. |
| **Lecciones para HYDRO-TWIN UDES** | (a) En la literatura, “gemelo digital” también se usa para modelos sin planta física: hay que precisar siempre el sentido del término. (b) Su estructura de curva de polarización (reversible + activación + óhmico, dependiente de T) es conceptualmente análoga a la nuestra, aunque para química alcalina. (c) Cita a Falcão y Pinto (2020) como referencia de modelado, coherente con nuestra elección. |
| **Qué NO debemos afirmar** | Que este trabajo valida un modelo PEM. Que su gemelo se validó con un electrolizador real. Que modelamos electrónica de potencia. |
| **Estado de verificación** | **Texto completo** (versión final publicada, obtenida del repositorio institucional de TU Delft). |

---

## Referencias de modelado

**5. Conductividad de la membrana (Springer et al., 1991).**
Springer, T. E.; Zawodzinski, T. A.; Gottesfeld, S. “Polymer Electrolyte Fuel Cell Model.” *Journal of The Electrochemical Society*, 138(8), 2334–2342, agosto de 1991. DOI: https://doi.org/10.1149/1.2085971
- Respalda la correlación σ = (0,005139·λ − 0,00326)·exp[1268·(1/303 − 1/T)] [S/cm, T en K, λ = contenido de agua de la membrana], que usamos para la resistencia óhmica de la membrana en la curva de polarización.
- Verificación: **solo metadatos** (Crossref). No se leyó el artículo. La forma de la ecuación coincide con la que se cita habitualmente en la literatura de modelado PEM, pero conviene cotejarla con el original (incluida la validez para λ > 1 y las unidades S/cm) antes de una publicación formal.
- Nota: el modelo original es de **celda de combustible**. Su uso en electrolizadores PEM es una práctica común y no una validación específica para electrólisis.

**6. Modelado de electrolizadores PEM (E_rev(T), curva de polarización).**
- *Principal:* Falcão, D. S.; Pinto, A. M. F. R. “A review on PEM electrolyzer modelling: Guidelines for beginners.” *Journal of Cleaner Production*, 261, 121184, julio de 2020. DOI: https://doi.org/10.1016/j.jclepro.2020.121184 (el título completo incluye “Guidelines for beginners”).
- *Alternativa:* Marangio, F.; Santarelli, M.; Calì, M. “Theoretical model and experimental analysis of a high pressure PEM water electrolyser for hydrogen production.” *International Journal of Hydrogen Energy*, 34(3), 1143–1158, febrero de 2009. DOI: https://doi.org/10.1016/j.ijhydene.2008.11.083
- Respaldan la estructura V_celda = E_rev(T) + η_act + η_ohm (+ η_conc) y la dependencia de E_rev con la temperatura.
- Verificación: **solo metadatos** (Crossref). Hay que comprobar que la expresión concreta de E_rev(T) y los parámetros (i0, α) de nuestro código aparecen en la fuente citada, y anotar el número de ecuación.

**7. Límite inferior de inflamabilidad del H2 en aire (LFL ≈ 4 % vol).**
- NOAA, CAMEO Chemicals, ficha “Hydrogen” (CAS 1333-74-0): LEL 4 %, UEL 75 % (fuente citada en la ficha: USCG, 1999). URL: https://cameochemicals.noaa.gov/chemical/8729 (verificada).
- AIChE Center for Hydrogen Safety, boletín “The Elemental – Hydrogen Flammability” (sin fecha): rango inflamable del 4 al 75 % en aire, y la ventilación diluye por debajo del LFL. URL: https://www.aiche.org/sites/default/files/docs/pages/the_elemental_-_hydrogen_flammability.pdf (verificada).
- Respalda los umbrales de alarma de nuestro modelo de concentración en la sala (expresados como fracción del LFL = 4 % vol).
- Advertencias: otras fuentes dan 74 % o 4,1 % como límites, y el LFL depende de la dirección de propagación, la presión y la temperatura. Las páginas de H2 Tools (PNNL) y la Safetygram del DOE no fueron accesibles (bloqueo anti-bot y 404). Para un diseño real deben usarse normas aplicables (p. ej., NFPA 2 o ISO/TR 15916), que no se consultaron aquí.

---

## Oportunidades de diferenciación realistas

Estas oportunidades se plantean como **direcciones de valor**, no como novedad demostrada. Que algo no aparezca en estas cuatro referencias, o que falte en nuestro repositorio, no prueba que no exista en la literatura. Para afirmar novedad haría falta una revisión sistemática.

1. **Interacción educativa.** Las referencias 1 a 4 se orientan a ingeniería (sensores, convertidores, control). La ref. 1 solo menciona el entrenamiento como uso futuro. HYDRO-TWIN UDES puede aportar misiones guiadas con objetivos de aprendizaje explícitos sobre Faraday, polarización, balance térmico y seguridad, siempre que se evalúe con estudiantes (pre/post test) antes de afirmar efectividad.
2. **Simulación trazable.** Cada salida puede vincularse a su ecuación, constante y fuente (como en la sección anterior) y mostrarse en la interfaz. La ref. 1 muestra el valor de exponer metadatos “para transparencia del modelo”, y nosotros podemos hacerlo con las ecuaciones.
3. **Asistencia interpretable.** La guía basada en reglas permite explicar por qué se emite cada recomendación (regla, umbral, variable). Hay que presentarla como apoyo didáctico, no como diagnóstico de fallos (ver ref. 3).
4. **Evaluación de escenarios.** Escenarios deterministas y reproducibles (fuga en sala, sobretemperatura, sobrepresión del tanque) para comparar decisiones del estudiante. A diferencia de la ref. 1, nuestro modelo de sala bien mezclada solo da una concentración media: sirve para la intuición de ventilación frente a acumulación, no para ubicar sensores.
5. **Adaptación a la instalación real de UDES.** La ruta hacia un gemelo propiamente dicho sería: inventario de equipos, mediciones para calibrar la curva de polarización y el modelo térmico, adquisición de datos y lazo físico-digital (modelo de la ref. 2). Hasta entonces, el término correcto es “entorno/modelo digital educativo” o, como mucho, “prototipo de gemelo digital sin enlace a planta”.

**Formulación recomendada para documentos y presentaciones:** “Demostrador educativo con simulación simplificada y trazable de electrólisis PEM, inspirado en enfoques de gemelos digitales reportados en la literatura (refs. 1–4); no conectado a planta y sin datos medidos.”
