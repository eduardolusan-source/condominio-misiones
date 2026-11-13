/* Las Misiones · Mesa directiva y reuniones (cuarto archivo del proyecto: «+ → Secuencia de comandos → Mesa»).

   Una sola reunión «viva» a la vez (la última fila de la pestaña Reuniones):
     Convocada → En curso → Cerrada. Se queda a la vista hasta que la mesa prepara la siguiente.
   - mesa.html (con la clave de la bandeja) la arma, abre la votación, registra asistencia y votos,
     cierra con acuerdos y sube la minuta; también confirma reservas de la casa club.
   - reunion.html la muestra a todos (convocatoria, orden del día, votos en vivo, presentación).
   - minutas.html junta los acuerdos de todas las reuniones (pestaña «Acuerdos vivos») y las minutas.
   Todo lo que escribe pide la clave (Config → clave_admin), incluidos los votos. */

const HOJA_REUNIONES = "Reuniones";
const ENC_REUNIONES = ["Id", "Título", "Tipo", "Fecha", "Hora", "Lugar", "Enlace videollamada", "Convocatoria", "Temas (no editar a mano)", "Estado", "Minuta", "Actualizado"];
const HOJA_AVIVOS = "Acuerdos vivos";
const ENC_AVIVOS = ["Reunión", "Fecha", "Acuerdo", "Responsable", "Compromiso", "Estado", "Actualizado"];
const ESTADOS_ACUERDO = ["Pendiente", "En curso", "Cumplido"];
const QUORUM = Math.floor(UNIDADES / 2) + 1;   // mitad más uno de los deptos

/* ------------------------------- rutas (las llama Code.gs) ------------------------------- */
function rutaMesaGet_(p) {
  if (p.accion === "reunion") return reunionPublica_();
  if (p.accion === "mesa") return panelMesa_(p.clave);
  if (p.accion === "edificio") return edificio_(p.clave, !!p.fresh);
  return null;
}
function rutaMesaPost_(d) {
  const mapa = { reunionGuardar: guardarReunion_, reunionEstado: estadoReunion_, reunionVoto: votoReunion_, reunionCerrar: cerrarReunion_,
    reunionMinuta: minutaReunion_, acuerdoEstado: estadoAcuerdo_, casaResolver: resolverCasa_ };
  const f = mapa[d.accion];
  if (!f) return null;
  if (String(d.claveAdmin || "") !== claveAdmin_()) return { ok: false, error: "clave" };
  return f(d);
}

/* ------------------------------------- lectura ------------------------------------- */
function hojaReuniones_() { return hojaSimple_(HOJA_REUNIONES, ENC_REUNIONES); }
function filasReuniones_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_REUNIONES);
  return h && h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, ENC_REUNIONES.length).getValues() : [];
}
function reunionDeFila_(f) {
  let temas = [];
  try { temas = JSON.parse(String(f[8] || "[]")); } catch (e) { temas = []; }
  return { id: String(f[0]), titulo: String(f[1] || ""), tipo: String(f[2] || "Reunión"), fecha: diaIso_(f[3]), hora: horaTxt_(f[4]),
    lugar: String(f[5] || ""), enlace: String(f[6] || ""), convocatoria: String(f[7] || ""), temas: temas,
    estado: String(f[9] || "Convocada"), minuta: String(f[10] || "") };
}
function horaTxt_(v) { return Object.prototype.toString.call(v) === "[object Date]" ? Utilities.formatDate(v, "America/Mexico_City", "HH:mm") : String(v || ""); }

