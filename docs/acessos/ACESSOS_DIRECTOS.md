# 🔧 Acessos Directos — AsymLAB (Actualizado: 20/02/2026)

---

## 🧑‍💻 Credenciais da Aplicação (http://localhost:3000)

| Utilizador | Email / Username | Password | Role |
|-----------|-----------------|----------|------|
| **Fabio Dias** | `asymdl@gmail.com` | `FabioDias123?!` | Admin |
| **Dr. João Alves** | `joaoalves` | — | Doctor |
| **Ivo Assistente** | `ivoassistente` | — | Staff Clinic |

> **URL Produção:** https://asymlab.vercel.app

> Configurações de acesso directo ao Supabase para o Antigravity trabalhar de forma autónoma.

---

## ✅ O que está configurado

| Ferramenta | Estado | Detalhes |
|-----------|--------|---------|
| **psql** | ✅ Instalado | PostgreSQL 17.8 em `C:\Program Files\PostgreSQL\17\bin\` |
| **PATH** | ✅ Configurado | `C:\Program Files\PostgreSQL\17\bin` adicionado ao PATH do utilizador |
| **Supabase CLI** | ✅ Autenticado | Token `sbp_13ee7a9c...` (AsymLAB-Dev-PC, sem expiração) |
| **MCP Supabase** | ✅ Funcional | `mcp_config.json` actualizado com novo token |
| **DATABASE_URL** | ✅ Guardada | Em `.env.local` (Session Pooler, porta 5432) |

---

## 🔌 Connection Strings do Supabase

### Session Pooler (recomendado para psql e migrações)
```
Host:     aws-1-eu-west-2.pooler.supabase.com
Port:     5432
User:     postgres.kfnrstxrhaetgrujyjyk
Database: postgres
```

### Transaction Pooler (para serverless/conexões curtas)
```
Host:     aws-1-eu-west-2.pooler.supabase.com
Port:     6543
User:     postgres.kfnrstxrhaetgrujyjyk
Database: postgres
```

### Direct Connection (requer IPv6 — não disponível nesta rede)
```
Host:     db.kfnrstxrhaetgrujyjyk.supabase.co
Port:     5432
User:     postgres
```

---

## ⚠️ Problema Pendente: psql não autentica

O `psql` está instalado mas falha com "password authentication failed". Possíveis causas:
1. **Password alterada** no Supabase Dashboard — verificar em [Settings > Database](https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk/settings/database)
2. **Pooler requer SSL** — adicionar `?sslmode=require` à connection string

### Para resolver
1. Vai ao Supabase Dashboard → Settings → Database → "Reset database password"
2. Copia a nova password
3. Actualiza `scripts/psql.js` (linha `const PASSWORD = '...'`)
4. Actualiza `.env.local` (linha `DATABASE_URL=...`)

### Usar psql via script wrapper
```powershell
# Executar SQL directamente
node scripts/psql.js "SELECT count(*) FROM clinics;"

# Modo interactivo
node scripts/psql.js
```

---

## 🤖 MCP Supabase — Capacidades

Com o token configurado, o MCP Supabase consegue:
- ✅ `list_tables` — listar tabelas e colunas
- ✅ `execute_sql` — executar SQL (SELECT, INSERT, UPDATE)
- ✅ `apply_migration` — aplicar migrações DDL (CREATE TABLE, ALTER TABLE)
- ✅ `list_migrations` — listar migrações aplicadas
- ✅ `get_advisors` — verificar security/performance advisors

> [!IMPORTANT]
> Após alterar o `mcp_config.json`, é necessário **reiniciar o VS Code** para que o Antigravity use o novo token.

---

## 📋 Supabase CLI — Comandos úteis

```powershell
# Listar projectos
npx supabase projects list

# Aplicar migrações (requer --db-url)
npx supabase db push --db-url "postgresql://..."

