# 📐 Decisões de Design — AsymLAB

> Registo de todas as decisões de design validadas.
> Cada decisão tem data, contexto e status.
> Última actualização: 20/03/2026 (V2.2.0)

---

## 1. Princípios Fundamentais

### P1. NAS = Source of Truth (01/03/2026)
A NAS mantém **sempre** a informação completa. Nada sai da NAS. O Supabase funciona como **cache/espelho parcial** para performance.

### P2. Identificação por ID (01/03/2026)
Pacientes na NAS identificados **apenas pelo T-ID** (não pelo nome) para evitar directórios demasiado longos.

### P3. Confirmação Humana (01/03/2026)
O sistema nunca emite facturas, recibos ou acções irreversíveis automaticamente — **sempre** mostra preview e pede confirmação.

### P4. Versioning Automático (01/03/2026)
Todos os relatórios (fase, plano, fresagem, dentes, considerações) são versionados automaticamente. Versões anteriores mantêm-se na NAS.

### P5. Fidelidade Visual — Mockup → Código (05/03/2026)
Toda alteração de UI significativa DEVE ser precedida de mockup visual. A implementação DEVE reproduzir fielmente o mockup aprovado, com iterações de comparação (screenshot vs mockup) até correspondência visual. Ver workflow `/mockup-fidelity`.

---

## 2. Módulo Pacientes

### D-PAC-01. Chat Interno — Archival Supabase (01/03/2026)
| Campo | Valor |
|-------|-------|
| NAS | Sempre completo |
| Supabase | Últimas 50-100 mensagens como cache |
| Trigger | Pacientes sem plano activo há +6 meses |
| Restauro | Ao reabrir plano → Supabase puxa do NAS |

### D-PAC-02. Histórico — Sempre no Supabase (01/03/2026)
Info leve, custo negligível. NAS guarda backup JSON para redundância.

### D-PAC-03. Numeração Considerações por Plano (01/03/2026)
Sequencial por plano (não por fase). Exibição inclui badge de agendamento. Ex: `Consideração 5 → Ag. 2 · Fase 1`.

### D-PAC-04. Importação de Considerações (01/03/2026)
Modal árvore: Fase → Agendamento → Consideração → selecção granular (títulos, anexos, texto livre). Visual premium obrigatório.

### D-PAC-05. Tipo Agendamento N:N + Principal (01/03/2026)
Múltiplos tipos por agendamento, um marcado como principal. Tabela `appointment_types` com `is_primary`. Pasta NAS usa tipo principal no nome. Ao mudar → rename automático.

### D-PAC-06. Indicadores Visuais da Fase (01/03/2026)
- ℹ️ Verde = Fase tem descrição
- ℹ️ Vermelho = Fase tem nota (sobrepõe verde)
- Clicar → popup com descrição + nota

### D-PAC-07. "Para Colocação" NÃO é automático (01/03/2026)
Quando agendamento "Para Colocação" é dado como **concluído**, o sistema **pergunta**:
- **Sim** → Nova fase criada
- **Não** → Fechar plano (precisa faturas = recibos)
- **Remake** → Nova fase com status Remake (analytics)

### D-PAC-08. Eficiência = 1 Agendamento/Fase (01/03/2026)
100% eficiência = 1 agendamento por fase. Métrica para analytics por clínica/médico/tipo trabalho.

### D-PAC-09. Regra Faturas = Recibos (01/03/2026)
Fase só fecha quando `nº_recibos == nº_faturas`.

### D-PAC-10. Audit Log Completo (01/03/2026)
Todos os eventos da ficha do paciente registados no Histórico, com filtros por categoria: Ficha, Planos, Fases, Agendamentos, Considerações, Chat, Faturação, Fresagem, Dentes, Guias, Alertas.

---

## 3. Chat Interno

> **Estado**: F5a+F5b implementados (V2.2.0, 05/03/2026)
> **F5a** (V2.1.0): Drawer + Messages + Gallery + Service + Migration
> **F5b** (V2.2.0): Pesquisa accent-insensitive, Mobile bottom sheet, Contexto plano
> **Pendente**: F5c — NAS integration (pastas Chat/Galeria/Metadata)

### D-CHAT-01. Galeria (01/03/2026)
Thumbnails no chat, click abre full-screen. Navegação setas/swipe. Botão "Ir para pasta" + "Ir para mensagem" em cada foto.

