// ==========================================
// CONTROLE DE ESTADO E ENVIO DO FORMULÁRIO
// ==========================================

function limparDestaqueCampos() {
  document.querySelectorAll('.input-erro-destaque').forEach(el => {
    el.classList.remove('input-erro-destaque');
    el.style.borderColor = '';
    el.style.backgroundColor = '';
  });
}

function destacarCampoObrigatorio(el) {
  if (!el) return;
  el.classList.add('input-erro-destaque');
  el.style.borderColor = '#e74c3c';
  el.style.backgroundColor = '#fdf2f2';
}

document.addEventListener('input', function(e) {
  if (e.target.classList.contains('input-erro-destaque')) {
    e.target.classList.remove('input-erro-destaque');
    e.target.style.borderColor = '';
    e.target.style.backgroundColor = '';
  }
});

document.addEventListener('change', function(e) {
  if (e.target.classList.contains('input-erro-destaque')) {
    e.target.classList.remove('input-erro-destaque');
    e.target.style.borderColor = '';
    e.target.style.backgroundColor = '';
  }
});

function alterarTextoBotaoEnviar(novoTexto) {
  const btnSubmit = document.getElementById("btnEnviarForm") || document.querySelector("button[onclick='enviar()']");
  if (btnSubmit) {
    btnSubmit.textContent = novoTexto;
    btnSubmit.innerText = novoTexto;
  }
}

function formatarListaCamposFaltantes(campos) {
  if (!campos.length) return "";
  if (campos.length === 1) return campos[0];
  if (campos.length === 2) return `${campos[0]} e ${campos[1]}`;

  return `${campos.slice(0, -1).join(', ')} e ${campos[campos.length - 1]}`;
}

// × do "Aguarde" (em qualquer página): a pessoa desiste da espera; o envio, se já saiu, termina sozinho.
document.addEventListener('click', function(e) {
  if (e.target.closest && e.target.closest('.overlay-processamento-fechar')) {
    const overlay = e.target.closest('.overlay-processamento');
    if (overlay && overlay.id === 'overlayProcessamento') setOverlayProcessamento(false);
  }
});

function setOverlayProcessamento(visivel, mensagem) {
  const overlay = document.getElementById('overlayProcessamento');
  const mensagemEl = document.getElementById('overlayProcessamentoMensagem');
  const spinner = overlay ? overlay.querySelector('.overlay-processamento-spinner') : null;
  if (!overlay) return;

  if (mensagemEl && mensagem) {
    mensagemEl.textContent = mensagem;
  }

  if (visivel) {
    // Já aberto (só mudou a mensagem): a contagem continua de onde está.
    if (overlay.classList.contains('hidden') && window.ProgressoOverlay) window.ProgressoOverlay.iniciar();
    overlay.classList.remove('hidden');
    if (spinner && typeof spinner.animate === 'function') {
      if (window.__animacaoOverlayProcessamento) window.__animacaoOverlayProcessamento.cancel();
      window.__animacaoOverlayProcessamento = spinner.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: 900, iterations: Infinity, easing: 'linear' }
      );
    }
  } else {
    const fechar = function() {
      overlay.classList.add('hidden');
      if (window.__animacaoOverlayProcessamento) {
        window.__animacaoOverlayProcessamento.cancel();
        window.__animacaoOverlayProcessamento = null;
      }
    };
    if (window.ProgressoOverlay && !overlay.classList.contains('hidden')) window.ProgressoOverlay.concluir(fechar);
    else fechar();
  }
}

function normalizarHistoricoContratosParaEnvio(contratos) {
  if (!Array.isArray(contratos)) return [];

  return contratos
    .map(function(item) {
      if (!item) return '';
      if (typeof item === 'string') return item.trim();

      return String(item.url || item.link || item.href || '').trim();
    })
    .filter(Boolean);
}

function cadastroEhInquilino() {
  const tipoResidente = document.getElementById("tipoResidente")?.value?.trim() || "";
  const campoLocacaoPrincipal = document.getElementById("inqPropAdmin");
  const camposLocacaoAtivos = !!campoLocacaoPrincipal && !campoLocacaoPrincipal.disabled;

  return tipoResidente === "Inquilino" && camposLocacaoAtivos;
}

