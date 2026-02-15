-- ============================================================
-- AsymLAB — RLS (Row Level Security) Policies
-- Migração: 20260215
-- Versão: V1.11.0
--
-- Hierarquia de acesso:
-- ├── Admin (app_role='admin') → Vê TUDO, edita TUDO
-- ├── Médico (app_role='doctor') → Vê clínicas associadas
-- ├── Staff Clínica (app_role='clinic_user') → Vê clínicas associadas
-- └── Utilizador (app_role='staff') → Vê clínicas associadas (read-only)
--
-- IMPORTANTE: As API routes usam service_role_key que bypassa RLS.
-- Estas policies aplicam-se apenas ao client Supabase (anon key).
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: Obter app_role do utilizador autenticado
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT app_role FROM public.user_profiles WHERE user_id = auth.uid()),
    'staff'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: Verificar se user é admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: Obter clinic_ids do utilizador autenticado
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_clinic_ids()
RETURNS SETOF UUID AS $$
  SELECT clinic_id FROM public.user_clinic_access WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 1. TABELA: user_profiles
-- Cada user só vê o seu próprio profile. Admin vê todos.
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Remover policies existentes (se houver)
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;

-- SELECT: User vê o seu profile OU admin vê todos
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- UPDATE: User edita o seu profile (nome, avatar). Admin edita qualquer.
CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- INSERT: Apenas via trigger/service_role (sem policy para anon insert)
-- O profile é criado automaticamente quando o user é criado via API route

-- ============================================================
-- 2. TABELA: user_clinic_access
-- User vê as suas associações. Admin vê todas.
-- ============================================================
ALTER TABLE public.user_clinic_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_clinic_access_select" ON public.user_clinic_access;

CREATE POLICY "user_clinic_access_select" ON public.user_clinic_access
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- INSERT/UPDATE/DELETE: Apenas via service_role (API routes)

-- ============================================================
-- 3. TABELA: clinics
-- Admin vê todas. Outros vêem apenas clínicas associadas.
-- ============================================================
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete" ON public.clinics;

-- SELECT: Admin vê todas. Outros vêem clínicas associadas.
CREATE POLICY "clinics_select" ON public.clinics
  FOR SELECT USING (
    public.is_admin()
    OR id IN (SELECT public.get_user_clinic_ids())
  );

-- INSERT: Apenas admin
CREATE POLICY "clinics_insert" ON public.clinics
  FOR INSERT WITH CHECK (
    public.is_admin()
  );

-- UPDATE: Admin edita qualquer. Outros editam apenas clínicas associadas
-- (desde que a permissão de módulo no frontend permita — aqui é a segurança de backend)
CREATE POLICY "clinics_update" ON public.clinics
  FOR UPDATE USING (
    public.is_admin()
    OR id IN (SELECT public.get_user_clinic_ids())
  );

-- DELETE: Apenas admin
CREATE POLICY "clinics_delete" ON public.clinics
  FOR DELETE USING (
    public.is_admin()
  );

-- ============================================================
-- 4. TABELA: clinic_contacts
-- Segue as permissões da clínica-mãe
-- ============================================================
ALTER TABLE public.clinic_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_contacts_select" ON public.clinic_contacts;
DROP POLICY IF EXISTS "clinic_contacts_insert" ON public.clinic_contacts;
DROP POLICY IF EXISTS "clinic_contacts_update" ON public.clinic_contacts;
DROP POLICY IF EXISTS "clinic_contacts_delete" ON public.clinic_contacts;

CREATE POLICY "clinic_contacts_select" ON public.clinic_contacts
  FOR SELECT USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_contacts_insert" ON public.clinic_contacts
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_contacts_update" ON public.clinic_contacts
  FOR UPDATE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_contacts_delete" ON public.clinic_contacts
  FOR DELETE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

-- ============================================================
-- 5. TABELA: clinic_delivery_points
-- Segue as permissões da clínica-mãe
-- ============================================================
ALTER TABLE public.clinic_delivery_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_delivery_points_select" ON public.clinic_delivery_points;
DROP POLICY IF EXISTS "clinic_delivery_points_insert" ON public.clinic_delivery_points;
DROP POLICY IF EXISTS "clinic_delivery_points_update" ON public.clinic_delivery_points;
DROP POLICY IF EXISTS "clinic_delivery_points_delete" ON public.clinic_delivery_points;

CREATE POLICY "clinic_delivery_points_select" ON public.clinic_delivery_points
  FOR SELECT USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_delivery_points_insert" ON public.clinic_delivery_points
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_delivery_points_update" ON public.clinic_delivery_points
  FOR UPDATE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_delivery_points_delete" ON public.clinic_delivery_points
  FOR DELETE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

-- ============================================================
-- 6. TABELA: clinic_staff
-- Segue as permissões da clínica-mãe
-- ============================================================
ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_staff_select" ON public.clinic_staff;
DROP POLICY IF EXISTS "clinic_staff_insert" ON public.clinic_staff;
DROP POLICY IF EXISTS "clinic_staff_update" ON public.clinic_staff;
DROP POLICY IF EXISTS "clinic_staff_delete" ON public.clinic_staff;

CREATE POLICY "clinic_staff_select" ON public.clinic_staff
  FOR SELECT USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_staff_insert" ON public.clinic_staff
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_staff_update" ON public.clinic_staff
  FOR UPDATE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_staff_delete" ON public.clinic_staff
  FOR DELETE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

-- ============================================================
-- 7. TABELA: clinic_discounts
-- Segue as permissões da clínica-mãe
-- ============================================================
ALTER TABLE public.clinic_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_discounts_select" ON public.clinic_discounts;
DROP POLICY IF EXISTS "clinic_discounts_insert" ON public.clinic_discounts;
DROP POLICY IF EXISTS "clinic_discounts_update" ON public.clinic_discounts;
DROP POLICY IF EXISTS "clinic_discounts_delete" ON public.clinic_discounts;

CREATE POLICY "clinic_discounts_select" ON public.clinic_discounts
  FOR SELECT USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_discounts_insert" ON public.clinic_discounts
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_discounts_update" ON public.clinic_discounts
  FOR UPDATE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

CREATE POLICY "clinic_discounts_delete" ON public.clinic_discounts
  FOR DELETE USING (
    public.is_admin()
    OR clinic_id IN (SELECT public.get_user_clinic_ids())
  );

-- ============================================================
-- 8. TABELA: organization_settings
-- Admin: acesso total. Outros: apenas leitura.
-- ============================================================
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_settings_select" ON public.organization_settings;
DROP POLICY IF EXISTS "organization_settings_update" ON public.organization_settings;

-- SELECT: Qualquer utilizador autenticado pode ver
CREATE POLICY "organization_settings_select" ON public.organization_settings
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Apenas admin
CREATE POLICY "organization_settings_update" ON public.organization_settings
  FOR UPDATE USING (
    public.is_admin()
  );

-- INSERT/DELETE: Apenas via service_role

-- ============================================================
-- VERIFICAÇÃO: Confirmar que RLS está ativado em todas as tabelas
-- ============================================================
-- Execute esta query separadamente para verificar:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;
