/* Las Misiones · Cobranza (quinto archivo del proyecto: «+ → Secuencia de comandos → Cobranza»).

   El 15 y el último día de cada mes (el 30, o el 28/29 en febrero):
   - A Config → cobranza_correos (la mesa): reporte PRIVADO de adeudos por depto (mantenimiento, agua y
     cuota extraordinaria, desde finanzas_desde), con meses de atraso, pagos en revisión, el último contacto y
     la promesa de pago anotados en «Vecinos (privado)».
   - A Config → cobranza_textos (quien hace las llamadas, p. ej. Ceci): un mensaje listo por depto con botón de
     WhatsApp. El tono sube con la antigüedad: recordatorio amable → pedir apoyo → proponer un plan de pagos.
     Si esa celda está vacía, los mensajes van dentro del reporte.
   Los adeudos se calculan con miDepto_ (lo mismo que ve cada vecino en mi-depto.html).
   WhatsApp no permite mandar mensajes automáticos gratis: el botón abre el chat con el texto escrito y solo
   falta tocar «Enviar».

   Una sola vez: Ejecutar → instalarCobranza. Para probar sin esperar al 15: Ejecutar → cobranzaPrueba
   (llega solo a ti). */

const HOJA_DIR = "Vecinos (privado)";
const ENC_DIR = ["Depto", "Propietario", "WhatsApp (10 dígitos)", "Correo", "¿Quién paga? (si es inquilino, su nombre)", "Último contacto (fecha)", "Acuerdo o promesa de pago", "Notas de cobranza"];

function instalarCobranza() {
  directorio_();
  const cfg = config_();
  if (!String(cfg.cobranza_correos || "").trim()) ponerConfig_("cobranza_correos", "zacastro57@hotmail.com, eduardo.lusan@gmail.com", "Quién recibe el reporte de adeudos del 15 y fin de mes (separa con comas). PRIVADO.");
  if (!("cobranza_textos" in cfg)) ponerConfig_("cobranza_textos", "", "Correo de quien manda los mensajes a los vecinos (Ceci). Vacío: los mensajes van dentro del reporte.");
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "cobranzaDiaria").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("cobranzaDiaria").timeBased().everyDays(1).atHour(8).inTimezone("America/Mexico_City").create();
  try { SpreadsheetApp.getActive().toast("Cobranza lista: el 15 y fin de mes a las 8 h. Llena los WhatsApp en «" + HOJA_DIR + "».", "Cobranza", 10); } catch (e) {}
}

/* Pestaña privada de contactos: 16 deptos con el nombre de la hoja maestra y el correo de «Correos». */
function directorio_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_DIR);
  if (h) return h;
  h = ss.insertSheet(HOJA_DIR);
  h.getRange(1, 1, 1, ENC_DIR.length).setValues([ENC_DIR]).setFontWeight("bold").setBackground("#d9e2ec").setWrap(true);
  h.setFrozenRows(1);
  const nombres = {}, correos = {};
  const ad = ss.getSheetByName(HOJA_ADEUDOS);
  if (ad) ad.getRange(1, 2, Math.min(ad.getLastRow(), 60), 2).getValues().forEach(f => { const d = numDepto_(f[0]); if (d) nombres[d] = String(f[1] || "").trim(); });
  const hc = ss.getSheetByName("Correos");
  if (hc && hc.getLastRow() > 1) hc.getRange(2, 1, hc.getLastRow() - 1, 3).getValues().forEach(f => { const d = numDepto_(f[0]); if (d && f[2]) correos[d] = correos[d] ? correos[d] : String(f[2]).trim(); });
  const filas = [];
  for (let d = 1; d <= UNIDADES; d++) filas.push(["Depto " + d, nombres[d] || "", "", correos[d] || "", "", "", "", ""]);
  h.getRange(2, 1, filas.length, ENC_DIR.length).setValues(filas);
  h.getRange(2, 3, filas.length, 1).setNumberFormat("@");
  h.getRange(2, 6, filas.length, 1).setNumberFormat("dd/mm/yyyy");
  try { h.setColumnWidths(1, 1, 80); h.setColumnWidth(2, 220); h.setColumnWidth(3, 130); h.setColumnWidth(7, 220); h.setColumnWidth(8, 220); } catch (e) {}
  return h;
}
function contactos_() {
  const h = directorio_(), out = {};
  if (h.getLastRow() < 2) return out;
  h.getRange(2, 1, h.getLastRow() - 1, ENC_DIR.length).getValues().forEach(f => {
    const d = numDepto_(f[0]); if (!d) return;
    const tel = String(f[2] || "").replace(/\D/g, "");
    out[d] = { nombre: String(f[1] || "").trim(), tel: tel.length === 10 ? "52" + tel : tel.length === 12 && tel.indexOf("52") === 0 ? tel : tel.length === 13 && tel.indexOf("521") === 0 ? "52" + tel.slice(3) : "",
      telTexto: String(f[2] || "").trim(), correo: String(f[3] || "").trim(), paga: String(f[4] || "").trim(),
      contacto: Object.prototype.toString.call(f[5]) === "[object Date]" ? Utilities.formatDate(f[5], "America/Mexico_City", "d/MM/yyyy") : String(f[5] || ""), promesa: String(f[6] || "").trim(), notas: String(f[7] || "").trim() };
  });
  return out;
}