/* Votos de una reunión: en la pestaña Votos, la pregunta se guarda como «<id reunión>·<id tema>». */
function votosReunion_(id) {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_VOTOS);
  const r = { votos: {}, asistencia: [] };
  if (!h || h.getLastRow() < 2) return r;
  h.getRange(2, 1, h.getLastRow() - 1, 3).getValues().forEach(f => {
    const p = String(f[0]), o = String(f[2]), dep = Number(f[1]);
    if (p.indexOf(id + "·") !== 0 || !o) return;
    const t = p.slice(id.length + 1);
    if (t === "asistencia") { r.asistencia.push(dep); return; }
    const q = r.votos[t] = r.votos[t] || { conteo: {}, deptos: {} };
    q.conteo[o] = (q.conteo[o] || 0) + 1;
    q.deptos[dep] = o;
  });
  r.asistencia.sort((a, b) => a - b);
  return r;
}

function acuerdosVivos_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_AVIVOS);
  if (!h || h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, ENC_AVIVOS.length).getValues().map((f, i) => ({
    fila: i + 2, reunion: String(f[0] || ""), fecha: diaIso_(f[1]), acuerdo: String(f[2] || ""), responsable: String(f[3] || ""),
    compromiso: String(f[4] || "") && Object.prototype.toString.call(f[4]) === "[object Date]" ? diaIso_(f[4]) : String(f[4] || ""),
    estado: String(f[5] || "Pendiente") })).filter(a => a.acuerdo);
}

function reunionPublica_() {
  const filas = filasReuniones_();
  const r = { ok: true, quorum: QUORUM, unidades: UNIDADES, reunion: null, anteriores: [], acuerdos: acuerdosVivos_() };
  if (filas.length) {
    const actual = reunionDeFila_(filas[filas.length - 1]);
    Object.assign(actual, votosReunion_(actual.id));
    r.reunion = actual;
    r.anteriores = filas.slice(0, -1).reverse().map(reunionDeFila_).filter(x => x.estado === "Cerrada")
      .map(x => Object.assign({ id: x.id, titulo: x.titulo, tipo: x.tipo, fecha: x.fecha, minuta: x.minuta,
        temas: x.temas.map(t => ({ id: t.id, titulo: t.titulo, tipo: t.tipo, pregunta: t.pregunta || "", opciones: t.opciones || [], acuerdo: t.acuerdo || "", responsable: t.responsable || "", compromiso: t.compromiso || "" })) }, { resultados: votosReunion_(x.id).votos }));
  }
  return r;
}

function panelMesa_(clave) {
  if (String(clave || "") !== claveAdmin_()) return { ok: false, error: "clave" };
  const hoy = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd");
  const casa = (typeof filasRcc_ === "function" ? filasRcc_() : []).filter(f => /por confirmar/i.test(String(f[6] || "Por confirmar")) && diaIso_(f[2]) >= hoy && f[0])
    .map(f => ({ folio: String(f[0]), dia: diaIso_(f[2]), horario: String(f[3]), depto: Number(f[4]) }));
  const pend = pendientes_(clave);
  return Object.assign(reunionPublica_(), { pagos: pend.ok ? pend.total : 0, casa: casa });
}

/* ---------------------------- edificio (quién debe, de un vistazo) ----------------------------
   Para mesa → «Quién debe». Por depto y por mes: si la cuota de mantenimiento quedó cubierta (los pagos
   cubren primero el mes más viejo, como en Mi depto) y si pagó el agua que se cobra ese mes (la del mes
   anterior). Más el adeudo total de hoy. Solo con la clave de la mesa. Se guarda 5 min. */
