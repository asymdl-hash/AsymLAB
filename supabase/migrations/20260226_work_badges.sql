-- ============================================================
-- Migration: Sistema Multi-Badge (33 Status)
-- Executar no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Catálogo de status configurável pelo admin
CREATE TABLE IF NOT EXISTS work_status_catalog (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    emoji text NOT NULL DEFAULT '🔵',
    categoria text NOT NULL CHECK (categoria IN ('logistica', 'producao', 'componentes', 'comunicacao', 'avaliacao', 'billing')),
    ordem int NOT NULL DEFAULT 0,
    visivel_para text NOT NULL DEFAULT 'todos' CHECK (visivel_para IN ('todos', 'staff_lab')),
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Badges activos nos planos (M:N com soft-delete)
CREATE TABLE IF NOT EXISTS plan_badges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    status_id uuid NOT NULL REFERENCES work_status_catalog(id) ON DELETE CASCADE,
    added_by uuid REFERENCES auth.users(id),
    added_at timestamptz DEFAULT now(),
    removed_at timestamptz,
    removed_by uuid REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_plan_badges_plan ON plan_badges(plan_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_plan_badges_status ON plan_badges(status_id) WHERE removed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_badges_unique ON plan_badges(plan_id, status_id) WHERE removed_at IS NULL;

-- ============================================================
-- SEED: 33 status predefinidos
-- ============================================================

INSERT INTO work_status_catalog (nome, emoji, categoria, ordem, visivel_para) VALUES
-- 📦 LOGÍSTICA
('Criar Caixa',              '📦', 'logistica',    1, 'staff_lab'),
('Criar Grupo',              '💬', 'logistica',    2, 'staff_lab'),
-- 🔧 PRODUÇÃO
('Para Prova',               '🔵', 'producao',     3, 'todos'),
('Prova Entregue',           '📦', 'producao',     4, 'todos'),
('Em Prova',                 '🧪', 'producao',     5, 'todos'),
('Para Recolher',            '🟡', 'producao',     6, 'todos'),
('Prova Recolhida',          '✅', 'producao',     7, 'todos'),
('Para Colocação',           '🟣', 'producao',     8, 'todos'),
('Colocação Entregue',       '✅', 'producao',     9, 'todos'),
('Em Stand By',              '⏸️', 'producao',    10, 'todos'),
('Parado',                   '🔴', 'producao',    11, 'todos'),
('Fechado',                  '⚪', 'producao',    12, 'todos'),
('Pronto',                   '🏁', 'producao',    13, 'staff_lab'),
-- 🧩 COMPONENTES
('Material Em Falta',        '🟠', 'componentes', 14, 'todos'),
('Descobrir Componentes',    '🔍', 'componentes', 15, 'staff_lab'),
('Escolher Componentes',     '🎯', 'componentes', 16, 'staff_lab'),
('Pedir Componentes',        '📝', 'componentes', 17, 'staff_lab'),
('Encomendar Componentes',   '🛒', 'componentes', 18, 'staff_lab'),
('A Aguardar Componentes',   '⏳', 'componentes', 19, 'staff_lab'),
('Componentes Encomendados', '📬', 'componentes', 20, 'staff_lab'),
('Recolher Componentes',     '🔄', 'componentes', 21, 'staff_lab'),
-- 💬 COMUNICAÇÃO
('Responder Considerações',  '💬', 'comunicacao',  22, 'staff_lab'),
('Enviar Considerações',     '📤', 'comunicacao',  23, 'staff_lab'),
('A Aguardar Considerações', '⏳', 'comunicacao',  24, 'staff_lab'),
('Sem Info',                 '❓', 'comunicacao',  25, 'staff_lab'),
-- 📋 AVALIAÇÃO
('Avaliar Moldagem',         '🔬', 'avaliacao',   26, 'staff_lab'),
('Enviar Orçamento',         '💰', 'avaliacao',   27, 'staff_lab'),
('Enviar Report',            '📊', 'avaliacao',   28, 'staff_lab'),
('Triagem',                  '🏥', 'avaliacao',   29, 'staff_lab'),
('Reunião com Médico',       '🤝', 'avaliacao',   30, 'staff_lab'),
('Ligar ao Médico',          '📞', 'avaliacao',   31, 'staff_lab'),
-- 💰 BILLING
('Faturado',                 '🧾', 'billing',     32, 'staff_lab'),
('Passar Recibo',            '📄', 'billing',     33, 'staff_lab');

-- Enable RLS
ALTER TABLE work_status_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_badges ENABLE ROW LEVEL SECURITY;

-- RLS: todos podem ler catálogo e badges
CREATE POLICY "Anyone can read status catalog" ON work_status_catalog FOR SELECT USING (true);
CREATE POLICY "Anyone can read plan badges" ON plan_badges FOR SELECT USING (true);

-- RLS: autenticados podem adicionar/remover badges
CREATE POLICY "Authenticated can insert badges" ON plan_badges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update badges" ON plan_badges FOR UPDATE USING (auth.uid() IS NOT NULL);
