// ==========================================
// LINKS QUE ABRIRIAM NOVA ABA -> POPUP DENTRO DO SITE
// ==========================================
// Qualquer link com target="_blank" que dê para mostrar embutido abre num popup (iframe), sem sair
// do site: PDFs e pastas do Drive, planilhas do Google, endereços no Google Maps e páginas do próprio
// site (ex.: mapa da garagem). O topo do popup tem o × para fechar (Esc também fecha).
// WhatsApp, telefone, e-mail e sites que não aceitam ser embutidos continuam como antes.
(function() {
  function urlEmbutida(href) {
    var u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    var m;
    if (/^(tel|mailto|whatsapp):/i.test(u.protocol) || /(^|\.)wa\.me$/i.test(u.hostname)) return null;
    if (/(^|\/)kit\.html$/i.test(u.pathname) && u.origin === location.origin) {
      // Mesma página do kit que o morador vê (kit.html), dentro do popup.
      return new URL("kit.html", location.href).href;
    }
    if (u.hostname === "drive.google.com") {
      if ((m = u.pathname.match(/\/file\/d\/([^/]+)/))) return "https://drive.google.com/file/d/" + m[1] + "/preview";
      if ((m = u.search.match(/[?&]id=([^&]+)/))) return "https://drive.google.com/file/d/" + m[1] + "/preview";
      return null;
    }
    if (u.hostname === "docs.google.com" && (m = u.pathname.match(/\/(spreadsheets|document|presentation)\/d\/([^/]+)/))) {
      return "https://docs.google.com/" + m[1] + "/d/" + m[2] + "/preview";
    }
    if (/(^|\.)google\.[a-z.]+$/i.test(u.hostname) && /\/maps/.test(u.pathname)) {
      var q = u.searchParams.get("query") || u.searchParams.get("q");
      return q ? "https://maps.google.com/maps?q=" + encodeURIComponent(q) + "&output=embed" : null;
    }
    if (u.origin === location.origin && /\.html$/i.test(u.pathname)) return u.href;
    return null;
  }

  var ESTILO =
    ".popup-link{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,30,45,.55)}" +
    ".popup-link[hidden]{display:none}" +
    ".popup-link-caixa{display:flex;flex-direction:column;width:min(960px,100%);height:min(88vh,100%);background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.35)}" +
    ".popup-link-topo{display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;border-bottom:1px solid #dcdde1;font-family:inherit}" +
    ".popup-link-titulo{flex:1;min-width:0;font-size:.85rem;font-weight:700;color:#243447;overflow-wrap:anywhere}" +
    ".popup-link-nova{flex:none;font-size:.78rem;font-weight:700;color:#2f5f98;text-decoration:none;padding:4px 10px;border:1px solid #2f5f98;border-radius:999px}" +
    ".popup-link-nova:hover{background:#e9f1fa}" +
    ".popup-link-fechar{flex:none;width:30px;height:30px;min-height:0;padding:0;border:1px solid #dcdde1 !important;border-radius:50%;background:#fff !important;color:#243447 !important;font-size:18px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}" +
    ".popup-link-fechar:hover{background:#f1f4f8 !important;color:#243447 !important}" +
    ".popup-link-aviso{padding:5px 14px;font-size:.72rem;color:#5f7287;background:#f7f9fb;border-bottom:1px solid #eef1f4}" +
    ".popup-link-aviso[hidden]{display:none}" +
    ".popup-link iframe{flex:1;width:100%;border:0;background:#f4f7f6}" +
    ".popup-link-caixa{position:relative}" +
    // Kit de Boas-vindas: sem a caixa de fora (topo com título e ×); só o cartão da própria página,
    // que traz o seu × (kit.html avisa o popup por mensagem).
    ".popup-link-kit .popup-link-caixa{width:min(800px,100%);background:transparent;box-shadow:none;border-radius:0;overflow:visible}" +
    ".popup-link-kit .popup-link-topo,.popup-link-kit .popup-link-aviso{display:none}" +
    ".popup-link-kit iframe{background:transparent;color-scheme:light}" +
    "@keyframes popupGirar{to{transform:rotate(360deg)}}" +
    "body.popup-link-aberto{overflow:hidden}";

  var popup = null;

  function garantirPopup() {
    if (popup) return popup;
    var css = document.createElement("style");
    css.textContent = ESTILO;
    document.head.appendChild(css);
    popup = document.createElement("div");
    popup.className = "popup-link";
    popup.hidden = true;
    popup.innerHTML =
      '<div class="popup-link-caixa" role="dialog" aria-modal="true">' +
        '<div class="popup-link-topo"><span class="popup-link-titulo"></span>' +
          '<a class="popup-link-nova" target="_blank" rel="noopener noreferrer">Abrir em nova aba</a>' +
          '<button type="button" class="popup-link-fechar" aria-label="Fechar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>' +
        '<div class="popup-link-aviso" hidden>Os arquivos do Drive aparecem aqui para quem está logado na conta Google com acesso. Se ficar em branco, faça login com essa conta e tente de novo.</div>' +
        '<iframe title="Conteúdo do link" allow="fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      "</div>";
    document.body.appendChild(popup);
    popup.addEventListener("click", function(e) {
      if (e.target === popup || e.target.closest(".popup-link-fechar")) fechar();
    });
    popup.querySelector(".popup-link-nova").addEventListener("click", fechar);
    document.addEventListener("keydown", function(e) { if (e.key === "Escape") fechar(); });
    // Pedido de fechar vindo da página embutida (× do kit).
    window.addEventListener("message", function(e) {
      var quadro = popup.querySelector("iframe");
      if (e.origin === location.origin && e.source === quadro.contentWindow && e.data === "fechar-popup-link") fechar();
    });
    return popup;
  }

  // linkNova: endereço do botão do topo (undefined = pelo padrão: arquivo do Drive/planilha ganha
  // "Abrir em nova aba"; a pasta do kit não ganha botão). textoNova: rótulo do botão.
  function abrir(embutida, original, titulo, linkNova, textoNova) {
    var p = garantirPopup();
    if (linkNova === undefined) linkNova = /(drive|docs)\.google\.com/.test(embutida) && !/kit\.html/.test(embutida) ? original : null;
    var nova = p.querySelector(".popup-link-nova");
    nova.hidden = !linkNova;
    if (linkNova) nova.href = linkNova;
    nova.textContent = textoNova || "Abrir em nova aba";
    p.querySelector(".popup-link-titulo").textContent = titulo || "";
    p.classList.toggle("popup-link-kit", /kit\.html/.test(embutida));
    p.querySelector(".popup-link-aviso").hidden = !/(drive|docs).google.com/.test(embutida);
    // Pasta do kit: janela pequena com "Carregando..." até a pasta ficar pronta (aí vira grande).
    var caixa = p.querySelector(".popup-link-caixa");
    p.querySelector("iframe").src = embutida;
    p.hidden = false;
    document.body.classList.add("popup-link-aberto");
  }

  function fechar() {
    if (!popup || popup.hidden) return;
    popup.hidden = true;
    popup.querySelector("iframe").src = "about:blank";
    document.body.classList.remove("popup-link-aberto");
  }

  // abrirDireto: mostra uma URL já pronta (ex.: PDF baixado pelo servidor, blob:) no mesmo popup.
  // linkDrive (opcional): endereço do arquivo no Google Drive, mostrado como "Ver no Google Drive".
  window.PopupLinks = { abrir: function(href, titulo) { var e = urlEmbutida(href); if (e) abrir(e, href, titulo); return !!e; },
    abrirDireto: function(url, titulo, linkDrive) { abrir(url, url, titulo, linkDrive || null, "Ver no Google Drive"); }, fechar: fechar };



  // Fase de bolha: quem já trata o clique (ex.: mapa da vaga, links do Drive desativados) chama
  // preventDefault antes, e aqui o link é ignorado.
  document.addEventListener("click", function(e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest("a[target='_blank'][href]");
    if (!link || link.closest(".popup-link") || link.hasAttribute("data-nova-aba")) return;
    var embutida = urlEmbutida(link.getAttribute("href"));
    if (!embutida) return;
    e.preventDefault();
    abrir(embutida, link.href, (link.getAttribute("title") || link.textContent || "").trim());
  });
})();
