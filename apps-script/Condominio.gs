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

  /* 3b · Reservas de casa club por confirmar */
  try { const pc = filasRcc_().filter(f => /por confirmar/i.test(String(f[6] || "Por confirmar")) && diaIso_(f[2]) >= Utilities.formatDate(hoy, zona, "yyyy-MM-dd"));
    if (pc.length) aviso(pc.length + " reserva(s) de casa club por confirmar: " + pc.map(f => f[0] + " (depto " + f[4] + ", " + diaIso_(f[2]) + ")").join(", ") + "."); } catch (e) {}

  /* 4 · Configuración */
  if (!String(cfg.clave_admin || "").trim() && CLAVE_ADMIN === "cambia-esta-clave") alerta("La bandeja de pagos usa la clave de ejemplo. Menú Condominio → Cambiar la clave de la bandeja de pagos.");
  if (String(cfg.clave_lector || "agua").trim() === "agua") aviso("La clave de lecturas.html sigue siendo «agua» (Config → clave_lector).");
  if (String(cfg.clave_egresos || "egresos").trim() === "egresos") aviso("La clave de egresos.html sigue siendo «egresos» (Config → clave_egresos).");
  if (!/pausa/i.test(String(cfg.reporte_envio || "")) && typeof correosVecinos_ === "function" && correosVecinos_().length === 0)
    aviso("La pestaña Correos está vacía: el reporte del día 10 no le llegará a ningún vecino. Comparte la página correo.html del sitio para que cada quien registre su correo.");
  else {
    const dc = deptosConCorreo_();
    if (dc.faltan.length) puntos.push({ nivel: "nota", texto: "Correos: " + dc.con + " de " + UNIDADES + " departamentos registrados. Faltan: " + dc.faltan.join(", ") + " (comparte la página correo.html)." });
  }

  const color = puntos.some(p => p.nivel === "alerta") ? "rojo" : puntos.some(p => p.nivel === "aviso") ? "amarillo" : "verde";
  return { color: color, puntos: puntos };
}

