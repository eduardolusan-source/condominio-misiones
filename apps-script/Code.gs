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
   - doGet accion=finanzas: finanzas.html. Cifras AGREGADAS por mes leídas de las
     pestañas mensuales desde el mes de Config "finanzas_desde" (2026-10, cuando la
     mesa tomó la caja); nunca salen cobros por departamento.
   - doGet accion=egresos / doPost accion=egreso y anularEgreso: egresos.html, con la
     clave de Config "clave_egresos". Cada gasto se anota en la sección de egresos
     ordinarios o extraordinarios de la pestaña del mes, sube su comprobante a la
     carpeta del mes en Drive y deja renglón en la pestaña "Egresos".
   - doGet accion=cuentas / doPost accion=validar: cuentas.html. Cada depto dice si
     reconoce su adeudo al corte y lo de julio a septiembre (lo cobró la administración
     anterior), y sube comprobantes. Cae en la pestaña "Validaciones"; las imágenes van
     a la subcarpeta "Validaciones" de la carpeta de comprobantes.
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
const HOJA_VALID = "Validaciones";
const HOJA_VOTOS = "Votos";                 // asamblea: un voto por depto y pregunta (el último cuenta)
const HOJA_ACUERDOS = "Acuerdos";           // asamblea: acuerdo, responsable y fecha por tema
const HOJA_TAREAS = "Tareas";               // reparto de responsabilidades: tarea, qué implica, cada cuánto, quién
const HOJA_AGUA = "Agua";                   // una fila por depto y mes: lecturas, consumo, cargo, pagado
const HOJA_RECIBOS = "Recibos agua";        // una fila por mes: recibo CEA, m³ del general, precio por m³
const HOJA_EGRESOS = "Egresos";             // bitácora de gastos registrados desde egresos.html (lo más nuevo arriba)
const ENC_EGRESOS = ["Registrado","Mes","Tipo","Concepto","Proveedor","Monto","Fecha de pago","Nota","Comprobante","Quién","Celda","Folio","Estatus"];
//                    A            B     C      D          E           F       G               H      I             J       K       L       M
const CACHE_FINANZAS = 300;                 // segundos que finanzas.html ve la misma respuesta; ?fresh=1 la fuerza
const ENC_AGUA = ["Mes","Depto","Lectura anterior","Lectura actual","Consumo m³","Estimado","Foto","Capturado el","Cargo $","Pagado el","Nota"];
//                 A     B       C                  D                E           F          G      H              I         J           K
const ENC_RECIBOS = ["Mes","Monto del recibo CEA","m³ del medidor general (viene en el recibo)","Fecha límite de pago","Precio por m³","Suma de lecturas m³","m³ de áreas comunes","Comunes por depto $","Notas"];
//                    A     B                      C                                            D                      E               F                     G                     H                     I
const ENC_VALID = ["Fecha","Depto","Concepto","Respuesta","Monto pagado a la admin. anterior","Nota","Comprobantes","Folio","Nota general"];
/* Lo que tocaba pagar de julio a septiembre de 2026, cobrado por la administración anterior. */
const CONCEPTOS_PREVIOS = [
  { id: "manto-2026-07", nom: "Mantenimiento de julio", sub: "cuota de $1,500", monto: 1500 },
  { id: "manto-2026-08", nom: "Mantenimiento de agosto", sub: "cuota de $1,500", monto: 1500 },
  { id: "manto-2026-09", nom: "Mantenimiento de septiembre", sub: "cuota de $1,500", monto: 1500 },
  { id: "extra-2026-08", nom: "Cuota extraordinaria de $1,000", sub: "protocolización, cuenta bancaria y control de acceso · agosto", monto: 1000 },
  { id: "agua-2026-07-09", nom: "Agua de julio a septiembre", sub: "lo que te cobró la administración por el agua de esos meses", monto: 0, abierto: true }
];

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
    const nombre = nombreHojaMes_(m, hoy.getFullYear());
    if (!buscarHojaMes_(ss, nombre)) {
      const nueva = plantilla.copyTo(ss).setName(nombre);
      nueva.getRange("C5").setValue(nombre.indexOf(" ") > 0 ? nombre : nombre + " " + hoy.getFullYear());
      nueva.getRange("B1").setValue("MISIONES · " + (nombre.indexOf(" ") > 0 ? nombre : nombre + " " + hoy.getFullYear()));
      ss.setActiveSheet(nueva);
      ss.moveActiveSheet(ss.getSheets().length);          // al final
      avisos.push("Pestaña creada: " + nombre);
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
      ["cuenta", "Nubank · Eduardo Luna · cuenta terminación 5488", "Dónde se transfiere, se muestra en la página"],
      ["clave_egresos", "egresos", "Clave de egresos.html (quien registra los gastos de la mesa). Cámbiala si quieres"],
      ["finanzas_desde", "2026-10", "Primer mes que finanzas.html toma de esta hoja (los anteriores siguen en js/data.js)"]
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

  // 6. Bitácora de egresos
  if (!ss.getSheetByName(HOJA_EGRESOS)) { hojaEgresos_(); avisos.push("Pestaña creada: " + HOJA_EGRESOS); }

  // 7. Montos de muestra de la plantilla (Administración 7,000 y Limpieza 7,000) en la
  //    plantilla y en los meses en vivo que aún no tienen cobros ni otros gastos
  const desde = mesTexto_(config_().finanzas_desde).trim();   // Sheets puede volver "2026-10" una fecha; mesTexto_ lo regresa a texto
  [plantilla].concat(ss.getSheets().filter(h => h !== plantilla && esHojaMes_(h) && (!desde || idDeHojaMes_(h) >= desde))).forEach(h => {
    if (limpiarMuestras_(h)) avisos.push("Montos de muestra borrados en: " + h.getName());
  });

  // 9. Registro de casa club: deshacer un ajuste repetido, encabezados claros y montos que quedaron en la columna Depto
  ss.getSheets().filter(h => esHojaMes_(h)).forEach(h => {                 // la plantilla también tiene la sección
    desduplicarCasaClub_(h).forEach(a => avisos.push(a));
    if (aclararCasaClub_(h)) avisos.push("Casa club aclarado en: " + h.getName());
    repararCasaClub_(h).forEach(a => avisos.push(a));
  });

  // 8. Saldo inicial encadenado al saldo final del mes anterior (solo meses en vivo)
  const vivos = ss.getSheets().filter(h => esHojaMes_(h) && idDeHojaMes_(h) && (!desde || idDeHojaMes_(h) >= desde))
    .sort((a, b) => idDeHojaMes_(a) < idDeHojaMes_(b) ? -1 : 1);
  vivos.forEach((h, i) => {
    if (i === 0) return;
    const c6 = h.getRange("C6");
    const prev = vivos[i - 1];
    if (idDeHojaMes_(prev) !== mesSiguiente_(idDeHojaMes_(h), -1)) return;   // solo si el anterior es el mes inmediato
    const ref = /\s/.test(prev.getName()) ? "'" + prev.getName() + "'" : prev.getName();
    const fin = prev.createTextFinder("SALDO FINAL DEL MES").matchCase(false).findNext();
    const quiero = "=" + ref + "!C" + (fin ? fin.getRow() : 18);
    const actual = c6.getFormula();
    if (actual === quiero) return;
    if (actual && !/^='?[^'!]+'?!C\d+$/.test(actual)) return;                  // fórmula propia de la Administración: no se toca
    c6.setFormula(quiero);
    avisos.push("Saldo inicial de " + h.getName() + " encadenado a " + prev.getName() + (actual ? " (corregido: apuntaba a otro renglón)" : ""));
  });

  const texto = avisos.length ? avisos.join("\n") : "Todo estaba ya en su lugar; no cambié nada.";
  Logger.log(texto);
  try { SpreadsheetApp.getUi().alert("Instalación lista", texto, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return texto;
}

/* El registro de casa club se entiende solo: título que explica, encabezados que dicen
   qué va en cada columna y la columna Depto validada como número. Idempotente. */
function aclararCasaClub_(h) {
  const titulo = h.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
  if (!titulo) return false;
  const rT = titulo.getRow(), rEnc = rT + 1;
  const enc = h.getRange(rEnc, 2, 1, 4).getValues()[0].map(v => String(v).trim());
  const quiero = ["Depto que rentó", "Fecha del evento", "Monto cobrado ($)", "Observaciones"];
  const tituloQuiero = "RENTA DE CASA CLUB  ·  un renglón por evento: depto, fecha y monto. El monto se suma solo en el resumen";
  // Se comparan solo Depto, Fecha y Monto: en varias pestañas la columna E está combinada y no guarda el encabezado.
  if (String(titulo.getValue()) === tituloQuiero && enc.slice(0, 3).join("|") === quiero.slice(0, 3).join("|")) return false;
  titulo.setValue(tituloQuiero);
  h.getRange(rEnc, 2, 1, 4).setValues([quiero]).setFontWeight("bold");
  h.getRange(rEnc + 1, 2, 5, 1).setNumberFormat("0").setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, UNIDADES).setAllowInvalid(true).setHelpText("Número del departamento que rentó (1 a " + UNIDADES + "). El monto va en la columna Monto.").build());
  h.getRange(rEnc + 1, 3, 5, 1).setNumberFormat("dd/mm/yyyy");
  h.getRange(rEnc + 1, 4, 5, 1).setNumberFormat("$#,##0.00");
  return true;
}

