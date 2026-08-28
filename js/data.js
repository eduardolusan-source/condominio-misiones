/* Datos financieros — Las Misiones Residencial.
   Fuente prevista: hoja de cálculo mensual de la administración (Admin-Solutions).

   Mientras `meses` esté vacío, la sección de finanzas muestra el catálogo de
   métricas en estado "pendiente": se ve exactamente qué se va a publicar y con
   qué desglose, sin inventar ninguna cifra.

   Para publicar un mes: agrega un objeto a `meses` con esta forma —

   {
     id: "2026-07", nombre: "Julio", corto: "Jul",
     saldoIni: 0, saldoFin: 0,
     ingresos:  { manto: 0, extraordinaria: 0, otros: 0 },
     egresos:   { fijos: 0, variables: 0, obra: 0 },
     cobranza:  { pagaron: 0, pct: 0 },
     morosidad: { unidadesManto: 0, acumuladoManto: 0, unidadesExtra: 0, adeudoExtra: 0 },
     detalle:   { fijos: [], variables: [], obra: [] }   // ["Proveedor", "Concepto", monto]
   }

   REGLA DE PRIVACIDAD: la morosidad se publica SIEMPRE agregada —montos y
   número de unidades—, nunca por departamento ni con nombres. Lo que se sube a
   este repositorio es legible por cualquiera que abra la dirección del sitio. */

const MISIONES = {
  nombre: "Las Misiones Residencial",
  direccion: "Senda Eterna 444, Fraccionamiento Milenio III, Santiago de Querétaro, Qro.",
  administracion: "Admin-Solutions",
  unidades: 16,
  composicion: "16 unidades privativas (departamentos 1 al 16), cada una con su estacionamiento",

  /* Cuota mensual ordinaria: la establece la asamblea en proporción al valor de
     cada departamento (art. 24, VII). Pendiente de confirmar con la
     administración; se deja en null para que el sitio no publique un monto que
     no ha sido aprobado. */
  cuota: null,

  /* Fondo común revolvente del artículo 17: dos meses de gastos normales según
     el presupuesto aprobado. El monto depende del presupuesto, aún pendiente. */
  fondoMeses: 2,

  meses: [],

  proyectos: [
    {
      nombre: "Reparación del elevador",
      estado: "En proceso · cita con proveedor; se explora botonera genérica para reducir costos",
      financiamiento: "Cuota extraordinaria",
      presupuesto: null
    },
    {
      nombre: "Nuevo acceso de la puerta del edificio",
      estado: "En proceso · pendiente el informe de estatus de la administración",
      financiamiento: "Cuota extraordinaria",
      presupuesto: null
    }
  ]
};
