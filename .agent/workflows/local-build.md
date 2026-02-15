---
description: Como correr o build e o servidor de desenvolvimento localmente
---

# Build e Dev Server Local

## Servidor de Desenvolvimento
// turbo
1. Correr o dev server:
```powershell
npm run dev
```

## Build de Produção (Local)

> **IMPORTANTE (PowerShell):** Nunca usar pipes (`|`, `Select-Object`, `Out-String`, `Set-Content`) com `next build` no PowerShell.
> O piping bloqueia o stdout do Next.js e o build nunca termina.

// turbo
2. Correr o build **directamente**, sem pipes:
```powershell
npx next build
```

// turbo
3. Para verificar apenas erros TypeScript (mais rápido que o build completo):
```powershell
npx tsc --noEmit
```

> Se precisar capturar output para ficheiro, redirecionar **depois** do build terminar, nunca inline.

## Notas
- O `tsconfig.json` tem `include` restrito a `src/**/*.ts` — NÃO usar `**/*.ts` (apanha edge functions Deno)
- A edge function `supabase/functions/invite-clinic-user/index.ts` tem `// @ts-nocheck` para evitar conflitos com o tsc do Next.js
- O Vercel faz o build automaticamente no push — prefira usar o Vercel para validação de produção
