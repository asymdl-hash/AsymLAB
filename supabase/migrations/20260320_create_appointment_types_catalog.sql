-- Migration: create_appointment_types_catalog
-- Criar tabela de catálogo de tipos de agendamento

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS appointment_types_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    emoji TEXT DEFAULT '📋',
    cor TEXT DEFAULT '#6366f1',
    activo BOOLEAN DEFAULT true,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed com os 6 tipos do enum actual
INSERT INTO appointment_types_catalog (nome, emoji, cor, ordem) VALUES
    ('Moldagem', '🦷', '#f59e0b', 1),
    ('Para Prova', '🔍', '#3b82f6', 2),
    ('Para Colocação', '✅', '#10b981', 3),
    ('Reparação', '🔧', '#ef4444', 4),
    ('Ajuste', '⚙️', '#8b5cf6', 5),
    ('Outro', '📋', '#6b7280', 6)
ON CONFLICT (nome) DO NOTHING;

-- 3. Alterar coluna tipo na tabela appointments de enum para TEXT
ALTER TABLE appointments ALTER COLUMN tipo TYPE TEXT USING tipo::TEXT;

-- 4. Habilitar RLS
ALTER TABLE appointment_types_catalog ENABLE ROW LEVEL SECURITY;

-- 5. Política de leitura pública (autenticados)
CREATE POLICY "appointment_types_catalog_read" ON appointment_types_catalog
    FOR SELECT TO authenticated USING (true);

-- 6. Política de escrita para admins
CREATE POLICY "appointment_types_catalog_write" ON appointment_types_catalog
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.app_role IN ('admin', 'superadmin')
        )
    );
