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
const CLAVE_ADMIN  = "cambia-esta-clave";    // la de bandeja.html: con ella se confirman y rechazan pagos. CÁMBIALA.
const CARPETA      = "Misiones · Comprobantes";
const HOJA_PAGOS   = "Pagos";
const HOJA_CONFIG  = "Config";
const HOJA_ADEUDOS = "Adeudos (hoja maestra)";
const PLANTILLA    = "Plantilla (vacía)";
const ANIO         = 2026;
const UNIDADES     = 16;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const ESTATUS = ["Pendiente","Confirmado","Rechazado"];
const ENC_PAGOS = ["Fecha","Depto","Mantenimiento","Agua","Extraordinario","Casa club","Total","Nota","Comprobante","Estatus","Mes","Confirmado el","Celdas del mes","Folio"];
//                  A       B       C               D      E               F           G       H      I             J         K     L               M (uso interno)  N
const AMARILLO = "#ffe599";                 // color de lo reportado y aún no confirmado

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
    pagos.getRange("K2:K").setNumberFormat("@");
    const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTATUS, true).setAllowInvalid(false).build();
    pagos.getRange("J2:J").setDataValidation(regla);
    const cf = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Pendiente").setBackground("#fff3cd").setRanges([pagos.getRange("J2:J")]).build();
    const cf2 = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Confirmado").setBackground("#d4edda").setRanges([pagos.getRange("J2:J")]).build();
    pagos.setConditionalFormatRules([cf, cf2]);
    avisos.push("Pestaña creada: Pagos");
  } else {
    pagos.getRange(1, 1, 1, ENC_PAGOS.length).setValues([ENC_PAGOS]).setFontWeight("bold").setBackground("#1d3f63").setFontColor("#ffffff");
  }
  pagos.hideColumns(13);
  pagos.getRange("K2:K").setNumberFormat("@");
  if (!pagos.getFilter()) pagos.getRange(1, 1, pagos.getMaxRows(), ENC_PAGOS.length).createFilter();

  // 4. Pestaña Config
  let config = ss.getSheetByName(HOJA_CONFIG);
  const semilla = [
      ["cuota_mantenimiento", 1500, "Monto que aparece precargado en Mantenimiento"],
      ["extraordinario_nombre", "Protocolización de la mesa directiva, cuenta bancaria y puerta peatonal", "Nombre de la cuota extraordinaria vigente (vacío = no se muestra)"],
      ["extraordinario_monto", 1000, "Monto de la cuota extraordinaria vigente"],
      ["casa_club_monto", 500, "Monto sugerido por uso de la casa club"],
      ["adeudos", "pendiente", "Escribe 'mostrar' cuando la hoja de adeudos esté al día; mientras, la página dice 'pendiente'"],
      ["aviso", "", "Texto breve que se muestra arriba del formulario (opcional)"],
      ["cuenta", "Nubank · Eduardo Luna · cuenta terminación 5488", "Dónde se transfiere, se muestra en la página"]
  ];
  if (!config) {
    config = ss.insertSheet(HOJA_CONFIG);
    config.getRange("A1:C1").setValues([["Clave", "Valor", "Para qué sirve"]]).setFontWeight("bold");
    config.setColumnWidth(1, 180); config.setColumnWidth(2, 360); config.setColumnWidth(3, 420);
    avisos.push("Pestaña creada: Config");
  }
  const claves = config.getRange(1, 1, Math.max(config.getLastRow(), 1), 1).getValues().map(f => String(f[0]).trim());
  semilla.forEach(f => { if (claves.indexOf(f[0]) < 0) { config.appendRow(f); avisos.push("Config: agregado '" + f[0] + "'"); } });

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
    if (p.accion === "pendientes") return json_(pendientes_(p.clave));
    if (p.accion === "imagen") return json_(imagen_(p.clave, p.folio));
    return json_({ ok: true, servicio: "misiones-pagos" });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (d.accion === "resolver") return json_(resolverDesdeBandeja_(d));
    if (d.clave !== CLAVE) return json_({ ok: false, error: "clave" });
    const depto = parseInt(d.depto, 10);
    if (!(depto >= 1 && depto <= UNIDADES)) return json_({ ok: false, error: "departamento" });
    const monto = k => Math.max(0, Math.round((parseFloat(d[k]) || 0) * 100) / 100);
    const manto = monto("mantenimiento"), agua = monto("agua"), extra = monto("extraordinario"), casa = monto("casaclub");
    const total = Math.round((manto + agua + extra + casa) * 100) / 100;
    if (total <= 0) return json_({ ok: false, error: "monto" });
    const nota = limpiar_(d.nota, 200);
    const ahora = new Date();
    let mes = String(d.mes || "");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) mes = Utilities.formatDate(ahora, "America/Mexico_City", "yyyy-MM");

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
    const celdas = anotarEnMes_(ss, mes, depto, { manto: manto, agua: agua, extra: extra, casa: casa }, ahora);
    const folio = "P-" + String(siguienteFolio_()).padStart(4, "0");
    pagos.insertRowBefore(2);                               // lo más nuevo arriba
    const fila = 2;
    pagos.getRange(fila, 1, 1, ENC_PAGOS.length).setValues([[ahora, depto, manto || "", agua || "", extra || "", casa || "", total, nota, url, "Pendiente", mes, "", celdas, folio]]);
    pagos.getRange(fila, 1).setNumberFormat("dd/mm/yyyy hh:mm");
    pagos.getRange(fila, 3, 1, 5).setNumberFormat("$#,##0.00");
    pagos.getRange(fila, 11).setNumberFormat("@").setValue(mes);   // como texto, para que "2026-10" no se vuelva fecha
    pagos.getRange(fila, 10).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTATUS, true).setAllowInvalid(false).build());
    return json_({ ok: true, folio: folio, total: total });
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
        t: new Date(f[0]).getTime(),
        fecha: Utilities.formatDate(new Date(f[0]), "America/Mexico_City", "d/MM/yyyy"),
        mantenimiento: Number(f[2]) || 0, agua: Number(f[3]) || 0, extraordinario: Number(f[4]) || 0, casaclub: Number(f[5]) || 0,
        total: Number(f[6]) || 0, estatus: String(f[9] || "Pendiente"), mes: mesTexto_(f[10])
      });
    });
    r.pagos.sort((a, b) => b.t - a.t);
    r.pagos = r.pagos.slice(0, 8).map(x => { delete x.t; return x; });
  }
  return r;
}

