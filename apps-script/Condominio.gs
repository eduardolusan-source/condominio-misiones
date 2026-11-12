/* Las Misiones · Menú «Condominio» y semáforo de la hoja (tercer archivo del proyecto).
   Sustituye al archivo «Revision»: si lo tienes en el editor, bórralo (⋮ → Eliminar) y
   crea éste con «+ → Secuencia de comandos → Condominio».

   Menú «Condominio» (aparece al abrir la hoja):
   - Revisar que todo cuadre: semáforo de errores de captura (también va en el kit del día 10).
   - Probar el reporte (solo a mí) / Enviar ahora el reporte del mes anterior.
   - Preparar la pestaña del mes siguiente.
   - Revisar gastos de ejemplo de la plantilla.
   - Cambiar la clave de la bandeja de pagos (se guarda en Config, ya no en el código).
   - Ver la dirección del servicio (la URL /exec que usan las páginas).
   - Instalar o reparar la programación del día 10.
   Lo que dice el semáforo es PRIVADO: puede nombrar departamentos y solo llega a la mesa. */

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Condominio")
    .addItem("Revisar que todo cuadre", "revisarSalud")
    .addSeparator()
    .addItem("Probar el reporte (solo a mí)", "reportePrueba")
    .addItem("Enviar ahora el reporte del mes anterior", "reporteAhora")
    .addSeparator()
    .addItem("Preparar la pestaña del mes siguiente", "prepararMesSiguienteMenu")
    .addItem("Revisar gastos de ejemplo de la plantilla", "revisarGastosDeEjemplo")
    .addSeparator()
    .addItem("Cambiar la clave de la bandeja de pagos…", "cambiarClaveBandeja")
    .addItem("Ver la dirección del servicio", "verDireccion")
    .addItem("Instalar o reparar la programación (día 10)", "instalarReporte")
    .addToUi();
}

function avisoUi_(titulo, texto) {
  Logger.log(titulo + "\n" + texto);
  try { SpreadsheetApp.getUi().alert(titulo, texto, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* desde el editor o un disparador */ }
}

/* ---------- Claves en Config (no en el código) ---------- */

function ponerConfig_(clave, valor, nota) {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);
  if (!h) return false;
  const n = Math.max(h.getLastRow(), 1);
  const claves = h.getRange(1, 1, n, 1).getValues().map(f => String(f[0]).trim());
  const i = claves.indexOf(clave);
  if (i >= 0) h.getRange(i + 1, 2).setValue(valor);
  else h.getRange(n + 1, 1, 1, 3).setValues([[clave, valor, nota || ""]]);
  return true;
}

/* Clave de bandeja.html. Vive en Config → clave_admin. La primera vez, si el código todavía
   trae una clave propia (no la de ejemplo), la pasa a Config para no perderla al actualizar. */
function claveAdmin_() {
  const v = String(config_().clave_admin || "").trim();
  if (v) return v;
  if (CLAVE_ADMIN && CLAVE_ADMIN !== "cambia-esta-clave") {
    ponerConfig_("clave_admin", CLAVE_ADMIN, "Clave de bandeja.html (confirmar y rechazar pagos). Cámbiala desde el menú Condominio.");
    return CLAVE_ADMIN;
  }
  return CLAVE_ADMIN;
}

function cambiarClaveBandeja() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Clave de la bandeja de pagos", "Escribe la clave nueva (mínimo 6 caracteres). Compártela solo con quien confirma pagos.", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const v = r.getResponseText().trim();
  if (v.length < 6) { ui.alert("Muy corta: usa al menos 6 caracteres."); return; }
  ponerConfig_("clave_admin", v, "Clave de bandeja.html (confirmar y rechazar pagos). Cámbiala desde el menú Condominio.");
  ui.alert("Listo. Desde ahora bandeja.html pide esta clave. Ya no hace falta tocar el código.");
}

