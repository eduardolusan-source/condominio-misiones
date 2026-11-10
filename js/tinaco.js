/* Tinaco del edificio · Las Misiones Residencial
   Dibujo SVG para lecturas.html (se va llenando con cada medidor) y agua.html (el recibo
   repartido). Sin dependencias.

   Tinaco.svg(o) → texto SVG
     o.total     cuánto cabe: m³ (lecturas) o $ del recibo (agua). Sin total no hay borde de lleno.
     o.capas     [{ n, v }] de abajo hacia arriba (n = depto, v = cantidad)
     o.comunes   en "llenado": el mínimo de áreas comunes reservado arriba; en "reparto": la capa verde de arriba
     o.modo      "llenado" (las lecturas pueden desbordarse) o "reparto" (lleno exacto)
     o.resaltar  depto que se pinta fuerte, con etiqueta
     o.etiquetaTu   texto de esa etiqueta (por defecto "Tu agua")
     o.nueva     depto recién guardado: le cae una gota y su capa crece
     o.subir     el agua sube al dibujarse
     o.numeros   número de depto dentro de las capas que caben
     o.fmt       formato de cantidades (por defecto "12 m³")
     o.titulo    texto sobre la tapa
   Tinaco.barra(o) → barrita para la parte de arriba de lecturas.html
     o.total, o.suma, o.comunes (mínimo), o.faltan */
