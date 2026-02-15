
# Plano de Implementação: Backup, NAS e Segurança

---

## 1. Redundância de Dados — Backup Local ✅ IMPLEMENTADO (V1.7.0 → V1.9.0)

**Objetivo:** Manter uma cópia local (JSON) da base de dados Supabase.

### ✅ O que já está implementado:
- **Script de Backup:** `scripts/backup-supabase.js`
  - Conecta ao Supabase via `supabase-js`
  - **3 modos de backup:** FULL, INCREMENTAL e AUTO (V1.9.0)
  - Exporta todas as tabelas para JSON com paginação
  - Guarda em `F:\AsymLAB\DB\Supabase\backups\FULL_YYYY-MM-DD_HH-MM-SS\` ou `INCR_...`
  - Metadata v3.0 com tipo, timestamp, row counts, status
  - `_summary.json` para backups incrementais
  - Limpeza automática de backups antigos (retenção configurável)
  - Log em `DB\Supabase\logs\backup.log`

- **Batch Wrapper:** `scripts/backup-daily.bat`
  - Para execução via Task Scheduler ou duplo-clique

- **Configuração:** `DB\Supabase\config.json`
  - Path base, retenção, horário, lista de tabelas
  - `default_mode: "auto"` — modo de backup padrão (V1.9.0)
  - `full_backup_interval_days: 7` — consolida com FULL a cada N dias (V1.9.0)
  - Preparado para transição NAS (alterar `base_path`)

- **API Route:** `src/app/api/backup/route.ts`
  - `POST /api/backup` — trigger manual (aceita `{ mode: "full"|"incremental"|"auto" }`) (V1.9.0)
  - `GET /api/backup` — info do último backup + último FULL + contagens por tipo (V1.9.0)

- **API de Config:** `src/app/api/backup/config/route.ts`
  - `GET /api/backup/config` — ler config + lista backups + stats (total_full, total_incremental) (V1.9.0)
  - `PUT /api/backup/config` — atualizar config (inclui default_mode, full_backup_interval_days) (V1.9.0)

- **Painel de Definições:** `src/app/dashboard/settings/page.tsx`
  - `src/components/settings/BackupSettings.tsx`
  - Cards de estatísticas: total (split Full/Incr), espaço, tabelas, modo atual (V1.9.0)
  - Seletor visual de modo: Automático, Sempre Full, Sempre Incremental (V1.9.0)
  - Configuração editável (path, retenção, horário, intervalo FULL) (V1.9.0)
  - Toggle automático on/off
  - Botão "Backup Agora" com dropdown para forçar modo (V1.9.0)
  - Histórico visual com badges `FULL` (azul), `INCR` (verde), `Manual` (roxo) (V1.9.0)

### ✅ Ativação (servidor local):
- [x] Task Scheduler ativo: `AsymLAB_Backup_Supabase` — diário às 23:30
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

## 2. Migração para NAS 🔜 FUTURO (Adiado)

> **Nota:** Esta tarefa será implementada quando a NAS for adquirida. Não é prioritária neste momento.

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

---

## 3. Acesso & Segurança (Gestão de Utilizadores)
**Objetivo:** Permitir criar utilizadores para clínicas com acesso restrito e granular.

### ✅ Implementado (V1.9.0):
- **Login por Username:** Utilizadores podem fazer login com email ou username
  - Username é convertido internamente para `username@asymlab.app`
  - Campo de login aceita ambos os formatos
  - "Esqueci-me da password" só aparece para emails reais (com @)
- **API de Gestão de Utilizadores:** `src/app/api/users/route.ts`
  - `GET /api/users` — lista todos os users com profiles, roles e clínicas
  - `POST /api/users` — criar user (username ou email)
  - `PATCH /api/users` — reset password, alterar role/nome, eliminar
  - Usa `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Painel de Gestão:** `src/components/settings/UserManagement.tsx`
  - Lista de utilizadores com avatares, badges de role, tipo de login
  - Modal "Novo Utilizador" (toggle username/email, roles)
  - Modal "Resetar Password"
  - Eliminar utilizador com confirmação
  - Integrado em Definições > Utilizadores
