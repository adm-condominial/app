# CLAUDE.md

Produto de gestão condominial para vender a vários condomínios. Nasceu de um site feito para um condomínio específico (o Souza Franco), que continua existindo à parte e serve só de inspiração: nada daqui deve depender dele ou referenciá-lo.

Hoje é um site estático (HTML, CSS e JavaScript puro, sem build e sem dependências npm), publicado na Cloudflare Pages, rodando em **modo demonstração** (`MODO_DEMO` em `js/regras.js`): todas as rotas são respondidas no navegador por `js/data/backend-demo.js`, com dados fictícios no `localStorage`.

## Direção do produto (decisões de 10/10/2026)

- O cliente é leigo e nunca cria conta em nada (Firebase, Google Cloud etc.). A infraestrutura é toda do dono do produto, que é o "desenvolvedor" geral.
- Nada do produto fica no Google Drive pessoal do dono. Arquivos irão para um armazenamento próprio (Cloudflare R2 ou Firebase Storage).
- Hospedagem na Cloudflare (Pages; backend futuro provavelmente em Workers), banco Firestore, e-mail por serviço transacional (Resend ou similar).
- Primeiro deixar o site do jeito desejado em modo demonstração; backend, multi-cliente e assistente de configuração só quando for captar clientes.
- Evitar acoplar o código a um condomínio específico: nome, unidades, garagens, cargos e textos devem caminhar para configuração.

## Estrutura

- `index.html`: formulário do morador. `admin.html`: painel da administração. `kit.html`, `mapa-vaga.html`, `seguranca.html`: páginas avulsas.
- `js/regras.js`: configuração global (`MODO_DEMO`, `WEB_APP_URL`, `ADMIN_AUTH_CONFIG`) e regras de validação. Carregado primeiro.
- `js/data/backend.js`: `window.Backend.chamar()`, a única função que fala com o backend. `js/data/backend-demo.js` a substitui no modo demonstração e deve ser carregado logo depois dela.
- `js/data/DataService.js`: o resto do app só chama `window.DataService.*`.
- `js/admin-*.js`: um arquivo por painel/função do admin.
- `css/`: estilos do formulário divididos por assunto (`responsivo.css` concentra as media queries); `css/admin.css` é o do painel.

## Rodar localmente

Sem build. `.claude/launch.json` sobe um servidor estático em Node na porta 8000; qualquer outro servidor estático serve.

## Convenções

- Código, comentários, nomes de funções e textos da interface em português do Brasil.
- JavaScript em ES5 dentro de IIFEs `(function() { ... })();`, expondo módulos em `window.*`. Sem frameworks, sem módulos ES, sem bundler.
- Scripts e CSS são incluídos com `?v=AAAAMMDDx` para furar o cache. Ao mudar um arquivo, atualize a versão nas tags que o carregam.
- Comentários de cabeçalho no topo de cada arquivo explicam o porquê das decisões; mantenha esse estilo.
- Nunca registre dados pessoais de moradores no `console`. Dados de exemplo são sempre fictícios.
- Links externos abrem em popup (`js/popup-links.js`), não em nova aba.

## Cláusulas pétreas

- Não deixar conectivos, artigos ou preposições isolados no final da linha. O `js/sem-conectivos.js` já cuida disso; nenhum layout novo pode escapar desse script.
- Não usar reticências ("...") em nenhum texto do site.

## Regras

- Teste toda mudança de interface também em largura de celular (por volta de 375px), além do desktop.
- Entregue mudanças como PR em rascunho, com explicação em linguagem simples.
