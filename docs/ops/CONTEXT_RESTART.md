# Contexto de Reinício (Session Context)

> **Regra:** Este documento deve ser lido pelo agente no início de cada sessão (após reinício do PC ou nova interação) para carregar o contexto das últimas 24h. Deve ser atualizado antes de terminar a sessão para garantir passagens de turno sem quebras.

---

## Estado Atual — Versão: V2.9.4 + Catálogos (03/04/2026)

### Foco Principal
Remodelação completa da Ficha do Paciente (F0–F7) + Sistema de Registo Fotográfico + DSD Image Annotator. A remodelação principal está **concluída (F0–F7)**. Últimos trabalhos focaram-se no Annotator DSD e Catálogos dinâmicos.

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
| F6 | Planos Fechados + Histórico | ✅ | V2.3.0 |
| F7 | Polish + PWA — Timeline premium, SW cache | ✅ | V2.4.0 |

### Blocos de Trabalho Recentes (desde último CONTEXT_RESTART)

#### Bloco 1: Registo Fotográfico Completo (V2.3.0 → V2.5.2)
- **Rich Text (Tiptap)** nos campos Resposta e Descrição das Considerações (V2.3.0-V2.3.1)
- **Hero headers dark gradient** em Registos Fotográficos, Escala de Cor, Registos Radiológicos, Considerações (V2.3.2-V2.3.4)
- **Redesign cards fotográficos** — gradient tag + botões icon-only glassmorphism (V2.3.5)
- **Cron fix** — Vercel Hobby plan daily (V2.3.6)
- **Mobile responsive** — Radiológicos vertical, Considerações full width (V2.3.7-V2.3.9)
- **CameraOverlay redesign** — Full view, FHD/4K header, exposure sidebar, zoom 0.5x/1x/2x (V2.4.1)
- **Câmara nativa** pill no header (V2.4.2)
- **Drag-and-drop fix** previews (V2.4.4)
- **NAS Registos Radiológicos** — reestruturação Ortopan/Periapicais/CBCT (V2.4.5)
- **PhotoGuidePopover** — guias interactivos de posicionamento câmara por secção (V2.4.6-V2.4.9)
- **Escala de Cor com Polarizadas** — badge toggle (V2.6.0)
- **ToothThirdsSelector** — degradé toggle com 3 terços clicáveis (V2.5.1-V2.5.2)

#### Bloco 2: DSD Image Annotator (V2.7.0 → V2.9.4)
- **DSD Image Annotator** completo com `react-konva` (V2.7.0)
- 5 → **15 elementos dentários** no Annotator (Coroa, Faceta, Vertiprep, Overlay, Veneerlay, Onlay, Compósito, Pôntico, Implante, Enxerto, Osteotomia, Gengivectomia, Desvitalização, Orto, Branqueamento) (V2.9.0)
- **Seletor manual FDI** — remoção da infraestrutura ONNX de detecção automática (V2.8.0)
- **Resize centrado** Shift/Ctrl+drag, glow SVG, handles maiores (V2.7.1)
- **Templates editados manualmente** — substituição dos originais gerados (V2.9.1-V2.9.4)

#### Bloco 3: Catálogos Dinâmicos (V1.22.0 → V1.23.0)
> ⚠️ Nota: Versões V1.22/V1.23 são anomalia — deveriam ser V2.10/V2.11 na sequência.
- **Catálogo de Tipos de Agendamento** — tabela DB `appointment_types_catalog`, CRUD service, sub-tab no CatalogManager, dropdown dinâmico no PlanTimelineEditor (V1.22.0)
- **Catálogo de Fases do Plano** — tabela DB `plan_phases_catalog`, CRUD service, sub-tab no CatalogManager, datalist no PlanTimelineEditor (V1.23.0)

#### Bloco Anterior: Registos Fotográficos Avançados (V2.10.9 → V2.22.3)
- **Câmara Pro** — zoom/pinch, resolução HD-4K, aspect ratio, exposição, tap-focus (V2.10.9)
- **Híbrido câmara nativa mobile** + overlay Pro desktop (V2.11.0)
- **Secções fotográficas** — Face/Close-up/Vista Oclusal/45°/Escala de Cor/Outros (V2.12.0-V2.13.x)
- **Drag-and-drop** fotos entre campos (V2.16.0)
- **Per-photo notes** em todos os campos (V2.17.0-V2.17.5)
- **Mobile multi-select** foto move (V2.18.0)
- **NAS V2** — hierarquia fotográfica actualizada (V2.18.1)
- **Sistema de rascunhos** — draft save/restore/finalize (V2.19.0-V2.20.0)
- **Considerações refinadas** — cards 50% width, auto-numbered, hero header (V2.22.1-V2.22.3)

### Bugs Conhecidos
- **PGRST200** na tabela `considerations` (FK em falta) — pré-existente, não bloqueia implementação actual
- **Versionamento anomalias** — V1.22/V1.23 depois de V2.9.4 (sequência quebrada)

### Regras Activas (Workflows)
| Workflow | Descrição |
|----------|-----------|
| `/mockup-fidelity` | Mockup antes de UI, comparação iterativa obrigatória |
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
1. **F5c** — Chat NAS Integration (pastas Chat Interno/Galeria + Metadata)
2. **PGRST200** — Corrigir FK considerations quando oportuno
3. **Navegação Chat** por Plano → Fase → Agendamento
4. **QA & Testes formais** do módulo pacientes
5. **NAS padrão master** + Supabase cache
6. **Corrigir versionamento** — próximo commit deve usar V2.10.0+

*(Ficheiro sincronizado em 03/04/2026. Ler ao reiniciar para continuar de onde ficámos.)*
