-- ============================================================
-- Migration: Considerações V2 — Templates, Side-by-Side, Versionamento
-- V1.38.0
-- FIX: Colunas lado e tipo usavam ENUM, convertidas para TEXT
-- ============================================================

-- Step 1: Convert ENUM columns to TEXT
ALTER TABLE considerations ALTER COLUMN lado TYPE text USING lado::text;
ALTER TABLE considerations ALTER COLUMN tipo TYPE text USING tipo::text;
DROP TYPE IF EXISTS consideration_side_type CASCADE;
DROP TYPE IF EXISTS consideration_content_type CASCADE;

-- Rename existing 'tipo' (texto/com_anexo/so_anexo) to content_type
ALTER TABLE considerations RENAME COLUMN tipo TO content_type;

-- Add new constraints for lado
ALTER TABLE considerations DROP CONSTRAINT IF EXISTS considerations_lado_check;
ALTER TABLE considerations ADD CONSTRAINT considerations_lado_check 
    CHECK (lado IN ('lab', 'clinica', 'medico', 'lab_inside'));

-- Add new tipo column
ALTER TABLE considerations ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'original' 
    CHECK (tipo IN ('original', 'resposta', 'reencaminhamento'));

-- Step 2: Templates de considerações
CREATE TABLE IF NOT EXISTS consideration_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    tipo text NOT NULL DEFAULT 'medico' CHECK (tipo IN ('medico', 'lab', 'lab_inside')),
    created_by uuid NOT NULL REFERENCES auth.users(id),
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consideration_template_fields (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id uuid NOT NULL REFERENCES consideration_templates(id) ON DELETE CASCADE,
    subtitulo text NOT NULL,
    descricao_default text DEFAULT '',
    ordem int NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_template_fields_template ON consideration_template_fields(template_id);

CREATE TABLE IF NOT EXISTS consideration_template_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id uuid NOT NULL REFERENCES consideration_templates(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    tipo_trabalho_id uuid REFERENCES work_types(id) ON DELETE SET NULL,
    phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
    uso_count int DEFAULT 1,
    last_used_at timestamptz DEFAULT now(),
    UNIQUE(template_id, user_id, tipo_trabalho_id, phase_id)
);
CREATE INDEX IF NOT EXISTS idx_template_usage_user ON consideration_template_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_combo ON consideration_template_usage(user_id, tipo_trabalho_id, phase_id);

CREATE TABLE IF NOT EXISTS consideration_template_shares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id uuid NOT NULL REFERENCES consideration_templates(id) ON DELETE CASCADE,
    shared_by uuid NOT NULL REFERENCES auth.users(id),
    shared_with uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(template_id, shared_with)
);

-- Step 3: Novos campos na tabela considerations
ALTER TABLE considerations
    ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES considerations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES consideration_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fields jsonb DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS report_html_path text,
    ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES patients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_considerations_parent ON considerations(parent_id);
CREATE INDEX IF NOT EXISTS idx_considerations_patient ON considerations(patient_id);
CREATE INDEX IF NOT EXISTS idx_considerations_share_token ON considerations(share_token);
CREATE INDEX IF NOT EXISTS idx_considerations_tipo ON considerations(tipo);
CREATE INDEX IF NOT EXISTS idx_considerations_lado ON considerations(lado);

-- Step 4: Versões
CREATE TABLE IF NOT EXISTS consideration_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    consideration_id uuid NOT NULL REFERENCES considerations(id) ON DELETE CASCADE,
    version_number int NOT NULL,
    fields_snapshot jsonb NOT NULL,
    conteudo_snapshot text,
    edited_by uuid NOT NULL REFERENCES auth.users(id),
    edited_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_versions_consideration ON consideration_versions(consideration_id);

-- Step 5: RLS
ALTER TABLE consideration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consideration_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE consideration_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE consideration_template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE consideration_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON consideration_templates FOR SELECT USING (
    is_default = true OR created_by = auth.uid()
    OR id IN (SELECT template_id FROM consideration_template_shares WHERE shared_with = auth.uid())
);
CREATE POLICY "templates_insert" ON consideration_templates FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "templates_update" ON consideration_templates FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "templates_delete" ON consideration_templates FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "template_fields_select" ON consideration_template_fields FOR SELECT USING (
    template_id IN (SELECT id FROM consideration_templates WHERE
        is_default = true OR created_by = auth.uid()
        OR id IN (SELECT template_id FROM consideration_template_shares WHERE shared_with = auth.uid())
    )
);
CREATE POLICY "template_fields_insert" ON consideration_template_fields FOR INSERT WITH CHECK (
    template_id IN (SELECT id FROM consideration_templates WHERE created_by = auth.uid())
);
CREATE POLICY "template_fields_update" ON consideration_template_fields FOR UPDATE USING (
    template_id IN (SELECT id FROM consideration_templates WHERE created_by = auth.uid())
);
CREATE POLICY "template_fields_delete" ON consideration_template_fields FOR DELETE USING (
    template_id IN (SELECT id FROM consideration_templates WHERE created_by = auth.uid())
);

CREATE POLICY "usage_select" ON consideration_template_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "usage_all" ON consideration_template_usage FOR ALL USING (user_id = auth.uid());

CREATE POLICY "shares_select" ON consideration_template_shares FOR SELECT USING (
    shared_by = auth.uid() OR shared_with = auth.uid()
);
CREATE POLICY "shares_insert" ON consideration_template_shares FOR INSERT WITH CHECK (shared_by = auth.uid());
CREATE POLICY "shares_delete" ON consideration_template_shares FOR DELETE USING (shared_by = auth.uid());

CREATE POLICY "versions_select" ON consideration_versions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "versions_insert" ON consideration_versions FOR INSERT WITH CHECK (edited_by = auth.uid());
