/* Sección financiera — Las Misiones Residencial.

   Acceso abierto: no hay clave. Por eso aquí solo viven agregados. Nunca
   publiques en esta sección cifras por departamento ni nombres de condóminos.

   Si MISIONES.meses está vacío, cada bloque se pinta en estado "pendiente":
   se muestra la métrica que se va a publicar, con un guion en lugar del dato.
   En cuanto se agregue un mes en js/data.js, los mismos bloques se llenan
   solos con las cifras. */
(function () {
  "use strict";

  const D = MISIONES;
  const M = D.meses;
  const hayDatos = M.length > 0;

  const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const mxn2 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
  const fmt = v => mxn.format(v);
  const fmt2 = v => mxn2.format(v);
  const kfmt = v => "$" + Math.round(v / 1000) + " mil";
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const ingresosDe = m => m.ingresos.manto + m.ingresos.extraordinaria + m.ingresos.otros;
  const egresosDe = m => m.egresos.fijos + m.egresos.variables + m.egresos.obra;
  const resultadoDe = m => ingresosDe(m) - egresosDe(m);

  /* Guion largo: marca visualmente el dato que todavía no existe. */
  const NA = "—";

  const tip = document.getElementById("vizTip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.style.display = "block";
    const w = tip.offsetWidth, sw = window.innerWidth;
    tip.style.left = Math.min(x + 14, sw - w - 10) + "px";
    tip.style.top = (y + 16) + "px";
  }
  function hideTip() { tip.style.display = "none"; }

  function pendingBox(el, texto) {
    el.innerHTML = '<div class="pending-box"><span class="big">📊</span>' + texto + "</div>";
  }

  function statCard(k, v, d, clase) {
    return '<div class="stat' + (clase || "") + '"><div class="k">' + k + '</div><div class="v">' + v +
      "</div>" + (d ? '<div class="d">' + d + "</div>" : "") + "</div>";
  }

  /* ---------- Chips de mes ---------- */
  let mesIdx = M.length - 1;

  function renderChips() {
    const box = document.getElementById("chips");
    if (!hayDatos) {
      box.innerHTML = '<span style="font-size:0.9rem; color:var(--muted)">Aún no hay meses publicados. ' +
        'El primero será <strong>julio de 2026</strong>, en cuanto la administración entregue su hoja de cálculo.</span>';
      return;
    }
    box.innerHTML = "";
    M.forEach((m, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = m.nombre;
      b.className = i === mesIdx ? "on" : "";
      b.addEventListener("click", () => { mesIdx = i; renderMes(); renderChips(); });
      box.appendChild(b);
    });
  }

  function deltaTxt(actual, previo, menosEsMejor) {
    if (previo == null) return "";
    const d = actual - previo;
    const mejora = menosEsMejor ? d <= 0 : d >= 0;
    return '<div class="d"><span class="' + (mejora ? "pos" : "neg") + '" style="font-weight:600">' +
      (d >= 0 ? "▲" : "▼") + " " + fmt(Math.abs(d)) + "</span> vs. mes anterior</div>";
  }

  /* ---------- Datos del mes ---------- */
  function renderMesPendiente() {
    document.getElementById("statCards").innerHTML =
      statCard("Ingresos del mes", NA, "cuotas ordinarias + extraordinarias + otros ingresos", " pend") +
      statCard("Egresos del mes", NA, "gastos fijos + variables + obra", " pend") +
      statCard("Resultado del mes", NA, "ingresos menos egresos", " pend") +
      statCard("Saldo al cierre", NA, "saldo en caja al último día del mes", " pend");

    document.getElementById("tIngresos").innerHTML =
      "<thead><tr><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>" +
      "<tr><td>Cuotas de mantenimiento</td><td class='num pend'>" + NA + "</td></tr>" +
      "<tr><td>Cuota extraordinaria (elevador y acceso)</td><td class='num pend'>" + NA + "</td></tr>" +
      "<tr><td>Otros ingresos</td><td class='num pend'>" + NA + "</td></tr>" +
      "<tr class='total'><td>Total de ingresos</td><td class='num'>" + NA + "</td></tr></tbody>";

    document.getElementById("tIndicadores").innerHTML =
      "<tbody>" +
      "<tr><td>Unidades que pagaron mantenimiento</td><td class='num pend'>" + NA + " de " + D.unidades + "</td></tr>" +
      "<tr><td>Cobranza de mantenimiento</td><td class='num pend'>" + NA + "</td></tr>" +
      "<tr><td>Unidades al corriente en la cuota extraordinaria</td><td class='num pend'>" + NA + " de " + D.unidades + "</td></tr>" +
      "<tr><td>Recaudado de la cuota extraordinaria</td><td class='num pend'>" + NA + "</td></tr>" +
      "<tr><td>Falta por recaudar</td><td class='num pend'>" + NA + "</td></tr>" +
      "</tbody>";

    document.getElementById("tEgresos").innerHTML =
      "<thead><tr><th>Proveedor</th><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>" +
      ["Gastos fijos (ordinarios)", "Gastos variables", "Obra y proyectos"].map(t =>
        "<tr><td colspan='3' style='font-weight:700; color:var(--ink); padding-top:0.9rem'>" + t + "</td></tr>" +
        "<tr><td colspan='2' class='pend'>Desglose por proveedor pendiente de captura</td><td class='num pend'>" + NA + "</td></tr>"
      ).join("") +
      "<tr class='total'><td colspan='2'>TOTAL DE EGRESOS</td><td class='num'>" + NA + "</td></tr></tbody>";
    document.getElementById("egresosSub").textContent = "pendiente";

    document.getElementById("morosidadCards").innerHTML =
      statCard("Unidades con adeudo de mantenimiento", NA + ' <span style="font-size:0.9rem; font-weight:400; color:var(--muted)">de ' + D.unidades + "</span>", "", " pend") +
      statCard("Adeudo acumulado de mantenimiento", NA, "en el año en curso", " pend") +
      statCard("Adeudo de la cuota extraordinaria", NA, "unidades que no la han cubierto", " pend");
  }

  function renderMes() {
    if (!hayDatos) { renderMesPendiente(); return; }

    const m = M[mesIdx];
    const prev = mesIdx > 0 ? M[mesIdx - 1] : null;
    const ing = ingresosDe(m), egr = egresosDe(m), res = resultadoDe(m);

    document.getElementById("statCards").innerHTML =
      '<div class="stat"><div class="k">Ingresos · ' + m.nombre + '</div><div class="v">' + fmt(ing) + "</div>" +
      deltaTxt(ing, prev && ingresosDe(prev)) + "</div>" +
      '<div class="stat"><div class="k">Egresos · ' + m.nombre + '</div><div class="v">' + fmt(egr) + "</div>" +
      deltaTxt(egr, prev && egresosDe(prev), true) + "</div>" +
      '<div class="stat"><div class="k">Resultado del mes</div><div class="v ' + (res >= 0 ? "pos" : "neg") + '">' + fmt2(res) + '</div><div class="d">ingresos menos egresos</div></div>' +
      '<div class="stat"><div class="k">Saldo al cierre</div><div class="v ' + (m.saldoFin >= 0 ? "pos" : "neg") + '">' + fmt2(m.saldoFin) + '</div><div class="d">inició el mes en ' + fmt2(m.saldoIni) + "</div></div>";

    document.getElementById("tIngresos").innerHTML =
      "<thead><tr><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>" +
      "<tr><td>Cuotas de mantenimiento</td><td class='num'>" + fmt2(m.ingresos.manto) + "</td></tr>" +
      "<tr><td>Cuota extraordinaria (elevador y acceso)</td><td class='num'>" + fmt2(m.ingresos.extraordinaria) + "</td></tr>" +
      "<tr><td>Otros ingresos</td><td class='num'>" + fmt2(m.ingresos.otros) + "</td></tr>" +
      "<tr class='total'><td>Total de ingresos</td><td class='num'>" + fmt2(ing) + "</td></tr></tbody>";

    const mo = m.morosidad;
    document.getElementById("tIndicadores").innerHTML =
      "<tbody>" +
      "<tr><td>Unidades que pagaron mantenimiento</td><td class='num'>" + m.cobranza.pagaron + " de " + D.unidades + "</td></tr>" +
      "<tr><td>Cobranza de mantenimiento</td><td class='num'>" + m.cobranza.pct + "%</td></tr>" +
      "<tr><td>Unidades al corriente en la cuota extraordinaria</td><td class='num'>" + (D.unidades - mo.unidadesExtra) + " de " + D.unidades + "</td></tr>" +
      "<tr><td>Ingreso por cuota extraordinaria del mes</td><td class='num'>" + fmt2(m.ingresos.extraordinaria) + "</td></tr>" +
      "<tr><td>Adeudo pendiente de la cuota extraordinaria</td><td class='num'>" + fmt2(mo.adeudoExtra) + "</td></tr>" +
      "</tbody>";

    const secciones = [
      ["Gastos fijos (ordinarios)", m.detalle.fijos, m.egresos.fijos],
      ["Gastos variables", m.detalle.variables, m.egresos.variables],
      ["Obra y proyectos", m.detalle.obra, m.egresos.obra]
    ];
    let rows = "<thead><tr><th>Proveedor</th><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>";
    secciones.forEach(([titulo, items, subtotal]) => {
      rows += "<tr><td colspan='3' style='font-weight:700; color:var(--ink); padding-top:0.9rem'>" + titulo + "</td></tr>";
      if (!items || !items.length) {
        rows += "<tr><td colspan='3' class='pend'>Desglose por proveedor pendiente de captura.</td></tr>";
      } else {
        items.forEach(([prov, desc, monto]) => {
          rows += "<tr><td>" + esc(prov) + "</td><td>" + esc(desc) + "</td><td class='num'>" + fmt2(monto) + "</td></tr>";
        });
      }
      rows += "<tr class='total'><td colspan='2'>Subtotal</td><td class='num'>" + fmt2(subtotal) + "</td></tr>";
    });
    rows += "<tr class='total'><td colspan='2' style='font-size:1.02em'>TOTAL DE EGRESOS</td><td class='num' style='font-size:1.02em'>" + fmt2(egr) + "</td></tr></tbody>";
    document.getElementById("tEgresos").innerHTML = rows;
    document.getElementById("egresosSub").textContent = m.nombre + " " + m.id.slice(0, 4);

    document.getElementById("morosidadCards").innerHTML =
      statCard("Unidades con adeudo de mantenimiento", mo.unidadesManto + ' <span style="font-size:0.9rem; font-weight:400; color:var(--muted)">de ' + D.unidades + "</span>") +
      statCard("Adeudo acumulado de mantenimiento", fmt(mo.acumuladoManto), "en el año en curso") +
      statCard("Adeudo de la cuota extraordinaria", fmt(mo.adeudoExtra), mo.unidadesExtra + " unidad(es) pendiente(s)");
  }

  /* ---------- Gráfica: ingresos vs egresos ---------- */
  function techo(v) {
    if (v <= 0) return 1000;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / (p / 2)) * (p / 2);
  }

  function chartBars() {
    const box = document.getElementById("chartBars");
    if (!hayDatos) {
      pendingBox(box, "Aquí aparecerá la comparación de ingresos contra egresos, mes a mes, en cuanto se publique el primer mes.");
      return;
    }
    const W = 760, H = 300, L = 60, R = 8, T = 14, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const maxV = techo(Math.max.apply(null, M.map(m => Math.max(ingresosDe(m), egresosDe(m)))));
    const paso = maxV / 4;
    const y = v => T + ph - (v / maxV) * ph;
    let g = "";
    for (let t = 0; t <= maxV; t += paso) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--grid)" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + (t === 0 ? "0" : kfmt(t)) + "</text>";
    }
    const gw = pw / M.length, bw = Math.min(24, gw / 2 - 6), r = 4;
    let bars = "", hits = "";
    M.forEach((m, i) => {
      const cx = L + gw * i + gw / 2;
      const bar = (x, v, color) => {
        const yy = y(v), hh = T + ph - yy;
        if (hh < r) return "";
        return '<path d="M' + x + " " + (yy + r) + " q0 -" + r + " " + r + " -" + r + " h" + (bw - 2 * r) +
          " q" + r + " 0 " + r + " " + r + " v" + (hh - r) + " h-" + bw + ' z" fill="' + color + '"/>';
      };
      bars += bar(cx - bw - 1, ingresosDe(m), "var(--series-1)") + bar(cx + 1, egresosDe(m), "var(--series-2)");
      bars += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11.5" fill="var(--ink-2)">' + m.corto + "</text>";
      hits += '<rect data-i="' + i + '" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + ph + '" fill="transparent"/>';
    });
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Ingresos y egresos por mes">' + g +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--baseline)" stroke-width="1.5"/>' +
      bars + hits + "</svg>";
    box.querySelectorAll("rect[data-i]").forEach(rect => {
      rect.addEventListener("mousemove", e => {
        const m = M[+rect.dataset.i];
        showTip("<b>" + m.nombre + "</b><br>Ingresos: <b>" + fmt(ingresosDe(m)) + "</b><br>Egresos: <b>" +
          fmt(egresosDe(m)) + "</b><br>Resultado: <b>" + fmt(resultadoDe(m)) + "</b>", e.clientX, e.clientY);
      });
      rect.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---------- Gráfica: saldo al cierre ---------- */
  function chartLine() {
    const box = document.getElementById("chartLine");
    if (M.length < 2) {
      pendingBox(box, hayDatos
        ? "La evolución del saldo se dibuja a partir del segundo mes publicado."
        : "Aquí aparecerá la evolución del saldo en caja al cierre de cada mes.");
      return;
    }
    const W = 760, H = 260, L = 62, R = 60, T = 14, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const vals = M.map(m => m.saldoFin);
    const maxV = techo(Math.max(0, Math.max.apply(null, vals)));
    const minV = -techo(Math.max(0, -Math.min.apply(null, vals)));
    const rango = (maxV - minV) || 1;
    const paso = rango / 4;
    const y = v => T + (maxV - v) / rango * ph;
    const x = i => L + (pw / (M.length - 1)) * i;
    let g = "";
    for (let t = minV; t <= maxV + 0.5; t += paso) {
      const cero = Math.abs(t) < 0.5;
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="' +
        (cero ? "var(--baseline)" : "var(--grid)") + '" stroke-width="' + (cero ? 1.5 : 1) + '"/>' +
        '<text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' +
        (cero ? "0" : kfmt(t)) + "</text>";
    }
    let path = "", dots = "", hits = "", labels = "";
    M.forEach((m, i) => {
      const px = x(i), py = y(m.saldoFin);
      path += (i === 0 ? "M" : "L") + px + " " + py + " ";
      dots += '<circle cx="' + px + '" cy="' + py + '" r="4" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"/>';
      hits += '<circle data-i="' + i + '" cx="' + px + '" cy="' + py + '" r="14" fill="transparent"/>';
      labels += '<text x="' + px + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11.5" fill="var(--ink-2)">' + m.corto + "</text>";
    });
    const last = M[M.length - 1];
    const lastLbl = '<text x="' + (x(M.length - 1) + 10) + '" y="' + (y(last.saldoFin) + 4) +
      '" font-size="11.5" font-weight="700" fill="var(--ink)">' + fmt(last.saldoFin) + "</text>";
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Saldo al cierre de cada mes">' + g +
      '<path d="' + path + '" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round"/>' +
      dots + lastLbl + labels + hits + "</svg>";
    box.querySelectorAll("circle[data-i]").forEach(c => {
      c.addEventListener("mousemove", e => {
        const m = M[+c.dataset.i];
        showTip("<b>" + m.nombre + "</b><br>Saldo al cierre: <b>" + fmt2(m.saldoFin) + "</b>", e.clientX, e.clientY);
      });
      c.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---------- Métricas fijas ---------- */
  const prom = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

  function renderFijas() {
    const cuota = D.cuota ? fmt(D.cuota) : NA;
    const cuotaD = D.cuota
      ? "mensual por unidad · ingreso teórico " + fmt(D.cuota * D.unidades)
      : "la establece la asamblea en proporción al indiviso (art. 24, VII) · pendiente de confirmar";

    let opProm = NA, opPromD = "fijos + variables, promedio de los meses publicados", cobranzaProm = NA, porUnidad = NA;
    if (hayDatos) {
      const fijos = prom(M.map(m => m.egresos.fijos));
      const vars = prom(M.map(m => m.egresos.variables));
      opProm = fmt(fijos + vars);
      opPromD = "fijos " + fmt(fijos) + " + variables " + fmt(vars);
      cobranzaProm = prom(M.map(m => m.cobranza.pct)).toFixed(1) + "%";
      porUnidad = fmt((fijos + vars) / D.unidades);
    }

    document.getElementById("fixedCards").innerHTML =
      statCard("Unidades", D.unidades, D.composicion) +
      statCard("Cuota de mantenimiento", cuota, cuotaD, D.cuota ? "" : " pend") +
      statCard("Gasto operativo promedio", opProm, opPromD, hayDatos ? "" : " pend") +
      statCard("Costo por unidad", porUnidad, "lo que cuesta operar el condominio, dividido entre las 16 unidades", hayDatos ? "" : " pend") +
      statCard("Cobranza promedio", cobranzaProm, "de las cuotas de mantenimiento", hayDatos ? "" : " pend") +
      statCard("Fondo común revolvente", D.fondoMeses + " meses", "de gastos normales según el presupuesto aprobado (art. 17) · mora al CPP × 1.5");
  }

  function renderProyectos() {
    let rows = "<thead><tr><th>Proyecto</th><th>Estado</th><th>Financiamiento</th><th class='num'>Presupuesto</th></tr></thead><tbody>";
    D.proyectos.forEach(p => {
      rows += "<tr><td>" + esc(p.nombre) + "</td><td>" + esc(p.estado) + "</td><td>" + esc(p.financiamiento) +
        "</td><td class='num" + (p.presupuesto ? "" : " pend") + "'>" +
        (p.presupuesto ? fmt(p.presupuesto) : "por definir") + "</td></tr>";
    });
    document.getElementById("tProyectos").innerHTML = rows + "</tbody>";
  }

  /* ---------- Render ---------- */
  renderChips();
  renderMes();
  chartBars();
  chartLine();
  renderFijas();
  renderProyectos();
})();
