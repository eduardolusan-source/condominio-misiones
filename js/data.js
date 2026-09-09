/* Datos financieros — Las Misiones Residencial.

   FUENTES (entregadas por la administración, Admin-Solutions):
   · "Tabla contable de ingresos y egresos 2025" (enero a diciembre).
   · "Tabla contable de ingresos y egresos 2026" (enero a junio).
   · Estados de cuenta de las 16 unidades emitidos el 22 de junio de 2026:
     de ahí salen la cuota vigente, la cobranza por mes facturado y la
     morosidad, que aquí se publica SOLO agregada.

   CORTE: junio de 2026. Falta que la administración reporte los cambios y
   los datos de julio y de agosto a la fecha.

   REGLA DE PRIVACIDAD: nunca se sube información por departamento ni
   nombres de condóminos. Lo que vive en este repositorio es legible por
   cualquiera que abra la dirección del sitio.

   Forma de cada mes:
   { id: "2026-06", anio: 2026, nombre: "Junio", corto: "Jun",
     saldoIni, saldoFin,
     ingresos: { manto, agua, elevador, medidores, otros },
     egresos:  { ordinarios, extraordinarios },
     cobranza: { pagaron, pct },        // por mes facturado, estados de cuenta
     detalle:  { ordinarios: [["Concepto", monto]], extraordinarios: [...] } }
*/

