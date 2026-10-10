// ==========================================
// BOTÕES "DESFAZER" / "SALVAR" NO TOPO DA PÁGINA (com barra flutuante)
// ==========================================
// Um <div data-espelho="idDoOriginal"> vira uma cópia dos botões do container original: mesmo
// texto, mesmo estado (desabilitado/escondido) e, ao clicar, aciona o botão original — a lógica
// de salvar continua num lugar só. Os originais ficam escondidos (CSS); só a cópia aparece.
// Quando a cópia sai de vista ao rolar, ela fica FIXA no topo da tela (como no formulário do
// morador), até o fim do painel.
(function() {
  function espelhar(destino) {
    var original = document.getElementById(destino.getAttribute("data-espelho"));
    if (!original) return;
    var botoes = Array.prototype.slice.call(original.querySelectorAll("button"));

    function sincronizar() {
      destino.innerHTML = "";
      botoes.forEach(function(b) {
        var copia = document.createElement("button");
        copia.type = "button";
        copia.className = b.className;
        copia.textContent = b.textContent;
        copia.disabled = b.disabled;
        copia.hidden = b.hidden;
        copia.addEventListener("click", function() { b.click(); });
        destino.appendChild(copia);
      });
      // × (só aparece com a barra flutuando): fecha a página aberta, como o × do topo dela.
      var fechar = document.createElement("button");
      fechar.type = "button";
      fechar.className = "btn-fechar-flutuante";
      fechar.setAttribute("aria-label", "Fechar esta página");
      fechar.title = "Fechar esta página";
      fechar.innerHTML = "&times;";
      fechar.addEventListener("click", function() {
        var painel = destino.closest(".painel-admin");
        var x = painel && painel.querySelector(".painel-topo .btn-fechar-painel");
        if (x) x.click();
      });
      destino.appendChild(fechar);
    }

    sincronizar();
    var observador = new MutationObserver(sincronizar);
    botoes.forEach(function(b) {
      observador.observe(b, { attributes: true, attributeFilter: ["disabled", "hidden", "class"], childList: true, characterData: true, subtree: true });
    });
  }

  // Barra flutuante: um "lugar" guarda a altura da barra para a página não pular quando ela é fixada.
  function flutuar(barra) {
    var lugar = document.createElement("div");
    lugar.className = "lugar-acoes-topo";
    barra.parentNode.insertBefore(lugar, barra);
    lugar.appendChild(barra);
    barra.classList.add("acoes-topo");

    function atualizar() {
      var painel = barra.closest(".painel-admin");
      var visivel = painel && !painel.hidden && getComputedStyle(barra).display !== "none";
      var r = lugar.getBoundingClientRect();
      var altura = barra.offsetHeight;
      var fixa = visivel && r.top < 0 && painel.getBoundingClientRect().bottom > altura + 16;
      barra.classList.toggle("fixa", !!fixa);
      if (fixa) {
        lugar.style.height = altura + "px";
        barra.style.left = r.left + "px";
        barra.style.width = r.width + "px";
      } else {
        lugar.style.height = "";
        barra.style.left = "";
        barra.style.width = "";
      }
    }
    window.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    window.addEventListener("painel-aberto", function() { setTimeout(atualizar, 0); });
  }

  document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll("[data-espelho]").forEach(function(destino) {
      espelhar(destino);
      flutuar(destino);
    });
  });
})();
