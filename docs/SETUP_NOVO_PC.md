# 🚀 Guia de Setup — AsymLAB num Novo PC

> [!IMPORTANT]
> **Para o Antigravity:** Este documento contém TODAS as instruções para configurar o ambiente de desenvolvimento no novo PC. O utilizador já copiou a pasta `F:\AsymLAB` inteira. O teu trabalho é executar a **Fase 3** (criar os ficheiros de configuração) e a **Fase 6** (optimizações proactivas).

---

## 📋 Resumo do Processo

| Passo | Quem faz | O quê |
|-------|---------|-------|
| Fase 1 — Instalação | 👤 Utilizador | Instalar Node, Git, VS Code + Antigravity |
| Fase 2 — Copiar projecto | 👤 Utilizador | Copiar `F:\AsymLAB` do PC antigo |
| Fase 3 — Configurar Antigravity | 🤖 Antigravity | Criar `GEMINI.md` + `mcp_config.json` |
| Fase 4 — Task Scheduler | 👤 Utilizador | Criar tarefa de backup diário |
| Fase 5 — Verificação | 🤖 Antigravity | Testar dev server, build, e funcionalidades |
| Fase 6 — Optimizações | 🤖 Antigravity | Resolver issues proactivamente |

---

## Fase 1 — Instalação de Ferramentas (👤 Manual)

### Software Obrigatório

| Ferramenta | Versão | Download |
|-----------|--------|----------|
| **Node.js** | v24+ (LTS ou Current) | https://nodejs.org |
| **Git** | 2.53+ | https://git-scm.com/download/win |
| **VS Code** | Latest | https://code.visualstudio.com |
| **Extensão: Gemini Code Assist** | Latest | VS Code Extensions (Ctrl+Shift+X) |

### Após instalar (no PowerShell):

```powershell
git config --global user.name "Fábio Dias"
git config --global user.email "asymdl@gmail.com"
```

---

## Fase 2 — Copiar a Pasta do Projecto (👤 Manual)

Copiar **toda** a pasta `F:\AsymLAB` do PC antigo para `F:\AsymLAB` no novo portátil (pen USB, disco externo, ou rede).

### O que está incluído na cópia

| Item | Incluído? | Notas |
|------|-----------|-------|
| Código-fonte (`src/`) | ✅ | |
| `.env.local` (chaves secretas) | ✅ | Não está no Git — vem na cópia |
| `node_modules/` | ✅ | Pode ser apagado e reinstalado com `npm install` |
| `DB/Supabase/` (backups + config) | ✅ | |
| `.agent/` (skills + workflows) | ✅ | |
| `docs/` (toda a documentação) | ✅ | |
| `.git/` (histórico completo) | ✅ | |
| `.vscode/` (settings do projecto) | ✅ | |

---

## Fase 3 — Configurar o Antigravity (🤖 Executar com Antigravity)

> [!CAUTION]
> **Para o Antigravity:** Estes ficheiros ficam na pasta do **utilizador do Windows**, NÃO no projecto. Tens de os criar executando os comandos abaixo. Substituir `$env:USERPROFILE` resolve automaticamente para o username correcto.

