-- V1.22.0: Hardening RLS INSERT policies
-- Corrige 9 políticas INSERT que usavam WITH CHECK (true),
-- permitindo qualquer utilizador autenticado inserir dados.
-- Agora cada INSERT respeita o modelo de acesso por role/clínica.

-- ============================================================
-- 1. patients: só lab team (admin + staff_lab) pode criar
-- ============================================================
DROP POLICY IF EXISTS patients_insert ON public.patients;
CREATE POLICY patients_insert ON public.patients
    FOR INSERT TO authenticated
    WITH CHECK (is_lab_team());

-- ============================================================
-- 2. treatment_plans: quem tem acesso ao paciente pode criar
-- ============================================================
DROP POLICY IF EXISTS treatment_plans_insert ON public.treatment_plans;
CREATE POLICY treatment_plans_insert ON public.treatment_plans
    FOR INSERT TO authenticated
    WITH CHECK (has_patient_access(patient_id));

-- ============================================================
-- 3. phases: quem tem acesso ao paciente (via plan) pode criar
-- ============================================================
DROP POLICY IF EXISTS phases_insert ON public.phases;
CREATE POLICY phases_insert ON public.phases
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.treatment_plans tp
            WHERE tp.id = phases.plan_id
            AND has_patient_access(tp.patient_id)
        )
    );

-- ============================================================
-- 4. phase_materials: quem tem acesso ao paciente pode criar
-- ============================================================
DROP POLICY IF EXISTS phase_materials_insert ON public.phase_materials;
CREATE POLICY phase_materials_insert ON public.phase_materials
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.phases ph
            JOIN public.treatment_plans tp ON tp.id = ph.plan_id
            WHERE ph.id = phase_materials.phase_id
            AND has_patient_access(tp.patient_id)
        )
    );

-- ============================================================
-- 5. appointments: quem tem acesso ao paciente pode criar
-- ============================================================
DROP POLICY IF EXISTS appointments_insert ON public.appointments;
CREATE POLICY appointments_insert ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.phases ph
            JOIN public.treatment_plans tp ON tp.id = ph.plan_id
            WHERE ph.id = appointments.phase_id
            AND has_patient_access(tp.patient_id)
        )
    );

-- ============================================================
-- 6. considerations: quem tem acesso ao paciente pode criar
-- ============================================================
DROP POLICY IF EXISTS considerations_insert ON public.considerations;
CREATE POLICY considerations_insert ON public.considerations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.phases ph
            JOIN public.treatment_plans tp ON tp.id = ph.plan_id
            WHERE ph.id = considerations.phase_id
            AND has_patient_access(tp.patient_id)
        )
    );

-- ============================================================
-- 7. consideration_attachments: quem tem acesso ao paciente
-- ============================================================
DROP POLICY IF EXISTS consideration_attachments_insert ON public.consideration_attachments;
CREATE POLICY consideration_attachments_insert ON public.consideration_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.considerations c
            JOIN public.phases ph ON ph.id = c.phase_id
            JOIN public.treatment_plans tp ON tp.id = ph.plan_id
            WHERE c.id = consideration_attachments.consideration_id
            AND has_patient_access(tp.patient_id)
        )
    );

-- ============================================================
-- 8. files: quem tem acesso ao paciente pode adicionar
-- ============================================================
DROP POLICY IF EXISTS files_insert ON public.files;
CREATE POLICY files_insert ON public.files
    FOR INSERT TO authenticated
    WITH CHECK (has_patient_access(patient_id));

-- ============================================================
-- 9. patient_doctors: só lab team pode gerir
-- ============================================================
DROP POLICY IF EXISTS patient_doctors_insert ON public.patient_doctors;
CREATE POLICY patient_doctors_insert ON public.patient_doctors
    FOR INSERT TO authenticated
    WITH CHECK (is_lab_team());

-- ============================================================
-- 10. FIX: user_clinic_access SELECT tinha recursão infinita
-- (chamava get_user_clinic_ids() que consulta a mesma tabela)
-- ============================================================
DROP POLICY IF EXISTS user_clinic_access_select ON public.user_clinic_access;
CREATE POLICY user_clinic_access_select ON public.user_clinic_access
    FOR SELECT TO authenticated
    USING (is_admin() OR (user_id = auth.uid()));

-- ============================================================
-- 11. FIX: has_patient_access e is_lab_team como SECURITY DEFINER
-- Evita que a RLS das tabelas consultadas internamente seja acionada,
-- prevenindo recursão infinita (patients → has_patient_access → patients)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_patient_access(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND app_role IN ('admin', 'staff_lab')
  ) OR EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.user_clinic_access uca ON uca.clinic_id = p.clinica_id
    WHERE p.id = p_patient_id
    AND uca.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.patient_doctors pd
    WHERE pd.patient_id = p_patient_id
    AND pd.doctor_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_lab_team()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND app_role IN ('admin', 'staff_lab')
  )
$$;