### D-CHAT-02. Pesquisa (01/03/2026)
Accent-insensitive, case-insensitive. Sugestões clicáveis que navegam para o momento do chat. Pesquisa e sugestões **não desaparecem** ao clicar.

### D-CHAT-03. Navegação por Contexto (01/03/2026)
Botão para navegar entre Planos → Fases → Agendamentos dentro do chat.

### D-CHAT-04. Independência (01/03/2026)
Chat existe independentemente dos planos/fases. Sempre visível na ficha.

### D-CHAT-05. Logs no Histórico (01/03/2026)
Logs do sistema ficam na aba Histórico (separados do chat). Histórico precisa de mais detalhe (tipos de evento, contexto).

---

## 4. Calendário

### D-CAL-01. Biblioteca: FullCalendar (01/03/2026)
Estilo Google Calendar. Suporta drag-and-drop.

### D-CAL-02. Mini-Janela nos Cards (01/03/2026)
Popup tipo Google Calendar com: detalhes agendamento + fase, botões Enviar Guia Transporte (WhatsApp/Email), Dar como Entregue, Editar Guia. Tudo sem navegar para a ficha.

### D-CAL-03. Integração Google Calendar (01/03/2026)
Leitura de calendários partilhados por clínicas. Sync **unidireccional** (lemos deles, eles não afectam os nossos dados). Se eliminarem evento → nosso registo mantém cópia + flag "eliminado externamente". Possibilidade de associar eventos externos a pacientes.

### D-CAL-04. Marcos na Timeline (01/03/2026)
Timeline horizontal do paciente inclui **marcos** que indicam recolhas (entregas físicas).

### D-CAL-05. Configuração do Calendário na Ficha da Clínica (20/03/2026)
Na ficha de cada clínica, existe uma secção de configuração onde se regista o **único calendário partilhado** (ID do Google Calendar — 1 calendário por clínica). Nessa zona, mapeia-se os campos do evento:
- **Nome/Título do evento** → Nome do paciente
- **Descrição do evento** → Tipo de agendamento (texto livre escrito pela clínica — fica como está no nosso sistema)
- **Data/Hora do evento** → Data e horário do agendamento

Desta forma, a aplicação sabe interpretar automaticamente os eventos criados pela clínica.

### D-CAL-06. Notificação ao Criar/Alterar/Eliminar Evento (20/03/2026)
Quando uma clínica cria, altera ou elimina um evento no calendário partilhado:
1. A aplicação recebe uma **notificação** (via webhook/polling do Google Calendar API)
2. A notificação mostra: nome do paciente (do título), tipo de agendamento (da descrição), data/hora, e tipo de acção (novo/alterado/eliminado)
3. **Todos os funcionários do laboratório** recebem a notificação
4. Ao clicar na notificação → inicia o wizard de associação (novo) ou mostra o agendamento afectado (alteração/eliminação)

### D-CAL-07. Wizard de Associação — Paciente (20/03/2026)
Ao clicar na notificação, a app inicia um **wizard** com os seguintes passos:

**Passo 1 — Identificar Paciente:**
- A app sugere automaticamente pacientes existentes nessa clínica (match por nome do evento)
- Se não houver sugestões → campo de pesquisa de pacientes filtrado por essa clínica
- Se o paciente não existir → opção de **criar novo paciente** (pré-preenchido com nome do evento e clínica)

### D-CAL-08. Wizard de Associação — Plano/Fase/Agendamento (20/03/2026)
**Passo 2 — Associar ao Plano:**
Após identificar o paciente:
- Se tem **plano activo** → pergunta se é para esse plano
- Se tem **múltiplos planos** → lista para escolher
- Se **não tem plano** → opção de criar novo plano

**Passo 3 — Associar à Fase:**
- Se o plano tem fases → lista para escolher qual fase
- Se não tem fases → opção de criar nova fase

**Passo 4 — Criar Agendamento:**
- Confirma tipo de agendamento (pré-preenchido da descrição do evento)
- Confirma data/hora (pré-preenchido do evento)
- Cria o agendamento associado à fase seleccionada

### D-CAL-09. Sync de Alterações a Eventos Já Associados (20/03/2026)
Quando a clínica **altera ou elimina** um evento que já foi associado a um paciente:
- A app recebe notificação **imediata** da alteração (sem buffer — já está associado)
- A notificação mostra a mudança proposta (ex: "Novo horário: 14h → 16h")
- **Nada muda automaticamente no paciente** — o funcionário deve confirmar ou rejeitar
- Se confirmado → alteração aplicada ao agendamento do paciente
- Se rejeitado → agendamento mantém-se inalterado, flag "divergência com calendário externo"

