/* Las Misiones · Cobranza (quinto archivo del proyecto: «+ → Secuencia de comandos → Cobranza»).

   El 15 y el último día de cada mes (el 30, o el 28/29 en febrero), a las 8 h:
   - A Config → cobranza_textos (quien llama y escribe a los vecinos, p. ej. Ceci): la AGENDA de cobranza.
     Una tarjeta por vecino, del que más debe al que menos, con su teléfono, un botón para llamar y otro que
     abre WhatsApp con el mensaje ya escrito. El tono sube con la antigüedad: recordatorio amable → pedir
     apoyo → proponer un plan de pagos. Si varios deptos tienen el mismo teléfono (un dueño con tres deptos),
     va una sola tarjeta y un solo mensaje con los tres.
   - A Config → cobranza_correos (la mesa): el reporte PRIVADO de adeudos por depto (mantenimiento, agua y
     cuotas extraordinarias desde finanzas_desde) con teléfono, meses de atraso, pagos en revisión, el último
     contacto y la promesa de pago anotados en «Vecinos (privado)». Quien está en las dos listas recibe solo
     la agenda, que ya trae todo. Si cobranza_textos está vacía, la agenda va dentro del reporte.
   Los adeudos se calculan con miDepto_ (lo mismo que ve cada vecino en mi-depto.html).
   WhatsApp no permite mandar mensajes automáticos gratis: el botón abre el chat con el texto escrito y solo
   falta tocar «Enviar».

   Una sola vez: Ejecutar → instalarCobranza. Para probar sin esperar al 15: Ejecutar → cobranzaPrueba
   (te llegan a ti la agenda y el reporte). Para mandarlo ya a quien corresponde: Ejecutar → cobranzaAhora. */

const HOJA_DIR = "Vecinos (privado)";
const ENC_DIR = ["Depto", "Propietario", "WhatsApp (10 dígitos)", "Correo", "¿Quién paga? (si es inquilino, su nombre)", "Último contacto (fecha)", "Acuerdo o promesa de pago", "Notas de cobranza"];
const COB_Z = "America/Mexico_City";
const COB_F = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const COB_NIVEL = {
  3: { nombre: "Proponer plan de pagos", nota: "4 meses o más, o desde $6,000", color: "#b3261e", fondo: "#fde7e6" },
  2: { nombre: "Pedir apoyo", nota: "2 o 3 meses, o desde $3,000", color: "#a86a00", fondo: "#fff3dc" },
  1: { nombre: "Recordatorio amable", nota: "lo demás", color: "#1d3f63", fondo: "#e8eef5" }
};

function instalarCobranza() {
  directorio_();
  const cfg = config_();
  if (!String(cfg.cobranza_correos || "").trim()) ponerConfig_("cobranza_correos", Session.getEffectiveUser().getEmail(), "Quién recibe el reporte de adeudos del 15 y fin de mes (separa con comas). PRIVADO.");
  if (!("cobranza_textos" in cfg)) ponerConfig_("cobranza_textos", "", "Correo de quien llama y escribe a los vecinos (Ceci): le llega la agenda con teléfonos y mensajes listos. Vacío: la agenda va dentro del reporte.");
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "cobranzaDiaria").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("cobranzaDiaria").timeBased().everyDays(1).atHour(8).inTimezone(COB_Z).create();
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
      contacto: Object.prototype.toString.call(f[5]) === "[object Date]" ? Utilities.formatDate(f[5], COB_Z, "d/MM/yyyy") : String(f[5] || ""), promesa: String(f[6] || "").trim(), notas: String(f[7] || "").trim() };
  });
  return out;
}

