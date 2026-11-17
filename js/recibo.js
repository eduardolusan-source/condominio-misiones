/* Las Misiones · Recibo de pago en pantalla (lo usan mi-depto.html y agua.html; necesita ventana.js).
   Recibo.abrir(urlDelServicio, { depto, folio }) abre el recibo de un pago confirmado.
   Recibo.abrir(urlDelServicio, { depto, tipo: "agua" | "manto", mes: "AAAA-MM" }) abre el de un concepto pagado
   (el mes del agua es el del consumo). Si el servicio no lo tiene, llama a respaldo() o avisa.
   El botón «Descargar recibo (PDF)» pide el PDF con membrete al mismo servicio. */
(function () {
  "use strict";
  const css = document.createElement("style");
  css.textContent =
    ".rc-env{max-width:440px;margin:.2rem auto 0;filter:drop-shadow(0 8px 14px rgba(20,30,40,.14)) drop-shadow(0 2px 3px rgba(20,30,40,.08))}" +
    ".rc{--p:#fffdf7;--t:#26241f;--g:#6d685d;--l:#d9d2c0;position:relative;background:var(--p);color:var(--t);padding:1.6rem 1.2rem 1.5rem;" +
      "-webkit-mask:conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/14px 51% repeat-x,conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/14px 51% repeat-x;" +
      "mask:conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/14px 51% repeat-x,conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/14px 51% repeat-x}" +
    ".rc-m{font-family:ui-monospace,'SF Mono','Roboto Mono','Cascadia Mono',Menlo,Consolas,monospace}" +
    ".rc-cab{display:grid;grid-template-columns:auto 1fr auto;gap:.7rem;align-items:center}.rc-cab img{width:42px;height:42px}" +
    ".rc-org{font-size:.78rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;line-height:1.3}.rc-org span{display:block;font-weight:500;color:var(--g);letter-spacing:.05em}" +
    ".rc-dep{text-align:center;border:2px solid var(--t);border-radius:10px;padding:.2rem .6rem .3rem;line-height:1}.rc-dep small{display:block;font-size:.6rem;font-weight:800;letter-spacing:.14em;color:var(--g);margin-bottom:.15rem}.rc-dep b{font-size:1.65rem;font-weight:900}" +
    ".rc-tit{font-family:Georgia,'Times New Roman',serif;font-size:1.5rem;line-height:1.1;margin:1rem 0 .15rem;padding-right:6.6rem}.rc-num{color:var(--g);font-size:.86rem;padding-right:6.6rem}" +
    ".rc-sello{position:absolute;top:5.3rem;right:.8rem;transform:rotate(-9deg);border:3px solid currentColor;border-radius:10px;padding:.35rem .55rem .3rem;font-size:.84rem;font-weight:900;letter-spacing:.13em;line-height:1.05;text-align:center;opacity:.9;color:#1e7b34;box-shadow:inset 0 0 0 2px var(--p),inset 0 0 0 3px currentColor}" +
    ".rc-sello small{display:block;font-size:.62rem;letter-spacing:.06em;font-weight:700;margin-top:.15rem}" +
    ".rc-corte{border-top:2px dashed var(--l);margin:1.1rem -.3rem .5rem}.rc-corte.d{border-top:3px double var(--l);margin-top:.7rem}" +
    ".rc-lin{display:grid;grid-template-columns:1fr auto;gap:.7rem;align-items:start;padding:.45rem 0}.rc-lin b{display:block;font-size:1.02rem}.rc-lin small{display:block;color:var(--g);font-size:.86rem}" +
    ".rc-lin span:last-child{font-weight:800;font-size:1.08rem;font-variant-numeric:tabular-nums}" +
    ".rc-tot{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem}.rc-tot span{font-size:.85rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase}" +
    ".rc-tot strong{font-size:2.2rem;font-weight:900;letter-spacing:-.02em;color:var(--accent);font-variant-numeric:tabular-nums;line-height:1.05}" +
    ".rc-let{text-align:right;font-style:italic;font-size:.84rem;color:var(--g);margin-top:.25rem}" +
    ".rc-cod{height:34px;width:76%;margin:1.1rem auto .4rem;opacity:.85;background:repeating-linear-gradient(90deg,var(--t) 0 2px,transparent 2px 4px,var(--t) 4px 5px,transparent 5px 8px,var(--t) 8px 11px,transparent 11px 12px,var(--t) 12px 13px,transparent 13px 17px,var(--t) 17px 19px,transparent 19px 20px)}" +
    ".rc-pie{text-align:center;font-size:.7rem;font-weight:600;letter-spacing:.05em;color:var(--g);line-height:1.5}" +
    ".rc-nota{font-size:.85rem;color:var(--ink-2);text-align:center;margin:.6rem 0 0}" +
    "@media (prefers-color-scheme:dark){.rc{--p:#23221f;--t:#f4f0e6;--g:#b5ae9f;--l:#4b463c}.rc-sello{color:#6ad38a}.rc-env{filter:drop-shadow(0 10px 18px rgba(0,0,0,.5))}}" +
    "@media (max-width:380px){.rc{padding-left:1rem;padding-right:1rem}.rc-tot strong{font-size:1.9rem}.rc-tit{font-size:1.3rem}}";
  document.head.appendChild(css);

  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const $2 = v => "$" + (Number(v) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let A = null;                                     // el recibo abierto: { url, consulta, archivo, blob }

  function ticket(r) {
    const corta = String(r.confirmado || "").replace(/ de ([a-z]{3})[a-z]* de /, " $1 ");
    return '<div class="rc-env"><article class="rc" aria-label="Recibo de pago ' + esc(r.numero) + ", depto " + r.depto + '">' +
      '<header class="rc-cab"><img src="assets/mark.svg" alt=""><div class="rc-org rc-m">Las Misiones<span>Recibo de pago</span></div><div class="rc-dep rc-m"><small>DEPTO</small><b>' + r.depto + "</b></div></header>" +
      '<div class="rc-tit">' + (r.constancia ? "Pagado" : "Pago confirmado") + '</div><div class="rc-num rc-m">No. ' + esc(r.numero) + "</div>" +
      '<div class="rc-sello rc-m">PAGADO' + (r.constancia ? "" : "<small>" + esc(corta) + "</small>") + "</div>" +
      '<div class="rc-corte"></div>' +
      r.lineas.map(l => '<div class="rc-lin"><span><b>' + esc(l.concepto) + "</b><small>" + esc(l.periodo) + "</small></span><span>" + $2(l.monto) + "</span></div>").join("") +
      '<div class="rc-corte d"></div><div class="rc-tot"><span>Total</span><strong>' + $2(r.total) + "</strong></div>" +
      (r.letra ? '<div class="rc-let">(' + esc(r.letra) + ")</div>" : "") +
      '<div class="rc-cod"></div><div class="rc-pie rc-m">' +
        (r.constancia ? "Pagado según el control de la mesa directiva<br>Constancia emitida el " + esc(r.confirmado) : "Reportado el " + esc(r.reportado) + "<br>Confirmado en el banco el " + esc(r.confirmado)) +
        "<br>Mesa directiva · no es comprobante fiscal</div>" +
      "</article></div>" +
      (r.enRevision ? '<p class="rc-nota">⏳ De esta misma transferencia falta confirmar ' + (r.enRevision === 1 ? "una parte" : r.enRevision + " partes") + ": aparecerá aquí cuando la mesa la revise.</p>" : "") +
      '<div class="acc"><a class="p" href="#" id="rcPdf">⬇ Descargar recibo (PDF)</a></div><p class="rc-nota" id="rcNota">El PDF trae el membrete de Las Misiones, listo para guardar o entregar.</p>';
  }

  async function abrir(url, q, respaldo) {
    const consulta = "?accion=reciboPago&depto=" + q.depto + (q.folio ? "&folio=" + encodeURIComponent(q.folio) : "&tipo=" + encodeURIComponent(q.tipo) + "&mes=" + encodeURIComponent(q.mes));
    window.ventana("🧾 Recibo de pago", '<p class="exp" id="rcCarga">Buscando tu recibo…</p>');
    try {
      const j = await (await fetch(url + consulta + "&t=" + Date.now(), { cache: "no-store" })).json();
      if (!j.ok || !j.recibo) throw new Error(j.error || "sin recibo");
      if (!document.getElementById("rcCarga")) return;                 // cerró o abrió otra cosa mientras cargaba
      if (A && A.blob) URL.revokeObjectURL(A.blob);
      A = { url: url, consulta: consulta, archivo: "Recibo " + j.recibo.numero + ".pdf", blob: "" };
      window.ventana("🧾 Recibo de pago", ticket(j.recibo), "Cerrar");
    } catch (e) {
      if (!document.getElementById("rcCarga")) return;
      if (respaldo) respaldo();
      else window.ventana("🧾 Recibo de pago", '<p class="exp">No se pudo abrir el recibo en este momento. Intenta en unos minutos; si sigue igual, avísale a la mesa directiva.</p>');
    }
  }

  async function bajar(b) {
    if (!A || b.dataset.ocupado) return;
    const nota = document.getElementById("rcNota");
    const guardar = () => { const a = document.createElement("a"); a.href = A.blob; a.download = A.archivo; document.body.appendChild(a); a.click(); a.remove(); };
    if (A.blob) return guardar();
    b.dataset.ocupado = "1"; b.textContent = "Preparando tu recibo…";
    try {
      const j = await (await fetch(A.url + A.consulta + "&pdf=1&t=" + Date.now(), { cache: "no-store" })).json();
      if (!j.ok || !j.pdf) throw new Error(j.error || "sin pdf");
      const bin = atob(j.pdf), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      A.blob = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); A.archivo = j.archivo || A.archivo;
      guardar(); b.textContent = "⬇ Descargar de nuevo"; if (nota) nota.textContent = "Listo: revisa tus descargas.";
    } catch (e) { b.textContent = "⬇ Descargar recibo (PDF)"; if (nota) nota.textContent = "No se pudo preparar el PDF. Intenta de nuevo en un momento."; }
    delete b.dataset.ocupado;
  }
  document.addEventListener("click", e => { const b = e.target.closest("#rcPdf"); if (b) { e.preventDefault(); bajar(b); } });

  window.Recibo = { abrir: abrir };
})();
