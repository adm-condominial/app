// ==========================================
// CADASTROS PARA APROVAÇÃO (ADMIN): cadastros novos
// ==========================================
// Lista os cadastros novos enviados pelo formulário que aguardam aprovação, com todos os dados
// para conferência. Síndico, Condomínio e Desenvolvedor aprovam ou rejeitam (com motivo); o
// Conselho só visualiza (o backend, aprovacao.gs, confere o papel de novo).
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var carregando = false;

  function setStatus(texto, tipo) {
    var el = document.getElementById("statusAprovacoes");
    if (!el) return;
    el.className = "status" + (tipo ? " " + tipo : "");
    el.textContent = texto || "";
  }

  function dataHora(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    function dois(n) { return (n < 10 ? "0" : "") + n; }
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear() + " " + dois(d.getHours()) + ":" + dois(d.getMinutes());
  }

  function linha(rotulo, valor) {
    var t = String(valor == null ? "" : valor).trim();
    if (!t || t === "-") return "";
    return '<div class="aprov-linha"><span>' + rotulo + ":</span> " + escaparHtml(t) + "</div>";
  }

  var GRUPOS = [
    ["emergencias", "Emergência"], ["ocupantes", "Ocupantes"], ["carros", "Carros"], ["motos", "Motos"],
    ["bikes", "Bicicletas"], ["pets", "Pets"], ["prestadores", "Prestadores"]
  ];

  function grupos(g) {
    g = g || {};
    var html = GRUPOS.map(function(par) {
      var itens = String(g[par[0]] || "").split("\n").map(function(l) {
        return l.split("|").map(function(c) { return c.trim(); }).filter(Boolean).join(" · ");
      }).filter(Boolean);
      if (!itens.length) return "";
      return '<div class="aprov-grupo"><span>' + par[1] + " (" + itens.length + "):</span><ul>" +
        itens.map(function(i) { return "<li>" + escaparHtml(i) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
    return html || '<div class="aprov-linha aprov-vazio">Nenhum contato de emergência, ocupante, veículo, pet ou prestador informado.</div>';
  }

  function cartao(c, podeAprovar) {
    var tipo = c.tipo ? c.tipo + (c.moraNoImovel ? " — mora no imóvel: " + c.moraNoImovel : "") : "";
    var vaga = [c.vagaNumeroAndar, c.vagaSituacao, c.vagaAptoRelacionado ? "apto " + c.vagaAptoRelacionado : ""].filter(Boolean).join(" — ");
    var contratos = (c.contratos || []).map(function(x) {
      return '<a href="' + escaparHtml(x.url) + '" target="_blank" rel="noopener">' + escaparHtml(x.texto || "Contrato") + "</a>";
    }).join(" · ");
    return '<div class="aprovacao-item" data-id="' + escaparHtml(c.id) + '">' +
      '<div class="aprov-topo"><div><strong>Apto ' + escaparHtml(c.apto) + " — " + escaparHtml(c.nome || "-") + "</strong>" +
        '<div class="aprov-quando">Enviado em ' + escaparHtml(dataHora(c.enviadoEm)) + "</div></div></div>" +
      linha("Vínculo", tipo) + linha("CPF", c.cpf) + linha("Nascimento", c.nasc) + linha("RG", c.rg) +
      linha("Celular", c.celular) + linha("Telefone", c.telFixo) + linha("E-mail", c.email || "não informado (o morador não receberá a decisão por e-mail)") +
      linha("Proprietário / administradora", c.inqPropAdmin) + linha("Contato", c.inqContato) + linha("Vigência do contrato", c.inqVigencia) +
      (contratos ? '<div class="aprov-linha"><span>Contrato:</span> ' + contratos + "</div>" : "") +
      linha("Vaga", vaga) +
      '<div class="aprov-mapa" hidden></div>' +
      '<details class="aprov-detalhes"><summary>Demais dados</summary>' + grupos(c.grupos) + linha("Observações", c.observacoes) + "</details>" +
      (podeAprovar
        ? '<div class="aprov-acoes"><button type="button" class="btn-aprovar">Aprovar</button><button type="button" class="btn-rejeitar">Rejeitar</button></div>' +
          '<div class="aprov-rejeicao" hidden><label>Motivo da rejeição (vai no e-mail para o morador):</label>' +
            '<textarea class="aprov-motivo" rows="3" maxlength="600"></textarea>' +
            '<div class="aprov-acoes"><button type="button" class="btn-confirmar-rejeicao">Confirmar rejeição</button><button type="button" class="btn-cancelar-rejeicao">Cancelar</button></div></div>'
        : "") +
    "</div>";
  }

  // A última contagem fica guardada (js/admin-badges.js) e aparece assim que a página abre.
  function atualizarContador(total) {
    if (window.BadgeMenu) window.BadgeMenu.definir("contadorAprovacoes", total);
  }

  function renderizar(r) {
    var itens = r.itens || [];
    atualizarContador(itens.length);
    var aviso = document.getElementById("avisoSoVisualizarAprovacoes");
    if (aviso) aviso.hidden = !!r.podeAprovar;
    document.getElementById("listaAprovacoes").innerHTML = itens.length
      ? itens.map(function(c) { return cartao(c, r.podeAprovar); }).join("")
      : '<p class="sem-itens">Nenhum cadastro aguardando aprovação.</p>';
    itens.forEach(desenharMapa);
  }

  // Miniatura do andar com a vaga pintada (a mesma do formulário); toque abre o mapa completo.
  // vagaNumeroAndar vem do formulário: "14 / G1" ou "1 / 2 / G2" (o andar é a última parte).
  function desenharMapa(c) {
    if (!window.VagaMiniatura || !c.vagaNumeroAndar) return;
    var partes = String(c.vagaNumeroAndar).split("/").map(function(p) { return p.trim(); });
    if (partes.length < 2) return;
    var andar = partes.pop(), vaga = partes.join(" / ");
    window.VagaMiniatura.montar(andar, vaga).then(function(svg) {
      var item = document.querySelector('.aprovacao-item[data-id="' + c.id + '"] .aprov-mapa');
      if (!svg || !item) return;
      var link = document.createElement("a");
      link.href = window.VagaMiniatura.urlMapa(c.apto, andar, vaga);
      link.target = "_blank";
      link.rel = "noopener";
      link.title = "Abrir o mapa completo da garagem";
      link.appendChild(svg);
      item.innerHTML = "";
      item.appendChild(link);
      item.hidden = false;
    }).catch(function() {});
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    setStatus("Carregando", "carregando");
    DataService.listarAprovacoes()
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível carregar os cadastros pendentes.");
        setStatus("", "");
        renderizar(r);
      })
      .catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível carregar os cadastros pendentes.", "erro"); })
      .then(function() { carregando = false; });
  }

  function decidir(id, decisao, motivo) {
    if (decisao === "aprovar" && !window.confirm("Aprovar este cadastro? Ele passa a valer no sistema (consulta e relatórios) e o morador recebe a confirmação por e-mail.")) return;
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, decisao === "aprovar" ? "Aguarde: aprovando" : "Aguarde: rejeitando");
    DataService.decidirAprovacao(id, decisao, motivo)
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível registrar a decisão.");
        setStatus(r.mensagem, "ok");
        return DataService.listarAprovacoes().then(function(lista) { if (lista && lista.sucesso) renderizar(lista); });
      })
      .catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível registrar a decisão.", "erro"); })
      .then(function() { if (window.setOverlayAdmin) window.setOverlayAdmin(false); });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var painel = document.getElementById("painelAprovacoes");
    if (!painel || !window.DataService) return;
    window.addEventListener("painel-aberto", function(e) {
      if (e.detail && e.detail.id === "painelAprovacoes") carregar();
    });
    window.addEventListener("dados-admin-atualizados", function(e) {
      if (e.detail && e.detail.nome === "listarAprovacoes" && !painel.hidden) setTimeout(carregar, 50);
    });
    // Contador no botão do menu: atualiza sempre que a leitura chega (pré-carga, revalidação).
    window.addEventListener("cache-admin-gravado", function(e) {
      if (!e.detail || e.detail.nome !== "listarAprovacoes") return;
      DataService.listarAprovacoes().then(function(r) { if (r && r.sucesso) atualizarContador((r.itens || []).length); }).catch(function() {});
    });
    document.getElementById("btnAtualizarAprovacoes").addEventListener("click", function() {
      DataService.limparCacheAdmin("listarAprovacoes");
      carregar();
    });
    painel.addEventListener("click", function(e) {
      var item = e.target.closest(".aprovacao-item");
      if (!item) return;
      var id = item.getAttribute("data-id");
      var caixa = item.querySelector(".aprov-rejeicao");
      if (e.target.closest(".btn-aprovar")) decidir(id, "aprovar", "");
      else if (e.target.closest(".btn-rejeitar")) { caixa.hidden = false; item.querySelector(".aprov-motivo").focus(); }
      else if (e.target.closest(".btn-cancelar-rejeicao")) caixa.hidden = true;
      else if (e.target.closest(".btn-confirmar-rejeicao")) {
        var motivo = item.querySelector(".aprov-motivo").value.trim();
        if (!motivo) { setStatus("Escreva o motivo da rejeição: ele vai no e-mail para o morador.", "erro"); return; }
        decidir(id, "rejeitar", motivo);
      }
    });
  });
})();
