/* Las Misiones · Reporte mensual a los vecinos (correo + PDF + kit de WhatsApp)
   Va como SEGUNDO archivo del mismo proyecto de Apps Script que Code.gs
   (en el editor: "+" → Secuencia de comandos → nombre "Reporte" → pegar esto).
   Usa finanzas_() y config_() de Code.gs: las mismas cifras AGREGADAS que
   finanzas.html. Nunca lleva datos por departamento.

   Qué hace el día 10 de cada mes (9 a 10 de la mañana), con el mes anterior:
   1. Arma el reporte en PDF (una hoja) y lo guarda en Drive, carpeta
      "Misiones · Reportes / AAAA-MM".
   2. Lo envía por correo a los vecinos de la pestaña "Correos" (en copia
      oculta: nadie ve el correo de los demás). El correo es una carta corta y
      visual que se lee en un minuto: el edificio de noche con una ventana
      encendida por cada depto que pagó su cuota (se acomodan al azar: no son
      deptos reales), cómo se movió la caja, en qué se fue la cuota, el agua,
      un dato del mes y la liga a «Mi depto».
   3. Te manda al correo de "reporte_copia" el kit de WhatsApp: el texto, un
      botón que abre WhatsApp con el mensaje ya escrito y botones que abren
      las infografías del mes en infografia.html, donde con un toque se
      comparten como imagen. WhatsApp no permite publicar en grupos de forma
      automática: tú lo reenvías al grupo.

   Candados:
   - Si el mes no tiene datos capturados, NO envía nada a los vecinos y te
     avisa a ti.
   - Un mes se envía una sola vez (aunque el disparador corra de nuevo).
   - Config → reporte_envio = "pausa" detiene los envíos a vecinos; el kit te
     sigue llegando.

   El PDF lo imprime Google con Chromium SIN «gráficos de fondo»: por eso cada
   color de fondo lleva print-color-adjust: exact (sin eso salía deslavado).

   Para instalar: Ejecutar → instalarReporte (una vez). Para probar sin
   molestar a nadie: menú "Condominio" → "Probar el reporte (solo a mí)": te
   llegan el correo tal como lo verán los vecinos y el kit. */

const REP_CORREOS = "Correos";
const REP_BITACORA = "Reportes";
const REP_CARPETA = "Misiones · Reportes";
const REP_BASE = "https://condominio-misiones.eduardo-lusan.workers.dev";      // Config → sitio_url la cambia
const REP_SITIO = REP_BASE + "/finanzas.html";
const REP_INFOGRAFIA = REP_BASE + "/infografia.html";
const REP_REMITENTE = "Mesa directiva · Las Misiones";
/* Rubro · cómo se reconoce en la hoja · color · ícono · cómo se dice en una frase */
const REP_RUBROS = [
  ["Administración", /administraci/i, "#1d3f63", "🗂️", "La administración"],
  ["Limpieza y conserjería", /limpieza|conserj/i, "#3f8f7a", "🧹", "La limpieza y conserjería"],
  ["Luz de áreas comunes", /\bluz\b|cfe/i, "#e0a400", "💡", "La luz de las áreas comunes"],
  ["Jardinería", /jard/i, "#5c9e5a", "🌿", "La jardinería"],
  ["Alberca", /alberca/i, "#2f9fd0", "🏊", "La alberca"],
  ["Elevador", /elevador/i, "#8a6bbf", "↕️", "El elevador"],
  ["Vigilancia", /vigilan|seguridad/i, "#6b7280", "🛡️", "La vigilancia"]
];
const REP_OTROS = ["Otros gastos", null, "#a9a397", "🧾", "Los otros gastos"];
const REP_CAJA = ["Quedó para la caja", null, "#d9c08a", "🐷", ""];
const REP_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/* Paleta del sitio: papel crema, azul marino y ventanas encendidas. */
const RC = { tinta: "#0b0b0b", gris: "#52514e", suave: "#898781", linea: "#e1e0d9", fina: "#efeee8", papel: "#f8f7f3", marino: "#1d3f63",
  noche: "#1b2238", suelo: "#24304a", muro: "#2c3a5c", cornisa: "#3b4a6b", luz: "#ffcb45", luz2: "#e0a400", apagada: "#3b4a6b", apagada2: "#323f5c",
  oro: "#c08a3e", crema: "#fbf3e2", verde: "#2f7d32", verdeClaro: "#e3f2e6", rojo: "#b3261e", rojoClaro: "#fde7e6", coral: "#e8735a",
  agua: "#2f7fb5", aguaClaro: "#e6f3fb", cielo: "#a9c3dd", hielo: "#d6e2ee" };
const RF = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const RG = "Georgia,'Times New Roman',serif";

/* ============================ MENÚ Y ARRANQUE ============================ */

/* El menú vive en Condominio.gs (menú «Condominio»). */

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
function reporteProgramado() {
  try { prepararMesSiguiente(); } catch (e) { Logger.log("No se pudo preparar el mes siguiente: " + e.message); }
  generarReporte_({ modo: "vecinos" });
}
/* Menú: manda el reporte del último mes capturado SOLO a reporte_copia (el correo de los vecinos y el kit). */
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
      "Cuando esté capturada, usa en la hoja el menú «Condominio → Enviar ahora el reporte del mes anterior».", { name: REP_REMITENTE });
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
  const asunto = asuntoVecinos_(k);

  /* 1 · A los vecinos. En la prueba llega solo a ti, tal cual lo verán ellos. */
  let destinatarios = [];
  const pausa = /pausa/i.test(String(cfg.reporte_envio || ""));
  if (opc.modo === "prueba") {
    MailApp.sendEmail(copia, "[Prueba] " + asunto, textoPlano_(k), { name: REP_REMITENTE, htmlBody: correoVecinos_(k), attachments: [pdf] });
  } else if (opc.modo === "vecinos" && !pausa) {
    destinatarios = correosVecinos_();
    if (destinatarios.length) {
      const cuerpo = correoVecinos_(k), plano = textoPlano_(k);
      /* De 40 en 40 en copia oculta: nadie ve el correo de los demás. */
      for (let i = 0; i < destinatarios.length; i += 40) {
        MailApp.sendEmail(copia, asunto, plano, {
          name: REP_REMITENTE, bcc: destinatarios.slice(i, i + 40).join(","), htmlBody: cuerpo, attachments: [pdf]
        });
      }
      props.setProperty("reporteEnviado_" + objetivo, new Date().toISOString());
    }
  }

  /* 2 · A ti: copia + kit de WhatsApp */
  const estado = opc.modo === "prueba" ? "PRUEBA: no se envió a los vecinos. Te llegó aparte el correo tal como lo verán."
    : pausa ? "En pausa (Config → reporte_envio): no se envió a los vecinos."
    : destinatarios.length ? "Enviado a " + destinatarios.length + " correos de vecinos (en copia oculta)."
    : "La pestaña Correos no tiene correos todavía: no se envió a los vecinos.";
  MailApp.sendEmail(copia, (opc.modo === "prueba" ? "[Prueba] " : "") + "Kit de " + nombreMes + " para WhatsApp · Las Misiones", whatsapp, {
    name: REP_REMITENTE, attachments: [pdf],
    htmlBody: kitHtml_(k, whatsapp, estado, archivoPdf.getUrl())
  });
  bitacora_(objetivo, estado, destinatarios.length, archivoPdf.getUrl(), url_(k, "infografia.html?tipo=cuotas&mes=" + objetivo));
}

