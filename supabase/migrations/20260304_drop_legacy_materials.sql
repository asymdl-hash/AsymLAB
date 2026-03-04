-- Unificação: dropar tabela materials legacy (dados duplicados de materials_catalog)
-- catalogService.ts agora usa materials_catalog directamente
DROP TABLE IF EXISTS materials CASCADE;