function revisarSalud() {
  const s = salud_();
  const titulo = { verde: "✅ Todo cuadra", amarillo: "⚠️ Hay cosas por revisar", rojo: "🛑 Hay errores que corregir" }[s.color];
  avisoUi_(titulo, s.puntos.length ? s.puntos.map(p => (p.nivel === "alerta" ? "• (error) " : p.nivel === "nota" ? "ℹ️ " : "• ") + p.texto).join("\n") : "No encontré problemas en la hoja.");
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

/* ---------- Registro de correos desde correo.html ---------- */

/* Alta o baja de un correo en la pestaña Correos. No revela si el correo ya existía.
   Candados: formato, departamento válido, campo trampa contra robots y límite por hora. */
function registrarCorreo_(d) {
  if (String(d.web || "").trim()) return { ok: true };                       // campo trampa: un robot lo llena
  const correo = String(d.correo || "").trim().toLowerCase();
  if (correo.length > 120 || !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/.test(correo)) return { ok: false, error: "correo" };
  const baja = d.baja === true || d.baja === "1" || d.baja === "si";
  const depto = parseInt(d.depto, 10);
  if (!baja && !(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  const cache = CacheService.getScriptCache();
  const k = "correo_" + Utilities.base64EncodeWebSafe(correo).slice(0, 200);
  const n = Number(cache.get(k) || 0), g = Number(cache.get("correos_hora") || 0);
  if (n >= 3 || g >= 40) return { ok: false, error: "espera" };
  cache.put(k, String(n + 1), 3600); cache.put("correos_hora", String(g + 1), 3600);

  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(REP_CORREOS);
  if (!h) { h = ss.insertSheet(REP_CORREOS); h.getRange(1, 1, 1, 4).setValues([["Depto", "Nombre", "Correo", "Recibe el reporte (sí / no)"]]).setFontWeight("bold"); h.setFrozenRows(1); }
  if (!String(h.getRange(1, 5).getValue()).trim()) h.getRange(1, 5, 1, 2).setValues([["Actualizado el", "Cómo llegó"]]).setFontWeight("bold");
  const filas = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, 4).getValues() : [];
  const mias = [];
  filas.forEach((f, i) => { if (String(f[2]).trim().toLowerCase() === correo) mias.push(i + 2); });
  const ahora = new Date();
  if (baja) {
    mias.forEach(r => { h.getRange(r, 4).setValue("no"); h.getRange(r, 5, 1, 2).setValues([[ahora, "baja desde el sitio"]]); });
    if (mias.length) MailApp.sendEmail(correo, "Ya no recibirás el reporte de Las Misiones", "Listo: dejaste de recibir el reporte mensual de cuentas de Las Misiones.\n\nSi fue un error, vuelve a registrarte en el sitio (página «Recibe el reporte»).", { name: REP_REMITENTE });
    return { ok: true };
  }
  const nombre = limpiar_(d.nombre, 60);
  if (mias.length) {
    h.getRange(mias[0], 1, 1, 6).setValues([[depto, nombre || filas[mias[0] - 2][1], correo, "sí", ahora, "formulario del sitio"]]);
  } else {
    h.getRange(h.getLastRow() + 1, 1, 1, 6).setValues([[depto, nombre, correo, "sí", ahora, "formulario del sitio"]]);
  }
  MailApp.sendEmail(correo, "Quedaste registrado · reporte mensual de Las Misiones",
    "Hola" + (nombre ? " " + nombre : "") + ":\n\nTu correo quedó registrado para recibir cada día 10 el reporte de cuentas de Las Misiones (departamento " + depto + "). " +
    "Se envía con copia oculta: nadie más ve tu correo.\n\nSi no fuiste tú o quieres dejar de recibirlo, responde a este correo o date de baja en la página «Recibe el reporte» del sitio.",
    { name: REP_REMITENTE });
  return { ok: true };
}

/* Cuántos departamentos tienen al menos un correo activo (para el semáforo). */
function deptosConCorreo_() {
  const h = SpreadsheetApp.getActive().getSheetByName(REP_CORREOS);
  const con = {};
  if (h && h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 4).getValues().forEach(f => {
    const dep = parseInt(String(f[0]).replace(/\D/g, ""), 10);
    if (dep >= 1 && dep <= UNIDADES && /@/.test(String(f[2])) && !/^no$/i.test(String(f[3]).trim())) con[dep] = true;
  });
  const faltan = []; for (let i = 1; i <= UNIDADES; i++) if (!con[i]) faltan.push(i);
  return { con: UNIDADES - faltan.length, faltan: faltan };
}

/* ---------- Mi depto: adeudo desglosado de un departamento (abierto, decisión de la mesa) ---------- */

/* Desde finanzas_desde (la mesa directiva), mes por mes: cuota vs. lo pagado de mantenimiento y
   el cargo de agua con su estatus. Antes de esa fecha: el adeudo al corte de la hoja maestra.
   Sin nombres ni correos. Los meses futuros cuentan como pagos adelantados. */
function miDepto_(depto) {
  if (!(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  const ss = SpreadsheetApp.getActive(), cfg = config_(), zona = "America/Mexico_City";
  const cuota = Number(cfg.cuota_mantenimiento) || 1500, desde = mesTexto_(cfg.finanzas_desde).trim();
  const hoyId = Utilities.formatDate(new Date(), zona, "yyyy-MM");
  const meses = [], vistos = {}, pend = pendientesPorCelda_(ss);
  const neto = (h, fila, col, v) => Math.max(0, (Number(v) || 0) - (pend[h.getName() + "!" + "ABCDEFGH".charAt(col - 1) + fila] || 0));
  ss.getSheets().forEach(h => {
    if (!esHojaMes_(h) || h.getName() === PLANTILLA) return;
    const id = idDeHojaMes_(h);
    if (!id || (desde && id < desde) || vistos[id]) return;
    vistos[id] = true;
    const vals = h.getRange(1, 2, 120, 4).getValues(), et = vals.map(f => normEt_(f[0]));
    const fC = et.indexOf("cobrospordepartamento");
    let manto = 0, agua = 0, extra = 0;
    if (fC >= 0) for (let i = fC + 1; i < et.length && et[i].indexOf("total") !== 0; i++) {
      if (et[i] === "depto" + depto) { manto = neto(h, i + 1, 3, vals[i][1]); agua = neto(h, i + 1, 4, vals[i][2]); extra = neto(h, i + 1, 5, vals[i][3]); break; }
    }
    meses.push({ id: id, nombre: capitalizar_(MESES[parseInt(id.slice(5), 10) - 1]) + " " + id.slice(0, 4), futuro: id > hoyId, enCurso: id === hoyId, cuota: id > hoyId ? 0 : cuota, manto: manto, aguaPagada: agua, extra: extra });
  });
  meses.sort((a, b) => a.id < b.id ? -1 : 1);
  /* Agua: el cargo de cada recibo (la lectura del mes M es el agua de M−1) y si ya se pagó. */
  const agua = [];
  const hA = ss.getSheetByName(HOJA_AGUA);
  if (hA && hA.getLastRow() > 1) hA.getRange(2, 1, hA.getLastRow() - 1, ENC_AGUA.length).getValues().forEach(f => {
    const mes = mesTexto_(f[0]), cargo = Number(f[8]) || 0;
    if (claveDepto_(f[1]) !== depto || !/^\d{4}-\d{2}$/.test(mes) || cargo <= 0.5) return;
    const mesAgua = mesSiguiente_(mes, -1);
    agua.push({ mes: mesAgua, nombre: capitalizar_(MESES[parseInt(mesAgua.slice(5), 10) - 1]) + " " + mesAgua.slice(0, 4), consumo: Number(f[4]) || 0, cargo: Math.round(cargo * 100) / 100, pagado: f[9] !== "" && f[9] != null });
  });
  agua.sort((a, b) => a.mes < b.mes ? -1 : 1);
  /* El agua de antes de finanzas_desde (p. ej. la de septiembre, que se lee el 9 de octubre) es de la
     administración anterior: no se cobra. */
  for (let i = agua.length - 1; i >= 0; i--) if (desde && agua[i].mes < desde) agua.splice(i, 1);
  /* Lo que la hoja tiene de agua pagada (columna Agua de las pestañas desde octubre, ya sin lo que está
     en revisión) cubre los recibos sin fecha de pago, del más viejo al más nuevo. */
  let bolsa = meses.reduce((a, m) => a + m.aguaPagada, 0) - agua.filter(a => a.pagado).reduce((a, x) => a + x.cargo, 0);
  agua.forEach(a => { if (a.pagado) return; if (bolsa >= a.cargo - 0.5) { a.pagado = true; a.enHoja = true; bolsa -= a.cargo; } });
  /* Cuota extraordinaria (Config): lo pagado en la columna Extraordinario de cualquier pestaña de mes. */
  const exMonto = Number(cfg.extraordinario_monto) || 0, exNombre = String(cfg.extraordinario_nombre || "Cuota extraordinaria").trim();
  let exPagado = 0;
  ss.getSheets().forEach(h => {
    if (!esHojaMes_(h) || h.getName() === PLANTILLA) return;
    const vals = h.getRange(1, 2, 120, 4).getValues(), et = vals.map(f => normEt_(f[0])), fC = et.indexOf("cobrospordepartamento");
    if (fC >= 0) for (let i = fC + 1; i < et.length && et[i].indexOf("total") !== 0; i++) if (et[i] === "depto" + depto) { exPagado += neto(h, i + 1, 5, vals[i][3]); break; }
  });
  /* Varias cuotas extraordinarias: Config → extraordinarias = «Nombre=monto | Nombre=monto», de la más vieja a la
     más nueva. Lo pagado en la columna Extraordinario cubre primero la más vieja. Sin esa celda se usa la de siempre
     (extraordinario_nombre / extraordinario_monto). */
  const lista = String(cfg.extraordinarias || "").split("|").map(x => x.trim()).filter(Boolean).map(x => { const k = x.lastIndexOf("="); return { nombre: x.slice(0, k).trim(), monto: Number(String(x.slice(k + 1)).replace(/[^\d.]/g, "")) || 0 }; }).filter(x => x.nombre && x.monto > 0);
  if (!lista.length && exMonto > 0) lista.push({ nombre: exNombre, monto: exMonto });
  let bolsaEx = exPagado;
  const extraordinarias = lista.map(x => { const pag = Math.min(x.monto, Math.max(0, bolsaEx)); bolsaEx -= pag; return { nombre: x.nombre, monto: x.monto, pagado: Math.round(pag * 100) / 100, pendiente: Math.round((x.monto - pag) * 100) / 100 }; });
  const pendEx = extraordinarias.filter(x => x.pendiente > 0.5);
  const extraordinaria = extraordinarias.length ? { nombre: (pendEx.length ? pendEx : extraordinarias).map(x => x.nombre).join(" + "), monto: extraordinarias.reduce((a, x) => a + x.monto, 0),
    pagado: Math.round(exPagado * 100) / 100, pendiente: Math.round(extraordinarias.reduce((a, x) => a + x.pendiente, 0) * 100) / 100, detalle: extraordinarias } : null;
  let saldoManto = 0, adelantado = 0;
  meses.forEach(m => { m.diferencia = Math.round((m.manto - m.cuota) * 100) / 100; if (m.futuro) adelantado += m.manto; else saldoManto += m.manto - m.cuota; });
  const aguaPendiente = agua.filter(a => !a.pagado).reduce((s, a) => s + a.cargo, 0);
  const debeManto = Math.max(0, -saldoManto), aFavor = Math.max(0, saldoManto);
  /* Antes de la mesa: adeudo al corte (si Config → adeudos = mostrar). */
  let previo = null;
  const ad = ss.getSheetByName(HOJA_ADEUDOS);
  if (ad && String(cfg.adeudos || "").trim().toLowerCase() === "mostrar") {
    const fc = ad.createTextFinder("Fecha de corte").matchCase(false).findNext();
    const celda = ad.createTextFinder("^Depto " + depto + "$").useRegularExpression(true).matchEntireCell(true).findNext();
    if (celda) { const v = ad.getRange(celda.getRow(), celda.getColumn() + 2, 1, 4).getValues()[0].map(x => Number(x) || 0); previo = { corte: fc ? ad.getRange(fc.getRow(), fc.getColumn() + 1).getDisplayValue() : "", mantenimiento: v[0], agua: v[1], extraordinario: v[2], total: v[3] }; }
  }
  const est = estadoDepto_(depto);
  return {
    ok: true, depto: depto, cuota: cuota, desde: desde, hoy: hoyId,
    total: Math.round((debeManto + aguaPendiente + (extraordinaria ? extraordinaria.pendiente : 0)) * 100) / 100, extraordinaria: extraordinaria, debeManto: Math.round(debeManto * 100) / 100, aFavor: Math.round(aFavor * 100) / 100, adelantado: Math.round(adelantado * 100) / 100, aguaPendiente: Math.round(aguaPendiente * 100) / 100,
    meses: meses, agua: agua, previo: previo, previoEnRevision: !previo, pagos: est.pagos || [], cuenta: est.cuenta || ""
  };
}

/* Lo que un pago reportado y aún NO confirmado escribió en la hoja, por celda ("Octubre!C20" → 1500).
   La bandeja anota el monto en amarillo al recibirlo (columna M de Pagos guarda dónde); mientras no se
   confirme, no cuenta como pagado en Mi depto. Lo capturado a mano en la hoja sí cuenta. */
function pendientesPorCelda_(ss) {
  const out = {}, h = ss.getSheetByName(HOJA_PAGOS);
  if (!h || h.getLastRow() < 2) return out;
  h.getRange(2, 1, h.getLastRow() - 1, ENC_PAGOS.length).getValues().forEach(f => {
    const est = String(f[9] || "Pendiente").trim(), celdas = String(f[12] || "");
    if (/confirm|rechaz/i.test(est) || !celdas || celdas.indexOf(RETIRADO) === 0) return;
    celdas.split(";").forEach(r => { const p = r.split("="); const m = Number(p[p.length - 1]); if (p[0] && isFinite(m)) out[p[0]] = (out[p[0]] || 0) + m; });
  });
  return out;
}

/* ---------- Reservas de la casa club (casa-club.html) ---------- */
/* Pestaña «Reservas casa club». El vecino pide día y horario; la mesa cambia el Estatus a Confirmada o
   Rechazada en la hoja. El calendario público muestra solo días y horarios ocupados (sin depto). */
const HOJA_RCC = "Reservas casa club";
const ENC_RCC = ["Folio", "Solicitada el", "Día", "Horario", "Depto", "Correo (privado)", "Estatus", "Nota de la mesa"];
const HORARIOS_CC = ["Mañana · 9 a 14 h", "Tarde · 15 a 20 h", "Noche · 19 a 23 h", "Día completo"];

function hojaRcc_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_RCC);
  if (!h) {
    h = ss.insertSheet(HOJA_RCC);
    h.getRange(1, 1, 1, ENC_RCC.length).setValues([ENC_RCC]).setFontWeight("bold"); h.setFrozenRows(1);
    try { h.getRange(2, 7, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["Por confirmar", "Confirmada", "Rechazada", "Cancelada"], true).setAllowInvalid(true).build()); } catch (e) {}
  }
  return h;
}
function filasRcc_() { const h = SpreadsheetApp.getActive().getSheetByName(HOJA_RCC); return h && h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, ENC_RCC.length).getValues() : []; }
function diaIso_(v) { return Object.prototype.toString.call(v) === "[object Date]" ? Utilities.formatDate(v, "America/Mexico_City", "yyyy-MM-dd") : String(v || "").slice(0, 10); }
const activaRcc_ = f => /por confirmar|confirmada/i.test(String(f[6] || "Por confirmar"));
const chocaRcc_ = (a, b) => a === b || a === "Día completo" || b === "Día completo" || (/Tarde/.test(a) && /Noche/.test(b)) || (/Noche/.test(a) && /Tarde/.test(b));