### D-CAL-10. Agrupamento Contínuo Até Confirmação (20/03/2026)
Os eventos de uma clínica são criados gradualmente (5-10 min entre si) e podem ser alterados/eliminados antes de serem processados. O buffer **não é temporal** — é baseado na **acção do funcionário**:

**Regra:** Enquanto o funcionário **não confirmar/associar** os eventos pendentes de um paciente, todas as alterações ficam agrupadas na mesma notificação:
- Novos eventos para o mesmo paciente → acrescentados ao grupo
- Evento alterado que ainda não foi confirmado → actualizado no grupo (versão mais recente)
- Evento eliminado que ainda não foi confirmado → removido do grupo (com menção "1 evento eliminado")
- A notificação actualiza-se em tempo real: *"Clínica X — 3 novos, 1 alterado, 1 eliminado para João Silva"*

**No wizard (quando o funcionário finalmente clica):**
- Paciente identificado 1 vez (Passo 1)
- Apresenta a lista consolidada final: apenas os eventos que realmente existem, com os dados mais recentes
- Menciona resumo das alterações que ocorreram (ex: "2 eventos foram alterados desde a criação original")

### D-CAL-11. Confirmação Humana Obrigatória (20/03/2026)
Nenhuma criação, alteração ou eliminação de evento Google Calendar afecta automaticamente os dados do paciente. **Toda a acção requer confirmação explícita do funcionário.** Isto aplica-se tanto a eventos novos (wizard) como a alterações a eventos já associados (D-CAL-09).

### D-CAL-12. Dupla Timestamp no Histórico (20/03/2026)
Quando eventos são associados a pacientes, entram no **histórico do paciente** com **dupla timestamp**:
- **Data do evento** (data original da acção no Google Calendar) → define a **posição cronológica** no histórico
- **Data da associação** (quando o funcionário confirmou) → registada como metadata

Exemplo: evento criado a 12/03, associado a 16/03 → aparece no histórico na posição do dia **12/03**, com nota *"Associado em 16/03"*.

Isto garante que o histórico do paciente reflecte a **cronologia real dos acontecimentos**, mesmo quando a associação é feita dias depois.

---

## 5. Faturação — TOConline

### D-FAT-01. Sandbox Obrigatório (01/03/2026)
TOConline tem API REST com OAuth. Toda integração testada em sandbox antes de produção. Aceder via **Empresa → Dados API** no TOConline.

### D-FAT-02. Fluxo de Facturas (01/03/2026)
Trigger: criar guia transporte ou mudar status. Auto-preenche com tipo trabalho + quantidades. Preview obrigatório → confirmar/editar/cancelar. PDF factura como anexo em `Documentação/Faturas/`.

### D-FAT-03. Fluxo de Recibos (01/03/2026)
Registo de pagamento → sistema sugere emitir recibo. Preview obrigatório. PDF recibo em `Documentação/Recibos/`. Fase só fecha quando `nº_recibos == nº_faturas`.

---

## 6. Widgets

### D-WID-01. Widget Fresagem (01/03/2026)
Widget **separado** da Fila de Pedidos. Mostra pacientes pendentes de escolha de material. Visível apenas a funcionários seleccionados no catálogo.

### D-WID-02. Widget Dentes (01/03/2026)
Para tipos de trabalho com `requires_teeth_record = true`. Registar dentes usados.

### D-WID-03. Widget Componentes (01/03/2026)
Para tipos de trabalho com `requires_component_record = true`. Registar componentes.

### D-WID-04. Avisos no Topo da Ficha (01/03/2026)
Banner no topo da ficha do paciente quando há acções pendentes. Clicar navega para o campo correspondente.

### D-WID-05. Catálogo Tipos de Trabalho — Colunas Extras (01/03/2026)
| Coluna | Efeito |
|--------|--------|
| `requires_teeth_record` | Fase não fecha sem registo |
| `requires_component_record` | Fase não fecha sem registo |
| `requires_color_scale` | Trigger do Widget Fresagem |
| `milling_notify_users` | IDs dos funcionários que recebem widget |

### D-WID-06. Materiais Sugeridos por Contexto (01/03/2026)
Dropdown material ordenado por frequência de uso: clínica × médico × tipo trabalho.
