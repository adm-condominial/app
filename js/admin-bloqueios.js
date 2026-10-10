// ==========================================
// BLOQUEIOS (ADMIN): CPFs bloqueados após 5 tentativas erradas
// ==========================================
// Lista os bloqueios em vigor (com motivo, tipo de erro e as tentativas) e o histórico dos já
// desbloqueados. "Desbloquear" só libera o acesso: o registro continua, completado com quem
// desbloqueou e quando (backend: bloqueios.gs).
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var carregado = false;
  var carregando = false;

  function setStatus(texto, tipo) {
    var el = document.getElementById("statusBloqueios");
    if (!el) return;
    el.className = "status" + (tipo ? " " + tipo : "");
    el.textContent = texto || "";
  }

  function dataHora(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    function dois(n) { return (n < 10 ? "0" : "") + n; }
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear() + " " + dois(d.getHours()) + ":" + dois(d.getMinutes()) + ":" + dois(d.getSeconds());
  }

  function cpfFormatado(cpf) {
    var d = String(cpf || "");
    return d.length === 11 ? d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9) : d;
  }

  function cartao(b, ativo) {
    var quem = b.nome ? escaparHtml(b.nome) + (b.apto ? " · apto " + escaparHtml(b.apto) : "") : '<span class="bloq-sem-cadastro">sem cadastro com este CPF</span>';
    var tentativas = (b.tentativas || []).map(function(t) {
      return "<li>" + escaparHtml(dataHora(t.quando)) + " — " + escaparHtml(t.tipo) + " (" + escaparHtml(t.origem) + ")</li>";
    }).join("");
    return '<div class="bloqueio-item' + (ativo ? "" : " antigo") + '">' +
      '<div class="bloq-topo"><div><strong>CPF ' + escaparHtml(cpfFormatado(b.cpf)) + "</strong><div class=\"bloq-quem\">" + quem + "</div></div>" +
        (ativo ? '<button type="button" class="btn-desbloquear" data-id="' + escaparHtml(b.id) + '">Desbloquear</button>' : "") + "</div>" +
      '<div class="bloq-linha"><span>Bloqueado em:</span> ' + escaparHtml(dataHora(b.bloqueadoEm)) + "</div>" +
      '<div class="bloq-linha"><span>Motivo:</span> ' + escaparHtml(b.motivo) + "</div>" +
      '<div class="bloq-linha"><span>Tipo de erro:</span> ' + escaparHtml(b.tipoErro) + "</div>" +
      (ativo ? "" : '<div class="bloq-linha"><span>Desbloqueado em:</span> ' + escaparHtml(dataHora(b.desbloqueadoEm)) + " por " + escaparHtml(b.desbloqueadoPor || "-") + "</div>") +
      (tentativas ? '<details class="bloq-tentativas"><summary>Tentativas (' + b.tentativas.length + ")</summary><ul>" + tentativas + "</ul></details>" : "") +
    "</div>";
  }

  function renderizar(r) {
    var ativos = r.ativos || [];
    var historico = r.historico || [];
    document.getElementById("listaBloqueiosAtivos").innerHTML = ativos.length
      ? ativos.map(function(b) { return cartao(b, true); }).join("")
      : '<p class="sem-itens">Nenhum CPF bloqueado no momento.</p>';
    document.getElementById("listaBloqueiosHistorico").innerHTML = historico.length
      ? historico.map(function(b) { return cartao(b, false); }).join("")
      : '<p class="sem-itens">Nenhum bloqueio anterior.</p>';
    document.getElementById("tituloBloqueiosAtivos").textContent = "Bloqueados agora (" + ativos.length + ")";
    document.getElementById("tituloBloqueiosHistorico").textContent = "Histórico (" + historico.length + ")";
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    setStatus("Carregando", "carregando");
    DataService.listarBloqueios()
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível carregar os bloqueios.");
        carregado = true;
        setStatus("", "");
        renderizar(r);
      })
      .catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível carregar os bloqueios.", "erro"); })
      .then(function() { carregando = false; });
  }

  function desbloquear(id) {
    if (!window.confirm("Desbloquear este CPF? A pessoa volta a poder consultar e atualizar o cadastro. O registro do bloqueio continua no histórico.")) return;
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, "Aguarde: desbloqueando");
    DataService.desbloquearCpf(id)
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível desbloquear.");
        renderizar(r);
        setStatus("CPF desbloqueado. O registro foi para o histórico, com o seu e-mail e a data e hora.", "ok");
      })
      .catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível desbloquear.", "erro"); })
      .then(function() { if (window.setOverlayAdmin) window.setOverlayAdmin(false); });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var painel = document.getElementById("painelBloqueios");
    if (!painel || !window.DataService) return;
    // Cache da área admin (DataService): abre na hora com o último resultado e revalida em segundo plano.
    window.addEventListener("painel-aberto", function(e) {
      if (e.detail && e.detail.id === "painelBloqueios" && true) carregar();
    });
    window.addEventListener("dados-admin-atualizados", function(e) {
      var painelEl = document.getElementById("painelBloqueios");
      if (e.detail && e.detail.nome === "listarBloqueios" && painelEl && !painelEl.hidden && true) setTimeout(carregar, 50); // depois do carregamento em andamento
    });
    document.getElementById("btnAtualizarBloqueios").addEventListener("click", function() {
      if (!(true) && !window.confirm("Há alterações não salvas. Atualizar e descartar?")) return;
      DataService.limparCacheAdmin("listarBloqueios");
      carregar();
    });
    painel.addEventListener("click", function(e) {
      var botao = e.target.closest(".btn-desbloquear");
      if (botao) desbloquear(botao.getAttribute("data-id"));
    });
  });
})();
