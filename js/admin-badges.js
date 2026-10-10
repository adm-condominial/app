// ==========================================
// BOLINHAS DE CONTAGEM DO MENU (PENDÊNCIAS, CADASTROS PARA APROVAÇÃO, ÚLTIMAS ALTERAÇÕES)
// ==========================================
// Cada número fica guardado no servidor (config/contadores). Ao entrar na administração, a página lê
// os três de uma vez e mostra as bolinhas juntas, só depois dessa leitura. Quando uma lista carrega,
// a página grava o número novo no servidor e a bolinha muda sozinha.
// Se o número for 0, a bolinha fica verde com "OK".
// Só guarda números (nenhum dado de morador). Quem não tem autorização para a página não vê a bolinha.
(function() {
  // Bolinha -> autorização exigida (Membros > Autorizações).
  var PERMISSAO = { contadorPendencias: "pendencias", contadorAprovacoes: "aprovacoes", contadorHistorico: "historico" };
  var valores = {};      // número conhecido de cada bolinha (vindo da lista ou do servidor)
  var gravados = {};     // último número enviado ao servidor, para não gravar à toa
  var pronto = false;    // as bolinhas só aparecem depois da leitura conjunta do servidor
  var lendo = false;

  function mostrar(el, total) {
    var ok = total === 0;
    var texto = ok ? "OK" : (total > 99 ? "99+" : String(total));
    if (el.textContent !== texto) el.textContent = texto;
    el.classList.toggle("ok", ok);
    el.classList.remove("aguardando");
    el.hidden = false;
  }

  function podeVer(id) {
    var p = window.AdminAuth && window.AdminAuth.getPermissoes ? window.AdminAuth.getPermissoes() : null;
    return !p || p[PERMISSAO[id]] !== false;
  }

  // Mostra todas de uma vez: com o número, ou escondidas (sem autorização, ou sem número).
  function mostrarTodas() {
    Object.keys(PERMISSAO).forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!podeVer(id) || typeof valores[id] !== "number") { el.hidden = true; el.classList.remove("aguardando"); return; }
      mostrar(el, valores[id]);
    });
  }

  // Chamado pelas páginas quando a contagem real chega (lista carregada): atualiza e grava no servidor.
  function definir(id, total) {
    total = Math.max(0, parseInt(total, 10) || 0);
    valores[id] = total;
    if (pronto) {
      var el = document.getElementById(id);
      if (el && podeVer(id)) mostrar(el, total);
    }
    if (gravados[id] === total) return;
    gravados[id] = total;
    if (window.DataService && DataService.salvarContador) {
      Promise.resolve(DataService.salvarContador(id, total)).catch(function() {});
    }
  }

  // Lê os três números guardados no servidor de uma vez e mostra todas juntas.
  function restaurar() {
    if (lendo || pronto) return;
    if (!window.DataService || !DataService.obterContadores) return;
    if (!window.AdminAuth || !window.AdminAuth.getIdToken || !window.AdminAuth.getIdToken()) return;
    lendo = true;
    // Enquanto o servidor responde, a administração fica numa tela de carregamento (não aparece pela metade).
    // Limite de 10 segundos: se a resposta demorar mais, a tela libera mesmo assim.
    // Junto com os números do menu, a tela já busca as páginas que pedem carregamento (Pendências, Membros,
    // Autorizações, Notificações, Gabarito, Bloqueios...), com a porcentagem dentro da bolinha. Se passar de
    // 25 segundos, libera a tela e o que faltar termina em segundo plano.
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, "Carregando a administração");
    function progresso(pct) { if (window.setProgressoOverlayAdmin) window.setProgressoOverlayAdmin(pct); }
    progresso(0);
    var limite = setTimeout(terminar, 25000);
    function terminar() {
      clearTimeout(limite);
      if (!lendo) return;
      lendo = false;
      pronto = true;
      mostrarTodas();
      if (window.setOverlayAdmin) window.setOverlayAdmin(false);
    }
    function lerContadores() {
      return DataService.obterContadores().then(function(r) {
        if (r && r.sucesso) {
          Object.keys(PERMISSAO).forEach(function(id) {
            // Se a lista já chegou nesta página, o número dela vale mais que o guardado.
            if (typeof valores[id] !== "number" && typeof r[id] === "number") {
              valores[id] = r[id];
              gravados[id] = r[id];
            }
          });
        }
      });
    }
    if (window.AdminPreCarga) {
      window.AdminPreCarga.executar([lerContadores], progresso).then(terminar);
    } else {
      lerContadores().catch(function() {}).then(terminar);
    }
  }

  window.BadgeMenu = { definir: definir, restaurar: restaurar };
  document.addEventListener("DOMContentLoaded", restaurar);
  window.addEventListener("admin-auth-success", restaurar);
})();
