// ==========================================
// PULAR PARA O PRÓXIMO CAMPO AO COMPLETAR CPF OU DATA
// ==========================================
// Campos com tamanho fixo (CPF "000.000.000-00" e data "DD/MM/AAAA"): quando a pessoa termina de
// digitar, o cursor vai sozinho para o próximo campo, sem clique extra (ex.: CPF -> nascimento).
// Vale para as três máscaras do site (js/mascaras.js, o popup do Kit e a kit.html), por isso olha
// o formato do valor e não quem aplicou a máscara.
// Só pula quando a pessoa está digitando ou colando no fim do campo: corrigir um dígito no meio, ou
// apagar, não tira o cursor do lugar. Carregar um cadastro também não (o valor muda sem "input").
(function() {
  var COMPLETO = [/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, /^\d{2}\/\d{2}\/\d{4}$/];
  var FOCAVEIS = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, button";

  function visivel(el) {
    return !el.disabled && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  }

  function proximoCampo(atual) {
    // Fica dentro do mesmo bloco (popup do Kit, consulta por CPF ou formulário).
    var raiz = atual.closest("[role=dialog], form, .card-consulta, .acesso") || document;
    var lista = Array.prototype.filter.call(raiz.querySelectorAll(FOCAVEIS), visivel);
    var i = lista.indexOf(atual);
    return i === -1 ? null : lista[i + 1] || null;
  }

  document.addEventListener("input", function(e) {
    var campo = e.target;
    if (!campo || campo.tagName !== "INPUT" || !/^insert/.test(e.inputType || "")) return;
    // Depois das máscaras (que também reagem ao "input"), confere o valor já formatado.
    setTimeout(function() {
      var valor = campo.value || "";
      if (document.activeElement !== campo || campo.selectionEnd !== valor.length) return;
      if (!COMPLETO.some(function(r) { return r.test(valor); })) return;
      var proximo = proximoCampo(campo);
      if (proximo) proximo.focus();
    }, 0);
  });
})();
