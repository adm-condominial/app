// ==========================================
// QUEM ENTROU NA ADMINISTRAÇÃO JÁ CHEGA "CONECTADO" NA PÁGINA INICIAL
// ==========================================
// Síndico, conselho e desenvolvedor também são moradores. Quando um deles faz login no admin e
// volta para a página inicial (na mesma aba), a sessão de 1 hora do morador (js/sessao-morador.js)
// começa sozinha com o cadastro dele: os campos da consulta já aparecem preenchidos e travados,
// com "Visualizar cadastro" e "Sair", sem digitar CPF e data de nascimento.
//
// Como o cadastro é encontrado, sem rota nova no backend: a página Membros (rota protegida, com o
// token do admin) diz qual cadastro ocupa o cargo de quem está logado; a consulta por apartamento
// (também protegida) devolve o CPF e a data de nascimento desse cadastro, que abrem a sessão.
// Condomínio e administradora não têm cadastro de morador: nada acontece.
// Se faltar permissão ou der erro, a página fica como sempre (consulta vazia), sem aviso.
//
// Depois de tentar uma vez (dando certo ou não) com um login, não tenta de novo nesta aba: assim
// o "Sair" da página inicial é respeitado e a pessoa não é reconectada a cada visita.
// Nunca registrar estes dados no console.
(function() {
  var CHAVE_ADMIN = "adminSimplesAuthUser";     // mesmas chaves do js/admin-auth.js
  var CHAVE_TOKEN = "adminSimplesAuthToken";
  var CHAVE_FEITO = "sessaoMoradorDoAdmin";     // marca do login (e-mail + validade) que já conectou

  function lerAdmin() {
    try {
      var s = JSON.parse(sessionStorage.getItem(CHAVE_ADMIN) || "null");
      if (!s || !s.email || !s.expiraEm || Date.now() >= s.expiraEm) return null;
      if (!sessionStorage.getItem(CHAVE_TOKEN)) return null;
      return s;
    } catch (e) { return null; }
  }

  // "1985-03-15", "1985-03-15T03:00:00Z" ou "15/03/1985" -> "15/03/1985".
  function dataBr(valor) {
    var t = String(valor || "").trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return t;
    var m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }

  // Cadastro do cargo de quem está logado, pelo papel que o backend informou.
  // Cadastro de quem está logado: procura em TODOS os cargos (síndico, desenvolvedor, conselho) um que
  // tenha morador escolhido e cujo e-mail de acesso seja o do login. Assim, quem tem dois cargos (ex.:
  // desenvolvedor e conselho) é encontrado mesmo que só um deles esteja ligado ao cadastro.
  function cargoDoLogado(r, email) {
    var membros = (r && r.membros) || {};
    var alvo = String(email || "").trim().toLowerCase();
    var cargos = [membros.sindico, membros.desenvolvedor].concat(membros.conselho || []).filter(function(c) { return c && c.cadastroId; });
    var porId = {};
    (r.candidatos || []).forEach(function(c) { porId[c.id] = c; });
    var doLogado = cargos.filter(function(c) {
      var efetivo = c.usarEmailCadastro !== false ? (porId[c.cadastroId] && porId[c.cadastroId].email) : c.email;
      return String(efetivo || "").trim().toLowerCase() === alvo;
    })[0];
    if (doLogado) return doLogado;
    if (r.papel === "sindico") return membros.sindico;
    if (r.papel === "desenvolvedor") return membros.desenvolvedor;
    if (r.papel === "conselho") return (membros.conselho || [])[r.indice];
    return null;
  }

  // Diagnóstico (sem dados pessoais): com ?diag=1 no endereço, mostra em qual passo parou.
  var DIAG = /[?&]diag=1/.test(location.search);
  function diag(texto) {
    if (!DIAG) return;
    var el = document.getElementById("diagSessaoAdmin");
    if (!el) {
      el = document.createElement("div");
      el.id = "diagSessaoAdmin";
      el.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99999;max-width:92vw;padding:8px 12px;border-radius:8px;background:#243447;color:#fff;font:12px/1.4 Arial,sans-serif;white-space:pre-line";
      document.body.appendChild(el);
    }
    el.textContent += (el.textContent ? "\n" : "") + texto;
  }

  var emAndamento = false;
  function tentar() {
    if (emAndamento) return;
    diag("Sessão do admin → morador:");
    if (window.modoAdminEdicao || !window.SessaoMorador || !window.DataService) { diag("parou: scripts da página não carregaram"); return; }
    var admin = lerAdmin();
    if (!admin) {
      var bruto = null;
      try { bruto = JSON.parse(sessionStorage.getItem(CHAVE_ADMIN) || "null"); } catch (e) {}
      diag(!bruto ? "parou: não há login do admin NESTA aba (entre no admin e volte pela mesma aba)"
        : (bruto.expiraEm && Date.now() >= bruto.expiraEm ? "parou: o login do admin expirou (vale 1 hora); entre de novo" : "parou: login do admin incompleto (sem token)"));
      return;
    }
    if (admin.papel === "condominio" || admin.papel === "administradora") { diag("parou: o cargo " + admin.papel + " não tem cadastro de morador"); return; }
    if (window.SessaoMorador.obter()) { diag("ok: a sessão de morador já estava aberta"); return; }
    // Marca deste login (e-mail + validade): sair e entrar de novo no admin gera outra marca e reconecta.
    var marca = admin.email + "|" + admin.expiraEm;
    try { if (sessionStorage.getItem(CHAVE_FEITO) === marca) { diag("parou: já conectou uma vez neste login e você clicou em Sair"); return; } } catch (e) { return; }
    emAndamento = true;
    diag("login do admin encontrado (cargo: " + (admin.papel || "?") + ")");

    // O formulário não carrega o admin-auth.js; as rotas protegidas leem o token por aqui.
    if (!window.AdminAuth) {
      window.AdminAuth = {
        getIdToken: function() { try { return sessionStorage.getItem(CHAVE_TOKEN) || ""; } catch (e) { return ""; } },
        getEmail: function() { return admin.email; }
      };
    }

    window.DataService.obterMembros()
      .then(function(r) {
        if (!r || !r.sucesso) { diag("parou: a página Membros não respondeu (" + ((r && r.mensagem) || "sem resposta") + ")"); return null; }
        var cargo = cargoDoLogado(r, admin.email);
        diag(cargo && cargo.cadastroId ? "cargo com cadastro encontrado" : "parou: nenhum cargo com o seu e-mail tem morador escolhido em Membros");
        var id = cargo && cargo.cadastroId;
        var candidato = id && (r.candidatos || []).filter(function(c) { return c.id === id; })[0];
        if (!candidato || !candidato.apto) { if (cargo && cargo.cadastroId) diag("parou: o cadastro escolhido em Membros não está entre os moradores ativos"); return null; }
        return window.DataService.obterMoradorPorApto(candidato.apto, id).then(function(resp) { return { resp: resp, apto: candidato.apto }; });
      })
      .then(function(achado) {
        if (achado === null) return;
        var resposta = achado.resp;
        var d = resposta && resposta.encontrado && resposta.dados;
        if (!d) { diag("parou: a consulta do cadastro não respondeu (" + ((resposta && resposta.mensagem) || "sem resposta") + ")"); return; }
        if (d.situacao === "mudou-se") { diag("parou: o cadastro está marcado como mudou-se"); return; }
        var cpf = String(d.cpf || "").replace(/\D/g, "");
        var nasc = dataBr(d.nasc);
        if (cpf.length !== 11 || !nasc) { diag("parou: o cadastro está sem CPF ou data de nascimento válidos"); return; }
        if (window.SessaoMorador.obter()) { diag("ok: a sessão já tinha sido aberta"); return; }
        var campo = document.getElementById("cpfConsulta");
        if (campo && campo.value) { diag("parou: o campo CPF já estava preenchido"); return; }
        window.SessaoMorador.iniciar(cpf, nasc, { nome: d.nome || "", apto: achado.apto || d.apto || "", email: d.email || "" });
        try { sessionStorage.setItem(CHAVE_FEITO, marca); } catch (e) {}
        diag("ok: sessão de morador aberta");
      })
      .catch(function(erro) { diag("parou: erro " + ((erro && erro.message) || erro)); })
      .then(function() { emAndamento = false; });
  }

  document.addEventListener("DOMContentLoaded", tentar);
  // Na página do admin, o login pode acontecer depois de abrir a página: tenta de novo quando entrar.
  window.addEventListener("admin-auth-success", tentar);
})();
