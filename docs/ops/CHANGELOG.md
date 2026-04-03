# Changelog - AsymLAB

Registo histórico de todas as versões e alterações do projeto AsymLAB PWA.

## Fix PGRST200 Considerations - 2026-04-03

## V2.10.0 - 2026-04-03
- **Fix PGRST200 FK Ambiguity** — corrigidas queries self-referencing em `considerationsService.ts`
- Removidos joins ambíguos `parent` + `responses` com o mesmo FK hint (`considerations_parent_id_fkey`)
- Parent e responses agora resolvidos client-side a partir dos dados carregados
- `getByShareToken` simplificado — parent carregado em query separada
- Verificado: tab Considerações carrega sem erros no módulo Pacientes

---

## Catálogos Dinâmicos - 2026-03-20

> ⚠️ Versões V1.22/V1.23 — anomalia de numeração. Sequência correcta seria V2.10/V2.11.

## V1.23.0 - 2026-03-20
- **Catálogo de Fases do Plano** — tabela DB `plan_phases_catalog`, CRUD service, novo sub-tab no CatalogManager
- `datalist` no PlanTimelineEditor para sugestões de fases a partir do catálogo

## V1.22.0 - 2026-03-20
- **Catálogo de Tipos de Agendamento** — tabela DB `appointment_types_catalog`, CRUD service, sub-tab no CatalogManager
- Dropdown dinâmico no PlanTimelineEditor populado a partir do catálogo

---

## DSD Image Annotator & Templates Dentários - 2026-03-14 a 2026-03-17

## V2.9.4 - 2026-03-17
- Templates: Gengivectomia e enxerto corrigidos manualmente

## V2.9.3 - 2026-03-17
- Templates dentários substituídos pelos originais editados manualmente (versões do utilizador)

## V2.9.2 - 2026-03-17
- Ajustes templates — linhas tracejadas pôntico, branco enxerto, compósito actualizado

## V2.9.1 - 2026-03-16
- Remoção de fundos dos templates dentários + preview page (15/15 transparentes)

## V2.9.0 - 2026-03-16
- **15 elementos dentários no Annotator**: Coroa, Faceta, Vertiprep, Overlay, Veneerlay, Onlay, Compósito, Pôntico, Implante, Enxerto, Osteotomia, Gengivectomia, Desvitalização, Orto, Branqueamento

## V2.8.0 - 2026-03-14
- **Seletor manual FDI** no Annotator — remoção da infraestrutura ONNX (detecção automática descartada)

## V2.7.1 - 2026-03-14
- Annotator: resize centrado Shift/Ctrl+drag, glow SVG, handles maiores, barra superior removida

## V2.7.0 - 2026-03-14
- **DSD Image Annotator** — editor de anotações dentárias com `react-konva`
- 5 elementos exocad iniciais, resize livre, rotação centrada, botões contextuais flutuantes, exportação PNG

## V2.6.1 - 2026-03-14
- Botão câmara nos campos Registos Radiológicos (Ortopan, Periapicais, CBCT)

## V2.6.0 - 2026-03-14
- Badge **Polarizadas** na secção Escala de Cor — toggle shows/hides polarized photos field

---

## Registo Fotográfico Avançado - 2026-03-07 a 2026-03-13

## V2.5.3 - 2026-03-13
- Reposicionamento Considerações acima da Escala de Cor no modal plano
- Fix DOM nesting e width dos Registos Radiológicos

## V2.5.2 - 2026-03-12
- Redesign tooth SVG trapezoidal, layout 2 colunas, inline dropdown, shade colors nos terços

## V2.5.1 - 2026-03-12
- **ToothThirdsSelector** — degradé toggle com 3 terços clicáveis para selecção de cor

## V2.5.0 - 2026-03-12
- **PhotoGuidePopover** na Escala de Cor (Fotos + Polarizadas) com dados de guia dedicados