/* Corrección de una sola vez (19 de octubre de 2026): en Octubre, el cobro de casa club
   del depto 2 ($500) se perdió del registro mientras se reparaba la sección. Lo vuelve a
   poner solo si el renglón sigue con el depto 2 y sin monto. Ejecutar a mano desde el editor. */
function corregirCasaClubOctubre2026() {
  const h = buscarHojaMes_(SpreadsheetApp.getActive(), "Octubre");
  if (!h) throw new Error("No encuentro la pestaña Octubre");
  const titulo = h.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
  const r = titulo.getRow() + 2;
  const v = h.getRange(r, 2, 1, 3).getValues()[0];
  if (Number(v[0]) === 2 && !(Number(v[2]) > 0)) {
    h.getRange(r, 4).setValue(500).setNumberFormat("$#,##0.00");
    try { CacheService.getScriptCache().remove("finanzas"); } catch (e) {}
    Logger.log("Octubre: casa club del depto 2 = $500 restaurado en D" + r);
    return "restaurado";
  }
  Logger.log("Octubre: no hacía falta (B" + r + "=" + v[0] + ", D" + r + "=" + v[2] + ")");
  return "sin cambios";
}

/* Deshace lo que deja ajustarCasaClub_ cuando corre dos veces sobre la misma pestaña
   (pasó el 19 de octubre de 2026 porque el encabezado ya decía "Monto cobrado ($)"):
   un segundo renglón "(+) Casa club cobrada" en el resumen (y su "+C15" extra en
   SALDO FINAL y Total de ingresos) y los montos del registro corridos a la columna
   Observaciones. Idempotente: si no hay nada que deshacer, no toca nada. */
function desduplicarCasaClub_(h) {
  const out = [];
  // a) renglón duplicado en el resumen
  const filas = [];
  const vals = h.getRange(1, 2, 40, 1).getValues();
  vals.forEach((f, i) => { if (normEt_(f[0]) === "casaclubcobrada") filas.push(i + 1); });
  if (filas.length > 1) {
    const sobra = filas.slice(0, filas.length - 1);                  // se conserva el de más abajo (el original)
    sobra.reverse().forEach(r => h.deleteRow(r));
    const rCasa = filas[filas.length - 1] - sobra.length;
    ["SALDO FINAL DEL MES", "Total de ingresos del mes"].forEach(etq => {
      const c = h.createTextFinder(etq).matchCase(false).findNext();
      if (!c) return;
      const celda = h.getRange(c.getRow(), 3);
      let f = celda.getFormula();
      if (!f) return;
      f = f.replace(/\+#REF!/g, "").replace(new RegExp("\\+C" + rCasa + "(?![0-9])", "g"), "") + "+C" + rCasa;
      celda.setFormula(f);
    });
    out.push(h.getName() + ": se quitó un renglón repetido de casa club en el resumen y se corrigieron las fórmulas");
  }
  // b) montos corridos a Observaciones: renglones con Monto vacío y un número en Observaciones
  const titulo = h.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
  if (titulo) {
    const rEnc = titulo.getRow() + 1;
    const de = h.getRange(rEnc + 1, 4, 5, 2).getValues();            // D monto · E observaciones
    let movidos = 0;
    de.forEach((f, i) => {
      const d = f[0], e = f[1];
      if ((d === "" || d === null) && typeof e === "number" && e >= 1) {
        h.getRange(rEnc + 1 + i, 4).setValue(e).setNumberFormat("$#,##0.00");
        h.getRange(rEnc + 1 + i, 5).clearContent();
        movidos++;
      }
    });
    if (/^monto$/i.test(String(h.getRange(rEnc, 4).getValue()).trim())) h.getRange(rEnc, 4).setValue("Monto cobrado ($)");
    if (/^monto cobrado/i.test(String(h.getRange(rEnc, 5).getValue()).trim())) h.getRange(rEnc, 5).setValue("Observaciones");
    if (movidos) out.push(h.getName() + ": " + movidos + " monto(s) de casa club volvieron de Observaciones a Monto");
  }
  return out;
}

/* Si en el registro de casa club alguien escribió el monto en la columna Depto (sin
   fecha ni monto), lo pasa a la columna Monto. Si además ese mismo monto quedó como
   "extraordinario" de un departamento en los cobros, lo quita de ahí y anota el depto
   en el registro: era el pago de la casa club contado dos veces. Devuelve avisos. */
function repararCasaClub_(h) {
  const out = [];
  const titulo = h.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
  if (!titulo) return out;
  const r0 = titulo.getRow() + 2;
  const filas = h.getRange(r0, 2, 5, 3).getValues();           // B depto · C fecha · D monto
  filas.forEach((f, i) => {
    const b = Number(f[0]) || 0, d = Number(f[2]) || 0;
    if (!(b >= 100 && !d)) return;                                // un depto nunca vale 100 o más: es un monto
    const fila = r0 + i;
    h.getRange(fila, 4).setValue(b).setNumberFormat("$#,##0.00");
    h.getRange(fila, 2).clearContent();
    out.push(h.getName() + ": $" + b + " del registro de casa club pasó de la columna Depto a Monto");
    // ¿el mismo monto está como extraordinario de un depto? Entonces era este cobro, contado dos veces.
    const cob = h.createTextFinder("COBROS POR DEPARTAMENTO").matchCase(false).findNext();
    const tot = h.createTextFinder("TOTAL COBRADO").matchCase(false).findNext();
    if (!cob || !tot) return;
    const n = tot.getRow() - cob.getRow() - 2;
    const vals = h.getRange(cob.getRow() + 2, 2, n, 4).getValues();  // B depto · C manto · D agua · E extra
    const k = vals.findIndex(v => (Number(v[3]) || 0) === b);
    if (k < 0) return;
    const depto = parseInt(String(vals[k][0]).replace(/\D/g, ""), 10);
    h.getRange(cob.getRow() + 2 + k, 5).clearContent();
    if (depto) h.getRange(fila, 2).setValue(depto);
    out.push(h.getName() + ": el extraordinario de $" + b + " del depto " + depto + " era la casa club; se quitó de cobros y el depto quedó en el registro");
  });
  return out;
}

/* Le da a "RENTA DE CASA CLUB" una columna de monto y suma ese monto en el resumen.
   Es idempotente: si ya tiene la columna, no toca nada. Devuelve true si cambió algo. */
function ajustarCasaClub_(h) {
  const titulo = h.createTextFinder("RENTA DE CASA CLUB").matchCase(false).findNext();
  if (!titulo) return false;
  const rEnc = titulo.getRow() + 1;                       // renglón de encabezados: Depto | Fecha | Observaciones
  if (/^monto/i.test(String(h.getRange(rEnc, 4).getValue()).trim())) return false;   // ya tiene columna de monto ("Monto" o "Monto cobrado ($)")

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
    if (p.accion === "cuentas") return json_(cuentasDepto_(parseInt(p.depto, 10)));
    if (p.accion === "lecturas") return json_(lecturasMes_(p.mes, p.clave));
    if (p.accion === "agua") return json_(aguaDepto_(parseInt(p.depto, 10)));
    if (p.accion === "votos") return json_(votos_());
    if (p.accion === "acuerdos") return json_(acuerdos_());
    if (p.accion === "tareas") return json_(tareas_());
    if (p.accion === "finanzas") return json_(finanzas_(!!p.fresh));
    if (p.accion === "egresos") return json_(egresosMes_(p.mes, p.clave));
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
    if (d.accion === "lectura") { lock.waitLock(10000); return json_(guardarLectura_(d)); }
    if (d.accion === "recibo") { lock.waitLock(10000); return json_(guardarRecibo_(d)); }
    if (d.accion === "voto") { lock.waitLock(10000); return json_(votar_(d)); }
    if (d.accion === "acuerdo") { lock.waitLock(10000); return json_(guardarAcuerdo_(d)); }
    if (d.accion === "tarea") { lock.waitLock(10000); return json_(guardarTarea_(d)); }
    if (d.accion === "egreso") { lock.waitLock(10000); return json_(registrarEgreso_(d)); }
    if (d.accion === "anularEgreso") { lock.waitLock(10000); return json_(anularEgreso_(d)); }
    if (d.clave !== CLAVE) return json_({ ok: false, error: "clave" });
    if (d.accion === "validar") { lock.waitLock(10000); return json_(validar_(d)); }
    const depto = parseInt(d.depto, 10);
    if (!(depto >= 1 && depto <= UNIDADES)) return json_({ ok: false, error: "departamento" });
    const monto = k => Math.max(0, Math.round((parseFloat(d[k]) || 0) * 100) / 100);
    const manto = monto("mantenimiento"), agua = monto("agua"), extra = monto("extraordinario"), casa = monto("casaclub");
    const nota = limpiar_(d.nota, 200);
    const ahora = new Date();
    // Meses: lista (varios meses de un jalón) o uno solo; el mantenimiento se repite por mes,
    // agua, extraordinario y casa club van al mes más reciente de los elegidos.
    let meses = Array.isArray(d.meses) ? d.meses : [d.mes];
    meses = meses.map(x => String(x || "")).filter(x => /^\d{4}-(0[1-9]|1[0-2])$/.test(x));
    meses = meses.filter((x, i) => meses.indexOf(x) === i).sort();
    if (!meses.length) meses = [Utilities.formatDate(ahora, "America/Mexico_City", "yyyy-MM")];
    const total = Math.round((manto * meses.length + agua + extra + casa) * 100) / 100;
    if (total <= 0) return json_({ ok: false, error: "monto" });
    const mes = meses[meses.length - 1];

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
    const folios = [];
    const notaMulti = meses.length > 1 ? (nota ? nota + " · " : "") + "Pago de " + meses.length + " meses en una transferencia" : nota;
    meses.forEach((m, i) => {
      const ultimo = i === meses.length - 1;
      const parte = { manto: manto, agua: ultimo ? agua : 0, extra: ultimo ? extra : 0, casa: ultimo ? casa : 0 };
      const subtotal = Math.round((parte.manto + parte.agua + parte.extra + parte.casa) * 100) / 100;
      if (subtotal <= 0) return;
      const celdas = anotarEnMes_(ss, m, depto, parte, ahora);
      const folio = "P-" + String(siguienteFolio_()).padStart(4, "0");
      pagos.insertRowBefore(2);                             // lo más nuevo arriba
      const fila = 2;
      pagos.getRange(fila, 1, 1, ENC_PAGOS.length).setValues([[ahora, depto, parte.manto || "", parte.agua || "", parte.extra || "", parte.casa || "", subtotal, notaMulti, url, "Pendiente", m, "", celdas, folio]]);
      pagos.getRange(fila, 1).setNumberFormat("dd/mm/yyyy hh:mm");
      pagos.getRange(fila, 3, 1, 5).setNumberFormat("$#,##0.00");
      pagos.getRange(fila, 11).setNumberFormat("@").setValue(m);   // como texto, para que "2026-10" no se vuelva fecha
      pagos.getRange(fila, 10).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTATUS, true).setAllowInvalid(false).build());
      folios.push(folio);
    });
    return json_({ ok: true, folio: folios.join(", "), folios: folios, total: total });
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

