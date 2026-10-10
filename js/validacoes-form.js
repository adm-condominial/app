// CONSULTA DE CPF, VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS, ORDENAÇÃO DO ALERT E REGRA DA VAGA

function ativarBuscaPorEnter() {
  const inputCpf = document.getElementById('cpfConsulta');
  const inputNasc = document.getElementById('nascConsulta');

  const dispararBuscaEnter = function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      consultarPorCpf();
    }
  };

  if (inputCpf) {
    inputCpf.addEventListener('keydown', dispararBuscaEnter);
  }

  if (inputNasc) {
    inputNasc.addEventListener('keydown', dispararBuscaEnter);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  ativarBuscaPorEnter();

  const cpfConsulta = document.getElementById('cpfConsulta');
  const moradorCpf = document.getElementById('moradorCpf');

  [cpfConsulta, moradorCpf].forEach(function(campo) {
    if (!campo) return;

    campo.addEventListener('input', function() {
      window.setTimeout(function() {
        atualizarIndicadorCpfEmTempoReal(campo);
      }, 0);
    });

    campo.addEventListener('blur', function() {
      atualizarIndicadorCpfEmTempoReal(campo);
    });
  });

  const nascConsulta = document.getElementById('nascConsulta');
  const moradorNasc = document.getElementById('moradorNasc');

  [nascConsulta, moradorNasc].forEach(function(campo) {
    if (!campo) return;

    campo.addEventListener('input', function() {
      window.setTimeout(function() {
        atualizarIndicadorDataEmTempoReal(campo);
      }, 0);
    });

    campo.addEventListener('blur', function() {
      atualizarIndicadorDataEmTempoReal(campo);
    });
  });
});

function formatarDataParaInput(dataStr) {
  if (!dataStr) return "";

  let texto = String(dataStr).trim();
  if (texto.startsWith("'")) {
    texto = texto.substring(1).trim();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 8) {
    return `${digitos.substring(0, 2)}/${digitos.substring(2, 4)}/${digitos.substring(4, 8)}`;
  }

  return texto.substring(0, 10);
}

function obterValorAlternativo(dados, ...caminhos) {
  for (const caminho of caminhos) {
    const valor = dados?.[caminho];
    if (valor !== undefined && valor !== null && valor !== "") {
      return valor;
    }
  }
  return "";
}

function normalizarTextoMultilinha(valor) {
  if (Array.isArray(valor)) {
    return valor.join("\n");
  }

  if (valor && typeof valor === 'object') {
    const valores = Object.values(valor)
      .map(v => (typeof v === 'string' ? v.trim() : v))
      .filter(v => v !== null && v !== undefined && v !== "");

    return valores.join("\n");
  }

  return String(valor || "");
}

function extrairAptoComoTexto(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  const match = texto.match(/\b\d{3}\b/);
  return match ? match[0] : texto;
}

function aplicarIndicadorCpfInvalido(campo, invalido) {
  if (!campo) return;

  if (invalido) {
    campo.classList.add('input-erro-destaque');
    campo.style.borderColor = '#e74c3c';
    campo.style.backgroundColor = '#fdf2f2';
  } else {
    campo.classList.remove('input-erro-destaque');
    campo.style.borderColor = '';
    campo.style.backgroundColor = '';
  }
}

function atualizarIndicadorCpfEmTempoReal(campo) {
  if (!campo) return;

  const valorLimpo = limparCpf(campo.value || '');
  let invalido = valorLimpo.length > 0 && valorLimpo.length !== 11;
  // No CPF do cadastro, também confere o dígito verificador. Na busca (cpfConsulta) não:
  // um cadastro antigo salvo com o CPF errado ainda precisa ser encontrado para ser corrigido.
  if (!invalido && valorLimpo.length === 11 && campo.id === 'moradorCpf') {
    invalido = !window.Utils.cpfValido(valorLimpo);
  }
  aplicarIndicadorCpfInvalido(campo, invalido);
}

