// ==========================================
// "ATUALIZAR CADASTRO" DESABILITADO ENQUANTO NADA MUDOU
// ==========================================
// Com um cadastro aberto, o botão de envio (e a cópia dele na barra flutuante) fica desabilitado
// enquanto o formulário estiver igual ao que foi carregado. Exceção: cadastro com 11 meses ou mais
// (revisão anual), que pode ser só confirmado sem mudanças (cadastroAntigoParaRevisao, envio-form.js).
// Só desfaz o que ele mesmo fez: não reabilita o botão enquanto o envio está em andamento.
(function() {
  function atualizar() {
    var botao = document.getElementById("btnEnviarForm");
    if (!botao || typeof capturarSnapshotFormulario !== "function") return;
    var semMudanca = typeof snapshotFormularioOriginal !== "undefined" && snapshotFormularioOriginal !== null &&
      !(typeof cadastroAntigoParaRevisao === "function" && cadastroAntigoParaRevisao()) &&
      capturarSnapshotFormulario() === snapshotFormularioOriginal;
    if (semMudanca) {
      if (!botao.disabled) botao.disabled = true;
      botao.dataset.semAlteracao = "1";
      botao.title = "Nenhuma alteração feita no cadastro";
    } else if (botao.dataset.semAlteracao === "1") {
      botao.disabled = false;
      delete botao.dataset.semAlteracao;
      botao.title = "";
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    var form = document.getElementById("cadForm");
    if (!form) return;
    form.addEventListener("input", atualizar);
    form.addEventListener("change", atualizar);
    // Itens adicionados/removidos (emergência, veículos...) e cadastro carregado/fechado.
    new MutationObserver(function() { setTimeout(atualizar, 0); }).observe(form, { childList: true, subtree: true });
    setInterval(atualizar, 1000);
  });
})();
