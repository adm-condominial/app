// ==========================================
// CHAMADA AO BACKEND (APPS SCRIPT)
// ==========================================
// Função única usada pelo FirebaseRepository e pelo GoogleSheetsRepository.
// Funções "protegidas" (protegido=true) enviam o ID token do admin logado
// (window.AdminAuth.getIdToken()), exigido pelo backend para as rotas administrativas.
//
// Quando o backend responde { autorizado: false } (ex.: token do Google expirado após ~1h),
// dispara o evento "admin-auth-expired" para o admin-auth.js encerrar a sessão e pedir login.
(function() {
  function criarErroFonte(codigo, mensagem) {
    var erro = new Error(mensagem);
    erro.codigoFonte = codigo;
    return erro;
  }

  function chamarBackend(funcao, payloadExtra, protegido, nomeFonte) {
    if (typeof WEB_APP_URL === "undefined" || !WEB_APP_URL) {
      return Promise.reject(criarErroFonte("nao-configurado", "WEB_APP_URL não definido."));
    }

    var corpo = Object.assign({ funcao: funcao }, payloadExtra || {});
    if (protegido && window.AdminAuth && typeof window.AdminAuth.getIdToken === "function") {
      corpo.idToken = window.AdminAuth.getIdToken();
    }

    return fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(corpo) })
      .then(function(response) {
        return response.text().then(function(texto) {
          var conteudo = String(texto || "").trim();

          if (!response.ok) {
            throw criarErroFonte("unavailable", "Backend indisponível (HTTP " + response.status + ").");
          }
          if (!conteudo || conteudo.charAt(0) !== "{") {
            throw criarErroFonte("unavailable", "Backend não retornou JSON válido.");
          }

          var json = JSON.parse(conteudo);
          if (json && json.autorizado === false) {
            window.dispatchEvent(new CustomEvent("admin-auth-expired"));
            throw criarErroFonte("nao-autorizado", json.mensagem || "Sua sessão expirou. Faça login novamente.");
          }
          return json;
        });
      })
      .catch(function(erro) {
        if (erro && erro.codigoFonte) throw erro;
        throw criarErroFonte("unavailable", "Não foi possível conectar ao " + (nomeFonte || "backend") + ".");
      });
  }

  window.Backend = {
    chamar: chamarBackend,
    criarErroFonte: criarErroFonte
  };
})();
