# 🚀 Roadmap & Features Futuras — AsymLAB

> Funcionalidades planeadas para versões futuras. Ordenadas por prioridade.
> Última actualização: 05/03/2026 (V1.92.1)
> Ver decisões detalhadas: [DECISOES.md](DECISOES.md)

---

## ✅ Concluído (V1.0–V1.66.0)

### Infra & Autenticação
- [x] Estrutura PWA (Next.js 14, TypeScript, Tailwind v4, Supabase)
- [x] Autenticação Supabase (login, middleware, roles)
- [x] Gestão de Utilizadores (4 roles: admin, doctor, staff_clinic, staff_lab)
- [x] RLS policies completas (SELECT, INSERT, UPDATE, DELETE)
- [x] Sistema de backups (FULL/INCR/AUTO com Task Scheduler)
- [x] Light/Dark mode toggle por utilizador

### Módulo Pacientes (MVP 100%)
- [x] CRUD Pacientes com auto-save
- [x] Anti-duplicação Levenshtein (3 estados: ok/warning/block)
- [x] Status do paciente (rascunho/activo/inactivo/arquivado)
- [x] Planos de Tratamento — lifecycle 6 estados + ReasonModal
- [x] Fases — lifecycle 4 estados + sequencial + reordenação
- [x] Agendamentos — 6 tipos, 7 estados, edição inline
- [x] Considerações V2 — templates, versioning, share links, lab inside, anexos
- [x] Tab Ficheiros — upload Supabase Storage, galeria, drag-and-drop *(nota: substituída por campos integrados no bloco Info Técnica — Mockup V5)*
- [x] Tab Histórico — timeline de eventos
- [x] Tab Documentação — facturas, recibos, documentos
- [x] Multi-Badge (33 status em 6 categorias)
- [x] Guias de Transporte e Recepção (cards, confirmação, estados)
- [x] Facturação base (invoices, receipts, NewInvoiceModal)
- [x] Fila de Pedidos Kanban (drag & drop, filtros, hero header) *(nota: mantém implementação Kanban — drawer descartado)*
- [x] Catálogos (5 sub-tabs: Tipos Trabalho, Materiais, Cores, Templates, Status)
- [x] Odontograma V7 — 32 dentes com SVG anatómicos reais (FDI ISO 3950)
- [x] Materiais por fase — UI + CRUD `phase_materials`
- [x] Médicos associados N:N — UI multi-select + `patient_doctors`

### Catálogos Produção & Definições (V1.79–V1.82)
- [x] Fornecedores — CRUD completo, cards ricos (NIF, website, telefone, morada), 12 seeds
- [x] Marcas — Grid CRUD inline, 36 seeds
- [x] Fases de Produção — Lista ordenada com badges de cor, 17 seeds
- [x] Materiais expandidos — PVP, IVA, fator conversão, porção, desconto, refs fabricante/fornecedor, reunião
- [x] Tabela de Preços Histórica — `material_price_history` para auditoria
- [x] Custos de Produção — Tabela fases×materiais, 4 KPI Cards (Custo Material, MdO, Global, Margem)
- [x] Auto-preenchimento material → custo/porção nos Tipos de Trabalho

### Módulos Auxiliares
- [x] Módulo Clínicas (ficha, contactos, pontos de entrega, descontos)
- [x] Módulo Médicos (ficha, parceiros, clínicas associadas)
- [x] Homepage configurável por utilizador
- [x] Badge contagem sidebar com refresh 30s

### Patient UX & Fila de Pedidos (V1.83–V1.86)
- [x] Banner avisos no topo da ficha do paciente (PatientAlerts) — V1.83.0
- [x] Botão 📋 Copiar Resumo nos Widgets (Dentes, Componentes) — V1.84.0
- [x] Fila de Pedidos: auto-refresh 30s, médico no card, badge dias em espera, ordenação inteligente — V1.85.0
- [x] Tabela `app_settings` + `settingsService` (configurações globais key-value) — V1.85.0
- [x] Tab Definições Gerais no CatalogManager (thresholds configuráveis) — V1.85.0
- [x] Cores configuráveis nos badges (paleta 8 cores, selectores visuais) — V1.86.0

---

## 🔴 Alta Prioridade (Próximas versões)

### Completar MVP Pacientes ✅ (100%)
- [x] Permissões granulares — `has_patient_access()` com 3 regras: admin/lab vê tudo, staff clínica vê da clínica, médico vê seus pacientes
- [x] Responsividade mobile/tablet — instrução touch, avatar, botões full-width, título break-words

### Infraestrutura NAS (~75%) → [PACIENTES_NAS.md](../modulos/PACIENTES_NAS.md)
- [x] Criação automática de subpastas ao criar paciente/plano/fase/agendamento (V1.72.0)
- [x] Rename automático de pastas quando tipo/data do agendamento muda (V1.73.0)
- [ ] Padrão NAS=master, Supabase=cache (últimas 50-100 msgs chat)

### Novos Modelos de Dados ✅ → [DECISOES.md](DECISOES.md)
- [x] Tipo agendamento N:N + principal (`appointment_work_types`, `is_primary`)
- [x] `milling_records` — registos fresagem com CNC, material, status
- [x] `teeth_records` — registos dentes (obrigatório por tipo trabalho)
- [x] `component_records` — registos componentes
- [x] `phase_reports` + `plan_reports` — relatórios versionados
- [x] Audit log completo (`activity_log` com 14 categorias)
- [x] Catálogo tipos trabalho: colunas `requires_teeth_record`, `requires_component_record`, `requires_color_scale`
- [x] Fases: `descricao` + `tipo_fase` (normal/remake)