/* Al poner "Confirmado" en la columna J de Pagos, anota la fecha en L. */
function onEdit(e) {
  try {
    const rg = e.range, h = rg.getSheet();
    if (h.getName() !== HOJA_PAGOS || rg.getColumn() !== 10 || rg.getRow() < 2) return;
    resolver_(h, rg.getRow(), e.value);
  } catch (err) {}
}

/* Aplica un estatus a un renglón de Pagos: fecha de confirmación y color/monto en el mes. */
function resolver_(h, fila, estatus) {
  const ss = SpreadsheetApp.getActive();
  const celdas = String(h.getRange(fila, 13).getValue() || "");
  if (estatus === "Confirmado") {
    h.getRange(fila, 12).setValue(new Date());
    aplicarCeldas_(ss, celdas, "confirmar");
  } else if (estatus === "Rechazado") {
    h.getRange(fila, 12).clearContent();
    aplicarCeldas_(ss, celdas, "retirar");
    h.getRange(fila, 13).clearContent();                   // ya no hay nada que recolorear
  } else {
    h.getRange(fila, 12).clearContent();
    aplicarCeldas_(ss, celdas, "pendiente");
  }
}

/* ============================ BANDEJA (privada) ============================ */

function filaPorFolio_(pagos, folio) {
  if (!folio || pagos.getLastRow() < 2) return 0;
  const vals = pagos.getRange(2, 14, pagos.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === String(folio)) return i + 2;
  return 0;
}