function reservasCasa_(depto) {
  const hoy = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd"), cfg = config_();
  const filas = filasRcc_();
  const ocupados = filas.filter(f => activaRcc_(f) && diaIso_(f[2]) >= hoy).map(f => ({ dia: diaIso_(f[2]), horario: String(f[3]), estatus: /confirmada/i.test(String(f[6])) ? "ocupado" : "apartado" }));
  const r = { ok: true, ocupados: ocupados, horarios: HORARIOS_CC, costo: Number(cfg.casa_club_monto) || 500,
    reglas: String(cfg.reglas_casa_club || "Sujeto a confirmación de la mesa. Hasta 90 días antes, 2 reservas activas por depto.") };
  const d = parseInt(depto, 10);
  if (d >= 1 && d <= UNIDADES) r.mias = filas.filter(f => Number(f[4]) === d && diaIso_(f[2]) >= hoy).map(f => ({ folio: String(f[0]), dia: diaIso_(f[2]), horario: String(f[3]), estatus: String(f[6] || "Por confirmar"), nota: String(f[7] || "") }));
  return r;
}

function reservarCasa_(d) {
  if (String(d.web || "").trim()) return { ok: true, folio: "" };
  const depto = parseInt(d.depto, 10), dia = String(d.dia || "").slice(0, 10), horario = String(d.horario || "");
  if (!(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  if (HORARIOS_CC.indexOf(horario) < 0) return { ok: false, error: "horario" };
  const hoy = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd"), tope = Utilities.formatDate(new Date(Date.now() + 90 * 864e5), "America/Mexico_City", "yyyy-MM-dd");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < hoy) return { ok: false, error: "dia" };
  if (dia > tope) return { ok: false, error: "lejos" };
  const correo = String(d.correo || "").trim().toLowerCase();
  if (correo && !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/.test(correo)) return { ok: false, error: "correo" };
  const filas = filasRcc_();
  if (filas.some(f => activaRcc_(f) && diaIso_(f[2]) === dia && chocaRcc_(String(f[3]), horario))) return { ok: false, error: "ocupado" };
  if (filas.filter(f => Number(f[4]) === depto && activaRcc_(f) && diaIso_(f[2]) >= hoy).length >= 2) return { ok: false, error: "tope" };
  const props = PropertiesService.getScriptProperties(), n = Number(props.getProperty("folio_casa") || 0) + 1;
  props.setProperty("folio_casa", String(n));
  const folio = "CC-" + ("000" + n).slice(-4), h = hojaRcc_();
  h.getRange(h.getLastRow() + 1, 1, 1, ENC_RCC.length).setValues([[folio, new Date(), dia, horario, depto, correo, "Por confirmar", ""]]);
  h.getRange(h.getLastRow(), 3).setNumberFormat("yyyy-mm-dd");
  const cfg = config_(), copia = String(cfg.reporte_copia || Session.getEffectiveUser().getEmail());
  MailApp.sendEmail(copia, "Casa club: reserva por confirmar " + folio, "Depto " + depto + " pide la casa club el " + dia + " (" + horario + ").\n\nConfírmala o recházala en la pestaña «" + HOJA_RCC + "» (columna Estatus).", { name: REP_REMITENTE });
  if (correo) MailApp.sendEmail(correo, "Recibimos tu reserva de la casa club " + folio, "Día: " + dia + " · " + horario + "\nEstatus: por confirmar.\n\nLa mesa directiva te confirmará. Puedes verla en la página «Casa club» del sitio.", { name: REP_REMITENTE });
  return { ok: true, folio: folio };
}

function cancelarCasa_(d) {
  const folio = String(d.folio || "").trim().toUpperCase(), depto = parseInt(d.depto, 10);
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_RCC);
  const filas = filasRcc_(), i = filas.findIndex(f => String(f[0]).toUpperCase() === folio && Number(f[4]) === depto);
  if (!h || i < 0) return { ok: false, error: "no encontrado" };
  h.getRange(i + 2, 7).setValue("Cancelada");
  const cfg = config_();
  MailApp.sendEmail(String(cfg.reporte_copia || Session.getEffectiveUser().getEmail()), "Casa club: reserva cancelada " + folio, "Depto " + depto + " canceló su reserva del " + diaIso_(filas[i][2]) + " (" + filas[i][3] + "). El horario quedó libre.", { name: REP_REMITENTE });
  return { ok: true };
}
