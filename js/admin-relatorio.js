// ==========================================
// RELATÓRIOS EM PDF (ADMIN): contatos e lista de veículos
// ==========================================
// Os PDFs são gerados sozinhos no backend depois de cada alteração cadastral (só quando o
// conteúdo muda). Aqui só mostramos o mais recente de cada um. Logo depois de uma alteração,
// a geração ainda está rodando em segundo plano: mostramos "atualizando" e consultamos de novo.
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var ESPERA_ATUALIZANDO_MS = 20000;
  var MAX_TENTATIVAS = 6;

  var RELATORIOS = {
    contatos: "situacaoRelatorioContatos",
    veiculos: "situacaoListaVeiculos"
  };

  function setHtml(id, html, classe) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = "situacao-relatorio" + (classe ? " " + classe : "");
    el.innerHTML = html || "";
  }

  function formatarDataHora(iso) {
    var data = new Date(iso);
    if (isNaN(data.getTime())) return "";
    function dois(n) { return String(n).padStart(2, "0"); }
    return dois(data.getDate()) + "/" + dois(data.getMonth() + 1) + "/" + data.getFullYear() + " " +
      dois(data.getHours()) + ":" + dois(data.getMinutes());
  }

  // "Mais recente: 26/09/2026 às 10:32 — abrir PDF" (+ "atualizando" se for o caso).
  function mostrarSituacao(id, info, atualizando) {
    if (!info) return setHtml(id, "");
    var partes = [];
    var url = window.Utils.urlSegura(info.url);
    if (info.nunca || !url) {
      partes.push("Ainda não foi gerado.");
    } else {
      partes.push('<a class="link-mais-recente" href="' + escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
        "📄 Relatório mais recente · " + escaparHtml(formatarDataHora(info.geradoEm)) + "</a>");
    }
    if (atualizando) partes.push('<span class="aviso-atualizando">Atualizando com a última alteração</span>');
    setHtml(id, partes.join(" "), atualizando ? "atualizando" : "");
  }

  var carregando = false;
  var tentativas = 0;
  var timer = null;

  function carregarSituacao() {
    if (carregando || !window.DataService || typeof DataService.situacaoRelatorios !== "function") return;
    carregando = true;
    clearTimeout(timer);
    DataService.situacaoRelatorios()
      .then(function(resposta) {
        if (!resposta || !resposta.sucesso) {
          Object.keys(RELATORIOS).forEach(function(k) {
            setHtml(RELATORIOS[k], escaparHtml((resposta && resposta.mensagem) || "Não foi possível verificar o relatório."), "erro");
          });
          return;
        }
        Object.keys(RELATORIOS).forEach(function(k) { mostrarSituacao(RELATORIOS[k], resposta[k], resposta.atualizando); });
        // Ainda gerando em segundo plano: consulta de novo daqui a pouco.
        if (resposta.atualizando && tentativas < MAX_TENTATIVAS) {
          tentativas++;
          timer = setTimeout(carregarSituacao, ESPERA_ATUALIZANDO_MS);
        }
      })
      .catch(function() {
        Object.keys(RELATORIOS).forEach(function(k) { setHtml(RELATORIOS[k], "Não foi possível verificar o relatório.", "erro"); });
      })
      .then(function() { carregando = false; });
  }

  function recomecar() {
    tentativas = 0;
    // Dá tempo para a execução em segundo plano começar antes de consultar.
    clearTimeout(timer);
    timer = setTimeout(carregarSituacao, 3000);
  }

  // Registrado cedo: o login pode liberar o painel antes do DOMContentLoaded deste script.
  window.addEventListener("admin-auth-success", function() { tentativas = 0; carregarSituacao(); });
  window.addEventListener("cadastro-excluido", recomecar);
  window.addEventListener("cadastro-alterado", recomecar);
})();
