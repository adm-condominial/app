// ==========================================
// NOTIFICAÇÕES (ADMIN): quem recebe o e-mail com as alterações cadastrais
// ==========================================
// Tabela: membros da administração nas linhas, tipos de e-mail nas colunas (resumo mensal, CPF
// bloqueado, cadastro excluído, novo cadastro aguardando aprovação). Cada célula liga/desliga aquele
// e-mail para aquele membro. Quem acumula funções aparece com uma função por linha. O backend (notificacoes.gs) confere de novo ao salvar:
//   condomínio, desenvolvedor e síndico: marcam/desmarcam qualquer um;
//   conselho: só o próprio e-mail (os outros aparecem travados).
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var membros = [];
  var originais = "";
  var carregado = false;
  var carregando = false;

  function setStatus(texto, tipo) {
    var el = document.getElementById("statusNotificacoes");
    if (!el) return;
    el.className = "status" + (tipo ? " " + tipo : "");
    el.textContent = texto || "";
  }

  var TIPOS = [
    { chave: "resumo", titulo: "Resumo<br>mensal" },
    { chave: "bloqueio", titulo: "CPF<br>bloqueado" },
    { chave: "exclusao", titulo: "Cadastro<br>excluído" },
    { chave: "aprovacao", titulo: "Novo cadastro<br>aguardando aprovação" }
  ];

  // { email: { tipo: true/false } } — o que vai para o backend e serve para comparar com o original.
  function marcados() {
    var r = {};
    membros.forEach(function(m) { r[m.email] = Object.assign({}, m.preferencias || {}); });
    return r;
  }

  function primeiroNome(nome) { return String(nome || "").trim().split(/\s+/)[0] || ""; }

  function atualizarBotoes() {
    var alterado = JSON.stringify(marcados()) !== originais;
    document.getElementById("btnSalvarNotificacoes").disabled = !alterado;
    document.getElementById("btnDesfazerNotificacoes").disabled = !alterado;
  }

  function renderizar() {
    var lista = document.getElementById("listaNotificacoes");
    if (!membros.length) {
      lista.innerHTML = '<p class="sem-itens">Nenhum membro cadastrado. Preencha a página Membros primeiro.</p>';
      atualizarBotoes();
      return;
    }
    var cabecalho = "<tr><th>Membro</th>" + TIPOS.map(function(t) { return "<th>" + t.titulo + "</th>"; }).join("") + "</tr>";
    var linhas = membros.map(function(m, i) {
      var quem = m.apto || m.nome ? '<span class="notif-quem">' + escaparHtml([m.apto, primeiroNome(m.nome)].filter(Boolean).join(" · ")) + "</span>" : "";
      return '<tr><td>' + m.cargos.map(function(c) { return '<span class="notif-cargo-linha">' + escaparHtml(c) + "</span>"; }).join("") + quem + "</td>" +
        TIPOS.map(function(t) {
          var permitido = !m.permitidos || m.permitidos[t.chave] !== false;
          var travado = !m.editavel || !permitido;
          var marcado = permitido && m.preferencias && m.preferencias[t.chave];
          return '<td class="aut-celula"><label class="aut-check' + (travado ? " travado" : "") + '" title="' +
            (permitido ? "" : "Só o Síndico, o Condomínio e o Desenvolvedor recebem este aviso") + '">' +
            '<input type="checkbox" data-i="' + i + '" data-tipo="' + t.chave + '"' + (marcado ? " checked" : "") + (travado ? " disabled" : "") + '>' +
            '<span class="aut-caixa" aria-hidden="true"></span></label></td>';
        }).join("") + "</tr>";
    }).join("");
    lista.innerHTML = '<div class="tabela-admin-rolagem"><table class="tabela-admin tabela-notificacoes"><thead>' + cabecalho + "</thead><tbody>" + linhas + "</tbody></table></div>";
    atualizarBotoes();
  }

  function aplicar(r) {
    membros = r.membros || [];
    originais = JSON.stringify(marcados());
    renderizar();
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    setStatus("Carregando", "carregando");
    DataService.obterNotificacoes()
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível carregar as notificações.");
        carregado = true;
        document.getElementById("painelNotificacoes").classList.add("conteudo-carregado");
        setStatus(r.configurado ? "" : "Lista ainda não salva: por enquanto o e-mail vai só para quem já está marcado abaixo. Marque quem deve receber e clique em Salvar.", "aviso-leve");
        aplicar(r);
      })
      .catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível carregar as notificações.", "erro"); })
      .then(function() { carregando = false; });
  }

  function salvar() {
    document.getElementById("btnSalvarNotificacoes").disabled = true;
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, "Aguarde: salvando");
    DataService.salvarNotificacoes(marcados())
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível salvar.");
        aplicar(r);
        setStatus("Salvo. Os próximos e-mails seguem esta tabela.", "ok");
      })
      .catch(function(erro) {
        setStatus((erro && erro.message) || "Não foi possível salvar.", "erro");
        atualizarBotoes();
      })
      .then(function() { if (window.setOverlayAdmin) window.setOverlayAdmin(false); });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var lista = document.getElementById("listaNotificacoes");
    if (!lista || !window.DataService) return;

    // Cache da área admin (DataService): abre na hora com o último resultado e revalida em segundo plano.
    window.addEventListener("painel-aberto", function(e) {
      if (e.detail && e.detail.id === "painelNotificacoes" && (!carregado || JSON.stringify(marcados()) === originais)) carregar();
    });
    window.addEventListener("dados-admin-atualizados", function(e) {
      var painelEl = document.getElementById("painelNotificacoes");
      if (e.detail && e.detail.nome === "obterNotificacoes" && painelEl && !painelEl.hidden && (!carregado || JSON.stringify(marcados()) === originais)) setTimeout(carregar, 50); // depois do carregamento em andamento
    });
    document.getElementById("btnAtualizarNotificacoes").addEventListener("click", function() {
      if (!((!carregado || JSON.stringify(marcados()) === originais)) && !window.confirm("Há alterações não salvas. Atualizar e descartar?")) return;
      DataService.limparCacheAdmin("obterNotificacoes");
      carregar();
    });
    // Membros mudaram: recarrega da próxima vez que a página for aberta.
    window.addEventListener("cadastro-alterado", function() { carregado = false; });
    lista.addEventListener("change", function(e) {
      var i = e.target.getAttribute("data-i"), tipo = e.target.getAttribute("data-tipo");
      if (i === null || !tipo) return;
      var m = membros[Number(i)];
      m.preferencias = m.preferencias || {};
      m.preferencias[tipo] = e.target.checked;
      atualizarBotoes();
    });
    document.getElementById("btnSalvarNotificacoes").addEventListener("click", salvar);
    document.getElementById("btnDesfazerNotificacoes").addEventListener("click", function() {
      carregado = false;
      carregar();
    });
  });
})();

// Exemplos dos e-mails: um botão por tipo; mostra um de cada vez (toggle). De início, nenhum aberto.
document.addEventListener("click", function(e) {
  var botao = e.target.closest(".btn-exemplo-email");
  if (!botao) return;
  var tipo = botao.getAttribute("data-exemplo");
  var abrir = botao.getAttribute("aria-pressed") !== "true";
  document.querySelectorAll(".btn-exemplo-email").forEach(function(b) {
    var ativo = abrir && b === botao;
    b.setAttribute("aria-pressed", ativo ? "true" : "false");
    b.classList.toggle("ativo", ativo);
  });
  document.querySelectorAll(".exemplo-email-bloco").forEach(function(bloco) {
    bloco.hidden = !(abrir && bloco.getAttribute("data-exemplo") === tipo);
  });
});
