-- ============================================================
-- Migration: Catálogos — Fornecedores, Marcas, Fases de Produção
-- V1.79.0
-- ============================================================

-- 1. SUPPLIERS (Fornecedores)
CREATE TABLE IF NOT EXISTS suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    razao_social text,
    nif text,
    website text,
    iban text,
    telefone text,
    morada text,
    codigo_postal text,
    localidade text,
    google_maps_url text,
    contactos jsonb DEFAULT '[]'::jsonb,
    cor text DEFAULT '#3b82f6',
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_admin" ON suppliers FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. BRANDS (Marcas)
CREATE TABLE IF NOT EXISTS brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL UNIQUE,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_select" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_admin" ON brands FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. PRODUCTION_PHASES (Fases de Produção)
CREATE TABLE IF NOT EXISTS production_phases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    cor text DEFAULT '#6366f1',
    ordem integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE production_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_phases_select" ON production_phases FOR SELECT USING (true);
CREATE POLICY "production_phases_admin" ON production_phases FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. SEED: Fornecedores (do Lab Software)
INSERT INTO suppliers (nome, razao_social, website, telefone, morada, localidade, cor) VALUES
    ('Aguas de Gaia', 'Aguas de Gai...', NULL, '223 770 460', 'Rua de Moçambique, 115, V. N. Gaia', 'Vila Nova de Gaia', '#3b82f6'),
    ('Anycubic ES', 'Anycubic Techno...', 'www.anycubic.es/', NULL, 'Shenzhen, China', 'China', '#8b5cf6'),
    ('BioHorizons Camlog', 'BioHorizons Ca...', 'www.biohorizons.com/', '211 450 780', 'Av. D. João II, 46, Lisboa', 'Lisboa', '#0ea5e9'),
    ('BTI', 'BTI Biotechnolo...', 'bti-biotechnologyinstitute.com', '213 543 515', 'Praça de Alvalade, 6, Lisboa', 'Lisboa', '#ef4444'),
    ('Dentalmaster', 'Dentalmaster - Mat. e Equip. Dentários', 'www.dentalmaster.pt/', '229 448 303', 'Rua de Antonio Maria da Costa, 379, Maia', 'Maia', '#f97316'),
    ('Dentaltix', 'Dentaltix Portu...', 'www.dentaltix.com/pt', '308 801 422', 'Rua Xavier Araujo, 10, Lisboa', 'Lisboa', '#06b6d4'),
    ('Douromed', 'Douromed - Re...', 'douromed.pt/', '224 119 550', 'Rua S. Jose, 82, Gandra PRD', 'Gandra', '#22c55e'),
    ('EDP', 'EDP Comercial ...', 'www.edp.pt/', '213 139 100', 'Av. 24 de Julho, 12, Lisboa', 'Lisboa', '#a855f7'),
    ('Exaktus', 'Exactus, Unipe...', 'exaktus.pt/', '222 004 010', 'Rua Passos Manuel, 102, Porto', 'Porto', '#ec4899'),
    ('Goldentav', 'Goldentav, Uni...', 'www.goldentav.com/', '224 934 929', 'Rua de Belgica, 1304, V. N. Gaia', 'Vila Nova de Gaia', '#eab308'),
    ('Henry Schein Schmidt', 'Henry Schein P...', 'www.henryschein.pt/', '213 133 000', 'Rua Passos Manuel, 83, Lisboa', 'Lisboa', '#14b8a6'),
    ('IPD (Dental Group)', 'IPD 2020 Lda I...', 'ipd2020.com/pt/', '289 154 362', 'Zona Ind. da Barracha, Lt 11, S. Bras', 'São Brás de Alportel', '#6366f1')
ON CONFLICT DO NOTHING;

-- 5. SEED: Marcas (do Lab Software)
INSERT INTO brands (nome) VALUES
    ('3M Oral Care'), ('Aidite'), ('Amann Girrbach'), ('Baumann Dental'),
    ('Bego'), ('BioHorizons'), ('Camlog'), ('Candulor'),
    ('Dentsply Sirona'), ('Dio Implant'), ('GC'), ('Heraeus'),
    ('Huge Dental'), ('IPD'), ('Ivoclar Vivadent'), ('Kulzer'),
    ('Kuraray Noritake'), ('Medit'), ('Mestra'), ('MIS Implants'),
    ('Neodent'), ('Nobel Biocare'), ('Osstem Implant'), ('Polident'),
    ('Renfert'), ('Rhein83'), ('Ruthinium'), ('Shera'),
    ('Straumann'), ('Technoflux'), ('Vertex-Dental'), ('VITA Zahnfabrik'),
    ('Voco'), ('Yeti Dental'), ('Zhermack'), ('Zimmer Biomet')
ON CONFLICT (nome) DO NOTHING;

-- 6. SEED: Fases de Produção (do Lab Software)
INSERT INTO production_phases (nome, cor, ordem) VALUES
    ('Administração', '#9da5b1', 1),
    ('Modelo', '#eab308', 2),
    ('Duplicação', '#f97316', 3),
    ('Articulação I', '#ef4444', 4),
    ('JIG', '#ec4899', 5),
    ('Base Estabilizada', '#a855f7', 6),
    ('Envio Prova I', '#3b82f6', 7),
    ('CAD / Design', '#6366f1', 8),
    ('CAM / Fresagem', '#8b5cf6', 9),
    ('Sinterização', '#d946ef', 10),
    ('Maquilhagem & Glaze', '#ec4899', 11),
    ('Fundição', '#f43f5e', 12),
    ('Acabamento Metal', '#64748b', 13),
    ('Montagem Dentes', '#14b8a6', 14),
    ('Acrilização / Muflas', '#84cc16', 15),
    ('Polimento Final', '#22c55e', 16),
    ('Controlo Qualidade', '#0ea5e9', 17)
ON CONFLICT DO NOTHING;
