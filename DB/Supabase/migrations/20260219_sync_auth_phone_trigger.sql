-- Migration: sync_auth_phone_to_profile_trigger
-- Versão: V2.3.0
-- Data: 2026-02-19
-- Descrição: Trigger que sincroniza auth.users.phone → user_profiles.phone automaticamente.
--            auth.users.phone é sempre a fonte de verdade (master).
--            user_profiles.phone é um mirror — nunca editado directamente pelo frontend.

-- Função: sincroniza auth.users.phone → user_profiles.phone
CREATE OR REPLACE FUNCTION public.sync_auth_phone_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE public.user_profiles
    SET phone = NEW.phone
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: disparado após UPDATE em auth.users
DROP TRIGGER IF EXISTS on_auth_user_phone_update ON auth.users;
CREATE TRIGGER on_auth_user_phone_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_phone_to_profile();

-- Correcção de dados existentes (aplicar manualmente se necessário):
-- UPDATE public.user_profiles up
-- SET phone = au.phone
-- FROM auth.users au
-- WHERE up.user_id = au.id
--   AND au.phone IS NOT NULL
--   AND au.phone != ''
--   AND (up.phone IS NULL OR up.phone = '');
