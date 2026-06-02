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

## Utilizando sql
--  Criar a Tabela de Veículos
CREATE TABLE IF NOT EXISTS veiculos (
    id SERIAL PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar a Tabela de Serviços (Vinculada à tabela de veículos)
CREATE TABLE IF NOT EXISTS servicos_estetica (
    id SERIAL PRIMARY KEY,
    nome_servico VARCHAR(155) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Lavagem Premium',
    preco DECIMAL(10, 2) NOT NULL,
    tempo_estimado INT NOT NULL,
    status_servico VARCHAR(50) DEFAULT 'Na Fila',
    veiculo_id INT REFERENCES veiculos(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Desativar a Segurança de Linha (RLS)
ALTER TABLE veiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicos_estetica DISABLE ROW LEVEL SECURITY;

## Arquivos Principais

- `index.html`: layout principal do sistema.
- `src/main.js`: logica de login, veiculos e servicos.
- `src/supabase.js`: comunicacao com Supabase.
- `supabase/setup.sql`: criacao das tabelas e permissoes.
- `.env`: configuracao local do Supabase.
