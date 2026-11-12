/* Las Misiones · Reporte mensual a los vecinos (PDF + correo + kit de WhatsApp)
   Va como SEGUNDO archivo del mismo proyecto de Apps Script que Code.gs
   (en el editor: "+" → Secuencia de comandos → nombre "Reporte" → pegar esto).
   Usa finanzas_() y config_() de Code.gs: las mismas cifras AGREGADAS que
   finanzas.html. Nunca lleva datos por departamento.

   Qué hace el día 10 de cada mes (9 a 10 de la mañana), con el mes anterior:
   1. Arma el reporte en PDF (una hoja carta) y lo guarda en Drive, carpeta
      "Misiones · Reportes / AAAA-MM".
   2. Lo envía por correo a los vecinos de la pestaña "Correos" (en copia
      oculta: nadie ve el correo de los demás), con un resumen en el cuerpo.
   3. Te manda al correo de "reporte_copia" el kit de WhatsApp: el texto, un
      botón que abre WhatsApp con el mensaje ya escrito y dos botones que abren
      las infografías del mes (cuotas y agua) en infografia.html, donde con un
      toque se comparten como imagen. Cada mes cambia el estilo (edificio de
      noche, calle de casitas, alcancía; tinaco, gotas, vaso). WhatsApp no
      permite publicar en grupos de forma automática: tú lo reenvías al grupo.

   Candados:
   - Si el mes no tiene datos capturados, NO envía nada a los vecinos y te
     avisa a ti.
   - Un mes se envía una sola vez (aunque el disparador corra de nuevo).
   - Config → reporte_envio = "pausa" detiene los envíos a vecinos; el kit te
     sigue llegando a ti.

   Para instalar: Ejecutar → instalarReporte (una vez). Para probar sin
   molestar a nadie: menú "Reporte a vecinos" → "Probar (solo a mí)". */

const REP_CORREOS = "Correos";
const REP_BITACORA = "Reportes";
const REP_CARPETA = "Misiones · Reportes";
const REP_SITIO = "https://eduardolusan-source.github.io/condominio-misiones/finanzas.html";
const REP_INFOGRAFIA = "https://eduardolusan-source.github.io/condominio-misiones/infografia.html";
const REP_REMITENTE = "Mesa directiva · Las Misiones";
const REP_RUBROS = [
  ["Administración", /administraci/i], ["Limpieza y conserjería", /limpieza|conserj/i], ["Luz de áreas comunes", /\bluz\b|cfe/i],
  ["Jardinería", /jard/i], ["Alberca", /alberca/i], ["Elevador", /elevador/i], ["Vigilancia", /vigilan|seguridad/i]
];
const REP_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/* ============================ MENÚ Y ARRANQUE ============================ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Reporte a vecinos")
    .addItem("Probar (solo a mí)", "reportePrueba")
    .addItem("Enviar ahora el mes anterior a los vecinos", "reporteAhora")
    .addSeparator()
    .addItem("Instalar o reparar la programación (día 10)", "instalarReporte")
    .addToUi();
}

/* Una vez: pestañas Correos y Reportes, claves de Config y el disparador mensual. */
function instalarReporte() {
  const ss = SpreadsheetApp.getActive();
  const hechos = [];
  let h = ss.getSheetByName(REP_CORREOS);
  if (!h) {
    h = ss.insertSheet(REP_CORREOS);
    h.getRange(1, 1, 1, 4).setValues([["Depto", "Nombre", "Correo", "Recibe el reporte (sí / no)"]]).setFontWeight("bold");
    h.setFrozenRows(1);
    h.setColumnWidth(2, 220); h.setColumnWidth(3, 260); h.setColumnWidth(4, 190);
    h.getRange("D2:D200").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["sí", "no"], true).setAllowInvalid(true).build());
    hechos.push("pestaña Correos");
  }
  if (!ss.getSheetByName(REP_BITACORA)) {
    const b = ss.insertSheet(REP_BITACORA);
    b.getRange(1, 1, 1, 6).setValues([["Fecha", "Mes", "Qué pasó", "Destinatarios", "PDF", "Infografía de cuotas"]]).setFontWeight("bold");
    b.setFrozenRows(1);
    hechos.push("pestaña Reportes (bitácora)");
  }
  const cfg = ss.getSheetByName("Config");
  if (cfg) {
    const claves = cfg.getRange(1, 1, Math.max(cfg.getLastRow(), 1), 1).getValues().map(f => String(f[0]).trim());
    const yo = Session.getEffectiveUser().getEmail();
    [["reporte_envio", "automático", "automático: el día 10 se envía el mes anterior a la pestaña Correos · pausa: no se envía a vecinos (el kit te sigue llegando)"],
     ["reporte_copia", yo, "correo que recibe la copia del reporte y el kit de WhatsApp (infografía y texto)"]]
      .forEach(f => { if (claves.indexOf(f[0]) < 0) { cfg.appendRow(f); hechos.push("Config: " + f[0]); } });
  }
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "reporteProgramado").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("reporteProgramado").timeBased().onMonthDay(10).atHour(9).inTimezone("America/Mexico_City").create();
  hechos.push("envío programado el día 10 de cada mes a las 9");
  const msg = "Listo: " + hechos.join(", ") + ".";
  Logger.log(msg);
  try { ss.toast(msg, "Reporte a vecinos", 10); } catch (_) { /* sin hoja abierta */ }
}

