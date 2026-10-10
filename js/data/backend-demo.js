// ==========================================
// BACKEND DE DEMONSTRAÇÃO (roda no navegador)
// ==========================================
// Com MODO_DEMO ligado (js/regras.js), substitui window.Backend.chamar: cada rota que o site chama
// é respondida aqui, no mesmo formato do backend de verdade, sem nenhum fetch. Os dados são
// fictícios e ficam no localStorage de quem abre a página (cada visitante tem a sua cópia, que
// sobrevive a recarregar). "Restaurar dados da demonstração" volta ao estado inicial.
//
// Regras simplificadas de propósito: sem e-mails, sem PDFs, sem arquivos do Drive. O que não existe
// na demonstração responde com uma mensagem clara em vez de quebrar a tela.
//
// Carregar logo depois de js/data/backend.js.
(function() {
  if (typeof MODO_DEMO === "undefined" || !MODO_DEMO || !window.Backend) return;

  var CHAVE = "demo_dados_v1";
  var MSG_INDISPONIVEL = "Recurso indisponível na demonstração.";
  var MSG_NAO_CONFERE = "CPF ou data de nascimento não conferem com nenhum cadastro. Verifique os dados informados.";
  var MSG_AGUARDANDO = "Seu cadastro foi recebido e está aguardando a aprovação da administração. Você receberá a confirmação por e-mail assim que ele for aprovado.";
  var EMAIL_DEMO = "demo@exemplo.com.br";

  var GRUPOS = {
    emergencias: ["nome", "celular", "endereco", "vinculo"],
    ocupantes: ["nome", "celular", "nascimento", "vinculo"],
    carros: ["marcaModelo", "cor", "placa"],
    motos: ["marcaModelo", "cor", "placa"],
    bikes: ["marca", "cor"],
    pets: ["nome", "especieRaca", "porte"],
    prestadores: ["nome", "servico", "celular", "chave"]
  };
  var CAMPOS_LISTA = { emergencias: "emergenciasList", ocupantes: "ocupantesList", carros: "carrosList", motos: "motosList",
    bikes: "bikesList", pets: "petsList", prestadores: "prestadorList" };

  var CARGOS = ["condominio", "sindico", "administradora", "conselho", "desenvolvedor"];
  var NOMES_PAPEIS = { condominio: "Condomínio", desenvolvedor: "Desenvolvedor", sindico: "Síndico", conselho: "Conselho", administradora: "Administradora" };

  // Mesma tabela do backend (autorizacoes.gs): padrão por cargo, na ordem sindico, administradora, conselho, desenvolvedor.
  var PERMISSOES_ADMIN = [
    ["consulta", "Consulta por apartamento e busca geral", [1, 1, 1, 1]],
    ["editarCadastros", "Editar, marcar \"mudou-se\" e excluir cadastros", [1, 0, 1, 1]],
    ["aprovacoes", "Cadastros para aprovação: ver", [1, 0, 1, 1]],
    ["aprovar", "Cadastros para aprovação: aprovar e rejeitar", [1, 0, 0, 1]],
    ["pendencias", "Pendências", [1, 0, 1, 1]],
    ["pendenciasEscrever", "Pendências: ignorar", [1, 0, 1, 1]],
    ["relatorios", "Relatórios", [1, 0, 1, 1]],
    ["historico", "Últimas alterações cadastrais", [1, 0, 1, 1]],
    ["historicoEscrever", "Últimas alterações cadastrais: apagar", [1, 0, 1, 1]],
    ["gabarito", "Gabarito de vagas", [1, 0, 1, 1]],
    ["gabaritoEscrever", "Gabarito de vagas: salvar", [1, 0, 1, 1]],
    ["membros", "Membros", [1, 0, 1, 1]],
    ["membrosEscrever", "Membros: salvar", [1, 0, 1, 1]],
    ["notificacoes", "Notificações", [1, 0, 1, 1]],
    ["notificacoesEscrever", "Notificações: salvar", [1, 0, 1, 1]],
    ["bloqueios", "Bloqueios", [1, 0, 1, 1]],
    ["bloqueiosEscrever", "Bloqueios: desbloquear", [1, 0, 1, 1]],
    ["dados", "Dados (perfil dos moradores e fonte de dados)", [1, 0, 1, 1]],
    ["dadosEscrever", "Dados: trocar a fonte de dados", [1, 0, 0, 1]],
    ["drive", "Arquivos (fichas em PDF, contratos, relatórios e links úteis)", [1, 0, 1, 1]],
    ["driveEscrever", "Arquivos: editar e acrescentar", [1, 0, 0, 1]]
  ];
  var LINHAS_AUTORIZACAO = [
    { rotulo: "Consulta por apartamento e busca geral", explicacao: "escrever: editar, mudou-se, excluir", ler: "consulta", escrever: "editarCadastros" },
    { rotulo: "Cadastros para aprovação", explicacao: "escrever: aprovar e rejeitar", ler: "aprovacoes", escrever: "aprovar" },
    { rotulo: "Pendências", explicacao: "escrever: ignorar", ler: "pendencias", escrever: "pendenciasEscrever" },
    { rotulo: "Relatórios", ler: "relatorios", escrever: null },
    { rotulo: "Últimas alterações cadastrais", explicacao: "escrever: apagar", ler: "historico", escrever: "historicoEscrever" },
    { rotulo: "Gabarito de vagas", explicacao: "escrever: salvar", ler: "gabarito", escrever: "gabaritoEscrever" },
    { rotulo: "Membros", explicacao: "escrever: salvar", ler: "membros", escrever: "membrosEscrever" },
    { rotulo: "Notificações", explicacao: "escrever: salvar", ler: "notificacoes", escrever: "notificacoesEscrever" },
    { rotulo: "Bloqueios", explicacao: "escrever: desbloquear", ler: "bloqueios", escrever: "bloqueiosEscrever" },
    { rotulo: "Dados", explicacao: "escrever: trocar a fonte de dados", ler: "dados", escrever: "dadosEscrever" },
    { rotulo: "Arquivos", explicacao: "fichas, contratos, relatórios e links úteis; escrever: editar e acrescentar arquivos", ler: "drive", escrever: "driveEscrever" }
  ];
  var PERMISSOES_FIXAS = {
    desenvolvedor: PERMISSOES_ADMIN.map(function(p) { return p[0]; }),
    conselho: ["membros", "membrosEscrever", "notificacoes", "notificacoesEscrever"]
  };
  var TIPOS_NOTIFICACAO = ["resumo", "bloqueio", "exclusao", "aprovacao"];

  // ---- Dados iniciais (fictícios) ----
  // 5 andares x 4 unidades (101 a 504). Vagas usam os números que existem nos mapas de exemplo.
  function aptosIniciais() {
    var lista = [];
    for (var andar = 1; andar <= 5; andar++) for (var pos = 1; pos <= 4; pos++) lista.push(andar + "0" + pos);
    return lista;
  }

  function gabaritoInicial() {
    var vagasG1 = ["1", "3", "4", "5", "6", "7", "9", "10", "11", "12", "13", "14"];
    var vagasG2 = ["3", "5", "6", "7", "8", "9", "10", "11"];
    return aptosIniciais().map(function(apto, i) {
      return i < vagasG1.length ? { _id: apto, andar: "G1", vaga: vagasG1[i] } : { _id: apto, andar: "G2", vaga: vagasG2[i - vagasG1.length] };
    });
  }

  function linhas(lista) {
    return lista.map(function(l) { return l.join(" | "); }).join("\n");
  }

  function cadastroBase(id, apto, tipo, nome, cpf, nasc, extra) {
    var c = {
      _id: id, apto: apto, tipo: tipo, moraNoImovel: tipo === "Proprietário" ? "Sim" : "",
      nome: nome, cpf: cpf, nasc: nasc, rg: "", orgaoEmissor: "", celular: "(21) 99999-0000", telFixo: "",
      email: "", inqPropAdmin: "", inqContato: "", inqVigencia: "", observacoes: "", exigirCodigo: false,
      vagaNumeroAndar: "", vagaSituacao: "", vagaAptoRelacionado: "", historicoContratos: [],
      emergencias: "", ocupantes: "", carros: "", motos: "", bikes: "", pets: "", prestadores: "",
      dataUltimoEnvio: "15/09/2026 10:00:00", criadoEm: "2026-09-15T13:00:00.000Z",
      logs: ["[15/09/2026 10:00] Novo cadastro realizado"], situacao: "", aprovacao: ""
    };
    return Object.assign(c, extra || {});
  }

  function dadosIniciais() {
    // CPFs gerados para teste (dígitos verificadores válidos, não pertencem a ninguém).
    var cadastros = [
      cadastroBase("demo-1", "101", "Proprietário", "Ana Beatriz Lima", "529.982.247-25", "12/03/1980", {
        email: "ana@exemplo.com.br", celular: "(21) 98888-1111",
        emergencias: linhas([["Carlos Lima", "(21) 97777-2222", "Rua das Flores, 10", "Irmão"]]),
        ocupantes: linhas([["Pedro Lima", "", "05/06/2012", "Filho"]]),
        carros: linhas([["Fiat Argo", "Prata", "ABC1D23"]]),
        pets: linhas([["Mel", "Cachorro / SRD", "Pequeno"]])
      }),
      cadastroBase("demo-2", "102", "Inquilino", "Bruno Carvalho", "111.444.777-35", "22/07/1991", {
        email: "bruno@exemplo.com.br", inqPropAdmin: "Imobiliária Exemplo", inqContato: "(21) 3333-4444",
        inqVigencia: "01/02/2026 a 31/01/2027",
        emergencias: linhas([["Lúcia Carvalho", "(21) 96666-3333", "", "Mãe"]]),
        motos: linhas([["Honda CG 160", "Vermelha", ""]])
      }),
      cadastroBase("demo-3", "201", "Proprietário", "Cláudia Ferreira", "390.533.447-05", "02/11/1955", {
        moraNoImovel: "Sim", bikes: linhas([["Caloi", "Azul"]]),
        prestadores: linhas([["Joana Souza", "Diarista", "(21) 95555-4444", "Sim"]])
      }),
      cadastroBase("demo-4", "202", "Proprietário", "Daniel Rocha", "714.602.380-01", "30/01/1978", {
        moraNoImovel: "Não, está alugado", email: "daniel@exemplo.com.br"
      }),
      cadastroBase("demo-5", "202", "Inquilino", "Eduarda Santos", "153.509.460-56", "18/09/1995", {
        inqPropAdmin: "Daniel Rocha", inqVigencia: "01/03/2025 a 28/02/2026",
        carros: linhas([["VW Polo", "Branco", "XYZ9A87"]]),
        emergencias: linhas([["Marcos Santos", "(21) 94444-5555", "", "Pai"]])
      }),
      cadastroBase("demo-6", "301", "Proprietário", "Felipe Araújo", "248.438.034-80", "09/04/1987", {
        dataUltimoEnvio: "10/08/2025 09:00:00", criadoEm: "2025-08-10T12:00:00.000Z",
        carros: linhas([["Toyota Corolla", "Preto", "QWE4R56"], ["Jeep Renegade", "Cinza", ""]])
      }),
      cadastroBase("demo-7", "402", "Proprietário", "Gabriela Mendes", "862.719.250-22", "14/12/1968", {
        email: "gabriela@exemplo.com.br",
        emergencias: linhas([["Rafael Mendes", "(21) 93333-6666", "", "Filho"]]),
        ocupantes: linhas([["Hugo Mendes", "(21) 92222-7777", "21/08/1966", "Cônjuge"]])
      }),
      cadastroBase("demo-8", "503", "Inquilino", "Henrique Oliveira", "037.215.118-32", "03/05/1999", {
        criadoEm: "2026-10-09T15:00:00.000Z", dataUltimoEnvio: "09/10/2026 12:00:00",
        logs: ["[09/10/2026 12:00] Novo cadastro realizado"], aprovacao: "pendente"
      })
    ];
    return {
      cadastros: cadastros,
      gabarito: gabaritoInicial(),
      historico: [
        { _id: "h1", quando: "2026-10-05T14:20:00.000Z", tipo: "edição", apto: "101", nome: "Ana Beatriz Lima", cadastroTipo: "Proprietário", autor: "Próprio morador (formulário)", detalhe: "Alterou: Celular" },
        { _id: "h2", quando: "2026-09-15T13:00:00.000Z", tipo: "criação", apto: "201", nome: "Cláudia Ferreira", cadastroTipo: "Proprietário", autor: "Próprio morador (formulário)", detalhe: "" }
      ],
      membros: {
        condominio: { email: "" },
        sindico: { cadastroId: "demo-7", usarEmailCadastro: true, email: "" },
        conselho: [{ cadastroId: "demo-1", usarEmailCadastro: true, email: "" }, { cadastroId: "demo-3", usarEmailCadastro: false, email: "claudia@exemplo.com.br" }],
        desenvolvedor: { cadastroId: "", usarEmailCadastro: false, email: EMAIL_DEMO },
        administradora: { email: "administradora@exemplo.com.br" }
      },
      autorizacoes: {},
      notificacoes: null,
      bloqueios: [
        { _id: "b1", cpf: "***.***.***-12", apto: "", nome: "", bloqueadoEm: "2026-10-01T18:30:00.000Z", motivo: "5 tentativas com dados que não conferem",
          tipoErro: "consulta", tentativas: [], ativo: true, desbloqueadoEm: "", desbloqueadoPor: "" }
      ],
      pendenciasIgnoradas: [],
      contadores: {},
      seq: 100
    };
  }

  // ---- Armazenamento ----
  var memoria = null;
  function carregar() {
    if (memoria) return memoria;
    try { memoria = JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (e) { memoria = null; }
    if (!memoria || !Array.isArray(memoria.cadastros)) memoria = dadosIniciais();
    return memoria;
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(memoria)); } catch (e) { /* sem storage: vale só até recarregar */ }
  }
  function novoId(prefixo) {
    var d = carregar();
    d.seq = (d.seq || 100) + 1;
    return prefixo + "-" + d.seq;
  }
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- Auxiliares (versões simplificadas das do backend) ----
  function digitos(v) { return String(v || "").replace(/\D/g, ""); }
  function numApto(a) { return parseInt(digitos(a), 10) || 0; }
  function ativo(c) { return c.situacao !== "mudou-se"; }
  function aprovado(c) { return !c.aprovacao; }
  function cadastrosValidos() {
    return carregar().cadastros.filter(aprovado).sort(function(a, b) {
      return numApto(a.apto) - numApto(b.apto) || (ativo(a) ? 0 : 1) - (ativo(b) ? 0 : 1) || String(a.criadoEm).localeCompare(String(b.criadoEm));
    });
  }
  function doApto(lista, apto) { return lista.filter(function(c) { return String(c.apto) === String(apto); }); }
  function listaAptos() {
    var aptos = carregar().gabarito.map(function(g) { return g._id; });
    cadastrosValidos().forEach(function(c) { if (aptos.indexOf(c.apto) === -1) aptos.push(c.apto); });
    return aptos.sort(function(a, b) { return numApto(a) - numApto(b); });
  }
  function textoParaItens(texto, campos) {
    return String(texto || "").split("\n").filter(Boolean).map(function(l) {
      var partes = l.split("|").map(function(p) { return p.trim(); });
      var o = {};
      campos.forEach(function(c, i) { o[c] = partes[i] || ""; });
      return o;
    });
  }
  function grupos(c) {
    var r = {};
    Object.keys(GRUPOS).forEach(function(g) { r[g] = textoParaItens(c[g], GRUPOS[g]); });
    return r;
  }
  function moraNoImovel(c) {
    if (!/propriet/i.test(c.tipo || "")) return "";
    return ["Sim", "Não, está alugado", "Não, está desocupado"].indexOf(c.moraNoImovel) !== -1 ? c.moraNoImovel : "Sim";
  }
  function dadosCadastro(c) {
    var logs = Array.isArray(c.logs) ? c.logs : [];
    return Object.assign(clonar(c), { id: c._id, moraNoImovel: moraNoImovel(c), logsAtualizacao: logs, logs: logs,
      cargos: cargosPorCadastro()[c._id] || [], pdfUrl: "", pdfEm: "" });
  }
  function label(apto, c, total) {
    var texto = apto + " - " + (c.nome || "Sem nome");
    if (total > 1) texto += " (" + (c.tipo || "Cadastro") + ")";
    if (!ativo(c)) texto += " (mudou-se)";
    return texto;
  }
  function normalizarData(v) {
    var m = String(v || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || String(v || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    if (m[1].length === 4) return m[3] + "/" + m[2] + "/" + m[1];
    return ("0" + m[1]).slice(-2) + "/" + ("0" + m[2]).slice(-2) + "/" + m[3];
  }
  function agoraBr() {
    var d = new Date();
    function p(n) { return ("0" + n).slice(-2); }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function registrarHistorico(e) {
    var d = carregar();
    d.historico.unshift(Object.assign({ _id: novoId("h"), quando: new Date().toISOString() }, e));
    d.historico = d.historico.slice(0, 50);
  }
  function formatarNome(n) {
    return String(n || "").trim().toLowerCase().replace(/(^|\s)(\S)/g, function(_, e, l) { return e + l.toUpperCase(); })
      .replace(/\s(D[aeo]s?|E)\s/g, function(m) { return m.toLowerCase(); });
  }

  // ---- Membros, cargos e autorizações ----
  function emailEfetivo(cargo, porId) {
    if (!cargo) return "";
    if (cargo.cadastroId && cargo.usarEmailCadastro) { var c = porId[cargo.cadastroId]; return c ? String(c.email || "").toLowerCase() : ""; }
    return String(cargo.email || "").toLowerCase();
  }
  function porIdAtivos() {
    var r = {};
    cadastrosValidos().filter(ativo).forEach(function(c) { r[c._id] = c; });
    return r;
  }
  function cargosPorCadastro() {
    var m = carregar().membros, mapa = {};
    function add(cargo, nome) {
      if (!cargo || !cargo.cadastroId) return;
      var l = mapa[cargo.cadastroId] = mapa[cargo.cadastroId] || [];
      if (l.indexOf(nome) === -1) l.push(nome);
    }
    add(m.sindico, "Síndico");
    (m.conselho || []).forEach(function(c) { add(c, "Membro do conselho"); });
    add(m.desenvolvedor, "Desenvolvedor");
    return mapa;
  }
  function autorizacoes() {
    var salvas = carregar().autorizacoes || {}, r = {};
    PERMISSOES_ADMIN.forEach(function(p) {
      r[p[0]] = { condominio: true };
      ["sindico", "administradora", "conselho", "desenvolvedor"].forEach(function(cargo, i) { r[p[0]][cargo] = !!p[2][i]; });
      CARGOS.forEach(function(cargo) {
        if (salvas[p[0]] && typeof salvas[p[0]][cargo] === "boolean") r[p[0]][cargo] = salvas[p[0]][cargo];
      });
    });
    Object.keys(PERMISSOES_FIXAS).forEach(function(cargo) { PERMISSOES_FIXAS[cargo].forEach(function(ch) { r[ch][cargo] = true; }); });
    LINHAS_AUTORIZACAO.forEach(function(l) {
      if (l.escrever) CARGOS.forEach(function(cargo) { if (!r[l.ler][cargo]) r[l.escrever][cargo] = false; });
    });
    return r;
  }
  function permissoesDoPapel(papel) {
    var todas = autorizacoes(), r = {};
    PERMISSOES_ADMIN.forEach(function(p) { r[p[0]] = !!todas[p[0]][papel]; });
    return r;
  }
  // Na demonstração, o cargo é o escolhido na tela de login (guardado na sessão do admin).
  function papelAtual() {
    return (window.AdminAuth && typeof window.AdminAuth.getPapel === "function" && window.AdminAuth.getPapel()) || "desenvolvedor";
  }
  function colunasEditaveis(papel) {
    if (papel === "desenvolvedor") return CARGOS.slice();
    if (papel === "condominio") return ["sindico", "conselho", "administradora"];
    if (papel === "sindico") return ["conselho", "administradora"];
    return [];
  }
  function membrosParaNotificacao() {
    var m = carregar().membros, porId = porIdAtivos(), lista = [];
    function add(email, cargo, cad) {
      email = String(email || "").trim().toLowerCase();
      if (!email) return;
      var item = lista.filter(function(x) { return x.email === email; })[0];
      if (!item) { item = { email: email, cargos: [], nome: "", apto: "" }; lista.push(item); }
      if (item.cargos.indexOf(cargo) === -1) item.cargos.push(cargo);
      if (cad && !item.nome) { item.nome = cad.nome || ""; item.apto = String(cad.apto || ""); }
    }
    add(m.condominio.email, "Condomínio", null);
    add(emailEfetivo(m.sindico, porId), "Síndico", porId[m.sindico.cadastroId]);
    (m.conselho || []).forEach(function(c, i) { add(emailEfetivo(c, porId), "Conselho " + (i + 1), porId[c.cadastroId]); });
    add(emailEfetivo(m.desenvolvedor, porId), "Desenvolvedor", porId[m.desenvolvedor.cadastroId]);
    return lista;
  }
  function tipoPermitido(tipo, membro) {
    if (tipo !== "exclusao" && tipo !== "aprovacao") return true;
    return membro.cargos.some(function(c) { return ["Síndico", "Condomínio", "Desenvolvedor"].indexOf(c) !== -1; });
  }
  function respostaNotificacoes() {
    var d = carregar(), membros = membrosParaNotificacao(), papel = papelAtual();
    return {
      sucesso: true, configurado: !!d.notificacoes, papel: papel, tipos: TIPOS_NOTIFICACAO,
      membros: membros.map(function(m) {
        var prefs = (d.notificacoes || {})[m.email] || { resumo: true, bloqueio: true, exclusao: tipoPermitido("exclusao", m), aprovacao: tipoPermitido("aprovacao", m) };
        var permitidos = {};
        TIPOS_NOTIFICACAO.forEach(function(t) { permitidos[t] = tipoPermitido(t, m); });
        return { email: m.email, cargos: m.cargos, nome: m.nome, apto: m.apto, preferencias: prefs, permitidos: permitidos,
          marcado: !!prefs.resumo, editavel: papel !== "conselho" && papel !== "administradora" };
      })
    };
  }

  // ---- Pendências e estatísticas ----
  function pendencias() {
    var cadastros = cadastrosValidos().filter(ativo), gab = carregar().gabarito;
    var comCadastro = {}, sem = [], contratos = [], desatualizados = [], semEmergencia = [], semCelular = [], semPlaca = [], semVaga = [];
    function item(c, detalhe) { return { apto: String(c.apto), nome: c.nome || "", tipo: c.tipo || "", id: c._id, detalhe: detalhe || "", pdfUrl: "" }; }
    var umAnoAtras = new Date(); umAnoAtras.setMonth(umAnoAtras.getMonth() - 12);
    cadastros.forEach(function(c) {
      comCadastro[c.apto] = true;
      var g = grupos(c);
      var m = String(c.dataUltimoEnvio || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      var envio = m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
      if (!envio) desatualizados.push(item(c, "sem data de envio"));
      else if (envio < umAnoAtras) desatualizados.push(item(c, "último envio em " + m[1] + "/" + m[2] + "/" + m[3]));
      if (/inquilin/i.test(c.tipo || "")) {
        var fim = String(c.inqVigencia || "").match(/(\d{2})\/(\d{2})\/(\d{4})\s*$/);
        if (!String(c.inqVigencia || "").trim()) contratos.push(item(c, "vigência do contrato não informada"));
        else if (fim && new Date(+fim[3], +fim[2] - 1, +fim[1]) < new Date()) contratos.push(item(c, "contrato vencido em " + fim[1] + "/" + fim[2] + "/" + fim[3]));
      }
      if (!String(c.celular || "").trim() && !String(c.telFixo || "").trim()) semCelular.push(item(c, "sem celular nem telefone"));
      if (!g.emergencias.length) semEmergencia.push(item(c, ""));
      var veiculos = g.carros.concat(g.motos);
      veiculos.forEach(function(v) { if (!v.placa) semPlaca.push(item(c, [v.marcaModelo, v.cor].filter(Boolean).join(" · ") || "veículo sem placa")); });
      var temVaga = gab.some(function(x) { return x._id === c.apto && x.vaga; });
      if (veiculos.length && !temVaga) semVaga.push(item(c, veiculos.length + " veículo(s) e nenhuma vaga no gabarito"));
    });
    listaAptos().forEach(function(a) { if (!comCadastro[a]) sem.push({ apto: a, nome: "", tipo: "", id: "", detalhe: "" }); });
    var ignoradas = carregar().pendenciasIgnoradas || [];
    var lista = [
      { chave: "semCadastro", titulo: "Apartamentos sem cadastro", itens: sem },
      { chave: "contratos", titulo: "Contratos de locação (vencidos, vencendo em 30 dias ou sem vigência)", itens: contratos },
      { chave: "desatualizados", titulo: "Cadastros sem atualização há mais de 12 meses", itens: desatualizados },
      { chave: "semEmergencia", titulo: "Sem contato de emergência", itens: semEmergencia },
      { chave: "semCelular", titulo: "Sem telefone do responsável", itens: semCelular },
      { chave: "semPlaca", titulo: "Veículos sem placa", itens: semPlaca },
      { chave: "semVaga", titulo: "Com veículo, mas sem vaga", itens: semVaga },
      { chave: "vagasRepetidas", titulo: "Vagas repetidas no gabarito", itens: [] }
    ];
    lista.forEach(function(g) {
      g.itens.forEach(function(it) { it.chave = g.chave + "|" + (it.id || it.apto) + "|" + (it.detalhe || ""); it.ignorado = ignoradas.indexOf(it.chave) !== -1; });
      g.ativos = g.itens.filter(function(it) { return !it.ignorado; }).length;
    });
    return lista;
  }

  function estatisticas() {
    var cadastros = cadastrosValidos().filter(ativo);
    var faixas = [["0 a 11", 11], ["12 a 17", 17], ["18 a 29", 29], ["30 a 44", 44], ["45 a 59", 59], ["60 a 69", 69], ["70 ou mais", 999]]
      .map(function(f) { return { rotulo: f[0], total: 0, ate: f[1] }; });
    var semData = 0, total = 0, titulares = 0, ocupantes = 0, genero = { F: 0, M: 0, "": 0 };
    function generoDe(nome) {
      var p = String(nome || "").trim().split(/\s+/)[0].toLowerCase();
      if (!p) return "";
      return /a$/.test(p) ? "F" : "M";
    }
    function contar(nome, nasc) {
      total++; genero[generoDe(nome)]++;
      var m = normalizarData(nasc).match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) { semData++; return; }
      var idade = Math.floor((Date.now() - new Date(+m[3], +m[2] - 1, +m[1])) / 31557600000);
      for (var i = 0; i < faixas.length; i++) if (idade <= faixas[i].ate) { faixas[i].total++; return; }
    }
    var resumo = { proprietarios: 0, inquilinos: 0, naoMoram: 0, pets: 0, carros: 0, motos: 0, bikes: 0 }, alugados = {}, desocupados = {}, comCad = {};
    cadastros.forEach(function(c) {
      var g = grupos(c), mora = moraNoImovel(c);
      comCad[c.apto] = true;
      if (!(mora && mora !== "Sim")) { contar(c.nome, c.nasc); titulares++; }
      g.ocupantes.forEach(function(o) { if (o.nome) { contar(o.nome, o.nascimento); ocupantes++; } });
      if (/propriet/i.test(c.tipo)) {
        resumo.proprietarios++;
        if (mora !== "Sim") resumo.naoMoram++;
        if (mora === "Não, está alugado") alugados[c.apto] = true;
        if (mora === "Não, está desocupado") desocupados[c.apto] = true;
      } else { resumo.inquilinos++; alugados[c.apto] = true; }
      resumo.pets += g.pets.length; resumo.carros += g.carros.length; resumo.motos += g.motos.length; resumo.bikes += g.bikes.length;
    });
    var idade = faixas.map(function(f) { return { rotulo: f.rotulo, total: f.total }; }).concat([{ rotulo: "Sem data", total: semData }]);
    var aptos = listaAptos();
    return {
      sucesso: true, total: total, titulares: titulares, ocupantes: ocupantes, idade: idade,
      genero: [{ rotulo: "Feminino", total: genero.F }, { rotulo: "Masculino", total: genero.M }, { rotulo: "Sem nome", total: genero[""] }],
      resumo: {
        moradores: total, proprietarios: resumo.proprietarios, inquilinos: resumo.inquilinos, ocupantes: ocupantes,
        proprietariosNaoMoram: resumo.naoMoram, apartamentos: aptos.length,
        semCadastro: aptos.filter(function(a) { return !comCad[a]; }).length,
        alugados: Object.keys(alugados).length, desocupados: Object.keys(desocupados).length,
        menores: idade[0].total + idade[1].total, idosos: idade[6].total,
        pets: resumo.pets, carros: resumo.carros, motos: resumo.motos, bicicletas: resumo.bikes
      }
    };
  }

  // ---- Cadastro ----
  function salvarCadastro(dados, admin) {
    var d = carregar();
    if (!dados || !String(dados.apto || "").trim()) return { sucesso: false, mensagem: "Selecione o apartamento." };
    var cpf = digitos(dados.moradorCpf);
    var novoMorador = !admin && dados.acao === "Sou morador novo";
    var anterior = null;
    if (novoMorador) {
      if (d.cadastros.some(function(c) { return c.aprovacao === "pendente" && digitos(c.cpf) === cpf; })) return { sucesso: false, mensagem: MSG_AGUARDANDO };
      if (cadastrosValidos().filter(ativo).some(function(c) { return digitos(c.cpf) === cpf; })) {
        return { sucesso: false, mensagem: "Este CPF já possui cadastro no condomínio. Para atualizar seus dados ou realizar alterações, utilize a busca por CPF na tela inicial ou procure o síndico." };
      }
    } else {
      anterior = d.cadastros.filter(function(c) { return c._id === String(dados.cadastroId || ""); })[0] || null;
      if (!anterior) return { sucesso: false, mensagem: "Cadastro não encontrado. Ele pode ter sido excluído; recarregue a página." };
      if (!admin && (digitos(dados.credencialCpf) !== digitos(anterior.cpf) || normalizarData(dados.credencialNasc) !== normalizarData(anterior.nasc))) {
        return { sucesso: false, mensagem: "Não foi possível confirmar a identidade para esta atualização. Volte ao início, busque o cadastro pelo CPF e data de nascimento e tente novamente." };
      }
    }
    var vaga = String(dados.vagaNumero || "").trim();
    var andar = String(dados.vagaAndar || "").trim();
    var novo = {
      apto: String(dados.apto).trim(), tipo: dados.tipoResidente || "",
      moraNoImovel: moraNoImovel({ tipo: dados.tipoResidente, moraNoImovel: dados.moraNoImovel }),
      nome: dados.moradorNome ? formatarNome(dados.moradorNome) : "-", cpf: dados.moradorCpf || "",
      nasc: normalizarData(dados.moradorNasc), rg: dados.moradorRg || "", orgaoEmissor: dados.moradorOrgaoEmissor || "",
      celular: dados.moradorCelular || "", telFixo: dados.moradorTel || "", email: dados.moradorEmail || "",
      inqPropAdmin: dados.inqPropAdmin || "", inqContato: dados.inqContato || "", inqVigencia: dados.inqVigencia || "",
      observacoes: dados.observacoes || "", exigirCodigo: false,
      vagaNumeroAndar: vaga && andar ? vaga + " / " + andar : vaga,
      vagaSituacao: dados.vagaSituacao || "", vagaAptoRelacionado: dados.vagaAptoRelacionado || "",
      dataUltimoEnvio: agoraBr() + ":00", historicoContratos: anterior ? (anterior.historicoContratos || []) : []
    };
    Object.keys(CAMPOS_LISTA).forEach(function(g) { novo[g] = dados[CAMPOS_LISTA[g]] || ""; });
    var quem = admin ? " (pela administração: " + EMAIL_DEMO + ")" : "";
    novo.logs = ["[" + agoraBr() + "] " + (anterior ? "Cadastro atualizado" : "Novo cadastro realizado") + quem].concat(anterior ? anterior.logs || [] : []);
    novo.criadoEm = anterior ? anterior.criadoEm : new Date().toISOString();
    novo.situacao = anterior ? anterior.situacao || "" : "";
    novo.aprovacao = anterior ? anterior.aprovacao || "" : (novoMorador ? "pendente" : "");
    novo._id = anterior ? anterior._id : novoId("demo");
    if (anterior) d.cadastros[d.cadastros.indexOf(anterior)] = novo; else d.cadastros.push(novo);
    if (novo.aprovacao === "pendente") {
      salvar();
      return { sucesso: true, id: novo._id, aguardandoAprovacao: true, mensagem: "Cadastro enviado! Aguardando aprovação" };
    }
    registrarHistorico({ tipo: anterior ? "edição" : "criação", apto: novo.apto, nome: novo.nome, cadastroTipo: novo.tipo,
      autor: admin ? EMAIL_DEMO : "Próprio morador (formulário)", detalhe: anterior ? "Cadastro atualizado" : "" });
    salvar();
    return { sucesso: true, id: novo._id, mensagem: anterior ? "Cadastro atualizado com sucesso!" : "Cadastro enviado com sucesso!" };
  }

  function resolverCadastro(apto, idOuOcorrencia) {
    var chave = String(idOuOcorrencia || "").trim();
    var lista = cadastrosValidos();
    if (chave && !/^\d+$/.test(chave)) return lista.filter(function(c) { return c._id === chave; })[0] || null;
    return doApto(lista, apto)[(parseInt(chave, 10) || 1) - 1] || null;
  }

  function consultarPorCpf(cpf, nasc) {
    var cpfD = digitos(cpf), data = normalizarData(nasc);
    if (cpfD.length !== 11 || !data) return { encontrado: false, mensagem: "Informe o CPF e a data de nascimento." };
    var achado = cadastrosValidos().filter(ativo).filter(function(c) { return digitos(c.cpf) === cpfD && normalizarData(c.nasc) === data; })[0];
    if (achado) return { encontrado: true, dados: dadosCadastro(achado) };
    var aguardando = carregar().cadastros.some(function(c) { return c.aprovacao === "pendente" && digitos(c.cpf) === cpfD && normalizarData(c.nasc) === data; });
    if (aguardando) return { encontrado: false, aguardandoAprovacao: true, mensagem: MSG_AGUARDANDO };
    return { encontrado: false, mensagem: MSG_NAO_CONFERE };
  }

  // ---- Rotas ----
  var ROTAS = {
    fbTestarConexao: function() { return { ok: true }; },
    fbMeuAcesso: function() {
      var papel = papelAtual();
      return { sucesso: true, email: EMAIL_DEMO, papel: papel, nomePapel: NOMES_PAPEIS[papel], permissoes: permissoesDoPapel(papel) };
    },
    fbListarApartamentos: function() {
      var cadastros = cadastrosValidos();
      return { sucesso: true, itens: listaAptos().map(function(apto) {
        var lista = doApto(cadastros, apto);
        return { apto: apto, totalRegistros: lista.length, disponivel: lista.length > 0, opcoes: lista.map(function(c) {
          return { apto: apto, ocorrencia: c._id, id: c._id, ativo: ativo(c), label: label(apto, c, lista.length) };
        }) };
      }) };
    },
    fbObterMoradorPorApto: function(p) {
      var c = resolverCadastro(p.apto, p.ocorrencia);
      return c ? { encontrado: true, dados: dadosCadastro(c) } : { encontrado: false, mensagem: "Cadastro não localizado." };
    },
    fbObterMoradorPorCpf: function(p) { return consultarPorCpf(p.cpf, p.nascimento); },
    fbConfirmarCodigoCpf: function(p) { return consultarPorCpf(p.cpf, p.nascimento); },
    fbDesativarCodigo: function() { return { sucesso: true, mensagem: "Código por e-mail desativado." }; },
    fbObterApartamentosGabarito: function() { return { sucesso: true, apartamentos: carregar().gabarito.map(function(g) { return g._id; }) }; },
    fbObterGabaritoVagasCompleto: function() { return { sucesso: true, dados: carregar().gabarito.map(function(g) { return [g._id, g.andar || "", g.vaga || ""]; }) }; },
    fbSalvarCadastro: function(p) { return salvarCadastro(p.dados, false); },
    fbAdminSalvarCadastro: function(p) { return salvarCadastro(p.dados, true); },
    fbExcluirCadastro: function(p) {
      var d = carregar(), c = resolverCadastro(p.apto, p.ocorrencia);
      if (!c) return { sucesso: false, mensagem: "Cadastro não localizado." };
      d.cadastros.splice(d.cadastros.indexOf(c), 1);
      registrarHistorico({ tipo: "exclusão", apto: c.apto, nome: c.nome, cadastroTipo: c.tipo, autor: EMAIL_DEMO, detalhe: "" });
      salvar();
      return { sucesso: true, mensagem: "Cadastro excluído com sucesso." };
    },
    fbDefinirSituacaoCadastro: function(p) {
      var c = resolverCadastro(p.apto, p.ocorrencia);
      if (!c) return { sucesso: false, mensagem: "Cadastro não localizado." };
      var mudou = p.situacao === "mudou-se";
      c.situacao = mudou ? "mudou-se" : "";
      c.logs = ["[" + agoraBr() + "] " + (mudou ? "Marcado como \"mudou-se\"" : "Cadastro reativado") + " (pela administração: " + EMAIL_DEMO + ")"].concat(c.logs || []);
      registrarHistorico({ tipo: mudou ? "mudou-se" : "reativação", apto: c.apto, nome: c.nome, cadastroTipo: c.tipo, autor: EMAIL_DEMO, detalhe: "" });
      salvar();
      return { sucesso: true, mensagem: mudou ? "Cadastro marcado como \"mudou-se\"." : "Cadastro reativado." };
    },
    fbBuscarTexto: function(p) {
      var termo = String(p.termo || "").trim().toLowerCase();
      if (termo.length < 2) return { sucesso: false, mensagem: "Digite ao menos 2 caracteres para buscar.", resultados: [] };
      var rotulos = { tipo: "Tipo", nome: "Nome", cpf: "CPF", celular: "Celular", telFixo: "Telefone", email: "E-mail",
        inqPropAdmin: "Proprietário/Administradora", inqContato: "Contato locação", observacoes: "Observações" };
      var rotulosGrupo = { emergencias: "Emergência", ocupantes: "Ocupante", carros: "Carro", motos: "Moto", bikes: "Bicicleta", pets: "Pet", prestadores: "Prestador" };
      var cadastros = cadastrosValidos(), resultados = [];
      cadastros.forEach(function(c) {
        var achados = [];
        Object.keys(rotulos).forEach(function(k) { var v = String(c[k] || ""); if (v.toLowerCase().indexOf(termo) !== -1) achados.push(rotulos[k] + ": " + v); });
        var g = grupos(c);
        Object.keys(rotulosGrupo).forEach(function(k) {
          g[k].forEach(function(it) {
            var valores = Object.keys(it).map(function(x) { return it[x]; }).filter(Boolean);
            if (valores.join(" ").toLowerCase().indexOf(termo) !== -1) achados.push(rotulosGrupo[k] + ": " + valores.join(", "));
          });
        });
        if (achados.length) resultados.push({ apto: c.apto, ocorrencia: c._id, id: c._id, label: label(c.apto, c, doApto(cadastros, c.apto).length), achados: achados.slice(0, 8) });
      });
      return { sucesso: true, resultados: resultados };
    },
    fbListarHistorico: function(p) { return { sucesso: true, itens: carregar().historico.slice(0, Math.min(parseInt(p.limite, 10) || 10, 50)) }; },
    fbExcluirHistorico: function(p) {
      var d = carregar();
      d.historico = d.historico.filter(function(h) { return h._id !== p.id; });
      salvar();
      return { sucesso: true };
    },
    fbObterContadores: function() {
      var c = carregar().contadores || {};
      return { sucesso: true, contadorPendencias: c.contadorPendencias == null ? null : c.contadorPendencias,
        contadorAprovacoes: c.contadorAprovacoes == null ? null : c.contadorAprovacoes, contadorHistorico: c.contadorHistorico == null ? null : c.contadorHistorico };
    },
    fbSalvarContador: function(p) { carregar().contadores[p.nome] = Math.max(0, parseInt(p.total, 10) || 0); salvar(); return { sucesso: true }; },
    fbObterMembros: function() {
      var papel = papelAtual(), d = carregar();
      return { sucesso: true, membros: clonar(d.membros), configurado: true, papel: papel, indice: papel === "conselho" ? 0 : null, nomePapel: NOMES_PAPEIS[papel],
        candidatos: cadastrosValidos().filter(ativo).map(function(c) {
          return { id: c._id, apto: String(c.apto), nome: c.nome || "", tipo: c.tipo || "", celular: c.celular || c.telFixo || "", email: String(c.email || "").toLowerCase() };
        }) };
    },
    fbSalvarMembros: function(p) { carregar().membros = clonar(p.membros); salvar(); return ROTAS.fbObterMembros(); },
    fbObterAutorizacoes: function() {
      var papel = papelAtual(), editaveis = colunasEditaveis(papel);
      return { sucesso: true, permissoes: autorizacoes(), linhas: LINHAS_AUTORIZACAO, cargos: CARGOS, fixas: PERMISSOES_FIXAS,
        podeEditar: ["condominio", "sindico", "desenvolvedor"].indexOf(papel) !== -1,
        colunasTravadas: CARGOS.filter(function(c) { return editaveis.indexOf(c) === -1; }) };
    },
    fbSalvarAutorizacoes: function(p) { carregar().autorizacoes = clonar(p.permissoes || {}); salvar(); return ROTAS.fbObterAutorizacoes(); },
    fbObterNotificacoes: function() { return respostaNotificacoes(); },
    fbSalvarNotificacoes: function(p) {
      var pedido = p.destinatarios, r = {};
      if (Array.isArray(pedido)) pedido.forEach(function(e) { r[String(e).toLowerCase()] = { resumo: true, bloqueio: true, exclusao: true, aprovacao: true }; });
      else if (pedido) Object.keys(pedido).forEach(function(e) { r[String(e).toLowerCase()] = pedido[e]; });
      carregar().notificacoes = r; salvar();
      return respostaNotificacoes();
    },
    fbListarPendencias: function() { return { sucesso: true, grupos: pendencias() }; },
    fbIgnorarPendencia: function(p) {
      var d = carregar(), lista = d.pendenciasIgnoradas = d.pendenciasIgnoradas || [];
      var i = lista.indexOf(p.chave);
      if (p.ignorar && i === -1) lista.push(p.chave);
      if (!p.ignorar && i !== -1) lista.splice(i, 1);
      salvar();
      return { sucesso: true };
    },
    fbListarAprovacoes: function() {
      var papel = papelAtual();
      return { sucesso: true, podeAprovar: !!permissoesDoPapel(papel).aprovar,
        itens: carregar().cadastros.filter(function(c) { return c.aprovacao === "pendente"; }).map(function(c) {
          var g = dadosCadastro(c);
          return { id: c._id, apto: c.apto, tipo: c.tipo, moraNoImovel: moraNoImovel(c), nome: c.nome, cpf: c.cpf, nasc: c.nasc,
            rg: [c.rg, c.orgaoEmissor].filter(Boolean).join(" — "), celular: c.celular, telFixo: c.telFixo, email: c.email,
            inqPropAdmin: c.inqPropAdmin, inqContato: c.inqContato, inqVigencia: c.inqVigencia, contratos: [],
            vagaNumeroAndar: c.vagaNumeroAndar, vagaSituacao: c.vagaSituacao, vagaAptoRelacionado: c.vagaAptoRelacionado,
            observacoes: c.observacoes, enviadoEm: c.criadoEm,
            grupos: { emergencias: g.emergencias, ocupantes: g.ocupantes, carros: g.carros, motos: g.motos, bikes: g.bikes, pets: g.pets, prestadores: g.prestadores } };
        }) };
    },
    fbDecidirAprovacao: function(p) {
      var d = carregar(), c = d.cadastros.filter(function(x) { return x._id === p.id; })[0];
      if (!c || c.aprovacao !== "pendente") return { sucesso: false, mensagem: "Cadastro não encontrado. Recarregue a página." };
      if (p.decisao === "aprovar") {
        c.aprovacao = "";
        registrarHistorico({ tipo: "criação", apto: c.apto, nome: c.nome, cadastroTipo: c.tipo, autor: "Próprio morador (formulário)", detalhe: "Aprovado por " + EMAIL_DEMO });
        salvar();
        return { sucesso: true, mensagem: "Cadastro aprovado. Na demonstração nenhum e-mail é enviado." };
      }
      if (!String(p.motivo || "").trim()) return { sucesso: false, mensagem: "Informe o motivo da rejeição." };
      c.aprovacao = "rejeitado"; c.aprovacaoMotivo = p.motivo;
      salvar();
      return { sucesso: true, emailEnviado: false, mensagem: "Cadastro rejeitado. Na demonstração nenhum e-mail é enviado." };
    },
    fbListarBloqueios: function() {
      var todos = carregar().bloqueios.map(function(b) { return Object.assign({ id: b._id }, b); });
      return { sucesso: true, ativos: todos.filter(function(b) { return b.ativo; }), historico: todos.filter(function(b) { return !b.ativo; }) };
    },
    fbDesbloquear: function(p) {
      var b = carregar().bloqueios.filter(function(x) { return x._id === p.id; })[0];
      if (!b) return { sucesso: false, mensagem: "Bloqueio não encontrado." };
      b.ativo = false; b.desbloqueadoEm = new Date().toISOString(); b.desbloqueadoPor = EMAIL_DEMO;
      salvar();
      return ROTAS.fbListarBloqueios();
    },
    fbEstatisticas: function() { return estatisticas(); },
    fbSalvarGabarito: function(p) {
      var d = carregar(), porApto = {};
      (p.linhas || []).forEach(function(l) {
        var apto = String(l.apto || "").trim(), garagem = String(l.garagem || "").trim().toUpperCase(), vaga = String(l.vaga || "").trim();
        if (!apto || !garagem || !vaga) return;
        (porApto[apto] = porApto[apto] || { garagem: garagem, vagas: [] }).vagas.push(vaga);
      });
      var alterados = 0;
      listaAptos().forEach(function(apto) {
        var g = porApto[apto], atual = d.gabarito.filter(function(x) { return x._id === apto; })[0];
        var novo = g ? { andar: g.garagem, vaga: g.vagas.length > 1 ? g.vagas.slice(0, -1).join(", ") + " e " + g.vagas[g.vagas.length - 1] : g.vagas[0] } : { andar: "", vaga: "" };
        if (!atual) { atual = { _id: apto, andar: "", vaga: "" }; d.gabarito.push(atual); }
        if (atual.andar !== novo.andar || atual.vaga !== novo.vaga) { atual.andar = novo.andar; atual.vaga = novo.vaga; alterados++; }
      });
      if (alterados) registrarHistorico({ tipo: "gabarito", apto: alterados + " aptos", nome: "Gabarito de vagas", autor: EMAIL_DEMO, detalhe: "" });
      salvar();
      return alterados ? { sucesso: true, alterados: alterados, mudancas: [] } : { sucesso: true, alterados: 0, mensagem: "Nada mudou no gabarito." };
    },
    fbSituacaoRelatorios: function() {
      var vazio = { existe: false, nome: "", url: "", criadoEm: "", datado: false };
      return { sucesso: true, ultimaAlteracaoEm: "", verificadoEm: "", atualizando: false, contatos: vazio, veiculos: vazio };
    },
    fbAbrirKit: function(p) {
      var r = consultarPorCpf(p.cpf, p.nascimento);
      if (!r.encontrado) return r;
      return { encontrado: true, nome: r.dados.nome.split(" ")[0], nomeCompleto: r.dados.nome, apto: r.dados.apto, email: r.dados.email,
        principais: [], secoes: [], lidoEm: new Date().toISOString(), sessaoKit: "demo" };
    },
    fbAtualizarKit: function() { return { sucesso: true, principais: [], secoes: [], lidoEm: new Date().toISOString() }; },
    fbArquivoKit: function() { return { sucesso: false, mensagem: MSG_INDISPONIVEL }; }
  };

  // Rotas sem equivalente na demonstração (PDFs, planilha): respondem com aviso, sem quebrar a tela.
  var SEM_DEMO = ["fbGerarRelatorioApartamentos", "fbGerarRelatorioApartamentosPdfDrive", "fbGerarListaVeiculosPdfDrive",
    "gerarRelatorioApartamentos", "gerarRelatorioApartamentosPdfDrive", "buscarDadosPorCpfESeguranca", "buscarDadosPorApartamentoSimples",
    "listarApartamentosParaAdminSimples", "buscarTextoNaPlanilha", "excluirCadastroPorApartamentoSimples", "obterApartamentosGabaritoVagas", "obterTodoGabaritoVagas"];

  function chamarDemo(funcao, payload) {
    var rota = ROTAS[funcao];
    var resposta;
    try {
      resposta = rota ? rota(payload || {}) : { sucesso: false, encontrado: false, mensagem: MSG_INDISPONIVEL };
    } catch (e) {
      resposta = { sucesso: false, encontrado: false, mensagem: "Erro na demonstração: " + e.message };
    }
    if (!rota && SEM_DEMO.indexOf(funcao) === -1 && window.console) console.warn("[demo] rota sem simulação: " + funcao);
    // Pequena espera para a interface se comportar como com um servidor de verdade (carregando, etc.).
    return new Promise(function(resolve) { setTimeout(function() { resolve(clonar(resposta)); }, 150); });
  }

  window.Backend.chamar = chamarDemo;
  window.DemoBackend = {
    restaurar: function() { memoria = dadosIniciais(); salvar(); }
  };

  // Faixa no rodapé avisando que é demonstração, com o botão para voltar aos dados iniciais.
  // Os estilos vão junto (e os do login simulado do admin), para nenhuma página precisar de CSS extra.
  function montarFaixaDemo() {
    var estilo = document.createElement("style");
    estilo.textContent =
      ".faixa-demo{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:center;" +
      "padding:6px 16px;background:#243447;color:#fff;font:13px/1.4 Arial,Helvetica,sans-serif;text-align:center}" +
      ".faixa-demo button{border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;border-radius:999px;padding:3px 12px;font:inherit;cursor:pointer}" +
      ".faixa-demo button:hover{background:rgba(255,255,255,.15)}" +
      "body{padding-bottom:44px}" +
      "#googleLoginButton{display:flex;flex-direction:column;align-items:center;gap:8px}" +
      ".demo-login-cargo{min-width:220px;padding:8px 10px;border-radius:8px;border:1px solid #c5ced8;font:inherit}" +
      ".btn-entrar-demo{min-width:220px;padding:10px 18px;border-radius:999px;border:0;background:#243447;color:#fff;font:inherit;font-weight:bold;cursor:pointer}";
    document.head.appendChild(estilo);
    var faixa = document.createElement("div");
    faixa.className = "faixa-demo";
    faixa.innerHTML = "<span>Demonstração com dados fictícios: o que você grava fica só neste navegador.</span>" +
      '<button type="button">Restaurar dados da demonstração</button>';
    faixa.querySelector("button").addEventListener("click", function() {
      if (!confirm("Voltar todos os dados da demonstração ao estado inicial?")) return;
      window.DemoBackend.restaurar();
      location.reload();
    });
    document.body.appendChild(faixa);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarFaixaDemo);
  else montarFaixaDemo();

  // Links de arquivos que não existem na demonstração (pastas do Drive, plantas em PDF, etc.).
  document.addEventListener("click", function(e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href="#demo-arquivo"]') : null;
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    alert("Na demonstração os arquivos não estão disponíveis.");
  }, true);
})();
