// ==========================================
// UI DO FORMULÁRIO E GERAÇÃO DE CAMPOS DINÂMICOS
// ==========================================

function rolarParaSecao(secaoId) {
  const elemento = document.getElementById(secaoId);
  if (elemento) {
    // Com a barra fixa de botões no topo, desconta a altura dela para não cobrir o título da seção.
    if (typeof window.atualizarBarraAcoes === 'function') window.atualizarBarraAcoes();
    let desconto = 8;
    if (document.body.classList.contains('com-barra-acoes')) {
      const altura = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--altura-barra-acoes')) || 64;
      desconto += altura + 4;
    }
    const topo = elemento.getBoundingClientRect().top + window.scrollY - desconto;
    window.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' });
  }
}

// O gabarito (apto, andar, vaga) é buscado UMA vez e reaproveitado pelas duas listas de
// apartamentos e pela informação da vaga — antes eram 3 requisições ao abrir a página.
let promessaGabarito = null;

function obterGabaritoUmaVez() {
  if (!promessaGabarito) {
    promessaGabarito = DataService.obterGabaritoVagasCompleto().catch(function(erro) {
      promessaGabarito = null; // permite tentar de novo numa próxima chamada
      throw erro;
    });
  }
  return promessaGabarito;
}

// Mesmo formato que a rota de lista de apartamentos devolvia: { sucesso, apartamentos: [...] }.
function obterApartamentosDoGabarito() {
  return obterGabaritoUmaVez().then(function(res) {
    const vistos = {};
    const apartamentos = [];
    (res && res.sucesso && Array.isArray(res.dados) ? res.dados : []).forEach(function(linha) {
      const apto = String((linha && linha[0]) || '').trim();
      if (apto && apto !== '-' && !vistos[apto]) {
        vistos[apto] = true;
        apartamentos.push(apto);
      }
    });
    return { sucesso: apartamentos.length > 0, apartamentos: apartamentos };
  });
}

function popularDropdownAptos() {
  const select = document.getElementById('vagaAptoRelacionado');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando apartamentos</option>';
  select.disabled = true;

  // Busca apartamentos do backend
  if (typeof DataService !== 'undefined') {
    obterApartamentosDoGabarito()
      .then(data => {
        select.innerHTML = '<option value="">Apto envolvido</option>';
        
        if (data.sucesso && Array.isArray(data.apartamentos)) {
          data.apartamentos.forEach(apto => {
            select.add(new Option(apto, apto));
          });
        }
        
        select.disabled = false;
      })
      .catch(error => {
        console.error('Erro ao carregar apartamentos:', error);
        select.innerHTML = '<option value="">Erro ao carregar apartamentos</option>';
        select.disabled = false;
      });
  } else {
    // Fallback para valores estáticos se WEB_APP_URL não estiver definido
    select.innerHTML = '<option value="">Apto envolvido</option>';
    for (let andar = 2; andar <= 8; andar++) {
      for (let pos = 1; pos <= 6; pos++) {
        const numApto = `${andar}0${pos}`;
        select.add(new Option(numApto, numApto));
      }
    }
    select.add(new Option('901', '901'));
    select.disabled = false;
  }
}

function aoSelecionarApto(valor) {
  const select = document.getElementById('apto');
  const secResto = document.getElementById('secRestoFormulario');

  if (select && valor !== undefined && valor !== null) {
    select.value = valor;
  }

  if (select && select.value) {
    if (secResto) {
      secResto.classList.remove('hidden');
      secResto.style.display = 'block';
      rolarParaSecao('secRestoFormulario');
    }

    if (typeof atualizarInfoVagaLocal === 'function') {
      atualizarInfoVagaLocal(select.value);
    }
  } else if (secResto) {
    secResto.classList.add('hidden');
    secResto.style.display = 'none';
  }
}

