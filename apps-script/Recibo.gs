/* Las Misiones · Recibo de pago (séptimo archivo del proyecto de Apps Script)

   Cuando la mesa confirma un pago (bandeja.html o la columna Estatus de la pestaña Pagos):
   1. El vecino ve su recibo en «Mi depto» (mi-depto.html pide ?accion=reciboPago&depto=N&folio=P-0000).
   2. Puede descargarlo en PDF, con membrete (la misma petición con &pdf=1).
   3. Le llega por correo, con el PDF adjunto, a los correos de su depto en la pestaña «Correos»
      y al que haya escrito al registrar el pago (columna O de Pagos).

   Un recibo = una transferencia. Si alguien pagó tres meses de un jalón, la hoja guarda tres
   renglones con la misma fecha y hora: salen juntos en un solo recibo, y el correo se manda
   cuando el último de los tres queda resuelto.

   Privacidad: el recibo dice «Departamento N», nunca un nombre, porque «Mi depto» se consulta
   sin clave. Los correos viven solo en la hoja (columnas O y P de Pagos, pestaña Correos) y
   ninguna página los recibe.

   Instalación (una vez): Ejecutar → instalarRecibos. Pone los encabezados O y P en Pagos,
   la clave recibos_envio en Config y el disparador que manda el recibo cuando el pago se
   confirma a mano en la hoja (desde la bandeja sale sin disparador).
   Probar: menú Condominio → «Probar el recibo de pago (solo a mí)». */

const REC_Z = "America/Mexico_City";
const REC_COL_CORREO = 15;      // O: correo que el vecino dejó al registrar el pago
const REC_COL_ENVIO = 16;       // P: qué pasó con el recibo (enviado, sin correo…)
const REC_MARINO = "#1d3f63", REC_ORO = "#d8b06a", REC_VERDE = "#1e7b34";

/* ------------------------------- instalación ------------------------------- */

function instalarRecibos() {
  const ss = SpreadsheetApp.getActive(), pagos = ss.getSheetByName(HOJA_PAGOS);
  if (!pagos) throw new Error("Falta la pestaña Pagos; corre instalar().");
  columnasRecibo_(pagos);
  if (!String(config_().recibos_envio || "").trim()) ponerConfig_("recibos_envio", "sí", "sí = al confirmar un pago se manda el recibo por correo al vecino (si su depto tiene correo). no = solo se ve en Mi depto.");
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "reciboPorEdicion") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("reciboPorEdicion").forSpreadsheet(ss).onEdit().create();
  avisoUi_("Recibos de pago instalados", "Al confirmar un pago, el vecino ve su recibo en Mi depto y le llega por correo si su depto tiene uno registrado.\n\nPara apagar los correos: Config → recibos_envio = no.");
}

/* Las columnas O y P de Pagos, con su encabezado. No toca ENC_PAGOS: las páginas siguen leyendo 14 columnas. */
function columnasRecibo_(pagos) {
  const max = pagos.getMaxColumns();
  if (max < REC_COL_ENVIO) pagos.insertColumnsAfter(max, REC_COL_ENVIO - max);
  const enc = pagos.getRange(1, REC_COL_CORREO, 1, 2).getValues()[0];
  if (!String(enc[0]).trim()) pagos.getRange(1, REC_COL_CORREO).setValue("Correo para el recibo").setFontWeight("bold");
  if (!String(enc[1]).trim()) pagos.getRange(1, REC_COL_ENVIO).setValue("Recibo").setFontWeight("bold");
}

/* Disparador instalable: alguien cambió el Estatus a Confirmado directamente en la hoja. */
function reciboPorEdicion(e) {
  try {
    const rg = e.range, h = rg.getSheet();
    if (h.getName() !== HOJA_PAGOS || rg.getColumn() !== 10 || rg.getRow() < 2) return;
    if (String(e.value) !== "Confirmado" && String(e.value) !== "Rechazado") return;   // el rechazo del último renglón también cierra la transferencia
    Utilities.sleep(1500);                                  // deja que onEdit anote la fecha de confirmación
    reciboAlConfirmar_(h, rg.getRow());
  } catch (err) {}
}