/* ===================== VALIDACIÓN DE CUENTAS (cuentas.html) ===================== */

/* Adeudo al corte según la hoja maestra (siempre, sin esperar Config → adeudos), los
   conceptos de julio a septiembre y lo que ese depto ya respondió. Sin nombres. */
function cuentasDepto_(depto) {
  if (!(depto >= 1 && depto <= UNIDADES)) throw new Error("departamento");
  const ss = SpreadsheetApp.getActive();
  const r = { ok: true, depto: depto, adeudo: null, conceptos: CONCEPTOS_PREVIOS, validaciones: [] };
  const ad = ss.getSheetByName(HOJA_ADEUDOS);
  if (ad) {
    const fc = ad.createTextFinder("Fecha de corte").matchCase(false).findNext();
    const corte = fc ? ad.getRange(fc.getRow(), fc.getColumn() + 1).getDisplayValue() : "";
    const celda = ad.createTextFinder("^Depto " + depto + "$").useRegularExpression(true).matchEntireCell(true).findNext();
    if (celda) {
      const v = ad.getRange(celda.getRow(), celda.getColumn() + 2, 1, 4).getValues()[0].map(x => Number(x) || 0);
      r.adeudo = { corte: corte, mantenimiento: v[0], agua: v[1], extraordinario: v[2], total: v[3] };
    }
  }
  const h = ss.getSheetByName(HOJA_VALID);
  if (h && h.getLastRow() > 1) {
    h.getRange(2, 1, h.getLastRow() - 1, ENC_VALID.length).getValues().forEach(f => {
      if (Number(f[1]) !== depto) return;
      r.validaciones.push({ t: new Date(f[0]).getTime(), fecha: Utilities.formatDate(new Date(f[0]), "America/Mexico_City", "d/MM/yyyy"),
        nombre: String(f[2] || ""), respuesta: String(f[3] || ""), monto: Number(f[4]) || 0 });
    });
    r.validaciones.sort((a, b) => b.t - a.t);
    r.validaciones = r.validaciones.slice(0, 12).map(x => { delete x.t; return x; });
  }
  return r;
}

/* Guarda la respuesta de un depto: un renglón por concepto contestado, mismo folio,
   y las imágenes en Drive. Nada de esto toca las pestañas de los meses ni Pagos. */
function validar_(d) {
  const depto = parseInt(d.depto, 10);
  if (!(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  const lista = Array.isArray(d.respuestas) ? d.respuestas : [];
  const imgs = Array.isArray(d.imagenes) ? d.imagenes.filter(x => String(x || "").length > 100).slice(0, 10) : [];
  if (!lista.length && !imgs.length) return { ok: false, error: "vacío" };
  const ahora = new Date();
  const folio = "V-" + String(siguienteFolioValid_()).padStart(4, "0");
  const urls = imgs.map((img, i) => {
    const nombre = Utilities.formatDate(ahora, "America/Mexico_City", "yyyy-MM-dd HHmm") +
      " · Depto " + (depto < 10 ? "0" : "") + depto + " · " + folio + " · " + (i + 1) + ".jpg";
    const blob = Utilities.newBlob(Utilities.base64Decode(String(img).replace(/^data:[^,]+,/, "")), d.tipo || "image/jpeg", nombre);
    return subcarpeta_(HOJA_VALID).createFile(blob).getUrl();
  });
  const h = hojaValid_();
  const notaGeneral = limpiar_(d.nota, 300);
  const filas = (lista.length ? lista : [{ nombre: "Solo comprobantes", respuesta: "comprobantes" }]).map(x => [
    ahora, depto, limpiar_(x.nombre || x.concepto, 80),
    ["debo", "pagado", "otro", "comprobantes"].includes(String(x.respuesta)) ? String(x.respuesta) : "otro",
    x.respuesta === "pagado" ? Math.max(0, Math.round((parseFloat(x.monto) || 0) * 100) / 100) : "",
    limpiar_(x.nota, 200), urls.join("\n"), folio, notaGeneral
  ]);
  h.insertRowsBefore(2, filas.length);
  h.getRange(2, 1, filas.length, ENC_VALID.length).setValues(filas);
  h.getRange(2, 1, filas.length, 1).setNumberFormat("dd/mm/yyyy hh:mm");
  h.getRange(2, 5, filas.length, 1).setNumberFormat("$#,##0.00");
  return { ok: true, folio: folio, renglones: filas.length, comprobantes: urls.length };
}

function hojaValid_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_VALID);
  if (h) return h;
  h = ss.insertSheet(HOJA_VALID);
  h.getRange(1, 1, 1, ENC_VALID.length).setValues([ENC_VALID]).setFontWeight("bold").setBackground("#d9e2ec");
  h.setFrozenRows(1);
  h.setColumnWidths(1, 1, 130); h.setColumnWidths(3, 1, 260); h.setColumnWidths(6, 2, 260); h.setColumnWidths(9, 1, 260);
  return h;
}
function siguienteFolioValid_() {
  const props = PropertiesService.getScriptProperties();
  let n = parseInt(props.getProperty("folioValid"), 10);
  if (!(n >= 1)) n = 1;
  props.setProperty("folioValid", String(n + 1));
  return n;
}

/* ============================ ASAMBLEA: votos y acuerdos ============================ */

function hojaSimple_(nombre, enc) {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(nombre);
  if (h) return h;
  h = ss.insertSheet(nombre);
  h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight("bold").setBackground("#d9e2ec");
  h.setFrozenRows(1);
  return h;
}
/* La mesa directiva registra el voto de cada depto al momento, con lo que la gente dice en la
   videollamada. Sin clave: el tablero se usa en la junta y a la vista de todos. Un voto por
   depto y pregunta; si se vuelve a registrar, se sustituye; con opción vacía se borra. */
