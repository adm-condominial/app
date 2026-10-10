// CONFIGURAÇÕES GLOBAIS E REGRAS DE VALIDAÇÃO ESTRUTURADAS

// ==========================================
// MODO DEMONSTRAÇÃO
// ==========================================
// Enquanto o produto não tem backend próprio, todas as rotas são respondidas no próprio navegador
// por js/data/backend-demo.js, com dados fictícios guardados no localStorage de quem abre a
// página. Nada sai do navegador e nenhum e-mail é enviado.
const MODO_DEMO = true;

// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================
// Endereço do backend. No modo demonstração não é usado (o backend-demo.js responde antes).
const WEB_APP_URL = "demo";

// ==========================================
// CONFIGURAÇÃO DE ACESSO ADMIN (GOOGLE LOGIN)
// ==========================================
const ADMIN_AUTH_CONFIG = {
  // Client ID do Google Cloud (OAuth 2.0 Web). Vazio no modo demonstração: o login é simulado
  // pelo botão "Entrar na demonstração" (js/admin-auth.js).
  googleClientId: ""
};

// ==========================================
// REGRAS OBRIGATÓRIAS E ORDENAÇÃO
// ==========================================
const REGRAS_OBRIGATORIAS = [
  { id: "apto", nome: "Apartamento" },
  { id: "tipoResidente", nome: "Identificação do imóvel" },
  { id: "moraNoImovel", nome: "Mora no imóvel?" }, // só aparece (e só é exigido) para proprietário
  { id: "moradorNome", nome: "Nome" },
  { id: "moradorNasc", nome: "Data de nascimento" },
  { id: "moradorCpf", nome: "CPF" },
  // { id: "moradorRg", nome: "RG" },
  // { id: "moradorOrgaoEmissor", nome: "Órgão emissor" },
  { id: "moradorCelular", nome: "Celular" },
  // { id: "moradorTel", nome: "Telefone fixo" },
  // { id: "moradorEmail", nome: "E-mail" },
  { id: "vagaSituacao", nome: "Situação da vaga" },
  { id: "vagaAptoRelacionado", nome: "Apartamento envolvido (Vaga de garagem)" },
  // { id: "arquivoContrato", nome: "Contrato de locação" },
  { id: "declaracao", nome: "Declaro que as informações prestadas são verdadeiras", tipo: "checkbox" }
];

const ORDEM_DESEJADA = [
  "Apartamento",
  "Identificação do imóvel",
  "Mora no imóvel?",
  "Nome",
  "Data de nascimento",
  "CPF",
  // "RG",
  // "Órgão emissor",
  "Celular",
  // "Telefone fixo",
  // "E-mail",
  "Situação da vaga",
  "Apartamento envolvido (Vaga de garagem)",
  "Proprietário / Administradora",
  "Contato do proprietário / imobiliária",
  "Vigência do contrato",
  // "Contrato de locação",
  "Caso de emergência",
  "Demais ocupantes",
  "Carros",
  "Motos",
  "Bicicletas",
  "Pets",
  "Prestador",
  "Declaro que as informações prestadas são verdadeiras"
];