/* Lo llama el disparador del día 10. */
function reporteProgramado() { generarReporte_({ modo: "vecinos" }); }
/* Menú: manda el reporte del último mes capturado SOLO a reporte_copia. */
function reportePrueba() { generarReporte_({ modo: "prueba" }); }
/* Menú: manda ya el mes anterior a los vecinos (respeta el candado de una sola vez). */
function reporteAhora() { generarReporte_({ modo: "vecinos" }); }

/* ============================ GENERACIÓN ============================ */

function generarReporte_(opc) {
  const cfg = config_();
  const copia = String(cfg.reporte_copia || Session.getEffectiveUser().getEmail()).trim();
  const d = finanzas_(true);
  const props = PropertiesService.getScriptProperties();

  /* Mes a reportar: el anterior al de hoy, ya cerrado (también en la prueba; si ese
     no tiene datos, la prueba usa el último cerrado que sí tenga). Nunca un mes futuro. */
  const hoy = new Date();
  const ant = new Date(Number(Utilities.formatDate(hoy, "America/Mexico_City", "yyyy")), Number(Utilities.formatDate(hoy, "America/Mexico_City", "M")) - 2, 1);
  const mesAnterior = Utilities.formatDate(ant, "America/Mexico_City", "yyyy-MM");
  const cerrados = d.meses.filter(x => x.id <= mesAnterior);
  const objetivo = opc.mes || (opc.modo === "prueba" && !d.meses.some(x => x.id === mesAnterior) && cerrados.length ? cerrados[cerrados.length - 1].id : mesAnterior);
  const m = d.meses.find(x => x.id === objetivo);
  const nombreMes = REP_MESES[parseInt(objetivo.slice(5), 10) - 1] + " " + objetivo.slice(0, 4);

  if (!m) {
    MailApp.sendEmail(copia, "⚠ No se envió el reporte de " + nombreMes,
      "La pestaña de " + nombreMes + " no tiene cobros ni gastos capturados, así que no se envió nada a los vecinos.\n\n" +
      "Cuando esté capturada, usa en la hoja el menú «Reporte a vecinos → Enviar ahora el mes anterior a los vecinos».", { name: REP_REMITENTE });
    bitacora_(objetivo, "No enviado: el mes no tiene datos", "", "", "");
    return;
  }
  if (opc.modo === "vecinos" && props.getProperty("reporteEnviado_" + objetivo)) {
    Logger.log("El reporte de " + objetivo + " ya se había enviado; no se repite.");
    return;
  }

  const k = indicadores_(d, m);
  const carpeta = carpetaReporte_(objetivo);
  const pdf = pdfReporte_(k).setName("Las Misiones · cuentas de " + nombreMes + ".pdf");
  const archivoPdf = carpeta.createFile(pdf);
  const whatsapp = textoWhatsapp_(k);

  /* 1 · A los vecinos */
  let destinatarios = [];
  const pausa = /pausa/i.test(String(cfg.reporte_envio || ""));
  if (opc.modo === "vecinos" && !pausa) {
    destinatarios = correosVecinos_();
    if (destinatarios.length) {
      const adjuntos = [pdf];
      /* De 40 en 40 en copia oculta: nadie ve el correo de los demás. */
      for (let i = 0; i < destinatarios.length; i += 40) {
        MailApp.sendEmail(copia, "Las cuentas de " + nombreMes + " · Las Misiones", textoPlano_(k), {
          name: REP_REMITENTE, bcc: destinatarios.slice(i, i + 40).join(","), htmlBody: correoVecinos_(k), attachments: adjuntos
        });
      }
      props.setProperty("reporteEnviado_" + objetivo, new Date().toISOString());
    }
  }

  /* 2 · A ti: copia + kit de WhatsApp */
  const estado = opc.modo === "prueba" ? "PRUEBA: no se envió a los vecinos."
    : pausa ? "En pausa (Config → reporte_envio): no se envió a los vecinos."
    : destinatarios.length ? "Enviado a " + destinatarios.length + " correos de vecinos (en copia oculta)."
    : "La pestaña Correos no tiene correos todavía: no se envió a los vecinos.";
  MailApp.sendEmail(copia, (opc.modo === "prueba" ? "[Prueba] " : "") + "Kit de " + nombreMes + " para WhatsApp · Las Misiones", whatsapp, {
    name: REP_REMITENTE, attachments: [pdf],
    htmlBody: kitHtml_(k, whatsapp, estado, archivoPdf.getUrl())
  });
  bitacora_(objetivo, estado, destinatarios.length, archivoPdf.getUrl(), REP_INFOGRAFIA + "?tipo=cuotas&mes=" + objetivo);
}