const MISIONES = {
  nombre: "Las Misiones Residencial",
  direccion: "Senda Eterna 444, Fraccionamiento Milenio III, Santiago de Querétaro, Qro.",
  administracion: "Admin-Solutions",
  unidades: 16,
  composicion: "16 unidades privativas (departamentos 1 al 16), cada una con su estacionamiento",

  /* Cuota mensual ordinaria vigente según los estados de cuenta. */
  cuota: 1500,

  /* Fondo común revolvente del artículo 17: dos meses de gastos normales. */
  fondoMeses: 2,

  corte: "junio de 2026",
  fechaEstados: "22 de junio de 2026",
  anios: [2025, 2026],

  meses: [
    /* ======================= 2025 ======================= */
    { id: "2025-01", anio: 2025, nombre: "Enero", corto: "Ene",
      saldoIni: 24000, saldoFin: 38738,
      ingresos: { manto: 36000, agua: 9820, elevador: 0, medidores: 23968, otros: 0 },
      egresos: { ordinarios: 29282, extraordinarios: 25768 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8282], ["Limpieza", 5400], ["Jardinería", 5000], ["Alberca", 3600]],
        extraordinarios: [["Colocación de lámparas en la entrada", 1800], ["Colocación de medidores individuales de agua", 23968]]
      } },
    { id: "2025-02", anio: 2025, nombre: "Febrero", corto: "Feb",
      saldoIni: 38738, saldoFin: 30795,
      ingresos: { manto: 21000, agua: 5325, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 34268, extraordinarios: 0 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8392], ["Luz de áreas comunes", 5476], ["Limpieza", 4800], ["Jardinería", 5000], ["Alberca", 3600]],
        extraordinarios: []
      } },
    { id: "2025-03", anio: 2025, nombre: "Marzo", corto: "Mar",
      saldoIni: 30795, saldoFin: 36891,
      ingresos: { manto: 22500, agua: 6660, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 23064, extraordinarios: 0 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 7664], ["Limpieza", 4800], ["Alberca", 3600]],
        extraordinarios: []
      } },
    { id: "2025-04", anio: 2025, nombre: "Abril", corto: "Abr",
      saldoIni: 36891, saldoFin: 56289,
      ingresos: { manto: 27000, agua: 6146, elevador: 31000, medidores: 0, otros: 0 },
      egresos: { ordinarios: 30308, extraordinarios: 14440 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 7228], ["Luz de áreas comunes", 5280], ["Limpieza", 7200], ["Alberca", 3600]],
        extraordinarios: [["Reparación de fuga", 1500], ["Compra de herramienta para jardinería", 2500], ["Aceite para el ascensor", 10440]]
      } },
    { id: "2025-05", anio: 2025, nombre: "Mayo", corto: "May",
      saldoIni: 56289, saldoFin: 59092,
      ingresos: { manto: 21000, agua: 5235, elevador: 12400, medidores: 0, otros: 0 },
      egresos: { ordinarios: 30932, extraordinarios: 4900 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8932], ["Limpieza", 7500], ["Jardinería", 7500]],
        extraordinarios: [["Materiales de limpieza y pintura", 2900], ["Reparación de fuga", 2000]]
      } },
    { id: "2025-06", anio: 2025, nombre: "Junio", corto: "Jun",
      saldoIni: 59092, saldoFin: 36998,
      ingresos: { manto: 21000, agua: 6116, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 33710, extraordinarios: 15500 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8794], ["Luz de áreas comunes", 5916], ["Limpieza", 6000], ["Jardinería", 6000]],
        extraordinarios: [["Reparación de la tarjeta del elevador", 15500]]
      } },
    { id: "2025-07", anio: 2025, nombre: "Julio", corto: "Jul",
      saldoIni: 36998, saldoFin: 34108,
      ingresos: { manto: 22500, agua: 3854, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 28294, extraordinarios: 950 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8794], ["Limpieza", 7500], ["Jardinería", 5000]],
        extraordinarios: [["Gasolina e insumos de limpieza", 950]]
      } },
    { id: "2025-08", anio: 2025, nombre: "Agosto", corto: "Ago",
      saldoIni: 34108, saldoFin: 25203,
      ingresos: { manto: 16500, agua: 4217, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 28972, extraordinarios: 650 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 9254], ["Luz de áreas comunes", 2718], ["Limpieza", 5000], ["Jardinería", 5000]],
        extraordinarios: [["Insumos de limpieza", 650]]
      } },
    { id: "2025-09", anio: 2025, nombre: "Septiembre", corto: "Sep",
      saldoIni: 25203, saldoFin: 24388,
      ingresos: { manto: 21000, agua: 6007, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 25322, extraordinarios: 2500 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8382], ["Limpieza", 8000], ["Alberca", 1940]],
        extraordinarios: [["Reparación del intercomunicador", 750], ["Reparación de la bomba de la cisterna", 1750]]
      } },
    { id: "2025-10", anio: 2025, nombre: "Octubre", corto: "Oct",
      saldoIni: 24388, saldoFin: 10029,
      ingresos: { manto: 21000, agua: 3380, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 33739, extraordinarios: 5000 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8382], ["Luz de áreas comunes", 10857], ["Limpieza", 7500]],
        extraordinarios: [["Compra de plantas y piedra", 2500], ["Limpieza de palmeras", 2500]]
      } },
    { id: "2025-11", anio: 2025, nombre: "Noviembre", corto: "Nov",
      saldoIni: 10029, saldoFin: 14255,
      ingresos: { manto: 19500, agua: 5506, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 20780, extraordinarios: 0 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 7280], ["Limpieza", 6500]],
        extraordinarios: []
      } },
    { id: "2025-12", anio: 2025, nombre: "Diciembre", corto: "Dic",
      saldoIni: 14255, saldoFin: 12429,
      ingresos: { manto: 18000, agua: 5261, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 25087, extraordinarios: 0 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 6826], ["Luz de áreas comunes", 4761], ["Limpieza", 6500]],
        extraordinarios: []
      } },

    /* ======================= 2026 ======================= */
    /* La tabla de 2026 arranca en $12,424 aunque 2025 cerró en $12,429:
       ver la sección de revisión. Se respeta la cifra de la tabla. */
    { id: "2026-01", anio: 2026, nombre: "Enero", corto: "Ene",
      saldoIni: 12424, saldoFin: 27507,
      ingresos: { manto: 51000, agua: 3075, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 23254, extraordinarios: 15738 },
      cobranza: { pagaron: 16, pct: 100 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 9254], ["Limpieza y conserjería", 7000]],
        extraordinarios: [["Tarjeta del operador de puertas del ascensor", 12238], ["Insumos de limpieza", 500], ["Químicos para la alberca", 1500], ["Plantas y piedra para jardinería", 1500]]
      } },
    { id: "2026-02", anio: 2026, nombre: "Febrero", corto: "Feb",
      saldoIni: 27507, saldoFin: 15432,
      ingresos: { manto: 13500, agua: 2698, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 28273, extraordinarios: 0 },
      cobranza: { pagaron: 15, pct: 95.8 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 9286], ["Luz de áreas comunes", 4987], ["Limpieza y conserjería", 7000]],
        extraordinarios: []
      } },
    { id: "2026-03", anio: 2026, nombre: "Marzo", corto: "Mar",
      saldoIni: 15432, saldoFin: 16560,
      ingresos: { manto: 18000, agua: 8432, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 22204, extraordinarios: 3100 },
      cobranza: { pagaron: 15, pct: 93.8 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8204], ["Limpieza y conserjería", 7000]],
        extraordinarios: [["Revisión del ascensor por nuevo proveedor", 3100]]
      } },
    { id: "2026-04", anio: 2026, nombre: "Abril", corto: "Abr",
      saldoIni: 16560, saldoFin: 6602,
      ingresos: { manto: 16500, agua: 3432, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 25240, extraordinarios: 4650 },
      cobranza: { pagaron: 15, pct: 93.8 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8185], ["Luz de áreas comunes", 3055], ["Limpieza y conserjería", 7000]],
        extraordinarios: [["Muro verde, accesorios y luces de escaleras", 2100], ["Mantenimiento de la bomba de la alberca", 2550]]
      } },
    { id: "2026-05", anio: 2026, nombre: "Mayo", corto: "May",
      saldoIni: 6602, saldoFin: 12454,
      ingresos: { manto: 25500, agua: 2753, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 22401, extraordinarios: 0 },
      cobranza: { pagaron: 15, pct: 93.8 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8401], ["Limpieza y conserjería", 7000]],
        extraordinarios: []
      } },
    { id: "2026-06", anio: 2026, nombre: "Junio", corto: "Jun",
      saldoIni: 12454, saldoFin: 18452,
      ingresos: { manto: 24000, agua: 11231, elevador: 0, medidores: 0, otros: 0 },
      egresos: { ordinarios: 27133, extraordinarios: 2100 },
      cobranza: { pagaron: 13, pct: 81.3 },
      detalle: {
        ordinarios: [["Administración", 7000], ["Agua (recibo del condominio)", 8723], ["Luz de áreas comunes", 4410], ["Limpieza y conserjería", 7000]],
        extraordinarios: [["Árboles y plantas para la entrada", 2100]]
      } }
  ],

  /* Morosidad AGREGADA según los estados de cuenta del 22 de junio de 2026.
     La cobranza de junio estaba en curso en esa fecha. */
  morosidad: {
    fecha: "22 de junio de 2026",
    unidadesConAdeudo: 10,
    total: 23681,
    manto: { unidades: 3, monto: 10000, nota: "cuotas de febrero a junio de 2026" },
    agua: { unidades: 7, monto: 7481, nota: "recibos de octubre de 2025 a junio de 2026" },
    elevador: { unidades: 2, monto: 6200, nota: "cuota de $3,100 de abril de 2025" }
  },

  proyectos: [
    {
      nombre: "Protocolización de la mesa directiva, cuenta bancaria y puerta peatonal",
      estado: "En trámite · duración aproximada de tres meses y medio; al concluir se notificará la nueva cuenta bancaria del condominio",
      financiamiento: "Cuota extraordinaria de $1,000 por departamento, aprobada por unanimidad en asamblea (agosto de 2026)",
      presupuesto: 16000
    },
    {
      nombre: "Reparación del elevador",
      estado: "En proceso · en 2025 se recaudó la cuota de $3,100 por unidad (14 de 16 cubiertas) y se pagaron aceite y tarjeta; en 2026, tarjeta del operador de puertas y revisión de nuevo proveedor",
      financiamiento: "Cuota extraordinaria de $3,100 por unidad (2025) y gasto común",
      presupuesto: 49600
    },
    {
      nombre: "Nuevo acceso de la puerta del edificio",
      estado: "En proceso · pendiente el informe de estatus de la administración",
      financiamiento: "Cuota extraordinaria",
      presupuesto: null
    }
  ],

  /* Revisión de los documentos entregados. "incongruencia" = cifras que no
     cuadran entre sí; "observacion" = dato relevante que conviene tener a la
     vista. Todo en agregado. */
  revision: [
    { tipo: "incongruencia", titulo: "Saldo inicial de 2026",
      detalle: "La tabla de 2026 arranca con $12,424, pero la de 2025 cerró en $12,429. Diferencia de $5 sin explicación." },
    { tipo: "incongruencia", titulo: "Rótulos de la tabla de 2026",
      detalle: "Los rótulos dicen «Saldo inicial enero 2025» y «Saldo final diciembre 2025», arrastrados de la tabla anterior. Los $18,452 corresponden al cierre de junio de 2026." },
    { tipo: "incongruencia", titulo: "Mantenimiento 2026: tabla vs. estados de cuenta",
      detalle: "La tabla registra $148,500 de enero a junio; los recibos de los estados de cuenta con fecha en ese periodo suman $155,000. Diferencia de $6,500 (marzo +$1,500, abril +$2,000, mayo +$1,500, junio +$1,500)." },
    { tipo: "incongruencia", titulo: "Agua 2026: tabla vs. estados de cuenta",
      detalle: "$31,621 en la tabla frente a $32,230 en los recibos de enero a junio (abril +$273, junio +$336). Diferencia de $609." },
    { tipo: "incongruencia", titulo: "Mantenimiento 2025: tabla vs. estados de cuenta",
      detalle: "$267,000 en la tabla frente a $266,250 en los recibos: −$750 en el año (enero +$300, febrero −$3,000, marzo +$450, octubre +$1,500)." },
    { tipo: "incongruencia", titulo: "Agua 2025: tabla vs. estados de cuenta",
      detalle: "$67,527 en la tabla frente a $67,591 en los recibos: +$64 (octubre +$63, noviembre +$1)." },
    { tipo: "incongruencia", titulo: "Cuota extraordinaria de diciembre de 2024",
      detalle: "Un recibo por $3,000 con fecha 27 de enero de 2025 no aparece en los ingresos de 2025 de la tabla contable." },
    { tipo: "incongruencia", titulo: "Fechas fuera de rango en un estado de cuenta",
      detalle: "Tres recibos (folios A-478 y A-479) traen fecha de noviembre y diciembre de 2026, posteriores a la emisión del estado (22 de junio de 2026). Lo más probable es que el año correcto sea 2025." },
    { tipo: "incongruencia", titulo: "Resultado anual rotulado como saldo",
      detalle: "En 2025 la fila «Saldo» muestra −$11,571 en la columna de total anual; es el resultado del año (ingresos menos egresos), no un saldo." },
    { tipo: "observacion", titulo: "El agua no se autofinancia",
      detalle: "Lo cobrado a los condóminos por agua cubre el 69% del recibo del condominio en 2025 ($67,527 de $98,210) y el 61% en el primer semestre de 2026 ($31,621 de $52,053). La diferencia —$30,683 y $20,432— la absorbe la cuota de mantenimiento." },
    { tipo: "observacion", titulo: "Ingresos por fecha de depósito",
      detalle: "La tabla registra el mantenimiento por fecha de pago, no por mes facturado: por eso enero de 2026 muestra $51,000 (34 cuotas) y febrero $13,500 (9). La cobranza por mes facturado, que sale de los estados de cuenta, es la que aparece en los indicadores." },
    { tipo: "observacion", titulo: "Fondo común del artículo 17",
      detalle: "Dos meses de gasto ordinario equivalen a unos $49,500. El saldo al cierre de junio ($18,452) cubre el 37% de ese fondo." },
    { tipo: "observacion", titulo: "Cuota del elevador de 2025",
      detalle: "De 16 cuotas de $3,100, se recaudaron 14 ($43,400); dos siguen pendientes ($6,200) al 22 de junio de 2026." }
  ]
};
