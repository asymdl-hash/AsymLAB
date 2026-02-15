
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

### ⏳ Ativação (servidor local):
- [ ] Ativar no Windows Task Scheduler do servidor local (requer admin):
  ```powershell
  schtasks /create /tn "AsymLAB_Backup_Supabase" /tr "F:\AsymLAB\scripts\backup-daily.bat" /sc daily /st 23:30 /f /rl HIGHEST
  ```
  > **Nota:** O servidor local é o responsável pelos backups automáticos. O Vercel serve apenas para manter a app online e acessível. O agendamento é uma tarefa operacional — todo o código necessário já está pronto.

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

### ⏳ Pendente — RLS e Convite por Clínica:

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

#### 3.2 Módulos controlados: ✅
| Módulo | Admin | Médico | Staff Clínica | Utilizador Clínica |
|--------|-------|--------|---------------|-------------------|
| Dashboard | ✅ Total | ✅ Total | 👁️ Leitura | 👁️ Leitura |
| Clínicas | ✅ Total | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura |
| Pacientes | ✅ Total | ✅ Total* | 👁️ Leitura | 👁️ Leitura |
| Agenda | ✅ Total | ✅ Total | ✅ Total | 👁️ Leitura |
| Faturação | ✅ Total | 👁️ Leitura | ✅ Total | ❌ Sem Acesso |
| Relatórios | ✅ Total | 👁️ Leitura | 👁️ Leitura | ❌ Sem Acesso |
| Definições | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |

> *Médico tem acesso total mas apenas aos pacientes que lhe estão associados (ver §3.3)

#### 3.3 ⏳ RLS (Row Level Security) no Supabase — PENDENTE:
Regras de visibilidade dos dados — **quem vê o quê:**

```
Hierarquia de acesso a pacientes:
├── Admin → Vê TODOS os pacientes de TODAS as clínicas
├── Médico → Vê apenas pacientes em que ele é o médico associado
├── Clínica (Staff/User) → Vê todos os pacientes dessa clínica
│   └── Baseado na tabela user_clinic_access
│       → Qualquer user associado à clínica X pode ver pacientes da clínica X
└── Sem associação → Não vê nenhum paciente
```

**Implementação técnica:**
- Usar `user_clinic_access` para determinar a que clínicas o user tem acesso
- Usar a relação `paciente <-> clínica` para filtrar pacientes
- Usar a relação `paciente <-> médico` para filtrar por médico associado
- RLS policies no Supabase aplicam estas regras automaticamente
- O frontend também filtra para UX (mas a segurança real é no backend/RLS)

#### 3.4 ⏳ Convite por Clínica — PENDENTE:
- Botão na **ficha da clínica** para criar acesso rápido
- Pré-preenche com dados da clínica (email, nome)
- Associa automaticamente o `clinic_id` ao novo utilizador
- Mostra estado do convite (enviado / pendente / aceito)
- Opção de criar com username (para secretárias/staff sem email pessoal)

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

## Prioridades Atualizadas
1. ~~Implementar script de backup~~ ✅ V1.7.0
2. ~~Painel de backups nas Definições~~ ✅ V1.7.0
3. ~~Implementar gestão de utilizadores~~ ✅ V1.9.0
4. ~~Login por username~~ ✅ V1.9.0
5. ~~Ícone de ajuda no login~~ ✅ V1.9.4
6. [ ] **Sistema de permissões granulares** (frontend - 3 niveis por modulo)
7. [ ] **RLS policies no Supabase** (backend - filtros por clinica/medico)
8. [ ] **Convite por clinica** (botao na ficha da clinica)
9. [ ] Ativar Task Scheduler no servidor local (operacional)
10. [ ] Migracao NAS (quando adquirida)