function popularDropdownApto() {
  const select = document.getElementById('apto');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando apartamentos</option>';
  select.disabled = true;

  // Busca apartamentos do backend
  if (typeof DataService !== 'undefined') {
    obterApartamentosDoGabarito()
      .then(data => {
        select.innerHTML = '<option value="">Selecione o apartamento</option>';
        
        if (data.sucesso && Array.isArray(data.apartamentos)) {
          data.apartamentos.forEach(apto => {
            select.add(new Option(apto, apto));
          });
        } else {
          console.warn('Resposta sem sucesso ou apartamentos inválidos:', data);
        }
        
        select.disabled = false;
        select.onchange = function() {
          aoSelecionarApto(this.value);
        };
      })
      .catch(error => {
        console.error('Erro ao carregar apartamentos:', error);
        select.innerHTML = '<option value="">Erro ao carregar apartamentos</option>';
        select.disabled = false;
      });
  } else {
    // Fallback para valores estáticos se WEB_APP_URL não estiver definido
    select.innerHTML = '<option value="">Selecione o apartamento</option>';
    for (let andar = 2; andar <= 8; andar++) {
      for (let pos = 1; pos <= 6; pos++) {
        const numApto = `${andar}0${pos}`;
        select.add(new Option(numApto, numApto));
      }
    }
    select.add(new Option('901', '901'));
    select.disabled = false;
    select.onchange = function() {
      aoSelecionarApto(this.value);
    };
  }
}

window.addEventListener('DOMContentLoaded', function() {
  popularDropdownApto();
  popularDropdownAptos();
});

function limparCpf(cpf) {
  if (!cpf) return "";
  return cpf.replace(/\D/g, "");
}

function limpaMensagemStatus() {
  const statusMsg = document.getElementById("statusMessage");
  if (statusMsg) {
    statusMsg.innerText = "";
    statusMsg.className = "hidden";
    statusMsg.style.display = "none";
  }
}

function exibirPassoTipoResidente() {
  const secTipo = document.getElementById('secTipoResidente');
  if (secTipo) {
    secTipo.classList.remove('hidden');
    secTipo.style.display = 'block';
    rolarParaSecao('secTipoResidente');
  }
}

function possuiDadosLocacaoPreenchidos() {
  const camposLocacao = ['inqPropAdmin', 'inqContato', 'inqVigencia'];
  const algumCampoPreenchido = camposLocacao.some(function(id) {
    const campo = document.getElementById(id);
    return !!campo && String(campo.value || '').trim() !== '';
  });

  const arquivoSelecionado = typeof arquivoContratoObjeto !== 'undefined' && !!arquivoContratoObjeto;
  const historicoPossuiItens = typeof historicoContratosCache !== 'undefined'
    && Array.isArray(historicoContratosCache)
    && historicoContratosCache.length > 0;

  return algumCampoPreenchido || arquivoSelecionado || historicoPossuiItens;
}

function aplicarEscolhaTipoResidente(valor) {
  const secApto = document.getElementById('secApto');
  const secInquilino = document.getElementById('secInquilino');
  const isInquilino = valor === 'Inquilino';

  if (valor) {
    // Proprietário: o apartamento só aparece depois de responder "Mora no imóvel?".
    const moraEl = document.getElementById('moraNoImovel');
    const esperaMora = valor === 'Proprietário' && moraEl && !moraEl.value;
    if (secApto && !esperaMora) {
      mostrarSecaoApto();
    } else if (secApto) {
      secApto.classList.add('hidden');
      secApto.style.display = 'none';
      rolarParaSecao('secTipoResidente');
    }

    const titulo = document.getElementById('tituloDadosPessoais');
    if (titulo) titulo.innerText = `Dados do ${valor}`;

    // "Mora no imóvel" só faz sentido para proprietário (inquilino sempre mora).
    const opcaoMora = document.getElementById('opcaoMoraNoImovel');
    if (opcaoMora) opcaoMora.classList.toggle('hidden', valor !== 'Proprietário');

    if (isInquilino) {
      if (secInquilino) {
        secInquilino.classList.remove('hidden');
        secInquilino.style.display = 'block';
      }
    } else {
      if (secInquilino) {
        secInquilino.classList.add('hidden');
        secInquilino.style.display = 'none';
      }
    }

    atualizarCamposLocacao(isInquilino);
  } else {
    const opcaoMoraVazio = document.getElementById('opcaoMoraNoImovel');
    if (opcaoMoraVazio) opcaoMoraVazio.classList.add('hidden');
    if (secApto) {
      secApto.classList.add('hidden');
      secApto.style.display = 'none';
    }

    if (secInquilino) {
      secInquilino.classList.add('hidden');
      secInquilino.style.display = 'none';
    }

    atualizarCamposLocacao(false);
  }
}