## V2.4.9 - 2026-03-12
- Rename 45deg → 45deg Frontal + actualização guia posicionamento

## V2.4.8 - 2026-03-12
- PhotoGuidePopover em 45° e Outros — cobertura completa de todas as secções

## V2.4.7 - 2026-03-12
- Fix popover clipping — `position:fixed` para escapar overflow do parent

## V2.4.6 - 2026-03-12
- **PhotoGuidePopover** — guia interactivo de posicionamento câmara e settings por secção fotográfica

## V2.4.5 - 2026-03-12
- Reestruturação NAS registos radiológicos — Ortopantomografia/Periapicais/CBCT sob Registos Radiológicos

## V2.4.4 - 2026-03-12
- Fix drag-and-drop broken previews — criar novo blob URL em vez de reutilizar o revogado

## V2.4.3 - 2026-03-12
- Fix layout preview Escala de Cor — thumbnail grid fora do container flex

## V2.4.2 - 2026-03-12
- Botão câmara nativa no header pills (Full HD / 4K / Nativa)

## V2.4.1 - 2026-03-12
- **Redesign CameraOverlay** — full view, FHD/4K header, exposure sidebar, zoom presets 0.5x/1x/2x, remove timer+flash

## V2.4.0 - 2026-03-12
- Unificação estilos cards — gradient tag amber em Escala de Cor + Considerações

## V2.3.9 - 2026-03-11
- Mobile responsive — Radiológicos vertical stack + Considerações full width

## V2.3.8 - 2026-03-11
- Fix mobile scroll — Radiológicos e Considerações acessíveis com pb-24 e max-h-95vh

## V2.3.7 - 2026-03-11
- Fix layout botões — flex centrado + conversão dos botões dashed restantes

## V2.3.6 - 2026-03-11
- Fix Vercel cron schedule — daily em vez de every 6h (Hobby plan limit)

## V2.3.5 - 2026-03-11
- **Redesign cards fotográficos** — Opção B gradient tag + botões icon-only glassmorphism

## V2.3.4 - 2026-03-11
- Hero header dark gradient na secção Considerações

## V2.3.3 - 2026-03-11
- Hero header dark gradient na Escala de Cor e Registos Radiológicos

## V2.3.2 - 2026-03-11
- Hero header dark gradient nos Registos Fotográficos + botões Ficheiro/Câmara lado a lado

## V2.3.1 - 2026-03-11
- Rich Text (Tiptap) no campo Descrição das Considerações

## V2.3.0 - 2026-03-11
- **Rich Text (Tiptap)** no campo Resposta das Considerações — negrito, listas numeradas e marcadores com smart toggle

---

## Considerações & Drafts & Mobile Photos - 2026-03-07 a 2026-03-10

## V2.22.3 - 2026-03-10
- Auto-expanding textareas nos campos subtitle e response

## V2.22.2 - 2026-03-10
- Considerações cards — 50% width, subtitles auto-numerados, mini hero header

## V2.22.1 - 2026-03-10
- Redesign Considerações cards — styling profissional neutro

## V2.21.0 - 2026-03-09
- Registos Radiológicos + multi-ficheiro alargado

## V2.20.0 - 2026-03-09
- **Fase B** — Cron cleanup drafts, WhatsApp lembretes, Definições de rascunhos

## V2.19.0 - 2026-03-09
- **Sistema de rascunhos Fase A** — draft save/restore/finalize, PLAN_SUBFOLDERS update, migration SQL

## V2.18.1 - 2026-03-09
- Actualizar estrutura NAS — Retrato, Close-up, Vista Oclusal, 45°, Escala+Polarizada, Outros

## V2.18.0 - 2026-03-09
- **Mobile multi-select photo move** — tap to select + floating bar + destination picker (touch devices only)

## V2.17.0–V2.17.5 - 2026-03-09
- Per-photo notes em todos os campos de registo fotográfico
- Notes viajam com fotos arrastadas entre campos
- Botão de nota por campo (layout refinado)

