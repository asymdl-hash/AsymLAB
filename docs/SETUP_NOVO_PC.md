# 🚀 Guia de Setup — AsymLAB num Novo PC

> [!IMPORTANT]
> **Para o Antigravity:** Este documento contém TODAS as instruções para configurar o ambiente de desenvolvimento no novo PC. O utilizador já completou as Fases 1 e 2. O teu trabalho é executar **sequencialmente da Fase 3 em diante**.

---

## 📋 Ordem Cronológica

| Fase | Quem | O quê | Quando |
|------|------|-------|--------|
| 1 | 👤 Utilizador | Instalar Node, Git, VS Code + Antigravity | Antes de tudo |
| 2 | 👤 Utilizador | Copiar `F:\AsymLAB` para o novo PC | Após instalar |
| 3 | 🤖 Antigravity | Configurar ficheiros do Antigravity | 1ª coisa a executar |
| 4 | 🤖 Antigravity | Verificar ambiente e dependências | Após configurar |
| 5 | 🤖 Antigravity | Testar dev server e funcionalidades | Após verificar |
| 6 | 🤖 Antigravity | Optimizações proactivas | Após tudo funcionar |
| 7 | 🤖 Antigravity | Configurar Task Scheduler para backup | Após optimizações |

---

## Fase 1 — Instalar Ferramentas (👤 Manual — Já feito)

| Ferramenta | Versão | Download |
|-----------|--------|----------|
| **Node.js** | v24+ | https://nodejs.org |
| **Git** | 2.53+ | https://git-scm.com/download/win |
| **VS Code** | Latest | https://code.visualstudio.com |
| **Gemini Code Assist** | Latest | VS Code Extensions (Ctrl+Shift+X) |

Após instalar:
```powershell
git config --global user.name "Fábio Dias"
git config --global user.email "asymdl@gmail.com"
```

---

## Fase 2 — Copiar o Projecto (👤 Manual — Já feito)

Copiar **toda** a pasta `F:\AsymLAB` do PC antigo para `F:\AsymLAB` no novo portátil.

Isto inclui: código, `.env.local`, `node_modules`, `DB/`, `.agent/`, `docs/`, `.git/`, tudo.

---

## Fase 3 — Configurar Ficheiros do Antigravity (🤖 Executar)

> [!CAUTION]
> Estes ficheiros ficam na pasta do **utilizador do Windows**, NÃO no projecto. Têm de ser criados com os comandos abaixo.

### 3.1 Criar directória

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gemini\antigravity"
```

### 3.2 Criar `GEMINI.md` (Regras Globais)

Criar `$env:USERPROFILE\.gemini\GEMINI.md` com este conteúdo exacto:

```
Responde-me sempre em português

Controlo de Versão (Git/GitHub):

Toda a alteração significativa deve ser acompanhada de um comando de commit.

Padrão de Versão: As versões devem seguir rigorosamente o formato V1.0.0 (Semantic Versioning).

Commits: Cada funcionalidade finalizada deve gerar uma sugestão de commit com a versão atualizada (ex: git commit -m "V1.1.0: Implementação do modo Full Screen na Ficha do Paciente").

Regra de Arquitetura PWA e Responsividade Total
"O projeto deve ser desenvolvido como uma PWA (Progressive Web App) de alto desempenho, seguindo estas diretrizes rigorosas:

1. Compatibilidade Multi-dispositivo (Obrigatório):

A interface deve ser totalmente responsiva e adaptável, garantindo uma experiência nativa em Desktop, Tablets e Smartphones.

Deves utilizar uma abordagem Mobile-first para a estrutura base, mas implementar breakpoints específicos para otimizar o layout em Desktop (aproveitando o espaço horizontal) e Tablets (modo híbrido).

2. Funcionalidades PWA:

Implementação obrigatória de um manifest.json completo (ícones, cores de tema, modo standalone).