/* ============================ CIFRAS ============================ */

function indicadores_(d, m) {
  const U = d.unidades || 16, cuota = d.cuota || 1500;
  const ing = m.ingresos.manto + m.ingresos.agua + (m.ingresos.extra || 0) + (m.ingresos.casaClub || 0);
  const egr = m.egresos.ordinarios + m.egresos.extraordinarios;
  const aguaPagada = m.detalle.ordinarios.filter(it => /^agua/i.test(it[0])).reduce((a, it) => a + it[1], 0);
  const rub = REP_RUBROS.map(r => ({ r: r, total: 0 }));
  let otros = 0;
  m.detalle.ordinarios.forEach(it => {
    if (/^agua/i.test(it[0])) return;
    const i = REP_RUBROS.findIndex(r => r[1].test(it[0]));
    if (i < 0) otros += it[1]; else rub[i].total += it[1];
  });
  /* Cada rubro: [nombre, por unidad, color, ícono, frase, total del mes] */
  const rubros = rub.filter(x => x.total > 0.5).sort((a, b) => b.total - a.total).map(x => [x.r[0], x.total / U, x.r[2], x.r[3], x.r[4], x.total]);
  if (otros > 0.5) rubros.push([REP_OTROS[0], otros / U, REP_OTROS[2], REP_OTROS[3], REP_OTROS[4], otros]);
  const delAnio = d.meses.filter(x => x.anio === m.anio && x.id <= m.id);
  const resAnio = delAnio.reduce((a, x) => a + x.ingresos.manto + x.ingresos.agua + (x.ingresos.extra || 0) + (x.ingresos.casaClub || 0) - x.egresos.ordinarios - x.egresos.extraordinarios, 0);
  const mesNum = parseInt(m.id.slice(5), 10);
  const desc = (a, b) => b[1] - a[1];
  const extras = (m.detalle.extraordinarios || []).filter(x => x[1] > 0.5).sort(desc);
  return {
    id: m.id, mes: REP_MESES[mesNum - 1], mesNum: mesNum, anio: m.anio, unidades: U, cuota: cuota,
    saldoIni: m.saldoIni, saldoFin: m.saldoFin, ing: ing, egr: egr, res: ing - egr,
    manto: m.ingresos.manto, aguaCobrada: m.ingresos.agua, extraIng: m.ingresos.extra || 0, casaClub: m.ingresos.casaClub || 0,
    extra: (m.ingresos.extra || 0) + (m.ingresos.casaClub || 0),
    ordinarios: m.egresos.ordinarios, extraordinarios: m.egresos.extraordinarios,
    gastos: m.detalle.ordinarios.concat(m.detalle.extraordinarios).slice().sort(desc),
    ordList: m.detalle.ordinarios.filter(x => x[1] > 0.5).sort(desc), extras: extras, extraGrande: extras[0] || null,
    pagaron: m.cobranza.pagaron, mora: m.mora || null, aguaPagada: aguaPagada,
    cobertura: aguaPagada ? Math.round(m.ingresos.agua / aguaPagada * 100) : null,
    rubros: rubros, costoUnidad: rubros.reduce((a, r) => a + r[1], 0),
    resAnio: resAnio, mesesAnio: delAnio.length, desde: d.desde || "",
    carpeta: m.carpeta || "",
    aguaPend: (d.aguaCobro || []).slice(-1)[0] || null,      // último mes del agua con cargos: cuántos deptos deben su recibo (agregado)
    cajaInicio: d.caja && d.caja.saldoInicialVivo != null ? d.caja.saldoInicialVivo : null,   // la caja cuando la mesa la tomó
    correos: d.correos || null,                                                               // cuántos deptos reciben el reporte
    base: String(config_().sitio_url || "").trim().replace(/\/+$/, "") || REP_BASE
  };
}

/* La historia del mes en una línea: lo primero que se lee. */
function historia_(k) {
  const U = k.unidades, verde = k.pagaron >= U, g = k.extraGrande;
  const sello = g && g[1] >= Math.max(5000, k.egr * 0.4) ? { concepto: minus_(g[0]), monto: g[1] } : null;
  const titulo = verde ? "¡Mes verde! Pagaron los " + U + " deptos" : k.res >= 0 ? "La caja creció " + $_(k.res) : "La caja bajó " + $_(-k.res);
  const fin = $_(k.saldoFin);
  return {
    titulo: titulo, sello: sello,
    bajada: (verde ? "Y la caja cerró " : "Cerró ") + k.mes + " con " + fin + (verde ? "." : " en la caja."),
    bajadaHtml: (verde ? "Y la caja cerró " : "Cerró ") + esc_(k.mes) + ' con <b style="white-space:nowrap;color:' + RC.luz + '">' + fin + "</b>" + (verde ? "." : " en la caja."),
    corto: verde ? "¡mes verde!" : sello ? "se pagó " + sello.concepto : k.res >= 0 ? "la caja creció " + $_(k.res) : "la caja bajó " + $_(-k.res),
    ventanas: verde ? "Las " + U + " ventanas encendidas: todos pagaron su cuota de " + k.mes + "."
      : k.pagaron + " de " + U + " ventanas encendidas: cada luz es un depto que ya pagó su cuota de " + k.mes + "."
  };
}
function asuntoVecinos_(k) { return "Las cuentas de " + k.mes + " · " + historia_(k).corto + " · Las Misiones"; }
function moraTexto_(k) {
  if (!k.mora) return "";
  return k.mora.acumulada > 0.5 ? "Cuotas atrasadas: " + $_(k.mora.acumulada) + " de " + k.mora.unidades + (k.mora.unidades === 1 ? " depto" : " deptos") : "Nadie tiene cuotas atrasadas";
}
/* Una ventana por depto; las encendidas son los que pagaron. Se barajan con el mes como semilla:
   siempre igual para el mismo mes y nunca en el lugar de un depto real. */