## V2.16.0 - 2026-03-08
- **Drag-and-drop** fotos entre todos os campos de registo

## V2.15.0–V2.15.2 - 2026-03-08
- Secções colapsáveis (Escala de Cor, Registos Fotográficos)
- Hero header no modal New Plan (estilo dark navy PatientForm)
- Fix chevron position Escala de Cor

## V2.14.0–V2.14.1 - 2026-03-08
- Toggle Setup Básico/Completo para secção de registo fotográfico
- Escala de Cor sempre visível (independente do toggle)

## V2.13.0–V2.13.19 - 2026-03-07/08
- Secção Close-up (Repouso, Sorriso Natural, Sorriso Alto)
- 45° Esquerda e Direita em Face e Close-up
- Rename Face → Retrato, Sorriso Alto → Sorriso Máximo, Perfil → Retractores
- Vista Oclusal (agrupamento Intraoral Superior + Inferior)
- Guias referência fotográficas por campo com images
- Polarizadas em Escala de Cor (2 colunas)
- Fix case sensitivity Vercel (Linux) nos filenames

## V2.12.0–V2.12.5 - 2026-03-07
- Reorganização layout fotos — Face full width, Introrais+120+Outros em 3 colunas
- Guias referência com imagens por campo
- Fieldset/legend para headers de secção
- Rename 120 → 45

## V2.11.0–V2.11.9 - 2026-03-07
- **Câmara Pro** — zoom/pinch, resolução HD-4K, aspect ratio, exposição, tap-focus, burst, galeria, fullscreen
- Híbrido câmara nativa mobile + overlay Pro desktop
- Multi-captura mobile — sessão loop com Tirar Mais / Concluir
- Botão Câmara Pro em Introrais + Escala de Cor
- Drag-and-drop no campo Introrais
- Escala de Cor com escalas (BleachVITA Classical)

## V2.10.9 - 2026-03-07
- **Camera Pro** — zoom/pinch, resolução HD-4K, aspect ratio, exposição, tap-focus, burst, galeria, fullscreen

---

## V2.2.0 - 2026-03-05
- **F5b Chat Interno** — Pesquisa accent/case-insensitive (D-CHAT-02), mobile bottom sheet, badge de contexto
- Barra de pesquisa com debounce 300ms, navegação ▲▼ entre resultados, highlight com ring amber
- Mobile (< 768px): bottom sheet 85vh, drag handle, cantos arredondados, sem botão minimizar
- Badge contexto: mostra plano activo no header do chat
- Extensão `unaccent` activada + função wrapper `f_unaccent()` para pesquisa

## V2.1.0 - 2026-03-05
- **F5a Chat Interno** — ChatDrawer com posicionamento fixo (fixed right-0 z-50), backdrop clicável, minimização
- `ChatDrawer.tsx` (550 linhas): Drawer + MessageCard + ChatGallery (full-screen imagens)
- `chatService.ts`: CRUD mensagens, upload anexos, realtime subscription
- Migration Supabase: tabela `internal_chat_messages` + RLS + Storage bucket `chat-attachments`
- `PatientForm.tsx`: botão toggle chat no header (apenas lab staff)

## V2.0.1 - 2026-03-05
- Regras obrigatórias: servidor único porta 3000, browser test com verificação de sobreposições

## V1.83.0 - 2026-03-03
- Novo componente `PatientAlerts.tsx`: Banner de Avisos contextual na Ficha do Paciente.
- Alerta âmbar: Paciente urgente sem plano de tratamento activo.
- Alerta vermelho: Agendamentos atrasados (com contagem e dias de atraso).
- Banners dismissable com animação slide-in, inseridos entre Hero Header e PlanTimeline.