/* Menú: manda el recibo del último pago confirmado SOLO a quien lo corre. No marca nada en la hoja. */
function reciboPrueba() {
  const pagos = SpreadsheetApp.getActive().getSheetByName(HOJA_PAGOS);
  const vals = pagos && pagos.getLastRow() > 1 ? pagos.getRange(2, 1, pagos.getLastRow() - 1, ENC_PAGOS.length).getValues() : [];
  const f = vals.filter(x => String(x[9]) === "Confirmado" && String(x[13] || ""))[0];
  if (!f) return avisoUi_("Recibo de prueba", "Todavía no hay ningún pago confirmado con folio en la pestaña Pagos.");
  const r = reciboDatos_(vals, Number(f[1]), String(f[13]));
  if (!r.ok) return avisoUi_("Recibo de prueba", "No se pudo armar el recibo: " + r.error);
  const yo = Session.getEffectiveUser().getEmail();
  enviarRecibo_(r, [yo], "[Prueba] ");
  avisoUi_("Recibo de prueba", "Te llegó a " + yo + " el recibo " + r.numero + " (depto " + r.depto + ", " + pesosC_(r.total) + "), tal como lo vería el vecino.");
}

/* ------------------------------- datos ------------------------------- */

/* Arma el recibo a partir de los renglones de Pagos (sin encabezado). Junta los renglones de la misma
   transferencia (mismo depto, misma fecha y hora de registro) y toma solo los confirmados. */
function reciboDatos_(vals, depto, folio) {
  folio = String(folio || "").trim();
  if (!folio) return { ok: false, error: "folio" };
  let base = -1;
  for (let i = 0; i < vals.length; i++) if (String(vals[i][13]) === folio && (!depto || Number(vals[i][1]) === depto)) { base = i; break; }
  if (base < 0) return { ok: false, error: "folio" };
  const f0 = vals[base], dep = Number(f0[1]), t0 = f0[0] instanceof Date ? f0[0].getTime() : NaN;
  const grupo = [];
  vals.forEach((f, i) => { if (i === base || (Number(f[1]) === dep && f[0] instanceof Date && f[0].getTime() === t0)) grupo.push({ f: f, fila: i + 2 }); });
  const conf = grupo.filter(g => String(g.f[9]) === "Confirmado");
  if (!conf.length) return { ok: false, error: "sin confirmar" };
  conf.sort((a, b) => String(mesTexto_(a.f[10])) < String(mesTexto_(b.f[10])) ? -1 : 1);
  const lineas = [];
  conf.forEach(g => {
    const mes = mesTexto_(g.f[10]), per = /^\d{4}-\d{2}$/.test(mes) ? capitalizar_(MESES[parseInt(mes.slice(5), 10) - 1]) + " " + mes.slice(0, 4) : "";
    [["Cuota de mantenimiento", 2], ["Agua", 3], ["Cuota extraordinaria", 4], ["Casa club", 5]].forEach(c => {
      const m = Math.round((Number(g.f[c[1]]) || 0) * 100) / 100;
      if (m > 0) lineas.push({ concepto: c[0], periodo: per, monto: m });
    });
  });
  if (!lineas.length) return { ok: false, error: "monto" };
  const folios = conf.map(g => String(g.f[13] || "")).filter(Boolean).sort();
  const fechas = conf.map(g => g.f[11]).filter(d => d instanceof Date).sort((a, b) => b - a);
  const confirmado = fechas[0] || new Date(), reportado = f0[0] instanceof Date ? f0[0] : confirmado;
  const total = Math.round(lineas.reduce((a, l) => a + l.monto, 0) * 100) / 100;
  return {
    ok: true, numero: folios[0] || folio, folios: folios, depto: dep, lineas: lineas, total: total,
    letra: importeConLetra_(total),
    reportado: fechaLarga_(reportado), confirmado: fechaLarga_(confirmado),
    enRevision: grupo.filter(g => !/confirm|rechaz/i.test(String(g.f[9]))).length,   // renglones de la misma transferencia aún sin resolver
    _filas: grupo.map(g => g.fila)                                                   // interno: no sale del servidor
  };
}