function atualizarIndicadorDataEmTempoReal(campo) {
  if (!campo) return;

  const digitos = (campo.value || '').replace(/\D/g, '');
  const invalido = digitos.length > 0 && campo.value.length !== 10;
  aplicarIndicadorCpfInvalido(campo, invalido);
}

// Preenche o formulário com um cadastro vindo do backend. Usado pela busca por CPF e pela
// edição feita pela administração (js/modo-admin.js).
function preencherFormularioComCadastro(d) {
  if (document.getElementById("moradorNome")) document.getElementById("moradorNome").value = d.nome || "";
  if (document.getElementById("moradorCpf")) document.getElementById("moradorCpf").value = d.cpf || "";
  if (document.getElementById("moradorRg")) document.getElementById("moradorRg").value = d.rg || "";
  if (document.getElementById("moradorOrgaoEmissor")) document.getElementById("moradorOrgaoEmissor").value = d.orgaoEmissor || "";
  if (document.getElementById("moradorNasc") && d.nasc) document.getElementById("moradorNasc").value = formatarDataParaInput(d.nasc);
  if (document.getElementById("moradorCelular")) document.getElementById("moradorCelular").value = d.celular || "";
  if (document.getElementById("moradorTel")) document.getElementById("moradorTel").value = d.telFixo || "";
  if (document.getElementById("moradorEmail")) document.getElementById("moradorEmail").value = d.email || "";
  if (document.getElementById("exigirCodigo")) document.getElementById("exigirCodigo").checked = d.exigirCodigo === true;
  // Proprietário sem a informação (cadastros antigos) conta como morador ("Sim").
  if (document.getElementById("moraNoImovel")) document.getElementById("moraNoImovel").value = d.moraNoImovel || (/propriet/i.test(d.tipo || "") ? "Sim" : "");

  if (document.getElementById("inqPropAdmin")) document.getElementById("inqPropAdmin").value = obterValorAlternativo(d, 'inqPropAdmin', 'proprietarioAdmin', 'admin') || "";
  if (document.getElementById("inqContato")) document.getElementById("inqContato").value = obterValorAlternativo(d, 'inqContato', 'contatoInquilino', 'telefoneContato') || "";
  if (document.getElementById("inqVigencia")) document.getElementById("inqVigencia").value = obterValorAlternativo(d, 'inqVigencia', 'vigencia') || "";

  const vagaSituacao = obterValorAlternativo(d, 'vagaSituacao', 'situacaoVaga');
  const vagaAptoRelacionado = obterValorAlternativo(d, 'vagaAptoRelacionado', 'aptoRelacionado', 'aptoVaga');

  if (document.getElementById("vagaSituacao") && vagaSituacao) document.getElementById("vagaSituacao").value = vagaSituacao;
  if (document.getElementById("vagaAptoRelacionado") && vagaAptoRelacionado) document.getElementById("vagaAptoRelacionado").value = vagaAptoRelacionado;

  preencherEmergencias(normalizarTextoMultilinha(obterValorAlternativo(d, 'emergencias', 'emergenciasList', 'emergenciaList')));
  preencherOcupantes(normalizarTextoMultilinha(obterValorAlternativo(d, 'ocupantes', 'ocupantesList', 'ocupanteList')));
  preencherCarros(normalizarTextoMultilinha(obterValorAlternativo(d, 'carros', 'carrosList', 'carroList')));
  preencherMotos(normalizarTextoMultilinha(obterValorAlternativo(d, 'motos', 'motosList', 'motoList')));
  preencherBikes(normalizarTextoMultilinha(obterValorAlternativo(d, 'bikes', 'bikesList', 'bikeList')));
  preencherPets(normalizarTextoMultilinha(obterValorAlternativo(d, 'pets', 'petsList', 'petList')));
  preencherPrestadores(normalizarTextoMultilinha(obterValorAlternativo(d, 'prestadores', 'prestadoresList', 'prestadorList')));

  if (document.getElementById("observacoes")) document.getElementById("observacoes").value = d.observacoes || "";

  const historicoContratos = Array.isArray(d.linkContratoHistorico) && d.linkContratoHistorico.length > 0
    ? d.linkContratoHistorico
    : (Array.isArray(d.historicoContratos) ? d.historicoContratos : []);

  if (typeof exibirHistoricoContratos === 'function') {
    exibirHistoricoContratos(historicoContratos);
  }

  if (d.tipo) {
    const elTipo = document.getElementById("tipoResidente");
    if (elTipo) elTipo.value = d.tipo;
    tratarEscolhaTipoResidente(d.tipo);
  }

  // Só o apartamento do próprio cadastro: "aptoRelacionado"/"vagaAptoRelacionado" são o
  // apartamento da vaga alugada e não podem ser usados como apartamento do morador.
  const aptoSelecionado = extrairAptoComoTexto(obterValorAlternativo(d, 'apto'));

  if (aptoSelecionado) {
    const elApto = document.getElementById("apto");
    if (elApto) {
      elApto.value = aptoSelecionado;
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", false, true);
      elApto.dispatchEvent(evt);
    }
    
    if (typeof atualizarInfoVagaLocal === 'function') {
      atualizarInfoVagaLocal(aptoSelecionado);
    }
  }

  alterarTextoBotaoEnviar("Atualizar cadastro");
  // Cadastro existente: "Fechar visualização" (só o cadastro novo usa "Sair").
  const btnFechar = document.getElementById("btnSairSemAlterar");
  if (btnFechar && !window.modoAdminEdicao) btnFechar.textContent = "Fechar visualização";
  exibirPassoTipoResidente();
}