## V1.82.1 - 2026-03-03
- Sincronização documental: INDEX.md, ROADMAP.md e CONTEXT_RESTART.md atualizados para V1.82.
- Nova secção "Catálogos Produção & Definições (V1.79–V1.82)" no ROADMAP.
- Módulo Definições (Catálogos) adicionado ao INDEX.md como 100% operacional.

## V1.82.0 - 2026-03-03
- Catálogo de Materiais: Adicionado suporte para "Ref. Fabricante", "Ref. Fornecedor" e "Reunião" no formulário de adição (AddNew).
- Checkbox "Reunião" auto-flag para informações incompletas, passível de entrar em próximos temas de equipa.
- Documentação sincronizada no processo (`INDEX.md` atuando corretamente como "Capitão").

## V1.81.1 - 2026-03-03
- Tipos de Trabalho: Tabela de Custos de Produção (Mão de Obra + Custo Material) com 4 KPI Cards.
- Catálogo de Materiais: Auto-preenchimento (PVP -> custo_porcao) ao selecionar material numa Fase de Produção.
- Recálculo robusto no `updateMaterialInPhase` (sempre que muda qualquer campo).

## V1.79.0 - 2026-03-03
- Novos catálogos: Fornecedores (12 seed), Marcas (36 seed), Fases de Produção (17 seed)
- Tabelas `suppliers`, `brands`, `production_phases` criadas com RLS
- `milling_materials` expandida: marca, fornecedor, preço PVP, IVA, fator conversão, porção, desconto, reunião, notas, audit fields
- Tabela `material_price_history` para auditoria de alterações de preço
- Tab Fornecedores: cards ricos c/ NIF, website, telefone, morada
- Tab Marcas: grid simples com CRUD inline
- Tab Fases de Produção: lista ordenada com badges de cor
- Service layer CRUD completo para todos os novos catálogos

## V1.79.1 - 2026-03-03
- MaterialsManager: formulário de adição expandido (marca, fornecedor, preço, IVA, porção, notas)
- MaterialsManager: painel de edição expandido com todos os campos + cálculos dinâmicos (IVA, total, custo/porção)
- Dropdowns Marca e Fornecedor populados dinamicamente a partir das tabelas `brands` e `suppliers`
- Coluna preço visível inline na tabela de materiais
- Meta-info (marca/fornecedor) visível abaixo do nome do material

## V1.77.0 - 2026-03-02
- Widget Componentes: formulário com material, quantidade, ref. fabricante/fornecedor, fornecedor
- Odontograma integrado para associar dentes a componentes
- Botão 📂 pasta por registo (subfolder "Componentes" no NAS)
- Service CRUD `component_records` com versionamento
- Integrado no PlanDetail abaixo do Widget Dentes (tema roxo)

## V1.76.0-V1.76.2 - 2026-03-02
- Catálogo materiais unificado: colunas `widget_dentes`, `widget_fresagem`, `widget_componentes`
- TeethWidget usa materiais filtrados do catálogo (não work_types)
- Fix shift+click: extrair shiftKey antes callback async + preventDefault
- Botão 📂 pasta por registo no TeethWidget
- Label painel odontograma customizável ("Materiais")

## V1.75.0 - 2026-03-02
- Widget Dentes inline no card de agendamento — odontograma 32 dentes com modo toggle
- Click individual selecciona/desselecciona, Shift+Click para range na mesma arcada
- Múltiplos registos por agendamento (materiais/trabalhos diferentes)
- Versionamento automático (version_number incrementa a cada edição)
- Service: getTeethRecords, createTeethRecord, updateTeethRecord
- OdontogramContent: novo prop `selectionMode='toggle'` para selecção directa
- Migração: coluna `teeth_data` adicionada ao `milling_records`

