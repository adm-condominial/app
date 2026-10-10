# Diagnóstico: do Souza Franco para um produto

Data: 10/10/2026. Escopo lido: este repositório (front, GitHub Pages) e `../cadastro-moradores-backend-private` (Apps Script, `src/*.gs`, e `mapas-garagem/`). Nenhum código foi alterado.

Legenda de classificação: **N** = Núcleo · **C** = Configurável · **O** = Módulo opcional · **P** = Particularidade do condomínio original.

Observações gerais antes da lista:

- **Telegram:** não há nenhuma integração com Telegram no código atual (nem front, nem `.gs`).
- **Planilha:** hoje ela é espelho/contingência do Firestore (`firestoreSincronizarPlanilhaOriginal`), com abas `Geral` e `Gabarito` e layout por linha fixa (`MAPA_GERAL`, `FS_GRUPOS_SHEET_CONFIG`, `FS_LINHA_INICIAL_LOGS = 20`).
- **Segredos** (chave da service account do Firestore) já estão em Script Properties, não no código. Isso é o modelo certo a seguir para o resto da configuração.
- O ponto mais forte de acoplamento não é texto, é **o modelo de unidade**: o número do apartamento é usado como chave, como andar (`centena`) e como critério de "loja" (`sem dígitos = loja`).

---

## 1. Estrutura física

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 1.1 | Lista de unidades gerada por laço `andar 2..8 × pos 1..6` + `"901"` | `js/ui-formulario.js:79,148`; `js/admin-simples.js:14`; `consultaService.gs:145,248`; `firestoreRepository.gs:282` | P | Unidades vêm de uma coleção `unidades` gerada pelo assistente de configuração. Remover todos os fallbacks fixos (no máximo "lista vazia + aviso"). |
| 1.2 | Lista real de aptos = IDs da coleção `gabarito` (ou aba `Gabarito`) | `firestoreRepository.gs:250-292`, `consultaService.gs:848` | N (mecanismo) / P (dados) | Separar "unidade" de "vaga": hoje o gabarito de vagas é também o cadastro de unidades. |
| 1.3 | Andar deduzido do número (`Math.floor(n/100)`) | `consultaService.gs:502` | P | Unidade com atributos explícitos: `agrupamento` (bloco/torre/andar/ala), `ordem`, `rotulo`. |
| 1.4 | "Loja" = unidade cujo número não tem dígitos (`fsNumeroApto(a) === 0`) | `consultaService.gs:491,499` | P | Campo `tipo` na unidade (apartamento, loja, sala, casa, box…), com rótulos configuráveis. |
| 1.5 | Ordenação por `parseInt` do apto | `fsOrdenarCadastros`, `fsNumeroApto` (`firestoreRepository.gs`) | C | Ordenar por `unidade.ordem` definida na configuração. |
| 1.6 | Duas garagens fixas `G1`/`G2` | `js/mapa-vaga.js:9`, `js/vaga-miniatura.js:10`, `js/admin-gabarito.js:14,28`, `admin.html:303-315` | P | Lista de `garagens` na configuração (0..n). |
| 1.7 | Vaga dupla `"1/2"` do G2 tratada com `if` | `js/admin-gabarito.js:83,182`, `js/mapa-vaga.js:66-69`, `js/vaga-miniatura.js:51`, `relatorios.gs` (`separarVagasDoGabarito`) | P | Vaga com lista de `apelidos`/números agregados no cadastro da vaga. |
| 1.8 | Geometria das plantas (`MAPAS_GARAGEM`, pilares, rampas, "TANQUES", "LIXO", notas de vagas do condomínio) | `mapaGaragem.gs:12`; `mapas/*.svg`; `mapas-garagem/gerar-mapas.js`, `vagas-garagem.json` | P / O | Módulo "Mapa da garagem": SVG enviado por condomínio com convenção `id="vaga-<garagem>-<n>"`; notas como texto da configuração. |
| 1.9 | Vagas do condomínio / desativadas marcadas no desenho | `MAPAS_GARAGEM` (`condominio:true`, `desativada:true`) | C | Atributos da vaga no cadastro de vagas, não no desenho. |
| 1.10 | "Sistema guarda uma garagem por apartamento" | `js/admin-gabarito.js:107`, `vagaNumeroAndar = "14 / G1"` (string) | P (limitação) | Relação `unidade ↔ vaga` N:N com objetos `{garagem, vaga}`, não string concatenada. |
| 1.11 | Aluguel de vaga só entre moradores ("Minha vaga está alugada para" / "Alugo vaga do") | `index.html:255-275`, `vagaSituacao`, `vagaAptoRelacionado` | O / C | Módulo "Garagem" com opção "permitir aluguel entre unidades". |
| 1.12 | Bicicletário (substituiu a vaga 8) | notas do mapa | P | Texto da configuração do mapa. |