function pendientes_(clave) {
  if (clave !== CLAVE_ADMIN) return { ok: false, error: "clave" };
  const ss = SpreadsheetApp.getActive();
  const pagos = ss.getSheetByName(HOJA_PAGOS);
  const r = { ok: true, pendientes: [], hoja: ss.getUrl() + "#gid=" + pagos.getSheetId(), total: 0 };
  if (pagos.getLastRow() < 2) return r;
  const vals = pagos.getRange(2, 1, pagos.getLastRow() - 1, ENC_PAGOS.length).getValues();
  vals.forEach((f, i) => {
    if (String(f[9]) !== "Pendiente") return;
    r.pendientes.push({
      folio: String(f[13] || ""), fila: i + 2,
      fecha: Utilities.formatDate(new Date(f[0]), "America/Mexico_City", "d/MM/yyyy HH:mm"),
      depto: Number(f[1]), mes: mesTexto_(f[10]),
      mantenimiento: Number(f[2]) || 0, agua: Number(f[3]) || 0, extraordinario: Number(f[4]) || 0, casaclub: Number(f[5]) || 0,
      total: Number(f[6]) || 0, nota: String(f[7] || ""), comprobante: String(f[8] || "")
    });
  });
  r.total = r.pendientes.length;
  return r;
}

/* Devuelve la captura de un pago en base64 (los archivos de Drive son privados). */
function imagen_(clave, folio) {
  if (clave !== CLAVE_ADMIN) return { ok: false, error: "clave" };
  const pagos = SpreadsheetApp.getActive().getSheetByName(HOJA_PAGOS);
  const fila = filaPorFolio_(pagos, folio);
  if (!fila) return { ok: false, error: "folio" };
  const url = String(pagos.getRange(fila, 9).getValue() || "");
  const m = url.match(/\/d\/([-\w]+)/);
  if (!m) return { ok: true, imagen: "" };
  const blob = DriveApp.getFileById(m[1]).getBlob();
  return { ok: true, imagen: "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes()) };
}

function resolverDesdeBandeja_(d) {
  if (d.claveAdmin !== CLAVE_ADMIN) return { ok: false, error: "clave" };
  if (ESTATUS.indexOf(d.estatus) < 0) return { ok: false, error: "estatus" };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const pagos = SpreadsheetApp.getActive().getSheetByName(HOJA_PAGOS);
    const fila = filaPorFolio_(pagos, d.folio);
    if (!fila) return { ok: false, error: "folio" };
    pagos.getRange(fila, 10).setValue(d.estatus);
    resolver_(pagos, fila, d.estatus);
    return { ok: true, folio: d.folio, estatus: d.estatus };
  } finally {
    lock.releaseLock();
  }
}

/* ====================== ESCRITURA EN LA PESTAÑA DEL MES ====================== */

/* Suma lo reportado en la pestaña del mes y lo pinta de amarillo. Devuelve la lista
   de celdas tocadas ("Octubre!C44=#d6e2ee=1500;...") para poder confirmarlas o retirarlas. */
