// ==========================================
// GABARITO DE VAGAS (ADMIN)
// ==========================================
// Tabela editável Apto | Garagem | Vaga, uma linha por vaga (o 901, com 3 vagas, tem 3 linhas).
// Carrega ao abrir a página pela primeira vez. Cada linha é conferida com o desenho da garagem
// (os SVGs em mapas/, onde cada vaga é um <g data-vaga>): avisa quando a vaga não existe no
// desenho, é do condomínio ou já está com outro apto — mas deixa salvar mesmo assim.
// Modo "Mapa": o mesmo gabarito desenhado na planta; tocar numa vaga abre um seletor de apto.
// Tabela e mapa editam as mesmas linhas, e o "Salvar alterações" vale para os dois.
// O mapa é o modo padrão. A tabela mostra 5 vagas por vez, com "Carregar mais 5" (ou o que faltar,
// ex.: "Carregar mais 3"); ao sair da página e voltar, ou ao trocar G1/G2, volta a mostrar só 5.
(function() {
  var escaparHtml = window.Utils.escaparHtml;
  var GARAGENS = ["G1", "G2"];

  var aptos = [];          // todos os apartamentos (ordem do gabarito)
  var linhas = [];         // [{ apto, garagem, vaga }]
  var originais = "";      // JSON das linhas carregadas (para saber se há alterações)
  var desenho = null;      // { "G1": { "17": { condominio, desativada }, ... }, "G2": {...} }
  var carregado = false;
  var carregando = false;
  var svgs = {};           // texto dos SVGs de cada garagem (modo mapa), "paisagem" e "retrato"
  // Tela estreita ou em pé (celular): planta girada, com o texto de pé (mapas/*-retrato.svg).
  var consultaRetrato = window.matchMedia("(max-width: 700px), (max-aspect-ratio: 1/1)");
  var modo = "mapa";
  var POR_VEZ = 5;
  var limiteTabela = POR_VEZ; // quantas vagas da tabela estão à mostra
  var garagemMapa = "G1";
  var vagaEditada = null;  // número da vaga aberta no editor do mapa ("14", "1/2"...)

  function setStatus(texto, tipo) {
    var el = document.getElementById("statusGabarito");
    if (!el) return;
    el.className = "status" + (tipo ? " " + tipo : "");
    el.textContent = texto || "";
  }

  // "10, 25 e 26" -> ["10","25","26"]; "1 / 2" -> ["1","2"]; "?" -> [].
  function separarVagas(texto) {
    var t = String(texto || "").trim();
    if (!t || t === "?") return [];
    return t.split(/,|\se\s|\//).map(function(s) { return s.trim(); }).filter(Boolean);
  }

  // Vagas de cada garagem segundo o desenho (lidas dos próprios SVGs dos mapas).
  function carregarDesenho() {
    // Carrega a versão retrato junto (para o modo mapa no celular); o desenho é lido da paisagem.
    GARAGENS.forEach(function(g) {
      fetch("mapas/mapa-garagem-" + g + "-retrato.svg", { cache: "no-cache" })
        .then(function(r) { return r.ok ? r.text() : ""; })
        .then(function(t) { svgs[g + "-retrato"] = t; if (modo === "mapa") renderizarMapa(); })
        .catch(function() {});
    });
    return Promise.all(GARAGENS.map(function(g) {
      return fetch("mapas/mapa-garagem-" + g + ".svg", { cache: "no-cache" })
        .then(function(r) { return r.ok ? r.text() : ""; })
        .catch(function() { return ""; });
    })).then(function(textos) {
      var mapa = {};
      textos.forEach(function(svg, i) {
        svgs[GARAGENS[i]] = svg;
        var vagas = {};
        if (svg) {
          var doc = new DOMParser().parseFromString(svg, "image/svg+xml");
          doc.querySelectorAll("g[data-vaga]").forEach(function(el) {
            var classes = el.getAttribute("class") || "";
            vagas[el.getAttribute("data-vaga")] = {
              condominio: classes.indexOf("condominio") !== -1,
              desativada: classes.indexOf("desativada") !== -1
            };
          });
        }
        mapa[GARAGENS[i]] = vagas;
      });
      return mapa;
    });
  }

  // Vaga dupla "1/2" do G2: no gabarito aparece como as vagas 1 e 2.
  function vagaNoDesenho(garagem, vaga) {
    var vagas = (desenho && desenho[garagem]) || {};
    if (vagas[vaga]) return vagas[vaga];
    if (garagem === "G2" && (vaga === "1" || vaga === "2")) return vagas["1/2"] || null;
    return null;
  }

  function avisosDaLinha(linha, indice) {
    var avisos = [];
    // Vaga sem apartamento = vaga livre (não é erro).
    if (!linha.apto) return avisos;
    if (!linha.garagem) avisos.push({ erro: true, texto: "Escolha a garagem." });
    if (!linha.vaga) avisos.push({ erro: true, texto: "Informe o número da vaga." });
    if (!linha.apto || !linha.garagem || !linha.vaga) return avisos;

    if (desenho && Object.keys(desenho[linha.garagem] || {}).length) {
      var noDesenho = vagaNoDesenho(linha.garagem, linha.vaga);
      if (!noDesenho) avisos.push({ texto: "A vaga " + linha.vaga + " não existe no desenho do " + linha.garagem + "." });
      else if (noDesenho.desativada) avisos.push({ texto: "No desenho, a vaga " + linha.vaga + " do " + linha.garagem + " está desativada." });
      else if (noDesenho.condominio) avisos.push({ texto: "No desenho, a vaga " + linha.vaga + " do " + linha.garagem + " é do condomínio." });
    }
    linhas.forEach(function(outra, j) {
      if (j !== indice && outra.apto && outra.apto !== linha.apto && outra.garagem === linha.garagem && outra.vaga === linha.vaga) {
        avisos.push({ texto: "Vaga também atribuída ao apto " + outra.apto + "." });
      }
    });
    var outraGaragem = linhas.some(function(outra) { return outra.apto === linha.apto && outra.garagem && outra.garagem !== linha.garagem; });
    if (outraGaragem) avisos.push({ erro: true, texto: "O apto " + linha.apto + " tem vagas no G1 e no G2; o sistema guarda uma garagem por apartamento." });
    return avisos;
  }

  function opcoes(lista, selecionado, vazio, rotulo) {
    return '<option value="">' + vazio + "</option>" + lista.map(function(v) {
      return '<option value="' + escaparHtml(v) + '"' + (v === selecionado ? " selected" : "") + ">" + escaparHtml(rotulo ? rotulo(v) : v) + "</option>";
    }).join("");
  }

  // "606 · Rafael Loureiro Braz" — usa os nomes que a Consulta por apartamento já carregou
  // (opções "apto__id" com texto "606 - Nome"). Cadastros "mudou-se" ficam de fora.
  function nomesPorApto() {
    var mapa = {};
    var select = document.getElementById("aptoAdmin");
    if (!select) return mapa;
    Array.prototype.forEach.call(select.options, function(o) {
      var partes = String(o.value || "").split("__");
      if (partes.length < 2 || /mudou-se/i.test(o.text)) return;
      var nome = String(o.text || "").replace(/^\s*[^-–]+[-–]\s*/, "").trim();
      if (!nome) return;
      (mapa[partes[0]] = mapa[partes[0]] || []).push(nome);
    });
    return mapa;
  }

  function rotuloApto(nomes) {
    return function(apto) { return nomes[apto] ? apto + " · " + nomes[apto].join(" / ") : apto; };
  }

  // Vagas cujo número mudou em relação ao que foi carregado (vai contra o desenho original).
  function numeracaoMudou() {
    return linhas.some(function(l) { return l.vagaOriginal !== undefined && l.vaga !== l.vagaOriginal; });
  }

  function renderizar() {
    var tabela = document.getElementById("tabelaGabarito");
    if (!tabela) return;
    var rotulo = rotuloApto(nomesPorApto());
    // Só as vagas da garagem escolhida (G1/G2), da menor para a maior; vagas sem número no fim.
    var visiveis = linhas.map(function(l, i) { return i; }).filter(function(i) {
      return linhas[i].garagem === garagemMapa;
    }).sort(function(a, b) {
      var va = parseInt(linhas[a].vaga, 10), vb = parseInt(linhas[b].vaga, 10);
      if (isNaN(va) !== isNaN(vb)) return isNaN(va) ? 1 : -1;
      return (va - vb) || (a - b);
    });
    var total = visiveis.length;
    visiveis = visiveis.slice(0, limiteTabela);
    tabela.innerHTML = visiveis.map(function(i) {
      var l = linhas[i];
      var avisos = avisosDaLinha(l, i);
      return '<div class="gabarito-linha' + (avisos.length ? " com-aviso" : "") + '" data-indice="' + i + '">' +
        '<input data-campo="vaga" type="text" inputmode="numeric" maxlength="2" placeholder="nº" aria-label="Vaga" value="' + escaparHtml(l.vaga) + '">' +
        '<select data-campo="apto" aria-label="Apartamento">' + opcoes(aptos, l.apto, "— Condomínio —", rotulo) + "</select>" +
        (avisos.length ? '<div class="gabarito-avisos">' + avisos.map(function(a) {
          return '<span class="' + (a.erro ? "aviso-erro" : "aviso") + '">' + (a.erro ? "⛔ " : "⚠️ ") + escaparHtml(a.texto) + "</span>";
        }).join("") + "</div>" : "") +
      "</div>";
    }).join("") || '<p class="sem-itens">Nenhuma vaga no ' + garagemMapa + ".</p>";
    var mais = document.getElementById("btnCarregarMaisGabarito");
    if (mais) {
      var restante = total - visiveis.length;
      mais.hidden = restante <= 0;
      mais.textContent = "Carregar mais " + Math.min(POR_VEZ, restante);
    }
    var restaurar = document.getElementById("btnRestaurarNumeracao");
    if (restaurar) restaurar.disabled = !numeracaoMudou();
    atualizarBotoes();
    if (modo === "mapa") renderizarMapa();
  }

  // ---------- Modo mapa ----------
  // Números do gabarito que correspondem a uma vaga do desenho ("1/2" do G2 = vagas 1 e 2).
  function numerosDaVaga(garagem, vagaDesenho) {
    return garagem === "G2" && vagaDesenho === "1/2" ? ["1", "2"] : [vagaDesenho];
  }

  function indicesDaVaga(garagem, vagaDesenho) {
    var numeros = numerosDaVaga(garagem, vagaDesenho);
    var indices = [];
    linhas.forEach(function(l, i) { if (l.garagem === garagem && numeros.indexOf(l.vaga) !== -1) indices.push(i); });
    return indices;
  }

  function criarTextoSvg(g, texto, y, tamanho, cor) {
    var rect = g.querySelector("rect");
    var el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2);
    el.setAttribute("y", y);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("font-size", tamanho);
    el.setAttribute("font-weight", "bold");
    el.setAttribute("fill", cor);
    el.textContent = texto;
    g.appendChild(el);
  }

  function renderizarMapa() {
    var container = document.getElementById("mapaGabarito");
    if (!container) return;
    var svg = (consultaRetrato.matches && svgs[garagemMapa + "-retrato"]) || svgs[garagemMapa];
    if (!svg) {
      container.innerHTML = '<p class="sem-itens">Não foi possível carregar o desenho do ' + garagemMapa + ".</p>";
      return;
    }
    container.innerHTML = svg;
    container.classList.toggle("retrato", svg === svgs[garagemMapa + "-retrato"]);
    container.querySelectorAll("g[data-vaga]").forEach(function(g) {
      var n = g.getAttribute("data-vaga");
      var indices = indicesDaVaga(garagemMapa, n);
      var aptosDaVaga = indices.map(function(i) { return linhas[i].apto; })
        .filter(function(a, i, lista) { return a && lista.indexOf(a) === i; });
      var comAviso = indices.some(function(i) { return avisosDaLinha(linhas[i], i).length; });

      // Troca o apto escrito no desenho pelo do gabarito atual (que é o que vale).
      g.querySelectorAll("text[data-campo]").forEach(function(t) { t.remove(); });
      var rect = g.querySelector("rect");
      var meio = Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2 + 12;
      if (aptosDaVaga.length) {
        criarTextoSvg(g, aptosDaVaga.join(" / "), meio, aptosDaVaga.length > 1 ? 28 : 40, "#1d2b3a");
      } else {
        var condominio = (g.getAttribute("class") || "").indexOf("condominio") !== -1;
        criarTextoSvg(g, "CONDOMÍNIO", meio, 22, condominio ? "#4a6b8a" : "#9aa5b1");
      }
      g.classList.toggle("com-aviso", comAviso);
      g.classList.toggle("selecionada", n === vagaEditada);
    });
  }

  function abrirEditorVaga(n) {
    vagaEditada = n;
    var indices = indicesDaVaga(garagemMapa, n);
    var atual = indices.length ? linhas[indices[0]].apto : "";
    document.getElementById("editorVagaTitulo").textContent = "Vaga " + n + " · " + garagemMapa;
    document.getElementById("editorVagaApto").innerHTML = '<option value="">— Condomínio —</option>' + aptos.map(function(a) {
      return '<option value="' + escaparHtml(a) + '"' + (a === atual ? " selected" : "") + ">" + escaparHtml(a) + "</option>";
    }).join("");
    var noDesenho = vagaNoDesenho(garagemMapa, numerosDaVaga(garagemMapa, n)[0]);
    var avisos = [];
    if (noDesenho && noDesenho.desativada) avisos.push("No desenho, esta vaga está desativada.");
    else if (noDesenho && noDesenho.condominio) avisos.push("No desenho, esta vaga é do condomínio.");
    indices.forEach(function(i) {
      avisosDaLinha(linhas[i], i).forEach(function(a) { if (avisos.indexOf(a.texto) === -1 && !/do condomínio|desativada/.test(a.texto)) avisos.push(a.texto); });
    });
    document.getElementById("editorVagaAvisos").innerHTML = avisos.map(function(a) { return '<span class="aviso">⚠️ ' + escaparHtml(a) + "</span>"; }).join("");
    document.getElementById("editorVagaMapa").hidden = false;
    renderizarMapa();
  }

  function fecharEditorVaga() {
    vagaEditada = null;
    document.getElementById("editorVagaMapa").hidden = true;
    renderizarMapa();
  }

  // Dá a vaga ao apto escolhido (ou deixa livre): tira quem estava nela e acrescenta a linha nova.
  function aplicarEditorVaga() {
    if (vagaEditada === null) return;
    var apto = document.getElementById("editorVagaApto").value;
    var remover = indicesDaVaga(garagemMapa, vagaEditada);
    var antigas = linhas.filter(function(l, i) { return remover.indexOf(i) !== -1; });
    linhas = linhas.filter(function(l, i) { return remover.indexOf(i) === -1; });
    // A vaga continua na tabela mesmo livre (vagas não são removidas, só ficam sem apto).
    numerosDaVaga(garagemMapa, vagaEditada).forEach(function(v) {
      var antiga = antigas.filter(function(l) { return l.vaga === v; })[0];
      linhas.push({ apto: apto, garagem: garagemMapa, vaga: v, vagaOriginal: antiga ? antiga.vagaOriginal : v });
    });
    ordenar();
    vagaEditada = null;
    document.getElementById("editorVagaMapa").hidden = true;
    renderizar();
  }

  function trocarModo(novo) {
    modo = novo;
    document.querySelectorAll(".gabarito-modos [data-modo]").forEach(function(b) {
      b.classList.toggle("ativo", b.getAttribute("data-modo") === novo);
    });
    document.getElementById("modoTabelaGabarito").hidden = novo !== "tabela";
    document.getElementById("modoMapaGabarito").hidden = novo !== "mapa";
    if (novo === "mapa") renderizarMapa();
  }

  function haAlteracoes() {
    return JSON.stringify(linhasParaEnviar()) !== originais;
  }

  function atualizarBotoes() {
    var alterado = haAlteracoes();
    var salvar = document.getElementById("btnSalvarGabarito");
    var desfazer = document.getElementById("btnDesfazerGabarito");
    if (salvar) salvar.disabled = !alterado;
    if (desfazer) desfazer.disabled = !alterado;
  }

  function linhasParaEnviar() {
    // Vagas livres (sem apto) não vão para o banco: só as atribuídas.
    return linhas.filter(function(l) { return l.apto; })
      .map(function(l) { return { apto: l.apto, garagem: l.garagem, vaga: l.vaga }; });
  }

  function ordenar() {
    linhas.sort(function(a, b) {
      var ia = aptos.indexOf(a.apto), ib = aptos.indexOf(b.apto);
      if (ia !== ib) return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
      return Number(a.vaga) - Number(b.vaga);
    });
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    setStatus("Carregando", "carregando");
    Promise.all([DataService.obterGabaritoVagasCompleto(), desenho ? Promise.resolve(desenho) : carregarDesenho()])
      .then(function(r) {
        var resposta = r[0];
        desenho = r[1];
        if (!resposta || !resposta.sucesso || !Array.isArray(resposta.dados)) {
          setStatus((resposta && resposta.mensagem) || "Não foi possível carregar o gabarito.", "erro");
          return;
        }
        aptos = [];
        linhas = [];
        resposta.dados.forEach(function(d) {
          var apto = String(d[0] || "").trim();
          if (!apto) return;
          if (aptos.indexOf(apto) === -1) aptos.push(apto);
          var garagem = String(d[1] || "").trim().toUpperCase();
          separarVagas(d[2]).forEach(function(v) {
            linhas.push({ apto: apto, garagem: GARAGENS.indexOf(garagem) !== -1 ? garagem : "", vaga: v, vagaOriginal: v });
          });
        });
        // Todas as vagas do desenho aparecem na tabela; as que ninguém usa entram como livres.
        GARAGENS.forEach(function(g) {
          Object.keys((desenho && desenho[g]) || {}).forEach(function(vd) {
            if (desenho[g][vd].desativada) return;
            numerosDaVaga(g, vd).forEach(function(v) {
              var usada = linhas.some(function(l) { return l.garagem === g && l.vaga === v; });
              if (!usada) linhas.push({ apto: "", garagem: g, vaga: v, vagaOriginal: v });
            });
          });
        });
        aptos.sort(function(a, b) {
          var na = parseInt(a.replace(/\D/g, ""), 10) || Infinity, nb = parseInt(b.replace(/\D/g, ""), 10) || Infinity;
          return na !== nb ? (na < nb ? -1 : 1) : (a < b ? -1 : 1);
        });
        ordenar();
        originais = JSON.stringify(linhasParaEnviar());
        carregado = true;
        document.getElementById("painelGabarito").classList.add("conteudo-carregado");
        setStatus("", "");
        renderizar();
      })
      .catch(function(erro) {
        setStatus((erro && erro.message) || "Não foi possível carregar o gabarito.", "erro");
      })
      .then(function() { carregando = false; });
  }

  function salvar() {
    var enviar = linhasParaEnviar();
    var todosAvisos = [];
    var erros = [];
    linhas.forEach(function(l, i) {
      avisosDaLinha(l, i).forEach(function(a) { (a.erro ? erros : todosAvisos).push((l.apto || "?") + ": " + a.texto); });
    });
    if (erros.length) {
      setStatus("Corrija antes de salvar: " + erros[0], "erro");
      return;
    }
    if (todosAvisos.length && !window.confirm("Há " + todosAvisos.length + " aviso(s):\n\n" + todosAvisos.slice(0, 8).join("\n") +
      (todosAvisos.length > 8 ? "\n(e mais " + (todosAvisos.length - 8) + ")" : "") + "\n\nSalvar mesmo assim?")) {
      return;
    }

    var botao = document.getElementById("btnSalvarGabarito");
    if (botao) botao.disabled = true;
    if (window.setOverlayAdmin) window.setOverlayAdmin(true, "Aguarde: salvando o gabarito de vagas");
    DataService.salvarGabarito(enviar)
      .then(function(resposta) {
        if (!resposta || !resposta.sucesso) throw new Error((resposta && resposta.mensagem) || "Não foi possível salvar.");
        originais = JSON.stringify(linhasParaEnviar());
        var mudancas = resposta.mudancas || [];
        setStatus(mudancas.length
          ? "Salvo. " + mudancas.map(function(m) { return m.apto + ": " + m.de + " → " + m.para; }).join("; ")
          : (resposta.mensagem || "Nada mudou."), "ok");
        renderizar();
        // Histórico e relatórios se atualizam (a vaga aparece na lista de veículos e no mapa).
        if (mudancas.length) window.dispatchEvent(new CustomEvent("cadastro-alterado"));
      })
      .catch(function(erro) {
        setStatus((erro && erro.message) || "Não foi possível salvar o gabarito.", "erro");
        atualizarBotoes();
      })
      .then(function() {
        if (window.setOverlayAdmin) window.setOverlayAdmin(false);
      });
  }

  document.addEventListener("DOMContentLoaded", function() {
    var tabela = document.getElementById("tabelaGabarito");
    if (!tabela || !window.DataService) return;

    // Cache da área admin (DataService): abre na hora com o último resultado e revalida em segundo plano.
    window.addEventListener("painel-aberto", function(e) {
      if (!e.detail || e.detail.id !== "painelGabarito") return;
      // Voltou à página: a tabela recomeça com 5 vagas.
      limiteTabela = POR_VEZ;
      if (!carregado || !haAlteracoes()) carregar(); else renderizar();
    });
    document.getElementById("btnCarregarMaisGabarito").addEventListener("click", function() {
      limiteTabela += POR_VEZ;
      renderizar();
    });
    window.addEventListener("dados-admin-atualizados", function(e) {
      var painelEl = document.getElementById("painelGabarito");
      if (e.detail && e.detail.nome === "obterGabaritoVagasCompleto" && painelEl && !painelEl.hidden && (!carregado || !haAlteracoes())) setTimeout(carregar, 50); // depois do carregamento em andamento
    });
    document.getElementById("btnAtualizarGabarito").addEventListener("click", function() {
      if (!((!carregado || !haAlteracoes())) && !window.confirm("Há alterações não salvas. Atualizar e descartar?")) return;
      DataService.limparCacheAdmin("obterGabaritoVagasCompleto");
      carregar();
    });

    tabela.addEventListener("input", function(e) {
      var campo = e.target.getAttribute("data-campo");
      var linhaEl = e.target.closest(".gabarito-linha");
      if (!campo || !linhaEl) return;
      if (campo === "vaga") e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
      linhas[Number(linhaEl.getAttribute("data-indice"))][campo] = e.target.value;
      atualizarBotoes();
    });
    // Os avisos são recalculados ao sair do campo (e não a cada tecla, para não perder o foco).
    tabela.addEventListener("change", function(e) {
      var campo = e.target.getAttribute("data-campo");
      if (!campo) return;
      if (campo === "vaga") {
        var linha = linhas[Number(e.target.closest(".gabarito-linha").getAttribute("data-indice"))];
        if (linha && linha.vagaOriginal !== undefined && linha.vaga !== linha.vagaOriginal) {
          window.alert("Atenção: você mudou o número da vaga " + linha.vagaOriginal + " do " + linha.garagem + " para " + (linha.vaga || "(vazio)") +
            ".\n\nIsso vai contra o desenho original da garagem. Para desfazer, use \"Restaurar distribuição original\".");
        }
      }
      renderizar();
    });
    document.getElementById("btnDesfazerGabarito").addEventListener("click", function() {
      if (!haAlteracoes() || window.confirm("Descartar as alterações no gabarito?")) {
        carregado = false;
        carregar();
      }
    });
    document.getElementById("btnSalvarGabarito").addEventListener("click", salvar);

    document.querySelectorAll(".gabarito-modos [data-modo]").forEach(function(b) {
      b.addEventListener("click", function() { trocarModo(b.getAttribute("data-modo")); });
    });
    document.querySelectorAll(".gabarito-garagens [data-garagem]").forEach(function(b) {
      b.addEventListener("click", function() {
        garagemMapa = b.getAttribute("data-garagem");
        limiteTabela = POR_VEZ;
        document.querySelectorAll(".gabarito-garagens [data-garagem]").forEach(function(o) { o.classList.toggle("ativo", o === b); });
        fecharEditorVaga();
        renderizar();
      });
    });
    document.getElementById("mapaGabarito").addEventListener("click", function(e) {
      var g = e.target.closest && e.target.closest("g[data-vaga]");
      if (g) abrirEditorVaga(g.getAttribute("data-vaga"));
    });
    document.getElementById("editorVagaAplicar").addEventListener("click", aplicarEditorVaga);
    // Volta os números das vagas ao que estava carregado (mantém as trocas de apartamento).
    document.getElementById("btnRestaurarNumeracao").addEventListener("click", function() {
      if (!numeracaoMudou()) return;
      linhas.forEach(function(l) { if (l.vagaOriginal !== undefined) l.vaga = l.vagaOriginal; });
      renderizar();
      setStatus("Números das vagas restaurados conforme o desenho original.", "ok");
    });
    // Girou o celular / mudou a largura da janela: troca entre retrato e paisagem.
    var aoMudarOrientacao = function() { if (modo === "mapa") renderizarMapa(); };
    if (consultaRetrato.addEventListener) consultaRetrato.addEventListener("change", aoMudarOrientacao);
    else if (consultaRetrato.addListener) consultaRetrato.addListener(aoMudarOrientacao);
    document.getElementById("editorVagaCancelar").addEventListener("click", fecharEditorVaga);
  });
})();