## 2. Administração e permissões

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 2.1 | Cargos fixos `condominio, sindico, administradora, conselho, desenvolvedor` | `autorizacoes.gs:12`; `membros.gs` (estrutura do doc `config/membros`); `js/admin-autorizacoes.js:12-13`; `js/admin-membros.js` | C | Coleção `cargos` configurável: `{id, nome, nomeCurto, multiplo, vinculadoAMorador, ordem}`. |
| 2.2 | Conselho começa com 3 vagas; máx. 10; rótulos "Conselho 1/2/3" | `membros.gs:24,28`; `notificacoes.gs:38`; `js/admin-membros.js:21` | C | `cargo.maxMembros` configurável; rótulo "<cargo> — membro n". |
| 2.3 | Hierarquia de quem edita quem (Dev → todos; Condomínio → Síndico/Conselho/Adm.; Síndico → Conselho/Adm.) | `autorizacoes.gs:57-63,160-175`; texto de ajuda em `js/admin-autorizacoes.js:58-62` | C | Campo `cargo.podeGerenciar: [ids]`. Texto de ajuda gerado a partir disso. |
| 2.4 | "Desenvolvedor tem tudo, sempre" | `autorizacoes.gs:57` | N (renomear) | Virar papel técnico **Suporte/Operador do produto**, fora dos cargos do condomínio. |
| 2.5 | Conselho sempre vê/escreve em Membros e Notificações (só o que é dele) | `PERMISSOES_FIXAS` em `autorizacoes.gs:60` | C | Permissão "editar apenas o próprio registro" como flag por cargo. |
| 2.6 | Matriz padrão de permissões (`padrao: [true,false,true,true]` por posição de cargo) | `autorizacoes.gs:17-38` | C | Padrões por `cargo.id` (não por posição do array). |
| 2.7 | Checagens de papel espalhadas no front (`papel === "sindico" || ...`) | `js/admin-fonte-dados.js:40`; `js/admin-membros.js:27,54-56`; `js/sessao-admin-morador.js:88`; `js/barra-acoes.js:58-64`; aviso fixo em `admin.html:45` | C | Front só pergunta ao backend "posso X?" (`permissoes[]`); nenhum nome de cargo no código. |
| 2.8 | `CARGOS_GESTAO = ["Síndico","Condomínio","Desenvolvedor"]` decidem quem recebe exclusão/aprovação | `notificacoes.gs:51` | C | Derivar da permissão `aprovar`/`editarCadastros`. |
| 2.9 | Aprovação: Síndico, Condomínio e Dev aprovam; Conselho só vê | `aprovacao.gs:9-10`, `js/admin-aprovacoes.js:5-6` | C | Já existe permissão `aprovar`; falta remover a regra dos comentários/textos e do código que a assume. |
| 2.10 | Lista inicial de 5 e-mails pessoais com acesso total | `utils.gs:13` (`ADMIN_ALLOWED_EMAILS`), `notificacoes.gs:14` (`EMAILS_NOTIFICACAO_PADRAO`) | P | Primeiro administrador definido no assistente de instalação; nunca no código. |
| 2.11 | "Administradora" e "Condomínio" sem cadastro de morador | `js/sessao-admin-morador.js:88`, `membros.gs` | C | `cargo.vinculadoAMorador: false`. |
| 2.12 | Lista de rotas protegidas e mapa rota → permissão | `main.gs:20-55`, `autorizacoes.gs:66+` | N | Manter; gerar a partir de um registro único de rotas (rota, permissão, módulo). |

