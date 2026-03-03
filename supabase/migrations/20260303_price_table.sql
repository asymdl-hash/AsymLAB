-- V1.80.0: Expand work_types with pricing + production columns
-- Instead of a separate price_table, integrate pricing directly into work_types

ALTER TABLE work_types ADD COLUMN IF NOT EXISTS codigo text UNIQUE;
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS preco numeric DEFAULT 0;
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS iva_percent numeric DEFAULT 0;
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS materiais jsonb DEFAULT '[]';
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS fases_producao jsonb DEFAULT '[]';
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS tempo_estimado integer DEFAULT 0;
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS notas_producao text;

-- Drop the separate price_table (no longer needed)
DROP TABLE IF EXISTS price_table;
