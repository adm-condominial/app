// ==========================================
// PENDÊNCIAS (ADMIN)
// ==========================================
// O que precisa de atenção na base, em grupos recolhíveis (aptos sem cadastro, contratos de
// locação vencendo, cadastros antigos, dados faltando, vagas...). Carrega ao abrir a página e
// depois de cada alteração. Tocar num item com cadastro abre esse cadastro na Consulta.
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var carregado = false;
  var carregando = false;

  function setStatus(texto, tipo) {
    var el = document.getElementById("statusPendencias");
    if (!el) return;
    el.className = "status" + (tipo ? " " + tipo : "");
    el.textContent = texto || "";
  }

  var grupos = [];

  // Caixinha "ignorar" (primeira coisa da linha): marcada, a pendência não conta e fica apagada.
  function caixaIgnorar(it) {
    return '<input type="checkbox" class="ignorar-pendencia" data-chave="' + escaparHtml(it.chave || "") + '"' +
      (it.ignorado ? " checked" : "") + ' title="Ignorar esta pendência" aria-label="Ignorar esta pendência">';
  }

  function itemHtml(it) {
    // Chip "PDF" logo depois do nome (é um span dentro do botão; o clique nele abre o PDF, não o cadastro).
    var pdf = it.pdfUrl ? ' <span class="pendencia-pdf" role="link" tabindex="0" data-url="' + escaparHtml(it.pdfUrl) + '" title="Ficha mais recente do cadastro, em PDF">Ficha em PDF</span>' : "";
    var texto = "<strong>" + escaparHtml(it.apto) + "</strong>" +
      (it.nome ? " · " + escaparHtml(it.nome) + (it.tipo ? " (" + escaparHtml(it.tipo) + ")" : "") : "") + pdf +
      (it.detalhe ? '<span class="pendencia-detalhe">' + escaparHtml(it.detalhe) + "</span>" : "");
    var conteudo = it.id
      ? '<button type="button" class="pendencia-item" data-apto="' + escaparHtml(it.apto) + '" data-id="' + escaparHtml(it.id) + '">' + texto + "</button>"
      : '<span class="pendencia-item sem-link">' + texto + "</span>";
    return '<li class="' + (it.ignorado ? "ignorada" : "") + '">' + caixaIgnorar(it) + conteudo + "</li>";
  }

  function ativos(g) {
    return typeof g.ativos === "number" ? g.ativos : g.itens.filter(function(it) { return !it.ignorado; }).length;
  }

  // Bolinha vermelha com a quantidade no botão "Pendências" do menu.
  // A última contagem fica guardada (js/admin-badges.js) e aparece assim que a página abre.
  function atualizarBadgePendencias(total) {
    if (window.BadgeMenu) window.BadgeMenu.definir("contadorPendencias", total);
  }
  window.addEventListener("cache-admin-gravado", function(e) {
    if (!e.detail || e.detail.nome !== "listarPendencias" || !window.DataService) return;
    DataService.listarPendencias().then(function(r) {
      if (!r || !r.sucesso) return;
      atualizarBadgePendencias((r.grupos || []).reduce(function(soma, g) { return soma + ativos(g); }, 0));
    }).catch(function() {});
  });

  function renderizar() {
    var lista = document.getElementById("listaPendencias");
    if (!lista) return;
    // Lembra quais grupos estavam abertos (ao marcar/desmarcar, a lista é redesenhada).
    var abertos = {};
    lista.querySelectorAll("details[open]").forEach(function(d) { abertos[d.getAttribute("data-chave")] = true; });
    var total = grupos.reduce(function(soma, g) { return soma + ativos(g); }, 0);
    atualizarBadgePendencias(total);
    // Primeiro os grupos com pendência (não ignorada), depois os zerados.
    var ordenados = grupos.filter(function(g) { return ativos(g); }).concat(grupos.filter(function(g) { return !ativos(g); }));
    lista.innerHTML = ordenados.map(function(g) {
      var n = ativos(g);
      var semItens = !g.itens.length;   // nada na lista: não abre (com ignorados, abre para reativar)
      return '<details class="grupo-pendencia' + (n ? "" : " zerado") + (semItens ? " vazio" : "") + '" data-chave="' + escaparHtml(g.chave) + '"' + (abertos[g.chave] ? " open" : "") + ">" +
        '<summary><span class="contador-pendencia">' + n + "</span><span>" + escaparHtml(g.titulo) + "</span></summary>" +
        (semItens ? "" : "<ul>" + g.itens.map(itemHtml).join("") + "</ul>") +
      "</details>";
    }).join("");
    setStatus(total ? "" : "Nenhuma pendência. 🎉", total ? "" : "ok");
  }

  // Marca/desmarca "ignorar": muda na hora na tela e grava no servidor (vale para todos os admins).
  function alternarIgnorar(caixa) {
    var chave = caixa.getAttribute("data-chave");
    var ignorar = caixa.checked;
    var item = null;
    grupos.forEach(function(g) {
      g.itens.forEach(function(it) { if (it.chave === chave) item = it; });
      if (typeof g.ativos === "number") g.ativos = g.itens.filter(function(it) { return !(it.chave === chave ? ignorar : it.ignorado); }).length;
    });
    if (!item) return;
    item.ignorado = ignorar;
    renderizar();
    DataService.ignorarPendencia(chave, ignorar)
      .then(function(r) { if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível salvar."); })
      .catch(function(erro) {
        item.ignorado = !ignorar;
        grupos.forEach(function(g) { g.ativos = g.itens.filter(function(it) { return !it.ignorado; }).length; });
        renderizar();
        setStatus((erro && erro.message) || "Não foi possível salvar.", "erro");
      });
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    setStatus("Carregando", "carregando");
    DataService.listarPendencias()
      .then(function(resposta) {
        if (!resposta || !resposta.sucesso) {
          setStatus((resposta && resposta.mensagem) || "Não foi possível verificar as pendências.", "erro");
          return;
        }
        carregado = true;
        grupos = resposta.grupos || [];
        renderizar();
      })
      .catch(function(erro) {
        setStatus((erro && erro.message) || "Não foi possível verificar as pendências.", "erro");
      })
      .then(function() { carregando = false; });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var lista = document.getElementById("listaPendencias");
    if (!lista || !window.DataService) return;

    // Cache da área admin (DataService): abre na hora com o último resultado e revalida em segundo plano.
    window.addEventListener("painel-aberto", function(e) {
      if (e.detail && e.detail.id === "painelPendencias" && true) carregar();
    });
    window.addEventListener("dados-admin-atualizados", function(e) {
      var painelEl = document.getElementById("painelPendencias");
      if (e.detail && e.detail.nome === "listarPendencias" && painelEl && !painelEl.hidden && true) setTimeout(carregar, 50); // depois do carregamento em andamento
    });
    document.getElementById("btnAtualizarPendencias").addEventListener("click", function() {
      if (!(true) && !window.confirm("Há alterações não salvas. Atualizar e descartar?")) return;
      DataService.limparCacheAdmin("listarPendencias");
      carregar();
    });
    // Depois de uma alteração, recarrega na próxima vez que a página for aberta.
    window.addEventListener("cadastro-alterado", function() { carregado = false; });
    window.addEventListener("cadastro-excluido", function() { carregado = false; });


    lista.addEventListener("change", function(e) {
      if (e.target.classList && e.target.classList.contains("ignorar-pendencia")) alternarIgnorar(e.target);
    });

    // Abre o cadastro na página "Consulta por apartamento".
    lista.addEventListener("click", function(e) {
      var chip = e.target.closest(".pendencia-pdf");
      if (chip) {
        e.preventDefault();
        e.stopPropagation();
        // Abre num popup dentro do site (js/popup-links.js); se não der, em nova aba.
        if (!(window.PopupLinks && window.PopupLinks.abrir(chip.getAttribute("data-url"), "Ficha em PDF"))) window.open(chip.getAttribute("data-url"), "_blank", "noopener");
        return;
      }
      var botao = e.target.closest("button.pendencia-item");
      if (!botao || typeof window.adminSimplesCarregarApartamento !== "function") return;
      var select = document.getElementById("aptoAdmin");
      var valor = botao.getAttribute("data-apto") + "__" + botao.getAttribute("data-id");
      if (select && Array.prototype.some.call(select.options, function(o) { return o.value === valor; })) select.value = valor;
      window.adminSimplesCarregarApartamento(botao.getAttribute("data-apto"), botao.getAttribute("data-id"));
    });
  });
})();