## 3. Cadastro de moradores

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 3.1 | Cadastro por unidade, consulta pública por CPF + nascimento, código por e-mail, histórico, "mudou-se" | `firestoreRepository.gs`, `codigoAcesso.gs`, `js/sessao-morador.js` | N | Manter. |
| 3.2 | Tipos de vínculo só `Proprietário` / `Inquilino` | `index.html:113-115` | C | Lista configurável (proprietário, inquilino, usufrutuário, comodatário, funcionário residente…). |
| 3.3 | "Mora no imóvel?" com 3 opções fixas, só para proprietário | `index.html:120-123`, `FS_OPCOES_MORA_NO_IMOVEL` | C | Opções e regra de exibição na configuração do vínculo. |
| 3.4 | Campos de inquilino (Proprietário/Administradora, contato, vigência, contrato) | `index.html:201-204`, `FS_ROTULOS_CAMPOS_PRINCIPAIS` | C | Campos condicionais ligados ao vínculo. |
| 3.5 | Obrigatórios e ordem de campos (RG, telefone fixo, e-mail, contrato comentados) | `js/regras.js:22-66` | C | Esquema de formulário na configuração: campo, visível, obrigatório, ordem. |
| 3.6 | Grupos fixos: emergências, ocupantes, carros, motos, bikes, pets, prestadores (e seus subcampos) | `FS_GRUPOS_CAMPOS` (`firestoreRepository.gs:26`), `index.html`, `js/envio-form.js` | N (mecanismo) / C | Grupos habilitáveis; veículos e pets como módulos. |
| 3.7 | Aprovação obrigatória de cadastro novo | `aprovacao.gs`, `firestoreRepository.gs:870` | C | `modulos.aprovacao.ativo`. |
| 3.8 | 5 tentativas / 15 min → bloqueio de CPF | `utils.gs:29-30` | C (com padrão seguro) | Parâmetros com limites mínimos. |
| 3.9 | Revisão anual (365 dias, 20 e-mails/dia, `DATA_INICIO_REVISAO = 2026-10-02`) | `revisaoAnual.gs:15-17` | O / P (data) | Módulo com período configurável; data de início = data da instalação. |
| 3.10 | Cadastro desatualizado em 12 meses | `pendencias.gs:8` | C | Parâmetro. |
| 3.11 | Estimativa de gênero por nome (listas de exceção) e faixas de idade | `estatisticas.gs` | O | Módulo "Perfil dos moradores"; desligado por padrão (é dado sensível estimado). |
| 3.12 | Rótulo de opção "402 - Maria (Inquilino)" com "Apto" fixo | `formatarLabelAptoFirestore`; "Apartamento" em vários `<label>` e `REGRAS_OBRIGATORIAS` | C | Usar o rótulo do tipo de unidade da configuração. |
| 3.13 | Texto "Por favor, registre... garagem ou bicicletário" e regras de visitante na vaga | `index.html:278-285` | P | Texto do módulo Garagem, editável. |
| 3.14 | Placeholder/campos dependentes de CPF (brasileiro) | `js/mascaras.js`, `js/validacoes-form.js` | N | Manter (produto para Brasil); documentar. |

