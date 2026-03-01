# 🚀 Guia de Deploy - Vercel

## Pré-requisitos

- ✅ Conta GitHub (asymdl-hash)
- ✅ Repositório GitHub (AsymLAB)
- ⚠️ Conta Vercel (criar em https://vercel.com)

## Passos para Deploy

### 1. Criar Conta Vercel

1. Acede a https://vercel.com/signup
2. Clica em **"Continue with GitHub"**
3. Autoriza o Vercel a aceder ao GitHub
4. Confirma o email

### 2. Importar Projeto

1. No dashboard Vercel, clica em **"Add New..."** → **"Project"**
2. Seleciona o repositório **"AsymLAB"**
3. Clica em **"Import"**

### 3. Configurar Variáveis de Ambiente

Na página de configuração do projeto:

1. Expande **"Environment Variables"**
2. Adiciona as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://kfnrstxrhaetgrujyjyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbnJzdHhyaGFldGdydWp5anlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNjM2NDQsImV4cCI6MjA1NDkzOTY0NH0.sb_publishable_kF09u4UVcCk5PWSAKzq3Uw_rORuW7jB
```

3. Clica em **"Add"** para cada variável

### 4. Deploy

1. Verifica que o **Framework Preset** está em **"Next.js"**
2. Clica em **"Deploy"**
3. Aguarda 2-3 minutos

### 5. Aceder à Aplicação

Após o deploy:
- URL: `https://asymlab.vercel.app` (ou similar)
- Clica em **"Visit"** para abrir

## Configuração PWA

### Testar Instalação

#### No Telemóvel (Android/iOS):
1. Abre `https://asymlab.vercel.app` no Chrome/Safari
2. Clica no menu (⋮) → **"Adicionar ao ecrã inicial"**
3. Confirma a instalação
4. Abre a app a partir do ecrã inicial

#### No PC (Chrome/Edge):
1. Abre `https://asymlab.vercel.app`
2. Clica no ícone de instalação (⊕) na barra de endereço
3. Clica em **"Instalar"**
4. A app abre numa janela separada

### Verificar PWA

1. Abre DevTools (F12)
2. Vai a **"Application"** → **"Manifest"**
3. Verifica que o manifest está carregado
4. Vai a **"Service Workers"**
5. Verifica que o SW está **"activated and running"**

## Domínio Personalizado (Opcional)

1. No dashboard Vercel, vai a **"Settings"** → **"Domains"**
2. Clica em **"Add"**
3. Insere o teu domínio
4. Segue as instruções para configurar DNS

## Atualizações Automáticas

Cada `git push` para `main` faz deploy automático! 🚀

```bash
git add .
git commit -m "V2.3.0: Nova funcionalidade"
git push
```

## URLs Importantes

- **Dashboard Vercel**: https://vercel.com/dashboard
- **Projeto**: https://vercel.com/asymdl-hash/asymlab
- **App**: https://asymlab.vercel.app
- **GitHub**: https://github.com/asymdl-hash/AsymLAB

## Troubleshooting

### Erro de Build
- Verifica os logs no Vercel
- Confirma que `npm run build` funciona localmente

### PWA não instala
- Verifica que estás em HTTPS (Vercel dá automaticamente)
- Abre DevTools → Application → Manifest
- Verifica erros no Service Worker

### Variáveis de ambiente
- Confirma que adicionaste `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Faz redeploy após adicionar variáveis

---

**Última atualização:** 2026-02-12