function edificio_(clave, fresco) {
  if (String(clave || "") !== claveAdmin_()) return { ok: false, error: "clave" };
  const c = CacheService.getScriptCache();
  if (!fresco) { const g = c.get("edificio"); if (g) { try { return JSON.parse(g); } catch (e) {} } }
  const out = edificioCalc_();
  try { c.put("edificio", JSON.stringify(out), 300); } catch (e) {}
  return out;
}
/* Arma el edificio (sin clave: lo usan edificio_ y el calentador). */
function edificioCalc_() {
  if (typeof MEMO_MD_ !== "undefined") MEMO_MD_.lote = true;
  const cs = typeof contactos_ === "function" ? (function () { try { return contactos_(); } catch (e) { return {}; } })() : {};
  const meses = {}, deptos = [];
  let cuota = 1500, hoy = "";
  for (let d = 1; d <= UNIDADES; d++) {
    const m = miDepto_(d); if (!m.ok) continue;
    cuota = m.cuota || cuota; hoy = m.hoy || hoy;
    const est = {};
    let pagado = 0, debido = 0;
    (m.meses || []).forEach(x => { pagado += Number(x.manto) || 0; });
    (m.meses || []).forEach(x => {
      if (x.futuro) return;
      meses[x.id] = x.nombre;
      const cubre = Math.max(0, Math.min(x.cuota, pagado - debido));
      debido += x.cuota;
      est[x.id] = { m: cubre >= x.cuota - 0.5 ? "si" : cubre > 0.5 ? "parcial" : "no", cubre: Math.round(cubre), pago: Math.round(Number(x.manto) || 0) };
    });
    const agua = {};
    (m.agua || []).forEach(a => { agua[a.mes] = { cargo: Math.round(a.cargo), pagado: !!a.pagado }; });
    const extra = m.extraordinaria ? m.extraordinaria.pendiente : 0;
    const k = cs[d] || {};
    deptos.push({ d: d, nombre: k.paga || k.nombre || "", tel: k.tel || "", total: Math.round(m.total), manto: Math.round(m.debeManto), agua: Math.round(m.aguaPendiente),
      extra: Math.round(extra), extraNombre: m.extraordinaria && extra > 0.5 ? m.extraordinaria.nombre : "", aFavor: Math.round(m.aFavor || 0), meses: est, recibos: agua,
      enRevision: (m.pagos || []).some(p => /pendiente/i.test(String(p.estatus || ""))) });
  }
  return { ok: true, hoy: hoy, cuota: cuota, meses: Object.keys(meses).sort().map(id => ({ id: id, nombre: meses[id] })), deptos: deptos, generado: new Date().toISOString() };
}

/* ------------------------------------- escritura ------------------------------------- */
function limpiarTemas_(temas) {
  return (Array.isArray(temas) ? temas : []).slice(0, 20).map((t, i) => {
    const vota = t.tipo === "vota";
    const ops = vota ? (Array.isArray(t.opciones) ? t.opciones : []).map(o => limpiar_(o, 40)).filter(Boolean).slice(0, 6) : [];
    return { id: limpiar_(t.id, 12).replace(/[^a-z0-9]/gi, "") || "t" + (i + 1), titulo: limpiar_(t.titulo, 120), tipo: vota ? "vota" : "informa",
      texto: String(t.texto || "").replace(/^[=+\-@]+/, "").slice(0, 1500), pregunta: vota ? limpiar_(t.pregunta, 200) : "",
      opciones: vota ? (ops.length >= 2 ? ops : ["Sí", "No", "Abstención"]) : [],
      acuerdo: limpiar_(t.acuerdo, 600), responsable: limpiar_(t.responsable, 120), compromiso: limpiar_(t.compromiso, 40) };
  }).filter(t => t.titulo);
}

function guardarReunion_(d) {
  const x = d.reunion || {};
  const fecha = String(x.fecha || "").slice(0, 10), hora = limpiar_(x.hora, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: "fecha" };
  const titulo = limpiar_(x.titulo, 120) || (x.tipo === "Asamblea" ? "Asamblea de propietarios" : "Reunión de vecinos");
  const temas = limpiarTemas_(x.temas);
  const enlace = /^https:\/\/\S+$/.test(String(x.enlace || "").trim()) ? String(x.enlace).trim().slice(0, 300) : "";
  const h = hojaReuniones_(), filas = filasReuniones_();
  const ultima = filas.length ? reunionDeFila_(filas[filas.length - 1]) : null;
  const nueva = !ultima || ultima.estado === "Cerrada";
  let id = nueva ? "R" + fecha.replace(/-/g, "") : ultima.id;
  if (nueva && filas.some(f => String(f[0]) === id)) id += "b";
  const fila = nueva ? h.getLastRow() + 1 : filas.length + 1;
  h.getRange(fila, 1, 1, ENC_REUNIONES.length).setValues([[id, titulo, x.tipo === "Asamblea" ? "Asamblea" : "Reunión", fecha, hora,
    limpiar_(x.lugar, 120), enlace, limpiar_(x.convocatoria, 600), JSON.stringify(temas), nueva ? "Convocada" : ultima.estado, nueva ? "" : ultima.minuta, new Date()]]);
  h.getRange(fila, 4).setNumberFormat("yyyy-mm-dd"); h.getRange(fila, 5).setNumberFormat("@").setValue(hora);
  return { ok: true, id: id, nueva: nueva };
}

