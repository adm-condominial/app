// ==========================================
// MINIATURA DA VAGA NO FORMULÁRIO + MAPA EM POPUP
// ==========================================
// Na seção "Vaga de Garagem", mostra uma miniatura do andar com a vaga do morador pintada: só o
// desenho, sem textos nem ícones (números, apartamentos, estrelas, legendas). Os desenhos são
// baixados em segundo plano logo que a página abre, para a miniatura aparecer na hora.
// Tocar na miniatura (ou no "Clique aqui") abre o mapa-vaga.html completo num popup, sem sair
// da página. O popup já fica montado (escondido) quando a vaga é conhecida, para abrir rápido.
(function() {
  var ANDARES = ["G1", "G2"];
  var svgs = {};            // texto do SVG (paisagem) de cada andar
  var carregamento = null;
  var atual = null;         // { apto, andar, vaga, url }

  function carregarDesenhos() {
    if (carregamento) return carregamento;
    carregamento = Promise.all(ANDARES.map(function(andar) {
      return fetch("mapas/mapa-garagem-" + andar + ".svg", { cache: "force-cache" })
        .then(function(r) { return r.ok ? r.text() : ""; })
        .then(function(t) { svgs[andar] = t; })
        .catch(function() {});
    }));
    return carregamento;
  }

  // "10, 25 e 26" -> ["10","25","26"]; "1 / 2" -> ["1","2"].
  function separarVagas(texto) {
    var t = String(texto || "").trim();
    if (!t || t === "?") return [];
    return t.split(/,|\se\s|\//).map(function(s) { return s.trim(); }).filter(Boolean);
  }

  // SVG simplificado: sem textos, selos, estrelas e rodapé; só a planta, com a vaga pintada.
  function montarMiniatura(andar, vagas) {
    var texto = svgs[andar];
    if (!texto) return null;
    var svg = new DOMParser().parseFromString(texto, "image/svg+xml").documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg") return null;
    svg.querySelectorAll("text, title, .num-vaga, .excedente, .seta").forEach(function(el) { el.remove(); });
    var borda = svg.querySelector("rect.borda");
    if (borda) {
      var x = Number(borda.getAttribute("x")), y = Number(borda.getAttribute("y"));
      var w = Number(borda.getAttribute("width")), h = Number(borda.getAttribute("height"));
      svg.setAttribute("viewBox", (x - 10) + " " + (y - 10) + " " + (w + 20) + " " + (h + 20));
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("aria-hidden", "true");
    vagas.forEach(function(n) {
      var g = svg.querySelector('[id="vaga-' + andar + "-" + n + '"]') ||
        (andar === "G2" && (n === "1" || n === "2") ? svg.querySelector('[id="vaga-G2-1-2"]') : null);
      var rect = g && g.querySelector("rect");
      if (rect) rect.setAttribute("style", "fill:#ffb74d;stroke:#e65100;stroke-width:9");
    });
    return svg;
  }

  function urlMapa(apto, andar, vaga) {
    return "mapa-vaga.html?" + new URLSearchParams({ apto: apto, andar: andar, vaga: vaga }).toString();
  }

  // Popup com o mapa completo (iframe). Montado uma vez; só troca o endereço quando a vaga muda.
  function garantirPopup() {
    var popup = document.getElementById("popupMapaVaga");
    if (popup) return popup;
    popup = document.createElement("div");
    popup.id = "popupMapaVaga";
    popup.className = "popup-mapa-vaga";
    popup.hidden = true;
    popup.innerHTML =
      '<div class="popup-mapa-vaga-caixa" role="dialog" aria-modal="true" aria-label="Mapa da garagem">' +
        '<button type="button" class="popup-mapa-vaga-fechar" aria-label="Fechar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
        '<iframe title="Mapa da garagem" loading="eager"></iframe>' +
      "</div>";
    document.body.appendChild(popup);
    popup.addEventListener("click", function(e) {
      if (e.target === popup || e.target.closest(".popup-mapa-vaga-fechar")) fecharPopup();
    });
    document.addEventListener("keydown", function(e) { if (e.key === "Escape") fecharPopup(); });
    return popup;
  }

  function prepararPopup(url) {
    var iframe = garantirPopup().querySelector("iframe");
    if (iframe.getAttribute("src") !== url) iframe.setAttribute("src", url);
  }

  function abrirPopup(url) {
    prepararPopup(url);
    var popup = garantirPopup();
    popup.hidden = false;
    document.body.classList.add("popup-aberto");
  }

  function fecharPopup() {
    var popup = document.getElementById("popupMapaVaga");
    if (!popup || popup.hidden) return;
    popup.hidden = true;
    document.body.classList.remove("popup-aberto");
  }

  function mostrar(apto, andar, vaga) {
    var container = document.getElementById("miniaturaVaga");
    if (!container) return;
    andar = String(andar || "").trim().toUpperCase();
    var vagas = separarVagas(vaga);
    if (!apto || ANDARES.indexOf(andar) === -1 || !vagas.length) {
      esconder();
      return;
    }
    atual = { url: urlMapa(apto, andar, vaga) };
    carregarDesenhos().then(function() {
      var svg = montarMiniatura(andar, vagas);
      if (!svg) { esconder(); return; }
      container.innerHTML = "";
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "miniatura-vaga";
      botao.setAttribute("aria-label", "Ver o mapa da garagem com a sua vaga");
      botao.appendChild(svg);
      var dica = document.createElement("span");
      dica.className = "miniatura-vaga-dica";
      dica.textContent = "Toque para ver o mapa completo";
      botao.appendChild(dica);
      container.appendChild(botao);
      container.hidden = false;
      prepararPopup(atual.url); // já deixa o mapa completo carregando em segundo plano
    });
  }

  function esconder() {
    var container = document.getElementById("miniaturaVaga");
    atual = null;
    if (container) { container.innerHTML = ""; container.hidden = true; }
  }

  // Só o desenho (svg) com a vaga pintada, para outras telas (ex.: Cadastros para aprovação no admin).
  function montar(andar, vaga) {
    andar = String(andar || "").trim().toUpperCase();
    var vagas = separarVagas(vaga);
    if (ANDARES.indexOf(andar) === -1 || !vagas.length) return Promise.resolve(null);
    return carregarDesenhos().then(function() { return montarMiniatura(andar, vagas); });
  }

  window.VagaMiniatura = { mostrar: mostrar, esconder: esconder, montar: montar, urlMapa: urlMapa };

  document.addEventListener("DOMContentLoaded", function() {
    carregarDesenhos(); // baixa os desenhos em segundo plano, antes de o morador chegar na seção
    var container = document.getElementById("miniaturaVaga");
    if (container) container.addEventListener("click", function(e) {
      if (atual && e.target.closest(".miniatura-vaga")) abrirPopup(atual.url);
    });
    // "Clique aqui" também abre o popup (sem vaga conhecida, mostra os dois andares).
    var link = document.getElementById("linkMapaVaga");
    if (link) link.addEventListener("click", function(e) {
      e.preventDefault();
      abrirPopup(link.getAttribute("href") || "mapa-vaga.html");
    });
  });
})();