/* ------------------------------- cálculo ------------------------------- */
function adeudos_() {
  const cs = contactos_(), lista = [];
  for (let d = 1; d <= UNIDADES; d++) {
    const m = miDepto_(d); if (!m.ok) continue;
    const cuota = m.cuota || 1500, extra = m.extraordinaria ? m.extraordinaria.pendiente : 0;
    const enRevision = (m.pagos || []).filter(p => /pendiente/i.test(String(p.estatus || ""))).reduce((a, p) => a + (Number(p.total) || 0), 0);
    const mesesAtraso = m.debeManto > 0.5 ? Math.ceil(m.debeManto / cuota - 0.001) : 0;
    const aguaMeses = (m.agua || []).filter(a => !a.pagado).map(a => a.nombre);
    lista.push({ depto: d, total: m.total, manto: m.debeManto, mesesAtraso: mesesAtraso, agua: m.aguaPendiente, aguaMeses: aguaMeses, extra: extra, extraNombre: m.extraordinaria ? m.extraordinaria.nombre : "",
      enRevision: Math.round(enRevision * 100) / 100, cuota: cuota, c: cs[d] || {} });
  }
  return lista;
}
const pesos_ = v => "$" + Math.round(v).toLocaleString("es-MX");
function detalle_(a) {
  const p = [];
  if (a.manto > 0.5) p.push(a.mesesAtraso + (a.mesesAtraso === 1 ? " cuota" : " cuotas") + " de mantenimiento (" + pesos_(a.manto) + ")");
  if (a.agua > 0.5) p.push("agua de " + a.aguaMeses.join(", ") + " (" + pesos_(a.agua) + ")");
  if (a.extra > 0.5) p.push("cuota extraordinaria (" + pesos_(a.extra) + ")");
  return p.join(", ").replace(/, ([^,]*)$/, " y $1");
}
/* Nivel según antigüedad y monto: 1 recordatorio · 2 pedir apoyo · 3 plan de pagos. */
function nivel_(a) { return a.mesesAtraso >= 4 || a.total >= 6000 ? 3 : a.mesesAtraso >= 2 || a.total >= 3000 ? 2 : 1; }
function mensaje_(a, sitio) {
  const quien = (a.c.paga || a.c.nombre || "").split(/\s+/).filter(w => !/^(ma|ma\.|sra?\.?|lic\.?|ing\.?|dr\.?|arq\.?|mtr[oa]\.?|c\.?|de|del|la)$/i.test(w))[0] || "vecina, vecino";
  const saludo = "Hola, " + quien.charAt(0).toUpperCase() + quien.slice(1).toLowerCase() + " 👋 Te escribo de la mesa directiva de Las Misiones.";
  const liga = sitio ? "\n\nAquí ves el detalle y registras tu pago (te toma un minuto): " + sitio + "/pago.html?depto=" + a.depto : "";
  const n = nivel_(a);
  if (n === 1) return saludo + "\n\nUn recordatorio amable: en el depto " + a.depto + " está pendiente " + detalle_(a) + ". ¿Nos ayudas a cubrirlo esta semana?" + liga + "\n\nSi ya pagaste, ¡gracias! Solo regístralo para que la mesa lo confirme.";
  if (n === 2) return saludo + "\n\nCon las cuotas pagamos el agua de la CEA, la luz de las áreas comunes, a Don Jorge y el mantenimiento; cuando faltan, la caja se aprieta para todos. Hoy el depto " + a.depto + " tiene pendiente " + detalle_(a) + ": en total " + pesos_(a.total) + ".\n\n¿Nos apoyas poniéndote al corriente? Si te ayuda, lo podemos dividir en dos o tres pagos; dinos qué te funciona." + liga;
  const plazos = a.total > 9000 ? 4 : 3, abono = Math.ceil(a.total / plazos / 100) * 100;
  return saludo + "\n\nQueremos ayudarte a ponerte al corriente sin que se vuelva una carga. El depto " + a.depto + " tiene pendiente " + detalle_(a) + ": en total " + pesos_(a.total) + ".\n\nTe proponemos un plan: " + plazos + " abonos de " + pesos_(abono) + " además de la cuota de cada mes, y así evitamos los intereses moratorios que marca el reglamento (art. 17). Si prefieres otro arreglo, platiquémoslo; lo importante es acordarlo." + liga;
}
function sitioMis_() {
  const u = String(config_().sitio_url || "").replace(/\/+$/, "");
  return u || REP_SITIO.replace(/\/[^\/]*$/, "");          // la misma dirección que usa el reporte mensual
}
function numDepto_(v) { const m = String(v == null ? "" : v).match(/(\d{1,2})/); const n = m ? Number(m[1]) : NaN; return n >= 1 && n <= UNIDADES ? n : 0; }

