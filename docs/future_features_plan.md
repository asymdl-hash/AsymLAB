
# Plano de Implementação: Backup, NAS e Segurança

---

## 1. Redundância de Dados — Backup Local ✅ IMPLEMENTADO (V1.7.0)

**Objetivo:** Manter uma cópia local (JSON) da base de dados Supabase.

### ✅ O que já está implementado:
- **Script de Backup:** `scripts/backup-supabase.js`
  - Conecta ao Supabase via `supabase-js`
  - Exporta todas as tabelas para JSON com paginação
  - Guarda em `F:\AsymLAB\DB\Supabase\backups\YYYY-MM-DD_HH-MM-SS\`
  - Metadata com timestamp, row counts, status
  - Limpeza automática de backups antigos (retenção configurável)
  - Log em `DB\Supabase\logs\backup.log`

- **Batch Wrapper:** `scripts/backup-daily.bat`
  - Para execução via Task Scheduler ou duplo-clique

- **Configuração:** `DB\Supabase\config.json`
  - Path base, retenção, horário, lista de tabelas
  - Preparado para transição NAS (alterar `base_path`)

- **API Route:** `src/app/api/backup/route.ts`
  - `POST /api/backup` — trigger manual
  - `GET /api/backup` — info do último backup

- **API de Config:** `src/app/api/backup/config/route.ts`
  - `GET /api/backup/config` — ler config + lista backups + stats
  - `PUT /api/backup/config` — atualizar config

- **Painel de Definições:** `src/app/dashboard/settings/page.tsx`
  - `src/components/settings/BackupSettings.tsx`
  - Cards de estatísticas (total, espaço, tabelas)
  - Configuração editável (path, retenção, horário)
  - Toggle automático on/off
  - Botão "Backup Agora"
  - Histórico visual dos últimos 10 backups

### ⏳ Pendente:
- [ ] Agendar no Windows Task Scheduler (requer admin):
  ```powershell
  schtasks /create /tn "AsymLAB_Backup_Supabase" /tr "F:\AsymLAB\scripts\backup-daily.bat" /sc daily /st 23:30 /f /rl HIGHEST
  ```

### Tabelas monitorizadas:
| Tabela | Descrição |
|---|---|
| `clinics` | Dados das clínicas |
| `clinic_contacts` | Contactos das clínicas |
| `clinic_delivery_points` | Pontos de entrega |
| `clinic_staff` | Equipa/funcionários |
| `clinic_discounts` | Descontos |
| `organization_settings` | Configurações da organização |

> **Nota:** Ao criar novas tabelas no Supabase, adicionar ao array `tables` em `config.json` e ao array `TABLES` em `src/app/api/backup/route.ts`.

---

## 2. Migração para NAS 🔜 FUTURO

### Fase 1 — NAS como Drive de Rede (Simples, já suportado)
- A NAS aparece como drive de rede (ex: `Z:\AsymLAB\DB\Supabase`)
- O **PC continua a correr o backup**, mas guarda na NAS
- Basta alterar o path nas Definições da app
- **Requisito:** PC ligado na hora do backup
- **Sem instalação de software na NAS**

### Fase 2 — NAS Autónoma (Ideal, futuro)
Wizard passo-a-passo na app de Definições:

```
Passo 1: Escolher diretório da NAS
  └── Selecionar drive de rede montada
  └── App valida se o caminho é acessível e tem permissão de escrita

Passo 2: Copiar ficheiros para a NAS
  └── App copia automaticamente:
      - scripts/backup-supabase.js
      - DB/Supabase/config.json (com path atualizado)
      - .env.local (variáveis Supabase)

Passo 3: Instalar Node.js na NAS
  └── Depende da marca da NAS:
      - Synology → Package Center → Node.js
      - QNAP → App Center → Node.js
      - TrueNAS → pkg install node
  └── App mostra instruções específicas com screenshots

Passo 4: Agendar na NAS
  └── Synology → Task Scheduler no DSM
  └── QNAP → crontab via SSH
  └── TrueNAS → cron
  └── App gera o comando cron específico:
      30 23 * * * cd /caminho/backup && node backup-supabase.js

Passo 5: Verificação
  └── App tenta contactar a NAS e confirma que o backup corre
  └── Indica se a migração foi bem-sucedida
```

### ⚠️ Dependências da Fase 2:
- Marca/modelo da NAS (determina o sistema operativo)
- Acesso SSH à NAS
- Node.js disponível na NAS
- **Implementar quando a NAS for adquirida**

### Benefícios da NAS:
- ✅ Está sempre ligada (baixo consumo)
- ✅ PC não precisa de estar ligado
- ✅ Redundância física (RAID)
- ✅ Acessível de qualquer dispositivo na rede

---

## 3. Acesso & Segurança (Gestão de Utilizadores)
**Objetivo:** Permitir criar utilizadores para clínicas com acesso restrito.

**Fluxo de Implementação:**
1. **Nova Aba "Acesso & Segurança" (`ClinicSecurityTab`):**
    - **Interface:** Botão "Criar Acesso Clínica".
    - **Lógica:** Usa o e-mail da ficha da clínica.
    - **Estado:** Mostra se o convite foi enviado / pendente / aceito.
2. **Backend (API Segura):**
    - Criar endpoint `POST /api/admin/invite-clinic-user`.
    - Usa `supabase.auth.admin.inviteUserByEmail(email)` (requer Service Role Key).
    - Envia e-mail automático do Supabase com link para definir password.
3. **Permissões (RLS):**
    - Criar nova regra na DB: Utilizadores com role `clinic_user` apenas veem registos onde `clinic_id` corresponde à sua clínica.
    - É necessário uma tabela de ligação `profile_clinics` para associar o `auth.uid()` ao `clinic_id`.
4. **Restrição do Painel de Backups:**
    - Só visível para utilizadores com role `admin`
    - Esconder a tab "Backups" nas Definições para `clinic_user`

## 4. Login
- Remover opção de "Sign Up" público no componente de Login.
- Manter apenas "Sign In" e "Esqueci a Password".

---

## Prioridades
1. ~~Implementar script de backup~~ ✅
2. ~~Painel de backups nas Definições~~ ✅
3. [ ] Agendar Task Scheduler no PC
4. [ ] Implementar roles (admin vs clinic_user)
5. [ ] Aba "Acesso & Segurança"
6. [ ] Migração NAS (quando adquirida)