function filaActual_() {
  const filas = filasReuniones_();
  return filas.length ? { n: filas.length + 1, r: reunionDeFila_(filas[filas.length - 1]) } : null;
}

function estadoReunion_(d) {
  const a = filaActual_();
  if (!a) return { ok: false, error: "sin reunión" };
  const estado = ["Convocada", "En curso"].indexOf(d.estado) >= 0 ? d.estado : null;
  if (!estado || a.r.estado === "Cerrada") return { ok: false, error: "estado" };
  hojaReuniones_().getRange(a.n, 10, 1, 3).setValues([[estado, a.r.minuta, new Date()]]);
  return { ok: true, estado: estado };
}

function votoReunion_(d) {
  const a = filaActual_();
  if (!a || a.r.estado !== "En curso") return { ok: false, error: "cerrada" };
  const tema = String(d.tema || "");
  if (tema !== "asistencia" && !a.r.temas.some(t => t.id === tema && t.tipo === "vota")) return { ok: false, error: "tema" };
  if (tema !== "asistencia" && d.opcion && a.r.temas.find(t => t.id === tema).opciones.indexOf(d.opcion) < 0) return { ok: false, error: "opción" };
  return votar_({ depto: d.depto, pregunta: a.r.id + "·" + tema, opcion: tema === "asistencia" && d.opcion ? "Presente" : d.opcion || "" });
}

function cerrarReunion_(d) {
  const a = filaActual_();
  if (!a || a.r.estado === "Cerrada") return { ok: false, error: "estado" };
  const nuevos = {};
  (Array.isArray(d.acuerdos) ? d.acuerdos : []).forEach(x => { nuevos[String(x.id)] = x; });
  const temas = a.r.temas.map(t => { const x = nuevos[t.id] || {};
    return Object.assign(t, { acuerdo: limpiar_(x.acuerdo, 600), responsable: limpiar_(x.responsable, 120), compromiso: limpiar_(x.compromiso, 40) }); });
  const h = hojaReuniones_();
  h.getRange(a.n, 9, 1, 4).setValues([[JSON.stringify(temas), "Cerrada", a.r.minuta, new Date()]]);
  const hv = hojaAvivos_(), nombre = a.r.titulo + " · " + a.r.fecha;
  const filas = temas.filter(t => t.acuerdo).map(t => [nombre, a.r.fecha, t.acuerdo, t.responsable, t.compromiso, "Pendiente", new Date()]);
  if (filas.length) { hv.getRange(hv.getLastRow() + 1, 1, filas.length, ENC_AVIVOS.length).setValues(filas); }
  let minuta = { ok: true };
  if (d.minuta || d.archivo) minuta = minutaReunion_(d);
  return { ok: true, acuerdos: filas.length, minuta: minuta.url || "" , avisoMinuta: minuta.ok ? "" : minuta.error };
}

/* La minuta: un enlace (Drive, Docs) o un archivo (PDF o foto) que se guarda en Drive con
   «cualquiera con el enlace puede ver». Vale para la reunión vigente aunque ya esté cerrada. */