## 4. Portaria e regras internas

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 4.1 | Visitante pode usar a vaga só enquanto estiver no prédio; uso pontual informado ao porteiro; uso recorrente exige cadastro | `index.html:280-285` | P | Bloco de texto "Regras da garagem" da configuração. |
| 4.2 | "Aluguel de vagas permitido exclusivamente entre moradores" | `index.html:~262` | P/C | Texto + flag do módulo Garagem. |
| 4.3 | Espaços excedentes cobrados (vagas 3, 12, 17) | notas em `MAPAS_GARAGEM` | P | Nota do mapa. |
| 4.4 | Horários de portaria, intervalos, entregadores, cargas, mudanças | **não encontrados no código**; provavelmente estão nos PDFs da pasta do Kit no Drive | P | Ficam como documentos do Kit, nunca no núcleo. |
| 4.5 | Prestadores com campo "chave" (tem chave do apto) | `FS_GRUPOS_CAMPOS.prestadores` | C | Subcampos do grupo configuráveis. |

## 5. Relatórios e PDFs

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 5.1 | Paginação "1ª folha = lojas + 2º e 3º andares; depois 3 andares por folha" | `consultaService.gs:496-600` | P | Paginação por `agrupamento` configurado (ex.: 1 bloco por folha, ou N andares por folha). |
| 5.2 | Títulos "4º, 5º e 6º andares", "Lojas", "Apartamento/Loja sem cadastro" | `consultaService.gs:491,522-526,641-644` | P | Rótulos dos agrupamentos e tipos de unidade. |
| 5.3 | Cabeçalho `<h1>Condomínio Souza Franco</h1>` | `consultaService.gs:702`, `cadastroPdf.gs:180` | C | `identidade.nome` + logo. |
| 5.4 | Lista de veículos + mapa G1/G2 nas páginas finais | `relatorios.gs`, `mapaGaragem.gs` | O | Módulo Garagem; sem mapa → só a tabela. |
| 5.5 | Ficha individual em PDF com mapa e vaga | `cadastroPdf.gs` | N (ficha) / O (mapa) | Manter; mapa só se o módulo existir. |
| 5.6 | Pastas por nome fixo ao lado da planilha ("Relatório de contatos", "Relatório de veículos", "Cadastros/Apto 606") | `relatorios.gs:14-15`, `cadastroPdf.gs:16`, `obterPastaDeRelatorios` | C | Estrutura de pastas criada pelo instalador, IDs guardados na configuração. |
| 5.7 | Backup: nome `..._Cadastro de moradores_SF` ("SF" = Souza Franco) | `firestoreRepository.gs:1199` | P | Prefixo derivado de `identidade.sigla`. |
| 5.8 | Versões de layout (`VERSAO_LAYOUT_RELATORIOS`) | `relatorios.gs` | N | Manter. |
| 5.9 | Cores de veículo (`CORES_VEICULO`) | `mapaGaragem.gs` | N | Manter. |

## 6. Notificações e e-mails

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 6.1 | Remetente "Cadastro de moradores Cond. Souza Franco" (≥7 lugares) | `aprovacao.gs:144,230`, `bloqueios.gs:130`, `cadastroPdf.gs:111`, `codigoAcesso.gs:48`, etc. | C | Uma função `enviarEmail()` central lendo `identidade.nomeRemetente`. |
| 6.2 | Rodapé "E-mail automático do cadastro de moradores do Condomínio Souza Franco" | idem | C | Template com variáveis. |
| 6.3 | `replyTo` e contato fixo `condominiosouzafranco@gmail.com` | `notificacoes.gs:164`, `formularioService.gs:4`, `bloqueios.gs:20`, `index.html:328`, `seguranca.html:243,356` | C | `identidade.emailContato`. |
| 6.4 | Tipos de aviso fixos: `resumo, bloqueio, exclusao, aprovacao` | `notificacoes.gs:49` | N (eventos) / C (quem recebe) | Registro de eventos do produto; destinatários por cargo/permissão. |
| 6.5 | Pré-visualizações dos e-mails escritas à mão no admin (com "Apto 703") | `admin.html:208-250` | C | Gerar a prévia a partir do mesmo template do backend. |
| 6.6 | Links fixos nos e-mails (formulário GitHub Pages, `tinyurl.com/kit-souzafranco`) | `cadastroPdf.gs:17,19`, `js/envio-form.js:674` | C | `instalacao.urlPublica`, `kit.url`. |
| 6.7 | Mensagens ao morador ("procure o síndico") | `bloqueios.gs:19-20` | C | Texto usa o cargo/contato configurado. |