/* doGet ?accion=reciboPago&depto=N&folio=P-0000[&pdf=1] → el recibo (y el PDF en base64). Sin nombres ni correos. */
function reciboPago_(p) {
  const depto = parseInt(p.depto, 10);
  if (!(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  const pagos = SpreadsheetApp.getActive().getSheetByName(HOJA_PAGOS);
  if (!pagos || pagos.getLastRow() < 2) return { ok: false, error: "folio" };
  const r = reciboDatos_(pagos.getRange(2, 1, pagos.getLastRow() - 1, ENC_PAGOS.length).getValues(), depto, p.folio);
  if (!r.ok) return r;
  delete r._filas;
  const out = { ok: true, recibo: r };
  if (p.pdf) {
    const pdf = reciboPdf_(r);
    out.archivo = pdf.getName();
    out.pdf = Utilities.base64Encode(pdf.getBytes());
  }
  return out;
}

/* ------------------------------- envío ------------------------------- */

/* Se llama al confirmar un pago. Manda el recibo una sola vez por transferencia y anota en la columna P qué pasó. */
function reciboAlConfirmar_(pagos, fila) {
  if (/^no$/i.test(String(config_().recibos_envio || "").trim())) return { enviado: 0, motivo: "apagado" };
  columnasRecibo_(pagos);
  const vals = pagos.getRange(2, 1, pagos.getLastRow() - 1, REC_COL_ENVIO).getValues();
  const f = vals[fila - 2];
  if (!f) return { enviado: 0, motivo: "fila" };
  const r = reciboDatos_(vals, Number(f[1]), String(f[13] || ""));
  if (!r.ok) return { enviado: 0, motivo: r.error };
  if (r.enRevision > 0) return { enviado: 0, motivo: "faltan renglones de la misma transferencia" };
  const filas = r._filas;
  if (filas.some(x => String(vals[x - 2][REC_COL_ENVIO - 1] || "").trim())) return { enviado: 0, motivo: "ya se había mandado" };
  const anotar = t => filas.forEach(x => pagos.getRange(x, REC_COL_ENVIO).setValue(t));
  const vistos = {};
  const dest = correosDepto_(r.depto).concat(filas.map(x => vals[x - 2][REC_COL_CORREO - 1]))
    .map(c => String(c || "").trim().toLowerCase())
    .filter(c => correoValido_(c) && !vistos[c] && (vistos[c] = true));
  if (!dest.length) { anotar("Sin correo: se ve en Mi depto"); return { enviado: 0, motivo: "sin correo" }; }
  if (MailApp.getRemainingDailyQuota() < dest.length) { anotar("No se envió: Google ya no deja mandar más correos hoy"); return { enviado: 0, motivo: "cuota" }; }
  enviarRecibo_(r, dest, "");
  anotar("Enviado el " + Utilities.formatDate(new Date(), REC_Z, "d/MM/yyyy HH:mm") + " a " + dest.length + (dest.length === 1 ? " correo" : " correos"));
  return { enviado: dest.length };
}

/* Un correo por destinatario: nadie ve el correo de otro, aunque sean del mismo depto. */
function enviarRecibo_(r, dest, prefijo) {
  const pdf = reciboPdf_(r);
  const asunto = (prefijo || "") + "Recibo de pago " + r.numero + " · Depto " + r.depto + " · " + pesosC_(r.total) + " · Las Misiones";
  const texto = reciboTexto_(r), html = reciboCorreoHtml_(r);
  dest.forEach(a => MailApp.sendEmail(a, asunto, texto, { name: REP_REMITENTE, htmlBody: html, attachments: [pdf] }));
}

/* Correos activos de un depto en la pestaña Correos (quien se dio de baja no recibe nada). */
function correosDepto_(depto) {
  const h = SpreadsheetApp.getActive().getSheetByName(REP_CORREOS);
  if (!h || h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, 4).getValues()
    .filter(f => parseInt(String(f[0]).replace(/\D/g, ""), 10) === depto && !/^no$/i.test(String(f[3]).trim()))
    .map(f => String(f[2]).trim().toLowerCase());
}
function correoValido_(c) { return c.length <= 120 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/.test(c); }

/* ------------------------------- formato ------------------------------- */

function pesosC_(v) {
  const n = Math.round(Math.abs(Number(v) || 0) * 100), ent = Math.floor(n / 100), cen = String(n % 100);
  return (v < 0 ? "−$" : "$") + String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + (cen.length < 2 ? "0" : "") + cen;
}
function fechaLarga_(d) { return Utilities.formatDate(d, REC_Z, "d") + " de " + MESES[parseInt(Utilities.formatDate(d, REC_Z, "M"), 10) - 1] + " de " + Utilities.formatDate(d, REC_Z, "yyyy"); }

/* 1694.5 → «mil seiscientos noventa y cuatro pesos 50/100 M.N.» (hasta 999,999). */
function importeConLetra_(v) {
  const n = Math.round(Math.abs(Number(v) || 0) * 100), ent = Math.floor(n / 100), cen = String(n % 100);
  if (ent >= 1000000) return "";
  return enLetras_(ent) + (ent === 1 ? " peso " : " pesos ") + (cen.length < 2 ? "0" : "") + cen + "/100 M.N.";
}
function enLetras_(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "cero";
  const U = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince",
    "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiún", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const D = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const C = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
  const tres = x => {
    if (x === 100) return "cien";
    const r = x % 100, dec = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " y " + U[r % 10] : "");
    return [C[Math.floor(x / 100)], dec].filter(Boolean).join(" ");
  };
  const miles = Math.floor(n / 1000), resto = n % 1000;
  return [miles === 1 ? "mil" : miles ? tres(miles) + " mil" : "", tres(resto)].filter(Boolean).join(" ");
}

function reciboBase_() { const b = String(config_().sitio_url || "").trim().replace(/\/+$/, ""); return b || REP_BASE; }

/* El emblema del sitio (assets/mark.svg), dibujado aquí para que el PDF no dependa de internet. */
function reciboEmblema_(px) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + px + '" height="' + px + '"><rect width="64" height="64" rx="13" fill="' + REC_MARINO + '"/>' +
    '<g fill="' + REC_ORO + '"><rect x="11" y="31" width="7" height="20" rx="1"/><path d="M11 31 q3.5 -6 7 0 z"/><rect x="46" y="31" width="7" height="20" rx="1"/><path d="M46 31 q3.5 -6 7 0 z"/>' +
    '<rect x="31.1" y="7" width="1.8" height="6"/><rect x="29" y="9" width="6" height="1.6"/><rect x="28.8" y="13.4" width="6.4" height="3.4" rx="0.8"/>' +
    '<path d="M19 33 q0 -16 13 -16 q13 0 13 16 z"/><rect x="17" y="33" width="30" height="3.4" rx="1"/><path d="M20 37.4 h24 v13.6 h-7 v-7.4 a5 5 0 0 0 -10 0 v7.4 h-7 z"/></g>' +
    '<rect x="9" y="51" width="46" height="3" rx="1.2" fill="' + REC_ORO + '"/></svg>';
}