function minutaReunion_(d) {
  const a = filaActual_();
  if (!a) return { ok: false, error: "sin reunión" };
  let url = /^https:\/\/\S+$/.test(String(d.minuta || "").trim()) ? String(d.minuta).trim().slice(0, 400) : "";
  if (d.archivo && String(d.archivo).length > 100) {
    const tipo = /^(application\/pdf|image\/(jpeg|png|webp))$/.test(String(d.tipo || "")) ? d.tipo : "application/pdf";
    const ext = tipo === "application/pdf" ? ".pdf" : tipo === "image/png" ? ".png" : ".jpg";
    const blob = Utilities.newBlob(Utilities.base64Decode(String(d.archivo).replace(/^data:[^,]+,/, "")), tipo, "Minuta " + a.r.fecha + " · " + a.r.titulo + ext);
    const raiz = carpetaRaiz_(), it = raiz.getFoldersByName("Minutas");
    const archivo = (it.hasNext() ? it.next() : raiz.createFolder("Minutas")).createFile(blob);
    try { archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* la cuenta no deja compartir: queda el enlace privado */ }
    url = archivo.getUrl();
  }
  if (!url) return { ok: false, error: "minuta" };
  hojaReuniones_().getRange(a.n, 11, 1, 2).setValues([[url, new Date()]]);
  return { ok: true, url: url };
}

function hojaAvivos_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_AVIVOS);
  if (h) return h;
  h = hojaSimple_(HOJA_AVIVOS, ENC_AVIVOS);
  try { h.getRange(2, 6, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS_ACUERDO, true).setAllowInvalid(true).build()); } catch (e) {}
  // La primera vez se traen los acuerdos de la asamblea del 13 de octubre (pestaña Acuerdos).
  const vieja = ss.getSheetByName(HOJA_ACUERDOS);
  if (vieja && vieja.getLastRow() > 1) {
    const filas = vieja.getRange(2, 1, vieja.getLastRow() - 1, 4).getValues().filter(f => String(f[1] || "").trim())
      .map(f => ["Asamblea del 13 de octubre · 2026-10-13", "2026-10-13", String(f[1]), String(f[2] || ""), String(f[3] || ""), "Pendiente", new Date()]);
    if (filas.length) h.getRange(2, 1, filas.length, ENC_AVIVOS.length).setValues(filas);
  }
  return h;
}

function estadoAcuerdo_(d) {
  const fila = parseInt(d.fila, 10), estado = ESTADOS_ACUERDO.indexOf(d.estado) >= 0 ? d.estado : null;
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_AVIVOS);
  if (!h || !estado || !(fila >= 2 && fila <= h.getLastRow())) return { ok: false, error: "acuerdo" };
  h.getRange(fila, 6, 1, 2).setValues([[estado, new Date()]]);
  return { ok: true, fila: fila, estado: estado };
}

/* Casa club desde mesa.html: confirmar o rechazar; si el depto dejó correo, se le avisa. */
function resolverCasa_(d) {
  if (typeof filasRcc_ !== "function") return { ok: false, error: "Falta actualizar el archivo Condominio" };
  const folio = String(d.folio || "").trim().toUpperCase(), estatus = ["Confirmada", "Rechazada"].indexOf(d.estatus) >= 0 ? d.estatus : null;
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_RCC);
  const filas = filasRcc_(), i = filas.findIndex(f => String(f[0]).toUpperCase() === folio);
  if (!h || i < 0 || !estatus) return { ok: false, error: "no encontrado" };
  const nota = limpiar_(d.nota, 200);
  h.getRange(i + 2, 7, 1, 2).setValues([[estatus, nota || filas[i][7] || ""]]);
  const correo = String(filas[i][5] || "");
  if (correo) MailApp.sendEmail(correo, "Casa club " + folio + ": " + estatus.toLowerCase(), "Tu reserva del " + diaIso_(filas[i][2]) + " (" + filas[i][3] + ") quedó " + estatus.toLowerCase() + "." + (nota ? "\n\nNota de la mesa: " + nota : ""), { name: REP_REMITENTE });
  return { ok: true, folio: folio, estatus: estatus };
}
