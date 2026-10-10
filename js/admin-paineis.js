// ==========================================
// MENU DO ADMIN: PAINÉIS QUE ABREM E FECHAM
// ==========================================
// Cada botão do menu abre/fecha a sua página (Consulta por apartamento, Pendências, Relatórios,
// Links úteis, Gabarito de vagas, Membros). Só uma página fica aberta: abrir outra substitui a
// atual. Cada página tem um × que fecha e volta para a home (últimas alterações + busca geral). Outros scripts abrem um painel com window.AdminPaineis.abrir(id) — por
// exemplo, ao carregar um cadastro (a partir da busca ou ao voltar da edição).
(function() {
  function botaoDoPainel(id) {
    return document.querySelector('.menu-admin [data-painel="' + id + '"]');
  }

  function marcarBotao(id, aberto) {
    var botao = botaoDoPainel(id);
    if (!botao) return;
    botao.classList.toggle("ativo", aberto);
    botao.setAttribute("aria-pressed", aberto ? "true" : "false");
  }

  // A home (últimas alterações + busca geral) só aparece com todas as páginas fechadas.
  // O botão "Página inicial" fica aceso enquanto ela está à mostra (nenhuma página aberta).
  function atualizarHome() {
    var home = document.getElementById("homeAdmin");
    var botao = document.getElementById("btnPaginaInicial");
    var algumaAberta = !!document.querySelector(".painel-admin:not([hidden])");
    if (home) home.hidden = algumaAberta;
    if (botao) {
      botao.classList.toggle("ativo", !algumaAberta);
      botao.setAttribute("aria-pressed", algumaAberta ? "false" : "true");
    }
  }

  // "Página inicial": fecha a página aberta e volta para a home.
  function irParaInicio() {
    document.querySelectorAll(".painel-admin:not([hidden])").forEach(function(p) { fechar(p.id); });
    atualizarHome();
  }

  function abrir(id) {
    var painel = document.getElementById(id);
    if (!painel) return;
    // Só uma página por vez: abrir uma fecha a outra.
    document.querySelectorAll(".painel-admin").forEach(function(outro) {
      if (outro !== painel && !outro.hidden) {
        outro.hidden = true;
        marcarBotao(outro.id, false);
      }
    });
    painel.hidden = false;
    marcarBotao(id, true);
    atualizarHome();
    window.dispatchEvent(new CustomEvent("painel-aberto", { detail: { id: id } }));
  }

  function fechar(id) {
    var painel = document.getElementById(id);
    if (!painel) return;
    painel.hidden = true;
    marcarBotao(id, false);
    atualizarHome();
  }

  function alternar(id) {
    var painel = document.getElementById(id);
    if (!painel) return;
    if (painel.hidden) abrir(id); else fechar(id);
  }

  window.AdminPaineis = { abrir: abrir, fechar: fechar, alternar: alternar };

  document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".menu-admin [data-painel]").forEach(function(botao) {
      botao.addEventListener("click", function() { alternar(botao.getAttribute("data-painel")); });
    });
    var inicio = document.getElementById("btnPaginaInicial");
    if (inicio) inicio.addEventListener("click", irParaInicio);
    document.querySelectorAll(".painel-admin .btn-fechar-painel").forEach(function(botao) {
      botao.addEventListener("click", function() { fechar(botao.closest(".painel-admin").id); });
    });
  });
})();
