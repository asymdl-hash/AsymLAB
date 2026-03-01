# 🚀 Guia de Setup — AsymLAB num Novo PC

> [!IMPORTANT]
> **Para o Antigravity:** Este documento contém o estado actual do setup no novo PC. **Todas as Fases 1-7 estão concluídas (V2.2.5).** Quando retomares, lê a secção "Estado de Configuração" no final deste documento antes de começar qualquer trabalho.
>
> **Acção imediata:** Verificar se o MCP Supabase tem acesso total (apply_migration, execute_sql) — o token foi actualizado e pode precisar de reiniciar o VS Code.

---

## 📋 Estado Actual (18/02/2026)

| Fase | Estado | Resultado |
|------|--------|-----------|
| 1 | ✅ Concluída | Node.js v24.13.1, npm 11.8.0, Git 2.53.0, ExecutionPolicy RemoteSigned |
| 2 | ✅ Concluída | Projecto copiado para `F:\AsymLAB` |
| 3 | ✅ Concluída | `GEMINI.md` + `mcp_config.json` criados (Supabase + GitHub MCP sem Docker) |
| 4 | ✅ Concluída | Versões OK, git clean (main), `.env.local` existe, `npm install` OK (406 pkgs) |
| 5.1 | ✅ Concluída | Dev server arranca, HTTP 200, página login carrega |
| 5.2 | ✅ Concluída | Login OK — redireccionou para `/dashboard`, utilizador "Fabio Dias" autenticado |
| 5.3 | ✅ Concluída | `npx next build` → exit 0 |
| 5.4 | ✅ Concluída | Backup `status=success` — `doctor_profiles` removida do config, `updated_at` adicionada a `delivery_point_contacts` |
| 5.5 | ✅ Concluída | MCP Supabase OK — 9 tabelas listadas |
| 6.1 | ✅ Concluída | `git fsck` + `git gc --aggressive` sem erros |
| 6.2 | ✅ Concluída | `npx tsc --noEmit` sem erros |
| 6.3 | ✅ Concluída | RLS activo em 9/9 tabelas. 18 warnings documentados em `future_features_plan.md §10.4` |
| 6.4 | ✅ Concluída | `doctor_profiles` removida do código e config (V2.2.4) — ver `future_features_plan.md §10.1` |
| 6.5 | ✅ Concluída | 1 telefone desincronizado documentado em `future_features_plan.md §10.3` |
| 6.6 | ✅ Concluída | Next.js **14.2.28 → 14.2.34** (resolve SSRF, DoS, cache leak) |
| 7 | ✅ Concluída | `AsymLAB_Backup_Supabase` criado — diário às 03:00. Testado manualmente com sucesso |
| Acessos | ✅ Concluída | psql 17.8 instalado, Supabase CLI autenticado, MCP token actualizado (V2.2.5) |

---

## 🔧 O que foi feito antes de reiniciar

### Fase 1 — Instalar Ferramentas ✅

Instalado via `winget`:

| Ferramenta | Versão | Comando |
|-----------|--------|---------|
| Node.js | v24.13.1 | `winget install OpenJS.NodeJS.LTS` |
| npm | 11.8.0 | (incluído com Node.js) |
| Git | 2.53.0 | `winget install Git.Git` |

