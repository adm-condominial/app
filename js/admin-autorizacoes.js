// ==========================================
// MEMBROS > AUTORIZAÇÕES (o que cada cargo pode fazer)
// ==========================================
// O botão "Autorizações" fica ao lado de "Desfazer" e "Salvar alterações" e alterna (toggle) entre o
// formulário de Membros e uma tabela: cargos nas colunas, páginas/ações nas linhas. Enquanto a tabela
// está aberta, "Desfazer" e "Salvar alterações" valem para ela. Condomínio, Síndico e Desenvolvedor
// editam (a coluna do Condomínio, só o Desenvolvedor; a do Desenvolvedor fica toda marcada);
// os demais veem a tabela desabilitada. Caixas de ler em azul e de escrever em laranja, para não
// confundir as duas. O backend (autorizacoes.gs) confere tudo de novo.
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var NOMES = { condominio: "Condomínio", sindico: "Síndico", administradora: "Administradora", conselho: "Conselho", desenvolvedor: "Desenvolvedor" };
  var CURTOS = { condominio: "Cond.", sindico: "Síndico", administradora: "Adm.", conselho: "Conselho", desenvolvedor: "Dev." };
  var dados = null;       // resposta de fbObterAutorizacoes
  var atual = null;       // permissões sendo editadas
  var originais = "";
  var aberto = false;

  function el(id) { return document.getElementById(id); }

  function setStatus(texto, tipo) {
    var s = el("statusMembros");
    if (!s) return;
    s.className = "status" + (tipo ? " " + tipo : "");
    s.textContent = texto || "";
  }

  function fixa(cargo, chave) {
    return !!(dados && dados.fixas && dados.fixas[cargo] && dados.fixas[cargo].indexOf(chave) !== -1);
  }

  function renderizar() {
    var caixa = el("autorizacoesMembros");
    if (!caixa || !dados) return;
    // No celular, os nomes abreviados (Cond., Síndico, Adm., Conselho, Dev.).
    var cabecalho = '<tr><th>Páginas<br><span class="aut-ler-escrever"><span class="aut-legenda-ler">ler</span> <b class="aut-sep">|</b> <span class="aut-legenda-escrever">escrever</span></span></th>' + dados.cargos.map(function(c) {
      return '<th><span class="rotulo-longo">' + NOMES[c] + '</span><span class="rotulo-curto">' + CURTOS[c] + "</span></th>";
    }).join("") + "</tr>";
    // "tipo" (ler/escrever) dá a cor da caixa: ler em azul, escrever em laranja.
    function celulaCheck(chave, c, rotulo, tipo) {
      if (!chave) return '<span class="aut-sem-escrita" title="Esta página não tem o que escrever">—</span>';
      var marcado = fixa(c, chave) || (c === "desenvolvedor") || !!(atual[chave] && atual[chave][c]); // desenvolvedor: sempre tudo
      var travado = !dados.podeEditar || fixa(c, chave) || (dados.colunasTravadas || []).indexOf(c) !== -1;
      return '<label class="aut-check aut-check-' + tipo + (travado ? " travado" : "") + '" title="' + escaparHtml(NOMES[c] + " — " + rotulo) + '">' +
        '<input type="checkbox" data-chave="' + chave + '" data-cargo="' + c + '"' + (marcado ? " checked" : "") + (travado ? " disabled" : "") + '>' +
        '<span class="aut-caixa" aria-hidden="true"></span></label>';
    }
    var linhas = dados.linhas.map(function(l) {
      return "<tr><td>" + escaparHtml(l.rotulo) + (l.explicacao ? '<em class="aut-explicacao">' + escaparHtml(l.explicacao) + "</em>" : "") + "</td>" + dados.cargos.map(function(c) {
        return '<td class="aut-celula"><span class="aut-par">' + celulaCheck(l.ler, c, l.rotulo + " (ler)", "ler") +
          '<b class="aut-sep">|</b>' + celulaCheck(l.escrever, c, l.rotulo + " (escrever)", "escrever") + "</span></td>";
      }).join("") + "</tr>";
    }).join("");
    caixa.innerHTML =
      '<div class="aut-regras">' +
        '<p>Marque o que cada cargo pode <strong class="aut-legenda-ler">ver (ler)</strong> e <strong class="aut-legenda-escrever">alterar (escrever)</strong>.</p>' +
        '<ul>' +
          '<li><strong>Desenvolvedor</strong> → acesso a tudo; altera as colunas do Condomínio, Síndico, Conselho e Administradora</li>' +
          '<li><strong>Condomínio</strong> → altera as colunas do Síndico, Conselho e Administradora</li>' +
          '<li><strong>Síndico</strong> → altera as colunas do Conselho e da Administradora</li>' +
          '<li><strong>Conselho</strong> e <strong>Administradora</strong> → só visualizam esta tabela</li>' +
          '<li><strong>Conselho</strong> → sempre pode ver e escrever em Membros e Notificações, mas só no que é dele: o próprio e-mail de acesso e quais e-mails recebe (por isso essas caixinhas ficam travadas)</li>' +
        '</ul>' +
        (dados.podeEditar ? '' : '<p class="aut-so-ver">Você pode apenas visualizar esta tabela.</p>') +
      '</div>' +
      '<div class="aut-tabela-rolagem tabela-admin-rolagem"><table class="aut-tabela tabela-admin"><thead>' + cabecalho + "</thead><tbody>" + linhas + "</tbody></table></div>";
    atualizarBotoes();
  }

  function alterado() { return JSON.stringify(atual) !== originais; }
  window.AutorizacoesAbertas = function() { return aberto; };
  window.atualizarBotoesAutorizacoes = function() { atualizarBotoes(); };

  function atualizarBotoes() {
    if (!aberto) return;
    var salvar = el("btnSalvarMembros"), desfazer = el("btnDesfazerMembros");
    var pode = !!(dados && dados.podeEditar);
    // Quem só visualiza vê Desfazer/Salvar desativados (não somem: a linha continua com 3 botões).
    if (salvar) { salvar.hidden = false; salvar.disabled = !pode || !alterado(); }
    if (desfazer) { desfazer.hidden = false; desfazer.disabled = !pode || !alterado(); }
  }

  // Leitura antecipada (pré-carga do login): a 1ª abertura da tela usa esta resposta se for recente.
  var preCarga = null;
  window.AutorizacoesPreCarga = function() {
    return window.Backend.chamar("fbObterAutorizacoes", {}, true).then(function(r) {
      if (r && r.sucesso) preCarga = { r: r, em: Date.now() };
      return r;
    });
  };

  function carregar() {
    // "Carregando" no lugar do "atualizado há" ao lado do Atualizar: a página não pula.
    var indicador = document.querySelector("#painelMembros .atualizado-em");
    var textoAntes = indicador ? indicador.textContent : "";
    if (indicador) { indicador.dataset.manual = "1"; indicador.textContent = "Carregando"; indicador.classList.add("carregando-indicador"); }
    function restaurar() { if (indicador) { delete indicador.dataset.manual; indicador.textContent = textoAntes; indicador.classList.remove("carregando-indicador"); } }
    setStatus("", "");
    var antecipada = preCarga && Date.now() - preCarga.em < 150000 ? preCarga.r : null;
    preCarga = null;
    return (antecipada ? Promise.resolve(antecipada) : window.Backend.chamar("fbObterAutorizacoes", {}, true)).then(function(r) {
      if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível carregar as autorizações.");
      dados = r;
      atual = JSON.parse(JSON.stringify(r.permissoes));
      originais = JSON.stringify(atual);
      restaurar();
      renderizar();
    }).catch(function(erro) { restaurar(); setStatus((erro && erro.message) || "Não foi possível carregar as autorizações.", "erro"); });
  }

  function abrir(sim) {
    if (!sim && aberto && alterado() && !window.confirm("Há alterações não salvas nas autorizações. Fechar e descartar?")) return;
    aberto = sim;
    var botao = el("btnAutorizacoes");
    if (botao) { botao.classList.toggle("ativo", sim); botao.setAttribute("aria-pressed", sim ? "true" : "false"); }
    // Uma tela por vez: com Autorizações aberta, somem o formulário e a descrição de Membros.
    el("formMembros").hidden = sim;
    el("autorizacoesMembros").hidden = !sim;
    var titulo = document.querySelector("#painelMembros .painel-topo h2");
    if (titulo) titulo.textContent = "Membros";
    // A descrição troca de texto (não some), para os botões não pularem.
    var descricao = el("descricaoMembros");
    if (descricao) {
      if (!descricao.dataset.textoMembros) descricao.dataset.textoMembros = descricao.textContent;
      descricao.textContent = sim ? "O que cada cargo pode ver e fazer na área da administração." : descricao.dataset.textoMembros;
    }
    if (sim) {
      carregar();
    } else {
      setStatus("", "");
      if (typeof window.atualizarBotoesMembros === "function") window.atualizarBotoesMembros();
    }
  }

  function salvar() {
    preCarga = null;
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, "Aguarde: salvando as autorizações");
    window.Backend.chamar("fbSalvarAutorizacoes", { permissoes: atual }, true).then(function(r) {
      if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível salvar.");
      dados = r;
      atual = JSON.parse(JSON.stringify(r.permissoes));
      originais = JSON.stringify(atual);
      renderizar();
      setStatus("Autorizações salvas. Quem já está logado vê a mudança ao entrar de novo.", "ok");
    }).catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível salvar.", "erro"); })
      .then(function() { if (window.setOverlayAdmin) window.setOverlayAdmin(false); });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var botao = el("btnAutorizacoes");
    if (!botao || !window.Backend) return;
    botao.addEventListener("click", function() { abrir(!aberto); });
    // O × do topo, com Autorizações aberta, volta para Membros (em vez de fechar a página).
    document.querySelector("#painelMembros .btn-fechar-painel").addEventListener("click", function(e) {
      if (!aberto) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      abrir(false);
    }, true);
    el("autorizacoesMembros").addEventListener("change", function(e) {
      var c = e.target.closest("input[data-chave]");
      if (!c) return;
      var chave = c.getAttribute("data-chave"), cargo = c.getAttribute("data-cargo");
      atual[chave] = atual[chave] || {}; // autorização nova que ainda não veio do servidor
      atual[chave][cargo] = c.checked;
      // Escrever exige ler: marcar "escrever" marca "ler"; desmarcar "ler" desmarca "escrever".
      (dados.linhas || []).forEach(function(l) {
        if (l.escrever === chave && c.checked) { atual[l.ler] = atual[l.ler] || {}; atual[l.ler][cargo] = true; }
        if (l.ler === chave && !c.checked && l.escrever) { atual[l.escrever] = atual[l.escrever] || {}; atual[l.escrever][cargo] = false; }
      });
      renderizar();
    });
    // Com a tabela aberta, "Atualizar" recarrega as autorizações.
    el("btnAtualizarMembros").addEventListener("click", function(e) {
      if (!aberto) return;
      e.stopImmediatePropagation();
      if (alterado() && !window.confirm("Há alterações não salvas nas autorizações. Atualizar e descartar?")) return;
      carregar();
    }, true);
    // Com a tabela aberta, "Desfazer" e "Salvar alterações" valem para ela (fase de captura: antes do Membros).
    el("btnSalvarMembros").addEventListener("click", function(e) {
      if (!aberto) return;
      e.stopImmediatePropagation();
      salvar();
    }, true);
    el("btnDesfazerMembros").addEventListener("click", function(e) {
      if (!aberto) return;
      e.stopImmediatePropagation();
      atual = JSON.parse(originais);
      renderizar();
      setStatus("", "");
    }, true);
    window.addEventListener("painel-aberto", function(e) {
      if (e.detail && e.detail.id !== "painelMembros" && aberto) { aberto = false; abrir(false); }
    });
  });
})();
