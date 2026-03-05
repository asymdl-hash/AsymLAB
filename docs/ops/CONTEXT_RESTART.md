# Contexto de Reinício (Session Context)

> **Regra:** Este documento deve ser lido pelo agente no início de cada sessão (após reinício do PC ou nova interação) para carregar o contexto das últimas 24h. Deve ser atualizado antes de terminar a sessão para garantir passagens de turno sem quebras.

---

## Estado Atual — Versão: V2.2.0 (05/03/2026)

### Foco Principal
Remodelação completa da Ficha do Paciente (F0–F7). Actualmente na **F5b concluída** — Chat Interno com pesquisa, mobile e contexto. Próximo: F6 (Planos Fechados + Histórico).

### Remodelação Ficha Paciente (Progresso Global)

| Fase | Descrição | Status | Versão |
|:----:|-----------|:------:|:------:|
| F0 | Preparação docs + cleanup | ✅ | V1.93.0 |
| F1 | Layout Base + Timeline Horizontal + Tabs | ✅ | V1.94.0 |
| F2 | PlanDetail + Considerações + Documentação Light Mode | ✅ | V1.95.0 |
| F3 | Info Técnica grid 8 cards NAS + configs | ✅ | V1.96.0 |
| F4 | Light Mode Deep Clean (19 ficheiros, 280+ tokens) | ✅ | V1.97.0→V2.0.0 |
| F5a | Chat Interno: drawer, mensagens, galeria, realtime | ✅ | V2.1.0 |
| F5b | Chat: pesquisa, mobile bottom sheet, contexto | ✅ | V2.2.0 |
| F5c | Chat: NAS integration | ⏳ | — |
| F6 | Planos Fechados + Histórico | ⏳ | — |
| F7 | Polish, PWA + Testes Finais | ⏳ | — |

### Implementações Recentes (F5a + F5b)
- **ChatDrawer.tsx** (650+ linhas): drawer lateral 370px, minimizável, backdrop, pesquisa, mobile bottom sheet
- **chatService.ts**: CRUD mensagens, upload anexos, realtime subscription, searchMessages (ilike + unaccent)
- **Migration Supabase**: tabela `internal_chat_messages` + RLS + Storage bucket `chat-attachments` + extensão `unaccent` + função `f_unaccent()`
- **PatientForm.tsx**: botão toggle chat no header (apenas lab staff), passa `activePlanName` ao ChatDrawer

### Bugs Conhecidos
- **PGRST200** na tabela `considerations` (FK em falta) — pré-existente, não bloqueia implementação actual

### Regras Activas (Workflows)
| Workflow | Descrição |
|----------|-----------|
| `/mockup-fidelity` | **NOVO** — Mockup antes de UI, comparação iterativa obrigatória |
| `/model-routing` | Sugerir modelo ideal antes de cada tarefa |
| `/pre-commit-test` | Browser test visual obrigatório antes de commit |
| `/local-server` | Servidor único porta 3000, reiniciar no início |
| `/light-mode` | Desenvolver sempre em Light Mode |
| `/doc-sync` | Sincronizar docs após cada implementação |

## Guia Mestre
O plano completo de remodelação está em:
`C:\Users\asyml\.gemini\antigravity\brain\0e2562be-7122-4ca4-a42c-999f362a6dc5\guia_mestre.md`

Usar como referência principal para continuar de onde parámos.

## Próximos Passos
1. **F6** — Planos Fechados + Histórico (tabs 3 e 4)
2. **F5c** — NAS integration para chat (quando NAS disponível)
3. **F7** — Polish, PWA + Testes Finais
4. **PGRST200** — Corrigir FK considerations quando oportuno

*(Ficheiro sincronizado em 05/03/2026. Ler ao reiniciar para continuar de onde ficámos.)*
