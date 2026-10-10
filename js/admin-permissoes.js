// ==========================================
// AUTORIZAÇÕES NA TELA (Membros > Autorizações)
// ==========================================
// Com as permissões do cargo de quem está logado (vêm do fbMeuAcesso, guardadas na sessão), o que o
// cargo não pode usar fica com visual de DESATIVADO (não some): botões do menu, "Últimas alterações",
// "Dados", ações da consulta (editar, mudou-se, excluir, desativar código) e links do Drive (ficha em
// PDF, contratos). O backend recusa as mesmas coisas de novo, então isto é só a tela.
(function() {
  var PAINEL_PERMISSAO = {
    painelAprovacoes: "aprovacoes", painelConsulta: "consulta", painelPendencias: "pendencias", painelRelatorios: "relatorios",
    painelLinks: "drive", painelGabarito: "gabarito", painelMembros: "membros", painelNotificacoes: "notificacoes", painelBloqueios: "bloqueios"
  };
  var CLASSES_BODY = ["consulta", "editarCadastros", "aprovar", "historico", "dados", "drive",
    "pendenciasEscrever", "historicoEscrever", "gabaritoEscrever", "membrosEscrever", "notificacoesEscrever", "bloqueiosEscrever", "dadosEscrever"];

  function permissoes() {
    return window.AdminAuth && window.AdminAuth.getPermissoes ? window.AdminAuth.getPermissoes() : null;
  }

  // Sem a informação (sessão antiga), não trava nada: o backend continua conferindo.
  function pode(chave) {
    var p = permissoes();
    return !p || p[chave] !== false;
  }
  window.AdminPermissoes = { pode: pode };

  function aplicar() {
    document.querySelectorAll(".menu-admin button[data-painel]").forEach(function(b) {
      var chave = PAINEL_PERMISSAO[b.getAttribute("data-painel")];
      var bloqueado = !!chave && !pode(chave);
      b.classList.toggle("sem-autorizacao", bloqueado);
      b.disabled = bloqueado;
      b.title = bloqueado ? "Seu cargo não tem autorização para esta página" : "";
    });
    var dados = document.getElementById("btnAbrirFonteDados");
    if (dados) {
      dados.disabled = !pode("dados");
      dados.classList.toggle("sem-autorizacao", !pode("dados"));
      dados.title = pode("dados") ? "" : "Seu cargo não tem autorização para esta página";
    }
    document.querySelectorAll("#buscaGeralAdmin input, #buscaGeralAdmin button").forEach(function(c) { c.disabled = !pode("consulta"); });
    CLASSES_BODY.forEach(function(chave) { document.body.classList.toggle("sem-" + chave, !pode(chave)); });
    var historico = document.getElementById("historicoAdmin");
    if (historico && !pode("historico")) historico.open = false;
  }
  window.addEventListener("admin-auth-success", aplicar);
  document.addEventListener("DOMContentLoaded", aplicar);

  // Recolhível "Últimas alterações": não abre sem autorização.
  document.addEventListener("click", function(e) {
    var resumo = e.target.closest("#historicoAdmin > summary");
    if (resumo && !pode("historico")) { e.preventDefault(); return; }
    // Links do Drive (ficha em PDF, contratos) desativados.
    var link = e.target.closest("a[href*='drive.google.com'], a[href*='docs.google.com']");
    if (link && !pode("drive")) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
