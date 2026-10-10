// ==========================================
// FIREBASE REPOSITORY
// ==========================================
// O navegador NÃO fala diretamente com o Firestore (evita expor dados sem Firebase Auth).
// Em vez disso, chama o mesmo backend Apps Script (WEB_APP_URL) com o mesmo token de admin
// já usado pelo GoogleSheetsRepository — o Apps Script é quem acessa o Firestore, usando uma
// service account guardada só nas Propriedades do Script (nunca no código-fonte/frontend).
//
// Leitura, escrita e exclusão de cadastros, gabarito, busca geral e relatórios em PDF
// já implementados no Firestore. O upload do contrato em PDF continua indo para o Google
// Drive (independente da planilha) — só o link fica salvo no documento do Firestore.
(function() {
  function chamarBackend(funcao, payloadExtra, protegido) {
    return window.Backend.chamar(funcao, payloadExtra, protegido, "Firebase");
  }

  window.FirebaseRepository = {
    nome: "firebase",

    // Reflete apenas se o frontend está pronto para tentar o Firebase; a checagem real das
    // credenciais (Propriedades do Script) acontece no backend a cada chamada fb*.
    isConfigured: function() {
      return true;
    },

    // ---- Leitura (implementadas no Firestore) ----
    listarApartamentos: function() {
      return chamarBackend("fbListarApartamentos", {}, true);
    },
    // "ocorrencia" identifica qual cadastro abrir quando o apartamento tem mais de um.
    obterMoradorPorApto: function(apto, ocorrencia) {
      return chamarBackend("fbObterMoradorPorApto", { apto: apto, ocorrencia: ocorrencia }, true);
    },
    obterMoradorPorCpf: function(cpf, nascimento) {
      return chamarBackend("fbObterMoradorPorCpf", { cpf: cpf, nascimento: nascimento }, false);
    },
    // Cadastro protegido por código por e-mail (codigoAcesso.gs).
    confirmarCodigoCpf: function(cpf, nascimento, codigo) {
      return chamarBackend("fbConfirmarCodigoCpf", { cpf: cpf, nascimento: nascimento, codigo: codigo }, false);
    },
    desativarCodigo: function(id) {
      return chamarBackend("fbDesativarCodigo", { id: id }, true);
    },
    obterApartamentosGabarito: function() {
      return chamarBackend("fbObterApartamentosGabarito", {}, false);
    },
    obterGabaritoVagasCompleto: function() {
      return chamarBackend("fbObterGabaritoVagasCompleto", {}, false);
    },
    buscarTexto: function(termo) {
      return chamarBackend("fbBuscarTexto", { termo: termo }, true);
    },
    gerarRelatorioApartamentos: function() {
      return chamarBackend("fbGerarRelatorioApartamentos", {}, true);
    },
    gerarRelatorioApartamentosPdfDrive: function() {
      return chamarBackend("fbGerarRelatorioApartamentosPdfDrive", {}, true);
    },
    // Últimas criações/edições/exclusões (mais recente primeiro).
    listarHistorico: function(limite) {
      return chamarBackend("fbListarHistorico", { limite: limite }, true);
    },
    // Números das bolinhas do menu (guardados no servidor, só os que o usuário pode ver).
    obterContadores: function() {
      return chamarBackend("fbObterContadores", {}, true);
    },
    salvarContador: function(nome, total) {
      return chamarBackend("fbSalvarContador", { nome: nome, total: total }, true);
    },
    // Membros da administração (quem acessa a área restrita e com qual papel).
    obterMembros: function() {
      return chamarBackend("fbObterMembros", {}, true);
    },
    salvarMembros: function(membros) {
      return chamarBackend("fbSalvarMembros", { membros: membros }, true);
    },
    // CPFs bloqueados após 5 tentativas erradas (e o histórico) e o desbloqueio pela administração.
    // Cadastros novos aguardando aprovação (aprovacao.gs).
    // Perfil dos moradores (idade e gênero) para a página "Dados".
    estatisticas: function() {
      return chamarBackend("fbEstatisticas", {}, true);
    },
    listarAprovacoes: function() {
      return chamarBackend("fbListarAprovacoes", {}, true);
    },
    decidirAprovacao: function(id, decisao, motivo) {
      return chamarBackend("fbDecidirAprovacao", { id: id, decisao: decisao, motivo: motivo || "" }, true);
    },
    listarBloqueios: function() {
      return chamarBackend("fbListarBloqueios", {}, true);
    },
    desbloquearCpf: function(id) {
      return chamarBackend("fbDesbloquear", { id: id }, true);
    },
    // Quem recebe o e-mail com as alterações cadastrais.
    obterNotificacoes: function() {
      return chamarBackend("fbObterNotificacoes", {}, true);
    },
    salvarNotificacoes: function(destinatarios) {
      return chamarBackend("fbSalvarNotificacoes", { destinatarios: destinatarios }, true);
    },
    // O que precisa de atenção na base (aptos sem cadastro, contratos vencendo, dados faltando...).
    ignorarPendencia: function(chave, ignorar) {
      return chamarBackend("fbIgnorarPendencia", { chave: chave, ignorar: !!ignorar }, true);
    },
    listarPendencias: function() {
      return chamarBackend("fbListarPendencias", {}, true);
    },
    gerarListaVeiculosPdfDrive: function() {
      return chamarBackend("fbGerarListaVeiculosPdfDrive", {}, true);
    },
    // Último PDF gerado de cada relatório e se ele está desatualizado ("datado").
    situacaoRelatorios: function() {
      return chamarBackend("fbSituacaoRelatorios", {}, true);
    },

    // ---- Escrita ----
    // "ocorrencia" evita excluir o cadastro errado quando o apartamento tem mais de um.
    excluirCadastro: function(apto, ocorrencia) {
      return chamarBackend("fbExcluirCadastro", { apto: apto, ocorrencia: ocorrencia }, true);
    },
    // Novo cadastro, ou atualização com dados.cadastroId + dados.credencialCpf/credencialNasc.
    salvarCadastro: function(dados) {
      return chamarBackend("fbSalvarCadastro", { dados: dados }, false);
    },
    // Edição de um cadastro existente pela administração (exige o login do admin).
    salvarCadastroAdmin: function(dados) {
      return chamarBackend("fbAdminSalvarCadastro", { dados: dados }, true);
    },
    // Grava o gabarito de vagas (Firestore + aba "Gabarito" da planilha). Só administração.
    salvarGabarito: function(linhas) {
      return chamarBackend("fbSalvarGabarito", { linhas: linhas }, true);
    },
    // Apaga uma entrada das "Últimas alterações cadastrais" (só administração).
    excluirHistorico: function(id) {
      return chamarBackend("fbExcluirHistorico", { id: id }, true);
    },
    // situacao: "mudou-se" ou "ativo" (só administração).
    definirSituacaoCadastro: function(apto, ocorrencia, situacao) {
      return chamarBackend("fbDefinirSituacaoCadastro", { apto: apto, ocorrencia: ocorrencia, situacao: situacao }, true);
    },

    // Usado pelo botão "Testar conexões" do admin, sem alterar a fonte selecionada.
    testarConexao: function() {
      return chamarBackend("fbTestarConexao", {}, false);
    }
  };
})();