- **Variável de Ambiente:** `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel



### ✅ Implementado (V1.10.0 / V1.10.2) — Permissões Granulares por Role:

#### 3.1 Sistema de Permissões (3 Níveis) ✅
Cada módulo da app suporta **3 níveis de acesso**, configuráveis por role:

| Nível | Descrição | Ações Permitidas |
|-------|-----------|-----------------| 
| **Sem Acesso** | Menu completamente escondido | Nada — o módulo não aparece na sidebar/navegação |
| **Só Leitura** | Pode ver mas não alterar | Ver dados, abrir imagens/ficheiros. **Não pode** editar, eliminar ou adicionar. |
| **Acesso Total** | Pode fazer tudo | Editar campos, anexar ficheiros, criar novos registos, eliminar |

**Ficheiros implementados:**
- `src/lib/permissions.ts` — Matriz de permissões, tipos, helper functions
- `src/contexts/AuthContext.tsx` — Provider global com role do user, funções hasAccess/canEdit/isReadOnly
- `src/components/PermissionGuard.tsx` — Componente reutilizável + hook `useModulePermission`
- `src/components/Sidebar.tsx` — Sidebar dinâmica com filtro de menu e badges "Leitura"
- `src/app/dashboard/page.tsx` — Dashboard protegido, botão "Novo Paciente" condicional
- `src/app/dashboard/clinics/layout.tsx` — Layout clínicas protegido com banner read-only
- `src/app/dashboard/settings/page.tsx` — Definições restritas a Admin
- `src/components/clinics/ClinicForm.tsx` — Formulário com `<fieldset disabled>` para read-only

#### 3.2 Módulos controlados: ✅ (Atualizado V1.8.0)
| Módulo | Admin | Médico | Utilizador Clínica | Staff Clínica | Staff Lab |
|--------|-------|--------|-------------------|---------------|----------|
| Dashboard | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ✅ Total |
| Clínicas | ✅ Total | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura |
| Pacientes | ✅ Total | ✅ Total* | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura |
| Agenda | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |
| Faturação | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |
| Relatórios | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |
| Definições | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |

> *Médico tem acesso total mas apenas aos pacientes que lhe estão associados (ver §3.3)

#### 3.3 ✅ RLS (Row Level Security) no Supabase — IMPLEMENTADO (V1.11.0):
Regras de visibilidade dos dados — **quem vê o quê:**

```
Hierarquia de acesso (implementada V1.8.0):
├── Admin (app_role='admin') → Vê TUDO, edita TUDO
├── Médico (app_role='doctor') → Vê clínicas e pacientes associados
├── Utilizador Clínica (app_role='clinic_user') → Vê clínicas associadas (leitura)
├── Staff Clínica (app_role='staff_clinic') → Vê clínicas associadas (leitura)
└── Staff Lab (app_role='staff_lab') → Dashboard + clínicas + pacientes (leitura)
```

**Helper Functions criadas:**
- `get_user_role()` — Retorna o app_role do utilizador autenticado
- `is_admin()` — Verifica se é admin
- `get_user_clinic_ids()` — Retorna IDs das clínicas associadas ao user

**Tabelas protegidas com RLS:**
| Tabela | RLS | Policies | Lógica |
|--------|-----|----------|--------|
| `user_profiles` | ✅ | 7 | User vê o seu, Admin vê todos |
| `user_clinic_access` | ✅ | 4 | User vê as suas associações, Admin vê todas |
| `clinics` | ✅ | 6 | Admin vê todas, outros só clínicas associadas |
| `clinic_contacts` | ✅ | 5 | Segue a clínica-mãe |
| `clinic_delivery_points` | ✅ | 5 | Segue a clínica-mãe |
| `clinic_staff` | ✅ | 5 | Segue a clínica-mãe |
| `clinic_discounts` | ✅ | 5 | Segue a clínica-mãe |
| `organization_settings` | ✅ | 3 | Qualquer autenticado lê, só Admin edita |

**Ficheiro de migração:** `supabase/migrations/20260215_rls_policies.sql`

> **Nota:** As API routes usam `service_role_key` que bypassa RLS. As policies aplicam-se ao client Supabase (anon key) usado pelo frontend.
> **⏳ Futuro:** Quando a tabela de pacientes migrar para Supabase, será necessário criar policies adicionais para filtrar por médico associado.

#### 3.4 ✅ Convite por Clínica — IMPLEMENTADO:
- ✅ Tab "Segurança & Acessos" na ficha da clínica (`ClinicSecurityTab.tsx`)
- ✅ Criar utilizador com username (para staff sem email pessoal)
- ✅ Associa automaticamente o `clinic_id` ao novo utilizador
- ✅ Envio de credenciais via WhatsApp (`handleSendWhatsApp`)
- ✅ Copiar credenciais para clipboard
- ✅ Remover acesso de utilizador à clínica
- ✅ Edge Function: `supabase/functions/invite-clinic-user`

---

## 4. Login ✅ IMPLEMENTADO (V1.9.0)
- ~~Remover opção de "Sign Up" público no componente de Login.~~ ✅ Já não existe
- ~~Manter apenas "Sign In" e "Esqueci a Password".~~ ✅ Implementado
- ✅ Login aceita email ou username
- ✅ "Esqueci a Password" condicional (só para emails reais)

### ✅ Implementado (V1.9.4):
- ✅ **Ícone de ajuda (ℹ️) no campo "Email ou Username":**
  - Ícone `HelpCircle` clicável ao lado da label
  - Ao clicar, abre popover com explicação
  - Fecha ao clicar fora ou no X
  - Design discreto e responsivo

---

## Arquitetura dos Ambientes

```
┌─────────────────────────────────────────────────┐
│             Supabase (Cloud)                     │
│  Base de dados principal — fonte de verdade      │
│  Auth, Storage, RLS, Edge Functions              │
└────────────┬──────────────────┬──────────────────┘
             │                  │
     ┌───────▼───────┐  ┌──────▼───────────────┐
     │   Vercel       │  │   Servidor Local      │
     │   (Produção)   │  │   (PC/NAS)            │
     │                │  │                        │
     │  • App online  │  │  • App local           │
     │    24/7         │  │  • Backups automáticos │
     │  • Acessível   │  │  • Task Scheduler      │
     │    de qualquer  │  │  • Dados locais        │
     │    lugar        │  │    (redundância)       │
     └────────────────┘  └────────────────────────┘
