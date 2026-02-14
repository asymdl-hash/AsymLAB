# 🚀 Deployment Guide - Sistema de Acesso & Segurança

## Checklist de Implementação

### ✅ Passo 1: Aplicar Migration no Supabase

1. Abre o [Supabase Dashboard](https://app.supabase.com)
2. Seleciona o teu projeto AsymLAB
3. Vai a **SQL Editor**
4. Copia e cola o conteúdo de `docs/sql/migrations/03_user_management_rbac.sql`
5. Clica em **Run**
6. Verificar que não há erros

**Importante:** Após a migration, precisas de criar o teu próprio profile de admin:

```sql
-- Substitui 'teu-email@exemplo.com' pelo teu email real
INSERT INTO public.user_profiles (user_id, app_role, full_name)
SELECT id, 'admin', 'Teu Nome'
FROM auth.users
WHERE email = 'teu-email@exemplo.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

### ✅ Passo 2: Deploy da Edge Function

**Opção A: Via Supabase CLI (Recomendado)**

```powershell
# 1. Instalar Supabase CLI (se ainda não tens)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Link ao projeto
supabase link --project-ref <teu-project-ref>

# 4. Deploy da function
supabase functions deploy invite-clinic-user
```

**Opção B: Via MCP Tools (Se configurado)**

Se tens o MCP do Supabase configurado, posso fazer deployment via tools.

---

### ✅ Passo 3: Configurar Variáveis de Ambiente

A Edge Function precisa de variáveis de ambiente. **Já devem estar configuradas no Supabase**, mas confirma:

1. Dashboard → Settings → Edge Functions → Environment Variables
2. Verifica que existem:
   - `SUPABASE_URL` (gerado automaticamente)
   - `SUPABASE_SERVICE_ROLE_KEY` (gerado automaticamente)
   - `SUPABASE_ANON_KEY` (gerado automaticamente)
   - **ADICIONAR**: `APP_URL` = `https://teu-dominio.vercel.app` (ou `http://localhost:3000` para dev)

---

### ✅ Passo 4: Testar a Funcionalidade

1. **Frontend:**
   - Acede ao módulo Clínicas
   - Clica numa clínica
   - Vai à aba "Acesso & Segurança"
   - Preenche o email na aba "Dados" primeiro
   - Insere um nome completo
   - Clica em "Enviar Convite"

2. **Verificar email:**
   - O email deve receber um convite
   - Link para confirmar e definir password

3. **Logs (Debug):**
   - Dashboard → Edge Functions → Logs
   - Verificar se há erros

---

## 🔧 Troubleshooting

### Erro: "Missing authorization header"
**Causa:** O user não está autenticado  
**Sol human: Fazer logout e login novamente

### Erro: "Only admins can invite clinic users"
**Causa:** O teu user não tem `app_role = 'admin'` em `user_profiles`  
**Solução:** Executar a query SQL do Passo 1 novamente

### Erro: "Edge Function not found"
**Causa:** Edge Function não foi deployed  
**Solução:** Executar `supabase functions deploy invite-clinic-user`

### Convite não chega ao email
**Causa:** Email provider pode estar a bloquear  
**Verificar:**
- Dashboard → Authentication → Logs
- Ver se o convite foi enviado
- Verificar spam folder

---

## 📋 Próximos Passos

Após testar com sucesso:

- [ ] Criar um clinic_user de teste
- [ ] Verificar que o clinic_user só vê a sua clínica
- [ ] Testar RLS (clinic_user não deve ver outras clínicas)
- [ ] Atualizar página de login (remover Sign Up público)

---

## 🆘 Se algo correr mal

Podes reverter a migration:

```sql
-- REVERTER: Apagar tabelas criadas
DROP TABLE IF EXISTS public.user_clinic_access CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- REVERTER: Remover funções
DROP FUNCTION IF EXISTS auth.user_role() CASCADE;
DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.user_clinic_ids() CASCADE;

-- Recriar policy antiga das clinicas
CREATE POLICY "Enable all access for authenticated users" 
ON public.clinics FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
```

---

**Boa sorte! 🚀**

Qualquer dúvida, avisa!