function votar_(d) {
  const depto = parseInt(d.depto, 10);
  if (!(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  const pregunta = limpiar_(d.pregunta, 40), opcion = limpiar_(d.opcion, 40);
  if (!pregunta) return { ok: false, error: "voto" };
  const h = hojaSimple_(HOJA_VOTOS, ["Pregunta", "Depto", "Opción", "Fecha"]);
  const n = h.getLastRow();
  let fila = 0;
  if (n > 1) {
    const vals = h.getRange(2, 1, n - 1, 2).getValues();
    for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === pregunta && Number(vals[i][1]) === depto) { fila = i + 2; break; }
  }
  if (!opcion) { if (fila) h.deleteRow(fila); return { ok: true, pregunta: pregunta, depto: depto, opcion: "" }; }
  if (!fila) fila = n + 1;
  h.getRange(fila, 1, 1, 4).setValues([[pregunta, depto, opcion, new Date()]]);
  h.getRange(fila, 4).setNumberFormat("dd/mm/yyyy hh:mm");
  return { ok: true, pregunta: pregunta, depto: depto, opcion: opcion };
}
/* Conteo por pregunta y opción, con los deptos que ya votaron (sin nombres). */
function votos_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_VOTOS);
  const r = { ok: true, preguntas: {} };
  if (!h || h.getLastRow() < 2) return r;
  h.getRange(2, 1, h.getLastRow() - 1, 3).getValues().forEach(f => {
    const p = String(f[0]), o = String(f[2]), dep = Number(f[1]);
    if (!p || !o) return;
    const q = r.preguntas[p] = r.preguntas[p] || { conteo: {}, deptos: {} };
    q.conteo[o] = (q.conteo[o] || 0) + 1;
    q.deptos[dep] = o;
  });
  return r;
}
function guardarAcuerdo_(d) {
  const tema = limpiar_(d.tema, 40);
  if (!tema) return { ok: false, error: "tema" };
  const h = hojaSimple_(HOJA_ACUERDOS, ["Tema", "Acuerdo", "Responsable", "Fecha compromiso", "Actualizado"]);
  const n = h.getLastRow();
  let fila = 0;
  if (n > 1) {
    const vals = h.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === tema) { fila = i + 2; break; }
  }
  if (!fila) fila = n + 1;
  h.getRange(fila, 1, 1, 5).setValues([[tema, limpiar_(d.acuerdo, 600), limpiar_(d.responsable, 120), limpiar_(d.fecha, 60), new Date()]]);
  h.getRange(fila, 5).setNumberFormat("dd/mm/yyyy hh:mm");
  return { ok: true, tema: tema };
}
function acuerdos_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_ACUERDOS);
  const r = { ok: true, acuerdos: {} };
  if (!h || h.getLastRow() < 2) return r;
  h.getRange(2, 1, h.getLastRow() - 1, 5).getValues().forEach(f => {
    if (!f[0]) return;
    r.acuerdos[String(f[0])] = { acuerdo: String(f[1] || ""), responsable: String(f[2] || ""), fecha: String(f[3] || ""),
      actualizado: f[4] instanceof Date ? Utilities.formatDate(f[4], "America/Mexico_City", "d/MM/yyyy HH:mm") : "" };
  });
  return r;
}

/* Reparto de responsabilidades: una fila por tarea; la página manda las doce de base y las extra. */
function guardarTarea_(d) {
  const id = limpiar_(d.id, 40);
  if (!id) return { ok: false, error: "tarea" };
  const h = hojaSimple_(HOJA_TAREAS, ["Id", "Tarea", "Qué implica", "Cada cuánto", "Quién", "Actualizado"]);
  const n = h.getLastRow();
  let fila = 0;
  if (n > 1) {
    const vals = h.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === id) { fila = i + 2; break; }
  }
  if (!fila) fila = n + 1;
  if (d.borrar) { if (fila <= n) h.deleteRow(fila); return { ok: true, id: id, borrada: true }; }
  h.getRange(fila, 1, 1, 6).setValues([[id, limpiar_(d.tarea, 80), limpiar_(d.implica, 300), limpiar_(d.frecuencia, 60), limpiar_(d.quien, 120), new Date()]]);
  h.getRange(fila, 6).setNumberFormat("dd/mm/yyyy hh:mm");
  return { ok: true, id: id };
}
function tareas_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_TAREAS);
  const r = { ok: true, tareas: [] };
  if (!h || h.getLastRow() < 2) return r;
  h.getRange(2, 1, h.getLastRow() - 1, 5).getValues().forEach(f => {
    if (!f[0]) return;
    r.tareas.push({ id: String(f[0]), tarea: String(f[1] || ""), implica: String(f[2] || ""), frecuencia: String(f[3] || ""), quien: String(f[4] || "") });
  });
  return r;
}

/* ============================ AGUA: lecturas, recibo y cargos ============================ */

function hojaAgua_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_AGUA);
  if (h) return h;
  h = ss.insertSheet(HOJA_AGUA);
  h.getRange(1, 1, 1, ENC_AGUA.length).setValues([ENC_AGUA]).setFontWeight("bold").setBackground("#d9e2ec");
  h.setFrozenRows(1);
  h.setColumnWidth(7, 220); h.setColumnWidth(11, 260);
  return h;
}
function hojaRecibos_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_RECIBOS);
  if (h) return h;
  h = ss.insertSheet(HOJA_RECIBOS);
  h.getRange(1, 1, 1, ENC_RECIBOS.length).setValues([ENC_RECIBOS]).setFontWeight("bold").setBackground("#d9e2ec").setWrap(true);
  h.setFrozenRows(1);
  h.setColumnWidths(2, 3, 160); h.setColumnWidth(9, 300);
  h.getRange("A2:A200").setNumberFormat("@");
  h.getRange("B2:B200").setBackground("#dbe9ff"); h.getRange("C2:C200").setBackground("#dbe9ff"); h.getRange("D2:D200").setBackground("#dbe9ff");
  return h;
}
/* Fila del mes en Recibos agua; si no existe, la crea con sus fórmulas y deja en azul lo que captura Eduardo. */
function filaRecibo_(mes, crear) {
  const h = hojaRecibos_();
  const n = h.getLastRow();
  if (n > 1) {
    const vals = h.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) if (mesTexto_(vals[i][0]) === mes) return i + 2;
  }
  if (!crear) return 0;
  const r = n + 1;
  h.getRange(r, 1).setNumberFormat("@").setValue(mes);
  h.getRange(r, 2).setNumberFormat("$#,##0.00");
  h.getRange(r, 4).setNumberFormat("dd/mm/yyyy");
  formulasRecibo_(h, r);
  return r;
}
/* Fórmulas del mes. Si la suma de lecturas supera los m³ del recibo (lecturas que abarcan más
   días que el recibo, o medidor general sin dato), el recibo se reparte en proporción directa
   al consumo, sin comunes. En todos los casos la suma de los 16 cargos es el monto del recibo. */
function formulasRecibo_(h, r) {
  h.getRange(r, 5).setFormula('=IF(B' + r + '>0,IF(AND(C' + r + '>0,C' + r + '-F' + r + '>=0),B' + r + '/C' + r + ',IF(F' + r + '>0,B' + r + '/F' + r + ',"")),"")').setNumberFormat("$#,##0.00");
  h.getRange(r, 6).setFormula("=SUMIF('" + HOJA_AGUA + "'!$A:$A,A" + r + ",'" + HOJA_AGUA + "'!$E:$E)");
  h.getRange(r, 7).setFormula('=IF(C' + r + '>0,C' + r + '-F' + r + ',"")');
  h.getRange(r, 8).setFormula('=IF(AND(ISNUMBER(E' + r + '),ISNUMBER(G' + r + '),G' + r + '>0),E' + r + '*G' + r + '/' + UNIDADES + ',0)').setNumberFormat("$#,##0.00");
}
function filaAgua_(h, mes, depto) {
  const n = h.getLastRow();
  if (n < 2) return 0;
  const vals = h.getRange(2, 1, n - 1, 2).getValues();
  for (let i = 0; i < vals.length; i++) if (mesTexto_(vals[i][0]) === mes && Number(vals[i][1]) === depto) return i + 2;
  return 0;
}
function claveLector_() {
  const cfg = config_();
  const v = String(cfg.clave_lector || "").trim();
  if (v) return v;
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);   // primera vez: se agrega la clave por defecto y el día de lectura
  if (h) h.getRange(h.getLastRow() + 1, 1, 2, 3).setValues([["clave_lector", "agua", "Clave de lecturas.html para quien lee los medidores. CÁMBIALA."], ["dia_lectura", "", "Día del mes en que se leen los medidores (por definir)"]]);
  return "agua";
}
/* Todo lo que la página de lecturas necesita para un mes: por depto, la lectura anterior,
   lo ya capturado este mes y el promedio de consumo de los últimos tres meses. */