function verDireccion() {
  let url = "";
  try { url = ScriptApp.getService().getUrl() || ""; } catch (e) { /* sin implementación */ }
  avisoUi_("Dirección del servicio", url
    ? url + "\n\nEs la que usan las páginas del sitio (SCRIPT_URL). Para actualizar el script sin cambiarla: Implementar → Administrar implementaciones → lápiz → Nueva versión."
    : "Todavía no hay implementación. Implementar → Nueva implementación → Aplicación web · Ejecutar como: yo · Acceso: cualquier persona.");
}

function prepararMesSiguienteMenu() {
  const sig = prepararMesSiguiente();
  avisoUi_("Mes siguiente", "La pestaña de " + REP_MESES[parseInt(sig.slice(5), 10) - 1] + " " + sig.slice(0, 4) + " está lista, en blanco y con su saldo inicial encadenado.");
}

/* ---------- Gastos de ejemplo de la plantilla ---------- */

function gastosDeEjemplo_() {
  const hallazgos = [];
  SpreadsheetApp.getActive().getSheets().forEach(h => {
    if (!esHojaMes_(h) || h.getName() === PLANTILLA) return;
    ["ordinario", "extraordinario"].forEach(tipo => {
      const sec = seccionEgresos_(h, tipo);
      if (!sec) return;
      h.getRange(sec.inicio, 2, sec.fin - sec.inicio + 1, 2).getValues().forEach((f, i) => {
        const concepto = String(f[0] || "").trim(), monto = Number(f[1]) || 0;
        if (monto > 0 && (normEt_(concepto).indexOf("administracion") === 0 || Math.abs(monto - 7000) < 0.01))
          hallazgos.push(h.getName() + " · egresos " + tipo + "s · fila " + (sec.inicio + i) + " · " + (concepto || "(sin concepto)") + " · $" + monto.toLocaleString("es-MX"));
      });
    });
  });
  return hallazgos;
}
function revisarGastosDeEjemplo() {
  const hallazgos = gastosDeEjemplo_();
  avisoUi_("Revisión de gastos de ejemplo", hallazgos.length
    ? "Revisa si estos gastos son reales (pueden ser los de ejemplo de la plantilla):\n\n" + hallazgos.join("\n") + "\n\nSi no lo son, borra el monto en la columna C de esa fila."
    : "No encontré gastos de Administración ni montos de $7,000 en ningún mes. Todo limpio.");
  return hallazgos;
}

/* ---------- Semáforo ---------- */