### 3.1 Criar directórios

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gemini\antigravity"
```

### 3.2 Criar `GEMINI.md` (Regras Globais)

Criar o ficheiro `$env:USERPROFILE\.gemini\GEMINI.md` com o seguinte conteúdo exacto:

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

Criar o ficheiro `$env:USERPROFILE\.gemini\antigravity\mcp_config.json` com este JSON exacto:

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

### 3.4 Verificar que os ficheiros foram criados

```powershell
Test-Path "$env:USERPROFILE\.gemini\GEMINI.md"               # Deve ser True
Test-Path "$env:USERPROFILE\.gemini\antigravity\mcp_config.json"  # Deve ser True
```

### O que cada MCP Server faz

| MCP Server | Para que serve | Requisitos |
|-----------|----------------|------------|
| **supabase-mcp-server** | Executar SQL, listar tabelas, aplicar migrações, ver logs, deploy edge functions | Node.js + npx (já instalados) |
| **github-mcp-server** | Gestão de repos, issues, PRs no GitHub | Requer Docker (opcional) |

---

## Fase 4 — Task Scheduler para Backup Diário (👤 Manual)

1. `Win + R` → `taskschd.msc` → Enter
2. **Criar Tarefa Básica:**

| Campo | Valor |
|-------|-------|
| Nome | `AsymLAB - Backup Diário Supabase` |
| Trigger | Diariamente às **03:00** |
| Acção | Iniciar programa |
| Programa | `F:\AsymLAB\scripts\backup-daily.bat` |
| Iniciar em | `F:\AsymLAB` |

3. Condições: ✅ "Iniciar apenas se rede disponível"

---

## Fase 5 — Verificação (🤖 Antigravity)

### 5.1 Verificar ambiente

```powershell
cd F:\AsymLAB
node --version   # v24+
npm --version    # 11+
git --version    # 2.53+
git status       # clean
```

### 5.2 Testar dev server

```powershell
npm run dev
```

Abrir http://localhost:3000 e verificar:
- [ ] Login: `asymdl@gmail.com` / `FabioDias123?!`
- [ ] Dashboard carrega
- [ ] Sidebar mostra todos os módulos
- [ ] Definições → Utilizadores → Nome "Dr. João Alves" é link azul
- [ ] Clicar no nome → Ficha do médico com hero header
- [ ] Tab "Dados" → Clínicas e parceiros carregam
- [ ] Modal parceiros → Adicionar/remover funciona

### 5.3 Testar build

```powershell
npx next build
```

> ⚠️ **NUNCA** usar pipes (`|`, `Select-Object`) com `next build` no PowerShell — bloqueia!

### 5.4 Testar backup

```powershell
node scripts/backup-supabase.js
```

### 5.5 Testar MCP Supabase

Pedir ao Antigravity: "Lista as tabelas do Supabase"
Resultado esperado: 10 tabelas do schema public.

---

## Fase 6 — Optimizações Proactivas (🤖 Antigravity)

> [!TIP]
> **Para o Antigravity:** Agora que o ambiente está configurado, executa estas verificações e optimizações. Algumas podem resolver problemas que tínhamos no PC anterior.

### 6.1 Limpar cache e rebuild

Se o dev server ou build apresentar problemas:
```powershell
Remove-Item -Recurse -Force F:\AsymLAB\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force F:\AsymLAB\node_modules -ErrorAction SilentlyContinue
cd F:\AsymLAB
npm install
npm run dev
```

### 6.2 Verificar integridade do Git

```powershell
cd F:\AsymLAB
git fsck --full
git gc --aggressive
```

### 6.3 Verificar TypeScript sem erros

```powershell
npx tsc --noEmit
```

Se houver erros, analisar e corrigir. Notas:
- `supabase/functions/` tem `@ts-nocheck` — ignorar erros nessa pasta
- O `tsconfig.json` só inclui `src/**/*.ts` — nunca alterar para `**/*.ts`

### 6.4 Verificar Supabase — RLS e advisors

Usar o MCP para correr:
```sql
-- Verificar se todas as tabelas têm RLS activo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

E depois usar a tool `get_advisors` para security e performance.

### 6.5 Verificar se o backup config está actualizado

Abrir `DB/Supabase/config.json` e confirmar que todas as 10 tabelas estão listadas:
`clinics`, `clinic_contacts`, `clinic_delivery_points`, `clinic_discounts`, `delivery_point_contacts`, `organization_settings`, `user_profiles`, `user_clinic_access`, `doctor_profiles`, `doctor_clinic_partners`

### 6.6 Testar sincronização de dados

```sql
-- Verificar se há users sem profile
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE up.user_id IS NULL;

-- Verificar se há phones desincronizados
SELECT up.user_id, up.phone as profile_phone, au.phone as auth_phone
FROM public.user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.phone IS NOT NULL AND (up.phone IS NULL OR up.phone = '');
```

Se encontrar dados desincronizados, corrigir.

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
│   ├── config.json            # Lista de tabelas para backup + paths
│   ├── backups/               # Backups FULL/INCR por data
│   ├── logs/                  # Logs do backup
│   └── migrations/            # SQL migrations pendentes
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
│   ├── backup-supabase.js     # Engine backup (FULL + Incremental)
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
│   │   │   ├── doctors/       # Módulo Médicos (ficha + lista)
│   │   │   ├── minha-conta/   # A Minha Conta
│   │   │   └── settings/      # Definições
│   │   └── login/             # Login page
│   │
│   ├── components/
│   │   ├── Sidebar.tsx        # Navegação lateral
│   │   ├── DashboardLayout.tsx
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
├── next.config.js             # ignoarBuildErrors, outputFileTracing
├── tsconfig.json              # include: src/**/*.ts APENAS
├── vercel.json                # Região cdg1 (Paris), headers PWA
└── package.json               # Next 14.2, React 18, Supabase, TW4
```

---

## 📊 Schema Supabase Detalhado

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
| `invite-clinic-user` | Supabase Dashboard | Convite de users (auth + profile + access) |

---

## 🔑 Credenciais Completas

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

### Vercel
- **Dashboard:** https://vercel.com/asymdl-hashs-projects/asym-lab-2
- **App URL:** https://asym-lab-2.vercel.app

### GitHub
- **Repo:** https://github.com/asymdl-hash/AsymLAB

---

## ⚙️ Configurações Críticas — Notas para o Antigravity

### `next.config.js`
- `ignoreBuildErrors: true` — Erros TS não bloqueiam deploy
- `outputFileTracingExcludes` — Exclui `supabase/`, `docs/`, `scripts/`, `.db`

### `tsconfig.json`
- `include` restrito a `src/**/*.ts` — **NUNCA** usar `**/*.ts` (apanha Deno)
- Path alias: `@/*` → `./src/*`

### `vercel.json`
- Região: `cdg1` (Paris)
- Headers PWA para `sw.js` e `manifest.json`

### `.vscode/settings.json`
- TypeScript SDK: `node_modules/typescript/lib`
- Edge Functions usam `@ts-nocheck`

### Build no PowerShell
- **NUNCA** usar pipes (`|`, `Select-Object`, `Out-String`) com `next build`
- Usar workflow `/local-build` para build

---

## 🧩 Contexto Completo para 1ª Conversa

> **Para o Antigravity:** Quando o utilizador abrir o Antigravity no novo PC pela primeira vez, ele vai partilhar este documento. Usa a informação abaixo para te contextualizares completamente.

### Resumo do Projecto

**AsymLAB** é uma PWA de gestão clínica odontológica em **Next.js 14 + TypeScript + Supabase + TailwindCSS 4**, com deploy em Vercel. Versão actual: **V2.2.0**.

### Arquitectura
- **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS 4 (`@tailwindcss/postcss`)
- **Backend:** Supabase (Auth com RBAC, PostgreSQL com RLS, Edge Functions)
- **Deploy:** Vercel (auto-deploy no push para `main`, região Paris)
- **PWA:** manifest.json + Service Worker para offline
- **Backup:** Script Node.js FULL + Incremental, Task Scheduler diário

### Módulos Implementados
1. **Autenticação** — Login Supabase Auth, 4 roles RBAC
2. **Dashboard** — Página principal
3. **Clínicas** — CRUD com contactos, pontos de entrega, descontos
4. **Médicos** — Ficha com hero header, dados pessoais, email contacto, clínicas, parceiros, permissões
5. **Pacientes** — Ficha clínica, tratamentos, notas, fotos
6. **Utilizadores** — Tabela com roles, convites por Edge Function, edição inline
7. **Backup** — FULL + Incremental com detecção changes e retenção

### Decisões de Design Importantes
- **user_profiles é a fonte de verdade** — Nunca ler dados de perfil de `auth.users`
- **Phone sync** — API `GET /api/users` prioriza `user_profiles.phone`, fallback `auth.users.phone`
- **contact_email separado** — Em `user_profiles.contact_email`, independente do email de login
- **Nome do médico como link** — Na lista de utilizadores, nomes de doctors são hiperligações para a ficha
- **Parceiros por clínica** — Tabela `doctor_clinic_partners` com RLS
- **Edge Function `invite-clinic-user`** — Deploy manual via Supabase Dashboard, usa Deno

### Últimas Alterações (V2.2.0 — 16/02/2026)
- Nome do médico transformado em hiperligação na lista de utilizadores
- Tabela `doctor_clinic_partners` criada com RLS
- Coluna `contact_email` adicionada a `user_profiles`  
- Bug de adicionar/remover parceiro corrigido no `ClinicPartnersModal.tsx`
- Telefone sincronizado entre `auth.users` e `user_profiles`
- Regras operacionais sobre backup e integridade documentadas em `future_features_plan.md`

### Regras Obrigatórias
1. Responder **sempre em português**
2. Commits: **Semantic Versioning** `V1.0.0` (ex: `git commit -m "V2.3.0: Feature X"`)
3. **PWA** responsiva — Mobile-first + breakpoints tablet/desktop
4. Ao criar/editar tabelas → verificar `DB/Supabase/config.json` para backup
5. **Fonte de verdade** = `user_profiles` (nunca `auth.users` para perfil)
6. **NUNCA** usar pipes com `next build` no PowerShell
7. `tsconfig.json` include só `src/**/*.ts` — nunca `**/*.ts`
8. Edge function tem `@ts-nocheck` — é Deno, não Node

---

*Última actualização: 18/02/2026 (V2.2.0)*
