-- ============================================================================
-- MIGRATION: User Management & Role-Based Access Control (RBAC)
-- Version: V1.2.0
-- Date: 2026-02-13
-- Description: Creates tables and policies for multi-role user management
-- ============================================================================

-- 1. USER PROFILES (Extensão de auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    app_role text NOT NULL CHECK (app_role IN ('admin', 'clinic_user', 'doctor', 'staff')),
    full_name text NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índice para buscas por role
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(app_role);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. USER-CLINIC ACCESS (Para Clinic Users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_clinic_access (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    can_edit boolean DEFAULT false,
    granted_at timestamptz DEFAULT now(),
    granted_by uuid REFERENCES auth.users(id),
    PRIMARY KEY (user_id, clinic_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_clinic_access_user ON public.user_clinic_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clinic_access_clinic ON public.user_clinic_access(clinic_id);

-- ============================================================================
-- 3. HELPER FUNCTIONS (Para RLS)
-- ============================================================================
-- NOTA: Funções criadas no schema PUBLIC (não AUTH) devido a permissões

-- Função para obter role do user atual
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
    SELECT app_role FROM public.user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Função para verificar se user é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() AND app_role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Função para obter clinic_id do clinic_user
CREATE OR REPLACE FUNCTION public.user_clinic_ids()
RETURNS SETOF uuid AS $$
    SELECT clinic_id FROM public.user_clinic_access WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 4. RLS POLICIES - user_profiles
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os profiles
CREATE POLICY "Admins can view all user profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Users podem ver o próprio profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins podem inserir profiles
CREATE POLICY "Admins can insert user profiles"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admins podem atualizar qualquer profile
CREATE POLICY "Admins can update user profiles"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Users podem atualizar o próprio profile (exceto role)
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
    user_id = auth.uid() 
    AND app_role = (SELECT app_role FROM public.user_profiles WHERE user_id = auth.uid())
);

-- ============================================================================
-- 5. RLS POLICIES - user_clinic_access
-- ============================================================================
ALTER TABLE public.user_clinic_access ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os acessos
CREATE POLICY "Admins can view all clinic access"
ON public.user_clinic_access FOR SELECT
TO authenticated
USING (public.is_admin());

-- Clinic users podem ver os próprios acessos
CREATE POLICY "Users can view own clinic access"
ON public.user_clinic_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins podem gerir acessos
CREATE POLICY "Admins can manage clinic access"
ON public.user_clinic_access FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- 6. ATUALIZAR RLS POLICIES EXISTENTES (Clinics)
-- ============================================================================

-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.clinics;

-- Nova policy baseada em roles
CREATE POLICY "Role-based clinic access"
ON public.clinics FOR SELECT
TO authenticated
USING (
    -- Admins e Staff veem tudo
    public.is_admin() 
    OR EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() AND app_role IN ('admin', 'staff')
    )
    -- Clinic users veem apenas as suas clínicas
    OR id IN (SELECT public.user_clinic_ids())
);

-- Apenas admins podem criar/editar/deletar clínicas
CREATE POLICY "Only admins can modify clinics"
ON public.clinics FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- 7. SEED DATA (Criar profile para users existentes)
-- ============================================================================

-- IMPORTANTE: Execute isto DEPOIS de aplicar a migration
-- Substitua 'seu-email@exemplo.com' pelo email do admin principal

-- Inserir profile de admin para o user existente
-- INSERT INTO public.user_profiles (user_id, app_role, full_name)
-- SELECT id, 'admin', 'Admin Principal'
-- FROM auth.users
-- WHERE email = 'seu-email@exemplo.com'
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ============================================================================
-- 
-- Para convidar um novo clinic_user via código:
-- 
-- 1. Backend (Edge Function com Service Role):
--    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
--      email,
--      { data: { app_role: 'clinic_user', full_name: 'Nome' } }
--    )
--
-- 2. Criar profile automaticamente via trigger:
--    CREATE TRIGGER on auth.users após INSERT
--
-- 3. Associar à clínica:
--    INSERT INTO user_clinic_access (user_id, clinic_id, granted_by)
--    VALUES (new_user_id, clinic_id, auth.uid())
--
-- ============================================================================