/* ============================ CIFRAS ============================ */

function indicadores_(d, m) {
  const U = d.unidades || 16, cuota = d.cuota || 1500;
  const ing = m.ingresos.manto + m.ingresos.agua + (m.ingresos.extra || 0) + (m.ingresos.casaClub || 0);
  const egr = m.egresos.ordinarios + m.egresos.extraordinarios;
  const aguaPagada = m.detalle.ordinarios.filter(it => /^agua/i.test(it[0])).reduce((a, it) => a + it[1], 0);
  const rub = REP_RUBROS.map(r => [r[0], 0]);
  let otros = 0;
  m.detalle.ordinarios.forEach(it => {
    if (/^agua/i.test(it[0])) return;
    const i = REP_RUBROS.findIndex(r => r[1].test(it[0]));
    if (i < 0) otros += it[1]; else rub[i][1] += it[1];
  });
  const rubros = rub.filter(r => r[1] > 0.5).sort((a, b) => b[1] - a[1]).map(r => [r[0], r[1] / U]);
  if (otros > 0.5) rubros.push(["Otros gastos", otros / U]);
  const delAnio = d.meses.filter(x => x.anio === m.anio && x.id <= m.id);
  const resAnio = delAnio.reduce((a, x) => a + x.ingresos.manto + x.ingresos.agua + (x.ingresos.extra || 0) + (x.ingresos.casaClub || 0) - x.egresos.ordinarios - x.egresos.extraordinarios, 0);
  const mesNum = parseInt(m.id.slice(5), 10);
  return {
    id: m.id, mes: REP_MESES[mesNum - 1], anio: m.anio, unidades: U, cuota: cuota,
    saldoIni: m.saldoIni, saldoFin: m.saldoFin, ing: ing, egr: egr, res: ing - egr,
    manto: m.ingresos.manto, aguaCobrada: m.ingresos.agua, extra: (m.ingresos.extra || 0) + (m.ingresos.casaClub || 0),
    ordinarios: m.egresos.ordinarios, extraordinarios: m.egresos.extraordinarios,
    gastos: m.detalle.ordinarios.concat(m.detalle.extraordinarios).slice().sort((a, b) => b[1] - a[1]),
    pagaron: m.cobranza.pagaron, mora: m.mora || null, aguaPagada: aguaPagada,
    cobertura: aguaPagada ? Math.round(m.ingresos.agua / aguaPagada * 100) : null,
    rubros: rubros, costoUnidad: rubros.reduce((a, r) => a + r[1], 0),
    resAnio: resAnio, mesesAnio: delAnio.length, desde: d.desde || "",
    carpeta: m.carpeta || "",
    aguaPend: (d.aguaCobro || []).slice(-1)[0] || null      // último mes del agua con cargos: cuántos deptos deben su recibo (agregado)
  };
}

/* ============================ FORMATOS ============================ */

