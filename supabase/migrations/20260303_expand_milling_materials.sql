-- ============================================================
-- Migration: Expandir milling_materials + Price History
-- V1.79.1
-- ============================================================

-- 1. Novos campos na tabela milling_materials
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS fornecedor text;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS ref_fabricante text;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS ref_fornecedor text;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS preco_pvp numeric DEFAULT 0;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS fator_conversao numeric DEFAULT 1.0;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS iva_percent integer DEFAULT 23;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS porcao_tamanho numeric DEFAULT 1;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS porcao_unidade text DEFAULT 'un';
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS desconto_percent numeric DEFAULT 0;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS data_desconto date;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS reuniao boolean DEFAULT false;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);
ALTER TABLE milling_materials ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Tabela de histórico de preços
CREATE TABLE IF NOT EXISTS material_price_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id uuid NOT NULL REFERENCES milling_materials(id) ON DELETE CASCADE,
    preco_anterior numeric,
    preco_novo numeric NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    motivo text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE material_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_price_history_select" ON material_price_history FOR SELECT USING (true);
CREATE POLICY "material_price_history_admin" ON material_price_history FOR ALL USING (auth.uid() IS NOT NULL);
