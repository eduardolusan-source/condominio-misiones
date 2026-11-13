/* Sección financiera — Las Misiones Residencial.

   Acceso abierto: no hay clave. Por eso aquí solo viven agregados. Nunca
   publiques en esta sección cifras por departamento ni nombres de condóminos.

   La pantalla la dibuja js/tablero.js (motor común con La Valetta y Lahia);
   este archivo junta los datos y los traduce al formato del tablero:
   · 2025 y enero–junio de 2026: js/data.js (tablas contables de Admin-Solutions).
   · Desde octubre de 2026: en vivo, la hoja de captura de la mesa directiva vía
     el Apps Script (accion=finanzas). Si el script no responde, solo js/data.js. */
(function () {
  "use strict";

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx0qO7rHUmBqUJOuwjBkYIu4O8_FrWlC8f_DyLj3DrhN1h5ApHpdfKVmUgx_aVH3aJ-/exec";

  const D = MISIONES;
  const n = v => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
  const items = lista => (lista || []).map(it => ({ concepto: it[0] || "", detalle: "", monto: n(it[1]), liga: it[2] || "" }));
  const esAgua = c => /^agua/i.test(c);

  /* Un mes de data.js o del script → formato del tablero. */
  function mes(o, vivo) {
    const ing = o.ingresos || {}, egr = o.egresos || {}, det = o.detalle || {};
    const ingresos = [
      { nombre: "Cuotas de mantenimiento", monto: n(ing.manto) },
      { nombre: "Pagos de agua de los condóminos", monto: n(ing.agua) },
      { nombre: "Cuota extraordinaria del elevador", monto: n(ing.elevador) },
      { nombre: "Medidores individuales de agua", monto: n(ing.medidores) },
      { nombre: "Cuotas extraordinarias", monto: n(ing.extra) },
      { nombre: "Renta de la casa club", monto: n(ing.casaClub) },
      { nombre: "Otros ingresos", monto: n(ing.otros) }
    ].filter((x, i) => i < 2 || x.monto > 0.5);
    const ord = items(det.ordinarios), ext = items(det.extraordinarios);
    const mr = o.mora;
    return {
      id: o.id, anio: parseInt(o.id.slice(0, 4), 10), nombre: o.nombre, corto: o.corto, vivo: !!vivo,
      saldoIni: n(o.saldoIni), saldoFin: n(o.saldoFin),
      ingresos: ingresos,
      grupos: [
        { clave: "ordinarios", nombre: "Gastos ordinarios", monto: n(egr.ordinarios), cuota: true, items: ord },
        { clave: "extraordinarios", nombre: "Gastos extraordinarios", monto: n(egr.extraordinarios), cuota: false, items: ext }
      ],
      cobranza: { pagaron: n((o.cobranza || {}).pagaron), pct: n((o.cobranza || {}).pct) },
      mora: mr && typeof mr.acumulada === "number" ? { acumulada: n(mr.acumulada), unidades: n(mr.unidades), adelantos: n(mr.adelantos), unidadesAdelanto: n(mr.unidadesAdelanto) } : null,
      agua: { cobrado: n(ing.agua), pagado: ord.filter(x => esAgua(x.concepto)).reduce((a, x) => a + x.monto, 0) },
      indicadores: [], carpeta: o.carpeta || ""
    };
  }

  const fotoMorosidad = () => {
    const mo = D.morosidad;
    return {
      fecha: mo.fecha, total: mo.total, unidades: mo.unidadesConAdeudo,
      titulo: "Adeudos con la administración anterior (al " + mo.fecha + ")",
      partes: [
        { nombre: "Mantenimiento", monto: mo.manto.monto, unidades: mo.manto.unidades, nota: mo.manto.nota },
        { nombre: "Agua", monto: mo.agua.monto, unidades: mo.agua.unidades, nota: mo.agua.nota },
        { nombre: "Cuota del elevador", monto: mo.elevador.monto, unidades: mo.elevador.unidades, nota: mo.elevador.nota }
      ],
      nota: "Foto agregada de los estados de cuenta de Admin-Solutions. El retraso en reintegrar el fondo común causa interés moratorio al CPP multiplicado por 1.5 (art. 17)."
    };
  };

  function proyectosBase() {
    return D.proyectos.map(p => ({ nombre: p.nombre, estado: p.estado, monto: p.presupuesto || null, montoEtiqueta: p.presupuesto ? "presupuesto" : "", nota: p.financiamiento ? "Financiamiento: " + p.financiamiento : "" }));
  }

  function modelo(mesesVivo, j) {
    const vivos = (mesesVivo || []).map(o => mes(o, true));
    const ids = vivos.map(m => m.id);
    const meses = D.meses.filter(m => ids.indexOf(m.id) < 0).map(m => mes(m, false)).concat(vivos).sort((a, b) => a.id.localeCompare(b.id));
    const proyectos = proyectosBase();
    if (j && Array.isArray(j.proyectos)) j.proyectos.forEach(p => {
      if (proyectos.some(q => q.nombre.toLowerCase() === String(p.nombre).toLowerCase())) return;
      proyectos.push({ nombre: p.nombre, estado: [p.estado, p.avance != null ? "avance " + p.avance + "%" : "", p.notas].filter(Boolean).join(" · "), monto: p.presupuesto || null, montoEtiqueta: p.presupuesto ? "presupuesto" : "", nota: "Hoja de captura de la mesa directiva" });
    });
    return {
      unidades: D.unidades, cuota: n(j && j.cuota) || D.cuota, meses: meses, proyectos: proyectos,
      /* Gastos fijos: vienen de la hoja (Config → gastos_fijos). Respaldo solo mientras el script no se actualice. */
      fijos: j && Array.isArray(j.fijos) ? j.fijos : [{ nombre: "Limpieza y conserjería", monto: 1800, cada: "semana", mensual: 7800 }, { nombre: "Alberca", monto: 500, cada: "quincena", mensual: 1000 }],
      morosidadFoto: fotoMorosidad(), revision: D.revision,
      fuente: vivos.length ? { vivo: true, generado: j.generado } : { vivo: false, texto: "tablas contables al " + D.corte }
    };
  }

  /* ---------- Tablero ---------- */
  const TEXTOS = {
    titulo: "Las cuentas de Las Misiones",
    aviso: "📅 <strong>Información a " + D.corte + ".</strong> Las cifras vienen de las tablas contables de Admin-Solutions y de los estados de cuenta del " + D.fechaEstados + ". Falta que la administración anterior reporte julio a septiembre de 2026. <a href=\"pendientes.html#financiero\">Ver el pendiente</a>.",
    notaCuota: "sin contar el recibo de agua, que se cobra aparte por medidor",
    notaCobranza: "la cobranza es por mes facturado.",
    notaSaldo: "2025 cerró con la mitad del saldo con que empezó. Desde octubre de 2026 el saldo es el de la cuenta de la mesa directiva.",
    notaProyectos: "Obras financiadas con cuota extraordinaria, aprobadas conforme al artículo 14, inciso J. Su seguimiento está en Pendientes.",
    notaRevision: "Cotejo de las tablas contables de 2025 y 2026 con los estados de cuenta del " + D.fechaEstados + ". Se enviaron a la administración para su aclaración.",
    privacidad: "Las cifras de esta sección son agregadas. Por transparencia, el edificio de la portada muestra por número de departamento si está al corriente y cuánto se debe, sin nombres de condóminos.",
    notaMorosidad: "Los adeudos se gestionan de manera directa y confidencial entre la mesa directiva y cada unidad.",
    acerca: "<h3>De dónde salen los datos</h3>" +
      "<p><b>2025 y enero–junio de 2026:</b> tablas contables de ingresos y egresos y estados de cuenta entregados por Admin-Solutions. La cobranza es por mes facturado.</p>" +
      "<p><b>Desde octubre de 2026:</b> la hoja de captura de la mesa directiva. Cuando aparece <b>En vivo</b>, la página la lee cada vez que se abre (hasta cinco minutos de espera). Un mes aparece en cuanto su pestaña tiene cobros o gastos.</p>" +
      "<h3>Cómo se revisa</h3><p>La mesa directiva coteja las cifras contra el estado de cuenta (art. 19, fracc. XI) y anota lo que no cuadra en <a href=\"#revision\">Revisión de documentos</a>. Cada condómino tiene cinco días para formular observaciones desde que lo recibe. La aprobación formal del estado de cuenta y del presupuesto corresponde a la asamblea (art. 24, V y VI).</p>" +
      "<p>El reglamento pide un fondo común revolvente de " + D.fondoMeses + " meses de gasto ordinario (art. 17).</p>"
  };
  const OPCIONES = {
    clave: "misiones",
    sexto: "agua",
    excluirDeCuota: /^agua/i,
    cuotaDesde: "2026-10",
    rubros: [
      { nombre: "Administración", re: /administraci/i },
      { nombre: "Limpieza y conserjería", re: /limpieza|conserj/i },
      { nombre: "Luz de áreas comunes", re: /\bluz\b|cfe/i },
      { nombre: "Jardinería", re: /jard/i },
      { nombre: "Alberca", re: /alberca/i },
      { nombre: "Elevador", re: /elevador/i },
      { nombre: "Vigilancia", re: /vigilan|seguridad/i }
    ],
    agua: {
      titulo: "El agua",
      frase: "del recibo de agua del condominio se cubrió con lo que pagaron los condóminos",
      cobro: "a los condóminos por su medidor",
      gasto: "del recibo de agua del condominio",
      tile: "cobrado vs. recibo",
      explica: "Cada unidad paga su consumo según su medidor individual (instalado en enero de 2025). El recibo del condominio se cubre con lo cobrado y, cuando no alcanza, con la cuota de mantenimiento. Tu recibo de cada mes está en la página Agua.",
      nota: "Tu recibo de agua del mes, con tu lectura y tu parte de áreas comunes, está en <a href=\"agua.html\">Agua</a>."
    },
    textos: TEXTOS
  };

  /* Carga sin «salto»: antes se dibujaba la copia de js/data.js y segundos después la hoja en
     vivo la reemplazaba. Ahora: (1) si este navegador ya vio la hoja, se muestra esa última
     respuesta al instante (casi siempre es igual a la nueva); (2) si no, se espera a la hoja con
     el aviso «Cargando cifras…»; (3) solo si la hoja no responde en 8 s se muestra js/data.js. */
  const tablero = Tablero.montar(document.getElementById("tablero"), OPCIONES);
  const LLAVE = "misiones.finanzas.vivo";
  let pintado = false;

  function aplicarVivo(j) {
    const meses = (j.meses || []).filter(m => /^\d{4}-\d{2}$/.test(String(m.id || "")));
    if (!meses.length) throw new Error("la hoja aún no tiene meses capturados");
    const primero = meses[0], NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const desde = NOMBRES[parseInt(primero.id.slice(5), 10) - 1] + " de " + primero.id.slice(0, 4);
    TEXTOS.moraDesde = desde;
    TEXTOS.aviso = "🟢 <strong>En vivo desde " + desde + ".</strong> La mesa directiva captura cobros y gastos en su hoja y esta página los lee cada vez que se abre. De 2025 a junio de 2026 las cifras vienen de las tablas contables de Admin-Solutions; julio a septiembre de 2026 siguen pendientes de la administración anterior. <a href=\"pendientes.html#financiero\">Ver el pendiente</a>.";
    tablero.actualizar(modelo(meses, j));
    pintado = true;
  }
  function respaldo() { if (!pintado) { tablero.actualizar(modelo(null, null)); pintado = true; } }

  try { const g = JSON.parse(localStorage.getItem(LLAVE) || "null"); if (g && g.ok) aplicarVivo(g); } catch (_) { /* sin copia en este navegador */ }
  const espera = setTimeout(respaldo, 8000);

  async function cargarVivo() {
    if (!SCRIPT_URL) throw new Error("sin dirección del script");
    const r = await fetch(SCRIPT_URL + "?accion=finanzas&t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.error) || "sin datos");
    aplicarVivo(j);
    try { localStorage.setItem(LLAVE, JSON.stringify(j)); } catch (_) { /* sin almacenamiento */ }
  }
  cargarVivo().then(() => clearTimeout(espera)).catch(e => {
    clearTimeout(espera);
    console.warn("[Misiones] Sin hoja en vivo (" + e.message + "). Se muestra js/data.js.");
    respaldo();
  });
})();