## V1.74.0 - 2026-03-02
- Widget Fresagem inline no card de agendamento — 3 estados (pendente→em_curso→concluido)
- Dropdown materiais agrupados por categoria, botão 📂 abrir pasta, botão 🔄 actualizar
- Service: getMillingMaterials, getMillingRecord, createMillingRecord, updateMillingRecord, getAppointmentHierarchy
- API: actions `check_milling_files` (verifica ficheiros NAS) e `open_subfolder` (abre pasta no Explorer)
- Tabela `milling_materials` criada no Supabase com 7 materiais placeholder e RLS

## V1.73.0 - 2026-03-02
- NAS rename automático — renomeia pasta agendamento quando tipo/data muda
- `retryRename` com 3 tentativas + fallback copy+delete para EPERM Windows
- `_nasRenameAppointment` + trigger no `updateRecord`

## V1.72.1 - 2026-03-02
- Seed 3 pacientes de teste (Maria, Carlos, Ana) com hierarquia completa

## V1.72.0 - 2026-03-02
- NAS criação automática de subpastas: paciente, plano, fase, agendamento
- 4 actions: `create_patient`, `create_plan`, `create_phase`, `create_appointment`
- Triggers fire-and-forget em patientsService

## V1.70.1 - 2026-03-02
- Odontograma V7 — labels alinhados, SVGs anatómicos reais 32 dentes FDI ISO 3950
- Responsividade mobile completa módulo pacientes

## V1.61.0 - 2026-02-28
- Lock optimista multi-user: hook `useOptimisticLock` reutilizável para proteger edições concorrentes
- Integração no PatientForm: verifica `updated_at` antes de cada auto-save
- Banner amber de conflito com botão "Recarregar" se outro utilizador editou entretanto

## V1.60.0 - 2026-02-28
- Thumbnails nos ficheiros: imagens com preview 48x48, PDFs com badge vermelho, outros com emoji do tipo
- Contactos Inteligentes marcado como ✅ (já implementado)

## V1.59.0 - 2026-02-28
- Sidebar reordenável por utilizador: drag-and-drop com GripVertical handle
- Ordem persistida em localStorage por user_id
- Indicador visual amber na posição de drop

## V1.58.0 - 2026-02-28
- Exportar considerações para PDF: botão no header, janela print-friendly com agrupamento por fase e branding AsymLAB

## V1.57.0 - 2026-02-28
- SQL trigger `fn_badge_auto_transitions` com 14 auto-transições nos fluxos Produção, Componentes, Comunicação e Billing
- Ex: adicionar "Prova Entregue" remove automaticamente "Para Prova"

## V1.56.0 - 2026-02-28
- Acções rápidas nos cards Kanban: Pausar, Concluir, Cancelar, Retomar, Reabrir
- Fix: coluna `data_fim` → `data_conclusao` no queueService

## V1.55.0 - 2026-02-28
- Modal de facturação ao concluir fase: opções "Gerar Factura" e "Sem Factura"
- Modal com campos valor/descrição ou motivo para sem factura
- Lógica sequencial: activa próxima fase pendente ao concluir

## V1.53.0 - 2026-02-28
- Responsividade mobile/tablet: hero header stack vertical, tabs scroll horizontal, formulário materiais flex-wrap
- Classe CSS `.scrollbar-hide` para tabs sem scrollbar visível

## V1.52.0 - 2026-02-28
- Permissões granulares: `createPatient` e `updatePatient` fazem auto-sync em `patient_doctors`
- UI Médicos Associados N:N: chips coloridos com add/remove dropdown
- UI Materiais por Fase: secção inline no PhaseDetail com add/remove
- 5 novas funções no `patientsService`: getPatientDoctors, syncDoctors, getPhaseMaterials, addPhaseMaterial, removePhaseMaterial
- Backfill SQL de `patient_doctors` para pacientes existentes

## V1.50.1 - 2026-02-27
- Cards da fila de pedidos com fundo branco para melhor contraste

## V1.50.0 - 2026-02-27
- Hero header gradient na Fila de Pedidos (mesmo estilo visual das fichas)