/* ------------------------------- PDF ------------------------------- */

function reciboPdf_(r) {
  return Utilities.newBlob(reciboHtmlPdf_(r), "text/html", "recibo.html").getAs("application/pdf")
    .setName("Recibo " + r.numero + " · Depto " + r.depto + " · Las Misiones.pdf");
}

/* Hoja carta/A4 con membrete. Chromium la imprime sin fondos: todo color lleva print-color-adjust: exact. */
function reciboHtmlPdf_(r) {
  const css = "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#16181c;font-size:12.5px;line-height:1.5}" +
    ".serif{font-family:Georgia,'Times New Roman',serif;font-weight:normal}" +
    ".hoja{border:1.5px solid " + REC_MARINO + ";border-radius:14px;padding:26px 30px 22px;position:relative}" +
    ".cab{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}" +
    ".org{display:flex;align-items:center;gap:14px}.org b{display:block;font-size:17px;letter-spacing:2.2px;color:" + REC_MARINO + "}" +
    ".org span{display:block;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#6a6d73;margin-top:2px}" +
    ".num{text-align:right}.num .t{font-size:10px;letter-spacing:2.4px;text-transform:uppercase;font-weight:bold;color:#6a6d73}" +
    ".num .n{font-size:26px;color:" + REC_MARINO + ";line-height:1.15;margin-top:2px}.num .f{font-size:11px;color:#6a6d73;margin-top:2px}" +
    ".raya{height:4px;border-radius:2px;background:" + REC_MARINO + ";margin:18px 0 0}.raya2{height:2px;background:" + REC_ORO + ";margin:3px 0 22px}" +
    ".de{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}" +
    ".et{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#6a6d73;font-weight:bold}" +
    ".depto{font-size:30px;line-height:1.15;margin-top:3px}.monto{font-size:38px;line-height:1.1;font-weight:bold;color:" + REC_MARINO + ";margin-top:3px;text-align:right}" +
    ".letra{margin:10px 0 0;font-size:12.5px;color:#3b3e44;font-style:italic;text-align:right}" +
    "table{width:100%;border-collapse:collapse;margin-top:24px}th{text-align:left;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;background:" + REC_MARINO + ";padding:8px 12px}" +
    "th.m,td.m{text-align:right;white-space:nowrap}td{padding:10px 12px;border-bottom:1px solid #dfe1e5;font-size:13px}" +
    "tr.tot td{border-bottom:0;border-top:2px solid " + REC_MARINO + ";font-weight:bold;font-size:15px;background:#f3f5f8}" +
    ".datos{display:flex;gap:14px;margin-top:22px}.dato{flex:1;border:1px solid #dfe1e5;border-radius:10px;padding:10px 12px}" +
    ".dato b{display:block;font-size:13px;margin-top:3px;font-weight:bold}" +
    ".cierre{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-top:34px}" +
    ".firma{width:260px;text-align:center;font-size:11.5px;color:#3b3e44}.firma i{display:block;border-top:1px solid #16181c;margin-bottom:6px}" +
    ".firma b{display:block;color:#16181c}" +
    ".sello{border:3px solid " + REC_VERDE + ";color:" + REC_VERDE + ";border-radius:12px;padding:8px 18px 7px;text-align:center;transform:rotate(-7deg);margin:0 18px 10px 0}" +
    ".sello b{display:block;font-size:24px;letter-spacing:5px;line-height:1.1}.sello span{display:block;font-size:10px;letter-spacing:1px;margin-top:2px}" +
    ".pie{margin-top:26px;border-top:1px solid #dfe1e5;padding-top:12px;font-size:10px;color:#6a6d73;line-height:1.55}";
  const filas = r.lineas.map(l => "<tr><td>" + esc_(l.concepto) + "</td><td>" + esc_(l.periodo) + '</td><td class="m">' + pesosC_(l.monto) + "</td></tr>").join("");
  return '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body><div class="hoja">' +
    '<div class="cab"><div class="org">' + reciboEmblema_(58) + "<div><b>LAS MISIONES</b><span>Residencial · Mesa directiva</span></div></div>" +
      '<div class="num"><div class="t">Recibo de pago</div><div class="n serif">No. ' + esc_(r.numero) + '</div><div class="f">Emitido el ' + esc_(r.confirmado) + "</div></div></div>" +
    '<div class="raya"></div><div class="raya2"></div>' +
    '<div class="de"><div><div class="et">Recibimos del</div><div class="depto serif">Departamento ' + r.depto + "</div></div>" +
      '<div><div class="et" style="text-align:right">La cantidad de</div><div class="monto">' + pesosC_(r.total) + "</div></div></div>" +
    (r.letra ? '<p class="letra">(' + esc_(r.letra) + ")</p>" : "") +
    '<table><tr><th>Concepto</th><th>Periodo</th><th class="m">Importe</th></tr>' + filas +
      '<tr class="tot"><td colspan="2">Total recibido</td><td class="m">' + pesosC_(r.total) + "</td></tr></table>" +
    '<div class="datos">' +
      '<div class="dato"><span class="et">Forma de pago</span><b>Transferencia bancaria</b></div>' +
      '<div class="dato"><span class="et">Reportado el</span><b>' + esc_(r.reportado) + "</b></div>" +
      '<div class="dato"><span class="et">Confirmado en el banco el</span><b>' + esc_(r.confirmado) + "</b></div>" +
      '<div class="dato"><span class="et">' + (r.folios.length > 1 ? "Folios" : "Folio") + " de registro</span><b>" + esc_(r.folios.join(", ")) + "</b></div>" +
    "</div>" +
    '<div class="cierre"><div class="firma"><i></i><b>Mesa directiva</b>Las Misiones Residencial</div>' +
      '<div class="sello"><b>PAGADO</b><span>' + esc_(r.confirmado) + "</span></div></div>" +
    '<div class="pie">La mesa directiva de Las Misiones Residencial emite este recibo como constancia de que el pago se localizó en la cuenta bancaria del condominio y quedó aplicado al departamento. ' +
      "<b>No es un comprobante fiscal (CFDI).</b><br>El estado de cuenta del departamento se consulta en " + esc_(reciboBase_()) + "/mi-depto.html?depto=" + r.depto + "</div>" +
    "</div></body></html>";
}