Configurações adicionais:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
git config --global user.name "Fábio Dias"
git config --global user.email "asymdl@gmail.com"
```

Variável `HOME` definida para o Playwright funcionar:
```powershell
[System.Environment]::SetEnvironmentVariable("HOME", $env:USERPROFILE, "User")
```

VS Code + Gemini Code Assist já estavam instalados (via download Antigravity).

---

### Fase 2 — Copiar o Projecto ✅

Projecto copiado pelo utilizador para `F:\AsymLAB` com todos os ficheiros.

---

### Fase 3 — Configurar Ficheiros do Antigravity ✅

#### Ficheiros criados:

**`%USERPROFILE%\.gemini\GEMINI.md`** — Regras globais (português, semver, PWA mobile-first)

**`%USERPROFILE%\.gemini\antigravity\mcp_config.json`** — MCP Servers:

```json
{
  "mcpServers": {
    "github-mcp-server": {
      "command": "C:\\Users\\asyml\\AppData\\Local\\github-mcp-server\\github-mcp-server.exe",
      "args": ["stdio"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    },
    "supabase-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
      ],
      "env": {}
    }
  }
}
```

> [!NOTE]
> O GitHub MCP server usa **binário local** (sem Docker). Descarregado de https://github.com/github/github-mcp-server/releases/tag/v0.30.3 para `%LOCALAPPDATA%\github-mcp-server\github-mcp-server.exe`

---

### Fase 4 — Verificar Ambiente ✅

| Verificação | Resultado |
|------------|-----------|
| `node --version` | v24.13.1 ✅ |
| `npm --version` | 11.8.0 ✅ |
| `git --version` | 2.53.0 ✅ |
| `git status` | Branch `main`, up to date ✅ |
| `git log -n 3` | V2.2.1 commits presentes ✅ |
| `.env.local` | Existe ✅ |
| `npm install` | 406 pacotes instalados ✅ |

> [!WARNING]
> `npm install` reportou que Next.js 14.2.28 tem uma vulnerabilidade de segurança. Investigar na Fase 6.
> Há pastas untracked no git (M2 Test, Permanent Com tubeira, etc.) — são ficheiros CAD/laboratoriais, não do projecto web.

---

### Fase 5.1 — Dev Server ✅

```
npm run dev → Next.js 14.2.28 pronto em 8s
HTTP GET http://localhost:3000 → Status 200, página de login presente
```

---

## 🤖 O que o próximo agente deve fazer (após reiniciar VS Code)

> [!IMPORTANT]
> Antes de tudo, verificar se o browser funciona tentando abrir http://localhost:3000.
> Se o browser continuar a falhar, pedir ao utilizador para testar manualmente no seu browser.

### Fase 5.2 — Testar no Browser

1. Arrancar dev server: `npm run dev` (a partir de `F:\AsymLAB`)
2. Abrir http://localhost:3000 no browser
3. Testar:
   - [ ] Login: `asymdl@gmail.com` / `FabioDias123?!`
   - [ ] Dashboard carrega correctamente
   - [ ] Sidebar mostra todos os módulos
   - [ ] Definições → Utilizadores → "Dr. João Alves" é link azul clicável
   - [ ] Clicar no nome → Ficha do médico com hero header
   - [ ] Tab "Dados" → Clínicas e parceiros carregam
   - [ ] Modal parceiros → Adicionar/remover funciona

### Fase 5.3 — Build de Produção

```powershell
npx next build
```

> ⚠️ **NUNCA** usar pipes (`|`, `Select-Object`) com `next build` no PowerShell — bloqueia!

### Fase 5.4 — Testar Backup

```powershell
node scripts/backup-supabase.js
```

### Fase 5.5 — Testar MCP Supabase

Executar internamente: listar tabelas do Supabase via MCP.
Resultado esperado: 10 tabelas no schema public.

---

### Fase 6 — Optimizações Proactivas

#### 6.1 Integridade do Git

```powershell
cd F:\AsymLAB
git fsck --full
git gc --aggressive
```

#### 6.2 Verificar TypeScript

```powershell
npx tsc --noEmit
```

- `supabase/functions/` tem `@ts-nocheck` — ignorar
- `tsconfig.json` inclui apenas `src/**/*.ts` — nunca alterar para `**/*.ts`

#### 6.3 Verificar Supabase — RLS e segurança

Usar MCP para executar:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Depois usar a tool `get_advisors` para security e performance.

#### 6.4 Verificar config de backup

Abrir `DB/Supabase/config.json` e confirmar que todas as 10 tabelas estão listadas:
`clinics`, `clinic_contacts`, `clinic_delivery_points`, `clinic_discounts`, `delivery_point_contacts`, `organization_settings`, `user_profiles`, `user_clinic_access`, `doctor_profiles`, `doctor_clinic_partners`

#### 6.5 Verificar sincronização de dados

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

#### 6.6 Investigar vulnerabilidade Next.js

O `npm install` reportou: Next.js 14.2.28 tem vulnerabilidade de segurança.
Ver https://nextjs.org/blog/security-update-2025-12-11 e avaliar se é necessário actualizar.

#### 6.7 Relatório final

Apresentar relatório com:
- ✅ O que passou
- ⚠️ O que precisou de correcção (e o que foi feito)
- ❌ O que ainda precisa de atenção manual

---

### Fase 7 — Configurar Task Scheduler para Backup

```powershell
schtasks /create /tn "AsymLAB - Backup Diario Supabase" /tr "F:\AsymLAB\scripts\backup-daily.bat" /sc daily /st 03:00 /f
```

Verificar:
```powershell
schtasks /query /tn "AsymLAB - Backup Diario Supabase" /fo LIST
```

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
│   ├── MANUAL_EDGE_FUNCTION_DEPLOY.md
│   └── _archive/              # 📦 Ficheiros históricos (não no Git)
│       ├── inspiration/       # Imagens de referência visual
│       ├── sql/               # Migrations antigas (pré-DB/)
│       ├── LOGO_Creation/     # Briefing do logo
│       ├── DEPLOYMENT_GUIDE_V1.2.0.md
│       ├── IMPLEMENTATION_SUMMARY_V1.2.0.md
│       ├── system_architecture_fixes.md
│       ├── system_architecture_update_clinics.md
│       ├── system_architecture_update_ux.md
│       └── roadmap_and_decisions.md
│
├── scripts/
│   ├── backup-daily.bat       # Task Scheduler
│   ├── backup-supabase.js     # Engine backup FULL + Incremental
│   ├── psql.js                # Wrapper psql → Supabase (node scripts/psql.js "SQL")
│   ├── deploy-vercel.ps1      # Deploy alternativo
│   └── generate-icons.js      # Gerar ícones PWA
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
- **Anon Key:** `[ver docs/ACESSOS.md]`
- **Service Role Key:** `[ver docs/ACESSOS.md]`
- **MCP Access Token:** `[ver docs/ACESSOS.md]` *(AsymLAB-Dev-PC, sem expiração — gerado 18/02/2026)*
- **DB Password:** `[ver docs/ACESSOS.md]` *(resetada 18/02/2026)*
- **Session Pooler:** `aws-1-eu-west-2.pooler.supabase.com:5432` | User: `postgres.kfnrstxrhaetgrujyjyk`

### GitHub
- **Conta:** `asymdl-hash`
- **Repo:** https://github.com/asymdl-hash/AsymLAB
- **Personal Access Token (MCP):** `[ver docs/ACESSOS.md]`
- **GitHub MCP Binary:** `%LOCALAPPDATA%\github-mcp-server\github-mcp-server.exe`

### Admin
- **Email:** `asymdl@gmail.com`
- **Password:** `[ver docs/ACESSOS.md]`

### Gmail SMTP
- **User:** `asymdl@gmail.com`
- **App Password:** `[ver docs/ACESSOS.md]`

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

**AsymLAB** é uma PWA de gestão clínica odontológica. **Versão actual: V2.2.5**

### Stack
- Next.js 14.2.34 (App Router) + React 18 + TypeScript 5.3
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

## 🖥️ O que é o psql e para que serve

### Definição

**`psql`** é o cliente de linha de comandos oficial do PostgreSQL — a base de dados que o Supabase usa internamente. É uma ferramenta de **desenvolvimento e administração**, não faz parte da aplicação em si.

### Analogia simples

| Ferramenta | Para quê |
|-----------|----------|
| Supabase Dashboard (browser) | Interface visual para gerir a base de dados |
| **psql** | A mesma coisa, mas em linha de comandos — mais rápido e automatizável |
| `@supabase/supabase-js` | O que a *aplicação* usa para ler/escrever dados |

### Quando usamos o psql

O psql é usado **exclusivamente durante o desenvolvimento** — nunca pela aplicação em produção. Usamos quando:

1. **Aplicar migrações DDL** — `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` — operações que alteram a estrutura da base de dados
2. **Depurar problemas** — verificar dados directamente, testar queries SQL complexas
3. **Automatizar tarefas** — o Antigravity pode executar SQL sem precisar do browser do Supabase
4. **Verificar o estado** — confirmar que uma migração foi aplicada correctamente

### O que NÃO é

- ❌ Não é parte da aplicação web
- ❌ Não é usado pelos utilizadores finais
- ❌ Não substitui o Supabase Dashboard para tarefas visuais
- ❌ Não é necessário para o deploy ou para o servidor de desenvolvimento

### Como usar no AsymLAB

Como a password tem caracteres especiais (`?!`), usamos um script wrapper:

```powershell
# Executar SQL directamente
node scripts/psql.js "SELECT count(*) FROM clinics;"

# Modo interactivo (prompt psql)
node scripts/psql.js

# Aplicar uma migração
node scripts/psql.js "ALTER TABLE clinics ADD COLUMN notes TEXT;"
```

O script `scripts/psql.js` já tem as credenciais configuradas e resolve automaticamente os problemas de caracteres especiais na password e SSL obrigatório.

> [!NOTE]
> O psql conecta via **Session Pooler** do Supabase (`aws-1-eu-west-2.pooler.supabase.com:5432`) com SSL obrigatório. A conexão directa à base de dados não está disponível nesta rede (requer IPv6).

---

## 🔧 Estado de Configuração (18/02/2026 — V2.2.5)

### ✅ Configurado e funcional

| Ferramenta | Versão/Estado | Como verificar |
|-----------|--------------|----------------|
| **Node.js** | v24.13.1 | `node --version` |
| **npm** | 11.8.0 | `npm --version` |
| **Git** | 2.53.0 | `git --version` |
| **Next.js** | 14.2.34 | `node -e "console.log(require('./package.json').dependencies.next)"` |
| **psql** | 17.8 | `node scripts/psql.js "SELECT 1;"` |
| **Supabase CLI** | 2.76.8 | `npx supabase projects list` |
| **MCP GitHub** | ✅ | Funciona (token em `mcp_config.json`) |
| **MCP Supabase** | ✅ | Funciona após reiniciar VS Code (token em `mcp_config.json`) |
| **Backup diário** | ✅ | Task Scheduler `AsymLAB_Backup_Supabase` às 03:00 |
| **Dev server** | ✅ | `npm run dev` → http://localhost:3000 |

### ⚠️ Pendente / Requer atenção

| Item | Descrição | Onde está documentado |
|------|-----------|----------------------|
| **MCP Supabase token** | Actualizado mas requer **reiniciar o VS Code** para activar | `%USERPROFILE%\.gemini\antigravity\mcp_config.json` |
| **Telefone desincronizado** | `ivoassistente@asymlab.app` tem phone no auth mas não no profile | `future_features_plan.md §10.3` |
| **18 warnings segurança** | RLS policies a corrigir gradualmente | `future_features_plan.md §10.4` |
| **28 warnings performance** | FK sem índices, políticas duplicadas | `future_features_plan.md §10.4` |

### 🗂️ Ficheiros de configuração importantes

| Ficheiro | O que contém |
|---------|-------------|
| `.env.local` | Chaves Supabase, DATABASE_URL — **não está no Git** |
| `%USERPROFILE%\.gemini\antigravity\mcp_config.json` | Tokens MCP (GitHub + Supabase) |
| `DB/Supabase/config.json` | Lista de tabelas para backup (9 tabelas) |
| `scripts/psql.js` | Wrapper psql com credenciais Supabase |
| `docs/ACESSOS_DIRECTOS.md` | Guia completo de acessos directos |
| `docs/ACESSOS.md` | Credenciais completas do projecto |

---

*Última actualização: 18/02/2026 — Setup completo V2.2.5 (Fases 1-7 + Acessos directos)*