/* ------------------------------- cálculo ------------------------------- */
function adeudos_() {
  if (typeof MEMO_MD_ !== "undefined") MEMO_MD_.lote = true;
  const cs = contactos_(), lista = [];
  for (let d = 1; d <= UNIDADES; d++) {
    const m = miDepto_(d); if (!m.ok) continue;
    const cuota = m.cuota || 1500, extra = m.extraordinaria ? m.extraordinaria.pendiente : 0;
    const enRevision = (m.pagos || []).filter(p => /pendiente/i.test(String(p.estatus || ""))).reduce((a, p) => a + (Number(p.total) || 0), 0);
    const mesesAtraso = m.debeManto > 0.5 ? Math.ceil(m.debeManto / cuota - 0.001) : 0;
    const aguaMeses = (m.agua || []).filter(a => !a.pagado).map(a => a.nombre);
    lista.push({ depto: d, total: m.total, manto: m.debeManto, mesesAtraso: mesesAtraso, agua: m.aguaPendiente, aguaMeses: aguaMeses, extra: extra, extraNombre: m.extraordinaria ? m.extraordinaria.nombre : "", extraDet: m.extraordinaria && m.extraordinaria.detalle ? m.extraordinaria.detalle.filter(x => x.pendiente > 0.5).map(x => [x.nombre, x.pendiente]) : [],
      enRevision: Math.round(enRevision * 100) / 100, cuota: cuota, c: cs[d] || {} });
  }
  return lista;
}
const pesos_ = v => "$" + Math.round(v).toLocaleString("es-MX");
const y_ = p => p.length > 1 ? p.slice(0, -1).join(", ") + " y " + p[p.length - 1] : p.join("");
/* «Octubre 2026» → «octubre» (o «octubre 2025» si no es de este año). */
function mesCorto_(nombre) {
  const m = String(nombre || "").trim().match(/^(\S+)\s+(\d{4})$/);
  if (!m) return String(nombre || "").toLowerCase();
  return m[1].toLowerCase() + (m[2] === Utilities.formatDate(new Date(), COB_Z, "yyyy") ? "" : " " + m[2]);
}
function detalle_(a) {
  const p = [];
  if (a.manto > 0.5) p.push(a.mesesAtraso + (a.mesesAtraso === 1 ? " cuota" : " cuotas") + " de mantenimiento (" + pesos_(a.manto) + ")");
  if (a.agua > 0.5) p.push("agua de " + y_(a.aguaMeses.map(mesCorto_)) + " (" + pesos_(a.agua) + ")");
  if (a.extra > 0.5) { if ((a.extraDet || []).length) a.extraDet.forEach(x => { let n = x[0].replace(/\s*\(.*?\)\s*/g, " ").split(",")[0].trim().replace(/^Deuda con la CEA.*/i, "cuota de la CEA"); p.push(n.charAt(0).toLowerCase() + n.slice(1) + " (" + pesos_(x[1]) + ")"); }); else p.push("cuota extraordinaria (" + pesos_(a.extra) + ")"); }
  return y_(p);
}
/* Nivel según antigüedad y monto: 1 recordatorio · 2 pedir apoyo · 3 plan de pagos. */
function nivel_(a) { return a.mesesAtraso >= 4 || a.total >= 6000 ? 3 : a.mesesAtraso >= 2 || a.total >= 3000 ? 2 : 1; }
function nivelGrupo_(g) { const meses = Math.max.apply(null, g.deptos.map(a => a.mesesAtraso)); return meses >= 4 || g.total >= 6000 ? 3 : meses >= 2 || g.total >= 3000 ? 2 : 1; }
/* Un mismo teléfono con varios deptos (un dueño con tres deptos) es un solo contacto y un solo mensaje. */
function grupos_(deben) {
  const lista = [], por = {};
  deben.forEach(a => {
    const k = a.c.tel ? "t" + a.c.tel : "d" + a.depto;
    if (!por[k]) { por[k] = { deptos: [], total: 0, enRevision: 0, tel: a.c.tel || "", c: a.c }; lista.push(por[k]); }
    por[k].deptos.push(a); por[k].total += a.total; por[k].enRevision += a.enRevision;
  });
  lista.forEach(g => { g.deptos.sort((x, y) => x.depto - y.depto); g.nivel = nivelGrupo_(g); });
  return lista.sort((x, y) => y.nivel - x.nivel || y.total - x.total);
}
/* «laura beatriz» → «Laura Beatriz» (las partículas de, del, la, los, las, y se quedan en minúscula). */
function nombreBonito_(s) {
  return String(s || "").trim().split(/\s+/).map((w, i) => i && /^(de|del|la|las|los|y)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
/* Nombre de pila para el saludo: «Ma. de los Remedios Ortega» → «Remedios». */
function nombrePila_(c) {
  const w = String((c && (c.paga || c.nombre)) || "").split(/\s+/).filter(x => x && !/^(ma\.?|sra?\.?|srita\.?|lic\.?|ing\.?|dra?\.?|arq\.?|mtr[oa]\.?|c\.|de|del|la|las|los|y)$/i.test(x))[0];
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
}
function mensaje_(g, sitio) {
  if (!g.deptos) g = { deptos: [g], total: g.total, c: g.c };          // también acepta un solo depto
  const nom = nombrePila_(g.c), uno = g.deptos.length === 1, a0 = g.deptos[0], n = g.nivel || nivelGrupo_(g);
  const saludo = "Hola" + (nom ? ", " + nom : "") + " 👋 Te escribo de la mesa directiva de Las Misiones.";
  const lista = "\n" + g.deptos.map(a => "• Depto " + a.depto + ": " + detalle_(a)).join("\n") + "\nEn total, " + pesos_(g.total) + ".";
  const liga = !sitio ? "" : uno ? "\n\nAquí ves el detalle y registras tu pago (te toma un minuto): " + sitio + "/pago.html?depto=" + a0.depto
    : "\n\nAquí ves el detalle y registras tu pago (te toma un minuto):\n" + g.deptos.map(a => "Depto " + a.depto + ": " + sitio + "/pago.html?depto=" + a.depto).join("\n");
  if (n === 1) return saludo + "\n\nUn recordatorio amable: " + (uno ? "en el depto " + a0.depto + " está pendiente " + detalle_(a0) + "." : "esto está pendiente en tus deptos:" + lista) + " ¿Nos ayudas a cubrirlo esta semana?" + liga + "\n\nSi ya pagaste, ¡gracias! Solo regístralo para que la mesa lo confirme.";
  const cuanto = uno ? "Hoy el depto " + a0.depto + " tiene pendiente " + detalle_(a0) + ": en total " + pesos_(g.total) + "." : "Hoy tienes pendiente:" + lista;
  if (n === 2) return saludo + "\n\nCon las cuotas pagamos el agua de la CEA, la luz de las áreas comunes, a Don Jorge y el mantenimiento; cuando faltan, la caja se aprieta para todos. " + cuanto + "\n\n¿Nos apoyas poniéndote al corriente? Si te ayuda, lo podemos dividir en dos o tres pagos; dinos qué te funciona." + liga;
  const plazos = g.total > 9000 ? 4 : 3, abono = Math.ceil(g.total / plazos / 100) * 100;
  return saludo + "\n\nQueremos ayudarte a ponerte al corriente sin que se vuelva una carga. " + cuanto + "\n\nTe proponemos un plan: " + plazos + " abonos de " + pesos_(abono) + " además de la cuota de cada mes, y así evitamos los intereses moratorios que marca el reglamento (art. 17). Si prefieres otro arreglo, platiquémoslo; lo importante es acordarlo." + liga;
}
function sitioMis_() {
  const u = String(config_().sitio_url || "").replace(/\/+$/, "");
  return u || REP_SITIO.replace(/\/[^\/]*$/, "");          // la misma dirección que usa el reporte mensual
}
function numDepto_(v) { const m = String(v == null ? "" : v).match(/(\d{1,2})/); const n = m ? Number(m[1]) : NaN; return n >= 1 && n <= UNIDADES ? n : 0; }
/* 52 + 10 dígitos → «442 123 4567»; CDMX, Guadalajara y Monterrey (lada de 2) → «55 1234 5678». */
function telBonito_(tel) {
  let t = String(tel || "").replace(/\D/g, "");
  if (t.length === 12 && t.indexOf("52") === 0) t = t.slice(2);
  if (t.length !== 10) return String(tel || "").trim();
  return /^(55|56|33|81)/.test(t) ? t.slice(0, 2) + " " + t.slice(2, 6) + " " + t.slice(6) : t.slice(0, 3) + " " + t.slice(3, 6) + " " + t.slice(6);
}
/* «domingo 15 de noviembre» */
function fechaLarga_(d) {
  const p = Utilities.formatDate(d, COB_Z, "yyyy-M-d").split("-").map(Number);
  const dia = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).getUTCDay()];
  return dia + " " + p[2] + " de " + REP_MESES[p[1] - 1];
}
const escC_ = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------- correos ------------------------------- */
function marcoCob_(cabeza, cuerpo, pie) {
  return '<div style="background:#f8f7f3;padding:18px 8px;font-family:' + COB_F + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:620px;margin:0 auto;border-collapse:separate">' +
    "<tr><td>" + cabeza + "</td></tr>" +
    '<tr><td style="background:#ffffff;border:1px solid #e1e0d9;border-top:0;border-radius:0 0 18px 18px;padding:18px 16px 20px">' + cuerpo +
    '<div style="font-size:12px;line-height:1.55;color:#898781;margin-top:18px;padding-top:14px;border-top:1px solid #efeee8">' + pie + "</div></td></tr></table></div>";
}
function cabezaCob_(kicker, titulo, sub, chips) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:#1d3f63;border-radius:18px 18px 0 0">' +
    '<tr><td style="padding:22px 20px 16px;font-family:' + COB_F + '">' +
    '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#a9c3dd">' + kicker + "</div>" +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:27px;line-height:1.15;color:#ffffff;margin-top:6px">' + titulo + "</div>" +
    (sub ? '<div style="font-size:15px;line-height:1.45;color:#d6e2ee;margin-top:6px">' + sub + "</div>" : "") +
    (chips && chips.length ? '<div style="margin-top:14px">' + chips.map(c => '<span style="display:inline-block;background:#2b5078;border:1px solid #3e6590;color:#ffffff;border-radius:999px;padding:5px 12px;margin:0 6px 6px 0;font-size:13px;font-weight:700">' + c + "</span>").join("") + "</div>" : "") +
    "</td></tr></table>";
}
function desgloseCob_(deben) {
  const tot = k => deben.reduce((s, a) => s + a[k], 0);
  const celda = (et, v, color) => '<td width="33%" style="padding:3px"><div style="background:#f8f7f3;border-radius:12px;padding:9px 4px;text-align:center">' +
    '<div style="font-size:12px;color:#52514e;word-break:break-word">' + et + '</div><div style="font-size:17px;font-weight:800;color:' + color + '">' + pesos_(v) + "</div></div></td>";
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;table-layout:fixed"><tr>' +
    celda("Mantenimiento", tot("manto"), "#1d3f63") + celda("Agua", tot("agua"), "#2f7fb5") + celda("Extraordinarias", tot("extra"), "#a86a00") + "</tr></table>";
}
function tarjetaCob_(g, sitio) {
  const N = COB_NIVEL[g.nivel], c = g.c || {}, ds = g.deptos.map(a => a.depto), tel = telBonito_(g.tel || c.telTexto);
  const meses = Math.max.apply(null, g.deptos.map(a => a.mesesAtraso));
  const nombre = nombreBonito_(c.paga || c.nombre) || "Sin nombre en «" + HOJA_DIR + "»", ancho = ds.length > 1 ? 30 + 20 * ds.length : 56;
  const det = ds.length === 1 ? escC_(detalle_(g.deptos[0])) : g.deptos.map(a => "<b>Depto " + a.depto + ":</b> " + escC_(detalle_(a))).join("<br>");
  const notas = [c.contacto && "📞 Último contacto: " + escC_(c.contacto), c.promesa && "🤝 " + escC_(c.promesa), c.notas && "📝 " + escC_(c.notas)].filter(Boolean).join("<br>");
  const wa = "https://wa.me/" + (g.tel || "") + "?text=" + encodeURIComponent(mensaje_(g, sitio));
  const boton = (href, texto, estilo) => '<a href="' + escC_(href) + '" style="display:inline-block;text-decoration:none;font-weight:800;font-size:14px;line-height:1;border-radius:999px;' + estilo + '">' + texto + "</a>";
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:#ffffff;border:1px solid #e1e0d9;border-left:5px solid ' + N.color + ';border-radius:14px;margin:0 0 12px">' +
    '<tr><td style="padding:14px 14px 15px;font-family:' + COB_F + '">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed"><tr>' +
        '<td valign="top" width="' + ancho + '" style="width:' + ancho + 'px"><div style="width:' + (ancho - 12) + 'px;height:42px;border-radius:12px;background:#1d3f63;color:#ffffff;font-weight:800;font-size:' + (ds.length > 1 ? 13 : 19) + 'px;line-height:42px;text-align:center;white-space:nowrap">' + ds.join("·") + "</div></td>" +
        '<td valign="top"><div style="font-size:16px;font-weight:800;line-height:1.25;color:#0b0b0b;word-wrap:break-word;overflow-wrap:anywhere">' + escC_(nombre) + "</div>" +
          '<div style="font-size:12px;color:#52514e;margin-top:3px">' + (ds.length > 1 ? "Deptos " + y_(ds.map(String)) : "Depto " + ds[0]) + (meses ? " · " + meses + (meses === 1 ? " mes de atraso" : " meses de atraso") : "") + "</div></td>" +
        '<td valign="top" align="right" width="92" style="width:92px;white-space:nowrap"><div style="font-size:20px;font-weight:800;color:' + N.color + '">' + pesos_(g.total) + "</div></td>" +
      "</tr></table>" +
      '<div style="font-size:14px;line-height:1.45;color:#333333;margin-top:10px">' + det + "</div>" +
      (g.enRevision > 0.5 ? '<div style="font-size:13px;line-height:1.4;color:#1d5a2a;background:#e3f2e6;border-radius:8px;padding:7px 10px;margin-top:9px">⏳ Ya reportó ' + pesos_(g.enRevision) + ": espera a que la mesa lo confirme antes de escribirle.</div>" : "") +
      (notas ? '<div style="font-size:13px;line-height:1.45;color:#52514e;margin-top:8px">' + notas + "</div>" : "") +
      (tel ? '<div style="margin-top:12px"><a href="tel:+' + escC_(g.tel || "52" + String(c.telTexto || "").replace(/\D/g, "")) + '" style="font-size:19px;font-weight:800;letter-spacing:.5px;color:#0b0b0b;text-decoration:none">📱 ' + escC_(tel) + "</a></div>"
        : '<div style="margin-top:12px;font-size:13px;color:#b3261e">Sin teléfono en «' + HOJA_DIR + "»: el botón abre WhatsApp para que elijas el contacto.</div>") +
      '<div style="margin-top:10px">' + boton(wa, "💬 WhatsApp", "background:#168f45;color:#ffffff;padding:11px 18px;margin:0 6px 6px 0") +
        (g.tel ? boton("tel:+" + g.tel, "📞 Llamar", "border:2px solid #1d3f63;color:#1d3f63;padding:9px 16px;margin:0 0 6px 0") : "") + "</div>" +
    "</td></tr></table>";
}
function agendaCob_(deben) {
  const s = sitioMis_(), G = grupos_(deben);
  return [3, 2, 1].map(n => {
    const de = G.filter(g => g.nivel === n); if (!de.length) return "";
    const N = COB_NIVEL[n];
    return '<div style="margin:18px 0 10px"><span style="display:inline-block;background:' + N.fondo + ";color:" + N.color + ';font-size:13px;font-weight:800;border-radius:999px;padding:5px 12px">' + N.nombre + " · " + de.length + "</span>" +
      ' <span style="font-size:12px;color:#898781">' + N.nota + "</span></div>" + de.map(g => tarjetaCob_(g, s)).join("");
  }).join("");
}
function htmlAgenda_(deben, hoy) {
  const G = grupos_(deben), total = deben.reduce((s, a) => s + a.total, 0), rev = G.filter(g => g.enRevision > 0.5).length;
  const cabeza = cabezaCob_("Las Misiones · privado de la mesa", "Agenda de cobranza", may1_(fechaLarga_(hoy)),
    [pesos_(total) + " por cobrar", G.length + (G.length === 1 ? " contacto" : " contactos") + (G.length !== deben.length ? " (" + deben.length + " deptos)" : ""), rev ? rev + " ya reportaron pago" : ""].filter(Boolean));
  const intro = '<p style="font-size:15px;line-height:1.55;color:#333333;margin:0 0 12px">Del que más debe al que menos. <b>💬 WhatsApp</b> abre el chat con el mensaje ya escrito: solo lo revisas y tocas Enviar. <b>📞 Llamar</b> marca directo desde el celular. Si alguien ya reportó un pago, aparece en verde: conviene esperar a que la mesa lo confirme.</p>';
  return marcoCob_(cabeza, intro + desgloseCob_(deben) + agendaCob_(deben),
    "Cuando escribas o llames, anota la fecha y lo que se acordó en la pestaña «" + HOJA_DIR + "» de la hoja (o responde a este correo): aparece en la siguiente agenda.<br>" +
    "🔒 Privado: no lo reenvíes al grupo. Los adeudos cuentan desde " + desdeTexto_() + "; lo de la administración anterior no se cobra.");
}
function may1_(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
/* Config → finanzas_desde («2026-10») → «octubre de 2026». */
function desdeTexto_() { return mesTexto_(config_().finanzas_desde).replace(/^(\d{4})-(\d{2})$/, (x, a, m) => REP_MESES[Number(m) - 1] + " de " + a); }
function htmlReporteCobranza_(L, hoy, conAgenda) {
  const deben = L.filter(a => a.total > 0.5).sort((x, y) => y.total - x.total), total = deben.reduce((s, a) => s + a.total, 0);
  const cabeza = cabezaCob_("Las Misiones · privado de la mesa", "Adeudos al " + fechaLarga_(hoy), deben.length + " de " + UNIDADES + " deptos deben", deben.length ? [pesos_(total) + " por cobrar"] : []);
  const pie = "🔒 Privado: no lo reenvíes al grupo. Los adeudos cuentan desde " + desdeTexto_() + "; lo de la administración anterior no se cobra. Anota llamadas y promesas en la pestaña «" + HOJA_DIR + "» y aparecen aquí la próxima vez.";
  if (!deben.length) return marcoCob_(cabeza, '<p style="font-size:20px;margin:6px 0">🎉 Nadie debe. ¡Mes verde!</p>', pie);
  const td = 'style="padding:9px 6px;border-bottom:1px solid #efeee8;vertical-align:top;font-size:14px;line-height:1.4;word-wrap:break-word;overflow-wrap:anywhere"';
  const filas = deben.map(a => {
    const n = nivel_(a), tel = telBonito_(a.c.tel || a.c.telTexto);
    return "<tr><td " + td + '><div style="font-size:17px;font-weight:800;color:#1d3f63">' + a.depto + '</div><div style="font-size:12px;color:#52514e">' + escC_(nombreBonito_(a.c.paga || a.c.nombre)) + "</div>" +
      (tel ? '<a href="tel:+' + escC_(a.c.tel) + '" style="font-size:12px;font-weight:700;color:#1d3f63;text-decoration:none;white-space:nowrap">📱 ' + escC_(tel) + "</a>" : "") + "</td>" +
      "<td " + td + '><b style="font-size:16px;color:' + COB_NIVEL[n].color + '">' + pesos_(a.total) + "</b>" + (a.mesesAtraso ? '<div style="font-size:12px;color:#52514e">' + a.mesesAtraso + (a.mesesAtraso === 1 ? " mes" : " meses") + "</div>" : "") + "</td>" +
      "<td " + td + ">" + escC_(detalle_(a)) +
        (a.enRevision > 0.5 ? '<div style="font-size:12px;color:#1d5a2a;margin-top:3px">⏳ ' + pesos_(a.enRevision) + " reportado, por confirmar en la bandeja</div>" : "") +
        ((a.c.contacto || a.c.promesa || a.c.notas) ? '<div style="font-size:12px;color:#52514e;margin-top:3px">' + [a.c.contacto && "📞 " + escC_(a.c.contacto), a.c.promesa && "🤝 " + escC_(a.c.promesa), escC_(a.c.notas)].filter(Boolean).join(" · ") + "</div>" : "") + "</td></tr>";
  }).join("");
  const tabla = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;margin-top:8px"><tr style="text-align:left">' +
    '<th width="34%" style="padding:6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#898781">Depto</th><th width="22%" style="padding:6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#898781">Debe</th><th style="padding:6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#898781">Detalle</th></tr>' + filas + "</table>";
  return marcoCob_(cabeza, desgloseCob_(deben) + tabla + (conAgenda ? '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;margin:26px 0 0;color:#0b0b0b">📞 Agenda para llamar y escribir</div>' + agendaCob_(deben) : ""), pie);
}
function textoAgenda_(deben) {
  return grupos_(deben).map(g => (g.deptos.length > 1 ? "Deptos " + y_(g.deptos.map(a => String(a.depto))) : "Depto " + g.deptos[0].depto) + " · " + (nombreBonito_(g.c.paga || g.c.nombre) || "sin nombre") + " · " +
    (telBonito_(g.tel || g.c.telTexto) || "sin teléfono") + " · " + pesos_(g.total) + " · " + g.deptos.map(detalle_).join("; ")).join("\n");
}
function enviarCobranza_(soloA) {
  const cfg = config_(), L = adeudos_(), hoy = new Date(), fecha = Utilities.formatDate(hoy, COB_Z, "d/MM/yyyy");
  const lista = v => String(v || "").split(/[,;\s]+/).filter(x => /@/.test(x));
  const textos = soloA ? [soloA] : lista(cfg.cobranza_textos);
  const conAgenda = textos.map(x => x.toLowerCase());
  const mesa = soloA ? [soloA] : lista(cfg.cobranza_correos).filter(x => conAgenda.indexOf(x.toLowerCase()) < 0);   // quien recibe la agenda ya tiene todo
  const deben = L.filter(a => a.total > 0.5).sort((x, y) => y.total - x.total), total = deben.reduce((s, a) => s + a.total, 0);
  const pre = soloA ? "[Prueba] " : "";
  mesa.forEach(a => MailApp.sendEmail(a, pre + "Adeudos al " + fecha + " · " + (deben.length ? deben.length + " deptos · " + pesos_(total) : "nadie debe 🎉") + " · Las Misiones (privado)",
    "Adeudos de Las Misiones al " + fecha + "\n\n" + textoAgenda_(deben), { name: REP_REMITENTE, htmlBody: htmlReporteCobranza_(L, hoy, !textos.length) }));
  if (deben.length) textos.forEach(a => MailApp.sendEmail(a, pre + "📞 Agenda de cobranza · " + fecha + " · " + grupos_(deben).length + " contactos · " + pesos_(total),
    "Agenda de cobranza de Las Misiones · " + fecha + "\n\n" + textoAgenda_(deben), { name: REP_REMITENTE, htmlBody: htmlAgenda_(deben, hoy) }));
  return { deben: deben.length, mesa: mesa, textos: textos };
}
/* Corre todos los días a las 8 h; solo envía el 15 y el último día del mes (el 30, o el 28/29 en febrero). */
function cobranzaDiaria() {
  const hoy = new Date(), d = Number(Utilities.formatDate(hoy, COB_Z, "d"));
  const ultimo = Number(Utilities.formatDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 12), COB_Z, "d"));
  if (!(d === 15 || d === Math.min(30, ultimo))) return;
  const k = "cobranza_" + Utilities.formatDate(hoy, COB_Z, "yyyy-MM-dd"), p = PropertiesService.getScriptProperties();
  if (p.getProperty(k)) return;
  enviarCobranza_(); p.setProperty(k, "1");
}
function cobranzaPrueba() { return enviarCobranza_(Session.getEffectiveUser().getEmail()); }
function cobranzaAhora() { return enviarCobranza_(); }