Configuração de Service Workers com estratégia de cache offline eficiente, permitindo que as funcionalidades críticas (como consulta da Ficha do Paciente) funcionem mesmo sem internet.
```

### 3.3 Criar `mcp_config.json` (MCP Servers)

Criar `$env:USERPROFILE\.gemini\antigravity\mcp_config.json` com este JSON:

```json
{
  "mcpServers": {
    "github-mcp-server": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": ""
      }
    },
    "supabase-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_19289a665899b9203afd42fc46e38388e9d9abbf"
      ],
      "env": {}
    }
  }
}
```

### 3.4 Verificar criação

```powershell
Test-Path "$env:USERPROFILE\.gemini\GEMINI.md"                    # True
Test-Path "$env:USERPROFILE\.gemini\antigravity\mcp_config.json"  # True
```

> [!NOTE]
> Após criar estes ficheiros, **reiniciar o VS Code** para o Antigravity carregar as novas configurações. Depois voltar a pedir para continuar com a Fase 4.

### MCP Servers

| Server | Para que serve | Requisitos |
|--------|---------------|------------|
| **supabase-mcp-server** | SQL, tabelas, migrações, logs, edge functions | Node.js + npx |
| **github-mcp-server** | Repos, issues, PRs | Docker (opcional) |

---

## Fase 4 — Verificar Ambiente e Dependências (🤖 Executar)

### 4.1 Verificar versões

```powershell
cd F:\AsymLAB
node --version   # v24+
npm --version    # 11+
git --version    # 2.53+
```

### 4.2 Verificar repositório

```powershell
git status       # Deve estar clean
git log -n 3     # Últimos 3 commits
```

### 4.3 Verificar `.env.local` existe

```powershell
Test-Path "F:\AsymLAB\.env.local"  # Deve ser True
```

Se `False`, criar com estas variáveis:
```env
NEXT_PUBLIC_SUPABASE_URL=https://kfnrstxrhaetgrujyjyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTYwMjAsImV4cCI6MjA4NjQzMjAyMH0.qEIPkMsveSzj9WxVg1cTH3MYa3-HNoCplPgzXxElZRU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg1NjAyMCwiZXhwIjoyMDg2NDMyMDIwfQ.nJK6WilQl0VSdd4w0BpHeLycQjF9lnWTkRBVtL_coKY
GMAIL_USER=asymdl@gmail.com
GMAIL_APP_PASSWORD=hgaqezeqlqoipjvv
```

### 4.4 Se `node_modules` estiver corrompido ou em falta

```powershell
Remove-Item -Recurse -Force F:\AsymLAB\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force F:\AsymLAB\node_modules -ErrorAction SilentlyContinue
cd F:\AsymLAB
npm install
```

---

## Fase 5 — Testar Dev Server e Funcionalidades (🤖 Executar)

### 5.1 Arrancar dev server

```powershell
cd F:\AsymLAB
npm run dev
```

### 5.2 Abrir no browser e verificar

Abrir http://localhost:3000 e testar:
- [ ] Login: `asymdl@gmail.com` / `FabioDias123?!`
- [ ] Dashboard carrega correctamente
- [ ] Sidebar mostra todos os módulos
- [ ] Definições → Utilizadores → "Dr. João Alves" é link azul clicável
- [ ] Clicar no nome → Ficha do médico com hero header
- [ ] Tab "Dados" → Clínicas e parceiros carregam
- [ ] Modal parceiros → Adicionar/remover funciona

### 5.3 Testar build de produção

```powershell
npx next build
```

> ⚠️ **NUNCA** usar pipes (`|`, `Select-Object`) com `next build` no PowerShell — bloqueia!

### 5.4 Testar backup

```powershell
node scripts/backup-supabase.js
```

### 5.5 Testar MCP Supabase

Executar internamente: listar tabelas do Supabase via MCP.
Resultado esperado: 10 tabelas no schema public.

---

## Fase 6 — Optimizações Proactivas (🤖 Executar)

> [!TIP]
> Estamos num PC novo — é a oportunidade de resolver issues e começar limpo.

### 6.1 Integridade do Git

```powershell
cd F:\AsymLAB
git fsck --full
git gc --aggressive
```

### 6.2 Verificar TypeScript

```powershell
npx tsc --noEmit
```

Se houver erros, analisar e corrigir. Notas:
- `supabase/functions/` tem `@ts-nocheck` — ignorar
- `tsconfig.json` inclui apenas `src/**/*.ts` — nunca alterar para `**/*.ts`

### 6.3 Verificar Supabase — RLS e segurança

Usar MCP para executar:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Depois usar a tool `get_advisors` para security e performance.

### 6.4 Verificar config de backup

Abrir `DB/Supabase/config.json` e confirmar que todas as 10 tabelas estão listadas:
`clinics`, `clinic_contacts`, `clinic_delivery_points`, `clinic_discounts`, `delivery_point_contacts`, `organization_settings`, `user_profiles`, `user_clinic_access`, `doctor_profiles`, `doctor_clinic_partners`

### 6.5 Verificar sincronização de dados

```sql
-- Users sem profile
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE up.user_id IS NULL;

-- Phones desincronizados
SELECT up.user_id, up.phone as profile_phone, au.phone as auth_phone
FROM public.user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.phone IS NOT NULL AND (up.phone IS NULL OR up.phone = '');
```

Se encontrar dados desincronizados, corrigir.

### 6.6 Relatório final

Após todas as verificações, apresentar um relatório ao utilizador com:
- ✅ O que passou
- ⚠️ O que precisou de correcção (e o que foi feito)
- ❌ O que ainda precisa de atenção manual

---

## Fase 7 — Configurar Task Scheduler para Backup (🤖 Executar)

Criar a tarefa agendada para backup diário automático:

```powershell
schtasks /create /tn "AsymLAB - Backup Diario Supabase" /tr "F:\AsymLAB\scripts\backup-daily.bat" /sc daily /st 03:00 /f
```

Verificar que a tarefa foi criada:

```powershell
schtasks /query /tn "AsymLAB - Backup Diario Supabase" /fo LIST
```

Resultado esperado: tarefa listada com trigger diário às 03:00.

---

## 🗺️ Mapa do Projecto

```
F:\AsymLAB\
├── .agent/                    # Antigravity skills e workflows
│   └── workflows/
│       └── local-build.md     # /local-build — dev server + build
│
├── .env.local                 # ⚠️ CHAVES SECRETAS (não no Git!)
├── .vscode/settings.json      # TypeScript SDK + ESLint config
│
├── DB/Supabase/
│   ├── config.json            # Lista de tabelas para backup
│   ├── backups/               # Backups FULL/INCR por data
│   ├── logs/                  # Logs do backup
│   └── migrations/            # SQL migrations
│
├── docs/
│   ├── ACESSOS.md             # 🔐 Credenciais completas
│   ├── CHANGELOG.md           # Histórico de versões
│   ├── DEPLOY.md              # Guia de deploy
│   ├── future_features_plan.md # Roadmap + regras operacionais
│   ├── SETUP_NOVO_PC.md       # 👈 ESTE FICHEIRO
│   └── MANUAL_EDGE_FUNCTION_DEPLOY.md
│
├── scripts/
│   ├── backup-daily.bat       # Task Scheduler
│   ├── backup-supabase.js     # Engine backup FULL + Incremental
│   └── deploy-vercel.ps1      # Deploy alternativo
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── backup/        # POST — trigger backup
│   │   │   ├── my-account/    # PATCH — actualizar conta
│   │   │   ├── send-email/    # POST — email via Gmail SMTP
│   │   │   └── users/         # GET/POST — CRUD utilizadores
│   │   ├── auth/              # Callback auth
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Dashboard principal
│   │   │   ├── clinics/       # Módulo Clínicas
│   │   │   ├── doctors/       # Módulo Médicos
│   │   │   ├── minha-conta/   # A Minha Conta
│   │   │   └── settings/      # Definições
│   │   └── login/             # Login page
│   │
│   ├── components/
│   │   ├── Sidebar.tsx        # Navegação lateral
│   │   ├── PermissionGuard.tsx # RBAC guard
│   │   ├── clinics/           # Componentes de clínicas
│   │   ├── doctors/           # Ficha médico + parceiros + tabs
│   │   ├── settings/          # UserManagement.tsx
│   │   └── ui/                # Buttons, badges, etc.
│   │
│   ├── lib/
│   │   ├── supabase.ts        # Clientes Supabase
│   │   └── permissions.ts     # Sistema RBAC
│   │
│   └── services/
│       ├── clinicsService.ts  # CRUD clínicas
│       └── doctorsService.ts  # CRUD médicos + parceiros
│
├── supabase/functions/
│   └── invite-clinic-user/    # Edge Function (Deno)
│
├── next.config.js             # ignoreBuildErrors, outputFileTracing
├── tsconfig.json              # include: src/**/*.ts APENAS
├── vercel.json                # Região cdg1 (Paris), headers PWA
└── package.json               # Next 14.2, React 18, Supabase, TW4
```

---

## 📊 Schema Supabase

### Tabelas (schema `public`)

| Tabela | Descrição | FK |
|--------|-----------|-----|
| `clinics` | Clínicas | — |
| `clinic_contacts` | Contactos das clínicas | → `clinics.id` |
| `clinic_delivery_points` | Pontos de entrega | → `clinics.id` |
| `clinic_discounts` | Descontos por clínica | → `clinics.id` |
| `delivery_point_contacts` | Contactos pontos entrega | → `clinic_delivery_points.id` |
| `organization_settings` | Config da organização | — |
| `user_profiles` | Perfis (extensão auth.users) | → `auth.users.id` |
| `user_clinic_access` | User ↔ Clínica | → `user_profiles`, → `clinics` |
| `doctor_profiles` | Dados extra médicos | → `user_profiles.user_id` |
| `doctor_clinic_partners` | Parceiros por clínica | → `user_profiles` (x2), → `clinics` |

### Roles RBAC

| Role | Permissões |
|------|-----------|
| `admin` | Tudo |
| `doctor` | Ficha própria, clínicas |
| `staff_clinic` | Acesso à clínica |
| `accountant` | Faturação, relatórios |

### Edge Functions

| Função | Deploy | Descrição |
|--------|--------|-----------|
| `invite-clinic-user` | Supabase Dashboard | Convite users (auth + profile + access) |

---

## 🔑 Credenciais

### Supabase
- **Project URL:** `https://kfnrstxrhaetgrujyjyk.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTYwMjAsImV4cCI6MjA4NjQzMjAyMH0.qEIPkMsveSzj9WxVg1cTH3MYa3-HNoCplPgzXxElZRU`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg1NjAyMCwiZXhwIjoyMDg2NDMyMDIwfQ.nJK6WilQl0VSdd4w0BpHeLycQjF9lnWTkRBVtL_coKY`
- **MCP Access Token:** `sbp_19289a665899b9203afd42fc46e38388e9d9abbf`