# Ver migrações aplicadas
npx supabase migration list --project-ref kfnrstxrhaetgrujyjyk
```


> Documento de referência para configurar acessos que o Antigravity precisa para trabalhar de forma mais autónoma.

---

## 1. psql — O que é e como instalar

**O que é:** Cliente de linha de comandos para PostgreSQL. Permite executar SQL directamente na base de dados sem precisar do browser.

**Porquê é útil:** Permite ao Antigravity aplicar migrações DDL (CREATE TABLE, ALTER TABLE, etc.) directamente, sem depender do browser ou do Supabase Dashboard.

### Instalar no Windows

```powershell
# Opção A — Via winget (recomendado, mais simples)
winget install PostgreSQL.PostgreSQL

# Opção B — Só o cliente psql (sem o servidor completo)
# Descarregar de: https://www.postgresql.org/download/windows/
# Durante a instalação, seleccionar apenas "Command Line Tools"
```

### Usar com o Supabase

A connection string do Supabase segue este formato:
```
postgresql://postgres.kfnrstxrhaetgrujyjyk:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

Guardar em `.env.local`:
```
DATABASE_URL=postgresql://postgres.kfnrstxrhaetgrujyjyk:FabioDias123%3F%21@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

> [!NOTE]
> Os caracteres especiais na password precisam de ser URL-encoded: `?` → `%3F`, `!` → `%21`

---

## 2. Supabase CLI — Personal Access Token

**O que é:** Token de autenticação pessoal do Supabase que permite ao CLI fazer operações remotas (aplicar migrações, listar projectos, etc.).

**Porquê é útil:** Permite ao Antigravity usar `supabase db push` para aplicar migrações sem precisar do browser.

### Como obter

1. Vai a [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Clica em **"Generate new token"**
3. Nome sugerido: `AsymLAB-Dev-PC`
4. Copia o token gerado (só aparece uma vez)

### Como configurar

```powershell
# Opção A — Guardar no Supabase CLI
npx supabase login --token sbp_XXXXXXXXXXXXXXXXXXXXXXXX

# Opção B — Guardar como variável de ambiente (persistente)
[System.Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "sbp_XXXXXXXXXXXXXXXXXXXXXXXX", "User")
```

### Guardar no ACESSOS.md
Adicionar ao `docs/ACESSOS.md`:
```
## Supabase CLI
- **Personal Access Token:** sbp_XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 3. MCP Supabase — Privilégios em falta

**Situação actual:** O MCP Supabase está configurado e funciona para leitura (SELECT), mas não tem privilégios para:
- `apply_migration` — aplicar migrações DDL
- `execute_sql` — executar SQL arbitrário
- `list_migrations` — listar migrações

**Causa:** O MCP usa o `anon key` ou um token com permissões limitadas. Para ter acesso total, precisa do `service_role_key` ou de um Personal Access Token com scope de gestão de base de dados.

### Como resolver

No ficheiro `%USERPROFILE%\.gemini\antigravity\mcp_config.json`, verificar a configuração do Supabase MCP:

```json
{
  "mcpServers": {
    "supabase-mcp-server": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "sbp_XXXXXXXXXXXXXXXXXXXXXXXX"],
      "env": {}
    }
  }
}
```

> [!IMPORTANT]
> O MCP Supabase precisa de um **Personal Access Token** (não o service_role_key) para ter acesso à Management API que permite executar DDL.

---

## 4. Resumo — O que fazer agora

| Acção | Prioridade | Tempo estimado |
|-------|-----------|----------------|
| Instalar `psql` via winget | Alta | 2 min |
| Gerar Personal Access Token no Supabase | Alta | 2 min |
| Configurar `npx supabase login --token` | Alta | 1 min |
| Actualizar `mcp_config.json` com o token | Alta | 2 min |
| Adicionar `DATABASE_URL` ao `.env.local` | Média | 1 min |

---

## 5. Verificação após configuração

```powershell
# 1. Testar psql
psql "postgresql://postgres.kfnrstxrhaetgrujyjyk:FabioDias123%3F%21@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -c "SELECT count(*) FROM public.clinics;"

# 2. Testar Supabase CLI
npx supabase projects list

# 3. Testar MCP (via VS Code — reiniciar o Antigravity após configurar)
# O Antigravity conseguirá executar: apply_migration, execute_sql, list_migrations
```
