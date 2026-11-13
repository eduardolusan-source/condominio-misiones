/* Las Misiones · el edificio de un vistazo. Lo usan finanzas.html (público, sin nombres) y
   quien-debe.html (mesa). Dibuja: meses, vista (todo / mantenimiento / agua), una frase que
   interpreta el mes, dos medidores, el edificio de 4 pisos y el adeudo total de hoy.
   Datos (accion=edificio o edificioPublico):
     { hoy, cuota, meses:[{id,nombre}], deptos:[{ d, total, manto, agua, extra, extraNombre, aFavor, enRevision,
       meses:{ "2026-11": { m:"si|parcial|no", cubre, pago } }, recibos:{ "2026-10": { cargo, pagado } } }] }
   Mantenimiento: los pagos cubren primero el mes más viejo. Agua: en cada mes se cobra el recibo del mes anterior. */
(function () {
  "use strict";
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const $m = n => "$" + Math.round(n).toLocaleString("es-MX");
  const nomMes = id => MES[parseInt(id.slice(5), 10) - 1];
  const antes = id => { let y = +id.slice(0, 4), m = +id.slice(5) - 1; if (m < 1) { m = 12; y--; } return y + "-" + String(m).padStart(2, "0"); };
  const ICO = { ok: "✓", par: "½", no: "✕", nd: "–" };

  /* Techo con cúpula, como la del logo. */
  const TECHO = '<svg class="ed-techo" viewBox="0 0 430 92" aria-hidden="true">' +
    '<path d="M215 4v10M210 9h10" stroke="var(--oro)" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="207" y="16" width="16" height="12" rx="2" fill="var(--oro)"/>' +
    '<path d="M183 52a32 26 0 0 1 64 0z" fill="var(--oro)"/>' +
    '<path d="M196 52v-8M215 52v-12M234 52v-8" stroke="var(--techo)" stroke-width="3" stroke-linecap="round" opacity=".35"/>' +
    '<rect x="176" y="50" width="78" height="8" rx="2" fill="var(--oro)"/>' +
    '<path d="M0 92 L38 58 H392 L430 92 Z" fill="var(--techo)"/>' +
    '<rect x="38" y="54" width="354" height="6" rx="2" fill="var(--techo)"/></svg>';

  function estadoDe(d, mes) {
    const m = d.meses[mes] || null, r = d.recibos[antes(mes)] || null;
    return { m: m, r: r, manto: m ? (m.m === "si" ? "ok" : m.m === "parcial" ? "par" : "no") : "nd", agua: r ? (r.pagado ? "ok" : "no") : "nd" };
  }

  function montar(raiz, opc) {
    opc = opc || {};
    let J = null, mes = "", modo = "todo", animar = true;
    const color = e => {
      if (modo === "manto") return e.manto;
      if (modo === "agua") return e.agua;
      const xs = [e.manto, e.agua].filter(x => x !== "nd");
      if (!xs.length) return "nd";
      if (xs.every(x => x === "ok")) return "ok";
      return xs.every(x => x === "no") ? "no" : "par";
    };

    function pintar() {
      if (!J || !J.meses.length) { raiz.innerHTML = ""; return; }
      const ds = J.deptos, porD = {}; ds.forEach(d => { porD[d.d] = d; });
      const es = ds.map(d => estadoDe(d, mes));
      const mOk = es.filter(e => e.manto === "ok").length, mPar = es.filter(e => e.manto === "par").length, mTot = es.filter(e => e.manto !== "nd").length;
      const aOk = es.filter(e => e.agua === "ok").length, aTot = es.filter(e => e.agua !== "nd").length;
      const todo = es.filter(e => e.manto === "ok" && (e.agua === "ok" || e.agua === "nd")).length;
      const U = ds.length, mesN = nomMes(mes), aguaN = nomMes(antes(mes)), enCurso = mes === J.hoy;
      const pc = (n, t) => t ? (n / t * 100).toFixed(1) + "%" : "0%";

      /* La frase: qué significa el mes, en palabras */
      let frase = "En <b>" + mesN + "</b>" + (enCurso ? " (va en curso)" : "") + ", <b>" + mOk + " de " + mTot + "</b> deptos tienen cubierto su mantenimiento";
      frase += aTot ? " y <b>" + aOk + " de " + aTot + "</b> pagaron el agua de " + aguaN + "." : "; el recibo de agua de " + aguaN + " aún no se carga.";
      frase += todo === U ? " <b>¡Todo el edificio está al corriente!</b> 🎉" : " <b>" + todo + "</b> " + (todo === 1 ? "está" : "están") + " completamente al corriente.";

      const deben = ds.filter(d => d.total > 0.5), suma = deben.reduce((a, d) => a + d.total, 0);
      const sM = ds.reduce((a, d) => a + d.manto, 0), sA = ds.reduce((a, d) => a + d.agua, 0), sE = ds.reduce((a, d) => a + d.extra, 0);
      const partes = [sM > 0.5 ? "mantenimiento " + $m(sM) : "", sA > 0.5 ? "agua " + $m(sA) : "", sE > 0.5 ? "cuotas extraordinarias " + $m(sE) : ""].filter(Boolean);

      let pisos = "";
      for (let p = 4; p >= 1; p--) {
        pisos += '<div class="ed-piso" data-piso="PISO ' + p + '">';
        for (let k = 1; k <= 4; k++) {
          const n = (p - 1) * 4 + k, d = porD[n];
          if (!d) { pisos += '<div class="ed-v nd"><b>' + n + "</b></div>"; continue; }
          const e = estadoDe(d, mes), c = color(e), i = (4 - p) * 4 + k;
          const titulo = "Depto " + n + ": mantenimiento " + { ok: "cubierto", par: "a medias", no: "sin pagar", nd: "sin cobro" }[e.manto] + ", agua " + { ok: "pagada", no: "sin pagar", nd: "sin recibo" }[e.agua];
          pisos += '<button type="button" class="ed-v ' + c + '" style="--i:' + i + '" data-d="' + n + '" title="' + esc(titulo) + '" aria-label="' + esc(titulo) + '"><b>' + n + '</b><span class="luces">' +
            (modo !== "agua" ? "<span>🧾" + ICO[e.manto] + "</span>" : "") + (modo !== "manto" ? "<span>💧" + ICO[e.agua] + "</span>" : "") + "</span>" +
            (d.enRevision ? '<span class="rev" title="Reportó un pago que la mesa está confirmando">⏳</span>' : "") + "</button>";
        }
        pisos += "</div>";
      }
      const ley = modo === "todo"
        ? [["ok", "Al corriente"], ["par", "Debe una parte"], ["no", "Debe mantenimiento y agua"], ["nd", "Sin cobro"]]
        : [["ok", modo === "agua" ? "Pagó" : "Cubierto"], ["par", "A medias"], ["no", "Sin pagar"], ["nd", modo === "agua" ? "Sin recibo" : "Sin cobro"]].filter(x => !(modo === "agua" && x[0] === "par"));

      raiz.innerHTML = '<div class="ed-card">' +
        '<p class="ed-k">' + esc(opc.kicker || "Transparencia · mes por mes") + "</p>" +
        '<h2 class="ed-h">' + esc(opc.titulo || "¿Quién está al corriente?") + "</h2>" +
        '<p class="ed-sub">' + esc(opc.sub || "Cada ventana es un departamento. Toca una para ver su detalle.") + "</p>" +
        '<div class="ed-meses">' + J.meses.map(x => '<button type="button" data-mes="' + x.id + '" class="' + (x.id === mes ? "sel" : "") + '">' + esc(x.nombre.replace(/ \d{4}$/, "")) + "</button>").join("") + "</div>" +
        '<div class="ed-seg">' + [["todo", "Todo"], ["manto", "🧾 Mantto."], ["agua", "💧 Agua"]].map(x => '<button type="button" data-modo="' + x[0] + '" class="' + (x[0] === modo ? "sel" : "") + '">' + x[1] + "</button>").join("") + "</div>" +
        '<p class="ed-frase">' + frase + "</p>" +
        '<div class="ed-cols"><div class="ed-datos">' +
          '<div class="ed-medidores">' +
            '<div class="ed-med"><small><span>🧾 Mantenimiento de ' + mesN + "</span></small><b>" + mOk + "<em> de " + mTot + '</em></b><div class="ed-barra"><i style="width:' + pc(mOk, mTot) + '"></i><s style="width:' + pc(mPar, mTot) + '"></s></div></div>' +
            (aTot ? '<div class="ed-med"><small><span>💧 Agua de ' + aguaN + "</span></small><b>" + aOk + "<em> de " + aTot + '</em></b><div class="ed-barra"><i style="width:' + pc(aOk, aTot) + '"></i></div></div>'
              : '<div class="ed-med sin"><small><span>💧 Agua de ' + aguaN + "</span></small><b>Sin recibo todavía</b></div>") +
          "</div>" +
          '<div class="ed-total' + (suma < 0.5 ? " cero" : "") + '"><span>' + (deben.length ? "Hoy deben <b style=\"color:inherit;font-size:1em\">" + deben.length + "</b> de " + U + " deptos, en total" : "Hoy nadie debe nada") + "</span><b>" + $m(suma) + "</b>" + (partes.length ? "<small>" + partes.join(" · ") + "</small>" : "") + "</div>" +
          '<details class="ed-como"><summary>¿Cómo se lee?</summary><ul>' +
            "<li><b>Mantenimiento:</b> cada pago cubre primero el mes más viejo que se debe, igual que en «Mi depto». Si alguien adelantó, sus meses siguientes aparecen cubiertos.</li>" +
            "<li><b>Agua:</b> el recibo de cada mes se cobra al mes siguiente; por eso en " + mesN + " se ve el agua de " + aguaN + ".</li>" +
            "<li>⏳ = reportó un pago que la mesa está confirmando.</li>" +
            "<li>Cuentan desde octubre de 2026; lo de la administración anterior no aparece aquí.</li></ul></details>" +
        '</div><div class="ed-dibujo">' +
          '<div class="ed-escena"><div class="ed-edif' + (animar ? " ed-anima" : "") + '">' + TECHO + '<div class="ed-letrero">LAS MISIONES</div><div class="ed-fachada">' + pisos +
            '<div class="ed-pb"><div class="ed-planta"><i></i><i></i></div><div class="ed-puerta"></div><div class="ed-planta"><i></i><i></i></div></div></div><div class="ed-suelo"></div></div></div>' +
          '<div class="ed-ley">' + ley.map(x => '<span><i style="background:var(--' + x[0] + ')"></i>' + x[1] + "</span>").join("") + "</div>" +
          '<div class="ed-estado" data-estado></div>' +
        "</div></div></div>";
      animar = false;
      const sel = raiz.querySelector(".ed-meses .sel"); if (sel) sel.scrollIntoView({ inline: "center", block: "nearest" });
      if (opc.estado) raiz.querySelector("[data-estado]").textContent = opc.estado;
    }

    raiz.addEventListener("click", ev => {
      const b = ev.target.closest("[data-mes],[data-modo],[data-d]"); if (!b || !J) return;
      if (b.dataset.mes) { mes = b.dataset.mes; animar = true; pintar(); }
      else if (b.dataset.modo) { modo = b.dataset.modo; pintar(); }
      else if (b.dataset.d && opc.onDepto) { const d = J.deptos.find(x => x.d === +b.dataset.d); if (d) opc.onDepto(d, estadoDe(d, mes), mes, J); }
    });

    return {
      actualizar(j, estado) {
        J = j; if (estado != null) opc.estado = estado;
        if (!mes || !j.meses.some(x => x.id === mes)) mes = j.meses.some(x => x.id === j.hoy) ? j.hoy : (j.meses.length ? j.meses[j.meses.length - 1].id : "");
        pintar();
      },
      estado(t) { opc.estado = t; const e = raiz.querySelector("[data-estado]"); if (e) e.textContent = t; }
    };
  }

  /* Detalle de un depto, para la ventana emergente. */
  function detalleHTML(d, e, mes, J) {
    const tm = { ok: ["ok", "Cubierto"], par: ["par", "A medias"], no: ["no", "Sin pagar"], nd: ["nd", "Sin cobro"] };
    const ta = { ok: ["ok", "Pagada"], no: ["no", "Sin pagar"], nd: ["nd", "Sin recibo"] };
    const pill = x => '<span class="ed-pill ' + x[0] + '">' + x[1] + "</span>";
    let h = '<div class="ed-det">' +
      "<div><span>🧾 Mantenimiento de " + nomMes(mes) + "</span>" + pill(tm[e.manto]) + "</div>" +
      (e.m && e.manto === "par" ? "<div><span>Cubierto</span><b>" + $m(e.m.cubre) + " de " + $m(J.cuota) + "</b></div>" : "") +
      "<div><span>💧 Agua de " + nomMes(antes(mes)) + "</span>" + pill(ta[e.agua]) + "</div>" +
      (e.r && !e.r.pagado ? "<div><span>Recibo</span><b>" + $m(e.r.cargo) + "</b></div>" : "") + "</div>" +
      '<p style="margin:1rem 0 .2rem;font-weight:800">Hoy, en total</p><div class="ed-det">' +
      (d.manto > 0.5 ? "<div><span>Mantenimiento</span><b>" + $m(d.manto) + "</b></div>" : "") +
      (d.agua > 0.5 ? "<div><span>Agua</span><b>" + $m(d.agua) + "</b></div>" : "") +
      (d.extra > 0.5 ? "<div><span>" + esc(d.extraNombre || "Cuota extraordinaria") + "</span><b>" + $m(d.extra) + "</b></div>" : "") +
      '<div class="tot"><span>' + (d.total > 0.5 ? "Debe" : "Al corriente") + "</span><span>" + (d.total > 0.5 ? $m(d.total) : d.aFavor > 0.5 ? "+" + $m(d.aFavor) + " a favor" : "✓") + "</span></div></div>" +
      (d.enRevision ? '<p style="color:var(--muted);font-size:.88rem;margin:.7rem 0 0">⏳ Reportó un pago que la mesa está confirmando.</p>' : "");
    return h;
  }

  window.Edificio = { montar: montar, detalleHTML: detalleHTML, nomMes: nomMes, antes: antes };
})();