// "dd/MM/yyyy HH:mm:ss" do último envio do cadastro aberto, há 11 meses ou mais?
function cadastroAntigoParaRevisao() {
  const texto = (typeof cadastroConsultado !== "undefined" && cadastroConsultado && cadastroConsultado.dataUltimoEnvio) || "";
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
  if (!m) return false;
  const data = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const limite = new Date();
  limite.setMonth(limite.getMonth() - 11);
  return data < limite;
}

function enviar() {
  limpaMensagemStatus();
  
  // Limpa destaques anteriores
  limparDestaqueCampos();

  let camposFaltantes = [];
  let elementosParaDestacar = [];

  const moradorCpfEl = document.getElementById("moradorCpf");
  if (moradorCpfEl && moradorCpfEl.offsetParent !== null) {
    const cpfInformado = (moradorCpfEl.value || "").trim();
    if (cpfInformado !== "") {
      const cpfLimpo = limparCpf(cpfInformado);
      const mensagemCpf = cpfLimpo.length !== 11
        ? "CPF deve conter 11 dígitos"
        : (window.Utils.cpfValido(cpfLimpo) ? "" : "CPF inválido: confira os números digitados");
      if (mensagemCpf) {
        if (!camposFaltantes.includes(mensagemCpf)) {
          camposFaltantes.push(mensagemCpf);
        }
        if (!elementosParaDestacar.includes(moradorCpfEl)) {
          elementosParaDestacar.push(moradorCpfEl);
        }
      }
    }
  }

  // 1. Regras Padrão
  REGRAS_OBRIGATORIAS.forEach(regra => {
    const el = document.getElementById(regra.id);
    if (el && el.offsetParent !== null) {  
      let estaVazio = false;
      let nomeRegraPersonalizado = null;
      
      if (regra.id === "vagaSituacao" || regra.id === "vagaAptoRelacionado") {
        const situacaoEl = document.getElementById("vagaSituacao");
        const aptoRelEl = document.getElementById("vagaAptoRelacionado");
        
        const situacaoVal = situacaoEl && situacaoEl.value ? situacaoEl.value.trim() : "";
        const aptoRelVal = aptoRelEl && aptoRelEl.value ? aptoRelEl.value.trim() : "";
        const situacaoDefault = "";
        
        if ((situacaoVal !== situacaoDefault && aptoRelVal === "") || (situacaoVal === situacaoDefault && aptoRelVal !== "")) {
          estaVazio = true;
          nomeRegraPersonalizado = "Vaga alugada: preencha todos os campos";
          if (situacaoVal === situacaoDefault && situacaoEl) elementosParaDestacar.push(situacaoEl);
          if (aptoRelVal === "" && aptoRelEl) elementosParaDestacar.push(aptoRelEl);
        }
      } else {
        if (regra.tipo === "checkbox") {
          estaVazio = !el.checked;
        } else {
          estaVazio = !el.value || el.value.trim() === "";
        }
      }

      if (estaVazio) {
        let nomeRegra = nomeRegraPersonalizado || regra.nome;
        if (!camposFaltantes.includes(nomeRegra)) {
          camposFaltantes.push(nomeRegra);
        }
        if (regra.id !== "vagaSituacao" && regra.id !== "vagaAptoRelacionado") {
          elementosParaDestacar.push(el);
        }
      }
    }
  });

  if (cadastroEhInquilino()) {
    [
      { id: "inqPropAdmin", nome: "Proprietário / Administradora" }
    ].forEach(regra => {
      const el = document.getElementById(regra.id);
      if (el && el.offsetParent !== null) {
        const estaVazio = !el.value || el.value.trim() === "";
        if (estaVazio) {
          if (!camposFaltantes.includes(regra.nome)) {
            camposFaltantes.push(regra.nome);
          }
          elementosParaDestacar.push(el);
        }
      }
    });
  }

  // 2. Casos de Emergência
  const emergencias = document.querySelectorAll('#containerEmergencia .item-emergencia');
  emergencias.forEach((item, index) => {
    const nomeEl = item.querySelector('.em-nome');
    const telEl = item.querySelector('.em-tel');
    const nome = nomeEl ? nomeEl.value.trim() : '';
    const tel = telEl ? telEl.value.trim() : '';

    const preencheuAlgum = Array.from(item.querySelectorAll('input, select')).some(i => i.value.trim() !== "");

    if (preencheuAlgum && (nome === "" || tel === "")) {
      const camposFaltando = [];
      if (nome === "") camposFaltando.push("Nome");
      if (tel === "") camposFaltando.push("Telefone/Celular");

      let label = `Caso de emergência ${index + 1}: Preencha ${formatarListaCamposFaltantes(camposFaltando)}`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      if (nome === "" && nomeEl) elementosParaDestacar.push(nomeEl);
      if (tel === "" && telEl) elementosParaDestacar.push(telEl);
    }
  });

  // 3. Demais Ocupantes
  const ocupantes = document.querySelectorAll('#containerOcupantes .item-ocupante');
  ocupantes.forEach((item, index) => {
    const nomeEl = item.querySelector('.oc-nome');
    const vinculoEl = item.querySelector('.oc-vinculo');
    const nome = nomeEl ? nomeEl.value.trim() : '';
    const vinculo = vinculoEl ? vinculoEl.value.trim() : '';

    const preencheuAlgum = Array.from(item.querySelectorAll('input, select')).some(i => i.value.trim() !== "");

    if (preencheuAlgum && (nome === "" || vinculo === "")) {
      const camposFaltando = [];
      if (nome === "") camposFaltando.push("Nome");
      if (vinculo === "") camposFaltando.push("Vínculo");

      let label = `Demais ocupantes ${index + 1}: Preencha ${formatarListaCamposFaltantes(camposFaltando)}`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      if (nome === "" && nomeEl) elementosParaDestacar.push(nomeEl);
      if (vinculo === "" && vinculoEl) elementosParaDestacar.push(vinculoEl);
    }
  });

  // 4. Carros
  const carros = document.querySelectorAll('#containerCarros .item-carro');
  carros.forEach((item, index) => {
    const marcaModeloEl = item.querySelector('.car-marca-modelo');
    const corEl = item.querySelector('.car-cor');
    const placaEl = item.querySelector('.car-placa');
    const marcaModelo = marcaModeloEl ? marcaModeloEl.value.trim() : '';
    const cor = corEl ? corEl.value.trim() : '';
    const placa = placaEl ? placaEl.value.trim() : '';

    let preencheuAlgum = (marcaModelo !== "" || cor !== "" || placa !== "");
    let preencheuTodos = (marcaModelo !== "" && cor !== "" && placa !== "");

    if (preencheuAlgum && !preencheuTodos) {
      const camposFaltando = [];
      if (marcaModelo === "") camposFaltando.push("Marca e modelo");
      if (cor === "") camposFaltando.push("Cor");
      if (placa === "") camposFaltando.push("Placa");

      let label = `Carros ${index + 1}: Preencha ${formatarListaCamposFaltantes(camposFaltando)}`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      if (marcaModelo === "" && marcaModeloEl) elementosParaDestacar.push(marcaModeloEl);
      if (cor === "" && corEl) elementosParaDestacar.push(corEl);
      if (placa === "" && placaEl) elementosParaDestacar.push(placaEl);
    }
  });

  // 5. Motos
  const motos = document.querySelectorAll('#containerMotos .item-moto');
  motos.forEach((item, index) => {
    const marcaModeloEl = item.querySelector('.moto-marca-modelo');
    const corEl = item.querySelector('.moto-cor');
    const placaEl = item.querySelector('.moto-placa');
    const marcaModelo = marcaModeloEl ? marcaModeloEl.value.trim() : '';
    const cor = corEl ? corEl.value.trim() : '';
    const placa = placaEl ? placaEl.value.trim() : '';

    let preencheuAlgum = (marcaModelo !== "" || cor !== "" || placa !== "");
    let preencheuTodos = (marcaModelo !== "" && cor !== "" && placa !== "");

    if (preencheuAlgum && !preencheuTodos) {
      const camposFaltando = [];
      if (marcaModelo === "") camposFaltando.push("Marca e modelo");
      if (cor === "") camposFaltando.push("Cor");
      if (placa === "") camposFaltando.push("Placa");

      let label = `Motos ${index + 1}: Preencha ${formatarListaCamposFaltantes(camposFaltando)}`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      if (marcaModelo === "" && marcaModeloEl) elementosParaDestacar.push(marcaModeloEl);
      if (cor === "" && corEl) elementosParaDestacar.push(corEl);
      if (placa === "" && placaEl) elementosParaDestacar.push(placaEl);
    }
  });

  // 6. Bicicletas
  const bikes = document.querySelectorAll('#containerBikes .item-bike');
  bikes.forEach((item, index) => {
    const marcaEl = item.querySelector('.bike-marca');
    const corEl = item.querySelector('.bike-cor');
    const marca = marcaEl ? marcaEl.value.trim() : '';
    
    let preencheuAlgum = (marca !== "" || (corEl ? corEl.value.trim() : '') !== "");
    let cor = corEl ? corEl.value.trim() : "";

    if (preencheuAlgum && cor === "") {
      let label = `Bicicletas ${index + 1}: Preencha Cor`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      if (corEl) elementosParaDestacar.push(corEl);
    }
  });

  // 7. Pets
  const pets = document.querySelectorAll('#containerPets .item-pet');
  pets.forEach((item, index) => {
    const nomeEl = item.querySelector('.pet-nome');
    const racaEspecieEl = item.querySelector('.pet-raca-especie');
    const porteEl = item.querySelector('.pet-porte');

    const nome = nomeEl ? nomeEl.value.trim() : '';
    const racaEspecie = racaEspecieEl ? racaEspecieEl.value.trim() : '';
    const porte = porteEl ? porteEl.value.trim() : '';

    const preencheuAlgum = (nome !== "" || racaEspecie !== "" || porte !== "");
    const preencheuNome = nome !== "";
    const preencheuOutros = (racaEspecie !== "" && porte !== "");

    if (preencheuNome && !preencheuOutros) {
      const camposFaltando = [];
      if (racaEspecie === "") camposFaltando.push("Espécie e raça");
      if (porte === "") camposFaltando.push("Porte");

      let label = `Pets ${index + 1}: Preencha ${formatarListaCamposFaltantes(camposFaltando)}`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      
      if (racaEspecie === "" && racaEspecieEl) elementosParaDestacar.push(racaEspecieEl);
      if (porte === "" && porteEl) elementosParaDestacar.push(porteEl);
    } 
    else if (!preencheuNome && preencheuAlgum) {
      let label = `Pets ${index + 1}: Preencha Nome`;
      if (!camposFaltantes.includes(label)) camposFaltantes.push(label);
      if (nomeEl) elementosParaDestacar.push(nomeEl);
    }
  });

  // 8. Prestadores
  const prestadores = document.querySelectorAll('#containerPrestadores .item-prestador');
  prestadores.forEach((item, index) => {
    const inputs = item.querySelectorAll('input, select');
    const nomeEl = item.querySelector('.pr-nome');
    const servicoEl = item.querySelector('.pr-servico');
    const telEl = item.querySelector('.pr-tel');
    const chaveEl = item.querySelector('.pr-chave');

    const nome = nomeEl ? nomeEl.value.trim() : '';
    const servico = servicoEl ? servicoEl.value.trim() : '';
    const tel = telEl ? telEl.value.trim() : '';
    const chave = chaveEl ? chaveEl.value : '';

    const preencheuAlgum = (nome !== "" || servico !== "" || tel !== "" || chave !== "");
    const preencheuTodos = (nome !== "" && servico !== "" && tel !== "" && chave !== "");

    if (preencheuAlgum && !preencheuTodos) {
      const camposFaltando = [];
      if (nome === "") camposFaltando.push("Nome");
      if (servico === "") camposFaltando.push("Serviço");
      if (tel === "") camposFaltando.push("Telefone");
      if (chave === "") camposFaltando.push("se possui chave");

      let labelPrestador = `Prestador ${index + 1}: Preencha ${formatarListaCamposFaltantes(camposFaltando)}`;
      if (!camposFaltantes.includes(labelPrestador)) {
        camposFaltantes.push(labelPrestador);
      }
      inputs.forEach(i => { if (!i.value.trim()) elementosParaDestacar.push(i); });
    }
  });

  // Ordenação
  if (!cadastroEhInquilino()) {
    camposFaltantes = camposFaltantes.filter(nome => {
      return nome !== "Proprietário / Administradora"
        && nome !== "Contato do proprietário / imobiliária"
        && nome !== "Vigência do contrato";
    });

    elementosParaDestacar = elementosParaDestacar.filter(el => {
      return !["inqPropAdmin", "inqContato", "inqVigencia", "arquivoContrato"].includes(el.id);
    });
  }

  camposFaltantes.sort((a, b) => {
    let indexA = ORDEM_DESEJADA.indexOf(a);
    let indexB = ORDEM_DESEJADA.indexOf(b);

    if (a.includes("CPF")) indexA = ORDEM_DESEJADA.indexOf("CPF");
    if (b.includes("CPF")) indexB = ORDEM_DESEJADA.indexOf("CPF");
    if (a.includes("Vaga alugada")) indexA = ORDEM_DESEJADA.indexOf("Apartamento envolvido (Vaga de garagem)");
    if (b.includes("Vaga alugada")) indexB = ORDEM_DESEJADA.indexOf("Apartamento envolvido (Vaga de garagem)");
    if (a.includes("Caso de emergência")) indexA = ORDEM_DESEJADA.indexOf("Caso de emergência");
    if (b.includes("Caso de emergência")) indexB = ORDEM_DESEJADA.indexOf("Caso de emergência");
    if (a.includes("Demais ocupantes")) indexA = ORDEM_DESEJADA.indexOf("Demais ocupantes");
    if (b.includes("Demais ocupantes")) indexB = ORDEM_DESEJADA.indexOf("Demais ocupantes");
    if (a.includes("Carros")) indexA = ORDEM_DESEJADA.indexOf("Carros");
    if (b.includes("Carros")) indexB = ORDEM_DESEJADA.indexOf("Carros");
    if (a.includes("Motos")) indexA = ORDEM_DESEJADA.indexOf("Motos");
    if (b.includes("Motos")) indexB = ORDEM_DESEJADA.indexOf("Motos");
    if (a.includes("Bicicletas")) indexA = ORDEM_DESEJADA.indexOf("Bicicletas");
    if (b.includes("Bicicletas")) indexB = ORDEM_DESEJADA.indexOf("Bicicletas");
    if (a.includes("Pets")) indexA = ORDEM_DESEJADA.indexOf("Pets");
    if (b.includes("Pets")) indexB = ORDEM_DESEJADA.indexOf("Pets");
    if (a.toLowerCase().includes("prestador")) indexA = ORDEM_DESEJADA.indexOf("Prestador");
    if (b.toLowerCase().includes("prestador")) indexB = ORDEM_DESEJADA.indexOf("Prestador");

    if (indexA === -1) indexA = 99;
    if (indexB === -1) indexB = 99;

    return indexA - indexB;
  });

  if (camposFaltantes.length > 0) {
    elementosParaDestacar.forEach(el => {
      destacarCampoObrigatorio(el);
    });

    if (elementosParaDestacar.length > 0) {
      elementosParaDestacar[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      elementosParaDestacar[0].focus();
    }

    mostrarAlerta("Campos obrigatórios ainda não foram preenchidos.\n\n• " + camposFaltantes.join("\n• "), "Atenção");
    return;
  }

  const chkCodigo = document.getElementById("exigirCodigo");
  if (chkCodigo && chkCodigo.checked && !String((document.getElementById("moradorEmail") || {}).value || "").trim()) {
    mostrarAlerta("Para exigir código por e-mail, preencha o campo E-mail.", "Atenção");
    return;
  }

  if (snapshotFormularioOriginal !== null && capturarSnapshotFormulario() === snapshotFormularioOriginal && !window.confirmandoSemAlteracao) {
    // Cadastro com 11 meses ou mais (o e-mail de revisão anual pede para revisar): dá para só
    // confirmar que está tudo certo, sem mudar nada — o envio renova a data do cadastro.
    if (cadastroAntigoParaRevisao()) {
      confirmarAcao("Nenhum dado foi alterado.\n\nDeseja confirmar que os dados continuam corretos? O cadastro fica registrado como revisado hoje.", "Confirmar dados")
        .then(function(ok) {
          if (!ok) return;
          window.confirmandoSemAlteracao = true;
          try { enviar(); } finally { window.confirmandoSemAlteracao = false; }
        });
      return;
    }
    mostrarAlerta("Nenhuma alteração foi feita no cadastro. Não é necessário atualizar.", "Atenção");
    return;
  }

  // Contato de emergência não é obrigatório, mas é importante: confirma antes de enviar sem nenhum.
  const temEmergencia = Array.from(emergencias).some(item => {
    const nomeEl = item.querySelector('.em-nome');
    return nomeEl && nomeEl.value.trim() !== "";
  });
  // A confirmação desta página é uma janela própria (assíncrona): o envio só começa DEPOIS que o
  // morador escolhe "Confirmar". Cancelar (ou fechar) não envia nada e leva até a seção.
  if (!temEmergencia) {
    confirmarAcao("Você não informou nenhum contato para caso de emergência.\n\nDeseja enviar o cadastro assim mesmo?", "Contato de emergência")
      .then(function(confirmado) {
        if (confirmado === true) {
          prosseguirEnvio();
          return;
        }
        const secaoEmergencia = document.getElementById("containerEmergencia");
        if (secaoEmergencia) secaoEmergencia.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    return;
  }

  prosseguirEnvio();
}

// Segunda parte do envio (depois de todas as validações e confirmações).
function prosseguirEnvio() {
  const btnSubmit = document.getElementById("btnEnviarForm") || document.querySelector("button[onclick='enviar()']");
  const textoAtual = btnSubmit ? btnSubmit.innerText : "";
  const eAtualizacao = textoAtual.toLowerCase().includes("atualizar");

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = eAtualizacao ? "Atualizando" : "Enviando";
  }

  setOverlayProcessamento(true, eAtualizacao ? 'Aguarde: atualizando' : 'Aguarde: enviando');

  const fileInput = document.getElementById("arquivoContrato");
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const fileData = {
        base64: e.target.result.split(',')[1],
        name: file.name,
        type: file.type
      };
      executarEnvio(fileData, eAtualizacao);
    };
    reader.onerror = function() {
      const btnSubmitErro = document.getElementById("btnEnviarForm") || document.querySelector("button[onclick='enviar()']");
      if (btnSubmitErro) btnSubmitErro.disabled = false;

      setOverlayProcessamento(false);
      alterarTextoBotaoEnviar(eAtualizacao ? "Atualizar cadastro" : "Enviar cadastro");
      mostrarAlerta("Erro ao ler o arquivo de contrato. Tente novamente.", "Atenção");
    };
    reader.readAsDataURL(file);
  } else {
    executarEnvio(null, eAtualizacao);
  }
}