function lecturasMes_(mes, clave) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ""))) throw new Error("mes");
  if (String(clave || "") !== claveLector_() && String(clave || "") !== CLAVE_ADMIN) return { ok: false, error: "clave" };
  const h = hojaAgua_();
  const filas = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, ENC_AGUA.length).getValues() : [];
  const r = { ok: true, mes: mes, deptos: [], capturados: 0, recibo: null, diaLectura: String(config_().dia_lectura || "") };
  for (let d = 1; d <= UNIDADES; d++) {
    const mias = filas.filter(f => Number(f[1]) === d).map(f => ({ mes: mesTexto_(f[0]), ant: f[2], act: f[3], cons: f[4], est: f[5], foto: f[6] }));
    const previas = mias.filter(x => x.mes < mes && x.act !== "" && x.act !== null).sort((a, b) => a.mes < b.mes ? 1 : -1);
    const actual = mias.find(x => x.mes === mes) || null;
    const ult = previas.slice(0, 3).map(x => Number(x.cons)).filter(x => !isNaN(x) && x >= 0);
    r.deptos.push({
      depto: d,
      anterior: previas.length ? Number(previas[0].act) : (actual && actual.ant !== "" ? Number(actual.ant) : null),
      anteriorEditable: !previas.length,
      actual: actual && actual.act !== "" ? Number(actual.act) : null,
      estimado: actual ? String(actual.est) === "sí" : false,
      foto: actual ? String(actual.foto || "") : "",
      promedio: ult.length ? Math.round(ult.reduce((a, b) => a + b, 0) / ult.length * 10) / 10 : null
    });
    if (actual && actual.act !== "") r.capturados++;
  }
  const fr = filaRecibo_(mes, false);
  if (fr) {
    const v = hojaRecibos_().getRange(fr, 2, 1, 8).getValues()[0];
    r.recibo = { monto: Number(v[0]) || 0, m3: Number(v[1]) || 0, limite: v[2] instanceof Date ? Utilities.formatDate(v[2], "America/Mexico_City", "yyyy-MM-dd") : "",
      precio: Number(v[3]) || 0, suma: Number(v[4]) || 0, comunes: Number(v[5]) || 0, comunesDepto: Number(v[6]) || 0, foto: String(v[7] || "").match(/https?:\/\/\S+/) ? String(v[7]).match(/https?:\/\/\S+/)[0] : "" };
  }
  return r;
}
/* El recibo de la CEA del mes, capturado por la misma persona que lee los medidores:
   monto, m³ del medidor general (impresos en el recibo), fecha límite y foto. */
function guardarRecibo_(d) {
  if (String(d.clave || "") !== claveLector_() && String(d.clave || "") !== CLAVE_ADMIN) return { ok: false, error: "clave" };
  const mes = String(d.mes || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, error: "mes" };
  const monto = Math.round((parseFloat(d.monto) || 0) * 100) / 100;
  const m3 = Math.round((parseFloat(d.m3) || 0) * 10) / 10;
  if (!(monto > 0)) return { ok: false, error: "monto" };
  if (!(m3 > 0)) return { ok: false, error: "m3" };
  const h = hojaRecibos_();
  const fila = filaRecibo_(mes, true);
  formulasRecibo_(h, fila);                                 // por si la fila venía de una versión anterior
  h.getRange(fila, 2, 1, 2).setValues([[monto, m3]]);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d.limite || ""))) {
    const [y, m, dd] = String(d.limite).split("-").map(Number);
    h.getRange(fila, 4).setValue(new Date(y, m - 1, dd, 12)).setNumberFormat("dd/mm/yyyy");   // a mediodía, para que no se corra un día entre zonas horarias
  }
  let foto = "";
  if (d.imagen && String(d.imagen).length > 100) {
    const blob = Utilities.newBlob(Utilities.base64Decode(String(d.imagen).replace(/^data:[^,]+,/, "")), d.tipo || "image/jpeg", mes + " · Recibo CEA $" + monto + ".jpg");
    foto = subcarpeta_("Agua " + mes).createFile(blob).getUrl();
  }
  const nota = "Capturado el " + Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy HH:mm") + (foto ? " · " + foto : "");
  h.getRange(fila, 9).setValue(nota);
  SpreadsheetApp.flush();
  const v = h.getRange(fila, 5, 1, 4).getValues()[0];
  return { ok: true, mes: mes, monto: monto, m3: m3, precio: Number(v[0]) || 0, suma: Number(v[1]) || 0, comunes: Number(v[2]) || 0, comunesDepto: Number(v[3]) || 0, foto: foto };
}
/* Guarda la lectura de un depto (número y foto). La fila del mes en Recibos agua se crea sola. */
function guardarLectura_(d) {
  if (String(d.clave || "") !== claveLector_() && String(d.clave || "") !== CLAVE_ADMIN) return { ok: false, error: "clave" };
  const mes = String(d.mes || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, error: "mes" };
  const depto = parseInt(d.depto, 10);
  if (!(depto >= 1 && depto <= UNIDADES)) return { ok: false, error: "departamento" };
  const actual = Math.round(parseFloat(d.actual) * 10) / 10;
  if (!(actual >= 0)) return { ok: false, error: "lectura" };
  const h = hojaAgua_();
  const info = lecturasMes_(mes, d.clave).deptos[depto - 1];
  let anterior = info.anterior;
  if (info.anteriorEditable && d.anterior !== undefined && d.anterior !== "" && d.anterior !== null) anterior = Math.round(parseFloat(d.anterior) * 10) / 10;
  if (anterior === null || isNaN(anterior)) return { ok: false, error: "falta la lectura anterior" };
  let consumo = Math.round((actual - anterior) * 10) / 10;
  if (consumo < 0 && actual < 1000) consumo = Math.round((actual + 10000 - anterior) * 10) / 10;   // el medidor dio la vuelta
  if (consumo < 0) return { ok: false, error: "la lectura es menor que la anterior" };
  const ahora = new Date();
  let foto = "";
  if (d.imagen && String(d.imagen).length > 100) {
    const nombre = mes + " · Depto " + (depto < 10 ? "0" : "") + depto + " · lectura " + actual + ".jpg";
    const blob = Utilities.newBlob(Utilities.base64Decode(String(d.imagen).replace(/^data:[^,]+,/, "")), d.tipo || "image/jpeg", nombre);
    foto = subcarpeta_("Agua " + mes).createFile(blob).getUrl();
  }
  filaRecibo_(mes, true);
  let fila = filaAgua_(h, mes, depto);
  if (!fila) { fila = h.getLastRow() + 1; h.getRange(fila, 1).setNumberFormat("@").setValue(mes); h.getRange(fila, 2).setValue(depto); }
  h.getRange(fila, 3, 1, 2).setValues([[anterior, actual]]);
  h.getRange(fila, 5).setFormula("=IF(AND(ISNUMBER(C" + fila + "),ISNUMBER(D" + fila + ")),IF(D" + fila + "<C" + fila + ",D" + fila + "+10000-C" + fila + ",D" + fila + "-C" + fila + "),\"\")");   // si corriges C o D en la hoja, el consumo se recalcula
  h.getRange(fila, 6).setValue(d.estimado ? "sí" : "no");
  if (foto) h.getRange(fila, 7).setValue(foto);
  h.getRange(fila, 8).setValue(ahora).setNumberFormat("dd/mm/yyyy hh:mm");
  h.getRange(fila, 9).setFormula("=IF(AND(ISNUMBER(E" + fila + "),ISNUMBER(VLOOKUP(A" + fila + ",'" + HOJA_RECIBOS + "'!$A:$E,5,FALSE))),VLOOKUP(A" + fila + ",'" + HOJA_RECIBOS + "'!$A:$E,5,FALSE)*E" + fila + "+VLOOKUP(A" + fila + ",'" + HOJA_RECIBOS + "'!$A:$H,8,FALSE),\"\")").setNumberFormat("$#,##0.00");
  if (d.nota) h.getRange(fila, 11).setValue(limpiar_(d.nota, 200));
  return { ok: true, depto: depto, anterior: anterior, actual: actual, consumo: consumo, foto: foto };
}
/* Recibo de agua de un depto, mes por mes, con el reparto del edificio para que se vea cómo se calculó. */
function aguaDepto_(depto) {
  if (!(depto >= 1 && depto <= UNIDADES)) throw new Error("departamento");
  const ss = SpreadsheetApp.getActive();
  const h = ss.getSheetByName(HOJA_AGUA), hr = ss.getSheetByName(HOJA_RECIBOS);
  const r = { ok: true, depto: depto, meses: [], diaLectura: String(config_().dia_lectura || "") };
  if (!h || h.getLastRow() < 2) return r;
  const recibos = {};
  if (hr && hr.getLastRow() > 1) hr.getRange(2, 1, hr.getLastRow() - 1, 8).getValues().forEach(f => {
    recibos[mesTexto_(f[0])] = { monto: Number(f[1]) || 0, m3: Number(f[2]) || 0, limite: f[3] instanceof Date ? Utilities.formatDate(f[3], "America/Mexico_City", "d/MM/yyyy") : String(f[3] || ""),
      precio: Number(f[4]) || 0, suma: Number(f[5]) || 0, comunes: Number(f[6]) || 0, comunesDepto: Number(f[7]) || 0 };
  });
  h.getRange(2, 1, h.getLastRow() - 1, ENC_AGUA.length).getValues().forEach(f => {
    if (Number(f[1]) !== depto) return;
    const mes = mesTexto_(f[0]);
    const rec = recibos[mes] || null;
    r.meses.push({ mes: mes, anterior: Number(f[2]), actual: Number(f[3]), consumo: Number(f[4]) || 0, estimado: String(f[5]) === "sí",
      cargo: f[8] === "" ? null : Number(f[8]), pagado: f[9] instanceof Date ? Utilities.formatDate(f[9], "America/Mexico_City", "d/MM/yyyy") : (f[9] ? String(f[9]) : ""),
      nota: String(f[10] || ""), recibo: rec });
  });
  r.meses.sort((a, b) => a.mes < b.mes ? 1 : -1);
  return r;
}
function marcarAguaPagada_(mes, depto, fecha, folio) {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_AGUA);
  if (!h || !mes) return;
  const fila = filaAgua_(h, mes, depto);
  if (!fila) return;
  h.getRange(fila, 10).setValue(fecha).setNumberFormat("dd/mm/yyyy");
  if (folio) h.getRange(fila, 11).setValue(("Pago " + folio + " · " + String(h.getRange(fila, 11).getValue() || "")).replace(/ · $/, ""));
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
    try {                                                   // si el pago trae agua, el recibo de ese mes queda pagado
      const f = h.getRange(fila, 1, 1, ENC_PAGOS.length).getValues()[0];
      if (Number(f[3]) > 0) marcarAguaPagada_(mesTexto_(f[10]), Number(f[1]), new Date(), String(f[13] || ""));
    } catch (e) {}
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
  const hoja = hojaDelMes_(ss, mes);
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

