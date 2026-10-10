// ==========================================
// ÚLTIMAS ALTERAÇÕES CADASTRAIS (ADMIN)
// ==========================================
// Seção recolhível (<details>), fechada por padrão. O histórico só é buscado quando a seção é
// aberta — assim a página não faz uma chamada a mais ao carregar. Busca as 50 mais recentes de
// uma vez e mostra de 5 em 5 ("Mostrar mais 5"). Cada entrada tem um × para apagá-la.
(function() {
  var LIMITE_BUSCA = 50;
  var POR_PAGINA = 5;
  var escaparHtml = window.Utils.escaparHtml;
  var itens = [];
  var visiveis = POR_PAGINA;
  var carregado = false;
  var carregando = false;

  var CLASSE_TIPO = { "criação": "criacao", "edição": "edicao", "exclusão": "exclusao", "mudou-se": "mudouse", "reativação": "criacao", "gabarito": "edicao", "membros": "edicao" };

  function setStatus(texto, tipo) {
    var status = document.getElementById("statusHistorico");
    if (!status) return;
    status.className = "status" + (tipo ? " " + tipo : "");
    status.textContent = texto || "";
  }

  function formatarQuando(iso) {
    var data = new Date(iso);
    if (isNaN(data.getTime())) return "";
    function dois(n) { return String(n).padStart(2, "0"); }
    return dois(data.getDate()) + "/" + dois(data.getMonth() + 1) + "/" + data.getFullYear() +
      " " + dois(data.getHours()) + ":" + dois(data.getMinutes());
  }

  function itemHtml(item) {
    var tipo = String(item.tipo || "");
    var quem = item.nome ? escaparHtml(item.nome) + (item.cadastroTipo ? " (" + escaparHtml(item.cadastroTipo) + ")" : "") : "";
    return (
      "<li>" +
        '<button type="button" class="btn-apagar-historico" data-id="' + escaparHtml(item._id) + '" title="Apagar esta entrada do histórico" aria-label="Apagar esta entrada do histórico">×</button>' +
        '<div class="historico-linha">' +
          '<span class="historico-tipo ' + (CLASSE_TIPO[tipo] || "") + '">' + escaparHtml(tipo) + "</span>" +
          "<strong>Apto " + escaparHtml(item.apto) + "</strong>" +
          (quem ? "<span>" + quem + "</span>" : "") +
        "</div>" +
        '<div class="historico-linha">' +
          '<span class="historico-quando">' + escaparHtml(formatarQuando(item.quando)) + "</span>" +
          '<span class="historico-autor">por ' + escaparHtml(item.autor || "—") + "</span>" +
        "</div>" +
        (item.detalhe ? '<div class="historico-detalhe">' + escaparHtml(item.detalhe) + "</div>" : "") +
      "</li>"
    );
  }

  // Bolinha com o número de itens: o número vai para o servidor (js/admin-badges.js).
  function guardarContagem(total) {
    if (window.BadgeMenu) window.BadgeMenu.definir("contadorHistorico", total);
  }

  function renderizar() {
    var lista = document.getElementById("listaHistorico");
    if (carregado) guardarContagem(itens.length);
    var botaoMais = document.getElementById("btnMaisHistorico");
    if (lista) lista.innerHTML = itens.slice(0, visiveis).map(itemHtml).join("");
    if (botaoMais) {
      var restantes = itens.length - visiveis;
      botaoMais.hidden = restantes <= 0;
      botaoMais.textContent = "Mostrar mais " + Math.min(POR_PAGINA, Math.max(restantes, 0));
    }
    if (carregado) setStatus(itens.length ? "" : "Nenhuma alteração registrada ainda.", "vazio");
  }

  function carregar(emSegundoPlano) {
    if (carregando) return;
    carregando = true;
    if (!emSegundoPlano) setStatus("Carregando", "carregando");

    DataService.listarHistorico(LIMITE_BUSCA)
      .then(function(resposta) {
        if (!resposta || !resposta.sucesso) {
          if (!emSegundoPlano) setStatus((resposta && resposta.mensagem) || "Não foi possível carregar o histórico.", "erro");
          return;
        }
        itens = Array.isArray(resposta.itens) ? resposta.itens : [];
        visiveis = POR_PAGINA;
        carregado = true;
        renderizar();
        setStatus("", "");
      })
      .catch(function(erro) {
        if (!emSegundoPlano) setStatus((erro && erro.message) || "Não foi possível carregar o histórico.", "erro");
      })
      .then(function() {
        carregando = false;
      });
  }

  function apagar(botao) {
    var id = botao.getAttribute("data-id");
    var item = itens.filter(function(i) { return i._id === id; })[0];
    if (!id || !item) return;
    var descricao = (item.tipo || "alteração") + " do apto " + (item.apto || "?") + " em " + formatarQuando(item.quando);
    if (!window.confirm("Apagar esta entrada do histórico?\n\n" + descricao + "\n\nO cadastro em si não é alterado.")) return;

    botao.disabled = true;
    DataService.excluirHistorico(id)
      .then(function(resposta) {
        if (!resposta || !resposta.sucesso) throw new Error((resposta && resposta.mensagem) || "Não foi possível apagar.");
        itens = itens.filter(function(i) { return i._id !== id; });
        renderizar();
      })
      .catch(function(erro) {
        botao.disabled = false;
        setStatus((erro && erro.message) || "Não foi possível apagar a entrada.", "erro");
      });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var secao = document.getElementById("historicoAdmin");
    var botao = document.getElementById("btnAtualizarHistorico");
    var botaoMais = document.getElementById("btnMaisHistorico");
    var lista = document.getElementById("listaHistorico");
    if (!secao || !window.DataService) return;
    // Em 2º plano, logo ao abrir a página (com o admin logado): o número vem do servidor e a lista é
    // atualizada. Se o número for outro, a bolinha muda sozinha; a lista só aparece quando a seção abre.
    function atualizarEmSegundoPlano() {
      if (!window.AdminAuth || !window.AdminAuth.getIdToken || !window.AdminAuth.getIdToken()) return;
      if (carregado || carregando) return;
      carregar(true);
    }
    atualizarEmSegundoPlano();
    window.addEventListener("admin-auth-success", atualizarEmSegundoPlano);

    secao.addEventListener("toggle", function() {
      if (secao.open && !carregado) carregar();
    });
    // "Atualizar" fica no título (dentro do <summary>): abre o grupo (sem fechar se já estiver
    // aberto) e recarrega. Clicar no texto só abre/fecha, como antes.
    if (botao) botao.addEventListener("click", function(evento) {
      evento.preventDefault();
      evento.stopPropagation();
      var jaAberto = secao.open;
      secao.open = true;
      if (jaAberto || carregado) carregar();
    });
    if (botaoMais) botaoMais.addEventListener("click", function() {
      visiveis += POR_PAGINA;
      renderizar();
    });
    if (lista) lista.addEventListener("click", function(evento) {
      var alvo = evento.target.closest(".btn-apagar-historico");
      if (alvo) apagar(alvo);
    });

    // Depois de excluir ou alterar um cadastro, a lista aberta se atualiza; fechada, recarrega ao abrir.
    function recarregarSeAberto() {
      carregado = false;
      if (secao.open) carregar();
    }
    window.addEventListener("cadastro-excluido", recarregarSeAberto);
    window.addEventListener("cadastro-alterado", recarregarSeAberto);
  });
})();
