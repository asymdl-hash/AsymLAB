# 🚀 Deploy Manual da Edge Function

Como o Supabase CLI não está disponível, vais fazer upload manual da function.

## Passo a Passo:

### 1. Abre o Supabase Dashboard
- Vai para: https://app.supabase.com
- Seleciona o projeto AsymLAB
- No menu lateral, clica em **Edge Functions**

### 2. Cria uma nova função
- Clica em **"Create a new function"**
- Nome: `invite-clinic-user`
- Clica em **"Create function"**

### 3. Cola o código
- No editor que aparecer, **apaga todo o conteúdo**
- Abre o ficheiro local: `F:\AsymLAB\supabase\functions\invite-clinic-user\index.ts`
- Copia TODO o conteúdo
- Cola no editor do Dashboard
- Clica em **"Deploy"** (botão verde no topo direito)

### 4. Configurar Variáveis de Ambiente
- Ainda no Dashboard, vai a **Settings** → **Edge Functions** → **Environment Variables**
- Adiciona uma nova variável:
  - **Nome:** `APP_URL`
  - **Valor:** `https://asym-lab.vercel.app` (ou o teu domínio de produção)
  - Scope: Deixa em "All functions"
- Clica em **"Add variable"**

### 5. Testar
- Volta para Edge Functions
- Clica em `invite-clinic-user`
- Clica em **"Invoke"** para testar
- Ou testa diretamente no frontend (aba "Acesso & Segurança")

---

## ✅ Ficheiro a copiar:
`F:\AsymLAB\supabase\functions\invite-clinic-user\index.ts`

(Está aberto no VS Code agora, basta copiar!)

---

**Depois de fazer o deploy, avisa-me para testarmos juntos!** 🎯
