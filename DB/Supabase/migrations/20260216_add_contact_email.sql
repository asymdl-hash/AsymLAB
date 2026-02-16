-- Migração: Adicionar contact_email ao user_profiles
-- Data: 2026-02-16
-- Descrição: Email de contacto separado do email de login.
--   - Utilizadores criados por email: contact_email = email de login (auto)
--   - Utilizadores criados por username: contact_email vazio, editável na ficha

-- 1. Adicionar coluna
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Comentário
COMMENT ON COLUMN public.user_profiles.contact_email IS 'Email de contacto. Auto-preenchido com email de login para contas email. Editável para contas username.';

-- 3. Preencher automaticamente para utilizadores existentes criados por email (não @asymlab.app)
UPDATE public.user_profiles up
SET contact_email = au.email
FROM auth.users au
WHERE up.user_id = au.id
  AND au.email IS NOT NULL
  AND au.email NOT LIKE '%@asymlab.app'
  AND up.contact_email IS NULL;