## 7. Google Drive

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 7.1 | Pasta do Kit `1ZLt6ZQ…` | `kitBoasVindas.gs:14`, `kit.html:140` | O / C | `kit.pastaId` na configuração. |
| 7.2 | Pasta de contratos `1suzcg7…` | `firestoreRepository.gs:663`, `admin.html:94` | C | `drive.pastas.contratos`. |
| 7.3 | Links úteis do admin (fichas, planilha `1E3gMvc…`, backups, backups de relatórios/listas) | `admin.html:93-126` | C | Lista "Links úteis" gerada da configuração. |
| 7.4 | PDFs das plantas G1/G2 no Drive | `admin.html:303-304` | P | Arquivos do módulo Mapa. |
| 7.5 | Pasta-raiz = "pasta onde está a planilha" | `cadastroPdf.gs:51`, `relatorios.gs`, `consultaService.gs:730` | C | `drive.pastaRaizId` explícito. |
| 7.6 | Atalho `tinyurl.com/kit-souzafranco` reconhecido no código do popup | `js/popup-links.js:14`, `js/kit-acesso.js:12`, `index.html:74` | P | Popup reconhece `kit.url` da configuração. |
| 7.7 | Compartilhamento automático do Kit e da pasta de admin | `kitBoasVindas.gs`, `sincronizarCompartilhamentoPasta` | N (mecanismo) | Manter, parametrizado. |

## 8. Planilha / banco

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 8.1 | Abas `Geral`, `Gabarito`, linhas fixas (`MAPA_GERAL`, linha 6 = vaga "17 / G1", logs a partir da linha 20) | `consultaService.gs`, `firestoreRepository.gs:931-1062` | P (legado) | Na versão-base, planilha vira **exportação**, não fonte de dados. Modo `sheets` só no projeto original. |
| 8.2 | Coleções Firestore (`cadastros`, `historico`, `gabarito`, `config/*`, `bloqueiosAtivos`…) | vários | N | Manter, com prefixo de instalação (`condominios/{id}/…`) para futuro multi-cliente. |
| 8.3 | `FS_MODELO_ATUAL = 2` e migração de subcoleções antigas | `firestoreRepository.gs:23,398` | P (legado) | Não levar ao produto; começar no modelo atual. |
| 8.4 | IDs fixos: `WEB_APP_URL`, Google Client ID (front e `utils.gs:9`), `scriptId` do clasp | `js/regras.js:6,13`, `utils.gs:9`, `.clasp.json` | C | Arquivo `config/instalacao.js` (front) + Script Properties (backend). |
| 8.5 | Dados do gabarito (apto ↔ vaga) e `vagas-garagem.json` | Firestore `gabarito`, `mapas-garagem/` | P (dados) | Migrar como dados da instalação Souza Franco. |

## 9. Interface e páginas

| # | Particularidade | Onde | Classe | Como generalizar |
|---|---|---|---|---|
| 9.1 | Nome do condomínio em `<title>`, `<h1>`, rodapés | `index.html:6,65,324`, `kit.html:7,138,167`, `mapa-vaga.html:6,60`, `seguranca.html:120,359` | C | Preenchido via `window.Config.identidade`. |
| 9.2 | Favicons e manifest | `favicon/` | C | Logo enviado no assistente. |
| 9.3 | `seguranca.html` (documentação de privacidade/LGPD) | página inteira | N (com trechos C) | Manter; trocar nome/contato/controlador por variáveis. |
| 9.4 | `kit.html`, `mapa-vaga.html` | páginas | O | Só aparecem se o módulo estiver ativo. |
| 9.5 | Botões G1/G2 no admin | `admin.html:314-315` | P | Gerados da lista de garagens. |
| 9.6 | WhatsApp/Ligar com DDI 55 | `js/admin-simples.js:206` | N | Manter. |
| 9.7 | Regras "pétreas" de texto (`sem-conectivos.js`, sem reticências) | `js/sem-conectivos.js`, `CLAUDE.md` | N | Manter como padrão de qualidade do produto. |

