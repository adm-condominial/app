// ==========================================
// PORCENTAGEM DENTRO DA BOLINHA DOS POPUPS "AGUARDE"
// ==========================================
// Todo popup de carregamento (#overlayProcessamento, da página inicial e da administração) mostra um
// número de 0% a 100% dentro da bolinha. Dois modos:
//   - estimado (padrão, o servidor não informa o andamento): sobe rápido e desacelera até 95%; ao
//     terminar a operação vai a 100% e o popup fecha logo em seguida;
//   - real (definir): o número segue o valor informado (ex.: "Carregando a administração", que sabe
//     quantas leituras já terminaram).
// O número sobe de forma suave e fica parado no centro (só o arco da bolinha gira).
(function() {
  var TETO_ESTIMADO = 95;
  var PAUSA_100_MS = 160;

  var modo = null;       // null | "estimado" | "real"
  var alvo = 0;
  var exibido = 0;
  var timer = null;
  var saida = null;

  function overlay() { return document.getElementById("overlayProcessamento"); }

  function desenhar() {
    var el = document.getElementById("overlayProcessamentoPercentual");
    if (el) el.textContent = exibido + "%";
  }

  function tique() {
    if (modo === "estimado") alvo = Math.min(TETO_ESTIMADO, alvo + Math.max(0.15, (TETO_ESTIMADO - alvo) * 0.025));
    var meta = Math.round(alvo);
    if (exibido < meta) {
      exibido = Math.min(meta, exibido + Math.max(1, Math.ceil((meta - exibido) / 6)));
      desenhar();
    } else if (modo === "real") {
      clearInterval(timer);
      timer = null;
    }
  }

  function ligar(novoModo, inicio) {
    var o = overlay();
    if (!o) return;
    clearTimeout(saida);
    saida = null;
    modo = novoModo;
    if (!o.classList.contains("com-percentual")) {
      exibido = 0;
      o.classList.add("com-percentual");
    }
    alvo = inicio;
    desenhar();
    if (!timer) timer = setInterval(tique, 50);
  }

  // Popup aberto: começa a contagem estimada em 0%.
  function iniciar() {
    exibido = 0;
    ligar("estimado", 0);
  }

  // Progresso real, de 0 a 100.
  function definir(pct) {
    ligar("real", Math.max(0, Math.min(100, Math.round(pct))));
  }

  function parar() {
    clearInterval(timer);
    clearTimeout(saida);
    timer = null;
    saida = null;
    modo = null;
    alvo = 0;
    exibido = 0;
    var o = overlay();
    if (o) o.classList.remove("com-percentual");
  }

  // Operação terminou: se a contagem era estimada, mostra 100% por um instante antes de fechar.
  // aoFechar(): quem fecha o popup de fato (some o card, para a animação).
  function concluir(aoFechar) {
    if (modo !== "estimado") { parar(); aoFechar(); return; }
    clearInterval(timer);
    timer = null;
    alvo = 100;
    exibido = 100;
    desenhar();
    clearTimeout(saida);
    saida = setTimeout(function() { saida = null; parar(); aoFechar(); }, PAUSA_100_MS);
  }

  window.ProgressoOverlay = { iniciar: iniciar, definir: definir, parar: parar, concluir: concluir };
})();
