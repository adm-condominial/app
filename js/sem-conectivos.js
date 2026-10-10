// ==========================================
// REGRA GLOBAL: conectivo, artigo ou preposição nunca fica sozinho no fim da linha
// ==========================================
// Troca o espaço DEPOIS dessas palavras curtas ("a", "o", "de", "da", "em", "com", "para", "e", "ou"...)
// por um espaço que não quebra (U+00A0): elas sempre descem junto com a palavra seguinte.
// Vale para todo o texto da página, inclusive o que é montado depois (consulta, tabelas, avisos):
// um observador refaz o ajuste quando o conteúdo muda. Campos de digitação não são mexidos.
(function() {
  var PALAVRAS = "a|à|ao|aos|as|às|o|os|e|é|de|da|do|das|dos|em|na|no|nas|nos|num|numa|um|uma|uns|umas|" +
    "com|por|pela|pelo|pelas|pelos|para|pra|ou|se|que|sem|sob|até|entre|sobre|nem|mas|seu|sua|seus|suas";
  var REGEX = new RegExp("(^|[\\s(\"“])(" + PALAVRAS + ") (?=[^\\s])", "gi");
  var IGNORAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };

  function ajustarTexto(no) {
    var texto = no.nodeValue;
    if (!texto || texto.indexOf(" ") === -1) return;
    var novo = texto.replace(REGEX, function(_, antes, palavra) { return antes + palavra + " "; });
    // Duas trocas seguidas ("e a casa"): o regex não pega a segunda numa passada só.
    if (novo !== texto) novo = novo.replace(REGEX, function(_, antes, palavra) { return antes + palavra + " "; });
    if (novo !== texto) no.nodeValue = novo;
  }

  function ajustar(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { ajustarTexto(raiz); return; }
    if (raiz.nodeType !== 1 || IGNORAR[raiz.nodeName] || raiz.isContentEditable) return;
    var andador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n) {
        var p = n.parentNode;
        while (p && p !== raiz.parentNode) {
          if (p.nodeType === 1 && (IGNORAR[p.nodeName] || p.isContentEditable)) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = andador.nextNode())) ajustarTexto(n);
  }

  var pendentes = [];
  var agendado = false;
  function agendar(no) {
    pendentes.push(no);
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(function() {
      var lista = pendentes;
      pendentes = [];
      agendado = false;
      lista.forEach(ajustar);
    });
  }

  window.SemConectivos = { ajustar: ajustar };

  document.addEventListener("DOMContentLoaded", function() {
    ajustar(document.body);
    new MutationObserver(function(mudancas) {
      mudancas.forEach(function(m) {
        if (m.type === "characterData") agendar(m.target);
        else m.addedNodes.forEach(agendar);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