function atualizarCamposLocacao(ativo) {
  const camposLocacao = ['inqPropAdmin', 'inqContato', 'inqVigencia', 'arquivoContrato'];

  camposLocacao.forEach(function(id) {
    const campo = document.getElementById(id);
    if (!campo) return;

    campo.disabled = !ativo;

    if (!ativo) {
      campo.value = '';
    }
  });

  if (!ativo) {
    if (typeof limparHistoricoContratos === 'function') {
      limparHistoricoContratos();
    }

    if (typeof arquivoContratoObjeto !== 'undefined') {
      arquivoContratoObjeto = null;
    }

    const containerPreview = document.getElementById('containerPreviewContrato');
    const nomeArquivoSpan = document.getElementById('nomeArquivoSelecionado');
    const nomeArquivoPreviewSpan = document.getElementById('nomeArquivoSelecionadoPreview');

    if (containerPreview) {
      containerPreview.classList.add('hidden');
    }
    if (nomeArquivoSpan) {
      nomeArquivoSpan.textContent = 'Nenhum arquivo selecionado';
    }
    if (nomeArquivoPreviewSpan) {
      nomeArquivoPreviewSpan.textContent = '';
    }
  }
}

function mostrarSecaoApto() {
  const secApto = document.getElementById('secApto');
  if (!secApto) return;
  const jaVisivel = !secApto.classList.contains('hidden');
  secApto.classList.remove('hidden');
  secApto.style.display = 'block';
  if (!jaVisivel) rolarParaSecao('secApto');
}

function tratarEscolhaMoraNoImovel(valor) {
  if (valor) mostrarSecaoApto();
}

async function tratarEscolhaTipoResidente(valor) {
  const tipoResidenteEl = document.getElementById('tipoResidente');
  if (!tipoResidenteEl || tipoResidenteEl.dataset.revertendo === 'true') {
    return;
  }

  const valorAnterior = tipoResidenteEl.dataset.valorAnterior || '';
  const mudouDeInquilinoParaProprietario = valorAnterior === 'Inquilino' && valor === 'Proprietário';

  if (mudouDeInquilinoParaProprietario && possuiDadosLocacaoPreenchidos()) {
    const confirmouTroca = await confirmarAcao(
      'Os dados da locação e o histórico de contratos serão apagados ao trocar o cadastro para proprietário. Deseja continuar?',
      'Atenção'
    );

    if (!confirmouTroca) {
      tipoResidenteEl.dataset.revertendo = 'true';
      tipoResidenteEl.value = valorAnterior;
      tipoResidenteEl.dataset.revertendo = 'false';
      return;
    }
  }

  aplicarEscolhaTipoResidente(valor);
  tipoResidenteEl.dataset.valorAnterior = valor;
}

// Escapa valores vindos do cadastro antes de colocá-los no HTML dos campos dinâmicos.
// Sem isso, uma aspa (") no valor cortava o texto ao recarregar e ele era regravado cortado.
function escaparValor(valor) {
  return window.Utils.escaparHtml(valor);
}

// Os itens repetíveis são gravados como "campo | campo" (um item por linha). Um "|" ou uma
// quebra de linha digitados pelo morador bagunçariam essa estrutura, então são trocados aqui.
function limparValorLista(valor) {
  return String(valor || '').replace(/\|/g, '/').replace(/[\r\n]+/g, ' ').trim();
}

function adicionarItemDinamico(containerId, classeGrupo, htmlCampos) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const div = document.createElement("div");
  div.className = `dynamic-group ${classeGrupo}`;
  div.innerHTML = `
    <div class="dynamic-row">
      ${htmlCampos}
    </div>
    <button type="button" class="btn-excluir-item" onclick="removerItem(this)">Excluir</button>
  `;
  container.appendChild(div);
}

function removerItem(btn) {
  btn.closest('.dynamic-group').remove();
}

function addEmergencia(v = {}) {
  adicionarItemDinamico('containerEmergencia', 'item-emergencia', `
    <div><span class="input-label">Nome<span class="required-star">*</span></span><input type="text" placeholder="Preencha o nome" class="em-nome" value="${escaparValor(v.nome)}"></div>
    <div><span class="input-label">Telefone/Celular<span class="required-star">*</span></span><input type="tel" inputmode="numeric" placeholder="21 999999999" class="em-tel" value="${escaparValor(v.tel)}"></div>
    <div><span class="input-label">Endereço</span><input type="text" placeholder="Preenche o endereço" class="em-end" value="${escaparValor(v.end)}"></div>
    <div><span class="input-label">Vínculo/Parentesco</span><input type="text" placeholder="Filho, companheiro, amigo etc" class="em-vinculo" value="${escaparValor(v.vinculo)}"></div>
  `);
}

