/** Documentación estructurada de las ecuaciones del modelo (UI, guía y docs). */
import { ENCLOSURE, LIMITS, STORAGE, THERMAL } from "@/domain/parameters";

export interface EquationDoc {
  id: string;
  title: string;
  expressions: string[];
  basis: string;
  units: string;
  validRange: string;
  limitations: string[];
}

export const EQUATIONS: EquationDoc[] = [
  {
    id: "faraday",
    title: "Producción de H2 — ley de Faraday",
    expressions: ["ṅ_H2 = η_F · N · I / (2F)", "Q_H2 [Nm³/h] = ṅ_H2 · 0,022414 · 3600", "ṅ_O2 = ṅ_H2 / 2 ;  ṅ_H2O,consumida = ṅ_H2"],
    basis: "Ley de Faraday de la electrólisis (2 electrones por molécula de H2). η_F constante ilustrativa de 0,98.",
    units: "I en A, F = 96 485 C/mol, ṅ en mol/s",
    validRange: "Toda la operación del modelo",
    limitations: ["η_F real depende de la densidad de corriente, la presión y el estado de la membrana."],
  },
  {
    id: "polarization",
    title: "Tensión de celda — curva de polarización",
    expressions: [
      "V_celda = E_rev(T) + V_act + V_ohm",
      "E_rev(T) ≈ 1,229 − 0,9·10⁻³·(T − 298,15)",
      "V_act = (R·T / (2·α·F)) · asinh( j / (2·j₀) )",
      "V_ohm = j · ( δ/σ(T) + R_contacto )",
      "σ(T) = (0,005139·λ − 0,00326) · exp[1268·(1/303 − 1/T)]",
    ],
    basis: "Estructura habitual de modelos PEM (p. ej. Marangio et al., 2009; Falcão y Pinto, 2020). σ(T): correlación de Springer et al. (1991), desarrollada para celdas de combustible PEM y usada ampliamente en electrolizadores.",
    units: "j en A/cm², T en K, σ en S/cm, δ en cm",
    validRange: "0 < j ≤ 2 A/cm², 40–80 °C (aproximado)",
    limitations: [
      "Sin sobrepotencial de transporte de masa (subestima V a alta j).",
      "j₀ independiente de la temperatura; sin término de Nernst por presión.",
      "Parámetros no ajustados a una pila real: requiere curva de polarización medida en la planta UDES.",
    ],
  },
  {
    id: "efficiency",
    title: "Eficiencia y consumo específico",
    expressions: ["η_PCS = η_F · V_tn / V_celda,  V_tn = 1,481 V", "CEE = P_pila / ṁ_H2  [kWh/kg]", "P_pila = N · V_celda · I"],
    basis: "Definiciones estándar referidas al poder calorífico superior (39,4 kWh/kg).",
    units: "kW, kg/h, kWh/kg",
    validRange: "Operación con I > 0",
    limitations: ["Eficiencia a nivel de pila: no incluye consumos auxiliares (bombas, chiller, rectificador, secador)."],
  },
  {
    id: "thermal",
    title: "Balance de energía concentrado",
    expressions: [
      "C_th · dT/dt = Q_gen − Q_enf − Q_amb",
      "Q_gen = N · I · (V_celda − V_tn)",
      `Q_enf = min( K·(T − T_set), UA_HX·(T − T_cw) ) si P-103 opera; 0 si falla  (K = ${THERMAL.K_COOL.value} W/K)`,
      `Q_amb = UA_amb · (T − T_amb)`,
    ],
    basis: "Balance de energía de primer orden; el calor generado es la fracción de energía eléctrica por encima de la tensión termoneutra.",
    units: "W, J/K, °C",
    validRange: "20–90 °C",
    limitations: ["Una sola temperatura para pila y lazo; sin dinámica del chiller ni retardos de transporte.", "C_th y UA son estimaciones ilustrativas."],
  },
  {
    id: "tank",
    title: "Balance de masa del tanque pulmón",
    expressions: ["dn/dt = ṅ_H2 − ṅ_FC − ṅ_PSV − ṅ_fuga", "p = n·R·T / V  (gas ideal isotérmico)", "ṅ_FC = P_FC / (η_FC · PCI · M_H2)"],
    basis: "Conservación de masa + ecuación de gas ideal. A 30 bar y 25 °C el factor de compresibilidad del H2 es ≈1,02 (error ≈2 %).",
    units: "mol/s, bar, m³",
    validRange: `0–${STORAGE.TANK_MAWP.value} bar`,
    limitations: ["Temperatura del gas constante (sin calentamiento por compresión).", "Secador ideal sin pérdidas de regeneración."],
  },
  {
    id: "psv",
    title: "Válvula de alivio PSV-201",
    expressions: [`Abre si p_real ≥ ${STORAGE.PSV_SET.value} bar; recierra si p_real < ${STORAGE.PSV_RESEAT.value} bar`, `Q_PSV = ${STORAGE.PSV_CAPACITY_NM3H.value} Nm³/h cuando está abierta`],
    basis: "Protección mecánica independiente del PLC: actúa sobre la presión real, no sobre la medición.",
    units: "bar, Nm³/h",
    validRange: "—",
    limitations: ["Apertura instantánea y capacidad constante (sin curva de descarga ni dimensionamiento API 520)."],
  },
  {
    id: "dilution",
    title: "Concentración de H2 en el recinto (mezcla perfecta)",
    expressions: ["V · dC/dt = Q_fuga − C · Q_vent", "Q_vent = ACH · V", "C_∞ = Q_fuga / Q_vent ;  %LIE = 100 · C[% vol] / 4"],
    basis: `Modelo de caja bien mezclada. LIE del H2 en aire = 4 % vol. Recinto ${ENCLOSURE.VOLUME_M3.value} m³.`,
    units: "m³, m³/h, fracción volumétrica",
    validRange: "Solo orientativo",
    limitations: [
      "El H2 es muy flotante y se estratifica bajo el techo: la concentración local puede ser muy superior a la media.",
      "No sustituye un análisis de dispersión (CFD) ni una clasificación de áreas.",
    ],
  },
  {
    id: "alarms",
    title: "Lógica de alarmas, disparos y rearme (PLC)",
    expressions: [
      `TAH ${LIMITS.TAH.value} °C · TAHH ${LIMITS.TAHH.value} °C (disparo)`,
      `PAH ${LIMITS.PAH.value} bar · PAHH ${LIMITS.PAHH.value} bar (disparo) — evaluadas sobre PT-201 (medido)`,
      `GD-301 ${LIMITS.GD_AH.value} % LIE · ${LIMITS.GD_AHH.value} % LIE (disparo)`,
      `Rearme: solo tras acción del operador y con T < ${LIMITS.T_RESET.value} °C, p_med < ${LIMITS.P_RESET.value} bar, GD < ${LIMITS.GD_RESET.value} % LIE`,
    ],
    basis: "Reglas deterministas con banda muerta; los disparos quedan enclavados (latch). Umbrales ilustrativos.",
    units: "—",
    validRange: "—",
    limitations: ["No representa un sistema instrumentado de seguridad certificado ni límites reales de la planta UDES."],
  },
  {
    id: "pv",
    title: "Perfil fotovoltaico ilustrativo",
    expressions: ["P_FV(t) = P_pico · max(0, sen(π·(h − 6)/12)) · f_nube(t),  h = 10 + t/60", "f_nube = 0,35 entre los min 22 y 30 (rampas de 2 min)"],
    basis: "Forma diurna simplificada para ilustrar intermitencia; no proviene de datos meteorológicos.",
    units: "kW",
    validRange: "Solo con modo 'perfil FV'",
    limitations: ["No usa irradiancia real de Bucaramanga ni modelo de módulos/inversor."],
  },
];

export const equationById = new Map(EQUATIONS.map((e) => [e.id, e]));
