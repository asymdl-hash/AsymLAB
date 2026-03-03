-- Tabela de configurações da aplicação (key-value)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir thresholds padrão para badge "dias em espera" na fila
INSERT INTO app_settings (key, value, description) VALUES
    ('queue_wait_thresholds', '{"amber_days": 1, "red_days": 3}', 'Dias para badge âmbar e vermelho na Fila de Pedidos')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Todos os utilizadores autenticados podem ler
CREATE POLICY "Authenticated users can read settings"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admins podem alterar (por agora todos autenticados)
CREATE POLICY "Authenticated users can update settings"
    ON app_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