/* ============================ FINANZAS EN VIVO ============================ */

/* Cifras agregadas por mes para finanzas.html. Lee las pestañas mensuales por sus
   etiquetas (columna B) desde el mes de Config "finanzas_desde". SOLO salen sumas:
   nunca cobros por departamento. */
function finanzas_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) { const c = cache.get("finanzas"); if (c) return JSON.parse(c); }
  const ss = SpreadsheetApp.getActive();
  const cfg = config_();
  const desde = mesTexto_(cfg.finanzas_desde).trim();
  const meses = [];
  const proyectos = {};
  /* Caja de la mesa: además de los meses en vivo, los vecinos pagan a la mesa cuotas
     atrasadas de meses anteriores (agosto, septiembre…) y se anotan en la pestaña del mes
     que cubren. Ese dinero también está en la cuenta: se suma a la caja. El agua de esos
     meses no, porque la cobró la administración anterior. */
  const previos = [];
  ss.getSheets().forEach(h => {
    if (!esHojaMes_(h)) return;
    const id = idDeHojaMes_(h);
    if (!id) return;
    const m = leerMesVivo_(h, id);
    if (desde && id < desde) {
      const recibido = Math.round((m.ingresos.manto + m.ingresos.extra + m.ingresos.casaClub) * 100) / 100;
      if (recibido > 0) previos.push({ id: id, nombre: m.nombre, monto: recibido, manto: m.ingresos.manto, extra: m.ingresos.extra, casaClub: m.ingresos.casaClub, pagaron: m.cobranza.pagaron });
      return;
    }
    if (!m.capturado) return;
    m.proyectos.forEach(p => { proyectos[p.nombre.toLowerCase()] = p; });
    delete m.proyectos;
    meses.push(m);
  });
  meses.sort((a, b) => a.id < b.id ? -1 : 1);
  previos.sort((a, b) => a.id < b.id ? -1 : 1);
  const totalPrevios = Math.round(previos.reduce((a, p) => a + p.monto, 0) * 100) / 100;
  const ultimo = meses.length ? meses[meses.length - 1] : null;
  const out = {
    ok: true, servicio: "misiones-finanzas", generado: new Date().toISOString(),
    desde: desde, unidades: UNIDADES, cuota: Number(cfg.cuota_mantenimiento) || 1500,
    meses: meses, proyectos: Object.keys(proyectos).map(k => proyectos[k]),
    caja: { saldo: Math.round(((ultimo ? ultimo.saldoFin : 0) + totalPrevios) * 100) / 100, ultimoMes: ultimo ? ultimo.id : "", saldoUltimoMes: ultimo ? ultimo.saldoFin : 0, previos: previos, totalPrevios: totalPrevios }
  };
  try { cache.put("finanzas", JSON.stringify(out), CACHE_FINANZAS); } catch (e) {}
  return out;
}

function leerMesVivo_(h, id) {
  const FILAS = 120;
  const vals = h.getRange(1, 2, FILAS, 6).getValues();          // B:G
  const et = vals.map(f => normEt_(f[0]));
  const fila = (clave, desde, hasta) => { for (let i = desde || 0; i < Math.min(hasta || FILAS, et.length); i++) if (et[i].indexOf(clave) === 0) return i; return -1; };
  const fCobros = fila("cobrospordepartamento");
  const tope = fCobros > 0 ? fCobros : 30;
  const numRes = clave => { const i = fila(clave, 0, tope); return i < 0 ? 0 : (Number(vals[i][1]) || 0); };
  const seccion = clave => fila(clave, fCobros > 0 ? fCobros + 1 : 0);
  const fCasa = seccion("rentadecasaclub"), fOrd = seccion("egresosordinarios"), fExt = seccion("egresosextraordinarios"), fProy = seccion("proyectosencurso");
  const renglones = (inicio, conTotal) => {
    const out = [];
    if (inicio < 0) return out;
    let vacias = 0;
    for (let i = inicio + 2; i < et.length; i++) {
      const e = et[i];
      if (conTotal && e.indexOf("total") === 0) break;
      if (!conTotal && (e.indexOf("egresos") === 0 || e.indexOf("pendientes") === 0 || e.indexOf("renta") === 0 || e.indexOf("cobros") === 0)) break;
      if (!e && !String(vals[i][1]).trim() && !String(vals[i][2]).trim()) { if (++vacias >= 6) break; continue; }
      vacias = 0;
      out.push({ fila: i + 1, b: vals[i][0], c: vals[i][1], d: vals[i][2], e: vals[i][3], f: vals[i][4], g: vals[i][5] });
    }
    return out;
  };
  const cobros = renglones(fCobros, true).filter(r => /^depto/i.test(String(r.b)));
  const manto = cobros.reduce((a, r) => a + (Number(r.c) || 0), 0);
  const agua = cobros.reduce((a, r) => a + (Number(r.d) || 0), 0);
  const extra = cobros.reduce((a, r) => a + (Number(r.e) || 0), 0);
  const pagaron = cobros.filter(r => (Number(r.c) || 0) > 0).length;
  const casaClub = renglones(fCasa, true).reduce((a, r) => a + (Number(r.d) || 0), 0);   // B depto · C fecha · D monto
  const ligas = ligasColumnaD_(h, fOrd, fExt, FILAS);
  const items = lista => lista.filter(r => String(r.b).trim() && (Number(r.c) || 0) > 0).map(r => {
    const liga = ligas[r.fila] || "";
    const it = [String(r.b).trim(), Math.round(Number(r.c) * 100) / 100];
    if (liga) it.push(liga);
    return it;
  });
  const ordinarios = items(renglones(fOrd, true)), extraordinarios = items(renglones(fExt, true));
  const totOrd = ordinarios.reduce((a, b) => a + b[1], 0), totExt = extraordinarios.reduce((a, b) => a + b[1], 0);
  const proyectos = renglones(fProy, false).filter(r => String(r.b).trim()).map(r => ({
    nombre: String(r.b).trim(), estado: String(r.c || "").trim(), presupuesto: Number(r.d) || null, gastado: Number(r.e) || 0,
    avance: r.f === "" ? null : Math.round(Number(r.f) * (Number(r.f) <= 1 ? 100 : 1)), notas: String(r.g || "").trim()
  }));
  const saldoIni = numRes("saldoinicial");
  const iFin = fila("saldofinaldelmes", 0, tope);
  const saldoFin = iFin >= 0 ? (Number(vals[iFin][1]) || 0) : saldoIni + manto + agua + extra + casaClub - totOrd - totExt;
  const carpeta = /^https?:\/\//.test(String(vals[8] ? vals[8][1] : "")) ? String(vals[8][1]).trim() : "";
  const mesIdx = parseInt(id.slice(5), 10) - 1;
  const r2 = v => Math.round(v * 100) / 100;
  return {
    id: id, anio: parseInt(id.slice(0, 4), 10), nombre: capitalizar_(MESES[mesIdx]), corto: capitalizar_(MESES[mesIdx].slice(0, 3)),
    saldoIni: r2(saldoIni), saldoFin: r2(saldoFin),
    ingresos: { manto: r2(manto), agua: r2(agua), elevador: 0, medidores: 0, otros: 0, extra: r2(extra), casaClub: r2(casaClub) },
    egresos: { ordinarios: r2(totOrd), extraordinarios: r2(totExt) },
    cobranza: { pagaron: pagaron, pct: Math.round(pagaron / UNIDADES * 1000) / 10 },
    detalle: { ordinarios: ordinarios, extraordinarios: extraordinarios },
    carpeta: carpeta, proyectos: proyectos,
    capturado: manto > 0 || agua > 0 || extra > 0 || casaClub > 0 || totOrd > 0 || totExt > 0
  };
}

