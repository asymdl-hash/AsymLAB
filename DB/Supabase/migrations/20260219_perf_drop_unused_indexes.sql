-- ================================================================
-- Migration: Remover índices não usados (performance)
-- Advisor: unused_index
-- Aplicado em produção: 2026-02-19
-- Nota: Se necessário recriar, usar CREATE INDEX novamente
-- ================================================================

DROP INDEX IF EXISTS public.idx_clinic_contacts_clinic;
DROP INDEX IF EXISTS public.idx_clinic_delivery_points_clinic;
DROP INDEX IF EXISTS public.idx_clinic_discounts_clinic;