/* Devuelve { color: verde|amarillo|rojo, puntos: [{nivel: alerta|aviso, texto}] }. No escribe nada. */
function salud_() {
  const ss = SpreadsheetApp.getActive();
  const cfg = config_();
  const puntos = [];
  const alerta = t => puntos.push({ nivel: "alerta", texto: t }), aviso = t => puntos.push({ nivel: "aviso", texto: t });
  const zona = "America/Mexico_City";
  const hoy = new Date(), hoyId = Utilities.formatDate(hoy, zona, "yyyy-MM"), ant = mesSiguiente_(hoyId, -1);
  const desde = mesTexto_(cfg.finanzas_desde).trim();
  const cuota = Number(cfg.cuota_mantenimiento) || 1500;
  const esNum = v => v === "" || v == null || typeof v === "number" || /^[\s$\d.,-]+$/.test(String(v));

  /* 1 · Pestañas de mes */
  const vistos = {}, info = [];
  ss.getSheets().forEach(h => {
    if (!esHojaMes_(h) || h.getName() === PLANTILLA) return;
    const id = idDeHojaMes_(h);
    if (!id) return;
    if (vistos[id]) alerta("Hay dos pestañas para " + id + ": «" + vistos[id] + "» y «" + h.getName() + "». El sitio usa solo una.");
    vistos[id] = h.getName();
    if (desde && id < desde) return;
    info.push({ h: h, id: id });
  });
  info.sort((a, b) => a.id < b.id ? -1 : 1);
  let prev = null;
  info.forEach(x => {
    const h = x.h, nombre = h.getName();
    const vals = h.getRange(1, 2, 120, 4).getValues();
    const et = vals.map(f => normEt_(f[0]));
    const fC = et.indexOf("cobrospordepartamento");
    let manto = 0, texto = [], muchos = [];
    if (fC >= 0) for (let i = fC + 1; i < et.length && et[i].indexOf("total") !== 0; i++) {
      if (!/^depto\d/.test(et[i])) continue;
      [1, 2, 3].forEach(c => { if (!esNum(vals[i][c])) texto.push(i + 1); });
      const v = Number(vals[i][1]) || 0;
      manto += v;
      if (v > cuota * 3) muchos.push(String(vals[i][0]).trim() + " ($" + v.toLocaleString("es-MX") + ")");
    }
    if (texto.length) alerta(nombre + ": hay texto donde va un monto en cobros (filas " + texto.filter((v, i, a) => a.indexOf(v) === i).join(", ") + "). El script lo cuenta como 0.");
    if (muchos.length) aviso(nombre + ": cobro de más de 3 cuotas en " + muchos.join(", ") + ". Si pagó varios meses, anota cada uno en la pestaña de su mes.");
    const m = leerMesVivo_(h, x.id);
    if (x.id < hoyId && m.capturado && manto === 0) aviso(nombre + " tiene gastos pero ningún cobro de mantenimiento capturado.");
    if (prev && prev.id === mesSiguiente_(x.id, -1) && prev.m.capturado && Math.abs(m.saldoIni - prev.m.saldoFin) > 0.5)
      aviso("El saldo inicial de " + nombre + " ($" + m.saldoIni.toLocaleString("es-MX") + ") no es el saldo final de " + prev.h.getName() + " ($" + prev.m.saldoFin.toLocaleString("es-MX") + ").");
    if (prev && m.capturado && prev.m.capturado && JSON.stringify(m.ingresos) === JSON.stringify(prev.m.ingresos) && JSON.stringify(m.egresos) === JSON.stringify(prev.m.egresos))
      alerta(nombre + " tiene exactamente las mismas cifras que " + prev.h.getName() + ": ¿se copió la pestaña sin capturar?");
    prev = { h: h, id: x.id, m: m };
  });
  if (hoy.getDate() >= 5 && !info.some(x => x.id === ant && leerMesVivo_(x.h, x.id).capturado))
    aviso("El mes anterior (" + ant + ") todavía no tiene cobros ni gastos capturados.");
  gastosDeEjemplo_().forEach(g => aviso("¿Gasto de ejemplo de la plantilla? " + g));

  /* 2 · Agua */
  const hA = ss.getSheetByName(HOJA_AGUA), hR = ss.getSheetByName(HOJA_RECIBOS);
  if (hA && hA.getLastRow() > 1) {
    const filas = hA.getRange(2, 1, hA.getLastRow() - 1, ENC_AGUA.length).getValues();
    const meses = filas.map(f => mesTexto_(f[0])).filter(m => /^\d{4}-\d{2}$/.test(m)).sort();
    const ult = meses[meses.length - 1];
    if (ult) {
      const delMes = filas.filter(f => mesTexto_(f[0]) === ult && claveDepto_(f[1]) >= 1 && claveDepto_(f[1]) <= UNIDADES);
      const con = {}; delMes.forEach(f => { if (f[3] !== "" && f[3] != null) con[claveDepto_(f[1])] = true; });
      const faltan = []; for (let d = 1; d <= UNIDADES; d++) if (!con[d]) faltan.push(d);
      if (faltan.length && faltan.length < UNIDADES) aviso("Lecturas de agua de " + ult + ": faltan los deptos " + faltan.join(", ") + ".");
      const consumos = delMes.map(f => Number(f[4])).filter(v => isFinite(v) && v > 0);
      const prom = consumos.length ? consumos.reduce((a, b) => a + b, 0) / consumos.length : 0;
      delMes.forEach(f => {
        const a = Number(f[2]), b = Number(f[3]), c = Number(f[4]);
        if (f[3] !== "" && isFinite(a) && isFinite(b) && b < a) alerta("Agua " + ult + " · depto " + claveDepto_(f[1]) + ": la lectura actual (" + b + ") es menor que la anterior (" + a + ").");
        else if (prom > 0 && c > prom * 3 && c > 10) aviso("Agua " + ult + " · depto " + claveDepto_(f[1]) + ": consumió " + c + " m³, más del triple del promedio (" + prom.toFixed(1) + "). ¿Fuga o lectura mal tomada?");
      });
      if (hR) {
        const rec = hR.getLastRow() > 1 ? hR.getRange(2, 1, hR.getLastRow() - 1, 2).getValues().find(f => mesTexto_(f[0]) === ult) : null;
        if (!rec || !(Number(rec[1]) > 0)) aviso("Falta capturar el recibo de la CEA de " + ult + " (pestaña Recibos agua): sin él no se calcula el cargo de cada depto.");
      }
    }
  }

  /* 3 · Pagos reportados sin revisar */
  const hP = ss.getSheetByName(HOJA_PAGOS);
  if (hP && hP.getLastRow() > 1) {
    const viejos = hP.getRange(2, 1, hP.getLastRow() - 1, ENC_PAGOS.length).getValues()
      .filter(f => String(f[9]).trim() === "Pendiente" && Object.prototype.toString.call(f[0]) === "[object Date]" && (hoy.getTime() - f[0].getTime()) > 7 * 86400000);
    if (viejos.length) aviso(viejos.length + (viejos.length === 1 ? " pago reportado lleva" : " pagos reportados llevan") + " más de una semana sin confirmar en la bandeja.");
  }

  /* 4 · Configuración */
  if (!String(cfg.clave_admin || "").trim() && CLAVE_ADMIN === "cambia-esta-clave") alerta("La bandeja de pagos usa la clave de ejemplo. Menú Condominio → Cambiar la clave de la bandeja de pagos.");
  if (String(cfg.clave_lector || "agua").trim() === "agua") aviso("La clave de lecturas.html sigue siendo «agua» (Config → clave_lector).");
  if (String(cfg.clave_egresos || "egresos").trim() === "egresos") aviso("La clave de egresos.html sigue siendo «egresos» (Config → clave_egresos).");
  if (!/pausa/i.test(String(cfg.reporte_envio || "")) && typeof correosVecinos_ === "function" && correosVecinos_().length === 0)
    aviso("La pestaña Correos está vacía: el reporte del día 10 no le llegará a ningún vecino.");

  const color = puntos.some(p => p.nivel === "alerta") ? "rojo" : puntos.length ? "amarillo" : "verde";
  return { color: color, puntos: puntos };
}

