# app

Sistema de gestão condominial configurável, com cadastro de moradores, controle de acessos, permissões, documentos, notificações e módulos administrativos.

## Situação atual

Primeira versão: cópia do site de cadastro de moradores que serviu de inspiração, rodando em **modo demonstração**. Não há backend: todas as respostas vêm de `js/data/backend-demo.js`, com dados fictícios guardados no navegador de quem abre a página. Nada é enviado para servidor nenhum e nenhum e-mail sai.

- `index.html`: formulário do morador. Para testar a atualização, use o CPF `529.982.247-25` e a data `12/03/1980`.
- `admin.html`: painel da administração. Escolha o cargo e clique em "Entrar na demonstração".
- A faixa no rodapé tem o botão "Restaurar dados da demonstração".

## Rodar localmente

Não há build. Sirva a pasta com qualquer servidor estático e abra `http://localhost:8000/index.html`.

## Publicar na Cloudflare Pages

1. No painel da Cloudflare: Workers & Pages → Create → Pages → Connect to Git → escolha `adm-condominial/app`.
2. Framework preset: **None**. Build command: em branco. Build output directory: `/`.
3. Salvar. Cada push na `main` publica sozinho; cada PR ganha um endereço de prévia.
