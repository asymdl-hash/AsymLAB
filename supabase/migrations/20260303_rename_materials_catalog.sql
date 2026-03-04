-- ============================================================
-- Migration: Renomear milling_materials → materials_catalog
--            + Adicionar campos de material às tabelas de registos
-- V1.91.0
-- ============================================================

-- 1. Renomear tabela principal do catálogo de materiais
ALTER TABLE milling_materials RENAME TO materials_catalog;

-- 2. Campos de material faltantes em teeth_records
ALTER TABLE teeth_records ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES materials_catalog(id);
ALTER TABLE teeth_records ADD COLUMN IF NOT EXISTS material_name text DEFAULT '';
ALTER TABLE teeth_records ADD COLUMN IF NOT EXISTS marca text DEFAULT '';
ALTER TABLE teeth_records ADD COLUMN IF NOT EXISTS fornecedor text DEFAULT '';
ALTER TABLE teeth_records ADD COLUMN IF NOT EXISTS ref_fabricante text DEFAULT '';
ALTER TABLE teeth_records ADD COLUMN IF NOT EXISTS ref_fornecedor text DEFAULT '';

-- 3. Campos de material faltantes em milling_records
ALTER TABLE milling_records ADD COLUMN IF NOT EXISTS marca text DEFAULT '';
ALTER TABLE milling_records ADD COLUMN IF NOT EXISTS fornecedor text DEFAULT '';
ALTER TABLE milling_records ADD COLUMN IF NOT EXISTS ref_fabricante text DEFAULT '';
ALTER TABLE milling_records ADD COLUMN IF NOT EXISTS ref_fornecedor text DEFAULT '';

-- 4. Campo marca faltante em component_records
ALTER TABLE component_records ADD COLUMN IF NOT EXISTS marca text DEFAULT '';
