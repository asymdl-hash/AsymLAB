-- Migration: Adicionar colunas de anexo à tabela considerations
-- Executar manualmente ou via Supabase Dashboard > SQL Editor

ALTER TABLE considerations 
ADD COLUMN IF NOT EXISTS anexo_url text,
ADD COLUMN IF NOT EXISTS anexo_nome text,
ADD COLUMN IF NOT EXISTS anexo_tipo text;

COMMENT ON COLUMN considerations.anexo_url IS 'URL do ficheiro anexado (Supabase Storage)';
COMMENT ON COLUMN considerations.anexo_nome IS 'Nome original do ficheiro';
COMMENT ON COLUMN considerations.anexo_tipo IS 'MIME type do ficheiro (image/png, application/pdf, etc.)';
