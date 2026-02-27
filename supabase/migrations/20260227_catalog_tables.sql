-- ============================================================
-- Migration: Tabelas de Catálogo — Materials + Tooth Colors
-- V1.41.0
-- ============================================================

-- 1. Materials
CREATE TABLE IF NOT EXISTS materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    categoria text DEFAULT 'geral',
    cor text DEFAULT '#94a3b8',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_select" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_admin" ON materials FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. Tooth Colors
CREATE TABLE IF NOT EXISTS tooth_colors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    nome text NOT NULL,
    grupo text DEFAULT 'A',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE tooth_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tooth_colors_select" ON tooth_colors FOR SELECT USING (true);
CREATE POLICY "tooth_colors_admin" ON tooth_colors FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. Seed: Materials
INSERT INTO materials (nome, categoria, cor) VALUES
    ('Zircónia', 'ceramica', '#e2e8f0'),
    ('Dissilicato de Lítio (e.max)', 'ceramica', '#fef3c7'),
    ('PMMA', 'resina', '#dbeafe'),
    ('Cr-Co', 'metal', '#9ca3af'),
    ('Titânio', 'metal', '#d1d5db'),
    ('Cerâmica Feldspática', 'ceramica', '#fce7f3'),
    ('Resina Composta', 'composto', '#dcfce7'),
    ('Cera de Modelação', 'outro', '#fef9c3')
ON CONFLICT DO NOTHING;

-- 4. Seed: Tooth Colors (Escala VITA Classical)
INSERT INTO tooth_colors (codigo, nome, grupo) VALUES
    ('A1', 'Claro amarelado', 'A'),
    ('A2', 'Amarelado médio', 'A'),
    ('A3', 'Amarelado escuro', 'A'),
    ('A3.5', 'Amarelado muito escuro', 'A'),
    ('A4', 'Amarelado intenso', 'A'),
    ('B1', 'Claro amarelo-avermelhado', 'B'),
    ('B2', 'Amarelo-avermelhado médio', 'B'),
    ('B3', 'Amarelo-avermelhado escuro', 'B'),
    ('B4', 'Amarelo-avermelhado intenso', 'B'),
    ('C1', 'Cinzento claro', 'C'),
    ('C2', 'Cinzento médio', 'C'),
    ('C3', 'Cinzento escuro', 'C'),
    ('C4', 'Cinzento intenso', 'C'),
    ('D2', 'Avermelhado claro', 'D'),
    ('D3', 'Avermelhado médio', 'D'),
    ('D4', 'Avermelhado escuro', 'D'),
    ('BL1', 'Bleach extra claro', 'Bleach'),
    ('BL2', 'Bleach claro', 'Bleach'),
    ('BL3', 'Bleach médio', 'Bleach'),
    ('BL4', 'Bleach escuro', 'Bleach')
ON CONFLICT (codigo) DO NOTHING;

-- 5. Seed: Consideration Templates (predefinidos)
INSERT INTO consideration_templates (titulo, tipo, created_by, is_default)
SELECT 'Prova de Maquete', 'lab', id, true FROM auth.users LIMIT 1;

INSERT INTO consideration_templates (titulo, tipo, created_by, is_default)
SELECT 'Prova de Estrutura', 'lab', id, true FROM auth.users LIMIT 1;

INSERT INTO consideration_templates (titulo, tipo, created_by, is_default)
SELECT 'Observações Clínicas', 'medico', id, true FROM auth.users LIMIT 1;