function revisarSalud() {
  const s = salud_();
  const titulo = { verde: "✅ Todo cuadra", amarillo: "⚠️ Hay cosas por revisar", rojo: "🛑 Hay errores que corregir" }[s.color];
  avisoUi_(titulo, s.puntos.length ? s.puntos.map(p => (p.nivel === "alerta" ? "• (error) " : "• ") + p.texto).join("\n") : "No encontré problemas en la hoja.");
  return s;
}

/* Bloque HTML del semáforo para el kit del día 10. */
function saludHtml_() {
  let s;
  try { s = salud_(); } catch (e) { return '<div style="background:#fff3dc;border-radius:10px;padding:12px 14px;margin-bottom:12px">No pude revisar la hoja: ' + esc_(e.message) + "</div>"; }
  const c = { verde: ["#e3f2e6", "✅ Todo cuadra en la hoja."], amarillo: ["#fff3dc", "⚠️ Revisa esto antes de compartir:"], rojo: ["#fde7e6", "🛑 Hay errores en la hoja; corrígelos antes de compartir:"] }[s.color];
  return '<div style="background:' + c[0] + ';border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:14px"><b>' + c[1] + "</b>" +
    (s.puntos.length ? '<ul style="margin:6px 0 0 18px;padding:0">' + s.puntos.map(p => "<li>" + esc_(p.texto) + "</li>").join("") + "</ul>" : "") + "</div>";
}
