// ==========================================
// SESSÃO DO MORADOR (1 HORA) DEPOIS DO CPF + DATA DE NASCIMENTO
// ==========================================
// Quando o morador informa o CPF e a data de nascimento (no Kit de Boas-vindas ou para visualizar
// o cadastro) e o servidor confere, o site lembra essas duas informações por 1 hora. Nesse tempo:
//   - o Kit abre direto, sem pedir de novo;
//   - na página inicial, os campos da consulta ficam preenchidos e travados, mostrando só os 3
//     primeiros dígitos do CPF e o dia do aniversário; no lugar de "Buscar Cadastro" e
//     "Novo cadastro" aparecem "Visualizar cadastro" e "Sair" (o "Sair" também fica ao lado do nome, no topo).
// A hora de início não muda ao usar o site: a sessão vale 1 hora a partir do primeiro acesso.
//
// Por que sessionStorage (e não localStorage): os dados ficam só nesta aba e somem ao fechá-la,
// então não sobram num computador compartilhado. O servidor confere o CPF e a data a cada uso,
// como antes (inclusive o limite de tentativas); o site só evita que a pessoa digite de novo.
// Nunca registrar estes dados no console.
(function() {
  var CHAVE = "sessaoMorador";
  var CHAVE_KIT = "kitBoasVindas"; // dados do Kit já aberto (kit-acesso.js e kit.html)
  var DURACAO_MS = 60 * 60 * 1000;

  function dois(n) { return String(n).padStart(2, "0"); }

  function ler() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE) || "null"); } catch (e) { return null; }
  }

  function obter() {
    var s = ler();
    if (!s || !s.cpf || !s.nasc || !s.expira) return null;
    if (Date.now() >= s.expira) { encerrar(); return null; }
    return s;
  }

  // Abre a sessão (ou mantém a atual, se for o mesmo CPF: o prazo não é renovado).
  // info (opcional): { nome, apto, email } de quem entrou, para mostrar no topo da página inicial.
  function iniciar(cpf, nasc, info) {
    cpf = String(cpf || "").replace(/\D/g, "");
    if (cpf.length !== 11 || !nasc) return;
    var atual = obter();
    var expira = atual && atual.cpf === cpf ? atual.expira : Date.now() + DURACAO_MS;
    var pessoa = info || (atual && atual.cpf === cpf ? atual.pessoa : null) || null;
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ cpf: cpf, nasc: nasc, expira: expira, pessoa: pessoa })); } catch (e) {}
    prefetchKit(cpf, nasc);
    avisarMudanca();
  }

  // Em segundo plano, logo no login: busca a lista do Kit (só os nomes dos arquivos, não os PDFs) e
  // guarda nesta aba. Assim a página do kit abre na hora, sem a tela de "Carregando". Se falhar, a
  // página do kit busca de novo como antes.
  function prefetchKit(cpf, nasc) {
    if (!window.Backend || !window.Backend.chamar) return;
    window.Backend.chamar("fbAbrirKit", { cpf: cpf, nascimento: nasc }).then(function(r) {
      if (!r || !r.encontrado) return;
      try { sessionStorage.setItem(CHAVE_KIT, JSON.stringify(r)); } catch (e) {}
    }).catch(function() {});
  }

  // Troca as credenciais guardadas (ex.: o morador corrigiu o CPF ou a data no próprio cadastro).
  function atualizarCredenciais(cpf, nasc) {
    var atual = obter();
    cpf = String(cpf || "").replace(/\D/g, "");
    if (!atual || cpf.length !== 11 || !/^\d{2}\/\d{2}\/\d{4}$/.test(nasc || "")) return;
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ cpf: cpf, nasc: nasc, expira: atual.expira })); } catch (e) {}
  }

  function encerrar() {
    try { sessionStorage.removeItem(CHAVE); sessionStorage.removeItem(CHAVE_KIT); } catch (e) {}
    avisarMudanca();
  }

  function horaFim(s) {
    s = s || obter();
    if (!s) return "";
    var d = new Date(s.expira);
    return dois(d.getHours()) + ":" + dois(d.getMinutes());
  }

  function textoAviso(s) {
    s = s || obter();
    if (!s) return "";
    return "Você está conectado até as " + horaFim(s) + " (sessão de 1 hora). Até lá, o Kit de Boas-vindas e o " +
      "seu cadastro abrem sem pedir o CPF e a data de nascimento de novo.";
  }

  // "123.***.***-**" e "15/**/****": o resto fica censurado.
  function cpfCensurado(s) { return s.cpf.slice(0, 3) + ".***.***-**"; }
  function nascCensurada(s) { return String(s.nasc).slice(0, 2) + "/**/****"; }

  var avisando = false;
  function avisarMudanca() {
    if (avisando) return;
    avisando = true;
    try { window.dispatchEvent(new CustomEvent("sessao-morador-mudou")); } finally { avisando = false; }
  }

  // ---------- Página inicial (index.html) ----------
  // Só age quando os campos da consulta existem.
  function cadastroAberto() {
    var sec = document.getElementById("secTipoResidente");
    var chk = document.getElementById("chkMoradorNovo");
    return (typeof cadastroConsultado !== "undefined" && !!cadastroConsultado) ||
      (!!sec && !sec.classList.contains("hidden")) || (!!chk && chk.checked);
  }

  function telaTravada() {
    var cpf = document.getElementById("cpfConsulta");
    return !!cpf && cpf.dataset.sessao === "1";
  }

  function aplicarNaTela() {
    var cpf = document.getElementById("cpfConsulta");
    var nasc = document.getElementById("nascConsulta");
    var buscar = document.getElementById("btnBuscarCpf");
    var novo = document.getElementById("btnMoradorNovo");
    var aviso = document.getElementById("avisoSessaoMorador");
    if (!cpf || !nasc || !buscar || !novo) return;
    var s = obter();
    if (aviso) {
      aviso.textContent = textoAviso(s);
      aviso.hidden = !s;
    }
    // "Sair" no fim do formulário (depois de "Atualizar cadastro" e "Fechar visualização"): só com a sessão.
    var sairFim = document.getElementById("btnSairSessaoFim");
    if (sairFim) {
      sairFim.hidden = !s;
      // Com os 3 botões, a largura é dividida igualmente (css/responsivo.css).
      if (sairFim.parentElement) sairFim.parentElement.classList.toggle("tres-botoes", !!s);
    }
    if (cadastroAberto()) return; // com o cadastro aberto, a consulta continua como está

    if (s) {
      cpf.dataset.sessao = "1";
      cpf.value = cpfCensurado(s);
      nasc.value = nascCensurada(s);
      cpf.disabled = true;
      nasc.disabled = true;
      cpf.classList.remove("input-erro-destaque", "input-ok-destaque");
      nasc.classList.remove("input-erro-destaque", "input-ok-destaque");
      buscar.disabled = false;
      buscar.innerText = "Visualizar cadastro";
      // Com a sessão, "Novo cadastro" vira "Sair" (redundância do "Sair" ao lado do nome, no topo da página):
      // o clique é tratado em alternarMoradorNovo() (form-controle.js), que chama sair().
      novo.textContent = "Sair";
      novo.classList.remove("ativo", "bloqueado");
      novo.classList.add("btn-sair-sessao");
      novo.setAttribute("aria-disabled", "false");
      novo.title = "Encerrar a sessão e apagar o CPF e a data de nascimento desta aba";
      var linha = novo.closest(".row-checkbox-morador");
      if (linha) linha.classList.remove("bloqueado");
    } else if (telaTravada()) {
      delete cpf.dataset.sessao;
      cpf.value = "";
      nasc.value = "";
      cpf.disabled = false;
      nasc.disabled = false;
      buscar.disabled = false;
      buscar.innerText = "Buscar Cadastro";
      novo.textContent = "Novo cadastro";
      novo.classList.remove("btn-sair-sessao");
      novo.title = "";
      if (typeof atualizarBloqueioNovoCadastro === "function") atualizarBloqueioNovoCadastro();
    }
  }

  // "Sair" da página inicial: encerra a sessão e volta à consulta vazia.
  // "Sair" (em qualquer lugar do site) desloga de tudo nesta aba: morador e área de admin.
  function sair() {
    try {
      sessionStorage.removeItem("adminSimplesAuthUser");
      sessionStorage.removeItem("adminSimplesAuthToken");
      sessionStorage.removeItem("sessaoMoradorDoAdmin");
    } catch (e) {}
    encerrar();
    aplicarNaTela();
    var cpf = document.getElementById("cpfConsulta");
    if (cpf) cpf.focus();
  }

  window.addEventListener("sessao-morador-mudou", function() { aplicarNaTela(); });
  document.addEventListener("DOMContentLoaded", function() {
    aplicarNaTela();
    // Quando a hora passa, a tela volta sozinha para a consulta normal.
    setInterval(function() {
      if (ler() && !obter()) aplicarNaTela();
    }, 20000);
  });

  window.SessaoMorador = {
    obter: obter,
    pessoa: function() { var x = obter(); return (x && x.pessoa) || null; },
    iniciar: iniciar,
    atualizarCredenciais: atualizarCredenciais,
    encerrar: encerrar,
    horaFim: horaFim,
    textoAviso: textoAviso,
    telaTravada: telaTravada,
    aplicarNaTela: aplicarNaTela,
    sair: sair
  };
})();