## V1.49.0 - 2026-02-27
- Catálogo Cores agrupado por escala (Vita Classical, 3D-Master, Chromascop)
- Hero header paciente estilo médico/clínica com avatar de iniciais

## V1.48.0 - 2026-02-27
- Fix tabs invisíveis, QueueCard nome paciente
- Redesign Catálogo Cores de Dentes com círculos VITA e sidebar escalas

## V1.47.0 - 2026-02-27
- Correcção Light Mode — texto invisível, cards cinzentos, contraste
- 60+ ficheiros com `text-card-foreground`, patients layout `bg-background`, queue `bg-muted`

## V1.46.0 - 2026-02-27
- Sistema Toggle Light/Dark Mode por utilizador
- ThemeProvider, CSS variables, toggle na sidebar, 50+ ficheiros convertidos

## V1.45.0 - 2026-02-27
- Dark Mode Global — Dashboard, Clínicas, Médicos, Settings, CatalogManager, UserManagement, BackupSettings e BackupWizard

## V1.44.0 - 2026-02-27
- Guias Recepção — cards expandíveis, menu contextual, confirmar recepção, editar notas, apagar, dark mode badges

## V1.43.0 - 2026-02-27
- Agendamentos UI — dark mode badges, fix `data_prevista`, edição inline data/notas, delete com confirmação

## V1.42.0 - 2026-02-27
- Anti-Duplicação Pacientes — Levenshtein real, dark mode warning, bloqueio auto-save, link "Ver duplicado", score similaridade

## V1.41.1 - 2026-02-27
- Fix StatusesManager — usa campos reais (`nome`/`emoji`) em vez de `label`/`cor`, agrupado por categoria

## V1.41.0 - 2026-02-27
- Módulo Catálogos — CatalogManager (5 sub-tabs CRUD), catalogService, tabelas `materials` + `tooth_colors`, seed data

## V1.40.0 - 2026-02-27
- Considerações V2 Fase 3 — VersionHistory modal, ShareLinkModal (WhatsApp/Email/link), Lab Inside reencaminhamento

## V1.39.0 - 2026-02-27
- ConsiderationsTab V2 — 3 tipos (médico/lab/inside), cards com fields JSONB, TemplatePicker, filtros por lado, resposta `parent_id`

## V1.38.0 - 2026-02-27
- Considerações V2 Fase 1 — DB migration (5 tabelas, ENUM→text, 8 campos novos, RLS) + considerationsService.ts

## V1.37.1 - 2026-02-27
- Documentação infra NAS + Cloudflare Tunnel + estratégia backup 5 camadas + future features

## V1.37.0 - 2026-02-27
- Guias de Transporte e Recepção — tabelas DB, transportService, NewGuideModal, tab Guias no DocumentsTab

## V1.36.0 - 2026-02-27
- Facturação Base — tabelas DB (invoices, receipts, patient_documents), billingService, NewInvoiceModal, DocumentsTab funcional

## V1.35.0 - 2026-02-27
- Sistema Multi-Badge (33 status) — catálogo DB, badgeService, WorkBadges component, integração QueueCard + PlanDetail

## V1.34.0 - 2026-02-27
- Dark theme completo para Kanban — QueueView, QueueColumn, QueueCard

## V1.33.0 - 2026-02-27
- Badge de contagem na sidebar — pedidos activos + urgentes com refresh 30s

## V1.32.0 - 2026-02-27
- Agendamentos — tipos corrigidos (moldagem/para_prova/para_colocacao), campo hora prevista, grid 3x2

## V1.31.0 - 2026-02-27
- Considerações com Anexos — upload ficheiros, preview imagens inline, botão Paperclip

## V1.30.0 - 2026-02-26
- Lifecycle de Fases — lógica sequencial auto-activação + botões acção rápida inline

## V1.29.0 - 2026-02-26
- Drag & Drop no Kanban — arrastar cards entre colunas com modal de motivo e optimistic update

