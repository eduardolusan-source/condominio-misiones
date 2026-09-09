/* Sección financiera — Las Misiones Residencial.

   Acceso abierto: no hay clave. Por eso aquí solo viven agregados. Nunca
   publiques en esta sección cifras por departamento ni nombres de condóminos.

   Misma lógica que los sitios de Lahia y La Valetta: una vista general del
   año (tarjetas, tabla mes por mes, gráficas) y un detalle por mes al que se
   entra tocando una fila de la tabla o con las pestañas. Aquí, además, se
   puede cambiar de año (2025 y 2026). */
(function () {
  "use strict";

  const D = MISIONES;
  const TODOS = D.meses;

  const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const mxn2 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
  const fmt = v => mxn.format(v);
  const fmt2 = v => mxn2.format(v);
  const kfmt = v => "$" + Math.round(v / 1000) + " mil";
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  const prom = arr => arr.length ? sum(arr) / arr.length : 0;

  const ingresosDe = m => m.ingresos.manto + m.ingresos.agua + m.ingresos.elevador + m.ingresos.medidores + m.ingresos.otros;
  const egresosDe = m => m.egresos.ordinarios + m.egresos.extraordinarios;
  const resultadoDe = m => ingresosDe(m) - egresosDe(m);
  const mesMin = m => m.nombre.toLowerCase();
  function setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }

  function statCard(k, v, d, clase) {
    return '<div class="stat' + (clase ? " " + clase : "") + '"><div class="k">' + k + '</div><div class="v">' + v +
      "</div>" + (d ? '<div class="d">' + d + "</div>" : "") + "</div>";
  }

  const tip = document.getElementById("vizTip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.style.display = "block";
    const w = tip.offsetWidth, sw = window.innerWidth;
    tip.style.left = Math.min(x + 14, sw - w - 10) + "px";
    tip.style.top = (y + 16) + "px";
  }
  function hideTip() { tip.style.display = "none"; }

  /* ---------- Estado: año y mes seleccionados ---------- */
  let anio = D.anios[D.anios.length - 1];
  let M = TODOS.filter(m => m.anio === anio);
  let mesIdx = M.length - 1;

  function rango() {
    if (!M.length) return String(anio);
    const a = M[0], b = M[M.length - 1];
    return (a.id === b.id ? mesMin(a) : mesMin(a) + " a " + mesMin(b)) + " de " + anio;
  }

  function renderAnios() {
    const box = document.getElementById("anios");
    box.innerHTML = "";
    D.anios.forEach(a => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = a;
      b.className = a === anio ? "on" : "";
      b.addEventListener("click", () => {
        if (a === anio) return;
        anio = a; M = TODOS.filter(m => m.anio === anio); mesIdx = M.length - 1;
        renderAnio();
        if (!secDetalle.hidden) { renderChips(); renderMes(); }
      });
      box.appendChild(b);
    });
  }

  /* Suma de los conceptos ordinarios que empiezan con un prefijo ("Agua"). */
  function sumConcepto(m, prefijo) {
    return sum(m.detalle.ordinarios.filter(r => r[0].indexOf(prefijo) === 0).map(r => r[1]));
  }

  /* ---------- Vista general del año ---------- */
  function renderOverview() {
    const first = M[0], last = M[M.length - 1];
    const ingAcum = sum(M.map(ingresosDe)), egrAcum = sum(M.map(egresosDe));
    const resAcum = ingAcum - egrAcum;
    const ordProm = prom(M.map(m => m.egresos.ordinarios));
    const extraAcum = sum(M.map(m => m.egresos.extraordinarios));
    const diasReserva = ordProm > 0 ? Math.max(0, last.saldoFin) / (ordProm / 30) : 0;
    const reservaTxt = last.saldoFin <= 0 ? "Sin reserva" : diasReserva >= 60 ? (diasReserva / 30).toFixed(1) + " meses" : Math.round(diasReserva) + " días";
    const cobranzaProm = prom(M.map(m => m.cobranza.pct));
    const aguaIn = sum(M.map(m => m.ingresos.agua)), aguaOut = sum(M.map(m => sumConcepto(m, "Agua")));
    const positivos = M.filter(m => resultadoDe(m) >= 0);
    const porUnidad = ordProm / D.unidades;
    const brecha = D.cuota - porUnidad;

    document.getElementById("overviewCards").innerHTML =
      statCard("Saldo en caja", fmt2(last.saldoFin), "al cierre de " + esc(mesMin(last)) + " · el año inició en " + fmt2(first.saldoIni)) +
      statCard("Resultado acumulado " + anio, '<span class="' + (resAcum >= 0 ? "pos" : "neg") + '">' + fmt2(resAcum) + "</span>", "ingresos " + fmt(ingAcum) + " − egresos " + fmt(egrAcum)) +
      statCard("Reserva operativa", '<span class="' + (diasReserva < 30 ? "neg" : "") + '">' + reservaTxt + "</span>", "lo que el saldo cubre del gasto ordinario mensual promedio (" + fmt(ordProm) + ")") +
      statCard("Cobranza " + anio, cobranzaProm.toFixed(1) + "%", "de las cuotas de mantenimiento, por mes facturado · " + M.length + " meses") +
      statCard("Gasto extraordinario", fmt(extraAcum), pct(extraAcum, egrAcum) + "% de los egresos del año · reparaciones, elevador, jardinería") +
      statCard("El agua", pct(aguaIn, aguaOut) + "%", "del recibo del condominio se cubre con lo cobrado: " + fmt(aguaIn) + " de " + fmt(aguaOut)) +
      statCard("Meses con resultado positivo", positivos.length + ' <span style="font-size:0.9rem; font-weight:400; color:var(--muted)">de ' + M.length + "</span>", positivos.length ? positivos.map(m => m.corto).join(", ") : "ninguno") +
      statCard("Costo de operar por unidad", fmt(porUnidad), "al mes, frente a la cuota de " + fmt(D.cuota) + ": " + (brecha >= 0 ? "sobran " + fmt(brecha) : "faltan " + fmt(-brecha)) + " para extraordinarios y fondo");
  }

  function renderAnual() {
    const t = document.getElementById("tAnual");
    let rows = "<thead><tr><th>Mes</th><th class='num'>Ingresos</th><th class='num'>Egresos</th><th class='num'>de ellos, extraordinarios</th><th class='num'>Resultado</th><th class='num'>Saldo al cierre</th><th class='num'>Cobranza</th><th></th></tr></thead><tbody>";
    M.forEach((m, i) => {
      const res = resultadoDe(m);
      rows += "<tr class='click' data-i='" + i + "'><td style='font-weight:600; color:var(--ink)'>" + esc(m.nombre) + "</td>" +
        "<td class='num'>" + fmt(ingresosDe(m)) + "</td><td class='num'>" + fmt(egresosDe(m)) + "</td>" +
        "<td class='num'>" + (m.egresos.extraordinarios ? fmt(m.egresos.extraordinarios) : "—") + "</td>" +
        "<td class='num' style='color:var(--" + (res >= 0 ? "good" : "bad") + "-text); font-weight:600'>" + fmt(res) + "</td>" +
        "<td class='num'>" + fmt(m.saldoFin) + "</td><td class='num'>" + Number(m.cobranza.pct).toFixed(0) + "%</td>" +
        "<td class='go'><span class='btn-mini'>Ver mes ›</span></td></tr>";
    });
    const ing = sum(M.map(ingresosDe)), egr = sum(M.map(egresosDe)), ext = sum(M.map(m => m.egresos.extraordinarios));
    rows += "<tr class='total'><td>Acumulado " + anio + "</td><td class='num'>" + fmt(ing) + "</td><td class='num'>" + fmt(egr) + "</td><td class='num'>" + fmt(ext) + "</td><td class='num'>" + fmt(ing - egr) + "</td><td class='num'></td><td class='num'></td><td></td></tr>";
    t.innerHTML = rows + "</tbody>";
    t.querySelectorAll("tr.click").forEach(tr => tr.addEventListener("click", () => abrirMes(+tr.dataset.i)));
  }

  /* ---------- Gráficas ---------- */
  function techo(v) {
    if (v <= 0) return 1000;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / (p / 2)) * (p / 2);
  }

  function chartBars() {
    const box = document.getElementById("chartBars");
    const W = 760, H = 300, L = 60, R = 8, T = 14, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const maxV = techo(Math.max.apply(null, M.map(m => Math.max(ingresosDe(m), egresosDe(m)))));
    const paso = maxV / 4;
    const y = v => T + ph - (v / maxV) * ph;
    let g = "";
    for (let t = 0; t <= maxV + 0.5; t += paso) {
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
      hits += '<rect data-i="' + i + '" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + ph + '" fill="transparent" style="cursor:pointer"/>';
    });
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Ingresos y egresos por mes">' + g +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--baseline)" stroke-width="1.5"/>' +
      bars + hits + "</svg>";
    box.querySelectorAll("rect[data-i]").forEach(rect => {
      rect.addEventListener("mousemove", e => {
        const m = M[+rect.dataset.i];
        showTip("<b>" + m.nombre + " " + anio + "</b><br>Ingresos: <b>" + fmt(ingresosDe(m)) + "</b><br>Egresos: <b>" +
          fmt(egresosDe(m)) + "</b><br>Resultado: <b>" + fmt(resultadoDe(m)) + "</b>", e.clientX, e.clientY);
      });
      rect.addEventListener("mouseleave", hideTip);
      rect.addEventListener("click", () => { hideTip(); abrirMes(+rect.dataset.i); });
    });
  }

  function chartLine() {
    const box = document.getElementById("chartLine");
    if (M.length < 2) {
      box.innerHTML = '<div class="pending-box"><span class="big">📈</span>La evolución del saldo se dibuja a partir del segundo mes publicado.</div>';
      return;
    }
    const W = 760, H = 260, L = 62, R = 66, T = 14, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const vals = M.map(m => m.saldoFin).concat([M[0].saldoIni]);
    const maxV = techo(Math.max(0, Math.max.apply(null, vals)));
    const minVal = Math.min.apply(null, vals);
    const minV = minVal < 0 ? -techo(-minVal) : 0;
    const rangoV = (maxV - minV) || 1;
    const paso = rangoV / 4;
    const y = v => T + (maxV - v) / rangoV * ph;
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
      hits += '<circle data-i="' + i + '" cx="' + px + '" cy="' + py + '" r="14" fill="transparent" style="cursor:pointer"/>';
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
        showTip("<b>" + m.nombre + " " + anio + "</b><br>Saldo al cierre: <b>" + fmt2(m.saldoFin) + "</b>", e.clientX, e.clientY);
      });
      c.addEventListener("mouseleave", hideTip);
      c.addEventListener("click", () => { hideTip(); abrirMes(+c.dataset.i); });
    });
  }

  /* Composición del gasto ordinario: promedio mensual por concepto en el año. */
  function chartFijos() {
    const acum = {};
    M.forEach(m => m.detalle.ordinarios.forEach(([c, v]) => { acum[c] = (acum[c] || 0) + v; }));
    const items = Object.keys(acum).map(c => [c, acum[c] / M.length]).sort((a, b) => b[1] - a[1]);
    const total = sum(items.map(i => i[1]));
    const W = 560, rowH = 30, T = 6, L = 200, R = 84;
    const H = T + items.length * rowH + 26;
    const pw = W - L - R;
    const maxV = Math.max.apply(null, items.map(i => i[1]));
    let rows = "";
    items.forEach(([label, v], i) => {
      const yy = T + i * rowH + 6;
      const bw2 = Math.max(2, (v / maxV) * pw);
      rows += '<text x="' + (L - 10) + '" y="' + (yy + 12) + '" text-anchor="end" font-size="11.5" fill="var(--ink-2)">' + esc(label.replace(" (recibo del condominio)", "*")) + "</text>" +
        '<rect data-i="' + i + '" x="' + L + '" y="' + yy + '" width="' + bw2 + '" height="16" rx="4" fill="var(--series-1)"/>' +
        '<text x="' + (L + bw2 + 8) + '" y="' + (yy + 12.5) + '" font-size="11.5" font-weight="600" fill="var(--ink)">' + fmt(v) + "</text>";
    });
    const note = '<text x="' + L + '" y="' + (H - 6) + '" font-size="10.5" fill="var(--muted)">*recibo de agua del condominio · luz: recibo bimestral, promedio mensual</text>';
    const box = document.getElementById("chartFijos");
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Composición del gasto ordinario mensual">' + rows + note + "</svg>";
    box.querySelectorAll("rect[data-i]").forEach(r => {
      r.addEventListener("mousemove", e => {
        const it = items[+r.dataset.i];
        showTip("<b>" + esc(it[0]) + "</b><br>" + fmt(it[1]) + " al mes · " + Math.round(it[1] / total * 100) + "% del gasto ordinario", e.clientX, e.clientY);
      });
      r.addEventListener("mouseleave", hideTip);
    });
  }

  function renderAgua() {
    const aguaIn = sum(M.map(m => m.ingresos.agua));
    const aguaOut = sum(M.map(m => sumConcepto(m, "Agua")));
    document.getElementById("tAgua").innerHTML =
      "<tbody>" +
      "<tr><td>Cobrado a los condóminos por agua (" + rango() + ")</td><td class='num'>" + fmt2(aguaIn) + "</td></tr>" +
      "<tr><td>Pagado del recibo de agua del condominio</td><td class='num'>" + fmt2(aguaOut) + "</td></tr>" +
      "<tr><td>Diferencia absorbida por la cuota de mantenimiento</td><td class='num' style='color:var(--bad-text); font-weight:600'>" + fmt2(aguaIn - aguaOut) + "</td></tr>" +
      "<tr><td>Cobertura del recibo</td><td class='num'>" + pct(aguaIn, aguaOut) + "%</td></tr>" +
      "<tr><td>Recibo promedio mensual</td><td class='num'>" + fmt(aguaOut / M.length) + "</td></tr>" +
      "<tr><td>Cobro promedio por unidad al mes</td><td class='num'>" + fmt(aguaIn / M.length / D.unidades) + "</td></tr>" +
      "</tbody>";
  }

  /* ---------- Morosidad agregada (foto al corte) ---------- */
  function renderMorosidad() {
    const mo = D.morosidad;
    document.getElementById("morosidadCards").innerHTML =
      statCard("Unidades con algún adeudo", mo.unidadesConAdeudo + ' <span style="font-size:0.9rem; font-weight:400; color:var(--muted)">de ' + D.unidades + "</span>", "al " + esc(mo.fecha)) +
      statCard("Adeudo total", fmt(mo.total), "mantenimiento + agua + cuota del elevador") +
      statCard("Mantenimiento", fmt(mo.manto.monto), mo.manto.unidades + " unidad(es) · " + esc(mo.manto.nota)) +
      statCard("Agua", fmt(mo.agua.monto), mo.agua.unidades + " unidad(es) · " + esc(mo.agua.nota)) +
      statCard("Cuota del elevador", fmt(mo.elevador.monto), mo.elevador.unidades + " unidad(es) · " + esc(mo.elevador.nota));
    setText("morosidadFecha", "estados de cuenta del " + mo.fecha);
  }

  /* ---------- Métricas fijas ---------- */
  function renderFijas() {
    const ordProm = prom(M.map(m => m.egresos.ordinarios));
    const cobranzaProm = prom(M.map(m => m.cobranza.pct));
    const fondo = ordProm * D.fondoMeses;
    const last = M[M.length - 1];
    const conceptos = {};
    M.forEach(m => m.detalle.ordinarios.forEach(([c]) => { conceptos[c.replace(" (recibo del condominio)", "")] = 1; }));
    document.getElementById("fixedCards").innerHTML =
      statCard("Unidades", D.unidades, D.composicion) +
      statCard("Cuota de mantenimiento", fmt(D.cuota), "mensual por unidad · ingreso teórico " + fmt(D.cuota * D.unidades) + " al mes") +
      statCard("Gasto ordinario promedio " + anio, fmt(ordProm), Object.keys(conceptos).map(c => c.toLowerCase()).join(", ")) +
      statCard("Costo por unidad", fmt(ordProm / D.unidades), "lo que cuesta operar el condominio cada mes, dividido entre las " + D.unidades + " unidades") +
      statCard("Cobranza promedio " + anio, cobranzaProm.toFixed(1) + "%", "de las cuotas de mantenimiento, por mes facturado") +
      statCard("Fondo común revolvente", fmt(fondo), D.fondoMeses + " meses de gasto ordinario (art. 17) · el saldo de " + esc(mesMin(last)) + " cubre el " + pct(Math.max(0, last.saldoFin), fondo) + "%");
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

  function renderRevision() {
    const box = document.getElementById("revision");
    const n = D.revision.filter(r => r.tipo === "incongruencia").length;
    setText("revisionSub", n + " incongruencias y " + (D.revision.length - n) + " observaciones encontradas al cotejar las tablas contables de 2025 y 2026 con los estados de cuenta del " + D.fechaEstados + ". Se envían a la administración para su aclaración.");
    box.innerHTML = D.revision.map(r =>
      '<div class="issue"><div class="top"><span class="pill ' + r.tipo + '">' + (r.tipo === "incongruencia" ? "Incongruencia" : "Observación") +
      "</span><span class='t'>" + esc(r.titulo) + "</span></div><p>" + esc(r.detalle) + "</p></div>").join("");
  }

  /* ---------- Detalle de un mes ---------- */
  function renderChips() {
    const box = document.getElementById("chips");
    box.innerHTML = "";
    M.forEach((m, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = m.nombre;
      b.className = i === mesIdx ? "on" : "";
      b.addEventListener("click", () => { mesIdx = i; renderMes(); renderChips(); marcarHash(); });
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

  function renderMes() {
    const m = M[mesIdx];
    const prev = mesIdx > 0 ? M[mesIdx - 1] : null;
    const ing = ingresosDe(m), egr = egresosDe(m), res = resultadoDe(m);
    setText("tituloMes", "Detalle de " + mesMin(m) + " de " + anio);

    document.getElementById("statCards").innerHTML =
      '<div class="stat"><div class="k">Ingresos · ' + m.nombre + '</div><div class="v">' + fmt(ing) + "</div>" +
      deltaTxt(ing, prev && ingresosDe(prev)) + "</div>" +
      '<div class="stat"><div class="k">Egresos · ' + m.nombre + '</div><div class="v">' + fmt(egr) + "</div>" +
      deltaTxt(egr, prev && egresosDe(prev), true) + "</div>" +
      '<div class="stat"><div class="k">Resultado del mes</div><div class="v ' + (res >= 0 ? "pos" : "neg") + '">' + fmt2(res) + '</div><div class="d">ingresos menos egresos</div></div>' +
      '<div class="stat"><div class="k">Saldo al cierre</div><div class="v ' + (m.saldoFin >= 0 ? "pos" : "neg") + '">' + fmt2(m.saldoFin) + '</div><div class="d">inició el mes en ' + fmt2(m.saldoIni) + "</div></div>";

    let ingRows = "<tr><td>Cuotas de mantenimiento</td><td class='num'>" + fmt2(m.ingresos.manto) + "</td></tr>" +
      "<tr><td>Pagos de agua de los condóminos</td><td class='num'>" + fmt2(m.ingresos.agua) + "</td></tr>";
    if (m.ingresos.elevador) ingRows += "<tr><td>Cuota extraordinaria del elevador</td><td class='num'>" + fmt2(m.ingresos.elevador) + "</td></tr>";
    if (m.ingresos.medidores) ingRows += "<tr><td>Medidores individuales de agua</td><td class='num'>" + fmt2(m.ingresos.medidores) + "</td></tr>";
    if (m.ingresos.otros) ingRows += "<tr><td>Otros ingresos</td><td class='num'>" + fmt2(m.ingresos.otros) + "</td></tr>";
    document.getElementById("tIngresos").innerHTML =
      "<thead><tr><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>" + ingRows +
      "<tr class='total'><td>Total de ingresos</td><td class='num'>" + fmt2(ing) + "</td></tr></tbody>";

    document.getElementById("tIndicadores").innerHTML =
      "<tbody>" +
      "<tr><td>Unidades que pagaron la cuota del mes</td><td class='num'>" + m.cobranza.pagaron + " de " + D.unidades + "</td></tr>" +
      "<tr><td>Cobranza del mes facturado</td><td class='num'>" + m.cobranza.pct + "%</td></tr>" +
      "<tr><td>Ingreso teórico por cuotas</td><td class='num'>" + fmt2(D.cuota * D.unidades) + "</td></tr>" +
      "<tr><td>Gasto ordinario</td><td class='num'>" + fmt2(m.egresos.ordinarios) + "</td></tr>" +
      "<tr><td>Gasto extraordinario</td><td class='num'>" + fmt2(m.egresos.extraordinarios) + "</td></tr>" +
      "<tr><td>Agua: cobrado vs. recibo</td><td class='num'>" + fmt(m.ingresos.agua) + " / " + fmt(sumConcepto(m, "Agua")) + "</td></tr>" +
      "</tbody>";

    const secciones = [
      ["Gastos ordinarios", m.detalle.ordinarios, m.egresos.ordinarios],
      ["Gastos extraordinarios", m.detalle.extraordinarios, m.egresos.extraordinarios]
    ];
    let rows = "<thead><tr><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>";
    secciones.forEach(([titulo, items, subtotal]) => {
      rows += "<tr><td colspan='2' style='font-weight:700; color:var(--ink); padding-top:0.9rem'>" + titulo + "</td></tr>";
      if (!items.length) rows += "<tr><td colspan='2' class='pend'>Sin gastos de este tipo en el mes.</td></tr>";
      items.forEach(([desc, monto]) => {
        rows += "<tr><td>" + esc(desc) + "</td><td class='num'>" + fmt2(monto) + "</td></tr>";
      });
      rows += "<tr class='total'><td>Subtotal</td><td class='num'>" + fmt2(subtotal) + "</td></tr>";
    });
    rows += "<tr class='total'><td style='font-size:1.02em'>TOTAL DE EGRESOS</td><td class='num' style='font-size:1.02em'>" + fmt2(egr) + "</td></tr></tbody>";
    document.getElementById("tEgresos").innerHTML = rows;
    document.getElementById("egresosSub").textContent = m.nombre + " " + anio;
  }

  /* ---------- Navegación general ↔ detalle ---------- */
  const secResumen = document.getElementById("resumen");
  const secDetalle = document.getElementById("detalle");
  function marcarHash() { if (history.replaceState) history.replaceState(null, "", "#mes-" + M[mesIdx].id); }
  function abrirMes(i) {
    mesIdx = i;
    renderChips(); renderMes();
    secResumen.hidden = true; secDetalle.hidden = false;
    marcarHash();
    window.scrollTo(0, 0);
  }
  function volver(e) {
    if (e) e.preventDefault();
    secDetalle.hidden = true; secResumen.hidden = false;
    if (history.replaceState) history.replaceState(null, "", location.pathname);
    window.scrollTo(0, 0);
  }
  document.getElementById("volver").addEventListener("click", volver);
  document.getElementById("volver2").addEventListener("click", volver);

  /* ---------- Render ---------- */
  function renderAnio() {
    setText("tituloGeneral", "Rendición de cuentas " + anio);
    setText("rangoSub", "Vista general de " + rango() + ", con las cifras de la tabla contable de la administración · " + D.unidades + " unidades · cuota de " + fmt(D.cuota) + ".");
    setText("rangoFijas", "Datos estructurales del condominio (promedios de " + rango() + ").");
    renderAnios();
    renderOverview();
    renderAnual();
    chartBars();
    chartLine();
    renderAgua();
    chartFijos();
    renderFijas();
  }

  renderAnio();
  renderMorosidad();
  renderProyectos();
  renderRevision();

  const h = /^#mes-(\d{4})-(\d{2})$/.exec(location.hash);
  if (h) {
    const a = +h[1];
    if (D.anios.indexOf(a) >= 0 && a !== anio) { anio = a; M = TODOS.filter(m => m.anio === anio); renderAnio(); }
    const i = M.findIndex(m => m.id === h[1] + "-" + h[2]);
    if (i >= 0) abrirMes(i);
  }
})();
