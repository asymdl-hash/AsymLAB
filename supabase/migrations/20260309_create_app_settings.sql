-- Tabela app_settings (chave-valor para configurações globais)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer utilizador autenticado pode ler e alterar settings
CREATE POLICY "Authenticated users can manage settings"
ON app_settings FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Inserir valores default
INSERT INTO app_settings (key, value) VALUES
    ('draft_expiration_days', '2'),
    ('draft_whatsapp_enabled', 'true'),
    ('draft_reminder_hours', '24')
ON CONFLICT (key) DO NOTHING;
