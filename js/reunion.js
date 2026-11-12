/* Las Misiones · piezas compartidas de reunion.html y mesa.html:
   fechas, «agregar al calendario», compartir por WhatsApp, barras de votos y la presentación
   en pantalla completa que se arma sola con el orden del día (sin hacer láminas a mano). */
(function () {
  "use strict";
  const URL_ = "https://script.google.com/macros/s/AKfycbx0qO7rHUmBqUJOuwjBkYIu4O8_FrWlC8f_DyLj3DrhN1h5ApHpdfKVmUgx_aVH3aJ-/exec";
  const SITIO = location.protocol === "file:" ? "" : location.href.replace(/[?#].*$/, "").replace(/\/[^/]*$/, "");
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLORES = ["var(--accent)", "#c08a3e", "#6b7a8f", "#2e8b57", "#9b4dca", "#c0392b"];

  const R = window.Reunion = { URL: URL_, SITIO, esc, COLORES };

  R.cargar = () => fetch(URL_ + "?accion=reunion&t=" + Date.now(), { cache: "no-store" }).then(r => r.json());
  R.post = (d) => fetch(URL_, { method: "POST", body: JSON.stringify(d), headers: { "Content-Type": "text/plain;charset=utf-8" } }).then(r => r.json());

  R.fecha = iso => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()]; };
  R.fechaCorta = iso => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : d.getDate() + " " + MESES[d.getMonth()].slice(0, 3) + " " + d.getFullYear(); };
  R.hora = h => { const m = String(h || "").match(/^(\d{1,2}):(\d{2})/); if (!m) return String(h || ""); const n = +m[1]; return (n % 12 || 12) + (m[2] !== "00" ? ":" + m[2] : "") + (n < 12 ? "\u00a0a.\u00a0m." : "\u00a0p.\u00a0m."); };
  R.cuando = r => {
    if (r.estado === "En curso") return { t: "🔴 En vivo", c: "vivo" };
    if (r.estado === "Cerrada") return { t: "✓ Terminó", c: "fin" };
    const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    const n = Math.round((new Date(r.fecha + "T12:00:00") - hoy) / 864e5);
    return n < 0 ? { t: "Ya pasó la fecha", c: "fin" } : n === 0 ? { t: "Hoy", c: "pronto" } : n === 1 ? { t: "Mañana", c: "pronto" } : { t: "En " + n + " días", c: "" };
  };
  R.cuantos = (votos, id) => { const v = (votos || {})[id]; return v ? Object.keys(v.deptos || {}).length : 0; };

  /* .ics para «Agregar a mi calendario» (funciona en iPhone, Android y Outlook). */
  R.ics = r => {
    const m = String(r.hora || "19:00").match(/(\d{1,2}):(\d{2})/) || [0, "19", "00"];
    const ini = r.fecha.replace(/-/g, "") + "T" + String(m[1]).padStart(2, "0") + m[2] + "00";
    const finH = String(Math.min(23, +m[1] + 2)).padStart(2, "0");
    const e = s => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const orden = (r.temas || []).map((t, i) => (i + 1) + ". " + t.titulo).join("\n");
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Las Misiones//Reunion//ES", "BEGIN:VEVENT", "UID:" + r.id + "@lasmisiones",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART;TZID=America/Mexico_City:" + ini,
      "DTEND;TZID=America/Mexico_City:" + r.fecha.replace(/-/g, "") + "T" + finH + m[2] + "00", "SUMMARY:" + e(r.titulo + " · Las Misiones"),
      "LOCATION:" + e(r.enlace || r.lugar || "Las Misiones"), "DESCRIPTION:" + e("Orden del día:\n" + orden + "\n\n" + SITIO + "/reunion.html"),
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Reunión en una hora", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = "reunion-misiones-" + r.fecha + ".ics";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  R.textoWa = r => "📣 *" + r.titulo + "* · Las Misiones\n🗓️ " + R.fecha(r.fecha).replace(/^./, c => c.toUpperCase()) + (r.hora ? " · " + R.hora(r.hora) : "") +
    (r.lugar ? "\n📍 " + r.lugar : "") + (r.enlace ? "\n🎥 " + r.enlace : "") + "\n\n*Orden del día*\n" +
    (r.temas || []).map((t, i) => (i + 1) + ". " + t.titulo + (t.tipo === "vota" ? " (se vota)" : "")).join("\n") + "\n\nTodo aquí 👉 " + SITIO + "/reunion.html";
  R.wa = r => "https://wa.me/?text=" + encodeURIComponent(R.textoWa(r));

  /* Barras de resultados de un tema que se vota. */
  R.barras = (t, v, opts) => {
    v = v || { conteo: {}, deptos: {} }; opts = opts || {};
    const total = Object.keys(v.deptos || {}).length, max = Math.max(1, ...t.opciones.map(o => v.conteo[o] || 0));
    const gana = total ? t.opciones.filter(o => (v.conteo[o] || 0) === max) : [];
    return '<div class="rv-barras">' + t.opciones.map((o, i) => { const n = v.conteo[o] || 0;
      const deps = opts.deptos ? Object.keys(v.deptos || {}).filter(d => v.deptos[d] === o).sort((a, b) => a - b) : [];
      return '<div class="rv-b' + (gana.length === 1 && gana[0] === o ? " gana" : "") + '"><div class="rv-bh"><b>' + esc(o) + "</b><span>" + n + (n === 1 ? " voto" : " votos") + '</span></div><div class="rv-bt"><i style="width:' +
        (total ? Math.round(n / total * 100) : 0) + "%;background:" + COLORES[i % COLORES.length] + '"></i></div>' + (deps.length ? '<small class="rv-bd">' + deps.map(d => "Depto " + d).join(" · ") + "</small>" : "") + "</div>"; }).join("") +
      '<p class="rv-bn">' + total + " de " + (opts.unidades || 16) + " deptos votaron</p></div>";
  };

  /* ---------------------------- presentación en pantalla completa ---------------------------- */
  const css = document.createElement("style");
  css.textContent = `
.rv-barras{display:grid;gap:.7rem}.rv-bh{display:flex;justify-content:space-between;gap:.6rem;font-size:1rem}.rv-bh span{color:var(--ink-2);font-variant-numeric:tabular-nums}
.rv-bt{height:14px;border-radius:999px;background:var(--grid);overflow:hidden;margin-top:.25rem}.rv-bt i{display:block;height:100%;border-radius:999px;transition:width .6s ease}
.rv-b.gana .rv-bh b::after{content:" ✓";color:var(--good-text)}.rv-bd{display:block;color:var(--muted);font-size:.8rem;margin-top:.2rem}.rv-bn{margin:.2rem 0 0;color:var(--muted);font-size:.85rem}
.pz{position:fixed;inset:0;z-index:1000;background:#0c1722;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0b0b0b;touch-action:pan-y}
.pz-l{position:relative;width:min(96vw,calc((100vh - 70px)*16/9));aspect-ratio:16/9;background:#f8f7f3;border-radius:min(1.6vw,18px);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);font-size:min(2.2vw,calc((100vh - 70px)*16/9*.022));display:flex;flex-direction:column;padding:5.5% 7%;box-sizing:border-box}
.pz-l h1{font-size:3.6em;line-height:1.05;margin:0}.pz-l h2{font-size:2.5em;line-height:1.1;margin:0 0 .6em}.pz-l p,.pz-l li{font-size:1.35em;line-height:1.45;margin:.25em 0}
.pz-l .k{font-size:1em;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#1d3f63;margin:0 0 .8em}
.pz-l.port{background:linear-gradient(140deg,#1d3f63 0%,#12293f 100%);color:#fff;justify-content:center}.pz-l.port .k{color:#c3d9ee}.pz-l.port .f{font-size:1.8em;margin-top:.9em;font-weight:700}.pz-l.port .lu{font-size:1.3em;opacity:.85;margin-top:.3em}
.pz-l.port .marca{position:absolute;right:6%;bottom:7%;width:22%;opacity:.9}
.pz-ord{list-style:none;padding:0;margin:0;display:grid;gap:.55em;counter-reset:o}.pz-ord li{display:flex;align-items:center;gap:.8em;counter-increment:o;font-size:1.55em;font-weight:700}
.pz-ord li::before{content:counter(o);flex:0 0 1.9em;height:1.9em;border-radius:50%;background:#1d3f63;color:#fff;display:grid;place-items:center;font-size:.8em}
.pz-ord li small{font-size:.6em;font-weight:800;padding:.2em .7em;border-radius:999px;background:#fff3cd;color:#7a5a00;text-transform:uppercase;letter-spacing:.06em}
.pz-n{display:inline-grid;place-items:center;width:2.4em;height:2.4em;border-radius:50%;background:#1d3f63;color:#fff;font-weight:900;font-size:1.3em;margin-bottom:.6em}
.pz-tg{display:inline-block;font-size:1em;font-weight:800;padding:.3em .9em;border-radius:999px;background:#e8eef5;color:#1d3f63;margin:0 0 .9em 1em;vertical-align:top;text-transform:uppercase;letter-spacing:.06em;transform:translateY(.55em)}.pz-l.solo{justify-content:center}.pz-l.solo h2{font-size:3.2em}.pz-tg.v{background:#fff3cd;color:#7a5a00}
.pz-l ul{margin:0;padding-left:1.1em}.pz-l li::marker{color:#c08a3e}
.pz-l .pq{font-size:2.1em;font-weight:800;line-height:1.15;margin:0 0 .6em}
.pz-l .rv-barras{gap:.55em}.pz-l .rv-bh{font-size:1.4em}.pz-l .rv-bt{height:1em;margin-top:.15em}.pz-l .rv-bn{font-size:1em}.pz-l .rv-bd{font-size:.85em;margin-top:.1em}.pz-l .rv-b.mucho .rv-bd{display:none}
.pz-l .vivo{position:absolute;top:5%;right:6%;font-weight:800;font-size:1em;color:#b3261e}.pz-l .vivo::before{content:"";display:inline-block;width:.7em;height:.7em;border-radius:50%;background:#b3261e;margin-right:.4em;animation:pzp 1.2s infinite}
@keyframes pzp{50%{opacity:.25}}
.pz-q{margin-top:auto;font-size:1.1em;color:#52514e;display:flex;gap:1.4em;align-items:center}.pz-q b{color:#0b0b0b}.pz-q i{flex:1;height:.55em;border-radius:999px;background:#e1e0d9;overflow:hidden;max-width:40%}.pz-q i u{display:block;height:100%;background:#2e8b57}
.pz-ac{display:grid;gap:.6em}.pz-ac div{border-left:.35em solid #2e8b57;padding:.2em 0 .2em .8em}.pz-ac b{font-size:1.35em;display:block}.pz-ac small{font-size:1em;color:#52514e}
.pz-c{display:flex;gap:10px;align-items:center;margin-top:12px;color:#fff;font:600 15px system-ui,sans-serif}.pz-c button{font:inherit;font-size:20px;min-width:52px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.pz-c span{min-width:70px;text-align:center}.pz-c .x{font-size:16px;padding:0 14px}
@media (prefers-color-scheme:dark){.pz-l{background:#f8f7f3;color:#0b0b0b}}`;
  document.head.appendChild(css);

  R.laminas = (r, extra) => {
    extra = extra || {};
    const temas = r.temas || [], L = [];
    L.push('<div class="pz-l port"><p class="k">' + esc(r.tipo === "Asamblea" ? "Asamblea de propietarios" : "Reunión de vecinos") + "</p><h1>" + esc(r.titulo) + '</h1><p class="f">' +
      esc(R.fecha(r.fecha).replace(/^./, c => c.toUpperCase())) + (r.hora ? " · " + esc(R.hora(r.hora)) : "") + "</p>" + (r.lugar ? '<p class="lu">📍 ' + esc(r.lugar) + "</p>" : "") +
      '<img class="marca" src="assets/logo-dark.svg" alt=""></div>');
    const quorum = () => { const a = (r.asistencia || []).length, q = extra.quorum || 9, u = extra.unidades || 16;
      return r.estado === "En curso" || a ? '<div class="pz-q"><span>Presentes <b>' + a + " de " + u + '</b></span><i><u style="width:' + Math.round(a / u * 100) + '%"></u></i><span>' + (a >= q ? "✅ Hay quórum" : "Quórum: " + q) + "</span></div>" : ""; };
    L.push('<div class="pz-l"><p class="k">Orden del día</p><ol class="pz-ord">' + temas.map(t => "<li>" + esc(t.titulo) + (t.tipo === "vota" ? " <small>se vota</small>" : "") + "</li>").join("") + "</ol>" + quorum() + "</div>");
    temas.forEach((t, i) => {
      const lineas = String(t.texto || "").split(/\n+/).map(s => s.replace(/^[-•·*]\s*/, "").trim()).filter(Boolean);
      L.push('<div class="pz-l' + (lineas.length ? "" : " solo") + '"><div><span class="pz-n">' + (i + 1) + '</span><span class="pz-tg' + (t.tipo === "vota" ? ' v">Se vota' : '">Para informar') + "</span></div><h2>" + esc(t.titulo) + "</h2>" +
        (lineas.length ? "<ul>" + lineas.slice(0, 7).map(s => "<li>" + esc(s) + "</li>").join("") + "</ul>" : "") + "</div>");
      if (t.tipo === "vota") L.push('<div class="pz-l" data-voto="' + esc(t.id) + '">' + (r.estado === "En curso" ? '<span class="vivo">En vivo</span>' : "") + '<p class="k">Votación · tema ' + (i + 1) + '</p><p class="pq">' +
        esc(t.pregunta || t.titulo) + "</p>" + R.barras(t, (r.votos || {})[t.id], { unidades: extra.unidades, deptos: t.opciones.length <= 2 }) + "</div>");
    });
    const ac = temas.filter(t => t.acuerdo);
    L.push(ac.length ? '<div class="pz-l"><p class="k">Acuerdos</p><div class="pz-ac">' + ac.slice(0, 6).map(t => "<div><b>" + esc(t.acuerdo) + "</b><small>" + esc([t.responsable, t.compromiso].filter(Boolean).join(" · ")) + "</small></div>").join("") + "</div></div>"
      : '<div class="pz-l port"><p class="k">Gracias</p><h1>Los acuerdos y la minuta quedan en el sitio</h1><p class="f">' + esc((SITIO || "el sitio").replace(/^https?:\/\//, "")) + '/minutas.html</p><img class="marca" src="assets/logo-dark.svg" alt=""></div>');
    return L;
  };

  /* recargar: función opcional que devuelve una promesa con la reunión al día (votos en vivo). */
  R.presentar = (r, extra, recargar, desde) => {
    let L = R.laminas(r, extra), i = Math.max(0, Math.min(desde || 0, L.length - 1)), tm = null;
    const pz = document.createElement("div"); pz.className = "pz"; pz.setAttribute("role", "dialog"); pz.setAttribute("aria-label", "Presentación");
    pz.innerHTML = '<div id="pzS"></div><div class="pz-c"><button type="button" data-p="-1" aria-label="Anterior">◀</button><span id="pzN"></span><button type="button" data-p="1" aria-label="Siguiente">▶</button><button type="button" class="x" data-p="x">✕ Salir</button></div>';
    document.body.appendChild(pz); document.documentElement.style.overflow = "hidden";
    const pintar = () => { pz.querySelector("#pzS").innerHTML = L[i]; pz.querySelector("#pzN").textContent = (i + 1) + " / " + L.length; };
    const ir = n => { i = Math.max(0, Math.min(L.length - 1, i + n)); pintar(); };
    const salir = () => { clearInterval(tm); document.removeEventListener("keydown", tecla); pz.remove(); document.documentElement.style.overflow = ""; try { document.exitFullscreen && document.fullscreenElement && document.exitFullscreen(); } catch (e) {} };
    const tecla = e => { if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); ir(1); } else if (["ArrowLeft", "PageUp"].includes(e.key)) ir(-1); else if (e.key === "Escape") salir(); };
    document.addEventListener("keydown", tecla);
    pz.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) { b.dataset.p === "x" ? salir() : ir(+b.dataset.p); return; }
      if (e.target.closest(".pz-l")) ir(e.clientX > innerWidth / 3 ? 1 : -1); });
    let x0 = null; pz.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    pz.addEventListener("touchend", e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { e.preventDefault(); ir(dx < 0 ? 1 : -1); } x0 = null; });
    try { pz.requestFullscreen && pz.requestFullscreen().catch(() => {}); } catch (e) {}
    pintar();
    if (recargar && r.estado === "En curso") tm = setInterval(() => recargar().then(nr => { if (nr) { r = nr; L = R.laminas(r, extra); pintar(); } }).catch(() => {}), 6000);
    return salir;
  };
})();
