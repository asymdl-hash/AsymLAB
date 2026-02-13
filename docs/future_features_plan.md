
# Plano de Implementação: Backup NAS e Segurança

## 1. Redundância de Dados (NAS Local)
**Objetivo:** Manter uma cópia local (JSON/SQLite) da base de dados Supabase na diretoria `F:\AsymLAB\DB`.

**Estratégia Técnica:**
Uma vez que o browser (Frontend) não tem permissão para escrever diretamente no sistema de ficheiros local (`F:\`) por razões de segurança, a solução deve ser um **Script de Automação**.

**Componentes:**
1.  **Script de Backup (Node.js):**
    - Localização: `scripts/sync-db-local.ts`
    - Funcionalidade:
        - Conecta ao Supabase via `supabase-js`.
        - Descarrega todas as tabelas críticas (clinics, patients, contacts, logs).
        - Guarda os dados em ficheiros JSON estruturados em `F:\AsymLAB\DB\YYYY-MM-DD\`.
        - Descarrega novos logos e imagens para `F:\AsymLAB\DB\Assets\`.
2.  **Agendamento:**
    - Pode ser executado manualmente via `npm run backup:local`.
    - Ou configurado no Windows Task Scheduler para correr todas as noites.

## 2. Acesso & Segurança (Gestão de Utilizadores)
**Objetivo:** Permitir criar utilizadores para clínicas com acesso restrito.

**Fluxo de Implementação:**
1.  **Nova Aba "Acesso & Segurança" (`ClinicSecurityTab`):**
    - **Interface:** Botão "Criar Acesso Clínica".
    - **Lógica:** Usa o e-mail da ficha da clínica.
    - **Estado:** Mostra se o convite foi enviado / pendente / aceito.
2.  **Backend (API Segura):**
    - Criar endpoint `POST /api/admin/invite-clinic-user`.
    - Usa `supabase.auth.admin.inviteUserByEmail(email)` (requer Service Role Key).
    - Envia e-mail automático do Supabase com link para definir password.
3.  **Permissões (RLS):**
    - Criar nova regra na DB: Utilizadores com role `clinic_user` apenas veem registos onde `clinic_id` corresponde à sua clínica.
    - É necessário uma tabela de ligação `profile_clinics` para associar o `auth.uid()` ao `clinic_id`.

## 3. Login
- Remover opção de "Sign Up" público no componente de Login.
- Manter apenas "Sign In" e "Esqueci a Password".

**Próximos Passos Sugeridos:**
1.  Validar este plano.
2.  Implementar a Aba "Acesso & Segurança" (Frontend).
3.  Desenvolver o script de backup.
