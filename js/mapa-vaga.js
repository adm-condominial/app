// ==========================================
// MAPA DA GARAGEM COM A VAGA DO MORADOR
// ==========================================
// Lê o apto da URL e busca a vaga no gabarito atual (o mesmo editado no admin); andar e vaga da
// URL só valem se o gabarito não carregar. Carrega o SVG do andar, troca os aptos escritos no
// desenho pelos do gabarito e pinta a(s) vaga(s). Os SVGs ficam em mapas/ e cada vaga é um
// <g id="vaga-G1-14">. "10, 25 e 26" pinta três vagas; "1 / 2" é a vaga dupla "1/2" do G2.
(function() {
  var ANDARES = ["G1", "G2"];
  // Tela estreita ou em pé (celular): planta girada, com o texto de pé. A impressão acompanha:
  // retrato sai em folha A4 em pé; paisagem, em folha deitada.
  var consultaRetrato = window.matchMedia("(max-width: 700px), (max-aspect-ratio: 1/1)");

  function definirOrientacao(retrato) {
    document.body.classList.toggle("retrato", retrato);
    var estilo = document.getElementById("estiloPagina");
    if (!estilo) {
      estilo = document.createElement("style");
      estilo.id = "estiloPagina";
      document.head.appendChild(estilo);
    }
    estilo.textContent = "@page { size: A4 " + (retrato ? "portrait" : "landscape") + "; margin: 8mm; }";
  }

  function parametros() {
    var p = new URLSearchParams(window.location.search);
    return {
      apto: (p.get("apto") || "").trim(),
      andar: (p.get("andar") || "").trim().toUpperCase(),
      vaga: (p.get("vaga") || "").trim()
    };
  }

  function separarVagas(vaga) {
    if (!vaga || vaga === "?") return [];
    if (vaga.indexOf("/") !== -1) return [vaga.replace(/\s+/g, "")];
    return vaga.split(/,|\se\s/).map(function(s) { return s.trim(); }).filter(Boolean);
  }

  function idDaVaga(andar, n) {
    return "vaga-" + andar + "-" + n.replace("/", "-");
  }

  function textoDasVagas(vagas) {
    if (vagas.length === 1) return "vaga <strong>" + vagas[0] + "</strong>";
    return "vagas <strong>" + vagas.slice(0, -1).join(", ") + "</strong> e <strong>" + vagas[vagas.length - 1] + "</strong>";
  }

  function carregarAndar(andar) {
    return fetch("mapas/mapa-garagem-" + andar + (consultaRetrato.matches ? "-retrato" : "") + ".svg", { cache: "no-cache" })
      .then(function(r) {
        if (!r.ok) throw new Error("Não foi possível carregar o mapa do " + andar + ".");
        return r.text();
      });
  }

  // Gabarito atual (o mesmo que o formulário usa): [[apto, garagem, vaga], ...]. Se falhar, o mapa
  // sai com os aptos do desenho original e a vaga vem só da URL.
  function carregarGabarito() {
    if (!window.Backend || typeof window.Backend.chamar !== "function") return Promise.resolve(null);
    return window.Backend.chamar("fbObterGabaritoVagasCompleto", {}, false, "Firebase")
      .then(function(r) { return r && r.sucesso && Array.isArray(r.dados) ? r.dados : null; })
      .catch(function() { return null; });
  }

  // As vagas 1 e 2 do G2 são a vaga dupla "1/2" do desenho.
  function idNoDesenho(andar, n) {
    var id = idDaVaga(andar, n);
    if (!document.getElementById(id) && andar === "G2" && (n === "1" || n === "2")) id = idDaVaga("G2", "1/2");
    return id;
  }

  // Troca o apto escrito em cada vaga do desenho pelo do gabarito atual (o que vale).
  function aplicarGabaritoNoMapa(gabarito, andares) {
    var aptosPorVaga = {};
    gabarito.forEach(function(linha) {
      var apto = String(linha[0] || "").trim(), andar = String(linha[1] || "").trim().toUpperCase();
      if (!apto || andares.indexOf(andar) === -1) return;
      separarVagas(String(linha[2] || "")).forEach(function(n) {
        n.split("/").forEach(function(parte) {
          var id = idNoDesenho(andar, parte.trim());
          var lista = aptosPorVaga[id] = aptosPorVaga[id] || [];
          if (lista.indexOf(apto) === -1) lista.push(apto);
        });
      });
    });
    document.querySelectorAll("#mapas g[data-vaga]").forEach(function(g) {
      var textoApto = g.querySelector('text[data-campo="apto"]');
      var aptos = aptosPorVaga[g.id] || [];
      if (!aptos.length) {
        if (textoApto) textoApto.remove();
        return;
      }
      if (!textoApto) {
        var rect = g.querySelector("rect");
        textoApto = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textoApto.setAttribute("class", "apto");
        textoApto.setAttribute("data-campo", "apto");
        textoApto.setAttribute("x", Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2);
        textoApto.setAttribute("y", Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2 + 8);
        textoApto.setAttribute("font-size", "42");
        g.appendChild(textoApto);
      }
      textoApto.textContent = aptos.join(" / ");
      if (aptos.length > 1) textoApto.setAttribute("font-size", "28");
    });
  }

  function montar() {
    var p = parametros();
    var escapar = function(s) { return String(s).replace(/[&<>"']/g, function(c) { return "&#" + c.charCodeAt(0) + ";"; }); };
    var texto = document.getElementById("textoVaga");
    var container = document.getElementById("mapas");
    definirOrientacao(consultaRetrato.matches);

    carregarGabarito().then(function(gabarito) {
      // A vaga do apto vem do gabarito atual; a da URL só vale se o gabarito não carregar.
      if (gabarito && p.apto) {
        var linha = gabarito.filter(function(l) { return String(l[0] || "").trim().toLowerCase() === p.apto.toLowerCase(); })[0];
        if (linha) {
          p.andar = String(linha[1] || "").trim().toUpperCase();
          p.vaga = String(linha[2] || "").trim();
        }
      }
      var andarValido = ANDARES.indexOf(p.andar) !== -1;
      var vagas = andarValido ? separarVagas(p.vaga) : [];
      var andares = andarValido && vagas.length ? [p.andar] : ANDARES;

      if (andarValido && vagas.length) {
        texto.innerHTML = (p.apto ? "Apto <strong>" + escapar(p.apto) + "</strong> — " : "") +
          (vagas.length > 1 ? "suas " : "sua ") + textoDasVagas(vagas.map(escapar)) + (vagas.length > 1 ? " ficam" : " fica") + " no <strong>" + escapar(p.andar) + "</strong>, " + (vagas.length > 1 ? "pintadas" : "pintada") + " no mapa.";
        document.title = "Vaga " + vagas.join(", ") + " no " + p.andar + (p.apto ? " - Apto " + p.apto : "");
      } else {
        texto.textContent = "Demarcação das vagas nos dois andares da garagem.";
      }

      return Promise.all(andares.map(carregarAndar)).then(function(svgs) {
        container.innerHTML = svgs.map(function(svg, i) {
          return '<section class="folha"><h2 class="nao-imprimir">Garagem ' + andares[i] + "</h2>" + svg + "</section>";
        }).join("");
        if (gabarito) aplicarGabaritoNoMapa(gabarito, andares);
        var naoEncontradas = [];
        vagas.forEach(function(n) {
          n.split("/").forEach(function(parte) {
            var g = document.getElementById(idNoDesenho(p.andar, parte.trim()));
            if (g) g.classList.add("destaque"); else naoEncontradas.push(n);
          });
        });
        if (naoEncontradas.length) {
          texto.innerHTML += ' <span class="erro">(vaga ' + naoEncontradas.map(escapar).join(", ") + " não encontrada no mapa)</span>";
        }
      });
    }).catch(function(erro) {
      container.innerHTML = '<p class="erro">' + escapar(erro.message) + "</p>";
    });
  }

  document.addEventListener("DOMContentLoaded", function() {
    // Aberto dentro do popup do formulário (iframe): esconde o link de voltar.
    if (window.self !== window.top) document.body.classList.add("no-popup");
    document.getElementById("btnImprimir").addEventListener("click", function() { window.print(); });
    montar();
    // Girou o celular / mudou a largura da janela: remonta na outra orientação.
    var aoMudar = function() { montar(); };
    if (consultaRetrato.addEventListener) consultaRetrato.addEventListener("change", aoMudar);
    else if (consultaRetrato.addListener) consultaRetrato.addListener(aoMudar);
  });
})();
