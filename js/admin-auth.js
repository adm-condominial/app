(function() {
  var AUTH_STORAGE_KEY = "adminSimplesAuthUser";
  var AUTH_TOKEN_STORAGE_KEY = "adminSimplesAuthToken";
  var RELOAD_MAX_TENTATIVAS = 20;
  var RELOAD_INTERVAL_MS = 400;
  var MENSAGEM_SESSAO_EXPIRADA = "Sua sessão expirou. Faça login novamente.";
  var timerInicializacaoLogin = null;
  var timerExpiracaoSessao = null;
  var googleInicializadoClientId = "";

  function textoLimpo(valor) {
    return String(valor || "").trim();
  }

  function parseJwtPayload(jwt) {
    try {
      var parts = String(jwt || "").split(".");
      if (parts.length < 2) return null;
      var base64Url = parts[1];
      var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      var padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      var json = decodeURIComponent(
        atob(padded)
          .split("")
          .map(function(c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function obterConfig() {
    if (typeof ADMIN_AUTH_CONFIG !== "object" || !ADMIN_AUTH_CONFIG) {
      return { googleClientId: "" };
    }
    return { googleClientId: textoLimpo(ADMIN_AUTH_CONFIG.googleClientId) };
  }

  // Quem tem acesso (e com qual papel) é definido na página "Membros" e conferido pelo backend:
  // { papel, nomePapel } ou erro com a mensagem do backend (ex.: "não está autorizado").
  function consultarAcesso(idToken) {
    if (!window.Backend || typeof window.Backend.chamar !== "function") {
      return Promise.reject(new Error("Não foi possível verificar o acesso."));
    }
    return window.Backend.chamar("fbMeuAcesso", { idToken: idToken }, false, "servidor")
      .then(function(r) {
        if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Este e-mail não está autorizado para a área restrita.");
        return { papel: r.papel, nomePapel: r.nomePapel, permissoes: r.permissoes || null };
      });
  }

  function setMensagem(texto, tipo) {
    var el = document.getElementById("authMensagem");
    if (!el) return;
    var mensagem = textoLimpo(texto);
    el.className = "auth-mensagem" + (tipo ? " " + tipo : "");
    el.textContent = mensagem;
    el.hidden = !mensagem;
  }

  function salvarSessao(payload, idToken, acesso) {
    var seguro = {
      email: textoLimpo(payload.email),
      papel: (acesso && acesso.papel) || "",
      nomePapel: (acesso && acesso.nomePapel) || "",
      permissoes: (acesso && acesso.permissoes) || null, // Membros > Autorizações (só para a tela; o backend confere)
      name: textoLimpo(payload.name),
      picture: textoLimpo(payload.picture),
      // "exp" do token do Google, em milissegundos (o token vale ~1 hora).
      expiraEm: (parseInt(payload.exp, 10) || 0) * 1000
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(seguro));
    if (idToken) {
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, idToken);
    }
    return seguro;
  }

  function sessaoExpirada(sessao) {
    return !sessao || !sessao.expiraEm || Date.now() >= sessao.expiraEm;
  }

  function carregarSessao() {
    try {
      var bruto = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (!bruto) return null;
      var parsed = JSON.parse(bruto);
      if (!parsed || !parsed.email) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function limparSessao() {
    if (timerExpiracaoSessao) {
      clearTimeout(timerExpiracaoSessao);
      timerExpiracaoSessao = null;
    }
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }

  function obterIdToken() {
    return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
  }

  function atualizarCabecalhoUsuario(usuario) {
    var userLabel = document.getElementById("authUsuario");
    var sairBtn = document.getElementById("btnSairAdmin");
    if (!userLabel || !sairBtn) return;

    if (usuario && usuario.email) {
      // Nome numa linha e e-mail na de baixo, para não quebrar no meio.
      userLabel.innerHTML = "";
      [usuario.name, usuario.email].filter(Boolean).forEach(function(texto) {
        var linha = document.createElement("span");
        linha.className = "auth-usuario-linha";
        linha.textContent = texto;
        userLabel.appendChild(linha);
      });
      sairBtn.hidden = false;
    } else {
      userLabel.textContent = "";
      sairBtn.hidden = true;
    }
  }

  // Encerra a sessão sozinho quando o token do Google expira, em vez de deixar o painel
  // aberto com todas as consultas falhando.
  function agendarExpiracao(usuario) {
    if (timerExpiracaoSessao) clearTimeout(timerExpiracaoSessao);
    var restante = usuario.expiraEm - Date.now();
    if (restante <= 0) return;
    timerExpiracaoSessao = setTimeout(function() {
      encerrarSessao(MENSAGEM_SESSAO_EXPIRADA, "erro");
    }, restante);
  }

  function liberarAreaAdmin(usuario) {
    var gate = document.getElementById("authGate");
    var area = document.getElementById("adminArea");
    if (gate) gate.hidden = true;
    if (area) area.hidden = false;

    atualizarCabecalhoUsuario(usuario);
    setMensagem("");
    agendarExpiracao(usuario);
    window.dispatchEvent(new CustomEvent("admin-auth-success", { detail: usuario || null }));
  }

  function bloquearAreaAdmin() {
    var gate = document.getElementById("authGate");
    var area = document.getElementById("adminArea");
    if (gate) gate.hidden = false;
    if (area) area.hidden = true;

    atualizarCabecalhoUsuario(null);
  }

  function montarBotaoGoogle() {
    var btnContainer = document.getElementById("googleLoginButton");
    if (!btnContainer || !window.google || !google.accounts || !google.accounts.id) return;

    btnContainer.innerHTML = "";
    google.accounts.id.renderButton(btnContainer, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 280,
      locale: "pt-BR"
    });

    var button = btnContainer.querySelector("button");
    if (button && !button.textContent.trim()) {
      button.textContent = "Fazer login";
    }
  }

  function inicializarLoginGoogle(config) {
    if (!window.google || !google.accounts || !google.accounts.id) {
      return false;
    }

    if (!config.googleClientId) {
      setMensagem("Preencha ADMIN_AUTH_CONFIG.googleClientId em js/regras.js para ativar o login.", "erro");
      return true;
    }

    if (googleInicializadoClientId !== config.googleClientId) {
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: function(response) {
          var payload = parseJwtPayload(response && response.credential);
          if (!payload || !payload.email) {
            setMensagem("Não foi possível validar o login Google.", "erro");
            return;
          }

          setMensagem("Verificando acesso", "carregando");
          consultarAcesso(response && response.credential)
            .then(function(acesso) {
              var usuario = salvarSessao(payload, response && response.credential, acesso);
              liberarAreaAdmin(usuario);
            })
            .catch(function(erro) {
              limparSessao();
              bloquearAreaAdmin();
              setMensagem((erro && erro.message) || "Este e-mail não está autorizado para a área restrita.", "erro");
            });
        }
      });
      googleInicializadoClientId = config.googleClientId;
    }

    montarBotaoGoogle();
    return true;
  }

  // Modo demonstração (js/regras.js): sem Google. O visitante escolhe o cargo com que quer ver o
  // painel e entra; o backend-demo.js responde com as permissões desse cargo.
  function montarLoginDemo() {
    var btnContainer = document.getElementById("googleLoginButton");
    if (!btnContainer) return;
    var cargos = [["sindico", "Síndico"], ["conselho", "Conselho"], ["administradora", "Administradora"], ["condominio", "Condomínio"], ["desenvolvedor", "Desenvolvedor"]];
    btnContainer.innerHTML =
      '<label class="demo-login-rotulo" for="demoCargo">Ver o painel como</label>' +
      '<select id="demoCargo" class="demo-login-cargo">' +
        cargos.map(function(c) { return '<option value="' + c[0] + '">' + c[1] + "</option>"; }).join("") +
      "</select>" +
      '<button type="button" id="btnEntrarDemo" class="btn-entrar-demo">Entrar na demonstração</button>';
    document.getElementById("btnEntrarDemo").addEventListener("click", function() {
      var papel = document.getElementById("demoCargo").value;
      var payload = { email: "demo@exemplo.com.br", name: "Visitante da demonstração", picture: "", exp: Math.floor(Date.now() / 1000) + 8 * 3600 };
      // Grava o papel antes de consultar o acesso: o backend-demo.js lê o papel da sessão.
      salvarSessao(payload, "demo", { papel: papel });
      consultarAcesso("demo")
        .then(function(acesso) { liberarAreaAdmin(salvarSessao(payload, "demo", acesso)); })
        .catch(function(erro) { limparSessao(); setMensagem((erro && erro.message) || "Não foi possível entrar.", "erro"); });
    });
  }

  function inicializarLoginGoogleComRetentativa(config) {
    if (typeof MODO_DEMO !== "undefined" && MODO_DEMO) {
      montarLoginDemo();
      return;
    }
    var tentativa = 0;

    if (timerInicializacaoLogin) {
      clearTimeout(timerInicializacaoLogin);
      timerInicializacaoLogin = null;
    }

    function tentar() {
      tentativa += 1;
      var iniciou = inicializarLoginGoogle(config);
      if (iniciou) {
        return;
      }

      if (tentativa >= RELOAD_MAX_TENTATIVAS) {
        setMensagem("Falha ao carregar login Google. Recarregue a página.", "erro");
        return;
      }

      timerInicializacaoLogin = setTimeout(tentar, RELOAD_INTERVAL_MS);
    }

    tentar();
  }

  function encerrarSessao(mensagem, tipo) {
    // Evita repetir o logout quando várias chamadas falham ao mesmo tempo.
    var area = document.getElementById("adminArea");
    if (!carregarSessao() && area && area.hidden) return;

    limparSessao();
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    bloquearAreaAdmin();
    setMensagem(mensagem, tipo);
    inicializarLoginGoogleComRetentativa(obterConfig());
    window.dispatchEvent(new CustomEvent("admin-auth-logout"));
  }

  function configurarSair() {
    var btnSair = document.getElementById("btnSairAdmin");
    if (!btnSair) return;

    btnSair.addEventListener("click", function() {
      // Sair apaga também o cache da área admin (dados dos moradores guardados na aba).
      if (window.DataService && window.DataService.limparCacheAdmin) window.DataService.limparCacheAdmin();
      // Sair desta área também encerra a sessão de morador desta aba (regra: qualquer "Sair" desloga tudo).
      ["sessaoMorador", "kitBoasVindas", "sessaoMoradorDoAdmin", "cadastroPreCarregado"].forEach(function(chave) {
        try { sessionStorage.removeItem(chave); } catch (e) {}
      });
      encerrarSessao("Sessão encerrada.", "ok");
    });
  }

  function init() {
    var config = obterConfig();

    configurarSair();

    // Disparado pelo js/data/backend.js quando o backend recusa o token (expirado ou inválido).
    window.addEventListener("admin-auth-expired", function() {
      encerrarSessao(MENSAGEM_SESSAO_EXPIRADA, "erro");
    });

    bloquearAreaAdmin();

    var sessao = carregarSessao();
    if (sessao && !sessaoExpirada(sessao)) {
      // Sessão desta aba ainda válida: entra direto (o backend confere o acesso a cada chamada).
      if (sessao.papel && sessao.permissoes) {
        liberarAreaAdmin(sessao);
      } else {
        consultarAcesso(obterIdToken())
          .then(function(acesso) {
            sessao.papel = acesso.papel;
            sessao.nomePapel = acesso.nomePapel;
            sessao.permissoes = acesso.permissoes;
            sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessao));
            liberarAreaAdmin(sessao);
          })
          .catch(function() { limparSessao(); });
      }
    } else {
      limparSessao();
    }

    inicializarLoginGoogleComRetentativa(config);
  }

  window.AdminAuth = {
    getIdToken: obterIdToken,
    // Papel de quem está logado: "condominio", "desenvolvedor", "sindico" ou "conselho".
    getPapel: function() { var s = carregarSessao(); return (s && s.papel) || ""; },
    getEmail: function() { var s = carregarSessao(); return (s && s.email) || ""; },
    getPermissoes: function() { var s = carregarSessao(); return (s && s.permissoes) || null; }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