function anotarEnMes_(ss, mes, depto, m, fecha) {
  const idx = parseInt(mes.split("-")[1], 10) - 1;
  const anio = mes.split("-")[0];
  let hoja = buscarHojaMes_(ss, MESES[idx]);
  if (!hoja) {
    hoja = ss.getSheetByName(PLANTILLA).copyTo(ss).setName(capitalizar_(MESES[idx]));
    hoja.getRange("C5").setValue(capitalizar_(MESES[idx]) + " " + anio);
    hoja.getRange("B1").setValue("MISIONES · " + capitalizar_(MESES[idx]) + " " + anio);
    ajustarCasaClub_(hoja);
  }
  const refs = [];
  const pinta = (rg, monto) => {
    const previo = Number(rg.getValue()) || 0;
    refs.push(hoja.getName() + "!" + rg.getA1Notation() + "=" + (rg.getBackground() || "#ffffff") + "=" + monto);
    rg.setValue(previo + monto).setBackground(AMARILLO);
  };
  // Cobros por departamento: C mantenimiento · D agua · E extraordinario
  const celda = hoja.createTextFinder("^Depto " + depto + "$").useRegularExpression(true).matchEntireCell(true).findNext();
  if (celda) {
    const fila = celda.getRow();
    if (m.manto) pinta(hoja.getRange(fila, 3), m.manto);
    if (m.agua)  pinta(hoja.getRange(fila, 4), m.agua);
    if (m.extra) pinta(hoja.getRange(fila, 5), m.extra);
  }
  // Renta de casa club: B depto · C fecha · D monto · E observaciones
  if (m.casa) {
    const t = hoja.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
    if (t) {
      const rEnc = t.getRow() + 1, filas = 5;
      let libre = 0;
      for (let r = rEnc + 1; r <= rEnc + filas; r++) {
        const v = hoja.getRange(r, 2, 1, 3).getValues()[0];
        if (!v[0] && !v[2]) { libre = r; break; }
      }
      if (!libre) { hoja.insertRowBefore(rEnc + filas); libre = rEnc + filas; }   // dentro del rango de la suma
      hoja.getRange(libre, 2).setValue(depto);
      hoja.getRange(libre, 3).setValue(fecha).setNumberFormat("dd/mm/yyyy");
      pinta(hoja.getRange(libre, 4), m.casa);
      hoja.getRange(libre, 4).setNumberFormat("$#,##0.00");
    }
  }
  return refs.join(";");
}

/* modo "confirmar": color original · "pendiente": amarillo · "retirar": resta el monto y color original */
function aplicarCeldas_(ss, celdas, modo) {
  if (!celdas) return;
  celdas.split(";").forEach(ref => {
    const partes = ref.split("=");
    if (partes.length < 3) return;
    const [hojaNombre, a1] = partes[0].split("!");
    const color = partes[1], monto = Number(partes[2]) || 0;
    const hoja = ss.getSheetByName(hojaNombre);
    if (!hoja) return;
    const rg = hoja.getRange(a1);
    if (modo === "pendiente") { rg.setBackground(AMARILLO); return; }
    rg.setBackground(color === "#ffffff" ? null : color);
    if (modo === "retirar") {
      const resto = Math.round(((Number(rg.getValue()) || 0) - monto) * 100) / 100;
      if (resto > 0) rg.setValue(resto);
      else {
        rg.clearContent();
        // en el registro de casa club, limpia también depto y fecha del renglón
        const enc = hoja.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
        if (enc && rg.getColumn() === 4 && rg.getRow() > enc.getRow() + 1 && rg.getRow() <= enc.getRow() + 1 + 6) hoja.getRange(rg.getRow(), 2, 1, 2).clearContent();
      }
    }
  });
}

/* ============================ AUXILIARES ============================ */

function siguienteFolio_() {
  const props = PropertiesService.getScriptProperties();
  let n = parseInt(props.getProperty("folio"), 10);
  if (!(n >= 1)) {                                          // arranca después del último folio que haya en la hoja
    n = 1;
    const pagos = SpreadsheetApp.getActive().getSheetByName(HOJA_PAGOS);
    if (pagos && pagos.getLastRow() > 1) {
      pagos.getRange(2, 14, pagos.getLastRow() - 1, 1).getValues().forEach(f => {
        const k = parseInt(String(f[0]).replace(/\D/g, ""), 10); if (k >= n) n = k + 1;
      });
      n = Math.max(n, pagos.getLastRow());                  // no repetir folios viejos que iban por renglón
    }
  }
  props.setProperty("folio", String(n + 1));
  return n;
}
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
/* El mes guardado puede venir como texto "2026-10" o, si la hoja lo convirtió, como fecha. */
function mesTexto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "America/Mexico_City", "yyyy-MM");
  return String(v || "");
}
function capitalizar_(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function limpiar_(s, n) { return String(s || "").replace(/^[=+\-@\t\r]+/, "").replace(/\s+/g, " ").trim().slice(0, n); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
