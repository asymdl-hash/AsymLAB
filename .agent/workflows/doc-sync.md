---
description: Regra obrigatória de sincronização de documentação após cada implementação ou decisão de design
---

# Workflow: Sincronização de Documentação

## Quando Aplicar

Este workflow é **obrigatório** sempre que:
- Uma funcionalidade nova é implementada
- Uma decisão de design é validada
- Um commit é feito
- Um módulo é criado ou modificado

## Passos

### 1. Identificar o tipo de alteração

| Tipo | Documentos a actualizar |
|------|------------------------|
| Nova funcionalidade | `core/ROADMAP.md` (marcar ✅) + doc do módulo em `modulos/` |
| Decisão de design | `core/DECISOES.md` (adicionar com data e ID) |
| Commit / versão | `ops/CHANGELOG.md` (nova entrada) |
| Bug corrigido | `ops/QA_TEST_LOG.md` (actualizar se testado) |
| Nova tabela / migration | `ops/BACKUP_NAS.md` (verificar script backup) |
| Alteração NAS | `modulos/PACIENTES_NAS.md` |

// turbo
### 2. Actualizar os documentos identificados

Editar cada documento relevante com a informação nova. Manter formato consistente.

// turbo
### 3. Actualizar INDEX.md

Actualizar a tabela "Última Sincronização por Documento" no `docs/INDEX.md` com a data actual.

### 4. Commit com referência

Incluir no commit message a referência ao documento actualizado:
```
V1.XX.0: [descrição] — docs: DECISOES.md, ROADMAP.md
```