function preencherEmergencias(texto) {
  const container = document.getElementById("containerEmergencia");
  if (!container) return;
  container.innerHTML = "";
  if (!texto || texto === "-") {
    addEmergencia();
    return;
  }
  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    addEmergencia({ nome: p[0], tel: p[1], end: p[2], vinculo: p[3] });
  });
}

function addOcupante(v = {}) {
  adicionarItemDinamico('containerOcupantes', 'item-ocupante', `
    <div><span class="input-label">Nome<span class="required-star">*</span></span><input type="text" placeholder="Preencha o nome" class="oc-nome" value="${escaparValor(v.nome)}"></div>
    <div><span class="input-label">Telefone/Celular</span><input type="tel" inputmode="numeric" placeholder="21 999999999" class="oc-tel" value="${escaparValor(v.tel)}"></div>
    <div><span class="input-label">Data de nascimento</span><input type="text" inputmode="numeric" placeholder="DD/MM/AAAA" maxlength="10" class="oc-nasc campo-mascara" data-mascara="data" value="${escaparValor(v.nasc)}"></div>
    <div><span class="input-label">Vínculo/Parentesco<span class="required-star">*</span></span><input type="text" placeholder="Filho, companheiro, amigo etc" class="oc-vinculo" value="${escaparValor(v.vinculo)}"></div>
  `);
}

function preencherOcupantes(texto) {
  const container = document.getElementById("containerOcupantes");
  if (!container) return;
  container.innerHTML = "";
  if (!texto || texto === "-") return;
  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    addOcupante({ nome: p[0], tel: p[1], nasc: p[2], vinculo: p[3] });
  });
}

function addCarro(v = {}) {
  adicionarItemDinamico('containerCarros', 'item-carro', `
    <div class="dynamic-row-veiculo">
      <div class="campo-50"><span class="input-label">Marca e modelo<span class="required-star">*</span></span><input type="text" placeholder="Ex: Toyota Corolla" class="car-marca-modelo" value="${escaparValor(v.marcaModelo)}"></div>
      <div class="campo-25"><span class="input-label">Cor<span class="required-star">*</span></span><input type="text" placeholder="Ex: Prata" class="car-cor" value="${escaparValor(v.cor)}"></div>
      <div class="campo-25"><span class="input-label">Placa<span class="required-star">*</span></span><input type="text" placeholder="Ex: SJP-4K82" class="car-placa" value="${escaparValor(v.placa)}"></div>
    </div>
  `);
}

function preencherCarros(texto) {
  const container = document.getElementById("containerCarros");
  if (!container) return;
  container.innerHTML = "";
  if (!texto || texto === "-") return;
  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    addCarro({ marcaModelo: p[0], cor: p[1], placa: p[2] });
  });
}

function addMoto(v = {}) {
  adicionarItemDinamico('containerMotos', 'item-moto', `
    <div class="dynamic-row-veiculo">
      <div class="campo-50"><span class="input-label">Marca e modelo<span class="required-star">*</span></span><input type="text" placeholder="Ex: Honda CG 160 Titan" class="moto-marca-modelo" value="${escaparValor(v.marcaModelo)}"></div>
      <div class="campo-25"><span class="input-label">Cor<span class="required-star">*</span></span><input type="text" placeholder="Ex: Azul" class="moto-cor" value="${escaparValor(v.cor)}"></div>
      <div class="campo-25"><span class="input-label">Placa<span class="required-star">*</span></span><input type="text" placeholder="Ex: QMV-7H31" class="moto-placa" value="${escaparValor(v.placa)}"></div>
    </div>
  `);
}

function preencherMotos(texto) {
  const container = document.getElementById("containerMotos");
  if (!container) return;
  container.innerHTML = "";
  if (!texto || texto === "-") return;
  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    addMoto({ marcaModelo: p[0], cor: p[1], placa: p[2] });
  });
}

