-- Migration: create_plan_phases_catalog
-- Catálogo de fases do plano de tratamento

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS plan_phases_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    emoji TEXT DEFAULT '📋',
    cor TEXT DEFAULT '#6366f1',
    activo BOOLEAN DEFAULT true,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed com as 5 fases
INSERT INTO plan_phases_catalog (nome, emoji, cor, ordem) VALUES
    ('Planeamento', '📐', '#3b82f6', 1),
    ('Provisórios', '🔄', '#f59e0b', 2),
    ('Definitivos', '✅', '#10b981', 3),
    ('Cirurgia', '🏥', '#ef4444', 4),
    ('Controlo', '🔍', '#8b5cf6', 5)
ON CONFLICT (nome) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE plan_phases_catalog ENABLE ROW LEVEL SECURITY;

-- 4. Política de leitura pública (autenticados)
CREATE POLICY "plan_phases_catalog_read" ON plan_phases_catalog
    FOR SELECT TO authenticated USING (true);

-- 5. Política de escrita para admins
CREATE POLICY "plan_phases_catalog_write" ON plan_phases_catalog
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.app_role IN ('admin', 'superadmin')
        )
    );
