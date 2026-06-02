CREATE TABLE IF NOT EXISTS veiculos (
    id SERIAL PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE veiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicos_estetica DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE veiculos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE servicos_estetica TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE veiculos_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE servicos_estetica_id_seq TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
