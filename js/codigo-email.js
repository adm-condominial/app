// ==========================================
// CÓDIGO POR E-MAIL PARA ABRIR O CADASTRO (formulário do morador)
// ==========================================
// Quando o cadastro exige código (o morador marcou "Exigir código por e-mail"), a consulta por
// CPF + data devolve "precisaCodigo". Esta janela pede o código de 6 dígitos enviado ao e-mail e o
// confere no servidor. pedirCodigoPorEmail(cpf, nasc, emailMascarado) devolve a mesma resposta da
// consulta normal (encontrado + dados + sessao) ou null se o morador cancelar.
(function() {
  function criarJanela() {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay codigo-email-overlay";
    overlay.innerHTML =
      '<div class="modal-card codigo-email-card" role="dialog" aria-modal="true" aria-labelledby="codigoEmailTitulo">' +
        '<h3 id="codigoEmailTitulo">Código enviado por e-mail</h3>' +
        '<p class="codigo-email-texto"></p>' +
        '<input type="text" class="codigo-email-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Código de 6 dígitos">' +
        '<p class="codigo-email-erro" hidden></p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn-modal btn-modal-secondary codigo-email-cancelar">Cancelar</button>' +
          '<button type="button" class="btn-modal btn-modal-primary codigo-email-confirmar">Confirmar</button>' +
        "</div>" +
        '<button type="button" class="codigo-email-reenviar">Não recebi: enviar outro código</button>' +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  window.pedirCodigoPorEmail = function(cpf, nasc, emailMascarado) {
    var overlay = criarJanela();
    var texto = overlay.querySelector(".codigo-email-texto");
    var input = overlay.querySelector(".codigo-email-input");
    var erro = overlay.querySelector(".codigo-email-erro");
    var confirmar = overlay.querySelector(".codigo-email-confirmar");
    var reenviar = overlay.querySelector(".codigo-email-reenviar");
    texto.textContent = "Este cadastro está protegido por código. Enviamos um código de 6 dígitos para " +
      (emailMascarado || "o e-mail cadastrado") + ". Ele vale por 10 minutos.";
    setTimeout(function() { input.focus(); }, 50);

    function mostrarErro(msg) { erro.textContent = msg; erro.hidden = !msg; }

    return new Promise(function(resolve) {
      function fechar(valor) { overlay.remove(); resolve(valor); }

      overlay.querySelector(".codigo-email-cancelar").onclick = function() { fechar(null); };
      input.addEventListener("input", function() { input.value = input.value.replace(/\D/g, "").slice(0, 6); mostrarErro(""); });
      input.addEventListener("keydown", function(e) { if (e.key === "Enter") confirmar.click(); });

      confirmar.onclick = function() {
        if (input.value.length !== 6) { mostrarErro("Digite os 6 números do código."); return; }
        confirmar.disabled = true;
        confirmar.textContent = "Conferindo";
        DataService.confirmarCodigoCpf(cpf, nasc, input.value)
          .then(function(r) {
            if (r && r.encontrado) { fechar(r); return; }
            if (r && r.bloqueado) { fechar(r); return; }
            mostrarErro((r && r.mensagem) || "Não foi possível conferir o código.");
            input.value = "";
            input.focus();
          })
          .catch(function(e) { mostrarErro((e && e.message) || "Não foi possível conferir o código."); })
          .then(function() { confirmar.disabled = false; confirmar.textContent = "Confirmar"; });
      };

      reenviar.onclick = function() {
        reenviar.disabled = true;
        DataService.obterMoradorPorCpf(cpf, nasc)
          .then(function(r) {
            if (r && r.precisaCodigo) mostrarErro("Se já passou 1 minuto desde o último envio, um novo código foi enviado. Confira também a caixa de spam.");
            else if (r && r.bloqueado) fechar(r);
          })
          .catch(function() {})
          .then(function() { setTimeout(function() { reenviar.disabled = false; }, 60000); });
      };
    });
  };
})();
