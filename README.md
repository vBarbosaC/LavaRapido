# Midnight Garage

Sistema web simples para controle de veiculos e servicos de estetica automotiva.

O projeto foi organizado com Vite, JavaScript, Tailwind via CDN e Supabase para autenticacao e banco de dados.

## O Que Foi Feito

- Criada tela de login e cadastro de operador com Supabase Auth.
- Criado painel operacional para gerenciar veiculos em atendimento.
- Criado CRUD de veiculos com placa, marca e modelo.
- Criado CRUD de servicos vinculados ao veiculo selecionado.
- Separada a configuracao do Supabase em `src/supabase.js`.
- Criado arquivo `.env` para guardar URL e chave publica do Supabase.
- Criado `supabase/setup.sql` com tabelas e permissoes do banco.
- Modernizado o layout do sistema.
- Organizada a estrutura de pastas do projeto.

## Configuracao Do Supabase

O arquivo `.env` deve conter:

```env
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-do-supabase
```

No Supabase, rode o SQL do arquivo:

```text
supabase/setup.sql
```

Esse SQL cria as tabelas `veiculos` e `servicos_estetica`, alem de liberar as permissoes necessarias para o app acessar o banco.

## Login E Cadastro De Operador

O sistema possui um fluxo simples de acesso:

- o usuario informa e-mail e senha;
- no cadastro, o sistema mostra uma mensagem de sucesso;
- depois do cadastro, o usuario volta para a tela de login;
- para entrar no painel, basta fazer login com o cadastro criado.

## Como Rodar

Instale as dependencias:

```bash
npm install
```

Inicie o servidor local:

```bash
npm run dev
```

Depois acesse:

```text
http://localhost:5173
```

## Arquivos Principais

- `index.html`: layout principal do sistema.
- `src/main.js`: logica de login, veiculos e servicos.
- `src/supabase.js`: comunicacao com Supabase.
- `supabase/setup.sql`: criacao das tabelas e permissoes.
- `.env`: configuracao local do Supabase.
