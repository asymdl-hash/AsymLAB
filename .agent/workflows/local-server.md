---
description: Regra obrigatória — apenas um servidor local na porta 3000, reiniciado a cada início de implementação
---

# Servidor Local — Regra Obrigatória

> [!CAUTION]
> **REGRA SEM EXCEPÇÕES:**
> - Deve existir **apenas UM** servidor de desenvolvimento local
> - Deve correr **SEMPRE na porta 3000**
> - Deve ser **reiniciado no início de cada implementação** para evitar erros

## Protocolo de Arranque

Antes de qualquer implementação, executar **SEMPRE** estes passos:

### 1. Verificar e matar servidores existentes
// turbo
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue
```

### 2. Limpar cache e iniciar servidor
// turbo
```powershell
cd F:\Asymlab; Remove-Item -Recurse -Force .next; npm run dev
```

### 3. Verificar que está na porta 3000
O output deve mostrar:
```
▲ Next.js 14.x
- Local: http://localhost:3000
```

Se mostrar `Port 3000 is in use, trying 3001`:
- **PARAR** — há outro processo na porta 3000
- Matar o processo com: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force`
- Reiniciar o servidor

## Regras Complementares

1. **NUNCA** ter 2 servidores a correr em simultâneo (3000 + 3001)
2. **NUNCA** fazer `npx next build` enquanto o dev server está a correr — mata o server primeiro, faz o build, depois reinicia
3. **SEMPRE** verificar que a porta 3000 está livre antes de arrancar

## Sequência Correcta para Build + Test

```
1. Matar servidor (porta 3000)
2. npx next build → Exit 0
3. Reiniciar servidor: Remove-Item -Recurse -Force .next; npm run dev
4. Aguardar "Ready in X.Xs"
5. Browser test visual na porta 3000
6. git commit
```
