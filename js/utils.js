// ==========================================
// UTILITÁRIOS COMPARTILHADOS (index.html e admin.html)
// ==========================================
(function() {
  function escaparHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Aceita somente links http/https. Qualquer outro esquema (javascript:, data:, etc.)
  // vira string vazia, para não virar link executável na tela.
  function urlSegura(valor) {
    var texto = String(valor || "").trim();
    if (!texto) return "";
    try {
      var url = new URL(texto);
      return (url.protocol === "https:" || url.protocol === "http:") ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  // Confere os dois dígitos verificadores do CPF (e recusa sequências como 111.111.111-11).
  function cpfValido(valor) {
    var cpf = String(valor || "").replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (var posicao = 9; posicao <= 10; posicao++) {
      var soma = 0;
      for (var i = 0; i < posicao; i++) {
        soma += Number(cpf.charAt(i)) * (posicao + 1 - i);
      }
      var digito = (soma * 10) % 11 % 10;
      if (digito !== Number(cpf.charAt(posicao))) return false;
    }
    return true;
  }

  window.Utils = {
    escaparHtml: escaparHtml,
    urlSegura: urlSegura,
    cpfValido: cpfValido
  };
})();