```

---

## 5. Backup Incremental ✅ IMPLEMENTADO (V1.9.0)

**Objetivo:** Sistema inteligente que só descarrega dados alterados desde o último backup, poupando tempo, banda e espaço.

### ✅ O que foi implementado:

#### 5.1 Migração SQL (Supabase)
- Função trigger reutilizável `handle_updated_at()` em todas as tabelas
- Coluna `updated_at` adicionada a: `clinics`, `clinic_contacts`, `clinic_delivery_points`, `clinic_staff`, `clinic_discounts`, `organization_settings`, `user_clinic_access`
- Migração aplicada via MCP: `add_updated_at_to_all_tables`

#### 5.2 Lógica de 3 Modos (Script + API)

| Modo | Comportamento |
|------|---------------|
| **AUTO** (padrão) | FULL se sem base ou último FULL > N dias, senão INCREMENTAL |
| **FULL** | Backup completo de todas as tabelas + infraestrutura |
| **INCREMENTAL** | Só dados alterados desde o último backup (added/modified/deleted) |

#### 5.3 Estrutura de pastas:
```
backups/
├── FULL_2026-02-15_23-30/       ← Backup base completo
│   ├── tabela.json              (todos os registos)
│   ├── _metadata.json           (version: 3.0, type: "full")
│   └── _infrastructure/         (schema, auth, RLS, functions)
│
├── INCR_2026-02-16_23-30/       ← Apenas diferenças
│   ├── tabela.json              { added: [], modified: [], deleted_ids: [] }
│   ├── _metadata.json           (type: "incremental", base_backup, since)
│   └── _summary.json            (contagem de mudanças por tabela)
│
└── FULL_2026-02-22_23-30/       ← Consolidação semanal automática
```

#### 5.4 Ficheiros modificados:
| Ficheiro | Versão |
|----------|--------|
| `scripts/backup-supabase.js` | Reescrito com 3 modos, CLI `--mode` |
| `src/app/api/backup/route.ts` | POST aceita `{ mode }`, GET retorna info FULL/INCR |
| `src/app/api/backup/config/route.ts` | Novos campos: `default_mode`, `full_backup_interval_days` |
| `DB/Supabase/config.json` | `default_mode: "auto"`, `full_backup_interval_days: 7` |
| `src/components/settings/BackupSettings.tsx` | Badges, dropdown, seletor de modo, stats por tipo |

---

## 6. Optimização de Performance ✅ PARCIAL (V1.9.1)

**Objetivo:** Maximizar a velocidade da app na Vercel e Supabase.

### ✅ Implementado (V1.9.1):

#### 6.1 Indexes no Supabase
Adicionados indexes de `clinic_id` nas tabelas filhas para acelerar queries de filtro:
- `idx_clinic_contacts_clinic` → `clinic_contacts(clinic_id)`
- `idx_clinic_delivery_points_clinic` → `clinic_delivery_points(clinic_id)`
- `idx_clinic_staff_clinic` → `clinic_staff(clinic_id)`
- `idx_clinic_discounts_clinic` → `clinic_discounts(clinic_id)`

> Migração: `add_performance_indexes`

#### 6.2 Edge Runtime (API Routes)
3 API routes migradas para Edge Runtime (elimina cold starts de 1-3s):
- `src/app/api/users/route.ts` → `export const runtime = 'edge'`
- `src/app/api/users/clinic-access/route.ts` → `export const runtime = 'edge'`
- `src/app/api/my-account/route.ts` → `export const runtime = 'edge'`

> **Nota:** As routes de backup (`/api/backup/*`) usam `fs` e `child_process` — incompatíveis com Edge Runtime.

### 🔜 Reavaliação Futura (quando a app crescer):

| Área | Quando reavaliar | O que analisar |
|------|------------------|----------------|
| **Caching (revalidate)** | Se migrar para Server Components | Aplicar `revalidate` nas páginas que mudam pouco |
| **Bundle Size** | Se adicionar novas libs pesadas | Correr `npx @next/bundle-analyzer` |
| **Connection Pooling** | Se usar ORM (Prisma/Drizzle) | Configurar PgBouncer no Supabase |
| **Supabase Pro ($25/mês)** | Se ultrapassar 500MB dados ou 5GB bandwidth | Avaliar necessidade |
| **Vercel Pro ($20/mês)** | Se API routes demorarem >10s ou precisar de builds paralelas | Avaliar necessidade |

> **Análise completa:** Ver relatório detalhado na conversa de 15/02/2026.

---

## Prioridades Atualizadas
1. ~~Implementar script de backup~~ ✅ V1.7.0
2. ~~Painel de backups nas Definições~~ ✅ V1.7.0
3. ~~Implementar gestão de utilizadores~~ ✅ V1.9.0
4. ~~Login por username~~ ✅ V1.9.0
5. ~~Ícone de ajuda no login~~ ✅ V1.9.4
6. ~~Sistema de permissões granulares~~ ✅ V1.10.0 / V1.10.2
7. ~~RLS policies no Supabase~~ ✅ V1.11.0
8. ~~Convite por clínica~~ ✅ (ClinicSecurityTab + Edge Function)
9. ~~Novos roles (Staff Lab, Staff Clínica) + Avatar~~ ✅ V1.8.0
10. ~~Ativar Task Scheduler no servidor local~~ ✅ (operacional — configurado via Wizard)
11. ~~Backup Incremental~~ ✅ V1.9.0 (FULL/INCR/AUTO com updated_at triggers)
12. ~~Optimização de Performance~~ ✅ V1.9.1 (Indexes + Edge Runtime)
13. [ ] Migração NAS (quando adquirida)
14. [ ] Reanálise de Performance (quando app crescer — ver §6)
