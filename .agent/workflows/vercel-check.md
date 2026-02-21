---
description: Como verificar variáveis de ambiente e estado da Vercel
---

# Verificar Vercel

## Pré-requisito
O token `VERCEL_TOKEN` está configurado como variável de ambiente do sistema (User level).
Se não estiver, define-o com:
```powershell
[System.Environment]::SetEnvironmentVariable("VERCEL_TOKEN", "<token>", "User")
```

## Verificar autenticação
// turbo
```powershell
npx vercel whoami --token $env:VERCEL_TOKEN
```

## Listar variáveis de ambiente
// turbo
```powershell
npx vercel env ls --token $env:VERCEL_TOKEN
```

## Listar deployments recentes
// turbo
```powershell
npx vercel ls --token $env:VERCEL_TOKEN
```

## Ver logs do último deployment
// turbo
```powershell
npx vercel logs --token $env:VERCEL_TOKEN
```

## Adicionar variável de ambiente
```powershell
echo "VALOR" | npx vercel env add NOME_VAR production --token $env:VERCEL_TOKEN
```