## V1.28.0 - 2026-02-26
- Homepage configurável por utilizador — selector na Minha Conta + redirect automático

## V1.27.0 - 2026-02-26
- Fila de Pedidos — módulo Kanban dedicado com filtros personalizáveis

## V1.26.1 - 2026-02-26
- Dark theme completo — PatientForm, PatientList, layout, tabs UI

## V1.26.0 - 2026-02-26
- Tab Documentação (5ª tab) com categorias Facturas/Recibos/Documentos + placeholders

## V1.25.0 - 2026-02-26
- Layout chat para Considerações — bolhas lab/clínica, agrupamento por fase, input inline

## V1.24.0 - 2026-02-26
- Lifecycle completo dos Planos de Tratamento — 6 estados, ReasonModal com motivos, tipos/estados agendamento correctos

## V1.23.0 - 2026-02-26
- Status do Paciente — badge editável, filtro por estado, migração SQL

## V1.22.0 - 2026-02-26
- Hardening RLS — INSERT policies restritivas + fix recursão SECURITY DEFINER

## V1.21.0 - 2026-02-26
- Anti-Duplicação de Pacientes — warning visual com detecção por similaridade de nome e ID Clínica

## V1.20.0 - 2026-02-26
- Modal de confirmação de delete de paciente — campo ELIMINAR obrigatório, design premium com header gradiente vermelho, spinner loading

## V1.19.0 - 2026-02-25
- Reordenação fases (botões cima/baixo) + `swapPhaseOrder` no service

## V1.18.0 - 2026-02-25
- Upload real de ficheiros com Supabase Storage — bucket `patient-files`, uploadFile, getFileUrl, deleteFile, FilesTab reescrita

## V1.17.0 - 2026-02-25
- Filtro por médico na lista de pacientes

## V1.16.0 - 2026-02-25
- Correcção queries BD — getConsiderations, createConsideration, createPhase, getFiles, ConsiderationsTab

## V1.15.0 - 2026-02-25
- Tab Histórico com timeline de eventos, filtros por tipo, timestamps relativos

## V1.14.0 - 2026-02-25
- Tab Ficheiros com galeria grid, filtros por tipo, drag-and-drop upload

## V1.13.0 - 2026-02-25
- Tab Considerações com timeline lab/clínica, filtros por fase, criação inline

## V1.12.0 - 2026-02-25
- Detalhe do Plano com timeline de fases, CRUD fases/agendamentos, gestão de estados

## V1.11.0 - 2026-02-25
- Modal Novo Plano de Tratamento + dropdowns editáveis de Clínica/Médico/ID na ficha do paciente

## V1.10.0 - 2026-02-25
- Implementação UI do Módulo Pacientes (MVP) — service layer, rotas, componentes PatientList e PatientForm com auto-save, pesquisa, filtros e layout master-detail

## V1.9.0 - 2026-02-25
- Migração MVP Fase 1 — 11 tabelas + 9 ENUMs + RLS (Módulo Pacientes)

## V1.8.0 - 2026-02-20
- Priorizar e Fasear (MVP + 4 fases, roadmap 18 semanas)

## V1.7.0 - 2026-02-20
- Desenhar Interface completa (17 subsecções)

## V1.6.1 - 2026-02-20
- 6 tabelas adicionais — users, clinics, work_types, price_table, wa_message_queue, user_notification_settings

## V1.6.0 - 2026-02-20
- 22 tabelas + 8 auxiliares com campos detalhados

## V1.1.0–V1.5.0
- Construção incremental do MODULO_PACIENTES.md (design doc)
- Definição de entidades, workflows, e interface

## V1.0.0 - 2026-02-12
- Estrutura Base PWA e Módulo de Autenticação Supabase
- Next.js 14, TypeScript, Tailwind CSS v4, Supabase Auth
- Design system, login, dashboard, middleware
