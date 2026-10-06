/* Las Misiones Residencial · Registro de pagos
   Apps Script ligado a la hoja de captura (Extensiones → Apps Script).
   Instalación paso a paso: apps-script/INSTALAR.md

   Qué hace:
   - instalar(): se corre UNA vez a mano. Ajusta la hoja (meses que faltan de 2026,
     columna de monto para casa club y su suma en el resumen), crea las pestañas
     "Pagos" y "Config", y la carpeta de Drive para los comprobantes.
   - doPost: recibe un pago reportado desde pago.html, guarda la captura en Drive
     y agrega un renglón en "Pagos" con estatus "Pendiente".
   - doGet: responde a pago.html qué tiene por pagar un departamento y sus pagos
     anteriores con su estatus.
   - onEdit: cuando cambias el estatus a "Confirmado" pone la fecha sola.
*/

const CLAVE        = "misiones";            // la misma que en pago.html; solo frena envíos ajenos
const CARPETA      = "Misiones · Comprobantes";
const HOJA_PAGOS   = "Pagos";
const HOJA_CONFIG  = "Config";
const HOJA_ADEUDOS = "Adeudos (hoja maestra)";
const PLANTILLA    = "Plantilla (vacía)";
const ANIO         = 2026;
const UNIDADES     = 16;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const ESTATUS = ["Pendiente","Confirmado","Rechazado"];
const ENC_PAGOS = ["Fecha","Depto","Mantenimiento","Agua","Extraordinario","Casa club","Total","Nota","Comprobante","Estatus","Mes","Confirmado el"];
//                  A       B       C               D      E               F           G       H      I             J         K     L

/* ============================ INSTALACIÓN ============================ */