function ventanas_(k) {
  const n = k.unidades, on = Math.max(0, Math.min(n, k.pagaron)), v = [];
  for (let i = 0; i < n; i++) v.push(i < on);
  let s = semilla_(k.id);
  for (let i = n - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1), t = v[i]; v[i] = v[j]; v[j] = t; }
  return v;
}
function semilla_(t) { let s = 7; String(t).split("").forEach(c => { s = (s * 31 + c.charCodeAt(0)) % 2147483647; }); return s || 7; }
/* La cuota partida en rubros (por depto) más lo que quedó para la caja, con su porcentaje de la barra. */
function segmentosCuota_(k) {
  const seg = k.rubros.map(r => [r[0], r[1], r[2], r[3]]), sobra = k.cuota - k.costoUnidad;
  if (sobra > 0.5) seg.push([REP_CAJA[0], sobra, REP_CAJA[2], REP_CAJA[3]]);
  const base = seg.reduce((a, s) => a + s[1], 0) || 1;
  let acum = 0;
  seg.forEach((s, i) => { s[4] = i === seg.length - 1 ? Math.max(0, 100 - acum) : Math.max(1, Math.round(s[1] / base * 100)); acum += s[4]; });
  return { seg: seg, sobra: sobra };
}
/* Un dato distinto cada mes. Mientras menos de la mitad reciba el correo, invita a registrarse. */
function datoDelMes_(k) {
  if (k.correos && k.correos.total && k.correos.con < k.correos.total / 2) {
    const u = url_(k, "correo.html");
    return { texto: "Solo " + k.correos.con + " de " + k.correos.total + " deptos reciben este reporte por correo. Si tu vecino no lo recibe, pásale esta liga para registrarse: " + u,
      html: "Solo <b>" + k.correos.con + " de " + k.correos.total + "</b> deptos reciben este reporte por correo. Si tu vecino no lo recibe, pásale " +
        '<a href="' + u + '" style="color:#8a5a12;font-weight:bold">esta liga para registrarse</a>.' };
  }
  const op = [], r = k.rubros.filter(x => x[0] !== REP_OTROS[0])[0];
  if (k.cajaInicio != null && k.desde && k.id > k.desde && k.saldoFin > k.cajaInicio + 1)
    op.push("Cuando la mesa directiva tomó la caja, en " + mesNombre_(k.desde) + " de " + k.desde.slice(0, 4) + ", había " + $_(k.cajaInicio) + ". Al cierre de " + k.mes + " hay " + $_(k.saldoFin) + ".");
  if (r) op.push(r[4] + " costó " + $_(r[5]) + " en " + k.mes + ": " + $_(r[1]) + " por depto, unos " + $_(r[1] / 30) + " al día.");
  op.push("Tu cuota de " + $_(k.cuota) + " al mes son unos " + $_(k.cuota / 30) + " al día. Con eso el edificio tiene limpieza, luz en las áreas comunes y mantenimiento.");
  if (k.mesesAnio >= 2) op.push("En lo que va de " + k.anio + ", la caja " + (k.resAnio >= 0 ? "suma " + $_(k.resAnio) + " a favor." : "lleva " + $_(-k.resAnio) + " en contra."));
  const t = op[(k.mesNum + k.anio) % op.length];
  return { texto: t, html: esc_(t) };
}

/* ============================ FORMATOS ============================ */

