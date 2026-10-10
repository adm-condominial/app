// ==========================================
// MODO ADMINISTRAÇÃO DO FORMULÁRIO (edição de um cadastro pelo painel admin)
// ==========================================
// Ativado quando o formulário é aberto pelo botão "Editar cadastro" do admin:
//   index.html?editar=<id do cadastro>&apto=<apartamento>
// Em vez de CPF + data de nascimento, usa o login do admin (o token fica no sessionStorage da
// mesma aba, gravado pelo admin-auth.js). O backend confere o token e registra o e-mail do admin
// nos logs do cadastro e no histórico de alterações.
(function() {
  var params = new URLSearchParams(window.location.search);
  var id = String(params.get("editar") || "").trim();
  var apto = String(params.get("apto") || "").trim();
  if (!id || !apto) return;

  var CHAVE_TOKEN_ADMIN = "adminSimplesAuthToken"; // mesma chave do js/admin-auth.js
  var urlRetorno = "admin.html?abrir=" + encodeURIComponent(apto + "__" + id);
  window.modoAdminEdicao = { id: id, apto: apto, urlRetorno: urlRetorno };

  // O formulário não carrega o admin-auth.js; basta ler o token que o admin já guardou.
  if (!window.AdminAuth) {
    window.AdminAuth = {
      getIdToken: function() {
        try { return sessionStorage.getItem(CHAVE_TOKEN_ADMIN) || ""; } catch (e) { return ""; }
      }
    };
  }

  function voltarAoPainel() {
    window.location.href = urlRetorno;
  }

  function criarAviso() {
    var aviso = document.createElement("div");
    aviso.id = "avisoModoAdmin";
    aviso.className = "aviso-modo-admin";
    aviso.innerHTML =
      '<strong>Modo administração</strong> — editando o cadastro do apto <span id="avisoModoAdminApto"></span>' +
      '<span id="avisoModoAdminNome"></span>. As alterações ficam registradas com o seu e-mail.' +
      '<div id="avisoModoAdminErro" class="aviso-modo-admin-erro" hidden></div>' +
      '<button type="button" id="btnVoltarPainelAdmin" class="btn-voltar-painel">← Voltar ao painel sem salvar</button>';
    var container = document.querySelector(".container");
    var referencia = document.querySelector(".link-admin-topo");
    if (referencia && referencia.parentNode) {
      referencia.parentNode.insertBefore(aviso, referencia.nextSibling);
    } else if (container) {
      container.insertBefore(aviso, container.firstChild);
    }
    document.getElementById("avisoModoAdminApto").textContent = apto;
    document.getElementById("btnVoltarPainelAdmin").addEventListener("click", voltarAoPainel);
  }

  function mostrarErro(texto) {
    var erro = document.getElementById("avisoModoAdminErro");
    if (!erro) return;
    erro.textContent = texto;
    erro.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function() {
    document.body.classList.add("modo-admin");
    criarAviso();

    // O que é do morador não aparece para o admin: a busca por CPF, "Novo cadastro" e a declaração.
    // (display "none" com prioridade: o CSS desses blocos usa "display: flex !important", que anularia
    // o atributo hidden. Escondida, a declaração também sai da validação de campos obrigatórios.)
    var consulta = document.getElementById("boxConsultaCpf");
    if (consulta) consulta.style.setProperty("display", "none", "important");
    var declaracao = document.getElementById("declaracao");
    if (declaracao && declaracao.closest(".checkbox-group")) {
      declaracao.closest(".checkbox-group").style.setProperty("display", "none", "important");
    }

    var btnSair = document.getElementById("btnSairSemAlterar");
    if (btnSair) {
      btnSair.onclick = voltarAoPainel;
      btnSair.textContent = "Cancelar e voltar ao painel";
    }

    if (!window.AdminAuth.getIdToken()) {
      mostrarErro("Você não está logado na área da administração nesta aba. Volte ao painel, faça login e clique em \"Editar cadastro\" de novo.");
      return;
    }

    // Token expirado durante a edição: avisa e manda para o login do painel.
    window.addEventListener("admin-auth-expired", function() {
      mostrarAlerta("Sua sessão de administração expirou. Faça login de novo no painel; as alterações não salvas serão perdidas.", "Atenção")
        .then(function() { window.location.href = "admin.html"; });
    });

    setOverlayProcessamento(true, "Aguarde: carregando cadastro");

    // A lista de apartamentos precisa estar carregada antes de preencher o formulário.
    Promise.all([obterApartamentosDoGabarito(), DataService.obterMoradorPorApto(apto, id)])
      .then(function(respostas) {
        setOverlayProcessamento(false);
        var resposta = respostas[1];
        if (!resposta || !resposta.encontrado || !resposta.dados) {
          mostrarErro((resposta && resposta.mensagem) || "Cadastro não encontrado. Ele pode ter sido excluído.");
          return;
        }

        var d = resposta.dados;
        preencherFormularioComCadastro(d);
        alterarTextoBotaoEnviar("Salvar alterações");
        cadastroConsultado = { id: d.id || id, admin: true };
        snapshotFormularioOriginal = capturarSnapshotFormulario();

        var nome = document.getElementById("avisoModoAdminNome");
        if (nome && d.nome) nome.textContent = " (" + d.nome + ")";
      })
      .catch(function(erro) {
        setOverlayProcessamento(false);
        mostrarErro((erro && erro.message) || "Não foi possível carregar o cadastro.");
      });
  });
})();