---

## 10. Dependências entre os itens (o que puxa o quê)

1. **Modelo de unidade (1.1–1.5)** é a raiz. Dependem dele: formulário (select de apto), admin (consulta, busca), relatório de contatos (5.1, 5.2), pendências, aprovação, rótulos de e-mail, ficha PDF (pasta `Apto 606`).
2. **Modelo de vaga (1.6–1.10)** depende de unidade e alimenta: gabarito no admin, mapa da vaga, miniatura, lista de veículos, mapa no PDF, ficha individual.
3. **Cargos (2.1–2.3)** alimentam: autorizações, membros, notificações (6.4, 2.8), aprovação (2.9), compartilhamento do Drive/Kit (7.7) e a barra de ações do morador logado (2.11).
4. **Identidade (nome, contato, URL)** alimenta: todos os e-mails, PDFs, páginas, `seguranca.html`.
5. **Drive (7.x)** alimenta: relatórios, backups, contratos, Kit, links do admin.
6. **Planilha (8.1)** depende do modelo de unidade antigo e é o maior bloco de código legado (`consultaService.gs`, 1.029 linhas).

## 11. Riscos

| Risco | Onde aparece | Mitigação |
|---|---|---|
| Quebrar a produção ao "generalizar no lugar" | qualquer item | Regra do pedido: novo repositório; o atual só recebe correções. |
| Chave de unidade mudar (ex.: `"606"` → `"un_606"`) invalida cadastros, histórico, gabarito, pastas `Apto 606` | 1.x | Manter o **rótulo** como ID na migração do Souza Franco; IDs novos só para instalações novas. |
| Permissões trocadas de "posição no array" para "id do cargo" | 2.6 | Teste automatizado da matriz antes/depois com os 5 cargos atuais. |
| Plantas SVG com convenção implícita (`vaga-G2-1-2`) | 1.7–1.8 | Validador do SVG no upload (lista vagas encontradas × vagas cadastradas). |
| Apps Script tem cotas por conta (e-mails/dia, tempo de execução 6 min) | revisão anual, PDFs | Cada condomínio em conta/projeto próprio no início; parâmetros de cota na config. |
| Planilha como contingência some no produto | 8.1 | Manter o modo `sheets` só no projeto original; no produto, exportação. |
| Dados pessoais em fixtures/migração | 2.10, 8.5 | Seeds do produto só com dados fictícios; migração do SF fora do repositório do produto. |
| Texto de LGPD (`seguranca.html`) ficar genérico demais | 9.3 | Revisão jurídica do modelo; campos obrigatórios (controlador, contato). |

## 12. Arquitetura sugerida da versão genérica

```
produto/
  core/                     # sem nenhum nome de condomínio, cargo ou unidade
    front/  js/ (form, sessão, admin-base, popup, sem-conectivos, máscaras)
    backend/ *.gs (roteador, auth, firestore client, cadastros, histórico, bloqueio, e-mail central)
  modulos/                  # cada um com manifesto { id, rotas, permissões, páginas, eventos }
    aprovacao/  veiculos/  garagem/ (gabarito, mapa)  kit/  relatorios/
    revisao-anual/  perfil-moradores/  notificacoes/  drive-links/
  config/
    esquema.json            # validação da configuração
    padrao.json             # valores-padrão do produto
  instalador/               # assistente de configuração (identidade → estrutura → cargos → permissões → módulos → Drive → notificações)
  migracoes/                # scripts versionados de dados e de configuração
```

Separação **Configuração × Dados** no Firestore (preparada para multi-cliente desde já):