function $_(v) { v = Math.round(v); return (v < 0 ? "−$" : "$") + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function esc_(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function may_(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
/* «Reparación alberca» → «reparación alberca»; «CEA» se queda igual. */
function minus_(s) { s = String(s || "").trim(); return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function mesNombre_(id) { return REP_MESES[parseInt(String(id).slice(5), 10) - 1] || String(id); }
function url_(k, p) { return (k && k.base ? k.base : REP_BASE) + "/" + p; }
function lista_(p) { return p.length > 1 ? p.slice(0, -1).join(", ") + " y " + p[p.length - 1] : p.join(""); }

function textoWhatsapp_(k) {
  const h = historia_(k), dato = datoDelMes_(k);
  const l = ["*Las Misiones · Cuentas de " + k.mes + " " + k.anio + "* 🏠", "", (k.pagaron >= k.unidades ? "🎉 " : "") + "*" + h.titulo + "*", ""];
  l.push("💰 En la caja: *" + $_(k.saldoFin) + "*");
  l.push("📥 Entró " + $_(k.ing) + " · 📤 Salió " + $_(k.egr));
  l.push(k.res >= 0 ? "✅ Sobraron " + $_(k.res) : "↘️ Faltaron " + $_(-k.res) + ": los puso la caja");
  if (h.sello) l.push("🧾 Se pagó " + h.sello.concepto + ": " + $_(h.sello.monto));
  l.push("💡 " + k.pagaron + " de " + k.unidades + " deptos pagaron su cuota");
  if (k.mora) l.push(k.mora.acumulada > 0.5 ? "⏳ " + moraTexto_(k) : "⏳ Nadie tiene cuotas atrasadas desde " + (k.desde ? mesNombre_(k.desde) : "que inició la mesa"));
  if (k.aguaPend && k.aguaPend.cargados) l.push("💧 Agua de " + mesNombre_(k.aguaPend.mesAgua) + ": ya pagaron " + k.aguaPend.pagados + " de " + k.aguaPend.cargados + (k.aguaPend.montoPendiente > 0.5 ? ", faltan " + $_(k.aguaPend.montoPendiente) + ". Tu ticket: " + url_(k, "agua.html") : "."));
  if (dato) l.push("", "✨ " + dato.texto);
  l.push("", "Cómo va tu depto 👇", url_(k, "mi-depto.html"), "", "Todas las cuentas y comprobantes 👇", url_(k, "finanzas.html"), "", "_La morosidad se publica siempre agregada, sin identificar a nadie._");
  return l.join("\n");
}

function textoPlano_(k) {
  return "Las cuentas de " + k.mes + " " + k.anio + " · Las Misiones\n\n" + textoWhatsapp_(k).replace(/\*/g, "").replace(/_/g, "") + "\n\nVa adjunto el reporte en PDF.";
}

/* ---------- Correo a los vecinos: una carta corta y visual (tablas, sin imágenes: se ve igual en Gmail, Outlook y el celular) ---------- */

function seccion_(html, primera) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 22px;font-family:' + RF + (primera ? "" : ";border-top:1px solid " + RC.fina) + '">' + html + "</td></tr></table>";
}
function titulo_(t, sub) {
  return '<div style="font-family:' + RG + ';font-size:22px;line-height:1.25;color:' + RC.tinta + '">' + t + "</div>" +
    (sub ? '<div style="font-family:' + RF + ";font-size:14px;line-height:1.55;color:" + RC.gris + ';margin-top:5px">' + sub + "</div>" : "");
}
function edificioCorreo_(k) {
  const v = ventanas_(k), cols = 4, filas = Math.ceil(v.length / cols);
  let pisos = "";
  for (let f = 0; f < filas; f++) {
    pisos += "<tr>";
    for (let c = 0; c < cols; c++) {
      const i = f * cols + c, on = v[i];
      pisos += '<td style="padding:0 5px 10px">' + (i < v.length
        ? '<div style="width:22px;height:23px;background:' + (on ? RC.luz : RC.apagada) + ";border-bottom:4px solid " + (on ? RC.luz2 : RC.apagada2) + ';border-radius:3px 3px 1px 1px;font-size:0;line-height:0">&nbsp;</div>'
        : '<div style="width:22px;height:27px;font-size:0;line-height:0">&nbsp;</div>') + "</td>";
    }
    pisos += "</tr>";
  }
  const edificio = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate">' +
    '<tr><td style="background:' + RC.cornisa + ';height:9px;border-radius:5px 5px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>' +
    '<tr><td style="background:' + RC.muro + ';padding:13px 11px 2px"><table role="presentation" cellpadding="0" cellspacing="0" border="0">' + pisos + "</table></td></tr>" +
    '<tr><td align="center" style="background:' + RC.muro + ';padding:0;font-size:0;line-height:0"><div style="width:26px;height:30px;margin:0 auto;background:' + RC.oro + ';border-radius:5px 5px 0 0;font-size:0;line-height:0">&nbsp;</div></td></tr></table>';
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr>' +
    '<td valign="bottom" style="font-size:34px;line-height:1;padding:0 4px 0 0">🌳</td>' +
    '<td valign="bottom">' + edificio + "</td>" +
    '<td valign="bottom" style="font-size:26px;line-height:1;padding:0 0 0 4px">🌳</td></tr></table>';
}
function heroCorreo_(k, h) {
  const mora = !k.mora ? "" : k.mora.acumulada > 0.5
    ? '<div style="margin-top:10px"><span style="display:inline-block;background:#4a2b31;color:#ffd7d2;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700">⏳ ' + esc_(moraTexto_(k)) + "</span></div>"
    : '<div style="margin-top:10px"><span style="display:inline-block;background:#23402e;color:#c9f0d3;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700">Nadie tiene cuotas atrasadas 🎉</span></div>';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:' + RC.noche + ';border-radius:20px 20px 0 0">' +
    '<tr><td style="padding:22px 22px 0;font-family:' + RF + '">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:' + RC.cielo + '">Las Misiones · ' + may_(k.mes) + " " + k.anio + "</td>" +
        '<td align="right" style="font-size:24px;line-height:1">🌙</td></tr></table>' +
      '<div style="font-family:' + RG + ';font-size:30px;line-height:1.15;color:#ffffff;margin-top:10px">' + esc_(h.titulo) + "</div>" +
      '<div style="font-size:16px;line-height:1.5;color:' + RC.hielo + ';margin-top:8px">' + h.bajadaHtml + "</div>" +
      (h.sello ? '<div style="margin-top:12px"><span style="display:inline-block;background:' + RC.oro + ";color:" + RC.noche + ';font-size:13px;font-weight:800;padding:6px 12px;border-radius:999px">🧾 Se pagó ' + esc_(h.sello.concepto) + ": " + $_(h.sello.monto) + "</span></div>" : "") +
    "</td></tr>" +
    '<tr><td align="center" style="padding:20px 10px 0;font-family:' + RF + ";font-size:13px;letter-spacing:10px;color:" + RC.cielo + '">✦&nbsp;✧&nbsp;✦</td></tr>' +
    '<tr><td align="center" style="padding:6px 10px 0">' + edificioCorreo_(k) + "</td></tr>" +
    '<tr><td align="center" style="background:' + RC.suelo + ';padding:14px 22px 20px;font-family:' + RF + '">' +
      '<div style="font-size:14px;line-height:1.5;color:' + RC.hielo + '">' + esc_(h.ventanas) + "</div>" + mora + "</td></tr></table>";
}
function cajaCorreo_(k) {
  const max = Math.max(k.ing, k.egr, 1);
  const partes = a => a.filter(p => p[1] > 0.5).map(p => p[0] + " " + $_(p[1])).join(" · ");
  const fila = (et, v, color, sub) => '<tr><td style="padding:12px 0 0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed"><tr>' +
      '<td width="58" style="width:58px;font-family:' + RF + ";font-size:14px;color:" + RC.gris + '">' + et + "</td>" +
      '<td><table role="presentation" width="' + Math.max(4, Math.round(v / max * 100)) + '%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:' + color + ';height:16px;border-radius:8px;font-size:0;line-height:0">&nbsp;</td></tr></table></td>' +
      '<td width="96" align="right" style="width:96px;font-family:' + RF + ";font-size:17px;font-weight:800;color:" + RC.tinta + ';white-space:nowrap">' + $_(v) + "</td></tr></table>" +
    (sub ? '<div style="font-family:' + RF + ";font-size:12px;line-height:1.4;color:" + RC.suave + ';margin:4px 0 0 58px">' + sub + "</div>" : "") + "</td></tr>";
  const res = k.res >= 0
    ? '<span style="display:inline-block;background:' + RC.verdeClaro + ';color:#1d5a2a;border-radius:999px;padding:7px 14px;font-size:15px;font-weight:800">✅ Sobraron ' + $_(k.res) + "</span>"
    : '<span style="display:inline-block;background:' + RC.rojoClaro + ';color:#8c1d18;border-radius:999px;padding:7px 14px;font-size:15px;font-weight:800">Faltaron ' + $_(-k.res) + ": los puso la caja</span>";
  return seccion_(titulo_("Cómo se movió la caja", "Empezó " + esc_(k.mes) + " con " + $_(k.saldoIni) + ' y cerró con <b style="white-space:nowrap;color:' + RC.marino + '">' + $_(k.saldoFin) + "</b>.") +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
      fila("Entró", k.ing, RC.verde, partes([["cuotas", k.manto], ["agua", k.aguaCobrada], ["extraordinarias", k.extraIng], ["casa club", k.casaClub]])) +
      fila("Salió", k.egr, RC.coral, partes([["gastos del mes", k.ordinarios], ["extraordinarios", k.extraordinarios]])) + "</table>" +
    '<div style="margin-top:16px">' + res + "</div>", true);
}
function cuotaCorreo_(k) {
  if (!k.rubros.length) return "";
  const c = segmentosCuota_(k), seg = c.seg, n = seg.length;
  const celdas = seg.map((s, i) => '<td width="' + s[4] + '%" style="background:' + s[2] + ";height:22px;font-size:0;line-height:0;border-radius:" +
    (n === 1 ? "11px" : i === 0 ? "11px 0 0 11px" : i === n - 1 ? "0 11px 11px 0" : "0") + '">&nbsp;</td>').join("");
  const leyenda = seg.map(s => "<tr>" +
    '<td width="22" style="width:22px;padding:7px 0;border-bottom:1px solid ' + RC.fina + '"><div style="width:12px;height:12px;border-radius:3px;background:' + s[2] + ';font-size:0;line-height:0">&nbsp;</div></td>' +
    '<td style="padding:7px 0;border-bottom:1px solid ' + RC.fina + ";font-family:" + RF + ";font-size:15px;color:" + RC.tinta + '">' + s[3] + "&nbsp; " + esc_(s[0]) + "</td>" +
    '<td align="right" style="padding:7px 0;border-bottom:1px solid ' + RC.fina + ";font-family:" + RF + ";font-size:15px;font-weight:800;color:" + RC.tinta + ';white-space:nowrap">' + $_(s[1]) + "</td></tr>").join("");
  const notas = [];
  if (c.sobra < -0.5) notas.push("Este mes el gasto por depto (" + $_(k.costoUnidad) + ") pasó la cuota: la diferencia, " + $_(-c.sobra) + " por depto, la puso la caja.");
  if (k.extras.length) notas.push("Aparte, en " + esc_(k.mes) + " se pagaron <b>" + $_(k.extraordinarios) + "</b> de gastos extraordinarios: " +
    lista_(k.extras.slice(0, 2).map(x => esc_(minus_(x[0])) + " (" + $_(x[1]) + ")").concat(k.extras.length > 2 ? [(k.extras.length - 2) + " más"] : [])) + ".");
  return seccion_(titulo_("¿En qué se fue tu cuota de " + $_(k.cuota) + "?", "Lo que costó mantener el edificio en " + esc_(k.mes) + ", dividido entre los " + k.unidades + " deptos. El agua no entra aquí: cada depto la paga aparte, según su medidor.") +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;table-layout:fixed;border-collapse:separate"><tr>' + celdas + "</tr></table>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px">' + leyenda + "</table>" +
    notas.map(t => '<div style="font-size:14px;line-height:1.5;color:' + RC.gris + ";background:" + RC.papel + ';border-radius:12px;padding:10px 12px;margin-top:12px">' + t + "</div>").join(""));
}
function aguaCorreo_(k) {
  const a = k.aguaPend;
  if (!a || !a.cargados) return "";
  const cobrado = Math.max(0, a.montoCargado - a.montoPendiente), pct = a.montoCargado > 0 ? Math.min(100, Math.round(cobrado / a.montoCargado * 100)) : 0;
  const barra = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;table-layout:fixed;border-collapse:separate;background:' + RC.aguaClaro + ';border-radius:11px"><tr>' +
    (pct > 0 ? '<td width="' + Math.max(pct, 3) + '%" style="background:' + RC.agua + ';height:22px;border-radius:11px;font-size:0;line-height:0">&nbsp;</td>' : "") +
    (pct < 100 ? '<td style="height:22px;font-size:0;line-height:0">&nbsp;</td>' : "") + "</tr></table>";
  return seccion_(titulo_("💧 El agua de " + mesNombre_(a.mesAgua), "El recibo de la CEA se reparte entre los " + a.cargados + " deptos según lo que marca cada medidor. Ya pagaron su parte <b>" + a.pagados + " de " + a.cargados + "</b>.") + barra +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="padding-top:6px;font-family:' + RF + ";font-size:13px;font-weight:700;color:" + RC.agua + '">Cobrado ' + $_(cobrado) + "</td>" +
      '<td align="right" style="padding-top:6px;font-family:' + RF + ";font-size:13px;color:" + RC.gris + '">' + (a.montoPendiente > 0.5 ? "Falta " + $_(a.montoPendiente) : "¡Completo!") + "</td></tr></table>" +
    '<div style="margin-top:12px"><a href="' + url_(k, "agua.html") + '" style="font-family:' + RF + ";font-size:15px;font-weight:800;color:" + RC.agua + ';text-decoration:none">Ver mi ticket del agua →</a></div>');
}
function datoCorreo_(k) {
  const d = datoDelMes_(k);
  if (!d) return "";
  return seccion_('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:' + RC.crema + ';border:1px solid #f0e2c0;border-radius:16px"><tr><td style="padding:16px 18px;font-family:' + RF + '">' +
    '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:#8a5a12">✨ Dato del mes</div>' +
    '<div style="font-family:' + RG + ';font-size:19px;line-height:1.4;color:#3d2a0c;margin-top:6px">' + d.html + "</div></td></tr></table>");
}
function botonesCorreo_(k) {
  return seccion_('<div style="text-align:center">' +
    '<div style="font-family:' + RG + ";font-size:20px;color:" + RC.tinta + ';margin-bottom:12px">¿Y tu depto, cómo va?</div>' +
    '<a href="' + url_(k, "mi-depto.html") + '" style="display:inline-block;background:' + RC.marino + ';color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:999px;margin:0 4px 8px">Ver mi depto</a>' +
    '<a href="' + url_(k, "finanzas.html") + '" style="display:inline-block;border:2px solid ' + RC.marino + ";color:" + RC.marino + ';text-decoration:none;font-weight:800;font-size:15px;padding:11px 20px;border-radius:999px;margin:0 4px 8px">Todas las cuentas</a>' +
    '<div style="font-size:14px;color:' + RC.gris + ';margin-top:6px">¿Ya pagaste? <a href="' + url_(k, "pago.html") + '" style="color:' + RC.marino + ';font-weight:700">Regístralo aquí</a></div></div>');
}
/* Cuerpo del correo a los vecinos. */
function correoVecinos_(k) {
  const h = historia_(k);
  const pre = esc_(h.titulo + ". " + h.bajada + " Entraron " + $_(k.ing) + " y salieron " + $_(k.egr) + ".");
  const pie = "Va adjunto el reporte en PDF. Las cifras salen de la hoja de captura de la mesa directiva.<br>" +
    "La morosidad se publica siempre agregada: las ventanas encendidas se acomodan al azar y no son departamentos reales.<br>" +
    "Tienes cinco días para hacer observaciones (art. 19, fracc. XI); la aprobación formal es en asamblea (art. 24).<br>" +
    '¿Prefieres no recibir estos correos? <a href="' + url_(k, "correo.html") + '" style="color:' + RC.suave + '">Date de baja aquí</a>.';
  return '<div style="background:' + RC.papel + ";padding:18px 8px;font-family:" + RF + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:' + RC.papel + '">' + pre + "&#8199;&#847;".repeat(60) + "</div>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;margin:0 auto;border-collapse:separate">' +
    "<tr><td>" + heroCorreo_(k, h) + "</td></tr>" +
    '<tr><td style="background:#ffffff;border-left:1px solid ' + RC.linea + ";border-right:1px solid " + RC.linea + '">' + cajaCorreo_(k) + cuotaCorreo_(k) + aguaCorreo_(k) + datoCorreo_(k) + botonesCorreo_(k) + "</td></tr>" +
    '<tr><td style="background:#ffffff;border:1px solid ' + RC.linea + ";border-top:1px solid " + RC.fina + ';border-radius:0 0 20px 20px;padding:18px 22px 22px;font-family:' + RF + ";font-size:12px;line-height:1.6;color:" + RC.suave + ';text-align:center">' + pie + "</td></tr>" +
    "</table></div>";
}

/* Correo para ti: el kit listo para reenviar al grupo de WhatsApp. */
function kitHtml_(k, whatsapp, estado, urlPdf) {
  const wa = "https://wa.me/?text=" + encodeURIComponent(whatsapp);
  const boton = (url, t, color) => '<a href="' + url + '" style="display:inline-block;background:' + color + ';color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700;margin:4px 6px 4px 0">' + t + "</a>";
  const info = q => url_(k, "infografia.html?" + q);
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">' +
    (typeof saludHtml_ === "function" ? saludHtml_() : "") +
    '<p style="font-size:15px"><b>' + esc_(estado) + "</b></p>" +
    '<p><a href="' + wa + '" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Abrir WhatsApp con el mensaje escrito</a></p>' +
    '<p style="font-size:14px;color:#52514e">En el celular: toca el botón, elige el grupo y envía. Después abre una infografía y toca «Compartir a WhatsApp».</p>' +
    "<p>" + boton(info("tipo=cuotas&mes=" + k.id), "🏢 Cierre de " + k.mes + ": quién pagó", "#1d3f63") +
    boton(info("tipo=avance"), "📈 Avance del mes en curso", "#3fae5a") + boton(info("tipo=agua&mes=" + k.id), "💧 ¿Alcanzó para el agua?", "#2f7fb5") +
    (k.aguaPend ? boton(info("tipo=aguadeuda&mes=" + k.aguaPend.mesAgua), "🚰 Agua por pagar (" + k.aguaPend.pendientes + ")", "#b3261e") : "") + "</p>" +
    '<pre style="white-space:pre-wrap;background:#f4f4f1;border-radius:10px;padding:14px;font-size:14px;font-family:inherit">' + esc_(whatsapp) + "</pre>" +
    '<p style="font-size:13px;color:#898781">El reporte PDF va adjunto y queda en Drive: <a href="' + urlPdf + '">abrir</a>.</p></div>';
}

/* ============================ PDF ============================ */

/* El edificio de noche en SVG (el PDF lo dibuja Chromium; el correo usa tablas porque Gmail no muestra SVG). */
function escenaSvg_(k) {
  const v = ventanas_(k), cols = 4, filas = Math.ceil(v.length / cols);
  const ww = 15, wh = 17, gx = 9, gy = 9, pad = 11, bw = 2 * pad + cols * ww + (cols - 1) * gx, bx = 92, top = 52, puerta = 22;
  const bh = 13 + filas * wh + (filas - 1) * gy + 12 + puerta, suelo = top + bh, W = 262, H = suelo + 6;
  let s = semilla_(k.id + "*");
  const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let cielo = "";
  for (let i = 0; i < 16; i++) cielo += '<circle cx="' + Math.round(azar() * W) + '" cy="' + Math.round(6 + azar() * 80) + '" r="' + (0.6 + azar() * 1.1).toFixed(1) + '" fill="#ffffff" opacity="' + (0.3 + azar() * 0.55).toFixed(2) + '"/>';
  let luces = "";
  v.forEach((on, i) => {
    const x = bx + pad + (i % cols) * (ww + gx), y = top + 13 + Math.floor(i / cols) * (wh + gy);
    luces += on ? '<rect x="' + (x - 3) + '" y="' + (y - 3) + '" width="' + (ww + 6) + '" height="' + (wh + 6) + '" rx="4" fill="#ffcb45" opacity=".2"/>' +
        '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + wh + '" rx="1.5" fill="#ffcb45"/><rect x="' + x + '" y="' + (y + wh - 3) + '" width="' + ww + '" height="3" fill="#e0a400"/>'
      : '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + wh + '" rx="1.5" fill="#3b4a6b"/>';
  });
  const arbol = (x, e) => '<rect x="' + (x - 2) + '" y="' + (suelo - 22 * e) + '" width="4" height="' + (22 * e) + '" fill="#5a3d16"/>' +
    '<circle cx="' + x + '" cy="' + (suelo - 27 * e) + '" r="' + (13 * e) + '" fill="#2f7d32"/><circle cx="' + (x - 8 * e) + '" cy="' + (suelo - 20 * e) + '" r="' + (9 * e) + '" fill="#3a8a3d"/><circle cx="' + (x + 8 * e) + '" cy="' + (suelo - 21 * e) + '" r="' + (9 * e) + '" fill="#276b2a"/>';
  const px = bx + bw / 2 - 9;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' + cielo +
    '<circle cx="' + (W - 30) + '" cy="28" r="15" fill="#ffe7a3"/><circle cx="' + (W - 23) + '" cy="22" r="14" fill="#1b2238"/>' +
    '<rect x="' + (bx - 6) + '" y="' + (top - 8) + '" width="' + (bw + 12) + '" height="10" rx="3" fill="#3b4a6b"/>' +
    '<rect x="' + bx + '" y="' + top + '" width="' + bw + '" height="' + bh + '" fill="#2c3a5c"/>' + luces +
    '<rect x="' + px + '" y="' + (suelo - puerta) + '" width="18" height="' + puerta + '" rx="2" fill="#c08a3e"/><circle cx="' + (px + 9) + '" cy="' + (suelo - puerta - 6) + '" r="2.4" fill="#ffcb45"/>' +
    arbol(bx - 34, 1) + arbol(bx + bw + 30, 0.8) +
    '<rect x="0" y="' + suelo + '" width="' + W + '" height="6" fill="#24304a"/></svg>';
}

function pdfReporte_(k) {
  const h = historia_(k), maxIE = Math.max(k.ing, k.egr, 1), c = segmentosCuota_(k), a = k.aguaPend, dato = datoDelMes_(k);
  const partes = arr => arr.filter(p => p[1] > 0.5).map(p => p[0] + " " + $_(p[1])).join(" · ");
  const pct = v => Math.max(3, Math.round(v / maxIE * 100));
  const tabla = (titulo, lista, total) => !lista.length ? "" : '<div><table class="gt"><tr><th>' + titulo + "</th><th></th></tr>" +
    lista.slice(0, 9).map(g => "<tr><td>" + esc_(g[0]) + '</td><td class="m">' + $_(g[1]) + "</td></tr>").join("") +
    (lista.length > 9 ? '<tr><td colspan="2" class="mas">… y ' + (lista.length - 9) + " más en el sitio</td></tr>" : "") +
    '<tr class="t"><td>Total</td><td class="m">' + $_(total) + "</td></tr></table></div>";
  let agua = "";
  if (a && a.cargados) {
    const cobrado = Math.max(0, a.montoCargado - a.montoPendiente), p = a.montoCargado > 0 ? Math.min(100, Math.round(cobrado / a.montoCargado * 100)) : 0;
    agua = '<div class="agua"><h3>El agua de ' + mesNombre_(a.mesAgua) + "</h3><p>El recibo de la CEA se reparte según cada medidor. Ya pagaron su parte <b>" + a.pagados + " de " + a.cargados + "</b> deptos.</p>" +
      '<div class="tanque"><i style="width:' + p + '%"></i></div><div class="dos"><span>Cobrado ' + $_(cobrado) + "</span><span>" + (a.montoPendiente > 0.5 ? "Falta " + $_(a.montoPendiente) : "¡Completo!") + "</span></div></div>";
  }
  const css = "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#0b0b0b;font-size:12px;line-height:1.45}" +
    ".serif{font-family:Georgia,'Times New Roman',serif;font-weight:normal}" +
    ".hero{background:#1b2238;color:#fff;border-radius:16px 16px 0 0;padding:22px 16px 0 26px;display:flex;justify-content:space-between;align-items:flex-end}" +
    ".hero-txt{flex:1;padding-bottom:18px}.kick{font-size:9px;letter-spacing:2.4px;text-transform:uppercase;font-weight:bold;color:#a9c3dd}" +
    ".mes{font-size:42px;line-height:1.05;margin-top:6px}.titular{font-size:18px;font-weight:bold;color:#ffcb45;margin-top:7px}" +
    ".sello{display:inline-block;margin-top:9px;background:#c08a3e;color:#1b2238;font-weight:bold;font-size:11.5px;border-radius:999px;padding:4px 10px}" +
    ".caja{margin-top:16px}.caja span{display:block;font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:#a9c3dd}" +
    ".caja b{display:block;font-size:36px;line-height:1.1}.caja em{font-style:normal;color:#d6e2ee;font-size:11px}" +
    ".hero-img{width:262px;flex:none;line-height:0}" +
    ".suelo{background:#24304a;color:#d6e2ee;border-radius:0 0 16px 16px;padding:10px 24px;font-size:11.5px;text-align:center}" +
    ".kpis{display:flex;gap:12px;margin-top:16px}.kpi{flex:1;border:1px solid #e1e0d9;border-radius:12px;padding:12px 14px;background:#fdfcf9}" +
    ".kpi span{display:block;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#52514e}.kpi b{display:block;font-size:25px;margin-top:3px}" +
    ".kpi em{display:block;font-style:normal;font-size:10px;color:#898781;margin-top:5px}" +
    ".barra{height:8px;background:#efeee8;border-radius:4px;margin-top:6px;overflow:hidden}.barra i{display:block;height:100%;border-radius:4px}" +
    ".cols{display:flex;gap:18px;margin-top:20px}.izq{flex:1.3}.der{flex:1;display:flex;flex-direction:column;gap:12px}" +
    "h2{font-size:19px;margin:0 0 10px}.apilada{display:flex;height:18px;border-radius:9px;overflow:hidden}.apilada i{display:block;height:100%}" +
    ".ley{width:100%;border-collapse:collapse;margin-top:6px}.ley td{padding:5px 0;font-size:12.5px;border-bottom:1px solid #efeee8}" +
    ".ley .c{width:18px}.ley .c i{display:inline-block;width:10px;height:10px;border-radius:2px}.ley .m{text-align:right;font-weight:bold;white-space:nowrap}" +
    ".nota{font-size:10.5px;color:#52514e;margin:8px 0 0;line-height:1.45}" +
    ".agua{background:#e6f3fb;border-radius:12px;padding:13px 14px}.agua h3,.dato h3{margin:0;font-size:9px;letter-spacing:1.5px;text-transform:uppercase}" +
    ".agua h3{color:#2f7fb5}.agua p{margin:6px 0 0;font-size:11.5px;color:#1f3b52}" +
    ".tanque{height:14px;background:#ffffff;border-radius:6px;overflow:hidden;margin:8px 0 4px}.tanque i{display:block;height:100%;background:#2f7fb5}" +
    ".dos{display:flex;justify-content:space-between;font-size:10.5px;color:#2f7fb5;font-weight:bold}" +
    ".dato{background:#fbf3e2;border:1px solid #f0e2c0;border-radius:12px;padding:13px 14px}.dato h3{color:#8a5a12}" +
    ".dato p{font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.4;color:#3d2a0c;margin:5px 0 0}.dato a{color:#8a5a12}" +
    ".gastos{margin-top:20px}.gcols{display:flex;gap:20px}.gcols>div{flex:1}.gt{width:100%;border-collapse:collapse}" +
    ".gt th{text-align:left;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#898781;padding:0 0 4px;font-weight:bold}" +
    ".gt td{padding:5px 0;border-bottom:1px solid #efeee8;font-size:11.5px}.gt td.m{text-align:right;white-space:nowrap;padding-left:8px}" +
    ".gt .mas{color:#898781;font-size:10.5px}.gt tr.t td{font-weight:bold;border-bottom:0}" +
    ".pie{margin-top:20px;background:#f8f7f3;border-radius:10px;padding:10px 14px;font-size:9.5px;color:#52514e;line-height:1.5}";
  const html = '<html><head><meta charset="utf-8"><style>' + css + "</style></head><body>" +
    '<div class="hero"><div class="hero-txt">' +
      '<div class="kick">Las Misiones Residencial · Rendición de cuentas</div>' +
      '<div class="mes serif">' + may_(k.mes) + " " + k.anio + "</div>" +
      '<div class="titular">' + esc_(h.titulo) + "</div>" +
      (h.sello ? '<div class="sello">Se pagó ' + esc_(h.sello.concepto) + ": " + $_(h.sello.monto) + "</div>" : "") +
      '<div class="caja"><span>En la caja al cierre</span><b>' + $_(k.saldoFin) + "</b><em>empezó el mes en " + $_(k.saldoIni) + "</em></div>" +
    '</div><div class="hero-img">' + escenaSvg_(k) + "</div></div>" +
    '<div class="suelo">' + esc_(h.ventanas) + (k.mora ? " · " + esc_(moraTexto_(k)) : "") + "</div>" +
    '<div class="kpis">' +
      '<div class="kpi"><span>Entró</span><b>' + $_(k.ing) + '</b><div class="barra"><i style="width:' + pct(k.ing) + '%;background:#2f7d32"></i></div><em>' + partes([["cuotas", k.manto], ["agua", k.aguaCobrada], ["extraordinarias", k.extraIng], ["casa club", k.casaClub]]) + "</em></div>" +
      '<div class="kpi"><span>Salió</span><b>' + $_(k.egr) + '</b><div class="barra"><i style="width:' + pct(k.egr) + '%;background:#e8735a"></i></div><em>' + partes([["gastos del mes", k.ordinarios], ["extraordinarios", k.extraordinarios]]) + "</em></div>" +
      '<div class="kpi"><span>' + (k.res >= 0 ? "Sobró" : "Faltó") + '</span><b style="color:' + (k.res >= 0 ? "#2f7d32" : "#b3261e") + '">' + $_(Math.abs(k.res)) + "</b><em>" +
        (k.res >= 0 ? "se suma a la caja" : "lo puso la caja") + " · en " + k.anio + ": " + (k.resAnio >= 0 ? "+" : "") + $_(k.resAnio) + " (" + k.mesesAnio + (k.mesesAnio === 1 ? " mes" : " meses") + ")</em></div>" +
    "</div>" +
    '<div class="cols"><div class="izq">' +
      (k.rubros.length ? '<h2 class="serif">¿En qué se fue tu cuota de ' + $_(k.cuota) + "?</h2>" +
        '<div class="apilada">' + c.seg.map(s => '<i style="width:' + s[4] + "%;background:" + s[2] + '"></i>').join("") + "</div>" +
        '<table class="ley">' + c.seg.map(s => '<tr><td class="c"><i style="background:' + s[2] + '"></i></td><td>' + esc_(s[0]) + '</td><td class="m">' + $_(s[1]) + "</td></tr>").join("") + "</table>" +
        '<p class="nota">Lo que costó mantener el edificio, dividido entre los ' + k.unidades + " deptos. El agua no entra aquí: cada depto la paga aparte, según su medidor." +
          (c.sobra < -0.5 ? " Este mes el gasto por depto pasó la cuota: la diferencia (" + $_(-c.sobra) + " por depto) la puso la caja." : "") + "</p>" : "") +
      (k.extras.length ? '<p class="nota">Aparte, se pagaron <b>' + $_(k.extraordinarios) + "</b> de gastos extraordinarios: " +
        lista_(k.extras.slice(0, 2).map(x => esc_(minus_(x[0])) + " (" + $_(x[1]) + ")").concat(k.extras.length > 2 ? [(k.extras.length - 2) + " más"] : [])) + ".</p>" : "") +
    '</div><div class="der">' + agua +
      (dato ? '<div class="dato"><h3>Dato del mes</h3><p>' + dato.html + "</p></div>" : "") +
    "</div></div>" +
    '<div class="gastos"><h2 class="serif">Gastos del mes</h2><div class="gcols">' + tabla("Ordinarios", k.ordList, k.ordinarios) + tabla("Extraordinarios", k.extras, k.extraordinarios) + "</div></div>" +
    '<div class="pie">Detalle completo, gráficas y comprobantes: <b>' + url_(k, "finanzas.html") + "</b> · Tu depto: <b>" + url_(k, "mi-depto.html") + "</b>" +
      (k.carpeta ? "<br>Comprobantes del mes en Drive: " + esc_(k.carpeta) : "") +
      "<br>Cifras tomadas de la hoja de captura de la mesa directiva. La morosidad se publica siempre agregada: las ventanas encendidas se acomodan al azar y no corresponden a ningún departamento. " +
      "Cada condómino tiene cinco días para formular observaciones (art. 19, fracc. XI); la aprobación formal corresponde a la asamblea (art. 24).</div>" +
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
