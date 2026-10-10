// ==========================================
// PRÉ-CARGA DAS PÁGINAS DO ADMIN + "ATUALIZADO HÁ N MIN" EMBAIXO DO "ATUALIZAR"
// ==========================================
// Logo depois do login, busca em segundo plano (uma de cada vez, para não sobrecarregar o servidor)
// as leituras de Pendências, Membros, Notificações, Gabarito e Bloqueios. Elas ficam no cache da aba
// (DataService), então, quando a pessoa abre a página, ela aparece na hora, sem "Carregando".
//
// Embaixo de cada "Atualizar", um <span class="atualizado-em" data-leitura="..."> mostra quando os
// dados daquela página foram buscados no servidor pela última vez.
(function() {
  var LEITURAS = ["listarAprovacoes", "listarPendencias", "obterMembros", "obterNotificacoes", "obterGabaritoVagasCompleto", "listarBloqueios"];
  // Leitura -> autorização exigida (Membros > Autorizações). Sem autorização, não pré-carrega.
  var PERMISSAO_LEITURA = { listarAprovacoes: "aprovacoes", listarPendencias: "pendencias", obterMembros: "membros",
    obterNotificacoes: "notificacoes", obterGabaritoVagasCompleto: "gabarito", listarBloqueios: "bloqueios" };

  // Quantas leituras correm ao mesmo tempo (o Apps Script aguenta bem; uma de cada vez seria bem mais lento).
  var SIMULTANEAS = 3;
  var jaExecutou = false;

  // Tarefas permitidas ao cargo: as leituras acima + a tela Autorizações (parte de Membros).
  function tarefas() {
    var pode = window.AdminPermissoes ? window.AdminPermissoes.pode : function() { return true; };
    var lista = LEITURAS.filter(function(nome) { return pode(PERMISSAO_LEITURA[nome]); }).map(function(nome) {
      return function() { return DataService[nome](); };
    });
    if (pode("membros") && window.AutorizacoesPreCarga) lista.push(window.AutorizacoesPreCarga);
    return lista;
  }

  // Roda as tarefas (as "extras" primeiro) com até SIMULTANEAS ao mesmo tempo. A cada uma que termina,
  // chama progresso(0 a 100). Erros não interrompem: a página tenta de novo quando for aberta.
  function executar(extras, progresso) {
    jaExecutou = true;
    if (!window.DataService) { if (progresso) progresso(100); return Promise.resolve(); }
    var fila = (extras || []).concat(tarefas());
    var total = fila.length;
    var feitas = 0;
    var proxima = 0;
    function avisar() { if (progresso) progresso(total ? feitas * 100 / total : 100); }
    avisar();

    function trabalhador() {
      if (proxima >= total) return Promise.resolve();
      var tarefa = fila[proxima++];
      var rodar;
      try { rodar = Promise.resolve(tarefa()); } catch (e) { rodar = Promise.resolve(); }
      return rodar.catch(function() {}).then(function() { feitas++; avisar(); return trabalhador(); });
    }

    var trabalhadores = [];
    for (var i = 0; i < Math.min(SIMULTANEAS, total); i++) trabalhadores.push(trabalhador());
    return Promise.all(trabalhadores);
  }

  window.AdminPreCarga = { executar: executar };

  function textoIdade(ms) {
    if (!ms) return "";
    var min = Math.floor((Date.now() - ms) / 60000);
    if (min < 1) return "atualizado agora";
    if (min < 60) return "atualizado há " + min + " min";
    var d = new Date(ms);
    return "atualizado às " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  // Leituras em andamento: enquanto houver, o indicador mostra "Carregando" (nunca "atualizado agora" antes do fim).
  var emAndamento = {};
  window.addEventListener("leitura-admin-inicio", function(e) { emAndamento[e.detail.nome] = (emAndamento[e.detail.nome] || 0) + 1; atualizarIndicadores(); });
  window.addEventListener("leitura-admin-fim", function(e) { emAndamento[e.detail.nome] = Math.max(0, (emAndamento[e.detail.nome] || 1) - 1); atualizarIndicadores(); });

  function atualizarIndicadores() {
    if (!window.DataService || !DataService.infoCacheAdmin) return;
    document.querySelectorAll(".atualizado-em[data-leitura]").forEach(function(el) {
      if (el.dataset.manual === "1") return; // outra tela (ex.: Autorizações) está mostrando o próprio carregamento
      if (emAndamento[el.getAttribute("data-leitura")]) {
        el.textContent = "Carregando";
        el.classList.add("carregando-indicador");
        el.title = "";
        return;
      }
      el.classList.remove("carregando-indicador");
      var em = DataService.infoCacheAdmin(el.getAttribute("data-leitura"));
      el.textContent = textoIdade(em);
      el.title = em ? "Dados buscados no servidor em " + new Date(em).toLocaleString("pt-BR") : "";
    });
  }

  // Novo login depois que a tela de carregamento já passou (sessão expirada): pré-carrega em segundo plano.
  // No primeiro login quem chama é o admin-badges.js, junto com a tela "Carregando a administração".
  window.addEventListener("admin-auth-success", function() {
    setTimeout(function() { if (!jaExecutou) executar([], null); }, 1500);
  });
  window.addEventListener("cache-admin-gravado", atualizarIndicadores);
  window.addEventListener("painel-aberto", function() { setTimeout(atualizarIndicadores, 0); });
  document.addEventListener("DOMContentLoaded", function() {
    atualizarIndicadores();
    setInterval(atualizarIndicadores, 30000);
  });
})();