### Admin
- **Email:** `asymdl@gmail.com`
- **Password:** `FabioDias123?!`

### Gmail SMTP
- **User:** `asymdl@gmail.com`
- **App Password:** `hgaqezeqlqoipjvv`

### Links

| Serviço | URL |
|---------|-----|
| App (Produção) | https://asym-lab-2.vercel.app |
| Vercel Dashboard | https://vercel.com/asymdl-hashs-projects/asym-lab-2 |
| Supabase Dashboard | https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk |
| GitHub Repo | https://github.com/asymdl-hash/AsymLAB |

---

## ⚙️ Configurações Críticas

### `next.config.js`
- `ignoreBuildErrors: true` — Erros TS não bloqueiam deploy
- `outputFileTracingExcludes` — Exclui `supabase/`, `docs/`, `scripts/`, `.db`

### `tsconfig.json`
- `include` restrito a `src/**/*.ts` — **NUNCA** usar `**/*.ts` (apanha Deno)
- Path alias: `@/*` → `./src/*`

### `vercel.json`
- Região: `cdg1` (Paris)
- Headers PWA: `sw.js` e `manifest.json`

### Build no PowerShell
- **NUNCA** usar pipes (`|`, `Select-Object`, `Out-String`) com `next build`
- Usar workflow `/local-build`

