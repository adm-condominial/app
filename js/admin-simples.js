(function() {
  var appInicializado = false;
  var animacaoOverlay = null;

  // Register early so we don't miss auth events fired during DOMContentLoaded in other scripts.
  window.addEventListener("admin-auth-success", iniciarAppAdmin);
  function popularAptosFallback() {
    var select = document.getElementById("aptoAdmin");
    if (!select) return;

    select.innerHTML = "";
    select.add(new Option("Selecione", ""));

    for (var andar = 2; andar <= 8; andar++) {
      for (var pos = 1; pos <= 6; pos++) {
        var numApto = String(andar) + "0" + String(pos);
        select.add(new Option(numApto, numApto + "__1"));
      }
    }

    select.add(new Option("901", "901__1"));
    select.disabled = false;
  }

  function popularAptosComInventario(itens) {
    var select = document.getElementById("aptoAdmin");
    if (!select) return;

    select.innerHTML = "";
    select.add(new Option("Selecione", ""));

    (Array.isArray(itens) ? itens : []).forEach(function(item) {
      if (!item || !item.apto) return;

      var total = parseInt(item.totalRegistros, 10) || 0;
      if (total <= 0) {
        var optionVazia = new Option(item.apto + " (sem cadastro)", "");
        optionVazia.disabled = true;
        select.add(optionVazia);
        return;
      }

      var opcoes = Array.isArray(item.opcoes) ? item.opcoes : [];
      if (opcoes.length === 0) {
        var valorPadrao = item.apto + "__1";
        select.add(new Option(item.apto, valorPadrao));
        return;
      }

      opcoes.forEach(function(opcao) {
        // Firebase: id do cadastro (texto). Sheets (contingência): número da ocorrência.
        var ocorrencia = textoLimpo(opcao && (opcao.id || opcao.ocorrencia)) || "1";
        var label = String((opcao && opcao.label) || item.apto).trim();
        var valor = item.apto + "__" + ocorrencia;
        select.add(new Option(label, valor));
      });
    });

    select.disabled = false;
  }

  function carregarAptosDoServidor() {
    var select = document.getElementById("aptoAdmin");
    if (select) {
      select.disabled = true;
      select.innerHTML = "";
      select.add(new Option("Carregando", ""));
    }
    setStatus("", "");

    return DataService.listarApartamentos()
      .then(function(resposta) {
        if (resposta && Array.isArray(resposta.itens) && resposta.itens.length > 0) {
          popularAptosComInventario(resposta.itens);
          return resposta;
        }

        popularAptosFallback();
        return resposta;
      })
      .catch(function(erro) {
        if (erro && erro.codigoFonte === "nao-autorizado") {
          // Sessão expirada: o admin-auth.js já voltou para a tela de login.
          if (select) {
            select.innerHTML = "";
            select.add(new Option("Selecione", ""));
          }
          return;
        }
        popularAptosFallback();
        setStatus("Não foi possível carregar a lista de apartamentos do servidor; exibindo a lista padrão.", "erro");
      });
  }

  function setStatus(texto, tipo) {
    var status = document.getElementById("statusAdmin");
    if (!status) return;
    status.className = "status" + (tipo ? " " + tipo : "");
    status.textContent = texto || "";
  }

  // Porcentagem dentro da bolinha: js/progresso-overlay.js. Os "Aguarde" mostram um número estimado;
  // só o "Carregando a administração" informa o andamento real por aqui (null desliga).
  function setProgressoOverlayAdmin(pct) {
    if (!window.ProgressoOverlay) return;
    if (pct === null || pct === undefined) window.ProgressoOverlay.parar();
    else window.ProgressoOverlay.definir(pct);
  }

  function setOverlayAdmin(visivel, mensagem) {
    var overlay = document.getElementById("overlayProcessamento");
    var mensagemEl = document.getElementById("overlayProcessamentoMensagem");
    var spinner = overlay ? overlay.querySelector(".overlay-processamento-spinner") : null;
    if (!overlay || !mensagemEl) return;

    if (mensagem) {
      mensagemEl.textContent = mensagem;
    }

    if (visivel) {
      // Já aberto (só mudou a mensagem): a contagem continua de onde está.
      if (overlay.classList.contains("hidden") && window.ProgressoOverlay) window.ProgressoOverlay.iniciar();
      overlay.classList.remove("hidden");
      if (spinner && typeof spinner.animate === "function") {
        if (animacaoOverlay) animacaoOverlay.cancel();
        animacaoOverlay = spinner.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          { duration: 900, iterations: Infinity, easing: "linear" }
        );
      }
    } else {
      var fechar = function() {
        overlay.classList.add("hidden");
        if (animacaoOverlay) {
          animacaoOverlay.cancel();
          animacaoOverlay = null;
        }
      };
      if (window.ProgressoOverlay && !overlay.classList.contains("hidden")) window.ProgressoOverlay.concluir(fechar);
      else fechar();
    }
  }

  function textoLimpo(valor) {
    return String(valor || "").trim();
  }

  var escaparHtml = window.Utils.escaparHtml;

  function normalizarCampo(valor) {
    var texto = textoLimpo(valor);
    return texto ? texto : "Não preenchido";
  }

  // Telefone -> só dígitos, no formato DDD + número (sem o 55). Sem DDD (8 ou 9 dígitos), assume 21.
  // Com o 55 do Brasil na frente (12 ou 13 dígitos), tira o 55 para não duplicar. Outros: inválido ("").
  function telefoneComDdd(valor) {
    var digitos = String(valor || "").replace(/\D+/g, "").replace(/^0+/, "");
    if ((digitos.length === 12 || digitos.length === 13) && digitos.indexOf("55") === 0) digitos = digitos.slice(2);
    if (digitos.length === 8 || digitos.length === 9) digitos = "21" + digitos;
    return digitos.length === 10 || digitos.length === 11 ? digitos : "";
  }

  // Cada telefone vira um bloco de duas linhas: o número em cima e, embaixo, os atalhos "WhatsApp"
  // (wa.me/55...) e "Ligar" (tel:+55...). Dois telefones = quatro linhas, sempre com o mesmo espaçamento.
  function renderizarTelefonesHtml(valor) {
    var texto = textoLimpo(valor);
    if (!texto) return "Não preenchido";

    // O "(" do DDD entra no número; sem isso ele ficaria sozinho numa linha acima do bloco.
    var regexTelefone = /\+?\(?\d[\d\s().\-]{6,}\d/g;
    var html = [];
    var ultimo = 0;
    var m;
    while ((m = regexTelefone.exec(texto)) !== null) {
      var numero = textoLimpo(m[0]);
      var ddd = telefoneComDdd(numero);
      html.push(escaparHtml(texto.slice(ultimo, m.index)));
      if (ddd) {
        html.push('<span class="telefone-item"><span class="telefone-numero">' + escaparHtml(numero) + '</span>' +
          '<span class="telefone-acoes">' +
          // WhatsApp só para celular (DDD + 9 dígitos começando com 9); telefone fixo só tem "Ligar".
          (/^\d{2}9\d{8}$/.test(ddd) ? '<a class="acao-telefone acao-whatsapp" href="https://wa.me/55' + ddd + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' : '') +
          '<a class="acao-telefone acao-ligar" href="tel:+55' + ddd + '">Ligar</a></span></span>');
      } else {
        html.push(escaparHtml(m[0]));
      }
      ultimo = m.index + m[0].length;
    }
    html.push(escaparHtml(texto.slice(ultimo)));
    // Separadores entre dois telefones ("/", ",", ";", "e", "ou") somem: cada bloco já começa em linha nova,
    // e um <br> a mais criaria uma linha vazia e desigualaria o espaçamento.
    return html.join("")
      .replace(/(<\/span><\/span>)(?:\s|\/|,|;|\be\b|\bou\b)*(?=<span class="telefone-item">)/gi, "$1")
      .replace(/\n/g, "<br>");
  }

  // Endereços viram link para o Google Maps. A busca usa só o logradouro (tipo + nome) e o número:
  // "Rua Exemplo, 123, apto 402" -> "Rua Exemplo, 123". Complementos (apto, bloco, loja, andar...) ficam
  // fora da busca, porque atrapalham o Maps. O texto completo continua visível.
  var REGEX_LOGRADOURO = /\b(rua|r\.|avenida|av\.?|alameda|al\.|boulevard|travessa|tv\.|estrada|estr?\.|rodovia|rod\.|praça|praca|pça\.|largo|beco|ladeira|servidão|servidao|via|parque|vila)\s/i;

  function buscaDoEndereco(endereco) {
    var texto = textoLimpo(endereco);
    var inicio = texto.search(REGEX_LOGRADOURO);
    if (inicio > 0) texto = texto.slice(inicio);
    // nome do logradouro (sem dígitos) + número (o primeiro depois do nome; aceita "nº 12", "n. 12", "12A")
    var m = texto.match(/^([^\d,;]+?)[\s,]*(?:n[º°o.]?\s*)?(\d+[A-Za-z]?)\b/i);
    if (!m) return "";
    var nome = m[1].replace(/[\s,\-–]+$/, "").trim();
    if (nome.length < 3) return "";
    return nome + ", " + m[2];
  }

  function renderizarEnderecosHtml(valor) {
    var texto = textoLimpo(valor);
    if (!texto) return "Não preenchido";

    // Vários endereços no mesmo campo: separados por quebra de linha, ";", "|", " ou " e " e " antes de um logradouro.
    var partes = texto
      .replace(/\s+e\s+(?=(?:rua|avenida|av\.?|alameda|travessa|estrada|rodovia|praça|praca|largo|ladeira)\s)/gi, "\n")
      .split(/\s*(?:\n|;|\||\bou\b)\s*/i)
      .map(textoLimpo)
      .filter(Boolean);

    return partes.map(function(endereco) {
      var busca = buscaDoEndereco(endereco);
      if (!busca) return escaparHtml(endereco);
      var href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(busca);
      return '<a class="campo-link-endereco" href="' + href + '" target="_blank" rel="noopener noreferrer" title="Abrir ' + escaparHtml(busca) + ' no Google Maps">' + escaparHtml(endereco) + '</a>';
    }).join("<br>");
  }

  function renderizarEmailsHtml(valor) {
    var texto = textoLimpo(valor);
    if (!texto) return "Não preenchido";

    var regexEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    var html = [];
    var ultimoIndice = 0;
    var correspondencia;

    while ((correspondencia = regexEmail.exec(texto)) !== null) {
      html.push(escaparHtml(texto.slice(ultimoIndice, correspondencia.index)));
      var email = correspondencia[0];
      html.push('<a class="campo-link-email" href="mailto:' + escaparHtml(email) + '">' + escaparHtml(email) + '</a>');
      ultimoIndice = correspondencia.index + email.length;
    }

    html.push(escaparHtml(texto.slice(ultimoIndice)));
    return html.join("").replace(/\n/g, "<br>");
  }

  function estaVazio(valor) {
    return !textoLimpo(valor);
  }

  function formatarDataBr(valor) {
    var texto = textoLimpo(valor);
    if (!texto) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
      return texto;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      var partesIso = texto.split("-");
      return partesIso[2] + "/" + partesIso[1] + "/" + partesIso[0];
    }

    var data = new Date(texto);
    if (!isNaN(data.getTime())) {
      var dia = String(data.getDate()).padStart(2, "0");
      var mes = String(data.getMonth() + 1).padStart(2, "0");
      var ano = String(data.getFullYear());
      return dia + "/" + mes + "/" + ano;
    }

    return texto;
  }

  function calcularIdade(dataBr) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataBr)) return null;

    var partes = dataBr.split("/");
    var dia = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10) - 1;
    var ano = parseInt(partes[2], 10);
    var nascimento = new Date(ano, mes, dia);
    if (isNaN(nascimento.getTime())) return null;

    var hoje = new Date();
    var idade = hoje.getFullYear() - nascimento.getFullYear();
    var mesDiff = hoje.getMonth() - nascimento.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
      idade -= 1;
    }

    return idade >= 0 ? idade : null;
  }

  function formatarNascimentoComIdade(valor) {
    var dataBr = formatarDataBr(valor);
    if (!dataBr) return "";

    var idade = calcularIdade(dataBr);
    if (idade === null) return dataBr;
    return dataBr + " (" + idade + " anos)";
  }

  // Título + valor de um campo, já formatados (e-mail vira link, telefone ganha WhatsApp/Ligar etc.).
  function partesCampo(titulo, valor) {
    var tituloTexto = String(titulo || "");
    var possuiEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(String(valor || ""));
    var ehTelefone = /telefone|celular/i.test(tituloTexto);
    var ehEndereco = /endereco|endereço/i.test(tituloTexto);
    var valorHtml = possuiEmail
      ? renderizarEmailsHtml(valor)
      : (ehTelefone
      ? renderizarTelefonesHtml(valor)
      : (ehEndereco ? renderizarEnderecosHtml(valor) : escaparHtml(normalizarCampo(valor))));
    return {
      vazio: estaVazio(valor),
      telefone: ehTelefone,
      html: '<p class="campo-titulo">' + escaparHtml(tituloTexto) + '</p><p class="campo-valor">' + valorHtml + '</p>'
    };
  }

  function campoHtml(titulo, valor) {
    var p = partesCampo(titulo, valor);
    return '<div class="campo' + (p.vazio ? ' vazio' : '') + (p.telefone ? ' campo-telefone' : '') + '">' + p.html + '</div>';
  }

  // Vários campos na mesma caixa, um embaixo do outro (ex.: nome e, embaixo, o parentesco).
  // pares: lista de [titulo, valor]. A caixa só fica cinza ("vazio") quando todos estão vazios.
  function campoAgrupadoHtml(pares) {
    if (pares.length === 1) return campoHtml(pares[0][0], pares[0][1]);
    var partes = pares.map(function(par) { return partesCampo(par[0], par[1]); });
    var todosVazios = partes.every(function(p) { return p.vazio; });
    return '<div class="campo campo-agrupado' + (todosVazios ? ' vazio' : '') + '">' + partes.map(function(p) {
      return '<div class="campo-parte' + (p.vazio ? ' vazio' : '') + '">' + p.html + '</div>';
    }).join("") + '</div>';
  }

  function vagaPrincipalHtml(dados) {
    var vagaCompleta = textoLimpo(dados && dados.vagaNumeroAndar);
    
    // Se não tiver o campo novo, tenta usar os antigos para compatibilidade
    if (!vagaCompleta) {
      var numero = textoLimpo(dados && dados.vagaNumero);
      var bloco = textoLimpo(dados && dados.vagaBloco);
      var numeroFinal = numero || '9';
      var blocoFinal = bloco || 'G2';
      return '<div class="campo campo-vaga-principal"><p class="campo-valor">Vaga <strong>' + escaparHtml(numeroFinal) + '</strong> no <strong>' + escaparHtml(blocoFinal) + '</strong></p></div>';
    }
    
    // Novo formato: "número / andar" ou apenas "número"
    return '<div class="campo campo-vaga-principal"><p class="campo-valor">Vaga <strong>' + escaparHtml(vagaCompleta) + '</strong></p></div>';
  }

  function situacaoVagaHtml(situacao, aptoRelacionado) {
    var textoSituacao = textoLimpo(situacao);
    var textoApto = textoLimpo(aptoRelacionado);

    if (!textoSituacao && !textoApto) {
      return '<div class="campo campo-frase"><p class="campo-valor">Não aluga vaga</p></div>';
    }

    if (!textoApto) {
      return '<div class="campo campo-frase"><p class="campo-valor">' + escaparHtml(textoSituacao || "Não aluga vaga") + '</p></div>';
    }

    var base = textoSituacao ? textoSituacao.replace(/\s+o\s*$/i, "") : "Minha vaga está alugada para";
    return '<div class="campo campo-frase"><p class="campo-valor">' + escaparHtml(base) + ' o <strong>' + escaparHtml(textoApto) + '</strong></p></div>';
  }

  function extrairCamposLinha(valor, quantidade) {
    var texto = textoLimpo(valor);
    if (!texto) {
      return new Array(quantidade).fill("");
    }

    var partes = texto.split(/\s*\|\s*/);
    while (partes.length < quantidade) {
      partes.push("");
    }
    return partes.slice(0, quantidade);
  }

  function registroEmBoxes(titulo, linhas, nomesCampos, opcoes) {
    var lista = Array.isArray(linhas) ? linhas : [];
    var mostrarTitulo = !opcoes || opcoes.tituloVisivel !== false;
    if (!lista.length) {
      return '<div class="subsecao">' + (mostrarTitulo ? '<h3>' + titulo + '</h3>' : '') + '<p class="sem-itens">Não preenchido</p></div>';
    }

    var mostrarTituloNumerico = !opcoes || opcoes.tituloNumerico !== false;
    var ordemCampos = opcoes && Array.isArray(opcoes.ordemCampos) ? opcoes.ordemCampos : null;
    var subsecaoClasse = opcoes && opcoes.classeSubsecao ? String(opcoes.classeSubsecao) : '';
    var html = ['<div class="subsecao' + (subsecaoClasse ? (' ' + subsecaoClasse) : '') + '">' + (mostrarTitulo ? '<h3>' + titulo + '</h3>' : '') + '<div class="registro-lista">'];
    lista.forEach(function(linha, indice) {
      var campos = extrairCamposLinha(linha, nomesCampos.length);
      var tituloRegistro = mostrarTituloNumerico ? String(indice + 1) : (titulo + ' ' + (indice + 1));
      var colunas = opcoes && Array.isArray(opcoes.colunas) ? opcoes.colunas : null;
      html.push('<div class="registro-bloco"><div class="registro-titulo">' + tituloRegistro + '</div><div class="registro-conteudo"><div class="grid-campos' +
        // Sem colunas próprias: uma coluna por campo, todas da mesma largura (grid-n2, grid-n3, grid-n4).
        (colunas ? ' grid-colunas grid-colunas-' + escaparHtml(opcoes.tipoColunas || "") : ' grid-n' + nomesCampos.length) + '">');
      if (colunas) {
        // Colunas fixas (mesma largura em todos os registros e a mesma altura, a da caixa maior).
        colunas.forEach(function(coluna) {
          html.push(campoAgrupadoHtml(coluna.map(function(c) { return [nomesCampos[c], campos[c]]; })));
        });
      } else {
        nomesCampos.forEach(function(nomeCampo, idx) {
          var indiceCampo = ordemCampos && typeof ordemCampos[idx] === "number" ? ordemCampos[idx] : idx;
          html.push(campoHtml(nomeCampo, campos[indiceCampo]));
        });
      }
      html.push('</div></div></div>');
    });
    html.push('</div></div>');
    return html.join('');
  }

  function montarHtmlRegistro(dados, indiceRegistro, ocorrenciaSelecionada) {
    var secoes = [];
    var tituloRegistro = indiceRegistro > 0 ? 'Ocorrência ' + (indiceRegistro + 1) : 'Registro';
    var ocorrenciaReal = textoLimpo(dados.id || ocorrenciaSelecionada) || String(indiceRegistro + 1);
    var camposPrincipaisUnidade = [
      campoHtml("Apartamento", dados.apto),
      campoHtml("Tipo", dados.tipo),
      // Proprietário: mora ou não no imóvel (vazio para inquilino).
      textoLimpo(dados.tipo) === "Proprietário" ? campoHtml("Mora no imóvel", dados.moraNoImovel || "Sim") : "",
      // Etiquetas de cargo da administração ao lado do nome.
      campoHtml("Nome", dados.nome).replace(/<\/p><\/div>$/, (dados.cargos || []).map(function(c) {
        return ' <span class="tag-cargo">' + escaparHtml(c) + "</span>";
      }).join("") + "</p></div>"),
      campoHtml("CPF", dados.cpf),
      campoHtml("Nascimento", formatarNascimentoComIdade(dados.nasc)),
      campoHtml("RG", dados.rg),
      campoHtml("Orgão emissor", dados.orgaoEmissor),
      campoHtml("Celular", dados.celular),
      campoHtml("Telefone", dados.telFixo),
      campoHtml("E-mail", dados.email),
      // Código por e-mail para abrir o cadastro (opção do morador). "Sim" vem com o botão de desativar.
      campoHtml("Código por e-mail", dados.exigirCodigo === true ? "Sim" : "Não").replace(/<\/p><\/div>$/, dados.exigirCodigo === true
        ? ' <button type="button" class="btn-desativar-codigo" data-id="' + escaparHtml(dados.id || "") + '" data-apto="' + escaparHtml(dados.apto || "") + '">Desativar</button></p></div>'
        : "</p></div>")
    ];

    var logs = Array.isArray(dados.logsAtualizacao)
      ? dados.logsAtualizacao
      : (Array.isArray(dados.logs) ? dados.logs : []);
    var logsHtml = ['<details class="logs-atualizacao"><summary>Clique aqui para visualizar os logs de atualização</summary>'];
    if (logs.length) {
      logsHtml.push('<ul>');
      logs.forEach(function(log) {
        logsHtml.push('<li>' + escaparHtml(log) + '</li>');
      });
      logsHtml.push('</ul>');
    } else {
      logsHtml.push('<p><em>Não preenchido</em></p>');
    }
    logsHtml.push('</details>');

    // Cadastro de quem saiu do prédio: continua consultável, com o aviso no topo.
    var mudouSe = dados.situacao === "mudou-se";
    if (mudouSe) {
      var quando = formatarDataBr(dados.situacaoEm);
      secoes.push(
        '<div class="aviso-mudou-se"><strong>Mudou-se</strong>' +
          (quando ? " em " + escaparHtml(quando) : "") +
          (dados.situacaoPor ? " — marcado por " + escaparHtml(dados.situacaoPor) : "") +
          ". Este cadastro não aparece nos relatórios, na planilha nem na consulta por CPF do formulário." +
        "</div>"
      );
    }

    secoes.push(
      '<div class="registro-cabecalho">' +
        '<div class="data-envio">Data do último envio: <strong>' + escaparHtml(formatarDataBr(dados.dataUltimoEnvio || dados.dataEnvio) || "Não preenchido") + '</strong></div>' +
        // PDF mais recente do cadastro (pasta "Cadastros" no Drive), gerado a cada envio.
        (dados.pdfUrl
          ? '<a class="btn-ficha-pdf" href="' + escaparHtml(dados.pdfUrl) + '" target="_blank" rel="noopener noreferrer">Ficha em PDF</a>'
          : '<div class="sem-pdf-cadastro">Ficha em PDF: será gerada no próximo envio ou atualização.</div>') +
        logsHtml.join("") +
      '</div>' +
      '<section class="secao">' +
        '<h2>' + tituloRegistro + '</h2>' +
        '<div class="grid-campos grid-registro">' + camposPrincipaisUnidade.join("") + '</div>' +
      '</section>'
    );

    secoes.push(
      '<section class="secao">' +
        '<h2>Em caso de emergência procurar por</h2>' +
        registroEmBoxes("Em caso de emergência procurar por", dados.emergencias ? dados.emergencias.split("\n") : [], ["Nome", "Telefone/Celular", "Endereço", "Vínculo/Parentesco"], {
          // 3 colunas: nome com o parentesco embaixo | telefone | endereço.
          colunas: [[0, 3], [1], [2]], tipoColunas: "emergencia", classeSubsecao: "subsecao-emergencia", tituloVisivel: false }) +
      '</section>'
    );

    var ehInquilino = textoLimpo(dados.tipo) === "Inquilino";
    if (ehInquilino) {
      secoes.push('<section class="secao"><h2>Locação</h2><div class="grid-campos">' + [
          campoHtml("Nome do Proprietário/Administradora", dados.inqPropAdmin),
          campoHtml("Contato do Proprietário/Administradora (Telefone/Celular/E-mail)", dados.inqContato),
          campoHtml("Vigência do Contrato", dados.inqVigencia)
      ].join("") + '</div></section>');
    }

    var historico = Array.isArray(dados.historicoContratos) ? dados.historicoContratos : [];
    if (ehInquilino) {
      var contratosHtml = ['<section class="secao"><h2>Contratos</h2>'];
      if (historico.length > 0) {
        contratosHtml.push('<ul class="lista-contratos">');
        historico.forEach(function(item) {
          var texto = textoLimpo(item && item.texto);
          // Só http/https: a URL vem do formulário público e não pode virar link "javascript:".
          var url = window.Utils.urlSegura(item && item.url);
          var legenda = texto || "Contrato";
          var conteudo = url ? '<a href="' + escaparHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escaparHtml(legenda) + '</a>' : escaparHtml(legenda);
          contratosHtml.push("<li>" + conteudo + "</li>");
        });
        contratosHtml.push("</ul>");
      } else {
        contratosHtml.push('<p class="contratos-vazio"><em>Não preenchido</em></p>');
      }
      contratosHtml.push("</section>");
      secoes.push(contratosHtml.join(""));
    }

    secoes.push(
      '<section class="secao">' +
        '<h2>Demais Ocupantes</h2>' +
        registroEmBoxes("Demais Ocupantes", dados.ocupantes ? dados.ocupantes.split("\n") : [], ["Nome", "Telefone/Celular", "Data de nascimento", "Vínculo/Parentesco"], { tituloVisivel: false }) +
      '</section>'
    );

    secoes.push('<section class="secao"><h2>Dados complementares</h2>' +
      '<div class="linha-vaga-topo">' +
        vagaPrincipalHtml(dados) +
        situacaoVagaHtml(dados.vagaSituacao, dados.vagaAptoRelacionado) +
      '</div>' +
      // Miniatura do andar com a vaga pintada (a mesma do formulário); desenhada depois (desenharMapasVaga).
      '<div class="consulta-mapa-vaga" data-apto="' + escaparHtml(dados.apto) + '" data-vaga="' + escaparHtml(textoLimpo(dados.vagaNumeroAndar)) + '" hidden></div>' +
      '<div class="subsecoes-lado-a-lado subsecoes-veiculos">' +
        registroEmBoxes("Carros", dados.carros ? dados.carros.split("\n") : [], ["Marca e modelo", "Cor", "Placa"]) +
        registroEmBoxes("Motos", dados.motos ? dados.motos.split("\n") : [], ["Marca e modelo", "Cor", "Placa"]) +
        registroEmBoxes("Bicicletas", dados.bikes ? dados.bikes.split("\n") : [], ["Marca", "Cor"]) +
      '</div>' +
      registroEmBoxes("Pets", dados.pets ? dados.pets.split("\n") : [], ["Nome", "Espécie e raça", "Porte"]) +
      registroEmBoxes("Prestadores de serviço", dados.prestadores ? dados.prestadores.split("\n") : [], ["Nome", "Serviço", "Telefone/Celular", "Possui chave?"], {
        // 3 colunas: nome com o serviço embaixo | telefone | chave.
        colunas: [[0, 1], [2], [3]], tipoColunas: "prestadores" }) +
      '<div class="subsecao"><h3>Observações</h3><p class="observacoes-valor' + (estaVazio(dados.observacoes) ? ' vazio' : '') + '">' + (estaVazio(dados.observacoes) ? '<em>Não preenchido</em>' : escaparHtml(dados.observacoes)) + '</p></div>' +
      '</section>');

    // "Editar" abre o formulário do cadastro em modo administração (js/modo-admin.js).
    // Só existe com o Firebase (precisa do id do cadastro).
    var urlEditar = dados.id
      ? "index.html?editar=" + encodeURIComponent(dados.id) + "&apto=" + encodeURIComponent(dados.apto || "")
      : "";
    var atributosCadastro = ' data-apto="' + escaparHtml(dados.apto || "") + '" data-ocorrencia="' + escaparHtml(ocorrenciaReal) + '" data-nome="' + escaparHtml(dados.nome || "") + '"';
    // "Mudou-se" (ou "Reativar") no lugar de excluir quando o morador sai do prédio: o cadastro
    // e o histórico ficam guardados. Só com o Firebase (precisa do id do cadastro).
    var btnSituacao = dados.id
      ? '<button type="button" class="btn-situacao-cadastro' + (mudouSe ? " reativar" : "") + '"' + atributosCadastro +
          ' data-situacao="' + (mudouSe ? "ativo" : "mudou-se") + '">' + (mudouSe ? "Reativar" : "Mudou-se") + "</button>"
      : "";
    var btnExcluir = '<div class="admin-acoes-registro">' +
      '<button type="button" class="btn-consultar-outro">Consultar outro apartamento</button>' +
      (urlEditar ? '<a class="btn-editar-cadastro" href="' + escaparHtml(urlEditar) + '">Editar cadastro</a>' : "") +
      btnSituacao +
      '<button type="button" class="btn-excluir-cadastro"' + atributosCadastro + '>Excluir cadastro</button>' +
    '</div>';
    var btnFechar = '<button type="button" class="btn-fechar btn-fechar-registro" aria-label="Fechar cadastro" title="Fechar">&times;</button>';
    return '<div class="admin-registro-card">' + btnFechar + secoes.join("") + btnExcluir + '</div>';
  }

  // "14 / G1" ou "1 / 2 / G2": o andar é a última parte. Toque abre o mapa completo da garagem.
  function desenharMapasVaga(raiz) {
    if (!window.VagaMiniatura) return;
    raiz.querySelectorAll(".consulta-mapa-vaga").forEach(function(caixa) {
      var partes = String(caixa.getAttribute("data-vaga") || "").split("/").map(function(p) { return p.trim(); }).filter(Boolean);
      if (partes.length < 2) return;
      var andar = partes.pop(), vaga = partes.join(" / "), apto = caixa.getAttribute("data-apto");
      window.VagaMiniatura.montar(andar, vaga).then(function(svg) {
        if (!svg) return;
        var link = document.createElement("a");
        link.href = window.VagaMiniatura.urlMapa(apto, andar, vaga);
        link.target = "_blank";
        link.rel = "noopener";
        link.title = "Abrir o mapa completo da garagem";
        link.appendChild(svg);
        var dica = document.createElement("span");
        dica.className = "consulta-mapa-dica";
        dica.textContent = "Vaga " + vaga + " no " + andar + " · toque para ver o mapa completo";
        link.appendChild(dica);
        caixa.innerHTML = "";
        caixa.appendChild(link);
        caixa.hidden = false;
      }).catch(function() {});
    });
  }

  function renderizarDados(dados, ocorrenciaSelecionada) {
    var resultado = document.getElementById("resultadoAdmin");
    if (!resultado) return;

    resultado.classList.remove("vazio");

    var lista = Array.isArray(dados) ? dados : [dados];
    resultado.innerHTML = lista.map(function(item, index) {
      return montarHtmlRegistro(item, index, ocorrenciaSelecionada);
    }).join("");
    desenharMapasVaga(resultado);

    resultado.querySelectorAll(".btn-excluir-cadastro").forEach(function(botao) {
      botao.addEventListener("click", function() {
        var apto = botao.getAttribute("data-apto");
        var ocorrencia = botao.getAttribute("data-ocorrencia") || "1";
        var nome = botao.getAttribute("data-nome");
        if (!apto) return;

        // Deixa claro QUAL cadastro será excluído: o apartamento pode ter outros (proprietário, inquilino...).
        var confirmar = window.confirm("Deseja realmente excluir o cadastro " + (nome ? "de " + nome + " " : "") + "do apartamento " + apto + "? Os outros cadastros deste apartamento não serão afetados.\n\nSe o morador saiu do prédio, prefira \"Mudou-se\": o cadastro e o histórico ficam guardados. Excluir apaga tudo.");
        if (!confirmar) return;

        setOverlayAdmin(true, "Aguarde: excluindo cadastro");
        DataService.excluirCadastro(apto, ocorrencia)
          .then(function(resposta) {
            setOverlayAdmin(false);
            if (resposta && resposta.sucesso) {
              setStatus("Cadastro excluído com sucesso.", "ok");
              window.dispatchEvent(new CustomEvent("cadastro-excluido"));

              setTimeout(function() {
                carregarAptosDoServidor();
                var select = document.getElementById("aptoAdmin");
                if (select) select.value = "";
                resultado.innerHTML = "";
                resultado.classList.add("vazio");
                var placeholder = document.createElement("div");
                placeholder.className = "resultado-placeholder";
                placeholder.textContent = "Nenhum dado carregado.";
                resultado.appendChild(placeholder);
              }, 300);
              return;
            }
            setStatus((resposta && resposta.mensagem) || "Não foi possível excluir o cadastro.", "erro");
          })
          .catch(function(err) {
            setOverlayAdmin(false);
            setStatus((err && err.message) || "Não foi possível excluir o cadastro.", "erro");
          });
      });
    });

    // "Mudou-se" / "Reativar": muda a situação, reabre o cadastro e atualiza a lista de apartamentos.
    resultado.querySelectorAll(".btn-situacao-cadastro").forEach(function(botao) {
      botao.addEventListener("click", function() {
        var apto = botao.getAttribute("data-apto");
        var ocorrencia = botao.getAttribute("data-ocorrencia");
        var nome = botao.getAttribute("data-nome");
        var situacao = botao.getAttribute("data-situacao");
        var marcandoMudouSe = situacao === "mudou-se";

        var pergunta = marcandoMudouSe
          ? "Marcar o cadastro " + (nome ? "de " + nome + " " : "") + "(apto " + apto + ") como \"mudou-se\"?\n\n" +
            "Ele sai dos relatórios, da planilha e da consulta por CPF do formulário, mas continua guardado aqui e pode ser reativado."
          : "Reativar o cadastro " + (nome ? "de " + nome + " " : "") + "(apto " + apto + ")? Ele volta aos relatórios, à planilha e à consulta por CPF.";
        if (!window.confirm(pergunta)) return;

        setOverlayAdmin(true, marcandoMudouSe ? "Aguarde: marcando \"mudou-se\"" : "Aguarde: reativando cadastro");
        DataService.definirSituacaoCadastro(apto, ocorrencia, situacao)
          .then(function(resposta) {
            setOverlayAdmin(false);
            if (!resposta || !resposta.sucesso) {
              setStatus((resposta && resposta.mensagem) || "Não foi possível alterar a situação do cadastro.", "erro");
              return;
            }
            window.dispatchEvent(new CustomEvent("cadastro-alterado"));
            carregarAptosDoServidor().then(function() {
              var select = document.getElementById("aptoAdmin");
              if (select) select.value = apto + "__" + ocorrencia;
            });
            carregarRegistro(apto, ocorrencia).then(function() {
              setStatus(resposta.mensagem || "Situação atualizada.", "ok");
            });
          })
          .catch(function(err) {
            setOverlayAdmin(false);
            setStatus((err && err.message) || "Não foi possível alterar a situação do cadastro.", "erro");
          });
      });
    });

    // "Consultar outro apartamento" e o × do card: fecham o cadastro e voltam ao estado inicial.
    resultado.querySelectorAll(".btn-consultar-outro, .btn-fechar-registro").forEach(function(botao) {
      botao.addEventListener("click", function() {
        var select = document.getElementById("aptoAdmin");
        if (select) select.value = "";

        resultado.innerHTML = "";
        resultado.classList.add("vazio");
        var placeholder = document.createElement("div");
        placeholder.className = "resultado-placeholder";
        placeholder.textContent = "Nenhum dado carregado.";
        resultado.appendChild(placeholder);

        setStatus("", "");
        // Se o cadastro foi aberto pela busca, a seção de busca volta a aparecer.
        window.dispatchEvent(new CustomEvent("registro-fechado"));
      });
    });
  }

  // O cadastro pode ser aberto por outro caminho (busca geral, pendências...): o seletor da Consulta
  // passa a mostrar o apartamento que está na tela. Se não houver a opção, deixa como está.
  function sincronizarSelectApto(apto, ocorrencia) {
    var select = document.getElementById("aptoAdmin");
    if (!select) return;
    var valor = String(apto || "").trim() + "__" + (String(ocorrencia || "").trim() || "1");
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === valor) { select.value = valor; return; }
    }
  }

  function carregarRegistro(apto, ocorrencia) {
    // O cadastro aparece no painel "Consulta por apartamento" (abre e vai para o topo).
    if (window.AdminPaineis) window.AdminPaineis.abrir("painelConsulta");
    setStatus("", "");
    setOverlayAdmin(true, "Aguarde: buscando cadastro");

    return DataService.obterMoradorPorApto(apto, ocorrencia)
      .then(function(respostaFinal) {
        setOverlayAdmin(false);

        var validas = respostaFinal && respostaFinal.encontrado && respostaFinal.dados
          ? [respostaFinal.dados]
          : [];

        if (!validas.length) {
          var msgFinal = String((respostaFinal && respostaFinal.mensagem) || "");
          if (msgFinal.indexOf("Função não encontrada") !== -1) {
            setStatus("Função de consulta por apartamento ainda não está publicada no Apps Script. Publique uma nova versão do Web App e tente novamente.", "erro");
            return false;
          }

          setStatus(msgFinal || "Apartamento não encontrado.", "erro");
          var resultado = document.getElementById("resultadoAdmin");
          if (resultado) {
            resultado.classList.add("vazio");
            resultado.innerHTML = "";
          }
          return false;
        }

        setStatus("Dados carregados com sucesso.", "ok");
        sincronizarSelectApto(apto, ocorrencia);
        renderizarDados(validas, ocorrencia);
        return true;
      })
      .catch(function(err) {
        setOverlayAdmin(false);
        setStatus((err && err.message) || "Backend indisponível. Não foi possível buscar os dados.", "erro");
        return false;
      });
  }

  function buscarPorApartamento() {
    var select = document.getElementById("aptoAdmin");
    var valorSelecionado = select ? String(select.value || "") : "";
    if (!valorSelecionado) {
      setStatus("Selecione um apartamento.", "erro");
      return;
    }

    var partesSelecao = valorSelecionado.split("__");
    var apto = String(partesSelecao[0] || "").trim();
    var ocorrencia = String(partesSelecao[1] || "").trim() || "1";

    carregarRegistro(apto, ocorrencia);
  }

  window.adminSimplesCarregarApartamento = carregarRegistro;
  window.setOverlayAdmin = setOverlayAdmin;
  window.setProgressoOverlayAdmin = setProgressoOverlayAdmin;
  // × do "Aguarde": o usuário desiste da espera (a operação, se já foi enviada, termina sozinha).
  document.addEventListener("click", function(e) {
    if (e.target.closest && e.target.closest(".overlay-processamento-fechar")) setOverlayAdmin(false);
  });

  function iniciarAppAdmin() {
    if (appInicializado) {
      // Novo login após sessão expirada/encerrada: recarrega a lista com o token novo.
      carregarAptosDoServidor();
      return;
    }
    appInicializado = true;

    // Mantém somente a lista local de apartamentos.
    var listaCarregada = carregarAptosDoServidor();
    var botao = document.getElementById("btnBuscarApto");
    if (botao) {
      botao.addEventListener("click", buscarPorApartamento);
    }

    // Volta da edição pelo formulário (js/modo-admin.js): "?abrir=apto__id" reabre o cadastro.
    var abrir = new URLSearchParams(window.location.search).get("abrir");
    if (abrir && abrir.indexOf("__") !== -1) {
      history.replaceState(null, "", window.location.pathname); // não reabre ao recarregar a página
      var partes = abrir.split("__");
      Promise.resolve(listaCarregada).then(function() {
        var select = document.getElementById("aptoAdmin");
        if (select) select.value = abrir;
        carregarRegistro(partes[0], partes[1]);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    // Se não houver módulo de autenticação, inicializa direto para não quebrar ambientes legados.
    if (!document.getElementById("authGate")) {
      iniciarAppAdmin();
    }

    // If session restoration already unlocked the admin area before this callback,
    // initialize immediately to ensure apartment list is populated.
    var adminArea = document.getElementById("adminArea");
    if (adminArea && adminArea.hidden === false) {
      iniciarAppAdmin();
    }
  });
})();
// Consulta: "Desativar" o código por e-mail (ex.: o morador perdeu o acesso ao e-mail).
document.addEventListener("click", function(e) {
  var botao = e.target.closest && e.target.closest(".btn-desativar-codigo");
  if (!botao || !window.DataService) return;
  if (!window.confirm("Desativar o código por e-mail deste cadastro? O morador volta a abrir o cadastro só com CPF e data de nascimento. Fica registrado no histórico com o seu e-mail.")) return;
  botao.disabled = true;
  DataService.desativarCodigo(botao.getAttribute("data-id"))
    .then(function(r) {
      if (!r || !r.sucesso) throw new Error((r && r.mensagem) || "Não foi possível desativar.");
      if (window.adminSimplesCarregarApartamento) window.adminSimplesCarregarApartamento(botao.getAttribute("data-apto"), botao.getAttribute("data-id"));
    })
    .catch(function(erro) { window.alert((erro && erro.message) || "Não foi possível desativar."); botao.disabled = false; });
});
