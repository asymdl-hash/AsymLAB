-- ================================================================
-- Migration: Índices em falta nas Foreign Keys (performance)
-- Advisor: unindexed_foreign_keys
-- Aplicado em produção: 2026-02-19
-- Risco: Zero — apenas adiciona velocidade, não altera dados/regras
-- ================================================================

-- 1. delivery_point_contacts.user_id
CREATE INDEX IF NOT EXISTS idx_delivery_point_contacts_user_id
    ON public.delivery_point_contacts (user_id);

-- 2. doctor_clinic_partners.clinic_id
CREATE INDEX IF NOT EXISTS idx_doctor_clinic_partners_clinic_id
    ON public.doctor_clinic_partners (clinic_id);

-- 3. doctor_clinic_partners.partner_id
CREATE INDEX IF NOT EXISTS idx_doctor_clinic_partners_partner_id
    ON public.doctor_clinic_partners (partner_id);

-- 4. user_clinic_access.granted_by
CREATE INDEX IF NOT EXISTS idx_user_clinic_access_granted_by
    ON public.user_clinic_access (granted_by);