/* Ligas en la columna D de las secciones de egresos (hipervínculo, URL escrita o HYPERLINK). */
function ligasColumnaD_(h, fOrd, fExt, FILAS) {
  const out = {};
  const inicio = Math.min(fOrd < 0 ? FILAS : fOrd, fExt < 0 ? FILAS : fExt);
  if (inicio >= FILAS) return out;
  const rango = h.getRange(inicio + 1, 4, FILAS - inicio, 1);
  const ricos = rango.getRichTextValues(), formulas = rango.getFormulas(), valores = rango.getValues();
  for (let i = 0; i < ricos.length; i++) {
    let url = ricos[i][0] && ricos[i][0].getLinkUrl();
    if (!url && ricos[i][0]) { const runs = ricos[i][0].getRuns(); for (let r = 0; r < runs.length && !url; r++) url = runs[r].getLinkUrl(); }
    if (!url) { const m = /HYPERLINK\(\s*"([^"]+)"/i.exec(formulas[i][0] || ""); if (m) url = m[1]; }
    if (!url && /^https?:\/\//.test(String(valores[i][0]).trim())) url = String(valores[i][0]).trim();
    if (url) out[inicio + 1 + i] = url;
  }
  return out;
}

/* "2026-10" de una pestaña mensual: por la fecha de C5 (con 12 h de margen por zona
   horaria), o por el nombre de la pestaña ("Octubre", "Enero 2027"). */
function idDeHojaMes_(h) {
  const v = h.getRange("C5").getValue();
  if (v instanceof Date) return Utilities.formatDate(new Date(v.getTime() + 12 * 3600 * 1000), "America/Mexico_City", "yyyy-MM");
  const m = /^([a-záéíóú]+)(?:\s+(\d{4}))?$/i.exec(h.getName().trim());
  if (!m) return "";
  const idx = MESES.indexOf(m[1].toLowerCase());
  if (idx < 0) return "";
  const anio = m[2] ? parseInt(m[2], 10) : (/(\d{4})/.exec(String(v || "")) ? parseInt(/(\d{4})/.exec(String(v || ""))[1], 10) : ANIO);
  return anio + "-" + ("0" + (idx + 1)).slice(-2);
}
function mesSiguiente_(id, paso) {
  const y = parseInt(id.slice(0, 4), 10), m = parseInt(id.slice(5), 10) - 1 + (paso || 1);
  const d = new Date(y, m, 1);
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
}
/* Busca o crea la pestaña de un mes "2026-10" a partir de la plantilla. */
function hojaDelMes_(ss, mes) {
  const idx = parseInt(mes.split("-")[1], 10) - 1;
  const anio = parseInt(mes.split("-")[0], 10);
  const nombre = nombreHojaMes_(idx, anio);
  let hoja = buscarHojaMes_(ss, nombre);
  if (!hoja) {
    hoja = ss.getSheetByName(PLANTILLA).copyTo(ss).setName(nombre);
    hoja.getRange("C5").setValue(capitalizar_(MESES[idx]) + " " + anio);
    hoja.getRange("B1").setValue("MISIONES · " + capitalizar_(MESES[idx]) + " " + anio);
    ajustarCasaClub_(hoja);
    limpiarMuestras_(hoja);
  }
  return hoja;
}
/* Quita los montos de ejemplo de la plantilla (Administración 7,000 y Limpieza 7,000)
   cuando son lo único que hay en egresos y la pestaña no tiene cobros. */
function limpiarMuestras_(h) {
  const sec = seccionEgresos_(h, "ordinario");
  if (!sec) return false;
  const filas = h.getRange(sec.inicio, 2, sec.fin - sec.inicio + 1, 2).getValues();
  const conMonto = filas.map((f, i) => ({ fila: sec.inicio + i, b: normEt_(f[0]), c: Number(f[1]) || 0 })).filter(x => x.c > 0);
  const esMuestra = conMonto.length === 2 && conMonto.every(x => x.c === 7000 && (x.b.indexOf("administracion") === 0 || x.b.indexOf("limpieza") === 0));
  if (!esMuestra) return false;
  const ext = seccionEgresos_(h, "extraordinario");
  if (ext && h.getRange(ext.inicio, 3, ext.fin - ext.inicio + 1, 1).getValues().some(f => (Number(f[0]) || 0) > 0)) return false;
  const esPlantilla = h.getName() === PLANTILLA;
  if (!esPlantilla) {
    const cob = h.createTextFinder("COBROS POR DEPARTAMENTO").matchCase(false).findNext();
    const tot = h.createTextFinder("TOTAL COBRADO").matchCase(false).findNext();
    if (cob && tot && h.getRange(cob.getRow() + 2, 3, Math.max(1, tot.getRow() - cob.getRow() - 2), 3).getValues().some(f => f.some(v => (Number(v) || 0) > 0))) return false;
  }
  conMonto.forEach(x => h.getRange(x.fila, 3).clearContent());
  return true;
}
/* Filas de datos de una sección de egresos: { inicio, fin, total } (1-based). */
function seccionEgresos_(h, tipo) {
  /* Celda completa: el resumen tiene "(−) Egresos ordinarios" y no es la sección. */
  const enc = h.createTextFinder(tipo === "extraordinario" ? "EGRESOS EXTRAORDINARIOS" : "EGRESOS ORDINARIOS").matchCase(false).matchEntireCell(true).findNext();
  if (!enc) return null;
  const col = h.getRange(enc.getRow() + 1, 2, 40, 1).getValues();
  for (let i = 1; i < col.length; i++) {
    if (normEt_(col[i][0]).indexOf("total") === 0) return { inicio: enc.getRow() + 2, fin: enc.getRow() + i, total: enc.getRow() + 1 + i };
  }
  return null;
}
function normEt_(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }

/* ============================ EGRESOS (egresos.html) ============================ */

function claveEgresos_() { return String(config_().clave_egresos || "egresos").trim(); }

function hojaEgresos_() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_EGRESOS);
  if (!h) {
    h = ss.insertSheet(HOJA_EGRESOS);
    h.getRange(1, 1, 1, ENC_EGRESOS.length).setValues([ENC_EGRESOS]).setFontWeight("bold").setBackground("#1d3f63").setFontColor("#ffffff");
    h.setFrozenRows(1);
    h.setColumnWidth(1, 130); h.setColumnWidth(4, 220); h.setColumnWidth(5, 160); h.setColumnWidth(8, 220); h.setColumnWidth(9, 120);
    h.getRange("A2:A").setNumberFormat("dd/mm/yyyy hh:mm");
    h.getRange("B2:B").setNumberFormat("@");
    h.getRange("F2:F").setNumberFormat("$#,##0.00");
    h.getRange("G2:G").setNumberFormat("dd/mm/yyyy");
    h.hideColumns(11);
    const cf = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Anulado").setBackground("#f8d7da").setRanges([h.getRange("M2:M")]).build();
    h.setConditionalFormatRules([cf]);
  }
  return h;
}

