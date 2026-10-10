// ==========================================
// BARRA DE AÇÕES DO CADASTRO + IDENTIFICAÇÃO DE QUEM ESTÁ LOGADO
// ==========================================
// Com o cadastro aberto, a barra "Atualizar cadastro" / "Fechar visualização" aparece no lugar vazio
// logo acima de "Qual é o seu vínculo com a unidade?" (o mesmo lugar do aviso da sessão). Quando o
// morador rola para baixo, a barra desce para o topo da tela e acompanha a rolagem; quando chega aos
// botões de baixo, ela some (os de baixo já estão à vista).
// No topo da página, logo abaixo dos links, "identidadeLogado" mostra nome, apto e e-mail de quem está
// logado (pela sessão, mesmo sem o cadastro aberto). Ao rolar para baixo, ela vira faixa fixa e a barra
// de ações se acumula logo abaixo dela.
// Os botões da barra só "clicam" nos botões originais: a lógica de envio é a mesma.
(function() {
  var barra, lugar, form, acoesDeBaixo, identidade, identidadeTexto, lugarIdentidade;

  function cadastroCarregado() {
    var secao = document.getElementById("secTipoResidente");
    var enviar = document.getElementById("btnEnviarForm");
    if (!secao || secao.classList.contains("hidden") || !enviar) return false;
    // Novo cadastro: só depois que o apartamento é escolhido.
    if (/atualizar/i.test(enviar.textContent || "")) return true;
    var apto = document.getElementById("apto");
    return !!apto && !!apto.value;
  }

  function noCampoDeVisao(el) {
    var r = el.getBoundingClientRect();
    return r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
  }

  // Login da área de admin, se for da administradora (ela não tem cadastro de morador).
  function pessoaAdministradora() {
    try {
      var u = JSON.parse(sessionStorage.getItem("adminSimplesAuthUser") || "null");
      if (u && u.papel === "administradora" && u.email && sessionStorage.getItem("adminSimplesAuthToken")) return u;
    } catch (e) {}
    return null;
  }

  // Nome, apto e e-mail de quem está com o cadastro aberto (campos do próprio formulário).
  function atualizarIdentidade() {
    var nome = "", apto = "", email = "";
    if (cadastroCarregado() && (document.getElementById("moradorNome") || {}).value) {
      nome = document.getElementById("moradorNome").value;
      email = (document.getElementById("moradorEmail") || {}).value || "";
      apto = document.getElementById("apto") && document.getElementById("apto").value || "";
      // Guarda quem é na sessão (ex.: entrou pelo kit), para o topo mostrar o nome sem abrir o cadastro.
      var sessaoAtual = window.SessaoMorador && window.SessaoMorador.obter && window.SessaoMorador.obter();
      if (sessaoAtual && !sessaoAtual.pessoa && nome.trim()) {
        window.SessaoMorador.iniciar(sessaoAtual.cpf, sessaoAtual.nasc, { nome: nome, apto: apto, email: email });
      }
    } else if (window.SessaoMorador && window.SessaoMorador.pessoa && window.SessaoMorador.pessoa()) {
      var p = window.SessaoMorador.pessoa();
      nome = p.nome || ""; email = p.email || ""; apto = p.apto || "";
    }
    nome = String(nome).trim();
    // Com a sessão aberta, a faixa aparece sempre (com o "Sair"), mesmo sem o nome carregado ainda.
    var sessao = !!(window.SessaoMorador && window.SessaoMorador.obter && window.SessaoMorador.obter());
    // Administradora logada (sem cadastro de morador): mostra "Administradora - e-mail".
    var administradora = pessoaAdministradora();
    identidade.hidden = !nome && !sessao && !administradora;
    if (identidade.hidden) return;
    identidadeTexto.textContent = nome
      ? [nome, apto ? "Apto " + apto : "", String(email).trim()].filter(Boolean).join(" · ")
      : (administradora ? "Administradora - " + administradora.email : "Você está conectado");
  }

  function atualizar() {
    if (!barra) return;
    atualizarIdentidade();

    // Identidade: quando o aviso sai do topo da tela, ela vira faixa fixa no topo.
    var identidadeFixa = !identidade.hidden && lugarIdentidade.getBoundingClientRect().bottom < 0;
    identidade.classList.toggle("fixa", identidadeFixa);
    lugarIdentidade.hidden = identidade.hidden;
    if (!identidade.hidden) {
      lugarIdentidade.style.height = identidade.offsetHeight + "px";
      var largura = lugarIdentidade.getBoundingClientRect().width + "px";
      var esquerda = lugarIdentidade.getBoundingClientRect().left + "px";
      identidade.style.width = largura;
      identidade.style.left = esquerda;
    }

    var mostrar = cadastroCarregado() && !noCampoDeVisao(acoesDeBaixo);
    barra.hidden = !mostrar;
    lugar.hidden = !mostrar;
    document.body.classList.toggle("com-barra-acoes", mostrar);
    if (!mostrar) return;

    var enviar = document.getElementById("btnEnviarForm");
    var botaoEnviar = barra.querySelector(".barra-acao-enviar");
    botaoEnviar.textContent = (enviar.textContent || "Atualizar cadastro").trim();
    botaoEnviar.disabled = enviar.disabled;
    barra.querySelector(".barra-acao-fechar").textContent = (document.getElementById("btnSairSemAlterar").textContent || "Fechar visualização").trim();

    // Rolou para baixo (o lugar da barra saiu do topo): a barra vira flutuante e acompanha a rolagem.
    // Prende quando o lugar sobe até o topo (abaixo da faixa de identificação, se ela estiver fixa).
    var fixa = lugar.getBoundingClientRect().top < (identidadeFixa ? identidade.offsetHeight : 0);
    barra.classList.toggle("fixa", fixa);
    var r = form.getBoundingClientRect();
    barra.style.left = r.left + "px";
    barra.style.width = r.width + "px";
    barra.style.top = identidadeFixa ? identidade.offsetHeight + "px" : "0px";
    if (!fixa) lugar.style.height = barra.offsetHeight + "px";
    document.documentElement.style.setProperty("--altura-barra-acoes", barra.offsetHeight + "px");
    document.documentElement.style.setProperty("--altura-topo-fixo", (identidadeFixa ? identidade.offsetHeight : 0) + barra.offsetHeight + "px");
  }

  document.addEventListener("DOMContentLoaded", function() {
    var secao = document.getElementById("secTipoResidente");
    acoesDeBaixo = document.querySelector(".form-actions");
    form = document.getElementById("cadForm");
    if (!secao || !acoesDeBaixo || !form) return;

    // Lugar da barra: fica no fluxo da página logo antes da seção "Qual é o seu vínculo".
    lugar = document.createElement("div");
    lugar.className = "barra-acoes-lugar";
    lugar.hidden = true;
    barra = document.createElement("div");
    barra.className = "barra-acoes-flutuante";
    barra.hidden = true;
    barra.innerHTML =
      '<button type="button" class="btn-submit barra-acao-enviar">Atualizar cadastro</button>' +
      '<button type="button" class="btn-secondary barra-acao-fechar">Fechar visualização</button>';
    lugar.appendChild(barra);
    secao.parentNode.insertBefore(lugar, secao);

    // Identidade: depois do aviso da sessão, dentro da consulta.
    lugarIdentidade = document.createElement("div");
    lugarIdentidade.className = "identidade-lugar";
    lugarIdentidade.hidden = true;
    identidade = document.createElement("div");
    identidade.id = "identidadeLogado";
    identidade.className = "identidade-logado";
    identidade.hidden = true;
    identidadeTexto = document.createElement("span");
    identidadeTexto.className = "identidade-texto";
    var botaoSair = document.createElement("button");
    botaoSair.type = "button";
    botaoSair.className = "identidade-sair";
    botaoSair.textContent = "Sair";
    botaoSair.title = "Encerrar a sessão e apagar o CPF e a data de nascimento desta aba";
    botaoSair.addEventListener("click", function() {
      if (window.SessaoMorador) window.SessaoMorador.sair();
    });
    identidade.appendChild(identidadeTexto);
    identidade.appendChild(botaoSair);
    lugarIdentidade.appendChild(identidade);
    var topo = document.querySelector(".link-admin-topo");
    if (topo && topo.parentNode) topo.parentNode.insertBefore(lugarIdentidade, topo.nextSibling);

    barra.querySelector(".barra-acao-enviar").addEventListener("click", function() {
      document.getElementById("btnEnviarForm").click();
    });
    barra.querySelector(".barra-acao-fechar").addEventListener("click", function() {
      document.getElementById("btnSairSemAlterar").click();
    });

    window.atualizarBarraAcoes = atualizar;
    var apto = document.getElementById("apto");
    if (apto) apto.addEventListener("change", atualizar);
    ["moradorNome", "moradorEmail"].forEach(function(id) {
      var campo = document.getElementById(id);
      if (campo) campo.addEventListener("input", atualizar);
    });
    window.addEventListener("sessao-morador-mudou", atualizar);
    window.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    // Aparece/some conforme o cadastro é carregado, enviado ou fechado (texto do botão e seções).
    var observador = new MutationObserver(atualizar);
    observador.observe(document.getElementById("btnEnviarForm"), { childList: true, characterData: true, subtree: true, attributes: true });
    observador.observe(document.getElementById("btnSairSemAlterar"), { childList: true, characterData: true, subtree: true });
    observador.observe(secao, { attributes: true, attributeFilter: ["class"] });
    atualizar();
  });
})();
