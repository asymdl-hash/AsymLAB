# 🚀 Roadmap & Features Futuras — AsymLAB

> Funcionalidades planeadas para versões futuras. Ordenadas por prioridade.
> Última actualização: 27/02/2026 (V1.50.1)

---

## ✅ Concluído (V1.0–V1.50.1)

### Infra & Autenticação
- [x] Estrutura PWA (Next.js 14, TypeScript, Tailwind v4, Supabase)
- [x] Autenticação Supabase (login, middleware, roles)
- [x] Gestão de Utilizadores (4 roles: admin, doctor, staff_clinic, staff_lab)
- [x] RLS policies completas (SELECT, INSERT, UPDATE, DELETE)
- [x] Sistema de backups (FULL/INCR/AUTO com Task Scheduler)
- [x] Light/Dark mode toggle por utilizador

### Módulo Pacientes (MVP ~96%)
- [x] CRUD Pacientes com auto-save
- [x] Anti-duplicação Levenshtein (3 estados: ok/warning/block)
- [x] Status do paciente (rascunho/activo/inactivo/arquivado)
- [x] Planos de Tratamento — lifecycle 6 estados + ReasonModal
- [x] Fases — lifecycle 4 estados + sequencial + reordenação
- [x] Agendamentos — 6 tipos, 7 estados, edição inline
- [x] Considerações V2 — templates, versioning, share links, lab inside, anexos
- [x] Tab Ficheiros — upload Supabase Storage, galeria, drag-and-drop
- [x] Tab Histórico — timeline de eventos
- [x] Tab Documentação — facturas, recibos, documentos
- [x] Multi-Badge (33 status em 6 categorias)
- [x] Guias de Transporte e Recepção (cards, confirmação, estados)
- [x] Facturação base (invoices, receipts, NewInvoiceModal)
- [x] Fila de Pedidos Kanban (drag & drop, filtros, hero header)
- [x] Catálogos (5 sub-tabs: Tipos Trabalho, Materiais, Cores, Templates, Status)

### Módulos Auxiliares
- [x] Módulo Clínicas (ficha, contactos, pontos de entrega, descontos)
- [x] Módulo Médicos (ficha, parceiros, clínicas associadas)
- [x] Homepage configurável por utilizador
- [x] Badge contagem sidebar com refresh 30s

---

## 🔴 Alta Prioridade (Próximas versões)

### Completar MVP Pacientes (~4%)
- [ ] Permissões granulares — médico vê só seus pacientes, staff clínica só da sua clínica
- [ ] Médicos associados N:N — tabela `patient_doctors` existe, falta UI
- [ ] Materiais por fase — tabela `phase_materials` existe, falta UI
- [ ] Responsividade mobile/tablet completa

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

### Fase 2 — Comunicação WhatsApp (0%)
- [ ] Integração Z-API / Evolution API
- [ ] Grupos por clínica automatizados
- [ ] @comandos (solicitações, aprovações, fotos)
- [ ] Templates de mensagens
- [ ] Fila anti-spam (FIFO com limites)
- [ ] Alertas de estado (ASAP, agendamento)

### Fase 3 — Billing Completa (30%)
- [ ] Integração TOConline (facturas automáticas)
- [ ] Fechar fase sem factura (2 modals de confirmação)
- [ ] Relatórios de facturação por período/clínica
- [ ] Exportação PDF de facturas

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