function addBike(v = {}) {
  adicionarItemDinamico('containerBikes', 'item-bike', `
    <div><span class="input-label">Marca</span><input type="text" placeholder="Ex: Caloi" class="bike-marca" value="${escaparValor(v.marca)}"></div>
    <div><span class="input-label">Cor<span class="required-star">*</span></span><input type="text" placeholder="Ex: Vermelha" class="bike-cor" value="${escaparValor(v.cor)}"></div>
  `);
}

function preencherBikes(texto) {
  const container = document.getElementById("containerBikes");
  if (!container) return;
  container.innerHTML = "";
  if (!texto || texto === "-") return;
  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    addBike({ marca: p[0], cor: p[1] });
  });
}

function addPet(v = {}) {
  adicionarItemDinamico('containerPets', 'item-pet', `
    <div class="pet-linha-principal">
      <div>
        <span class="input-label">Nome<span class="required-star">*</span></span>
        <input type="text" placeholder="Preencha o nome" class="pet-nome" value="${escaparValor(v.nome)}">
      </div>
      <div>
        <span class="input-label">Porte<span class="required-star">*</span></span>
        <select class="pet-porte">
          <option value="">Selecione</option>
          <option value="Pequeno" ${v.porte === 'Pequeno' ? 'selected' : ''}>Pequeno</option>
          <option value="Médio" ${v.porte === 'Médio' ? 'selected' : ''}>Médio</option>
          <option value="Grande" ${v.porte === 'Grande' ? 'selected' : ''}>Grande</option>
        </select>
      </div>
    </div>
    <div class="pet-linha-inferior">
      <div>
        <span class="input-label">Espécie e raça<span class="required-star">*</span></span>
        <input type="text" placeholder="Ex: Cachorro Beagle" class="pet-raca-especie" value="${escaparValor(v.racaEspecie)}">
      </div>
    </div>
  `);
}

function preencherPets(texto) {
  const container = document.getElementById("containerPets") || 
                    document.getElementById("containerPet") || 
                    document.getElementById("petsContainer");

  if (!container) return;

  container.innerHTML = "";
  if (!texto || texto === "-" || texto.trim() === "") return;

  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    if (p.some(item => item && item.trim() !== "")) {
      addPet({
        nome: p[0],
        racaEspecie: p[1],
        porte: p[2]
      });
    }
  });
}

function addPrestador(v = {}) {
  adicionarItemDinamico('containerPrestadores', 'item-prestador', `
    <div><span class="input-label">Nome<span class="required-star">*</span></span><input type="text" placeholder="Preencha o nome" class="pr-nome" value="${escaparValor(v.nome)}"></div>
    <div><span class="input-label">Serviço<span class="required-star">*</span></span><input type="text" placeholder="Ex: Diarista" class="pr-servico" value="${escaparValor(v.servico)}"></div>
    <div><span class="input-label">Telefone/Celular<span class="required-star">*</span></span><input type="tel" placeholder="21999999999" class="pr-tel" value="${escaparValor(v.tel)}"></div>
    <div><span class="input-label">Possui chave?<span class="required-star">*</span></span><select class="pr-chave">
      <option value="">Selecione</option>
      <option value="Sim" ${v.chave === 'Sim' ? 'selected' : ''}>Sim</option>
      <option value="Não" ${v.chave === 'Não' ? 'selected' : ''}>Não</option>
    </select></div>
  `);
}

function preencherPrestadores(texto) {
  const container = document.getElementById("containerPrestadores");
  if (!container) return;
  container.innerHTML = "";
  if (!texto || texto === "-") return;
  texto.split("\n").forEach(linha => {
    const p = linha.split(" | ");
    addPrestador({
      nome: p[0] || '',
      servico: p[1] || '',
      tel: p[2] || '',
      chave: p[3] || ''
    });
  });
}

// Coleta os itens repetíveis em formato de texto para envio ao backend.
function coletarDadosGrupados(selectorGroup, camposSelectors) {
  const grupos = document.querySelectorAll(selectorGroup);
  const resultado = [];

  grupos.forEach(g => {
    const valores = camposSelectors.map(s => {
      const el = g.querySelector(s);
      return el ? limparValorLista(el.value) : "";
    });

    if (valores[0] !== "") {
      resultado.push(valores.join(" | "));
    }
  });

  return resultado.join("\n");
}