---

## 🧩 Contexto do Projecto

**AsymLAB** é uma PWA de gestão clínica odontológica. **Versão actual: V2.2.1**

### Stack
- Next.js 14.2.28 (App Router) + React 18 + TypeScript 5.3
- TailwindCSS 4 (`@tailwindcss/postcss`)
- Supabase (Auth com RBAC, PostgreSQL com RLS, Edge Functions)
- Deploy: Vercel (auto-deploy push `main`, região Paris)
- Backup: Node.js FULL + Incremental, Task Scheduler

### Módulos
1. **Autenticação** — Supabase Auth, 4 roles RBAC
2. **Dashboard** — Página principal
3. **Clínicas** — CRUD com contactos, pontos de entrega, descontos
4. **Médicos** — Ficha hero header, dados, email contacto, clínicas, parceiros, permissões
5. **Pacientes** — Ficha clínica, tratamentos, notas, fotos
6. **Utilizadores** — Tabela com roles, convites Edge Function, edição inline
7. **Backup** — FULL + Incremental com detecção changes

### Decisões de Design
- `user_profiles` é a **fonte de verdade** — nunca ler de `auth.users` para perfil
- `contact_email` separado do email de login em `user_profiles`
- Nome do médico como hiperligação na lista de utilizadores
- Parceiros geridos por clínica em `doctor_clinic_partners`
- Edge Function `invite-clinic-user` usa Deno, deploy manual

### Regras Obrigatórias
1. Responder **sempre em português**
2. Commits: **Semantic Versioning** `V1.0.0`
3. PWA responsiva — Mobile-first
4. Ao criar/editar tabelas → verificar `DB/Supabase/config.json`
5. Fonte de verdade = `user_profiles`
6. NUNCA pipes com `next build` no PowerShell
7. `tsconfig.json` include só `src/**/*.ts`
8. Edge function tem `@ts-nocheck` — é Deno

### Últimas Alterações (V2.2.0 — 16/02/2026)
- Nome do médico como link na lista de utilizadores
- Tabela `doctor_clinic_partners` criada com RLS
- Coluna `contact_email` adicionada a `user_profiles`
- Bug de parceiros corrigido no `ClinicPartnersModal.tsx`
- Telefone sincronizado `auth.users` → `user_profiles`
- Regras operacionais documentadas em `future_features_plan.md`

---

*Última actualização: 18/02/2026 (V2.2.1)*
