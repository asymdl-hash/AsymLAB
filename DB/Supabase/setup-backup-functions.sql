-- =====================================================
-- AsymLAB — Backup Helper Functions
-- 
-- INSTRUÇÕES:
-- 1. Ir ao Supabase Dashboard → SQL Editor
-- 2. Colar TODO este ficheiro
-- 3. Clicar "Run"
-- 4. Feito! O backup agora exporta tudo.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. Exportar RLS Policies (segurança por linha)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_rls_policies()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'schema', schemaname,
    'table', tablename,
    'policy_name', policyname,
    'permissive', permissive,
    'roles', roles,
    'cmd', cmd,
    'qual', qual,
    'with_check', with_check
  )), '[]'::json)
  FROM pg_policies
  WHERE schemaname = 'public';
$$;

-- ─────────────────────────────────────────────────────
-- 2. Exportar Schema DDL (estrutura completa)
--    Inclui: colunas, tipos, PKs, FKs, indexes, RLS
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_schema_ddl()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(json_build_object(
    'table_name', t.table_name,
    'columns', (
      SELECT json_agg(json_build_object(
        'column_name', c.column_name,
        'data_type', c.data_type,
        'udt_name', c.udt_name,
        'is_nullable', c.is_nullable,
        'column_default', c.column_default,
        'character_maximum_length', c.character_maximum_length,
        'ordinal_position', c.ordinal_position
      ) ORDER BY c.ordinal_position)
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
    ),
    'primary_keys', (
      SELECT json_agg(kcu.column_name)
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = t.table_name
        AND tc.constraint_type = 'PRIMARY KEY'
    ),
    'foreign_keys', (
      SELECT json_agg(json_build_object(
        'column', kcu.column_name,
        'foreign_table', ccu.table_name,
        'foreign_column', ccu.column_name,
        'constraint_name', tc.constraint_name
      ))
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = t.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
    ),
    'indexes', (
      SELECT json_agg(json_build_object(
        'index_name', indexname,
        'index_def', indexdef
      ))
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = t.table_name
    ),
    'rls_enabled', (
      SELECT relforcerowsecurity
      FROM pg_class
      WHERE relname = t.table_name
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
  ))
  INTO result
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ─────────────────────────────────────────────────────
-- 3. Exportar DB Functions personalizadas
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_db_functions()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'function_name', p.proname,
    'schema', n.nspname,
    'language', l.lanname,
    'return_type', pg_get_function_result(p.oid),
    'arguments', pg_get_function_arguments(p.oid),
    'definition', pg_get_functiondef(p.oid),
    'is_security_definer', p.prosecdef,
    'volatility', 
      CASE p.provolatile 
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
      END
  )), '[]'::json)
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
  WHERE n.nspname = 'public'
    AND p.proname NOT IN ('get_rls_policies', 'get_schema_ddl', 'get_db_functions', 'get_auth_users_summary');
$$;

-- ─────────────────────────────────────────────────────
-- 4. Exportar Auth Users (todos os utilizadores)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_auth_users_summary()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'id', id,
    'email', email,
    'role', role,
    'created_at', created_at,
    'last_sign_in_at', last_sign_in_at,
    'email_confirmed_at', email_confirmed_at,
    'is_sso_user', is_sso_user,
    'raw_app_meta_data', raw_app_meta_data,
    'raw_user_meta_data', raw_user_meta_data
  )), '[]'::json)
  FROM auth.users;
$$;

-- ─────────────────────────────────────────────────────
-- 5. Permissões (permitir chamada via API)
-- ─────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_rls_policies() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_schema_ddl() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_db_functions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auth_users_summary() TO anon, authenticated;