/* ------------------------------- correos ------------------------------- */
function htmlReporteCobranza_(L, fecha, conMensajes) {
  const deben = L.filter(a => a.total > 0.5).sort((x, y) => y.total - x.total);
  const tot = k => deben.reduce((s, a) => s + a[k], 0), td = 'style="padding:7px 5px;border-bottom:1px solid #e1e0d9;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere"';
  const color = n => n === 3 ? "#b3261e" : n === 2 ? "#a86a00" : "#52514e";
  let h = '<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:680px;color:#0b0b0b">' +
    '<p style="margin:0;color:#1d3f63;font-size:12px;letter-spacing:.12em;font-weight:800;text-transform:uppercase">Las Misiones · privado de la mesa</p>' +
    '<h1 style="font-size:22px;margin:4px 0">Adeudos al ' + fecha + "</h1>" +
    '<p style="margin:0 0 14px;color:#52514e">' + deben.length + " de " + UNIDADES + " deptos deben · total <b>" + pesos_(tot("total")) + "</b> (mantenimiento " + pesos_(tot("manto")) + " · agua " + pesos_(tot("agua")) + " · extraordinaria " + pesos_(tot("extra")) + ")</p>";
  if (!deben.length) return h + '<p style="font-size:18px">🎉 Nadie debe. ¡Mes verde!</p></div>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed"><tr style="background:#f3f3ee;text-align:left"><th ' + td + ' width="30%">Depto</th><th ' + td + ' width="22%">Debe</th><th ' + td + ">Detalle</th></tr>" +
    deben.map(a => "<tr><td " + td + "><b>" + a.depto + "</b><br><small>" + (a.c.paga || a.c.nombre || "") + "</small></td><td " + td + '><b style="color:' + color(nivel_(a)) + '">' + pesos_(a.total) + "</b>" + (a.mesesAtraso ? "<br><small>" + a.mesesAtraso + (a.mesesAtraso === 1 ? " mes" : " meses") + "</small>" : "") + "</td><td " + td + ">" + detalle_(a) +
      (a.enRevision > 0.5 ? '<br><small style="color:#1d5a2a">⏳ ' + pesos_(a.enRevision) + " reportado, por confirmar en la bandeja</small>" : "") +
      ((a.c.contacto || a.c.promesa || a.c.notas) ? '<br><small style="color:#52514e">' + [a.c.contacto && "📞 " + a.c.contacto, a.c.promesa && "🤝 " + a.c.promesa, a.c.notas].filter(Boolean).join(" · ") + "</small>" : "") + "</td></tr>").join("") + "</table>";
  if (conMensajes) h += htmlMensajes_(deben, true);
  return h + '<p style="font-size:12px;color:#898781;margin-top:16px">Privado: no lo reenvíes al grupo. Los adeudos cuentan desde ' + mesTexto_(config_().finanzas_desde) + "; lo de la administración anterior no se cobra. Anota llamadas y promesas en la pestaña «" + HOJA_DIR + "» y aparecen aquí la próxima vez.</p></div>";
}
function htmlMensajes_(deben, dentro) {
  const s = sitioMis_(), et = ["", "Recordatorio amable", "Pedir apoyo", "Plan de pagos"];
  return (dentro ? '<h2 style="font-size:18px;margin:22px 0 6px">💬 Mensajes listos para WhatsApp</h2>' : "") +
    '<p style="color:#52514e;margin:0 0 10px;font-size:14px">Toca el botón verde: se abre WhatsApp con el texto escrito; revísalo y envíalo. Si el depto no tiene número, copia el texto.</p>' +
    deben.map(a => { const t = mensaje_(a, s), n = nivel_(a), wa = "https://wa.me/" + (a.c.tel || "") + "?text=" + encodeURIComponent(t);
      return '<div style="border:1px solid #e1e0d9;border-radius:14px;padding:12px 14px;margin:0 0 12px"><div style="font-weight:800">Depto ' + a.depto + " · " + (a.c.paga || a.c.nombre || "") + ' <span style="font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:' + (n === 3 ? "#f8d7da" : n === 2 ? "#fff3cd" : "#e8eef5") + '">' + et[n] + "</span></div>" +
        (a.enRevision > 0.5 ? '<div style="font-size:13px;color:#1d5a2a;margin-top:4px">⏳ Ya reportó ' + pesos_(a.enRevision) + ": confirma la bandeja antes de escribirle.</div>" : "") +
        '<div style="white-space:pre-wrap;font-size:14px;color:#333;background:#f8f7f3;border-radius:10px;padding:10px;margin:8px 0">' + t.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</div>" +
        '<a href="' + wa + '" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;font-weight:800;padding:10px 18px;border-radius:999px">💬 ' + (a.c.tel ? "Enviar por WhatsApp" : "Abrir WhatsApp (elige el contacto)") + "</a></div>"; }).join("");
}
function enviarCobranza_(soloA) {
  const cfg = config_(), L = adeudos_(), fecha = Utilities.formatDate(new Date(), "America/Mexico_City", "d/MM/yyyy");
  const mesa = soloA ? [soloA] : String(cfg.cobranza_correos || "").split(/[,;\s]+/).filter(x => /@/.test(x));
  const textos = soloA ? [soloA] : String(cfg.cobranza_textos || "").split(/[,;\s]+/).filter(x => /@/.test(x));
  const deben = L.filter(a => a.total > 0.5).sort((x, y) => y.total - x.total);
  const asunto = (soloA ? "[Prueba] " : "") + "Adeudos al " + fecha + " · " + deben.length + " deptos · " + pesos_(deben.reduce((s, a) => s + a.total, 0));
  const conMensajes = !textos.length || !!soloA;
  mesa.forEach(a => MailApp.sendEmail(a, asunto, "Reporte de adeudos de Las Misiones (ábrelo en una app de correo que muestre HTML).", { name: REP_REMITENTE, htmlBody: htmlReporteCobranza_(L, fecha, conMensajes) }));
  if (!soloA && textos.length && deben.length) textos.forEach(a => MailApp.sendEmail(a, "💬 Mensajes de cobranza listos · " + fecha + " · " + deben.length + " deptos", "Mensajes listos para WhatsApp.", { name: REP_REMITENTE,
    htmlBody: '<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:640px"><h1 style="font-size:20px;margin:0 0 6px">💬 Mensajes de cobranza · ' + fecha + "</h1>" + htmlMensajes_(deben, false) + '<p style="font-size:12px;color:#898781">Cuando escribas o llames, anota la fecha y lo que se acordó en la pestaña «' + HOJA_DIR + "» de la hoja.</p></div>" }));
  return { deben: deben.length, mesa: mesa, textos: textos };
}
/* Corre todos los días a las 8 h; solo envía el 15 y el último día del mes (el 30, o el 28/29 en febrero). */
function cobranzaDiaria() {
  const z = "America/Mexico_City", hoy = new Date(), d = Number(Utilities.formatDate(hoy, z, "d"));
  const ultimo = Number(Utilities.formatDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 12), z, "d"));
  if (!(d === 15 || d === Math.min(30, ultimo))) return;
  const k = "cobranza_" + Utilities.formatDate(hoy, z, "yyyy-MM-dd"), p = PropertiesService.getScriptProperties();
  if (p.getProperty(k)) return;
  enviarCobranza_(); p.setProperty(k, "1");
}
function cobranzaPrueba() { return enviarCobranza_(Session.getEffectiveUser().getEmail()); }
function cobranzaAhora() { return enviarCobranza_(); }
