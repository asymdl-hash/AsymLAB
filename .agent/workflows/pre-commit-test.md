---
description: Testes obrigatórios antes de qualquer commit — simular utilizador real a usar a app
---

# Regra de Teste Pré-Commit

> **REGRA OBRIGATÓRIA:** Antes de qualquer `git commit`, o agente DEVE testar o fluxo alterado usando o browser, simulando um utilizador real a usar a aplicação. Só após confirmação visual de que tudo funciona é que o commit pode ser feito.

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
   - Se for uma nova feature, testar também o caminho de erro (ex: campos obrigatórios em falta)

5. **Tirar screenshot** do resultado final como prova de teste

6. **Só então** fazer o commit com a versão semântica correcta

## Exemplo de Commit Correcto

```powershell
git add -A
git commit -m "V2.4.0: Contactos Inteligentes - multiplos contactos por ponto de entrega"
```

## Quando Testar com Múltiplos Roles

Testar com vários roles quando a feature tem **controlo de acesso por role**:
- Confirmar que o role correcto VÊ a feature
- Confirmar que roles sem acesso NÃO vêem a feature (ou têm acesso bloqueado)
