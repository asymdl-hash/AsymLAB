---
description: Testes obrigatórios antes de qualquer commit — simular utilizador real a usar a app
---

# Regra de Teste Pré-Commit

> [!CAUTION]
> **REGRA OBRIGATÓRIA — SEM EXCEPÇÕES:** Antes de qualquer `git commit`, o agente DEVE:
> 1. Fazer `npx next build` (verifica compilação)
> 2. **Abrir o browser** e testar visualmente como utilizador real
> 3. **Capturar screenshot(s)** como prova de que funciona
> 4. Só então fazer o commit
>
> ❌ `build OK → commit` **NÃO É ACEITE** — build apenas verifica compilação, não a UI
> ✅ `build OK → browser test visual → screenshot → commit` **CORRECTO**

## Utilizadores de Teste Disponíveis

**URL:** http://localhost:3000

| Role | Username/Email | Password | Notas |
|---|---|---|---|
| `admin` | `test.admin` | `Teste1234` | Testes admin/backoffice |
| `doctor` | `test.doctor` | `Teste1234` | Testes ficha médico, agenda |
| `staff_clinic` | `test.staff.clinic` | `Teste1234` | Testes operações clínica |
| `staff_lab` | `test.staff.lab` | `Teste1234` | Testes operações laboratório |
| `contabilidade_clinic` | `test.conta.clinic` | `Teste1234` | Testes faturação/relatórios |
| `contabilidade_lab` | `test.conta.lab` | `Teste1234` | Testes dashboard/relatórios |

> ⚠️ **Estes utilizadores são EXCLUSIVOS para testes** — nunca usar contas reais (Fabio Dias, Dr. João Alves, Ivo Assistente, etc.) nos testes de browser automáticos.

## Protocolo Obrigatório Pré-Commit

1. **Identificar o role afectado** pela alteração (ex: alterei UI de clínicas → testar com `admin` + `staff_clinic`)

2. **Abrir o browser** em http://localhost:3000

3. **Fazer login** com a conta de teste do role adequado

4. **Simular o fluxo completo** como se fosse um utilizador real:
   - Navegar até à funcionalidade afectada
   - Exercitar o novo comportamento
   - Verificar que não há erros na UI ou na consola
   - Verificar que os dados persistem após reload da página
   - **⚠️ Verificar sobreposições — campos/botões tapados por outros elementos** (z-index, overflow, position absolute)
   - Verificar que todos os botões e inputs são clicáveis e visíveis
   - Se for uma nova feature, testar também o caminho de erro (ex: campos obrigatórios em falta)

5. **Tirar screenshot** do resultado final como prova de teste

6. **Se houver problemas:** corrigir → rebuild → **repetir browser test** (voltar ao passo 2). Este loop repete-se até que o teste visual passe a 100%.

7. **Só então** fazer o commit com a versão semântica correcta

> [!CAUTION]
> **NUNCA** fazer commit sem browser test visual aprovado. A sequência obrigatória é:
> `build OK → browser test → fix (se necessário) → browser retest → commit`

## Exemplo de Commit Correcto

```powershell
git add -A
git commit -m "V2.4.0: Contactos Inteligentes - multiplos contactos por ponto de entrega"
```

## Quando Testar com Múltiplos Roles

Testar com vários roles quando a feature tem **controlo de acesso por role**:
- Confirmar que o role correcto VÊ a feature
- Confirmar que roles sem acesso NÃO vêem a feature (ou têm acesso bloqueado)
