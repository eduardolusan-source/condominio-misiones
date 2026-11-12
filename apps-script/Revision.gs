/* Las Misiones · Revisión de gastos de ejemplo (tercer archivo del proyecto, opcional).
   La plantilla original traía dos gastos de muestra (Administración $7,000 y Limpieza
   $7,000). Esta función recorre TODAS las pestañas de meses y lista los renglones de
   egresos que dicen "Administración" o que valen exactamente $7,000, para que la mesa
   decida si son reales. No borra ni cambia nada.
   Uso: en el editor, elegir revisarGastosDeEjemplo → Ejecutar. Sale un aviso en la hoja
   (y queda en el registro de ejecución). */
function revisarGastosDeEjemplo() {
  const ss = SpreadsheetApp.getActive();
  const hallazgos = [];
  ss.getSheets().forEach(h => {
    if (!esHojaMes_(h)) return;
    ["ordinario", "extraordinario"].forEach(tipo => {
      const sec = seccionEgresos_(h, tipo);
      if (!sec) return;
      h.getRange(sec.inicio, 2, sec.fin - sec.inicio + 1, 2).getValues().forEach((f, i) => {
        const concepto = String(f[0] || "").trim(), monto = Number(f[1]) || 0;
        if (monto > 0 && (normEt_(concepto).indexOf("administracion") === 0 || Math.abs(monto - 7000) < 0.01)) {
          hallazgos.push(h.getName() + " · egresos " + tipo + "s · fila " + (sec.inicio + i) + " · " + (concepto || "(sin concepto)") + " · $" + monto.toLocaleString("es-MX"));
        }
      });
    });
  });
  const msg = hallazgos.length
    ? "Revisa si estos gastos son reales (pueden ser los de ejemplo de la plantilla):\n\n" + hallazgos.join("\n") + "\n\nSi no lo son, borra el monto en la columna C de esa fila."
    : "No encontré gastos de Administración ni montos de $7,000 en ningún mes. Todo limpio.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert("Revisión de gastos de ejemplo", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* desde el editor basta el registro */ }
  return hallazgos;
}
