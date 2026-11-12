/* Las Misiones · botón «Aa» para letra más grande (se recuerda en este navegador). */
(function () {
  "use strict";
  const css = document.createElement("style");
  css.textContent = ".mi-letra{font:inherit;font-weight:800;min-width:44px;min-height:40px;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--ink);cursor:pointer;margin-left:auto;margin-right:.5rem}" +
    ".mi-letra[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}html.mi-grande{font-size:118%}@media (max-width:520px){.site-header .brand img.wordmark{height:46px;width:auto}.mi-letra{min-width:40px;margin-right:.35rem}.site-header .nav-btn{white-space:nowrap;margin-left:0}}@media (min-width:900px){.mi-letra{order:5;margin:0 0 0 .6rem}}";
  document.head.appendChild(css);
  const inner = document.querySelector(".site-header .inner");
  if (!inner) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "mi-letra"; b.textContent = "Aa"; b.title = "Letra más grande"; b.setAttribute("aria-label", "Letra más grande");
  const poner = on => { document.documentElement.classList.toggle("mi-grande", on); b.setAttribute("aria-pressed", on); };
  try { poner(localStorage.getItem("misiones.letra") === "1"); } catch (e) { poner(false); }
  b.onclick = () => { const on = !document.documentElement.classList.contains("mi-grande"); poner(on); try { localStorage.setItem("misiones.letra", on ? "1" : "0"); } catch (e) {} };
  const btn = inner.querySelector(".nav-btn");
  inner.insertBefore(b, btn || null);
})();