/* ------------------------------- correo ------------------------------- */

function reciboTexto_(r) {
  return "Pago confirmado · Las Misiones Residencial\n\nRecibo " + r.numero + "\nDepartamento " + r.depto + "\n\n" +
    r.lineas.map(l => "- " + l.concepto + (l.periodo ? " · " + l.periodo : "") + ": " + pesosC_(l.monto)).join("\n") +
    "\n\nTotal: " + pesosC_(r.total) + (r.letra ? " (" + r.letra + ")" : "") +
    "\nReportado el " + r.reportado + " · confirmado en el banco el " + r.confirmado + "." +
    "\n\nVa adjunto el recibo en PDF. No es un comprobante fiscal (CFDI)." +
    "\nTu depto, mes por mes: " + reciboBase_() + "/mi-depto.html?depto=" + r.depto +
    "\n\n¿No reconoces este pago o prefieres no recibir estos correos? Responde a este mensaje.\nMesa directiva · Las Misiones Residencial";
}

/* Tarjeta angosta, hecha con tablas para que Gmail y Outlook la respeten. */
function reciboCorreoHtml_(r) {
  const gris = "#6a6d73", linea = "#e4e2da";
  const filas = r.lineas.map(l => '<tr><td style="padding:11px 0;border-bottom:1px solid ' + linea + ';font-size:15px;color:#16181c">' + esc_(l.concepto) +
    (l.periodo ? '<br><span style="font-size:13px;color:' + gris + '">' + esc_(l.periodo) + "</span>" : "") +
    '</td><td align="right" style="padding:11px 0;border-bottom:1px solid ' + linea + ';font-size:15px;color:#16181c;white-space:nowrap;vertical-align:top">' + pesosC_(l.monto) + "</td></tr>").join("");
  return '<div style="background:#f3f1ea;padding:22px 10px;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#fffdf7;border-radius:16px;overflow:hidden;border:1px solid ' + linea + '">' +
    '<tr><td style="background:' + REC_MARINO + ';padding:20px 24px"><div style="font-size:12px;letter-spacing:3px;font-weight:bold;color:' + REC_ORO + '">LAS MISIONES RESIDENCIAL</div>' +
      '<div style="font-size:24px;line-height:1.25;color:#ffffff;font-family:Georgia,\'Times New Roman\',serif;margin-top:6px">Tu pago quedó confirmado</div></td></tr>' +
    '<tr><td style="padding:22px 24px 6px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>' +
        '<td style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:' + gris + '">Departamento<div style="font-size:30px;font-weight:bold;color:#16181c;letter-spacing:0;line-height:1.15">' + r.depto + "</div></td>" +
        '<td align="right"><span style="display:inline-block;border:2px solid ' + REC_VERDE + ";color:" + REC_VERDE + ';border-radius:8px;padding:5px 12px;font-size:14px;font-weight:bold;letter-spacing:3px">PAGADO</span></td>' +
      "</tr></table>" +
      '<div style="font-size:13px;color:' + gris + ';margin-top:10px">Recibo <b style="color:#16181c">' + esc_(r.numero) + "</b> · confirmado el " + esc_(r.confirmado) + "</div>" +
    "</td></tr>" +
    '<tr><td style="padding:6px 24px 0"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">' + filas +
      '<tr><td style="padding:14px 0 4px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#16181c">Total</td>' +
      '<td align="right" style="padding:14px 0 4px;font-size:28px;font-weight:bold;color:' + REC_MARINO + ';white-space:nowrap">' + pesosC_(r.total) + "</td></tr></table></td></tr>" +
    '<tr><td style="padding:14px 24px 4px;font-size:14px;line-height:1.55;color:#3b3e44">La mesa directiva localizó tu transferencia en la cuenta del condominio y ya se restó de lo que debe tu departamento. ' +
      "Va adjunto tu <b>recibo en PDF</b>, por si necesitas guardarlo o entregarlo.</td></tr>" +
    '<tr><td style="padding:16px 24px 22px"><a href="' + reciboBase_() + "/mi-depto.html?depto=" + r.depto + '" style="display:block;text-align:center;background:' + REC_MARINO + ';color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px;border-radius:12px">Ver mi depto, mes por mes</a></td></tr>' +
    '<tr><td style="padding:14px 24px 18px;border-top:1px solid ' + linea + ';font-size:12px;line-height:1.55;color:' + gris + '">Este recibo es una constancia de la mesa directiva; no es un comprobante fiscal (CFDI). ' +
      "¿No reconoces este pago o prefieres no recibir estos correos? Responde a este mensaje.</td></tr>" +
    "</table></div>";
}
