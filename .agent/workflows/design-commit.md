---
description: Commit automático após decisões de design no módulo de pacientes ou documentação
---

# Workflow: Commit Automático de Decisões de Design

## Quando usar

Este workflow deve ser executado **automaticamente** sempre que:
- Uma secção do documento de design (MODULO_PACIENTES.md ou equivalente) é criada ou editada
- Uma decisão importante é tomada e registada
- O utilizador valida/aprova uma secção ou bloco
- Uma etapa ou sub-etapa é concluída

## Passos

// turbo-all

1. Adicionar ficheiros de documentação ao staging:
```powershell
git add docs/MODULO_PACIENTES.md docs/QA_TEST_LOG.md
```

2. Criar commit com descrição da decisão:
```powershell
git commit -m "docs: [DESCRIÇÃO CURTA DA DECISÃO]"
```

> **Nota:** Substituir `[DESCRIÇÃO CURTA DA DECISÃO]` pela descrição real.
> Exemplos:
> - `docs: Etapa 3.22 — estratégia NAS-First com Cloudflare Tunnel`
> - `docs: Sistema multi-badge 33 status com auto-transições`
> - `docs: F1 — Fluxo de criação de paciente definido`

3. Verificar que o commit foi feito:
```powershell
git log --oneline -1
```

## Regras importantes

- **NUNCA** editar documentação sem commitar logo a seguir
- Cada commit deve ter uma **mensagem descritiva** da decisão tomada
- Se múltiplas decisões foram tomadas numa sessão, fazer **um commit por bloco lógico**
- Ficheiros de docs/ devem estar **sempre tracked** no git
- Em caso de erro/corrupção, o `git checkout` pode restaurar a última versão