function $_(v) { v = Math.round(v); return (v < 0 ? "−$" : "$") + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function esc_(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function may_(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function textoWhatsapp_(k) {
  const l = ["*Las Misiones · Cuentas de " + k.mes + " " + k.anio + "* 🏠", ""];
  l.push("💰 Saldo en caja: *" + $_(k.saldoFin) + "*");
  l.push("📥 Entró " + $_(k.ing) + " · 📤 Salió " + $_(k.egr));
  l.push(k.res >= 0 ? "✅ Sobraron " + $_(k.res) : "⚠️ Faltaron " + $_(-k.res));
  l.push("👥 Pagaron su cuota: " + k.pagaron + " de " + k.unidades);
  if (k.mora) l.push(k.mora.acumulada > 0.5 ? "⏳ Cuotas atrasadas: " + $_(k.mora.acumulada) + " (" + k.mora.unidades + (k.mora.unidades === 1 ? " depto" : " deptos") + ")" : "⏳ Nadie debe cuotas desde " + (k.desde ? REP_MESES[parseInt(k.desde.slice(5), 10) - 1] : "que inició la mesa"));
  if (k.cobertura != null) l.push("💧 Agua: lo cobrado cubrió el " + k.cobertura + "% del recibo");
  if (k.aguaPend && k.aguaPend.pendientes > 0) l.push("🚰 Agua de " + REP_MESES[parseInt(k.aguaPend.mesAgua.slice(5), 10) - 1] + ": " + k.aguaPend.pendientes + (k.aguaPend.pendientes === 1 ? " depto tiene" : " deptos tienen") + " su recibo pendiente. Tu ticket está en la página Agua del sitio.");
  l.push("", "Detalle completo y comprobantes 👇", REP_SITIO, "", "_Las cifras de morosidad son siempre agregadas, sin identificar a nadie._");
  return l.join("\n");
}

function textoPlano_(k) {
  return "Las cuentas de " + k.mes + " " + k.anio + " · Las Misiones\n\n" + textoWhatsapp_(k).replace(/\*/g, "").replace(/_/g, "") + "\n\nVa adjunto el reporte en PDF.";
}

/* Cuerpo del correo a los vecinos: corto, con los números grandes. */
function correoVecinos_(k) {
  const fila = (et, v, color) => '<tr><td style="padding:8px 0;color:#52514e;font-size:15px">' + et + '</td><td style="padding:8px 0;text-align:right;font-size:17px;font-weight:700;color:' + (color || "#0b0b0b") + '">' + v + "</td></tr>";
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0b0b0b">' +
    '<div style="background:#1d3f63;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0"><div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;opacity:.8">Las Misiones Residencial</div><div style="font-size:24px;font-weight:700;margin-top:4px">Las cuentas de ' + k.mes + " " + k.anio + "</div></div>" +
    '<div style="border:1px solid #e1e0d9;border-top:0;border-radius:0 0 14px 14px;padding:20px 24px">' +
    '<div style="font-size:13px;color:#52514e;text-transform:uppercase;letter-spacing:1px">Saldo en caja al cierre</div><div style="font-size:38px;font-weight:800;color:' + (k.saldoFin < 0 ? "#b3261e" : "#1d3f63") + '">' + $_(k.saldoFin) + "</div>" +
    '<table style="width:100%;border-collapse:collapse;margin-top:10px">' +
    fila("Entró en el mes", $_(k.ing)) + fila("Salió en el mes", $_(k.egr)) +
    fila(k.res >= 0 ? "Sobró" : "Faltó", $_(Math.abs(k.res)), k.res >= 0 ? "#006300" : "#b3261e") +
    fila("Pagaron su cuota", k.pagaron + " de " + k.unidades) +
    (k.mora ? fila("Cuotas atrasadas", $_(k.mora.acumulada) + (k.mora.acumulada > 0.5 ? " · " + k.mora.unidades + (k.mora.unidades === 1 ? " depto" : " deptos") : ""), k.mora.acumulada > 0.5 ? "#b3261e" : "#006300") : "") +
    (k.cobertura != null ? fila("Agua: lo cobrado cubrió", k.cobertura + "% del recibo") : "") + "</table>" +
    '<p style="margin:22px 0 6px"><a href="' + REP_SITIO + '" style="display:inline-block;background:#1d3f63;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Ver el detalle y los comprobantes</a></p>' +
    '<p style="font-size:13px;color:#898781;line-height:1.5">Va adjunto el reporte en PDF. La morosidad se publica siempre agregada, sin identificar a nadie. Si prefieres no recibir estos correos, responde a este mensaje.</p></div></div>';
}

/* Correo para ti: el kit listo para reenviar al grupo de WhatsApp. */
function kitHtml_(k, whatsapp, estado, urlPdf) {
  const wa = "https://wa.me/?text=" + encodeURIComponent(whatsapp);
  const boton = (url, t, color) => '<a href="' + url + '" style="display:inline-block;background:' + color + ';color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700;margin:4px 6px 4px 0">' + t + "</a>";
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">' +
    '<p style="font-size:15px"><b>' + esc_(estado) + "</b></p>" +
    '<p><a href="' + wa + '" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Abrir WhatsApp con el mensaje escrito</a></p>' +
    '<p style="font-size:14px;color:#52514e">En el celular: toca el botón, elige el grupo y envía. Después abre una infografía y toca «Compartir a WhatsApp».</p>' +
    "<p>" + boton(REP_INFOGRAFIA + "?tipo=cuotas&mes=" + k.id, "🏢 Cierre de " + k.mes + ": quién pagó", "#1d3f63") +
    boton(REP_INFOGRAFIA + "?tipo=avance", "📈 Avance del mes en curso", "#3fae5a") + boton(REP_INFOGRAFIA + "?tipo=agua&mes=" + k.id, "💧 ¿Alcanzó para el agua?", "#2f7fb5") +
    (k.aguaPend ? boton(REP_INFOGRAFIA + "?tipo=aguadeuda&mes=" + k.aguaPend.mesAgua, "🚰 Agua por pagar (" + k.aguaPend.pendientes + ")", "#b3261e") : "") + "</p>" +
    '<pre style="white-space:pre-wrap;background:#f4f4f1;border-radius:10px;padding:14px;font-size:14px;font-family:inherit">' + esc_(whatsapp) + "</pre>" +
    '<p style="font-size:13px;color:#898781">El reporte PDF va adjunto y queda en Drive: <a href="' + urlPdf + '">abrir</a>.</p></div>';
}

/* ============================ PDF ============================ */

function pdfReporte_(k) {
  const td = "padding:6px 8px;border-bottom:1px solid #e1e0d9;font-size:11px";
  const tarjeta = (et, v, sub, color) => '<td style="width:33%;padding:6px"><div style="border:1px solid #d6e2ee;border-radius:10px;padding:10px 12px;background:#fbfcfd">' +
    '<div style="font-size:9px;color:#52514e;text-transform:uppercase;letter-spacing:1px">' + et + '</div><div style="font-size:20px;font-weight:bold;color:' + (color || "#0b0b0b") + '">' + v + '</div><div style="font-size:9.5px;color:#898781">' + sub + "</div></div></td>";
  const maxR = Math.max.apply(null, k.rubros.map(r => r[1]).concat([1]));
  const barras = k.rubros.map(r => '<tr><td style="font-size:10.5px;padding:3px 6px;width:38%">' + esc_(r[0]) + '</td><td style="padding:3px 0"><table style="border-collapse:collapse;width:' + Math.max(2, Math.round(r[1] / maxR * 100)) + '%"><tr><td style="background:#1d3f63;height:11px;font-size:1px">&nbsp;</td></tr></table></td><td style="font-size:10.5px;text-align:right;width:16%;font-weight:bold">' + $_(r[1]) + "</td></tr>").join("");
  const gastos = k.gastos.slice(0, 14).map(g => '<tr><td style="' + td + '">' + esc_(g[0]) + '</td><td style="' + td + ';text-align:right">' + $_(g[1]) + "</td></tr>").join("");
  const html = '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,Helvetica,sans-serif;color:#0b0b0b;margin:0">' +
    '<table style="width:100%;border-collapse:collapse;background:#1d3f63;color:#ffffff"><tr><td style="padding:18px 22px"><div style="font-size:10px;letter-spacing:2px;text-transform:uppercase">Las Misiones Residencial · Rendición de cuentas</div><div style="font-size:24px;font-weight:bold;margin-top:4px">' + may_(k.mes) + " " + k.anio + '</div></td><td style="padding:18px 22px;text-align:right;font-size:10px">Saldo en caja al cierre<br><span style="font-size:26px;font-weight:bold">' + $_(k.saldoFin) + "</span><br>inició el mes en " + $_(k.saldoIni) + "</td></tr></table>" +
    '<table style="width:100%;border-collapse:collapse;margin-top:10px"><tr>' +
    tarjeta("Entró", $_(k.ing), "mantenimiento " + $_(k.manto) + " · agua " + $_(k.aguaCobrada)) +
    tarjeta("Salió", $_(k.egr), "ordinarios " + $_(k.ordinarios) + " · extraordinarios " + $_(k.extraordinarios)) +
    tarjeta(k.res >= 0 ? "Sobró" : "Faltó", $_(Math.abs(k.res)), "en " + k.anio + ": " + (k.resAnio >= 0 ? "+" : "") + $_(k.resAnio) + " (" + k.mesesAnio + (k.mesesAnio === 1 ? " mes" : " meses") + ")", k.res >= 0 ? "#006300" : "#b3261e") +
    "</tr><tr>" +
    tarjeta("Pagaron su cuota", k.pagaron + " de " + k.unidades, Math.round(k.pagaron / k.unidades * 100) + "% de las unidades") +
    tarjeta("Cuotas atrasadas", k.mora ? $_(k.mora.acumulada) : "—", k.mora ? (k.mora.unidades + (k.mora.unidades === 1 ? " depto" : " deptos") + " · adelantado " + $_(k.mora.adelantos || 0)) : "sin calcular", k.mora && k.mora.acumulada > 0.5 ? "#b3261e" : "#006300") +
    tarjeta("Agua", k.cobertura != null ? k.cobertura + "%" : "—", "del recibo se cubrió con lo cobrado (" + $_(k.aguaCobrada) + " de " + $_(k.aguaPagada) + ")") +
    "</tr></table>" +
    '<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr><td style="width:52%;vertical-align:top;padding:6px">' +
    '<div style="font-size:12px;font-weight:bold;margin:4px 0 6px">¿En qué se fue tu cuota de ' + $_(k.cuota) + " este mes?</div>" +
    '<table style="width:100%;border-collapse:collapse">' + barras + "</table>" +
    '<div style="font-size:9.5px;color:#52514e;margin-top:6px">Gasto ordinario por unidad, sin el recibo de agua (que se cobra aparte por medidor): <b>' + $_(k.costoUnidad) + "</b> · " + (k.cuota - k.costoUnidad >= 0 ? "sobran " + $_(k.cuota - k.costoUnidad) : "faltan " + $_(k.costoUnidad - k.cuota)) + " por unidad.</div></td>" +
    '<td style="width:48%;vertical-align:top;padding:6px"><div style="font-size:12px;font-weight:bold;margin:4px 0 6px">Gastos del mes</div><table style="width:100%;border-collapse:collapse">' + gastos +
    '<tr><td style="' + td + ';font-weight:bold">Total</td><td style="' + td + ';text-align:right;font-weight:bold">' + $_(k.egr) + "</td></tr></table>" +
    (k.gastos.length > 14 ? '<div style="font-size:9px;color:#898781">… y ' + (k.gastos.length - 14) + " gastos más en el sitio.</div>" : "") + "</td></tr></table>" +
    '<div style="margin:12px 6px 0;padding:10px 12px;background:#f4f4f1;border-radius:8px;font-size:9.5px;color:#52514e;line-height:1.5">Detalle completo, gráficas y comprobantes: <b>' + REP_SITIO + "</b>" + (k.carpeta ? "<br>Comprobantes del mes en Drive: " + esc_(k.carpeta) : "") +
    "<br>Cifras tomadas de la hoja de captura de la mesa directiva. La morosidad se publica siempre agregada, sin identificar a ningún departamento ni condómino. Cada condómino tiene cinco días para formular observaciones (art. 19, fracc. XI); la aprobación formal corresponde a la asamblea (art. 24).</div>" +
    "</body></html>";
  return Utilities.newBlob(html, "text/html", "reporte.html").getAs("application/pdf");
}

/* ============================ APOYOS ============================ */

function correosVecinos_() {
  const h = SpreadsheetApp.getActive().getSheetByName(REP_CORREOS);
  if (!h || h.getLastRow() < 2) return [];
  const vistos = {};
  return h.getRange(2, 1, h.getLastRow() - 1, 4).getValues()
    .filter(f => !/^no$/i.test(String(f[3]).trim()))
    .map(f => String(f[2]).trim().toLowerCase())
    .filter(c => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(c) && !vistos[c] && (vistos[c] = true));
}

function carpetaReporte_(id) {
  const it = DriveApp.getFoldersByName(REP_CARPETA);
  const raiz = it.hasNext() ? it.next() : DriveApp.createFolder(REP_CARPETA);
  const sub = raiz.getFoldersByName(id);
  return sub.hasNext() ? sub.next() : raiz.createFolder(id);
}

function bitacora_(mes, que, n, urlPdf, urlInfo) {
  const h = SpreadsheetApp.getActive().getSheetByName(REP_BITACORA);
  if (!h) return;
  h.insertRowBefore(2);
  h.getRange(2, 1, 1, 6).setValues([[new Date(), mes, que, n === "" ? "" : n, urlPdf, urlInfo]]);
  h.getRange(2, 2).setNumberFormat("@").setValue(mes);
}