/* Anota un gasto en la pestaña del mes y en la bitácora. */
function registrarEgreso_(d) {
  if (String(d.clave || "") !== claveEgresos_()) return { ok: false, error: "clave" };
  const mes = String(d.mes || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, error: "mes" };
  const tipo = d.tipo === "extraordinario" ? "extraordinario" : "ordinario";
  const concepto = limpiar_(d.concepto, 80);
  const proveedor = limpiar_(d.proveedor, 60);
  const monto = Math.round((parseFloat(d.monto) || 0) * 100) / 100;
  if (!concepto) return { ok: false, error: "concepto" };
  if (!(monto > 0)) return { ok: false, error: "monto" };
  const nota = limpiar_(d.nota, 200);
  const quien = limpiar_(d.quien, 40);
  const ahora = new Date();
  /* Varias fechas (el conserje de lunes, miércoles y viernes): el monto es por fecha,
     la celda del mes recibe la suma y la bitácora guarda un renglón por día. */
  let fechas = Array.isArray(d.fechas) ? d.fechas : [d.fecha];
  fechas = fechas.map(x => String(x || "")).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x));
  fechas = fechas.filter((x, i) => fechas.indexOf(x) === i).sort();
  if (!fechas.length) fechas = [""];
  const aFecha = x => { if (!x) return null; const p = x.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const fechaPago = aFecha(fechas[0]);
  const veces = fechas.length;
  const total = Math.round(monto * veces * 100) / 100;

  const ss = SpreadsheetApp.getActive();
  const hoja = hojaDelMes_(ss, mes);
  const sec = seccionEgresos_(hoja, tipo);
  if (!sec) return { ok: false, error: "No encuentro la sección de egresos en " + hoja.getName() };

  // Comprobante (opcional): imagen o PDF a la carpeta del mes en Drive
  let url = "";
  if (d.imagen && String(d.imagen).length > 100) {
    const ext = /pdf/i.test(String(d.tipoArchivo || "")) ? ".pdf" : ".jpg";
    const nombre = "Egreso · " + Utilities.formatDate(fechaPago || ahora, "America/Mexico_City", "yyyy-MM-dd") + (veces > 1 ? " (" + veces + " fechas)" : "") + " · " + concepto + (proveedor ? " · " + proveedor : "") + " · $" + total + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(String(d.imagen).replace(/^data:[^,]+,/, "")), d.tipoArchivo || "image/jpeg", nombre);
    url = subcarpeta_(mes).createFile(blob).getUrl();
  }

  // Dónde anotarlo: en ordinarios, el renglón del mismo concepto (se suma si ya tiene monto);
  // en extraordinarios, siempre un renglón nuevo. Si no hay renglón libre, se inserta uno dentro de la suma.
  const etiqueta = concepto + (proveedor ? " · " + proveedor : "");
  const filas = hoja.getRange(sec.inicio, 2, sec.fin - sec.inicio + 1, 3).getValues();
  let fila = 0, nueva = false, previo = 0;
  if (tipo === "ordinario") {
    const k = normEt_(concepto);
    for (let i = 0; i < filas.length; i++) {
      const b = normEt_(filas[i][0]);
      if (b && (b === k || b.indexOf(k) === 0 || k.indexOf(b) === 0)) { fila = sec.inicio + i; previo = Number(filas[i][1]) || 0; break; }
    }
  }
  if (!fila) {
    for (let i = 0; i < filas.length; i++) if (!String(filas[i][0]).trim() && !(Number(filas[i][1]) || 0)) { fila = sec.inicio + i; nueva = true; break; }
  }
  if (!fila) { hoja.insertRowBefore(sec.fin); fila = sec.fin; nueva = true; }   // dentro del rango de SUM
  if (nueva || !String(filas[fila - sec.inicio] ? filas[fila - sec.inicio][0] : "").trim()) hoja.getRange(fila, 2).setValue(etiqueta);
  else if (proveedor && String(hoja.getRange(fila, 2).getValue()).indexOf(proveedor) < 0) hoja.getRange(fila, 2).setValue(String(hoja.getRange(fila, 2).getValue()).trim() + " · " + proveedor);
  hoja.getRange(fila, 3).setValue(Math.round((previo + total) * 100) / 100).setNumberFormat("$#,##0.00");
  // La liga del comprobante va en D solo si la celda está vacía; el resto queda en la bitácora y en Drive.
  if (url && !String(hoja.getRange(fila, 4).getValue() || "").trim()) hoja.getRange(fila, 4).setValue(url);

  const bit = hojaEgresos_();
  const folios = [];
  const a1 = hoja.getRange(fila, 3).getA1Notation();
  fechas.slice().reverse().forEach((fx, k) => {              // al insertar arriba, la primera fecha queda hasta arriba
    const folio = "E-" + String(siguienteFolioEgreso_()).padStart(4, "0");
    const celda = hoja.getName() + "!" + a1 + "=" + monto + "=" + (nueva && k === fechas.length - 1 ? "nueva" : "suma");
    bit.insertRowBefore(2);
    bit.getRange(2, 1, 1, ENC_EGRESOS.length).setValues([[ahora, mes, tipo, concepto, proveedor, monto, aFecha(fx) || "", nota, url, quien, celda, folio, "Registrado"]]);
    bit.getRange(2, 1).setNumberFormat("dd/mm/yyyy hh:mm");
    bit.getRange(2, 2).setNumberFormat("@").setValue(mes);
    bit.getRange(2, 6).setNumberFormat("$#,##0.00");
    bit.getRange(2, 7).setNumberFormat("dd/mm/yyyy");
    folios.unshift(folio);
  });
  try { CacheService.getScriptCache().remove("finanzas"); } catch (e) {}
  return { ok: true, folio: folios.join(", "), folios: folios, veces: veces, total: total, hoja: hoja.getName(), celda: a1, comprobante: url };
}

/* Deshace un gasto registrado: resta el monto en la celda del mes (o limpia el renglón si lo creó) y marca Anulado. */
function anularEgreso_(d) {
  if (String(d.clave || "") !== claveEgresos_()) return { ok: false, error: "clave" };
  const bit = hojaEgresos_();
  const n = bit.getLastRow();
  if (n < 2) return { ok: false, error: "folio" };
  const datos = bit.getRange(2, 1, n - 1, ENC_EGRESOS.length).getValues();
  const i = datos.findIndex(f => String(f[11]) === String(d.folio));
  if (i < 0) return { ok: false, error: "folio" };
  const f = datos[i];
  if (String(f[12]) === "Anulado") return { ok: true, folio: d.folio, ya: true };
  const partes = String(f[10]).split("=");                   // Hoja!C62=monto=nueva|suma
  const [hojaNombre, a1] = partes[0].split("!");
  const monto = Number(partes[1]) || Number(f[5]) || 0;
  const hoja = SpreadsheetApp.getActive().getSheetByName(hojaNombre);
  if (hoja && a1) {
    const rg = hoja.getRange(a1);
    const resto = Math.round(((Number(rg.getValue()) || 0) - monto) * 100) / 100;
    if (resto > 0) rg.setValue(resto);
    else {
      rg.clearContent();
      if (partes[2] === "nueva") hoja.getRange(rg.getRow(), 2, 1, 3).clearContent();   // B concepto · C monto · D liga
      else if (f[8] && String(hoja.getRange(rg.getRow(), 4).getValue()).trim() === String(f[8]).trim()) hoja.getRange(rg.getRow(), 4).clearContent();
    }
  }
  bit.getRange(2 + i, 13).setValue("Anulado");
  try { CacheService.getScriptCache().remove("finanzas"); } catch (e) {}
  return { ok: true, folio: d.folio };
}

/* Lo registrado en un mes (bitácora) y lo que la pestaña del mes tiene hoy en egresos. */
function egresosMes_(mes, clave) {
  if (String(clave || "") !== claveEgresos_()) return { ok: false, error: "clave" };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ""))) return { ok: false, error: "mes" };
  const ss = SpreadsheetApp.getActive();
  const bit = hojaEgresos_();
  const n = bit.getLastRow();
  const lista = n < 2 ? [] : bit.getRange(2, 1, n - 1, ENC_EGRESOS.length).getValues()
    .filter(f => mesTexto_(f[1]) === mes && String(f[12]) !== "Anulado")
    .map(f => ({
      folio: String(f[11]), registrado: f[0] instanceof Date ? Utilities.formatDate(f[0], "America/Mexico_City", "d/M/yyyy HH:mm") : String(f[0]),
      tipo: String(f[2]), concepto: String(f[3]), proveedor: String(f[4] || ""), monto: Number(f[5]) || 0,
      fecha: f[6] instanceof Date ? Utilities.formatDate(f[6], "America/Mexico_City", "d/M/yyyy") : String(f[6] || ""),
      nota: String(f[7] || ""), comprobante: String(f[8] || ""), quien: String(f[9] || "")
    }));
  const idx = parseInt(mes.split("-")[1], 10) - 1, anio = parseInt(mes.split("-")[0], 10);
  const hoja = buscarHojaMes_(ss, nombreHojaMes_(idx, anio));
  const enHoja = { ordinarios: [], extraordinarios: [] };
  if (hoja) {
    ["ordinario", "extraordinario"].forEach(t => {
      const sec = seccionEgresos_(hoja, t);
      if (!sec) return;
      hoja.getRange(sec.inicio, 2, sec.fin - sec.inicio + 1, 2).getValues().forEach(f => {
        if (String(f[0]).trim() && (Number(f[1]) || 0) > 0) enHoja[t + "s"].push([String(f[0]).trim(), Math.round(Number(f[1]) * 100) / 100]);
      });
    });
  }
  const cfg = config_();
  return { ok: true, mes: mes, hoja: hoja ? hoja.getName() : "", lista: lista, enHoja: enHoja,
    conceptos: ["Administración", "Agua (recibo del organismo)", "Luz (CFE)", "Limpieza y conserjería", "Jardinería", "Alberca", "Insumos", "Elevador", "Gas", "Papelería y trámites"],
    urlHoja: ss.getUrl(), aviso: String(cfg.aviso_egresos || "") };
}

function siguienteFolioEgreso_() {
  const props = PropertiesService.getScriptProperties();
  let n = parseInt(props.getProperty("folioEgreso"), 10);
  if (!(n >= 1)) {
    n = 1;
    const h = SpreadsheetApp.getActive().getSheetByName(HOJA_EGRESOS);
    if (h && h.getLastRow() > 1) h.getRange(2, 12, h.getLastRow() - 1, 1).getValues().forEach(f => { const k = parseInt(String(f[0]).replace(/\D/g, ""), 10); if (k >= n) n = k + 1; });
  }
  props.setProperty("folioEgreso", String(n + 1));
  return n;
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
/* Las pestañas de 2026 se llaman "Octubre"; desde 2027, "Enero 2027", para no confundir años. */
function nombreHojaMes_(idx, anio) {
  return capitalizar_(MESES[idx]) + (anio === ANIO ? "" : " " + anio);
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
