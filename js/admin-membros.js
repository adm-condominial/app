// ==========================================
// MEMBROS DA ADMINISTRAÇÃO (ADMIN)
// ==========================================
// Define quem acessa a área restrita: e-mail do condomínio, síndico, membros do conselho (quantos
// quiser: "+ Adicionar membro no conselho" e "Apagar", só condomínio, síndico e desenvolvedor), administradora e
// desenvolvedor. Para cada cargo (menos o condomínio) escolhe-se o morador; aparecem nome e
// telefone, e o e-mail de acesso pode ser o do cadastro (padrão, campo travado) ou outro.
//
// A tela já trava o que o papel de quem está logado não pode mudar; o backend (membros.gs)
// confere de novo ao salvar:
//   condomínio e desenvolvedor: tudo;
//   síndico: não troca o síndico; edita o próprio e-mail de acesso e o conselho;
//   conselho: cada membro edita só o próprio e-mail de acesso.
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var MAX_CONSELHO = 10;
  // Cargos na tela: síndico, um por membro do conselho (quantos houver) e desenvolvedor.
  function cargosLista() {
    var lista = [{ chave: "sindico", titulo: "Síndico" }];
    (membros && membros.conselho || []).forEach(function(c, i) {
      lista.push({ chave: "conselho", indice: i, titulo: "Conselho — membro " + (i + 1) });
    });
    lista.push({ chave: "desenvolvedor", titulo: "Desenvolvedor" });
    return lista;
  }
  // Acrescentar/apagar membros do conselho: condomínio, síndico e desenvolvedor.
  function podeMudarConselho() { return papel === "condominio" || papel === "sindico" || papel === "desenvolvedor"; }

  var membros = null;      // o que está na tela
  var originais = "";      // JSON do que veio do backend
  var candidatos = [];     // moradores que podem ser escolhidos
  var papel = "";
  var indicePapel = null;
  var carregado = false;
  var carregando = false;

  function setStatus(texto, tipo) {
    var el = document.getElementById("statusMembros");
    if (!el) return;
    el.className = "status" + (tipo ? " " + tipo : "");
    el.textContent = texto || "";
  }

  function candidatoPorId(id) {
    return candidatos.filter(function(c) { return c.id === id; })[0] || null;
  }

  function cargoDe(def) {
    return def.chave === "conselho" ? membros.conselho[def.indice] : membros[def.chave];
  }

  // O que o papel logado pode editar em cada parte da tela.
  function pode(parte, def) {
    if (papel === "condominio" || papel === "desenvolvedor") return true;
    if (papel === "sindico") {
      if (parte === "condominio") return false;
      if (parte === "administradora") return true;
      if (def && def.chave === "desenvolvedor") return false;
      if (def && def.chave === "sindico") return parte === "email"; // não troca o síndico
      if (def && def.chave === "conselho") return true;
      return false;
    }
    if (papel === "conselho") {
      return !!def && def.chave === "conselho" && def.indice === indicePapel && parte === "email";
    }
    return false;
  }

  function opcoesMoradores(selecionado) {
    return '<option value="">— ninguém —</option>' + candidatos.map(function(c) {
      var rotulo = c.apto + " · " + (c.nome || "(sem nome)") + (c.tipo ? " (" + c.tipo + ")" : "");
      return '<option value="' + escaparHtml(c.id) + '"' + (c.id === selecionado ? " selected" : "") + ">" + escaparHtml(rotulo) + "</option>";
    }).join("");
  }

  function cargoHtml(def, i) {
    var cargo = cargoDe(def);
    var morador = candidatoPorId(cargo.cadastroId);
    var podeMorador = pode("morador", def);
    var podeEmail = pode("email", def) && !!cargo.cadastroId;
    var emailMostrado = cargo.usarEmailCadastro ? ((morador && morador.email) || "") : cargo.email;
    var info = morador
      ? escaparHtml(morador.nome || "(sem nome)") + (morador.celular ? " · " + escaparHtml(morador.celular) : " · sem telefone")
      : (cargo.cadastroId ? "Morador não encontrado (pode ter se mudado)" : "");
    var semEmailNoCadastro = morador && cargo.usarEmailCadastro && !morador.email;
    return '<div class="cargo-membro cargo-' + def.chave + (def.chave === "conselho" ? " cargo-conselho-" + def.indice : "") + '" data-i="' + i + '">' +
      '<div class="cargo-titulo">' + escaparHtml(def.titulo) +
        // Todos veem; só condomínio, síndico e desenvolvedor podem usar (os outros: desativado).
        (def.chave === "conselho"
          ? ' <button type="button" class="btn-apagar-conselho" data-indice="' + def.indice + '" title="' + (podeMudarConselho() ? 'Apagar este membro do conselho' : 'Só o Condomínio, o Síndico e o Desenvolvedor apagam membros') + '" aria-label="Apagar ' + escaparHtml(def.titulo) + '"' + (podeMudarConselho() ? '' : ' disabled') + '>Apagar</button>'
          : "") + "</div>" +
      '<select data-campo="cadastroId" aria-label="Apartamento do ' + escaparHtml(def.titulo) + '"' + (podeMorador ? "" : " disabled") + ">" + opcoesMoradores(cargo.cadastroId) + "</select>" +
      (info ? '<div class="cargo-info">' + info + "</div>" : "") +
      '<input type="email" data-campo="email" placeholder="' + (cargo.usarEmailCadastro ? (semEmailNoCadastro ? "o cadastro não tem e-mail" : "e-mail do cadastro") : "e-mail de acesso") +
        '" aria-label="E-mail de acesso" value="' + escaparHtml(emailMostrado || "") + '"' + (podeEmail && !cargo.usarEmailCadastro ? "" : " disabled") + ">" +
      '<label class="cargo-check"><input type="checkbox" data-campo="usarEmailCadastro"' + (cargo.usarEmailCadastro ? " checked" : "") + (podeEmail ? "" : " disabled") +
        "> Utilizar mesmo e-mail do cadastro</label>" +
      (semEmailNoCadastro ? '<div class="cargo-aviso">⚠️ O cadastro deste morador não tem e-mail: desmarque e informe um.</div>' : "") +
    "</div>";
  }

  function renderizar() {
    var form = document.getElementById("formMembros");
    if (!form || !membros) return;
    var lista = cargosLista();
    var html = {};
    lista.forEach(function(def, i) { html[def.chave + (def.chave === "conselho" ? def.indice : "")] = cargoHtml(def, i); });
    var conselhoHtml = (membros.conselho || []).map(function(c, i) { return html["conselho" + i]; }).join("");
    // Tela larga, 2 colunas: Condomínio | Administradora na 1ª linha; embaixo, Síndico e
    // Desenvolvedor | membros do conselho e, por último, "+ Adicionar membro no conselho" (largura toda
    // da coluna, como os botões de acrescentar do formulário do morador). Assim o membro 1 fica na
    // altura do Síndico. No celular, uma coluna: Condomínio, Síndico, Administradora, Conselho, Desenvolvedor.
    var podeAcrescentar = podeMudarConselho() && (membros.conselho || []).length < MAX_CONSELHO;
    form.innerHTML =
      '<div class="membros-coluna membros-coluna-1">' +
        '<div class="cargo-membro cargo-condominio"><div class="cargo-titulo">Condomínio</div>' +
          '<input type="email" id="emailCondominio" placeholder="e-mail de acesso do condomínio" aria-label="E-mail de acesso do condomínio" value="' +
          escaparHtml(membros.condominio.email || "") + '"' + (pode("condominio") ? "" : " disabled") + "></div>" +
        '<div class="membros-lista membros-lista-1">' + html.sindico + html.desenvolvedor + "</div>" +
      "</div>" +
      '<div class="membros-coluna membros-coluna-2">' +
        // Administradora: o acesso segue Membros > Autorizações.
        '<div class="cargo-membro cargo-administradora"><div class="cargo-titulo">Administradora <span class="cargo-nota">(acesso conforme as Autorizações)</span></div>' +
          '<input type="email" id="emailAdministradora" placeholder="e-mail de acesso da administradora (opcional)" aria-label="E-mail de acesso da administradora" value="' +
          escaparHtml((membros.administradora && membros.administradora.email) || "") + '"' + (pode("administradora") ? "" : " disabled") + "></div>" +
        '<div class="membros-lista membros-lista-2">' +
          (conselhoHtml || '<div class="cargo-info conselho-vazio">Nenhum membro do conselho.</div>') +
          // Todos veem; só condomínio, síndico e desenvolvedor podem usar (os outros: desativado).
          '<button type="button" class="btn-add btn-adicionar-conselho" title="' + (podeMudarConselho()
            ? (podeAcrescentar ? 'Acrescentar membro do conselho' : 'O conselho já tem ' + MAX_CONSELHO + ' membros')
            : 'Só o Condomínio, o Síndico e o Desenvolvedor acrescentam membros') + '"' + (podeAcrescentar ? '' : ' disabled') + '>+ Adicionar membro no conselho</button>' +
        "</div>" +
      "</div>";
    atualizarBotoes();
  }

  function paraEnviar() {
    var copia = JSON.parse(JSON.stringify(membros));
    [copia.sindico, copia.desenvolvedor].concat(copia.conselho).forEach(function(c) { if (c.usarEmailCadastro) c.email = ""; });
    return copia;
  }

  function atualizarBotoes() {
    // Com Membros > Autorizações aberta, os botões são dela (admin-autorizacoes.js): não mexe.
    if (window.AutorizacoesAbertas && window.AutorizacoesAbertas()) { if (window.atualizarBotoesAutorizacoes) window.atualizarBotoesAutorizacoes(); return; }
    var alterado = JSON.stringify(paraEnviar()) !== originais;
    var salvar = document.getElementById("btnSalvarMembros");
    var desfazer = document.getElementById("btnDesfazerMembros");
    var podeAlgo = !!papel;
    if (salvar) { salvar.disabled = !alterado; salvar.hidden = !podeAlgo; }
    if (desfazer) { desfazer.disabled = !alterado; desfazer.hidden = !podeAlgo; }
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    setStatus("Carregando", "carregando");
    DataService.obterMembros()
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível carregar os membros.");
        membros = r.membros;
        candidatos = r.candidatos || [];
        papel = r.papel || "";
        indicePapel = r.indice;
        originais = JSON.stringify(paraEnviar());
        carregado = true;
        document.getElementById("painelMembros").classList.add("conteudo-carregado");
        var quem = r.nomePapel ? "Você está como " + r.nomePapel + (papel === "conselho" ? " (membro " + (indicePapel + 1) + ")" : "") + "." : "";
        setStatus((r.configurado ? "" : "Ainda não configurado: o acesso segue a lista inicial até o primeiro Salvar. ") + quem, "");
        renderizar();
      })
      .catch(function(erro) { setStatus((erro && erro.message) || "Não foi possível carregar os membros.", "erro"); })
      .then(function() { carregando = false; });
  }

  function salvar() {
    var botao = document.getElementById("btnSalvarMembros");
    if (botao) botao.disabled = true;
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, "Aguarde: salvando os membros");
    DataService.salvarMembros(paraEnviar())
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível salvar.");
        membros = r.membros;
        originais = JSON.stringify(paraEnviar());
        renderizar();
        var comp = r.compartilhamento || {};
        var extra = (comp.adicionados && comp.adicionados.length ? " Pasta do Drive compartilhada com: " + comp.adicionados.join(", ") + "." : "") +
          (comp.removidos && comp.removidos.length ? " Acesso à pasta retirado de: " + comp.removidos.join(", ") + "." : "") +
          (comp.falhas && comp.falhas.length ? " Não foi possível compartilhar a pasta com: " + comp.falhas.join(", ") + " (precisa ser conta Google)." : "");
        setStatus("Salvo. O acesso à área restrita já segue esta lista." + extra, "ok");
        window.dispatchEvent(new CustomEvent("cadastro-alterado"));
      })
      .catch(function(erro) {
        setStatus((erro && erro.message) || "Não foi possível salvar.", "erro");
        atualizarBotoes();
      })
      .then(function() { if (window.setOverlayAdmin) window.setOverlayAdmin(false); });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var form = document.getElementById("formMembros");
    if (!form || !window.DataService) return;

    // Cache da área admin (DataService): abre na hora com o último resultado e revalida em segundo plano.
    window.addEventListener("painel-aberto", function(e) {
      if (e.detail && e.detail.id === "painelMembros" && (!carregado || JSON.stringify(paraEnviar()) === originais)) carregar();
    });
    window.addEventListener("dados-admin-atualizados", function(e) {
      var painelEl = document.getElementById("painelMembros");
      if (e.detail && e.detail.nome === "obterMembros" && painelEl && !painelEl.hidden && (!carregado || JSON.stringify(paraEnviar()) === originais)) setTimeout(carregar, 50); // depois do carregamento em andamento
    });
    document.getElementById("btnAtualizarMembros").addEventListener("click", function() {
      if (!((!carregado || JSON.stringify(paraEnviar()) === originais)) && !window.confirm("Há alterações não salvas. Atualizar e descartar?")) return;
      DataService.limparCacheAdmin("obterMembros");
      carregar();
    });

    form.addEventListener("input", function(e) {
      if (e.target.id === "emailCondominio") { membros.condominio.email = e.target.value.trim().toLowerCase(); atualizarBotoes(); return; }
      if (e.target.id === "emailAdministradora") { membros.administradora = { email: e.target.value.trim().toLowerCase() }; atualizarBotoes(); return; }
      var bloco = e.target.closest(".cargo-membro[data-i]");
      if (!bloco || e.target.getAttribute("data-campo") !== "email") return;
      cargoDe(cargosLista()[Number(bloco.getAttribute("data-i"))]).email = e.target.value.trim().toLowerCase();
      atualizarBotoes();
    });

    // "+" acrescenta um membro do conselho em branco; "Apagar" tira o membro (vale ao salvar).
    form.addEventListener("click", function(e) {
      if (e.target.closest(".btn-adicionar-conselho")) {
        membros.conselho = (membros.conselho || []).concat([{ cadastroId: "", usarEmailCadastro: true, email: "" }]);
        renderizar();
        return;
      }
      var apagar = e.target.closest(".btn-apagar-conselho");
      if (apagar) {
        var i = Number(apagar.getAttribute("data-indice"));
        var c = membros.conselho[i];
        var morador = c && candidatoPorId(c.cadastroId);
        if ((c.cadastroId || c.email) && !window.confirm("Apagar o membro " + (i + 1) + " do conselho" + (morador ? " (" + (morador.nome || "") + ")" : "") + "? Ele perde o acesso ao salvar.")) return;
        membros.conselho.splice(i, 1);
        renderizar();
      }
    });

    form.addEventListener("change", function(e) {
      var bloco = e.target.closest(".cargo-membro[data-i]");
      if (!bloco) return;
      var cargo = cargoDe(cargosLista()[Number(bloco.getAttribute("data-i"))]);
      var campo = e.target.getAttribute("data-campo");
      if (campo === "cadastroId") {
        cargo.cadastroId = e.target.value;
        cargo.usarEmailCadastro = true;   // ao trocar o morador, volta a usar o e-mail do cadastro
        cargo.email = "";
      } else if (campo === "usarEmailCadastro") {
        cargo.usarEmailCadastro = e.target.checked;
        // Ao desmarcar, começa com o e-mail do cadastro para facilitar a edição.
        if (!cargo.usarEmailCadastro && !cargo.email) {
          var morador = candidatoPorId(cargo.cadastroId);
          cargo.email = (morador && morador.email) || "";
        }
      } else {
        return;
      }
      renderizar();
    });

    window.atualizarBotoesMembros = atualizarBotoes; // a página Autorizações devolve os botões ao fechar
    document.getElementById("btnSalvarMembros").addEventListener("click", salvar);
    document.getElementById("btnDesfazerMembros").addEventListener("click", function() {
      membros = JSON.parse(originais);
      renderizar();
      setStatus("", "");
    });
  });
})();
