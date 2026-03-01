# 🔐 Acessos e Credenciais - AsymLAB

> [!CAUTION]
> Este ficheiro contém informações sensíveis. **NÃO** partilhar publicamente.

## 🚀 Aplicação Online (Vercel)
- **URL Principal:** https://asym-lab-2.vercel.app
- **Dashboard Vercel:** https://vercel.com/asymdl-hashs-projects/asym-lab-2

## ⚡ Supabase (Base de Dados)

### Project Settings
- **Project URL:** `https://kfnrstxrhaetgrujyjyk.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk

### API Keys (Produção)

#### `anon` / `public` (Usada no Frontend/Vercel)
*Esta é a chave que deve estar em `NEXT_PUBLIC_SUPABASE_ANON_KEY`.*
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTYwMjAsImV4cCI6MjA4NjQzMjAyMH0.qEIPkMsveSzj9WxVg1cTH3MYa3-HNoCplPgzXxElZRU
```

#### `service_role` (Admin - SÓ BACKEND)
*Nunca usar no frontend! Dá acesso total à base de dados.*
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg1NjAyMCwiZXhwIjoyMDg2NDMyMDIwfQ.nJK6WilQl0VSdd4w0BpHeLycQjF9lnWTkRBVtL_coKY
```

---

## 👤 Admin Inicial
- **Email:** `asymdl@gmail.com`
- **Password:** `FabioDias123?!` (Definida em 12/02/2026)

---

## 📧 Gmail SMTP (Envio de Emails)
- **Conta:** `asymdl@gmail.com`
- **App Password:** `hgaq ezeq lqoi pjvv`
- **Variáveis de Ambiente (Vercel):**
  - `GMAIL_USER` = `asymdl@gmail.com`
  - `GMAIL_APP_PASSWORD` = `hgaqezeqlqoipjvv` (sem espaços)

---

## 🐙 GitHub
- **Conta:** `asymdl-hash`
- **Repo:** https://github.com/asymdl-hash/AsymLAB
- **Personal Access Token (MCP):** `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`
- **Vercel Webhook Deploy:** Token activo (NÃO regenerar — usado para auto-deploy)

---

## 🔌 MCP Servers
- **Supabase Access Token:** `sbp_19289a665899b9203afd42fc46e38388e9d9abbf`
- **GitHub MCP Binary:** `%LOCALAPPDATA%\github-mcp-server\github-mcp-server.exe`

---

## 🚀 Vercel CLI (Acesso Automatizado)
- **Token Name:** Antigravity-Agent
- **Token:** `vcp_3qcQ6ckT2rXgXHmEbyOsMdm4PyCgVILdZMwOyKGoP9VaZGZnTl4bESJx`
- **Scope:** Full Account
- **Expiração:** Sem expiração
- **Variável de Ambiente:** `VERCEL_TOKEN` (configurada a nível User)
- **Uso:** `npx vercel <comando> --token $env:VERCEL_TOKEN`
- **Workflow:** `.agent/workflows/vercel-check.md`

---

## 📧 Gmail Aliases para QA Testing
- **Conta Base:** `asymdl@gmail.com`
- **Aliases disponíveis** (chegam todos à caixa `asymdl@gmail.com`):

| Alias | Uso/Role | Estado |
|-------|----------|--------|
| `asymdl+qa.staff@gmail.com` | Teste staff_lab | Disponível |
| `asymdl+qa.staff.clinic@gmail.com` | Teste staff_clinic | Disponível |
| `asymdl+qa.doctor@gmail.com` | Teste doctor | Disponível |
| `asymdl+qa.admin@gmail.com` | Teste admin | Disponível |
| `asymdl+qa.contab@gmail.com` | Teste contabilidade | Disponível |
| `asymdl+qa.invite@gmail.com` | Teste B.6 OAuth callback | Disponível |

> **Nota:** Os aliases do Gmail não precisam de criação prévia. Qualquer variação `asymdl+XXXXX@gmail.com` funciona automaticamente.

---

**Última validação:** 21/02/2026 (Configuração token Vercel + Gmail aliases QA)