```
condominios/{id}/config/identidade      nome, sigla, endereço, logo, contato, url pública
condominios/{id}/config/estrutura       agrupamentos (árvore livre), tipos de unidade
condominios/{id}/config/cargos          [{id, nome, maxMembros, podeGerenciar, vinculadoAMorador}]
condominios/{id}/config/permissoes      {cargoId: {permissao: bool}}
condominios/{id}/config/modulos         {garagem: {ativo, aluguelEntreUnidades}, kit: {ativo, pastaId, url}, ...}
condominios/{id}/config/formulario      vínculos, campos, obrigatórios, ordem, textos
condominios/{id}/config/drive           pastaRaizId, pastas{}
condominios/{id}/config/notificacoes    {evento: {cargos[], canais[]}}
condominios/{id}/unidades/{id}          rotulo, tipo, caminho ["Bloco A","3º andar"], ordem
condominios/{id}/vagas/{id}             garagem, numero, apelidos[], unidadeDona, condominio, desativada
condominios/{id}/cadastros|historico|... (dados)
```

Estrutura flexível: em vez de `bloco → andar → apto`, uma **árvore de agrupamentos** de profundidade livre (0 níveis = casas numeradas; 1 nível = andares; 2 níveis = torre → andar). O gerador do assistente cria as unidades a partir de padrões ("andares 2–8, 6 por andar, rótulo `{andar}0{pos}`") e permite editar uma a uma (para casos como o `901`).

Front: um único `window.Config` carregado do backend (rota pública `config` com só os campos públicos) antes dos outros scripts; nenhum `if` com nome de cargo, garagem ou número de unidade.

Atualização de clientes: produto versionado (`versaoProduto`), cada instalação com `versaoConfig`; migrações idempotentes em `migracoes/` rodadas pelo próprio backend ao detectar versão antiga.

## 13. Etapas de migração sugeridas

1. **Congelar a referência:** tag `souza-franco-v1` neste repositório e no backend privado. Nada mais muda aqui além de correções.
2. **Criar o repositório do produto** a partir da tag (histórico copiado), já com `docs/` deste diagnóstico.
3. **Centralizar sem mudar comportamento** (no repo novo): extrair identidade, e-mails, IDs de Drive e URLs para uma configuração única com os valores do Souza Franco. Teste: saída idêntica (e-mails, PDFs) à da referência.
4. **Modelo de unidade:** coleção `unidades` + `estrutura`; trocar `fsNumeroApto`/laços `2..8` e a paginação do relatório por agrupamentos. Teste com a estrutura SF gerando o mesmo PDF.
5. **Modelo de vaga:** coleção `vagas`, garagens como lista, fim da string `"14 / G1"` e do caso `1/2`.
6. **Cargos e permissões dinâmicos:** `cargos` + matriz por id; front só consome `permissoes[]`. "Desenvolvedor" vira papel de suporte do produto.
7. **Módulos:** manifesto por módulo e liga/desliga (garagem, mapa, kit, aprovação, revisão anual, perfil, relatórios).
8. **Notificações por evento** com template central de e-mail.
9. **Planilha:** remover do núcleo; virar exportação opcional.
10. **Assistente de configuração** (`instalador/`) gravando `config/*` e criando pastas no Drive.
11. **Instalação de teste** com um condomínio fictício de estrutura diferente (ex.: 2 torres, casas, sem garagem) para provar a generalização.
12. **Migração do Souza Franco para o produto** (opcional, no fim): script que gera `config/*`, `unidades` e `vagas` a partir dos dados atuais, rodado numa cópia do Firestore, comparando relatórios antes de trocar a produção.

## 14. Pontos que precisam de decisão sua

- Cada condomínio terá **seu próprio projeto Apps Script e Firebase** (mais simples, cotas separadas) ou um backend compartilhado? Recomendo projeto próprio por enquanto, com o modelo `condominios/{id}` já pronto para juntar depois.
- O papel **Desenvolvedor** continua existindo no produto como "suporte" (você com acesso a todas as instalações) ou cada condomínio decide?
- O produto continua em Apps Script + GitHub Pages? (Essa escolha afeta o instalador: com Apps Script, criar uma instalação nova envolve copiar o projeto e configurar a service account, e isso não dá para automatizar 100% pelo navegador.)
