-- Módulo Médicos: Migração para criar tabelas doctor_profiles e doctor_clinic_partners
-- Aplicar manualmente no Supabase SQL Editor se o MCP estiver indisponível

-- Tabela doctor_profiles: extensão profissional do user_profiles
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER set_doctor_profiles_updated_at
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Tabela doctor_clinic_partners: relação médico ↔ clínica ↔ parceiro
CREATE TABLE doctor_clinic_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, clinic_id, partner_id)
);

-- Indexes para performance
CREATE INDEX idx_doctor_profiles_user ON doctor_profiles(user_id);
CREATE INDEX idx_doctor_clinic_partners_doctor ON doctor_clinic_partners(doctor_id);
CREATE INDEX idx_doctor_clinic_partners_clinic ON doctor_clinic_partners(clinic_id);

-- RLS: doctor_profiles
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_doctor_profiles" ON doctor_profiles
  FOR ALL USING (
    (SELECT app_role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "doctor_read_own_profile" ON doctor_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "doctor_update_own_profile" ON doctor_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- RLS: doctor_clinic_partners
ALTER TABLE doctor_clinic_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_doctor_clinic_partners" ON doctor_clinic_partners
  FOR ALL USING (
    (SELECT app_role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "doctor_read_own_partners" ON doctor_clinic_partners
  FOR SELECT USING (doctor_id = auth.uid());