function executarEnvio(fileData, eAtualizacao) {
  const chkNovo = document.getElementById("chkMoradorNovo");
  const isMoradorNovo = chkNovo ? chkNovo.checked : false;

  // Tratamento da data do morador principal
  const nascInputPrincipal = document.getElementById("moradorNasc").value.trim();
  let moradorNascFormatada = nascInputPrincipal;
  if (/^\d{4}-\d{2}-\d{2}$/.test(nascInputPrincipal)) {
    const partes = nascInputPrincipal.split('-');
    moradorNascFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  // Descobre a vaga e o andar baseado no apartamento selecionado usando o cache do gabarito
  let vagaNumeroEncontrada = "";
  let vagaAndarEncontrado = "";
  const aptoAtual = document.getElementById("apto").value.trim().toLowerCase();
  
  if (typeof gabaritoVagasCache !== 'undefined' && gabaritoVagasCache.length > 0) {
    for (let i = 0; i < gabaritoVagasCache.length; i++) {
      const linha = gabaritoVagasCache[i];
      const aptoPlanilha = String(linha[0] || "").trim().toLowerCase();
      if (aptoPlanilha === aptoAtual) {
        vagaAndarEncontrado = String(linha[1] || "").trim(); // Coluna B = Andar
        vagaNumeroEncontrada = String(linha[2] || "").trim(); // Coluna C = Número
        break;
      }
    }
  }

  const dadosLocacao = cadastroEhInquilino()
    ? {
        inqPropAdmin: document.getElementById("inqPropAdmin").value,
        inqContato: document.getElementById("inqContato").value,
        inqVigencia: document.getElementById("inqVigencia").value,
        arquivoContrato: fileData
      }
    : {
        inqPropAdmin: "",
        inqContato: "",
        inqVigencia: "",
        arquivoContrato: null
      };

  const dados = {
    apto: document.getElementById("apto").value,
    acao: isMoradorNovo ? "Sou morador novo" : "Atualizar dados cadastrais",
    tipoResidente: document.getElementById("tipoResidente").value,
    moraNoImovel: document.getElementById("tipoResidente").value === "Proprietário" && document.getElementById("moraNoImovel")
      ? document.getElementById("moraNoImovel").value
      : "",
    historicoContratos: cadastroEhInquilino() ? normalizarHistoricoContratosParaEnvio(historicoContratosCache) : [],
    
    moradorNome: document.getElementById("moradorNome").value,
    moradorCpf: document.getElementById("moradorCpf").value,
    moradorRg: document.getElementById("moradorRg").value,
    moradorOrgaoEmissor: document.getElementById("moradorOrgaoEmissor") ? document.getElementById("moradorOrgaoEmissor").value : "",
    moradorNasc: moradorNascFormatada,
    moradorCelular: document.getElementById("moradorCelular").value,
    moradorTel: document.getElementById("moradorTel").value,
    moradorEmail: document.getElementById("moradorEmail").value,
    exigirCodigo: !!(document.getElementById("exigirCodigo") && document.getElementById("exigirCodigo").checked),
    
    vagaNumero: vagaNumeroEncontrada,
    vagaAndar: vagaAndarEncontrado,
    
    vagaSituacao: document.getElementById("vagaSituacao").value,
    vagaAptoRelacionado: document.getElementById("vagaAptoRelacionado").value,

    emergenciasList: coletarDadosGrupados(".item-emergencia", [".em-nome", ".em-tel", ".em-end", ".em-vinculo"]),

    ...dadosLocacao,

    ocupantesList: (() => {
      const grupos = document.querySelectorAll(".item-ocupante");
      const resultado = [];
      grupos.forEach(g => {
        const nome = limparValorLista(g.querySelector(".oc-nome")?.value);
        const tel = limparValorLista(g.querySelector(".oc-tel")?.value);
        const nascInput = limparValorLista(g.querySelector(".oc-nasc")?.value);
        const vinculo = limparValorLista(g.querySelector(".oc-vinculo")?.value);

        if (nome !== "") {
          let nascFormatada = nascInput;
          if (/^\d{4}-\d{2}-\d{2}$/.test(nascInput)) {
            const partes = nascInput.split('-');
            nascFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
          }
          
          resultado.push([nome, tel, nascFormatada, vinculo].join(" | "));
        }
      });
      return resultado.join("\n");
    })(),

    carrosList: coletarDadosGrupados(".item-carro", [".car-marca-modelo", ".car-cor", ".car-placa"]),
    motosList: coletarDadosGrupados(".item-moto", [".moto-marca-modelo", ".moto-cor", ".moto-placa"]),
    bikesList: coletarDadosGrupados(".item-bike", [".bike-marca", ".bike-cor"]),
    petsList: coletarDadosGrupados(".item-pet", [".pet-nome", ".pet-raca-especie", ".pet-porte"]),
    prestadorList: coletarDadosGrupados(".item-prestador", [".pr-nome", ".pr-servico", ".pr-tel", ".pr-chave"]),
    
    observacoes: document.getElementById("observacoes").value,
    declaracao: document.getElementById("declaracao").checked
  };

  // Atualização: o backend só aceita se o CPF e a data usados na busca baterem com o cadastro.
  if (!isMoradorNovo && cadastroConsultado) {
    dados.cadastroId = cadastroConsultado.id;
    dados.credencialCpf = cadastroConsultado.cpf;
    dados.credencialSessao = cadastroConsultado.sessao || "";
    dados.credencialNasc = cadastroConsultado.nasc;
  }

  // Edição pela administração (js/modo-admin.js): rota protegida pelo login do admin.
  const modoAdmin = window.modoAdminEdicao || null;
  const textoBotaoOriginal = modoAdmin ? "Salvar alterações" : (eAtualizacao ? "Atualizar cadastro" : "Enviar cadastro");

  (modoAdmin ? DataService.salvarCadastroAdmin(dados) : DataService.salvarCadastro(dados))
  .then(res => {
    const btnSubmit = document.getElementById("btnEnviarForm") || document.querySelector("button[onclick='enviar()']");
    if (btnSubmit) btnSubmit.disabled = false;

    setOverlayProcessamento(false);

    if (res.sucesso) {
      if (modoAdmin) {
        mostrarAlerta("As alterações ficaram registradas com o seu e-mail. Uma cópia do cadastro em PDF também será enviada para o seu e-mail em instantes.", res.mensagem || "Cadastro atualizado com sucesso!")
          .then(function() { window.location.href = modoAdmin.urlRetorno; });
        return;
      }
      // Cadastro novo: fica aguardando a aprovação da administração (confirmação por e-mail).
      if (res.aguardandoAprovacao) {
        const emailAviso = String(dados.moradorEmail || "").trim();
        mostrarAlerta(emailAviso
          ? "A administração do condomínio vai conferir os dados. Enquanto isso, o cadastro não pode ser aberto. Aguarde a confirmação, que será enviada para " + emailAviso + "."
          : "A administração do condomínio vai conferir os dados. Enquanto isso, o cadastro não pode ser aberto. Como não foi informado um e-mail, procure a administração para saber da aprovação.",
          res.mensagem || "Cadastro enviado! Aguardando aprovação");
        voltarTelaInicial();
        return;
      }
      // Sessão de 1 hora (js/sessao-morador.js): se o morador corrigiu o próprio CPF ou a data de
      // nascimento, o "Visualizar cadastro" passa a usar os novos.
      if (eAtualizacao && window.SessaoMorador) window.SessaoMorador.atualizarCredenciais(dados.moradorCpf, dados.moradorNasc);
      // O PDF do cadastro é gerado em segundo plano e mandado para o e-mail informado no formulário.
      const emailCopia = String(dados.moradorEmail || "").trim();
      mostrarAlerta(emailCopia
        ? "Uma cópia do cadastro em PDF também será enviada por e-mail para " + emailCopia + " em instantes."
        : "Como não foi informado um e-mail, você não receberá a cópia do cadastro em PDF. Se atualizar o cadastro com um e-mail, a cópia passa a ser enviada.", res.mensagem || "Cadastro enviado com sucesso!",
        { link: { href: "kit.html", texto: "Acesse o Kit de Boas-vindas do condomínio" } });
      voltarTelaInicial();
    } else {
      alterarTextoBotaoEnviar(textoBotaoOriginal);
      mostrarAlerta((res && res.mensagem) || "Não foi possível enviar o cadastro. Tente novamente.", "Atenção");
    }
  })
  .catch(err => {
    const btnSubmit = document.getElementById("btnEnviarForm") || document.querySelector("button[onclick='enviar()']");
    if (btnSubmit) btnSubmit.disabled = false;

    setOverlayProcessamento(false);
    alterarTextoBotaoEnviar(textoBotaoOriginal);
    const mensagemErro = err && err.message ? err.message : String(err || 'Erro inesperado no envio.');
    mostrarAlerta(mensagemErro, "Atenção");
  });
}