### Widgets (~80%) → [DECISOES.md](DECISOES.md#6-widgets)
> ℹ️ Progresso actualizado de ~50% para ~80% com base na implementação de Fresagem, Dentes e Componentes.
- [x] Widget Fresagem — selecção material, 3 estados, check NAS (V1.74.0)
- [x] Widget Dentes — odontograma assign materiais, múltiplos registos, versionamento (V1.75.0-V1.76.0)
- [x] Catálogo materiais unificado — flags `widget_dentes`, `widget_fresagem`, `widget_componentes` (V1.76.0)
- [x] Widget Dentes/Componentes: botões acção por registo — 📋 Copiar, 📂 Pasta, 📱 WhatsApp — V1.84.0/V1.87.0
- [x] Widget Componentes — material/qtd/refs/fornecedor, odontograma, pasta, versionamento (V1.77.0)
- [x] Banner avisos no topo da ficha do paciente — V1.83.0
- [ ] Config clínica: `canal_comunicacao` (email) para controlar botões partilha — futuro

### Chat Interno (0%) → [DECISOES.md](DECISOES.md#3-chat-interno)
- [ ] Mensagens + anexos com thumbnails
- [ ] Galeria full-screen (setas, swipe, ir para pasta/mensagem)
- [ ] Pesquisa accent-insensitive com sugestões
- [ ] Navegação por Plano → Fase → Agendamento

### QA & Estabilização
- [ ] Testes formais de QA do módulo pacientes
- [ ] Testes de todas as permissões por role
- [ ] Fix de bugs encontrados em QA

---

## 🟡 Média Prioridade

### Melhorias Funcionais
- [ ] Considerações agrupadas por fase/agendamento (lista flat → agrupada)
- [ ] Auto-transições multi-badge (triggers SQL)
- [ ] Facturação por fase automática
- [ ] Lock optimista (concorrência)
- [ ] Pedidos E📋 com aceitar/transitar/cancelar
- [ ] Impressão PDF das considerações

### PWA Improvements
- [ ] Notificações push nativas
- [ ] Service Worker cache offline para fichas de pacientes
- [ ] Sincronização offline avançada
- [ ] App Store (TWA para Android)

### Gemini MCP Integration (Google AI)
- [ ] AI assistant para análise de dados clínicos
- [ ] Sugestões automáticas baseadas em histórico
- [ ] Processamento de linguagem natural para pesquisa
- [ ] Geração automática de relatórios com insights

---

## 🟢 Baixa Prioridade / Fases Futuras

### Fase 2 — WhatsApp Z-API (~5%)
> ⚠️ Rever implementação anterior (Lab Software) — problemas com ficheiros grandes e @comandos com muitos anexos
- [x] Botões 📱 WhatsApp nos widgets (open group URL + copy) — V1.87.0
- [ ] Integração Z-API — envio directo de mensagens ao grupo do paciente
- [ ] Auto-resolver Group ID a partir do link de convite (`/group-invite-metadata`)
- [ ] Criação automática de grupo WA ao criar paciente novo (se não existir)
- [ ] Fluxo `@criarpaciente` — perguntar sobre grupo WA ao aceitar pedido
- [ ] @comandos (solicitações, aprovações, fotos) — rever limitações de ficheiros
- [ ] Templates de mensagens
- [ ] Fila anti-spam (FIFO com limites)
- [ ] Alertas de estado (ASAP, agendamento)

### Fase 3 — Billing Completa (30%) → [DECISOES.md](DECISOES.md#5-faturação--toconline)
- [ ] Integração TOConline — API REST + OAuth (sandbox obrigatório)
- [ ] Facturas automáticas com preview + confirmação humana
- [ ] Recibos automáticos (trigger: registo pagamento)
- [ ] Regras: fase só fecha quando nº_recibos == nº_faturas
- [ ] Relatórios de facturação por período/clínica
- [ ] Exportação PDF de facturas

### Calendário (0%) → [DECISOES.md](DECISOES.md#4-calendário)
- [ ] FullCalendar com visual Google Calendar
- [ ] Mini-janela nos cards (guia transporte, marcar entregue)
- [ ] Integração Google Calendar (calendários partilhados pelas clínicas)
- [ ] Associar eventos externos a pacientes
- [ ] Marcos na timeline (indicação de recolhas)

### Fase 4 — Premium
- [ ] Visualizador STL 3D (Three.js)
- [ ] Merge de pacientes (wizard 3 passos)
- [ ] Câmara HD integrada
- [ ] NAS migration (Cloudflare Tunnel)
- [ ] Analytics avançados por médico/clínica
- [ ] Machine Learning para previsão de prazos

### Infra
- [ ] Migração ficheiros para NAS (quando hardware adquirido)
- [ ] Contactos Inteligentes (flag `is_contact` + contactos por entrega)
- [ ] Role Contabilidade
- [ ] OAuth social (Google, Microsoft)

---

## 📝 Notas Técnicas

### Branch Vercel para Experimentação
1. `git checkout -b feature/nome-feature`
2. `git push origin feature/nome-feature`
3. Vercel cria Preview Deployment automático
4. Testar isoladamente em URL separado
5. Merge para `main` → deploy produção

> Cada push para branch não-main gera um Preview Deployment com URL única.