(function () {
  const X0 = 70, X1 = 220, Y0 = 62, Y1 = 268, RT = 36, RB = 16, IN = 3;
  const YB = Y1 - IN, YT = Y0 + 12, HC = YB - YT, CX = (X0 + X1) / 2;
  let cuenta = 0;

  const r1 = v => Math.round(v * 10) / 10;
  const m3 = v => r1(v).toLocaleString("es-MX") + " m³";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function cuerpo(i) {
    const x0 = X0 + i, x1 = X1 - i, y0 = Y0 + i, y1 = Y1 - i, rt = RT - i, rb = RB - i;
    return "M" + x0 + "," + (y0 + rt) + " Q" + x0 + "," + y0 + " " + (x0 + rt) + "," + y0 + " L" + (x1 - rt) + "," + y0 +
      " Q" + x1 + "," + y0 + " " + x1 + "," + (y0 + rt) + " L" + x1 + "," + (y1 - rb) + " Q" + x1 + "," + y1 + " " + (x1 - rb) + "," + y1 +
      " L" + (x0 + rb) + "," + y1 + " Q" + x0 + "," + y1 + " " + x0 + "," + (y1 - rb) + " Z";
  }
  function ola(y, clase) {   // cresta de agua más ancha que el tinaco; se mueve de lado
    let d = "M" + (X0 - 48) + "," + (y + 7) + " L" + (X0 - 48) + "," + y;
    for (let x = X0 - 48; x < X1 + 48; x += 24) d += " q6,-3.2 12,0 t12,0";
    d += " L" + (X1 + 48) + "," + (y + 7) + " Z";
    return '<path class="tq-ola ' + clase + '" d="' + d + '"/>';
  }
  function estilos() {
    if (document.getElementById("tq-estilos")) return;
    const s = document.createElement("style");
    s.id = "tq-estilos";
    s.textContent = `
.tq { --tq-cuerpo:#ffffff; --tq-borde:#2f3a46; --tq-tapa:#2f3a46; --tq-sombra:rgba(20,30,40,.10);
  --tq-a1:#a9d6f7; --tq-a2:#86c2f0; --tq-tu:#1f6fc5; --tq-tu-txt:#ffffff; --tq-num:#24507a;
  --tq-com:#4fae6f; --tq-com1:#a9dfbb; --tq-com-txt:#2f7a49; --tq-ajuste:#e9a92a; --tq-desborde:#e8742a;
  --tq-txt:var(--ink,#111); --tq-txt2:var(--ink-2,#555); --tq-costilla:rgba(255,255,255,.55); --tq-costilla2:rgba(47,58,70,.10);
  display:block; width:100%; height:auto; overflow:visible; font-family:inherit; }
@media (prefers-color-scheme: dark) {
  .tq { --tq-cuerpo:#1a2027; --tq-borde:#b9c5d1; --tq-tapa:#8a99a8; --tq-sombra:rgba(0,0,0,.35);
    --tq-a1:#2f6ca5; --tq-a2:#255a8c; --tq-tu:#8cc4f4; --tq-tu-txt:#0b1d2e; --tq-num:#d6e9fa;
    --tq-com:#5cc485; --tq-com1:#2f6e48; --tq-com-txt:#8be0ad; --tq-ajuste:#e2a83c; --tq-desborde:#ff9a52;
    --tq-costilla:rgba(255,255,255,.18); --tq-costilla2:rgba(185,197,209,.12); } }
.tq .tq-c { fill:var(--tq-cuerpo); stroke:var(--tq-borde); stroke-width:3; }
.tq .tq-tapa { fill:var(--tq-tapa); }
.tq .tq-a1 { fill:var(--tq-a1); } .tq .tq-a2 { fill:var(--tq-a2); } .tq .tq-tu { fill:var(--tq-tu); }
.tq .tq-com { fill:var(--tq-com1); }
.tq .tq-banda { fill:var(--tq-com); opacity:.16; }
.tq .tq-raya { stroke:var(--tq-com); stroke-width:2; stroke-dasharray:6 5; }
.tq .tq-cost { stroke:var(--tq-costilla); stroke-width:2; fill:none; }
.tq .tq-cost2 { stroke:var(--tq-costilla2); stroke-width:6; fill:none; }
.tq .tq-num { fill:var(--tq-num); font-size:11px; font-weight:700; text-anchor:middle; }
.tq .tq-num.tu { fill:var(--tq-tu-txt); }
.tq .tq-t1 { fill:var(--tq-txt); font-size:13px; font-weight:700; }
.tq .tq-t2 { fill:var(--tq-txt2); font-size:12px; }
.tq .tq-tit { fill:var(--tq-txt); font-size:13px; font-weight:700; text-anchor:middle; }
.tq .tq-guia { stroke:var(--tq-txt2); stroke-width:1.2; fill:none; opacity:.7; }
.tq .tq-punto { fill:var(--tq-txt2); }
.tq .com .tq-t1, .tq .tq-banda-txt { fill:var(--tq-com-txt); }
.tq .tq-banda-txt { font-size:10.5px; font-weight:700; text-anchor:middle; letter-spacing:.04em; }
.tq .des .tq-t1, .tq .des .tq-t2 { fill:var(--tq-desborde); }
.tq .des .tq-guia { stroke:var(--tq-desborde); } .tq .des .tq-punto { fill:var(--tq-desborde); }
.tq .tu .tq-guia { stroke:var(--tq-tu); opacity:1; } .tq .tu .tq-punto { fill:var(--tq-tu); }
.tq .tq-chorro { stroke:var(--tq-desborde); stroke-width:8; stroke-linecap:round; fill:none; stroke-dasharray:16 9; animation:tq-corre .9s linear infinite; }
.tq .tq-charco { fill:var(--tq-desborde); opacity:.35; }
.tq .tq-borde-des { stroke:var(--tq-desborde); stroke-width:3; fill:none; }
.tq .tq-ola { animation:tq-ola 3.2s linear infinite; }
.tq .tq-ola.o-a1 { fill:var(--tq-a1); } .tq .tq-ola.o-a2 { fill:var(--tq-a2); } .tq .tq-ola.o-tu { fill:var(--tq-tu); }
.tq .tq-ola.o-com { fill:var(--tq-com1); } .tq .tq-ola.o-des { fill:var(--tq-desborde); opacity:.85; }
.tq .tq-espuma { fill:none; stroke:rgba(255,255,255,.6); stroke-width:1.4; animation:tq-ola 3.2s linear infinite; }
.tq .tq-sube { animation:tq-sube 1.5s cubic-bezier(.22,.9,.3,1) both; }
.tq .tq-crece { transform-box:fill-box; transform-origin:50% 100%; animation:tq-crece .55s .5s cubic-bezier(.2,.9,.3,1.2) both; }
.tq .tq-gota { fill:var(--tq-tu); animation:tq-cae .7s cubic-bezier(.55,0,1,.45) both; }
.tq .tq-onda { fill:none; stroke:var(--tq-tu); stroke-width:2; transform-box:fill-box; transform-origin:center; animation:tq-onda .8s .55s ease-out both; }
@keyframes tq-ola { from { transform:translateX(0) } to { transform:translateX(-24px) } }
@keyframes tq-sube { from { transform:translateY(${HC}px) } to { transform:none } }
@keyframes tq-crece { from { transform:scaleY(0) } to { transform:scaleY(1) } }
@keyframes tq-cae { 0% { transform:translateY(0); opacity:0 } 12% { opacity:1 } 85% { transform:translateY(var(--tq-cae)); opacity:1 } 100% { transform:translateY(var(--tq-cae)); opacity:0 } }
@keyframes tq-onda { 0% { transform:scale(.2); opacity:.9 } 100% { transform:scale(1.6); opacity:0 } }
@keyframes tq-corre { to { stroke-dashoffset:-50 } }
@media (prefers-reduced-motion: reduce) { .tq .tq-ola, .tq .tq-espuma, .tq .tq-sube, .tq .tq-crece, .tq .tq-chorro, .tq .tq-onda { animation:none } .tq .tq-gota { display:none } }
.tqb { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:.55rem; font-size:.9rem; font-weight:700; color:var(--ink,#111); }
.tqb-pista { position:relative; height:14px; border-radius:999px; background:color-mix(in srgb, var(--baseline,#c3c2b7) 45%, transparent); overflow:hidden; }
.tqb-pista i { position:absolute; top:0; bottom:0; display:block; }
.tqb-agua { left:0; background:linear-gradient(90deg,#86c2f0,#1f6fc5); border-radius:999px; transition:width .6s cubic-bezier(.22,.9,.3,1); }
.tqb-com { background:repeating-linear-gradient(135deg, rgba(79,174,111,.55) 0 4px, rgba(79,174,111,.2) 4px 8px); }
.tqb.des .tqb-agua { background:linear-gradient(90deg,#f3b06b,#e8742a); }
.tqb.des .tqb-pista { box-shadow:0 0 0 2px #e8742a; }
.tqb-n { font-variant-numeric:tabular-nums; white-space:nowrap; }
.tqb-n small { font-weight:600; color:var(--ink-2,#555); }
.tqb-n .des { color:#e8742a; }
`;
    document.head.appendChild(s);
  }

  function svg(o) {
    estilos();
    const id = "tq" + (++cuenta);
    const llenado = o.modo !== "reparto";
    const fmt = o.fmt || m3;
    const total = o.total > 0 ? o.total : 0;
    const com = Math.max(0, Number(o.comunes) || 0);
    const capas = (o.capas || []).filter(c => Number(c.v) > 0);
    const suma = capas.reduce((a, c) => a + Number(c.v), 0);
    const escala = total || Math.max(suma + (llenado ? 0 : com), 1);
    const k = HC / escala;
    const p = [];
    const dentro = [];        // lo que va recortado por el tinaco
    const etiquetas = [];     // globos a la derecha: { y, t1, t2, clase }
    let y = YB, yNueva = null;
    capas.forEach((c, i) => {
      let h = c.v * k;
      const tope = llenado && total ? Math.max(y - YT, 0) : h;   // lo que ya no cabe se desborda
      const hv = Math.min(h, tope);
      if (hv <= 0) return;
      const tu = o.resaltar && c.n === o.resaltar;
      const clase = tu ? "tq-tu" : (i % 2 ? "tq-a2" : "tq-a1");
      const nueva = o.nueva !== undefined && o.nueva !== null && c.n === o.nueva;
      dentro.push('<rect class="' + clase + (nueva ? " tq-crece" : "") + '" x="' + (X0 - 4) + '" y="' + (y - hv).toFixed(2) + '" width="' + (X1 - X0 + 8) + '" height="' + (hv + 0.6).toFixed(2) + '"/>');
      if (o.numeros && hv >= 12) dentro.push('<text class="tq-num' + (tu ? " tu" : "") + '" x="' + CX + '" y="' + (y - hv / 2 + 4).toFixed(1) + '">' + c.n + '</text>');
      if (tu) etiquetas.push({ y: y - hv / 2, t1: o.etiquetaTu || "Tu agua", t2: fmt(c.v), clase: "tu" });
      if (nueva) yNueva = y - hv;
      y -= hv;
    });
    if (o.resaltar && !capas.some(c => c.n === o.resaltar)) etiquetas.push({ y: YB - 4, t1: o.etiquetaTu || "Tu agua", t2: fmt(0), clase: "tu" });
    let claseOla = capas.length ? (o.resaltar && capas[capas.length - 1].n === o.resaltar ? "o-tu" : ((capas.length - 1) % 2 ? "o-a2" : "o-a1")) : "";
    if (!llenado && com > 0) {                                 // reparto: la capa verde de áreas comunes, arriba
      const h = com * k;
      dentro.push('<rect class="tq-com" x="' + (X0 - 4) + '" y="' + (y - h).toFixed(2) + '" width="' + (X1 - X0 + 8) + '" height="' + (h + 0.6).toFixed(2) + '"/>');
      etiquetas.push({ y: y - h / 2, t1: "Áreas comunes", t2: fmt(com), clase: "com" });
      y -= h; claseOla = "o-com";
    }
    const exceso = llenado && total ? suma - total : 0;
    if (exceso > 0.05) claseOla = "o-des";
    const yAgua = y;
    let fondo = "";
    if (llenado && total && com > 0) {                         // franja reservada para áreas comunes
      const yc = YT + com * k;
      fondo += '<rect class="tq-banda" x="' + (X0 - 4) + '" y="' + (YT - 20) + '" width="' + (X1 - X0 + 8) + '" height="' + (yc - YT + 20).toFixed(2) + '"/>';
      if (yc - YT >= 15 && yAgua > YT + 13) fondo += '<text class="tq-banda-txt" x="' + CX + '" y="' + ((YT + yc) / 2 + 6).toFixed(1) + '">ÁREAS COMUNES</text>';
      dentro.push('<line class="tq-raya" x1="' + X0 + '" y1="' + yc.toFixed(2) + '" x2="' + X1 + '" y2="' + yc.toFixed(2) + '"/>');
      if (yAgua < yc) dentro.push('<rect x="' + (X0 - 4) + '" y="' + Math.max(yAgua, YT - 20).toFixed(2) + '" width="' + (X1 - X0 + 8) + '" height="' + (yc - Math.max(yAgua, YT - 20)).toFixed(2) + '" fill="url(#' + id + '-r)"/>');
      etiquetas.push({ y: yc, t1: "Áreas comunes", t2: "mínimo " + fmt(com), clase: "com" });
    }
    if (claseOla && yAgua < YB - 1) {
      dentro.push(ola(yAgua, claseOla));
      dentro.push('<path class="tq-espuma" d="M' + (X0 - 48) + ',' + yAgua.toFixed(2) + Array.from({ length: Math.ceil((X1 - X0 + 96) / 24) }, () => " q6,-3.2 12,0 t12,0").join("") + '"/>');
    }
    if (exceso > 0.05) etiquetas.push({ y: YT - 22, t1: "Se pasa por", t2: fmt(exceso), clase: "des" });

    p.push('<svg class="tq" viewBox="0 0 340 300" role="img" aria-label="' + esc(o.aria || "Tinaco del edificio") + '">');
    p.push('<defs><clipPath id="' + id + '-c"><path d="' + cuerpo(IN) + '"/></clipPath>' +
      '<pattern id="' + id + '-r" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--tq-ajuste)" opacity=".25"/><rect width="4" height="8" style="fill:var(--tq-ajuste)" opacity=".75"/></pattern>' +
      '<linearGradient id="' + id + '-b" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".35" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>');
    if (o.titulo) p.push('<text class="tq-tit" x="' + CX + '" y="24">' + esc(o.titulo) + '</text>');
    p.push('<ellipse cx="' + CX + '" cy="' + (Y1 + 5) + '" rx="86" ry="6.5" style="fill:var(--tq-sombra)"/>');
    if (exceso > 0.05) {                                       // el agua se sale por el hombro izquierdo y cae al piso
      p.push('<ellipse class="tq-charco" cx="44" cy="' + (Y1 + 3) + '" rx="30" ry="6"/>');
      p.push('<path class="tq-chorro" d="M' + (X0 + 18) + ',' + (Y0 + 2) + ' C' + (X0 - 6) + ',' + (Y0 - 12) + ' ' + (X0 - 26) + ',' + (Y0 + 8) + ' ' + (X0 - 26) + ',' + (Y0 + 40) + ' L' + (X0 - 26) + ',' + (Y1 - 2) + '"/>');
    }
    p.push('<path class="tq-c" d="' + cuerpo(0) + '"/>');
    p.push('<g clip-path="url(#' + id + '-c)">' + fondo + '<g class="' + (o.subir ? "tq-sube" : "") + '">' + dentro.join("") + '</g>' +
      [112, 162, 212].map(yy => '<line class="tq-cost2" x1="' + X0 + '" y1="' + yy + '" x2="' + X1 + '" y2="' + yy + '"/><line class="tq-cost" x1="' + X0 + '" y1="' + (yy - 3) + '" x2="' + X1 + '" y2="' + (yy - 3) + '"/>').join("") +
      '<rect x="' + (X0 + 10) + '" y="' + Y0 + '" width="26" height="' + (Y1 - Y0) + '" fill="url(#' + id + '-b)"/></g>');
    p.push('<path d="' + cuerpo(0) + '" style="fill:none;stroke:var(--tq-borde);stroke-width:3"/>');
    if (exceso > 0.05) p.push('<path class="tq-borde-des" d="M' + (X0 + 4) + ',' + (Y0 + RT) + ' Q' + X0 + ',' + Y0 + ' ' + (X0 + RT) + ',' + Y0 + ' L' + (X1 - RT) + ',' + Y0 + ' Q' + X1 + ',' + Y0 + ' ' + (X1 - 4) + ',' + (Y0 + RT) + '"/>');
    p.push('<rect class="tq-tapa" x="' + (CX - 28) + '" y="' + (Y0 - 15) + '" width="56" height="17" rx="6"/><rect class="tq-tapa" x="' + (CX - 9) + '" y="' + (Y0 - 22) + '" width="18" height="9" rx="3"/>');
    if (yNueva !== null) {
      const caida = Math.max(yAgua - 12, 30);
      p.push('<g class="tq-gota" style="--tq-cae:' + caida.toFixed(0) + 'px"><path transform="translate(' + CX + ',4)" d="M0,-9 C5,-2 7,2 7,5 A7,7 0 1 1 -7,5 C-7,2 -5,-2 0,-9 Z"/></g>');
      p.push('<ellipse class="tq-onda" cx="' + CX + '" cy="' + yAgua.toFixed(1) + '" rx="34" ry="5"/>');
    }
    etiquetas.sort((a, b) => a.y - b.y);                       // que no se encimen
    let ult = -99;
    etiquetas.forEach(e => {
      const yl = Math.min(Math.max(e.y, ult + 34, 18), 282);
      ult = yl;
      p.push('<g class="' + e.clase + '"><circle class="tq-punto" cx="' + (X1 + 1) + '" cy="' + e.y.toFixed(1) + '" r="3"/>' +
        '<path class="tq-guia" d="M' + (X1 + 1) + ',' + e.y.toFixed(1) + ' L232,' + yl.toFixed(1) + ' L238,' + yl.toFixed(1) + '"/>' +
        '<text class="tq-t1" x="242" y="' + (yl - 2).toFixed(1) + '">' + esc(e.t1) + '</text>' +
        '<text class="tq-t2" x="242" y="' + (yl + 13).toFixed(1) + '">' + esc(e.t2) + '</text></g>');
    });
    p.push("</svg>");
    return p.join("");
  }

  function barra(o) {
    estilos();
    const total = o.total > 0 ? o.total : 0, suma = Math.max(0, o.suma || 0), com = Math.max(0, o.comunes || 0);
    const des = total && suma > total + 0.05;
    const ancho = total ? Math.min(suma / total, 1) * 100 : 0;
    const comAncho = total ? Math.min(com / total, 1) * 100 : 0;
    const txt = total ? r1(suma) + '<small> / ' + r1(total) + ' m³</small>' + (des ? ' <span class="des">+' + r1(suma - total) + '</span>' : "")
      : r1(suma) + '<small> m³</small>';
    return '<div class="tqb' + (des ? " des" : "") + '"><span>💧 Tinaco</span><span class="tqb-pista">' +
      (total ? '<i class="tqb-com" style="left:' + (100 - comAncho).toFixed(1) + '%;width:' + comAncho.toFixed(1) + '%"></i>' : "") +
      '<i class="tqb-agua" style="width:' + ancho.toFixed(1) + '%"></i></span><span class="tqb-n">' + txt + '</span></div>';
  }

  window.Tinaco = { svg: svg, barra: barra, m3: m3 };
})();
