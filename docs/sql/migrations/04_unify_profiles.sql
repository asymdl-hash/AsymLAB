-- ============================================================================
-- MIGRATION: Unificar tabelas profiles → user_profiles
-- Version: V1.8.0
-- Date: 2026-02-15
-- Description: Remove a tabela profiles (antiga/duplicada) e migra dados
--              para user_profiles (tabela RBAC oficial)
-- ============================================================================

-- ============================================================================
-- 1. MIGRAR DADOS: profiles → user_profiles
-- ============================================================================
-- Copiar registos que existem em profiles mas não em user_profiles
INSERT INTO public.user_profiles (user_id, app_role, full_name, created_at, updated_at)
SELECT 
    p.id AS user_id,
    CASE 
        WHEN p.role = 'admin' THEN 'admin'
        WHEN p.role IN ('clinic_user', 'doctor', 'staff') THEN p.role
        ELSE 'staff'  -- default se role não reconhecido
    END AS app_role,
    COALESCE(p.full_name, p.email, 'Utilizador') AS full_name,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = p.id
);

-- ============================================================================
-- 2. REMOVER TRIGGER antigo da tabela profiles (se existir)
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- 3. CRIAR NOVO TRIGGER para user_profiles
-- ============================================================================
-- Quando um novo user é criado via auth, automaticamente criar user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, app_role, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'app_role', 'staff'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. REMOVER tabela profiles (antiga)
-- ============================================================================
-- Remover RLS policies da tabela profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Remover a tabela
DROP TABLE IF EXISTS public.profiles;

-- ============================================================================
-- VERIFICAÇÃO: Ver estado final
-- ============================================================================
-- SELECT user_id, app_role, full_name FROM public.user_profiles;