async function consultarPorCpf() {
  limpaMensagemStatus();
  const inputCpf = document.getElementById("cpfConsulta");
  const inputNasc = document.getElementById("nascConsulta");
  const btnBusca = document.getElementById("btnBuscarCpf");
  
  // Sessão de 1 hora (js/sessao-morador.js): os campos mostram o CPF e a data censurados, então
  // a consulta usa os valores guardados nesta aba.
  const sessaoMorador = window.SessaoMorador && window.SessaoMorador.telaTravada() ? window.SessaoMorador.obter() : null;
  if (window.SessaoMorador && window.SessaoMorador.telaTravada() && !sessaoMorador) {
    window.SessaoMorador.aplicarNaTela();
    mostrarAlerta("A sessão de 1 hora terminou. Informe o CPF e a data de nascimento de novo.", "Atenção");
    return;
  }
  const cpfInput = sessaoMorador ? sessaoMorador.cpf : (inputCpf ? inputCpf.value.trim() : "");
  const cpfLimpo = limparCpf(cpfInput);
  const nascInput = sessaoMorador ? sessaoMorador.nasc : (inputNasc ? inputNasc.value : "");
  
  if (cpfLimpo.length !== 11) {
    mostrarAlerta("Por favor, digite um CPF válido com 11 dígitos.", "Atenção");
    return;
  }

  if (!nascInput) {
    mostrarAlerta("Por favor, informe também a sua data de nascimento para confirmar a identidade.", "Atenção");
    if (inputNasc) inputNasc.focus();
    return;
  }

  let textoOriginalBtn = "Buscar Cadastro";
  if (btnBusca) {
    textoOriginalBtn = btnBusca.innerText;
    btnBusca.innerText = "Buscando";
    btnBusca.disabled = true;
  }
  if (inputCpf) inputCpf.disabled = true;
  if (inputNasc) inputNasc.disabled = true;

  if (typeof setOverlayProcessamento === 'function') {
    setOverlayProcessamento(true, 'Aguarde: buscando cadastro');
  }

  try {
    let resposta = await DataService.obterMoradorPorCpf(cpfLimpo, nascInput);

    // Cadastro protegido por código por e-mail: pede o código antes de mostrar os dados.
    if (resposta && resposta.precisaCodigo && typeof window.pedirCodigoPorEmail === "function") {
      if (typeof setOverlayProcessamento === 'function') setOverlayProcessamento(false);
      resposta = await window.pedirCodigoPorEmail(cpfLimpo, nascInput, resposta.emailMascarado)
        || { encontrado: false, cancelado: true, mensagem: "Consulta cancelada. Para abrir o cadastro, é preciso o código enviado por e-mail." };
    }

    if (btnBusca) {
      btnBusca.innerText = textoOriginalBtn;
      btnBusca.disabled = false;
    }

    if (resposta && resposta.encontrado) {
      const d = (resposta.dados && typeof resposta.dados === 'object') ? resposta.dados : {};

      if (inputCpf) {
        inputCpf.disabled = true;
        inputCpf.value = d.cpf || cpfLimpo;
      }
      if (inputNasc) {
        inputNasc.disabled = true;
      }
      if (btnBusca) {
        btnBusca.disabled = true; 
      }

      preencherFormularioComCadastro(d);

      snapshotFormularioOriginal = capturarSnapshotFormulario();
      cadastroConsultado = { id: d.id || "", cpf: cpfLimpo, nasc: nascInput, dataUltimoEnvio: d.dataUltimoEnvio || "", sessao: resposta.sessao || "" };
      if (inputCpf) delete inputCpf.dataset.sessao;
      if (window.SessaoMorador) {
        var aptoAtual = document.getElementById("apto");
        window.SessaoMorador.iniciar(cpfLimpo, nascInput, { nome: d.nome || "", apto: (aptoAtual && aptoAtual.value) || d.apto || "", email: d.email || "" });
      }

    } else {
      // Com a sessão, o CPF ou a data deixaram de conferir (ex.: bloqueio): encerra e volta à consulta normal.
      // Se a pessoa só cancelou o código por e-mail, a sessão continua.
      if (sessaoMorador && !(resposta && resposta.cancelado)) window.SessaoMorador.encerrar();
      if (inputCpf) inputCpf.disabled = false;
      if (inputNasc) inputNasc.disabled = false;
      if (inputCpf) inputCpf.value = "";
      if (inputNasc) inputNasc.value = "";
      
      const secTipo = document.getElementById('secTipoResidente');
      if (secTipo) { secTipo.classList.add('hidden'); secTipo.style.display = 'none'; }

      const secApto = document.getElementById('secApto');
      if (secApto) { secApto.classList.add('hidden'); secApto.style.display = 'none'; }

      const secResto = document.getElementById('secRestoFormulario');
      if (secResto) { secResto.classList.add('hidden'); secResto.style.display = 'none'; }

      alterarTextoBotaoEnviar("Enviar cadastro");
      if (window.SessaoMorador) window.SessaoMorador.aplicarNaTela();
      mostrarAlerta(resposta && resposta.mensagem ? resposta.mensagem : "CPF ou data de nascimento incorretos, ou não localizados na base de dados.", resposta && resposta.aguardandoAprovacao ? "Aguardando aprovação" : "Atenção");
    }
  } catch (err) {
    console.error('Erro técnico na busca:', err);

    if (btnBusca) {
      btnBusca.innerText = textoOriginalBtn;
      btnBusca.disabled = false;
    }
    if (inputCpf) inputCpf.disabled = false;
    if (inputNasc) inputNasc.disabled = false;
    if (sessaoMorador) window.SessaoMorador.aplicarNaTela(); // campos censurados continuam travados

    const erroNormalizado = String(err && err.message ? err.message : err || '').trim();
    const erroDetalhado = err && typeof err.toString === 'function'
      ? String(err.toString()).trim()
      : erroNormalizado;
    const mensagemUsuario = `Erro técnico na busca: ${erroDetalhado && erroDetalhado !== '[object Object]'
      ? erroDetalhado
      : (erroNormalizado || 'erro desconhecido.')}`;

    mostrarAlerta(mensagemUsuario, "Atenção");
  } finally {
    if (typeof setOverlayProcessamento === 'function') {
      setOverlayProcessamento(false);
    }
  }
}