function instalar() {
  const ss = SpreadsheetApp.getActive();
  const avisos = [];

  // 1. Meses que faltan de 2026, copiados de la plantilla
  const plantilla = ss.getSheetByName(PLANTILLA);
  if (!plantilla) throw new Error("No encuentro la pestaña '" + PLANTILLA + "'.");
  const hoy = new Date();
  const mesActual = hoy.getMonth();                       // 0 = enero
  for (let m = mesActual; m < 12; m++) {
    const nombre = MESES[m];
    if (!buscarHojaMes_(ss, nombre)) {
      const nueva = plantilla.copyTo(ss).setName(capitalizar_(nombre));
      ss.setActiveSheet(nueva);
      ss.moveActiveSheet(ss.getSheets().length);          // al final
      avisos.push("Pestaña creada: " + capitalizar_(nombre));
    }
  }
  // Adeudos, Pagos y Config se van al final para que los meses queden juntos
  [HOJA_ADEUDOS].forEach(n => { const h = ss.getSheetByName(n); if (h) { ss.setActiveSheet(h); ss.moveActiveSheet(ss.getSheets().length); } });

  // 2. Casa club en cada pestaña mensual (incluida la plantilla)
  ss.getSheets().forEach(h => {
    if (!esHojaMes_(h)) return;
    if (ajustarCasaClub_(h)) avisos.push("Casa club ajustado en: " + h.getName());
    // Nombre del mes en el encabezado, si sigue el texto de la plantilla
    const mes = MESES.indexOf(h.getName().toLowerCase());
    if (mes >= 0 && String(h.getRange("C5").getValue()).indexOf("escribe") >= 0) {
      h.getRange("C5").setValue(capitalizar_(MESES[mes]) + " " + ANIO);
      h.getRange("B1").setValue("MISIONES · " + capitalizar_(MESES[mes]) + " " + ANIO);
    }
  });

  // 3. Pestaña Pagos
  let pagos = ss.getSheetByName(HOJA_PAGOS);
  if (!pagos) {
    pagos = ss.insertSheet(HOJA_PAGOS);
    pagos.getRange(1, 1, 1, ENC_PAGOS.length).setValues([ENC_PAGOS]).setFontWeight("bold").setBackground("#1d3f63").setFontColor("#ffffff");
    pagos.setFrozenRows(1);
    pagos.setColumnWidth(1, 130); pagos.setColumnWidth(8, 220); pagos.setColumnWidth(9, 120);
    pagos.getRange("A2:A").setNumberFormat("dd/mm/yyyy hh:mm");
    pagos.getRange("C2:G").setNumberFormat("$#,##0.00");
    pagos.getRange("L2:L").setNumberFormat("dd/mm/yyyy");
    const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTATUS, true).setAllowInvalid(false).build();
    pagos.getRange("J2:J").setDataValidation(regla);
    const cf = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Pendiente").setBackground("#fff3cd").setRanges([pagos.getRange("J2:J")]).build();
    const cf2 = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Confirmado").setBackground("#d4edda").setRanges([pagos.getRange("J2:J")]).build();
    pagos.setConditionalFormatRules([cf, cf2]);
    avisos.push("Pestaña creada: Pagos");
  }

  // 4. Pestaña Config
  let config = ss.getSheetByName(HOJA_CONFIG);
  if (!config) {
    config = ss.insertSheet(HOJA_CONFIG);
    config.getRange("A1:C8").setValues([
      ["Clave", "Valor", "Para qué sirve"],
      ["cuota_mantenimiento", 1500, "Monto que aparece precargado en Mantenimiento"],
      ["extraordinario_nombre", "Protocolización de la mesa directiva, cuenta bancaria y puerta peatonal", "Nombre de la cuota extraordinaria vigente (vacío = no se muestra)"],
      ["extraordinario_monto", 1000, "Monto de la cuota extraordinaria vigente"],
      ["casa_club_monto", 500, "Monto sugerido por uso de la casa club"],
      ["adeudos", "pendiente", "Escribe 'mostrar' cuando la hoja de adeudos esté al día; mientras, la página dice 'pendiente'"],
      ["aviso", "", "Texto breve que se muestra arriba del formulario (opcional)"],
      ["cuenta", "Nubank · Eduardo Luna · cuenta terminación 5488", "Dónde se transfiere, se muestra en la página"]
    ]);
    config.getRange("A1:C1").setFontWeight("bold");
    config.setColumnWidth(1, 180); config.setColumnWidth(2, 360); config.setColumnWidth(3, 420);
    avisos.push("Pestaña creada: Config");
  }

  // 5. Carpeta de comprobantes
  carpetaRaiz_();
  avisos.push("Carpeta de Drive lista: " + CARPETA);

  const texto = avisos.length ? avisos.join("\n") : "Todo estaba ya en su lugar; no cambié nada.";
  Logger.log(texto);
  try { SpreadsheetApp.getUi().alert("Instalación lista", texto, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return texto;
}

/* Le da a "RENTA DE CASA CLUB" una columna de monto y suma ese monto en el resumen.
   Es idempotente: si ya tiene la columna, no toca nada. Devuelve true si cambió algo. */
function ajustarCasaClub_(h) {
  const titulo = h.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
  if (!titulo) return false;
  const rEnc = titulo.getRow() + 1;                       // renglón de encabezados: Depto | Fecha | Observaciones
  if (String(h.getRange(rEnc, 4).getValue()).trim().toLowerCase() === "monto") return false;

  // Observaciones pasa de la columna D a la E; D queda para el monto
  const filas = 5;                                        // renglones de registro bajo el encabezado
  const obs = h.getRange(rEnc, 4, filas + 1, 1).getValues();
  h.getRange(rEnc, 5, filas + 1, 1).setValues(obs);
  h.getRange(rEnc, 4, filas + 1, 1).clearContent();
  h.getRange(rEnc, 4).setValue("Monto").setFontWeight("bold");
  h.getRange(rEnc + 1, 4, filas, 1).setNumberFormat("$#,##0.00").setBackground("#d6e2ee");

  // Renglón nuevo en el resumen, después de "(+) Extraordinarios cobrados"
  const extra = h.createTextFinder("Extraordinarios cobrados").matchCase(false).findNext();
  if (!extra) return true;
  const rExtra = extra.getRow();
  h.insertRowAfter(rExtra);
  const rCasa = rExtra + 1;
  const rRegistro = rEnc + 1 + 1;                         // el insert recorrió el registro un renglón hacia abajo
  h.getRange(rCasa, 2).setValue("(+) Casa club cobrada");
  h.getRange(rCasa, 3).setFormula("=SUM(D" + rRegistro + ":D" + (rRegistro + filas - 1) + ")").setNumberFormat("$#,##0.00");
  h.getRange(rExtra, 2, 1, 2).copyFormatToRange(h, 2, 3, rCasa, rCasa);

  // Saldo final y total de ingresos ahora incluyen la casa club
  ["SALDO FINAL DEL MES", "Total de ingresos del mes"].forEach(etq => {
    const c = h.createTextFinder(etq).matchCase(false).findNext();
    if (!c) return;
    const celda = h.getRange(c.getRow(), 3);
    const f = celda.getFormula();
    if (f && f.indexOf("C" + rCasa) < 0) celda.setFormula(f + "+C" + rCasa);
  });
  return true;
}

/* ============================ SERVICIO WEB ============================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.accion === "estado") return json_(estadoDepto_(parseInt(p.depto, 10)));
    return json_({ ok: true, servicio: "misiones-pagos" });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (d.clave !== CLAVE) return json_({ ok: false, error: "clave" });
    const depto = parseInt(d.depto, 10);
    if (!(depto >= 1 && depto <= UNIDADES)) return json_({ ok: false, error: "departamento" });
    const monto = k => Math.max(0, Math.round((parseFloat(d[k]) || 0) * 100) / 100);
    const manto = monto("mantenimiento"), agua = monto("agua"), extra = monto("extraordinario"), casa = monto("casaclub");
    const total = Math.round((manto + agua + extra + casa) * 100) / 100;
    if (total <= 0) return json_({ ok: false, error: "monto" });
    const nota = limpiar_(d.nota, 200);
    const ahora = new Date();
    const mes = Utilities.formatDate(ahora, "America/Mexico_City", "yyyy-MM");

    // Comprobante (opcional)
    let url = "";
    if (d.imagen && String(d.imagen).length > 100) {
      const conceptos = [manto && "mantenimiento", agua && "agua", extra && "extraordinario", casa && "casa club"].filter(Boolean).join("+");
      const nombre = Utilities.formatDate(ahora, "America/Mexico_City", "yyyy-MM-dd HHmm") +
        " · Depto " + (depto < 10 ? "0" : "") + depto + " · $" + total + " · " + conceptos + ".jpg";
      const blob = Utilities.newBlob(Utilities.base64Decode(String(d.imagen).replace(/^data:[^,]+,/, "")), d.tipo || "image/jpeg", nombre);
      const sub = subcarpeta_(mes);
      url = sub.createFile(blob).getUrl();
    }

    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActive();
    const pagos = ss.getSheetByName(HOJA_PAGOS);
    if (!pagos) throw new Error("Falta la pestaña Pagos; corre instalar().");
    pagos.appendRow([ahora, depto, manto || "", agua || "", extra || "", casa || "", total, nota, url, "Pendiente", mes, ""]);
    const fila = pagos.getLastRow();
    pagos.getRange(fila, 1).setNumberFormat("dd/mm/yyyy hh:mm");
    pagos.getRange(fila, 3, 1, 5).setNumberFormat("$#,##0.00");
    return json_({ ok: true, folio: "P-" + String(fila - 1).padStart(4, "0"), total: total });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/* Qué tiene por pagar un departamento y qué ha reportado. */
function estadoDepto_(depto) {
  if (!(depto >= 1 && depto <= UNIDADES)) throw new Error("departamento");
  const ss = SpreadsheetApp.getActive();
  const cfg = config_();
  const r = {
    ok: true, depto: depto,
    cuota: Number(cfg.cuota_mantenimiento) || 0,
    extraordinario: { nombre: String(cfg.extraordinario_nombre || ""), monto: Number(cfg.extraordinario_monto) || 0 },
    casaclub: Number(cfg.casa_club_monto) || 0,
    aviso: String(cfg.aviso || ""), cuenta: String(cfg.cuenta || ""),
    adeudo: null, pagos: [], mesActual: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM")
  };
  // Adeudo según la hoja maestra; solo se muestra cuando Config → adeudos = "mostrar"
  const ad = ss.getSheetByName(HOJA_ADEUDOS);
  const mostrar = String(cfg.adeudos || "").trim().toLowerCase() === "mostrar";
  if (!mostrar) {
    r.adeudo = { pendiente: true };
  } else if (ad) {
    const fc = ad.createTextFinder("Fecha de corte").matchCase(false).findNext();
    const corte = fc ? ad.getRange(fc.getRow(), fc.getColumn() + 1).getDisplayValue() : "";
    const celda = ad.createTextFinder("^Depto " + depto + "$").useRegularExpression(true).matchEntireCell(true).findNext();
    if (celda) {
      // Depto | Propietario | Mantenimiento | Agua | Extraordinario | Adeudo total
      const v = ad.getRange(celda.getRow(), celda.getColumn() + 2, 1, 4).getValues()[0].map(x => Number(x) || 0);
      r.adeudo = { mostrar: true, corte: corte, mantenimiento: v[0], agua: v[1], extraordinario: v[2], total: v[3] };
    }
  }
  // Últimos pagos reportados por ese depto
  const pagos = ss.getSheetByName(HOJA_PAGOS);
  if (pagos && pagos.getLastRow() > 1) {
    const vals = pagos.getRange(2, 1, pagos.getLastRow() - 1, ENC_PAGOS.length).getValues();
    vals.forEach(f => {
      if (Number(f[1]) !== depto) return;
      r.pagos.push({
        fecha: Utilities.formatDate(new Date(f[0]), "America/Mexico_City", "d/MM/yyyy"),
        mantenimiento: Number(f[2]) || 0, agua: Number(f[3]) || 0, extraordinario: Number(f[4]) || 0, casaclub: Number(f[5]) || 0,
        total: Number(f[6]) || 0, estatus: String(f[9] || "Pendiente")
      });
    });
    r.pagos = r.pagos.slice(-8).reverse();
  }
  return r;
}

/* Al poner "Confirmado" en la columna J de Pagos, anota la fecha en L. */
function onEdit(e) {
  try {
    const rg = e.range, h = rg.getSheet();
    if (h.getName() !== HOJA_PAGOS || rg.getColumn() !== 10 || rg.getRow() < 2) return;
    const fila = rg.getRow();
    if (e.value === "Confirmado") h.getRange(fila, 12).setValue(new Date());
    else h.getRange(fila, 12).clearContent();
  } catch (err) {}
}

/* ============================ AUXILIARES ============================ */

function config_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);
  const out = {};
  if (!h) return out;
  h.getRange(2, 1, Math.max(h.getLastRow() - 1, 1), 2).getValues().forEach(f => { if (f[0]) out[String(f[0]).trim()] = f[1]; });
  return out;
}
function carpetaRaiz_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("carpeta");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(CARPETA);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
  props.setProperty("carpeta", f.getId());
  return f;
}
function subcarpeta_(mes) {
  const raiz = carpetaRaiz_();
  const it = raiz.getFoldersByName(mes);
  return it.hasNext() ? it.next() : raiz.createFolder(mes);
}
function esHojaMes_(h) {
  return !!h.createTextFinder("COBROS POR DEPARTAMENTO").matchCase(false).findNext();
}
function buscarHojaMes_(ss, nombre) {
  return ss.getSheets().find(h => h.getName().trim().toLowerCase() === nombre.toLowerCase()) || null;
}
function capitalizar_(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function limpiar_(s, n) { return String(s || "").replace(/^[=+\-@\t\r]+/, "").replace(/\s+/g, " ").trim().slice(0, n); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
