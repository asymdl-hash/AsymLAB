# 🦷 Módulo Pacientes — AsymLAB

> **Documento colaborativo de design.**  
> Construído iterativamente — cada secção é discutida e validada antes de implementar.  
> Última actualização: 27/02/2026

---

## Progresso

| Etapa | Tema | Estado |
|-------|------|--------|
| 1 | Definir o Problema | ✅ Concluída |
| 2 | Identificar os Actores | ✅ Concluída |
| 3 | Definir as Entidades | ✅ Concluída (23 secções) |
| 4 | Mapear os Fluxos | ✅ Concluída (10 fluxos + 2 transversais) |
| 5 | Definir a Informação | ✅ Concluída (28 tabelas + 8 auxiliares) |
| 6 | Desenhar a Interface | ✅ Concluída (17 subsecções — layouts, componentes, a11y) |
| 7 | Priorizar e Fasear | ✅ Concluída (4 fases — MVP→Comunicação→Billing→Premium) |

---

## Etapa 1 — Definição do Problema

### 1.1 — O Problema

O laboratório AsymLAB precisa de um sistema digital para gerir os seus pacientes, planos de tratamento, agendamentos e comunicação com as clínicas parceiras. Actualmente, o fluxo é gerido manualmente, com informação dispersa entre WhatsApp, papel e memória.

### 1.2 — Objectivos do Módulo

1. Centralizar toda a informação do paciente num só lugar
2. Gerir planos de tratamento com múltiplas fases e agendamentos
3. Automatizar comunicações via WhatsApp (avisos, lembretes, pedidos)
4. Permitir que clínicas acedam à informação dos seus pacientes
5. Rastrear o estado de cada trabalho em tempo real
6. Gerir documentação, materiais e billing

---

## Etapa 2 — Actores e Permissões

### 2.1 — Actores do Sistema

| Actor | Descrição | Exemplos |
|-------|-----------|----------|
| **Admin** | Controlo total do sistema. Gere utilizadores, configurações e tem acesso a tudo | Dono do laboratório |
| **Staff Lab** | Funcionários do laboratório. Acedem a todos os pacientes e trabalhos | Técnicos de prótese, gestão |
| **Médico** | Profissional de saúde numa clínica parceira. Só vê os seus pacientes | Dentista, ortodontista |
| **Staff Clínica** | Funcionário da clínica. Vê pacientes da sua clínica | Recepcionista, assistente |
| **Paciente** | O próprio paciente. Acesso muito limitado (futuro) | — |

### 2.2 — Matriz de Permissões

| Funcionalidade | Admin | Staff Lab | Médico | Staff Clínica |
|----------------|-------|-----------|--------|---------------|
| Ver todos os pacientes | ✅ | ✅ | ❌ | ❌ |
| Ver pacientes da sua clínica | ✅ | ✅ | ✅ | ✅ |
| Criar paciente | ✅ | ✅ | ✅ | ✅ |
| Editar paciente | ✅ | ✅ | ✅ (só seus) | ❌ |
| Criar plano de tratamento | ✅ | ✅ | ✅ | ❌ |
| Gerir agendamentos | ✅ | ✅ | ✅ (só seus) | ❌ |
| Enviar considerações | ✅ | ✅ | ✅ | ❌ |
| Ver considerações | ✅ | ✅ | ✅ (só seus) | ✅ (só da clínica) |
| Criar pedidos (E📋) | ✅ | ✅ | ✅ | ✅ |
| Aprovar pedidos | ✅ | ✅ | ❌ | ❌ |
| Gerir avisos | ✅ | ✅ | ❌ | ❌ |
| Gerir ficheiros NAS | ✅ | ✅ | ❌ | ❌ |
| Ver ficheiros (download) | ✅ | ✅ | ✅ (só seus) | ✅ (só da clínica) |
| Configurações do sistema | ✅ | ❌ | ❌ | ❌ |
| Gerir utilizadores | ✅ | ❌ | ❌ | ❌ |

---

## Etapa 3 — Entidades e Relações

### 3.1 — Hierarquia Principal

```
PACIENTE
  └─ PLANO DE TRATAMENTO (1 ou mais)
       └─ FASE (1 ou mais)
            └─ AGENDAMENTO (1 ou mais)
```

> Um paciente pode ter vários planos (ex: ortodontia + implante).
> Cada plano tem fases (ex: moldagem → prova → colocação).
> Cada fase tem agendamentos com a clínica.

### 3.2 — Entidade: Paciente

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Nome completo | texto | ✅ | Nome que o lab conhece o paciente |
| ID Paciente Clínica | texto | ❌ | Código interno da clínica para este paciente (ex: "PAC-0412"). Opcional mas recomendado para anti-duplicação |
| Clínica associada | FK | ✅ | Clínica de origem |
| Médicos associados | array FK | ✅ | Todos os médicos que trabalham com este paciente |
| Médico principal | FK | ✅ | Um dos médicos associados — o que está a receber o paciente. Pode ser alterado a qualquer momento |
| Notas lab | texto | ❌ | Só visível Staff Lab — observações internas livres sobre este paciente (ex: "alérgico ao níquel", "paciente exige acabamento perfeito") |

> **Equipa do paciente** = todos os médicos associados + os colaboradores (Staff Clínica) de cada médico + todo o Staff Lab.
> Esta equipa define quem vê o paciente e quem entra no grupo WA.

### 3.3 — Anti-Duplicação de Pacientes

> Sistema de detecção inteligente para evitar duplicações na criação de pacientes.
> Usa o **ID Paciente Clínica** como critério principal e o **nome** como critério secundário.

**Regras de criação:**

| Situação | Resultado |
|----------|-----------|
| Mesmo nome + **ambos têm ID Paciente Clínica** + IDs **diferentes** | ✅ Pode criar — são pacientes diferentes |
| Mesmo nome + **ambos têm ID Paciente Clínica** + IDs **iguais** | ❌ Bloqueia — é duplicação |
| Mesmo nome + **nenhum** tem ID Paciente Clínica | ❌ Bloqueia — pede ao utilizador para preencher o ID Paciente Clínica ou o nome completo do paciente para confirmar |
| Mesmo nome + **só um** tem ID Paciente Clínica | ⚠️ Avisa — sugere preencher o ID no outro para confirmar que são diferentes |
| Nomes **diferentes** | ✅ Pode criar — sem conflito |

**Algoritmo:** Correspondência fuzzy no nome (Levenshtein distance ≤ 3) + comparação de ID Paciente Clínica dentro da mesma clínica.

### 3.4 — Entidade: Plano de Tratamento

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Nome do plano | texto | ✅ | Ex: "Ortodontia superior" |
| Tipo de trabalho | enum/FK | ✅ | Configurável no módulo Configurações |
| Estado | enum | ✅ | Activo / Concluído / Cancelado |
| Data de início | data | ✅ | Auto: data de criação |
| Data de conclusão | data | ❌ | Preenchida ao concluir |
| Médico responsável | FK | ✅ | Herda do paciente, editável |
| Clínica | FK | ✅ | Herda do paciente |
| Notas | texto | ❌ | — |

### 3.5 — Entidade: Fase

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Nome da fase | texto | ✅ | Ex: "Moldagem", "Prova", "Colocação" |
| Ordem | número | ✅ | Posição na sequência |
| Estado | enum | ✅ | Pendente / Em curso / Concluída |
| Notas | texto | ❌ | — |

### 3.6 — Entidade: Agendamento

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Fase associada | FK | ✅ | Liga à fase |
| Tipo | enum | ✅ | Prova / Colocação / Reparação / Ajuste / Outro |
| Data prevista | data | ❌ | Pode ser "sem data" inicialmente |
| Data real | data | ❌ | Preenchida quando acontece |
| Estado | enum | ✅ | Agendado / Concluído / Cancelado / Remarcado |
| Notas | texto | ❌ | — |

### 3.7 — Entidade: Considerações (Comunicação Clínica ↔ Lab)

> As considerações são o principal canal de comunicação técnica entre clínica e lab.

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Agendamento associado | FK | ✅ | Liga ao agendamento |
| Autor | FK | ✅ | Quem escreveu |
| Tipo | enum | ✅ | Nota técnica / Instrução / Pedido / Resposta |
| Conteúdo | texto rico | ✅ | Suporta formatação, imagens inline |
| Versão | número | ✅ | Auto-incremento (versionamento) |
| Data | datetime | ✅ | Auto |
| Anexos | array FK | ❌ | Liga a ficheiros na NAS |

**Versionamento:** Cada edição cria uma nova versão. Histórico completo acessível.

### 3.8 — Entidade: Aviso (Notificação Interna Lab)

> Avisos são notificações internas do laboratório — não são visíveis para clínicas.

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Título | texto | ✅ | Descrição curta |
| Corpo | texto | ❌ | Detalhe |
| Prioridade | enum | ✅ | Normal / Urgente / Crítico |
| Estado | enum | ✅ | Activo / Finalizado |
| Criado por | FK | ✅ | Auto |
| Finalizado por | FK | ❌ | Quem marcou como resolvido |
| Paciente associado | FK | ❌ | Opcional — pode ser geral |
| Visível para | array | ✅ | Staff Lab + Admin |

### 3.9 — Entidade: Pedido (E📋)

> Pedidos são **notificações automáticas** geradas quando médicos ou staff clínica fazem alterações no sistema.
> O objectivo é que o laboratório saiba **exactamente o que foi criado ou alterado** sem ficar perdido.

**Quando é gerado um pedido:**

| Acção do médico/staff clínica | Pedido gerado |
|-------------------------------|---------------|
| Cria um paciente novo | 📋 "Novo paciente criado: [nome]" |
| Cria um plano de tratamento | 📋 "Novo plano criado: [nome plano] para [paciente]" |
| Cria uma fase ou agendamento | 📋 "Nova fase/agendamento criado em [plano]" |
| Edita dados de um paciente, plano, fase ou agendamento | 📋 "[campo] alterado de [valor antigo] para [valor novo] em [contexto]" |
| Outro pedido manual | 📋 Texto livre do utilizador |

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Tipo de pedido | enum | ✅ | Criação / Edição / Material / Outro |
| Descrição | texto | ✅ | Auto-gerada ou texto livre |
| Entidade afectada | FK | ❌ | Link directo ao paciente, plano, fase ou agendamento alterado |
| O que mudou | JSON | ❌ | Diff automático: campo + valor antigo + valor novo |
| Prioridade | enum | ✅ | Normal / Urgente |
| Estado | enum | ✅ | Pendente / Visto / Concluído |
| Criado por | FK | ✅ | Médico ou Staff Clínica (auto) |
| Visto por | FK | ❌ | Admin ou Staff Lab que abriu o pedido |
| Data criação | datetime | ✅ | Auto |

> O lab recebe estes pedidos como uma **fila de notificações** — pode marcar como "Visto" ou "Concluído".
> Isto garante que nenhuma alteração passa despercebida.

### 3.10 — Entidade: Ficheiro (Metadados — referência à NAS)

> Os ficheiros físicos estão na NAS. O Supabase guarda metadados e thumbnails.
> **Backup de metadados na NAS:** Uma cópia dos metadados é exportada periodicamente para a NAS (JSON/CSV), garantindo portabilidade total caso se migre de plataforma. Aplica-se a **todos os módulos**.

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| Nome original | texto | ✅ | Nome do ficheiro |
| Tipo | enum | ✅ | STL / Foto / Documento / Vídeo / Outro |
| Caminho NAS | texto | ✅ | Path relativo na NAS |
| Tamanho | número | ✅ | Em bytes |
| Thumbnail URL | texto | ❌ | Supabase Storage (≤ 200 KB) |
| Paciente associado | FK | ✅ | — |
| Enviado por | FK | ✅ | — |
| Data upload | datetime | ✅ | Auto |

> ⚠️ **Regra global de portabilidade:** Todos os módulos devem ter export periódico dos metadados para a NAS. Se um dia se migrar do Supabase, toda a informação está na NAS.

### 3.11 — Comunicação WhatsApp

> O sistema envia mensagens automáticas via WhatsApp usando @comandos e templates.
> **Configurável:** No módulo Configurações, o admin pode criar novos @comandos, definir a automação associada, e controlar **quem pode usar cada comando** (por role e por médico individual).

#### @Comandos Principais (defaults)

| Comando | Acção | Quem pode usar (default) |
|---------|-------|-------------------------|
| @criarpaciente | Gera formulário para criar paciente + plano (ver F1 — 4.6) | Todos |
| @novotratamento | Gera formulário para novo plano em paciente existente (ver F2 — 4.11) | Todos |
| @entregue | Confirma agendamento e muda status para "[tipo] Entregue" | Staff Lab |
| @recolher | Marca para recolha (bidirecional: lab ou clínica) | Todos |
| @recolhido | Confirma que trabalho foi recolhido pela clínica | Staff Lab |
| @urgente | Marca como urgente — topo de widgets (toggle) | Staff Lab |
| @nota | Adiciona nota rápida às Considerações do plano activo | Todos |

> **Permissões por comando:** Além dos defaults por role, o admin pode definir excepções por médico individual.
> Exemplo: @recolher pode ser autorizado para Dr. Silva mas ignorado para Dr. Costa.
> Comandos não autorizados são **ignorados silenciosamente** (sem erro, sem resposta).

#### Templates de Mensagem

| Template | Quando | Conteúdo |
|----------|--------|----------|
| Lembrete de agendamento | 24h antes | "Olá, lembramos que amanhã tem agendamento..." |
| Material em falta | Checklist incompleto | "Material em falta para o paciente X: ..." |
| Trabalho pronto | Status "Pronto" | "O trabalho do paciente X está pronto para entrega" |
| Prova entregue | @entregue | "A prova do paciente X foi entregue na clínica" |

> 👉 Tanto os @comandos como os templates serão **trabalhados em mais detalhe** nas próximas etapas.

### 3.12 — Grupo WhatsApp por Paciente

> Cada paciente tem um grupo WA dedicado com a **equipa completa**.

**Membros do grupo:**
- **Todos** os médicos associados ao paciente (não só o principal)
- **Todo** o Staff Lab (todos os funcionários do laboratório)
- Colaboradores (Staff Clínica) de cada médico associado

> Quando um novo médico é associado ao paciente, é automaticamente adicionado ao grupo.

**Criação automática:** Quando um paciente é criado, o sistema sugere a criação do grupo WA. Badge "Criar Grupo" aparece até ser feito.

#### 📌 Implementação Parcial (V1.63.1)

> **Campo:** `patients.whatsapp_group_url` (TEXT, nullable) — armazena a URL de convite do grupo WhatsApp associado ao paciente.

**UI implementada:**
- **Ícone no avatar** (hero header da ficha do paciente) — canto inferior-direito
  - 🔘 **Cinza** quando `whatsapp_group_url` é NULL (sem grupo)
  - 🟢 **Verde** quando `whatsapp_group_url` tem URL (grupo associado)
- **Popup de edição** — ao clicar no ícone, abre popup com input para URL e botão "Guardar"
- **Save directo** — grava imediatamente no Supabase (sem debounce)

**Fluxos de preenchimento do campo `whatsapp_group_url`:**

| Fluxo | Origem | Acção Esperada |
|-------|--------|----------------|
| **Manual** | Utilizador cola URL no popup | Guardar URL → ícone fica verde |
| **Automático (futuro)** | Z-API cria grupo via API | Endpoint `/api/whatsapp/create-group` grava URL automaticamente |
| **Via @criargrupo (futuro)** | Comando WhatsApp | Bot cria grupo e preenche URL no paciente |

> **Integração futura com Z-API:** Quando o módulo de automações WhatsApp for implementado (Fase 2 — Comunicação), o campo `whatsapp_group_url` será preenchido automaticamente pela API ao criar o grupo. A tabela `wa_groups` (5.8) manterá os metadados completos do grupo, mas o campo na tabela `patients` serve de **atalho rápido** para o link de convite.

### 3.13 — Fila de Mensagens WhatsApp

> Sistema interno de fiabilidade para envio de mensagens.

| Aspecto | Detalhe |
|---------|---------|
| **Retry** | 3 tentativas com backoff exponencial |
| **Fallback** | Após 3 falhas → notificação ao admin |
| **Agendamento** | Mensagens podem ser programadas |
| **Prioridade** | Urgentes primeiro, depois FIFO |

### 3.14 — Caixa (É um Badge, NÃO uma Entidade)

> A caixa **não é uma entidade na BD** — é apenas o **badge de status "Criar Caixa"** (status #1 no sistema multi-badge).
> Quando se cria um paciente ou um plano novo, o badge "📦 Criar Caixa" aparece para lembrar o funcionário de preparar a caixa física.
> Quando o funcionário marca como feito, o badge desaparece. Sem entidade, sem tabela na BD.

### 3.15 — Merge de Pacientes Duplicados

> Quando se detecta que dois registos são o mesmo paciente, podem ser fundidos.

**Regras do merge:**
1. Escolher qual registo é o "principal" (sobrevive)
2. Mover todos os planos, agendamentos, ficheiros do secundário para o principal
3. Soft delete do registo secundário (mantém referência por 48h para "Desfazer")
4. Log de auditoria: quem fez + quando + o que foi movido

### 3.16 — Concorrência e Edição Simultânea

> Lock optimista para resolver conflitos quando 2 pessoas editam o mesmo item.

**Como funciona:**
1. Ao abrir um registo, guardar o `updated_at` actual
2. Ao gravar, comparar com o `updated_at` na BD
3. Se diferente → alguém editou entretanto → mostrar aviso com as duas versões
4. Utilizador escolhe: manter a sua, aceitar a outra, ou misturar

### 3.17 — Escalação de Pedidos

> Pedidos (E📋) sem resposta são escalados automaticamente.

| Tempo sem resposta | Acção |
|-------------------|-------|
| 24h | Reenviar notificação ao responsável |
| 72h | Escalar para admin principal |
| 7 dias | Marcar como "Abandonado" + notificar admin |

### 3.18 — Health Check da NAS

> Monitorização contínua da disponibilidade da NAS.

| Aspecto | Detalhe |
|---------|---------|
| **Frequência** | Ping a cada 5 minutos |
| **Se offline** | Badge 🔴 no dashboard + notificação admin |
| **Se voltar** | Badge desaparece automaticamente |
| **Interface** | Ficheiros mostram "NAS offline" em vez de thumbnail |

### 3.19 — Billing e Facturação

> ⬜ **Por definir** — secção reservada para quando o utilizador decidir como gerir facturação.
> Pode incluir: rastreamento de custos por plano, integração com software de facturação, ou gestão manual.
> Será discutido em detalhe após o MVP.

### 3.20 — Documentação (Notas e Relatórios)

> ⬜ **Por definir** — secção reservada para documentação técnica associada a pacientes.
> Pode incluir: relatórios, notas clínicas, orçamentos exportados, etc.
> Será discutido em detalhe após o MVP.

### 3.21 — Estratégia de Ficheiros: NAS-First

> **Decisão de arquitectura:** Ficheiros grandes sempre na NAS. Supabase só para metadados e thumbnails pequenos.

| Tipo de ficheiro | Onde fica | Tamanho máx. |
|------------------|-----------|--------------|
| STL, fotos HD, vídeos | NAS | Sem limite |
| Thumbnails | Supabase Storage | ≤ 200 KB cada |
| Metadados (nome, path, tipo) | Supabase BD | — |

**Acesso externo:** Via Cloudflare Tunnel gratuito.
- Serviço instalado num PC do lab (ou na NAS)
- Cria túnel encriptado para o Cloudflare
- Ficheiros servidos directamente da NAS → sem custo de storage cloud

**Custo estimado:** ~€17/mês (só Zappi para WA). Sem custos de storage cloud.

### 3.22 — Cloudflare Tunnel vs Pre-Loading

> **Decisão:** Pre-loading (NAS→Supabase→User) gasta o dobro do bandwidth.
> Com 10 ficheiros de 20 MB, cada abertura de ficha consome ~400 MB.
> Cloudflare Tunnel faz streaming directo da NAS sem intermediário.

**Requisitos de rede no lab:**
- Upload recomendado: ≥ 50 Mbps (o lab tem 100 Mbps ✅)
- Com 100 Mbps: STL de 50 MB chega em ~4 segundos

> **Decisão MVP:** Tudo na NAS via Cloudflare Tunnel. Thumbnails pequenos no Supabase.
> Se os thumbnails crescerem demasiado, migramos também para NAS via tunnel.

---

### 3.23 — Melhorias Futuras de Infraestrutura

> Opções a considerar **após lançamento**, caso o uso real revele necessidade.

| # | Melhoria | Quando considerar | Custo estimado |
|---|----------|-------------------|----------------|
| 1 | **Upgrade upload internet** (pedir à operadora) | Se médicos reportarem lentidão nos ficheiros | ~€0-10/mês extra |
| 2 | **Plano fibra simétrico** (1 Gbps up/down) | Se >10 médicos acedem ficheiros ao mesmo tempo | ~€40-60/mês |
| 3 | **UPS na NAS/PC** do tunnel | Antes do lançamento (protecção contra falhas de luz) | ~€50-100 (único) |
| 4 | **Pen 4G/5G com cartão móvel** (failover internet) | Antes do lançamento (dados ilimitados) | ~€10-15/mês |
| 5 | **Router com failover automático** | Se quiser failover sem intervenção manual | ~€30-80 (único) |
| 6 | **CDN para thumbnails** (Cloudflare Pages) | Se thumbnails ficarem lentos globalmente | Gratuito |
| 7 | **NAS redundante** (RAID ou 2ª unidade) | Se volume de ficheiros crescer muito | ~€200-500 (único) |

> ⚠️ Itens 3 e 4 são **recomendados antes do lançamento**. Os restantes são optimizações futuras.
> O failover automático do Windows funciona: Ethernet prioridade 1, WiFi/USB da pen prioridade 2.

---

### 3.24 — WhatsApp Group URL (V1.63.1)

> **Badge visual no avatar** do paciente para indicar se existe grupo WhatsApp associado.

| Aspecto | Detalhe |
|---------|---------|
| **Campo BD** | `patients.whatsapp_group_url` (TEXT, nullable) |
| **Ícone** | Canto inferior-direito do avatar no hero header |
| **Cor cinza** | Sem URL → sem grupo associado |
| **Cor verde** | URL preenchido → grupo WhatsApp activo |
| **Edição** | Popup com input ao clicar no ícone + botão "Guardar" |
| **Save** | Directo (sem debounce) via `updatePatient()` |
| **Componente** | `PatientForm.tsx` — `whatsappRef` + `whatsappPopupRef` (portal) |

> [!IMPORTANT]
> **Integração futura:** Quando a criação automática de grupos WhatsApp for implementada (via Zappi/API),
> o campo `whatsapp_group_url` deve ser preenchido automaticamente pelo sistema.
> O ícone passará a verde sem intervenção manual.

---

### 3.25 — Impressão Ficha Clínica (V1.63.2)

> **Botão 🖨️ no hero header** para imprimir ficha clínica A4 do paciente.

| Aspecto | Detalhe |
|---------|---------|
| **Botão** | Ícone printer no hero header (ao lado de urgente e delete) |
| **Modal** | Pré-visualização com dados do paciente antes de imprimir |
| **Layout A4** | Header escuro edge-to-edge, corpo branco, footer centrado |
| **Header** | Avatar + T-ID + Nome (esquerda) · Nº Impressão (direita) |
| **Campos** | Clínica · Médico · Fase (grelha no header) |
| **Corpo** | "Observações Clínicas" — área em branco para anotações manuais |
| **Footer** | AsymLAB info (NIF, morada, telefone, email) + data impressão |
| **Componente** | `PatientPrintSheet.tsx` — abre `window.open` com HTML/CSS inline |
| **Nº Impressão** | Contador local que incrementa a cada impressão na sessão |

> [!NOTE]
> Os dados do footer (NIF, morada, telefone) são valores de demonstração.
> Devem ser atualizados com os dados reais do laboratório antes do lançamento.

---

## Etapa 4 — Fluxos e Workflows 🟡

> **Objectivo:** Mapear todos os fluxos de trabalho do sistema, identificando triggers, transições automáticas, e pontos de decisão.

### 4.1 — Fluxos Identificados

| # | Fluxo | Complexidade | Entidades envolvidas |
|---|-------|-------------|----------------------|
| **F1** | Criação de Paciente | 🔴 Alta | Paciente, Anti-duplicação, Grupo WA, Caixa, Pedido |
| **F2** | Plano de Tratamento (lifecycle) | 🟡 Média | Plano, Fases, Agendamentos |
| **F3** | Fases e Agendamentos (máquina de estados) | 🔴 Alta | Fase, Agendamento, Status Multi-Badge |
| **F4** | Considerações (criar → versionar → WA) | 🔴 Alta | Consideração, WA, Ficheiros |
| **F5** | Automações WhatsApp (@comandos) | 🔴 Alta | WA, Status, Agendamento |
| **F6** | Fila de Pedidos (E📋 → aprovação) | 🟡 Média | Pedido, Escalação |
| **F7** | Merge de Paciente Duplicado | 🔴 Alta | Paciente, Plano, Ficheiros, Auditoria |
| **F8** | Avisos (transitar → finalizar) | 🟢 Baixa | Aviso, Histórico |
| **F9** | Documentação e Billing | 🟢 Baixa | Documentação, Billing, Facturação |
| **F10** | Acesso NAS / Ficheiros | 🟡 Média | Ficheiro, NAS, Cloudflare Tunnel |

### 4.2 — Máquinas de Estado Propostas

> As seguintes entidades necessitam de máquina de estados formal (transições definidas):

| # | Entidade | Status propostos | Tipo |
|---|----------|-----------------|------|
| 1 | **Paciente** | Activo · Inactivo · Arquivado | Exclusivo |
| 2 | **Plano** | Activo · Concluído · Cancelado | Exclusivo |
| 3 | **Fase** | Pendente · Em Curso · Concluída | Exclusivo |
| 4 | **Agendamento** | Agendado · Concluído · Cancelado · Remarcado | Exclusivo |
| 5 | **Estado do Trabalho** | 33 status multi-badge (ver 4.3) | **Multi-badge** |
| 6 | **Pedido (E📋)** | Pendente · Visto · Concluído | Exclusivo |
| 7 | **Aviso** | Activo · Finalizado | Exclusivo |

### 4.3 — Status do Trabalho — Sistema Multi-Badge

> **Mudança de modelo:** O status do trabalho **NÃO é exclusivo** — um agendamento pode ter **vários badges activos ao mesmo tempo**.
> Exemplo: Um trabalho pode estar "Em Produção" + "Material Em Falta" + "A Aguardar Componentes" tudo ao mesmo tempo.
>
> **Configurável:** Todos os status são editáveis no **Módulo Configurações** (BD de Status do Trabalho).
> O admin pode criar novos, renomear, reordenar e definir triggers. Não precisa de código.

**Todos os status organizados por categoria:**

| Cat. | # | Status | Ícone | Trigger | Visível para |
|------|---|--------|-------|---------|--------------|
| **📦 LOGÍSTICA** | | | | | |
| | 1 | Criar Caixa | 📦 | Auto: 1º plano criado | Staff Lab |
| | 2 | Criar Grupo | 💬 | Auto: paciente criado (+equipa) | Staff Lab |
| **🔧 PRODUÇÃO** | | | | | |
| | 3 | Para Prova | 🔵 | Auto: tipo agendamento = prova | Todos |
| | 4 | Prova Entregue | 📦 | Auto: @entregue (prova) / manual | Todos |
| | 5 | Em Prova | 🧪 | Auto: após Prova Entregue | Todos |
| | 6 | Para Recolher | 🟡 | Auto: @recolher / manual | Todos |
| | 7 | Prova Recolhida | ✅ | Auto: @recolhido / manual | Todos |
| | 8 | Para Colocação | 🟣 | Auto: tipo agendamento = colocação | Todos |
| | 9 | Colocação Entregue | ✅ | Auto: @entregue (colocação) / manual | Todos |
| | 10 | Em Stand By | ⏸️ | Manual | Todos |
| | 11 | Parado | 🔴 | Manual / auto (sem resposta WA) | Todos |
| | 12 | Fechado | ⚪ | Manual (plano concluído) | Todos |
| | 13 | **Pronto** | 🏁 | Manual (funcionário lab) | **Só Staff Lab** |
| **🧩 COMPONENTES** | | | | | |
| | 14 | Material Em Falta | 🟠 | Auto: checklist incompleto + notificado | Todos |
| | 15 | Descobrir Componentes | 🔍 | Manual | Staff Lab |
| | 16 | Escolher Componentes | 🎯 | Manual | Staff Lab |
| | 17 | Pedir Componentes | 📝 | Manual | Staff Lab |
| | 18 | Encomendar Componentes | 🛒 | Manual | Staff Lab |
| | 19 | A Aguardar Componentes | ⏳ | Manual | Staff Lab |
| | 20 | Componentes Encomendados | 📬 | Manual | Staff Lab |
| | 21 | Recolher Componentes | 🔄 | Manual | Staff Lab |
| **💬 COMUNICAÇÃO** | | | | | |
| | 22 | Responder Considerações | 💬 | Auto: nova consideração recebida | Staff Lab |
| | 23 | Enviar Considerações | 📤 | Manual | Staff Lab |
| | 24 | A Aguardar Considerações | ⏳ | Auto: consideração enviada | Staff Lab |
| | 25 | Sem Info | ❓ | Manual | Staff Lab |
| **📋 AVALIAÇÃO** | | | | | |
| | 26 | Avaliar Moldagem | 🔬 | Manual | Staff Lab |
| | 27 | Enviar Orçamento | 💰 | Manual | Staff Lab |
| | 28 | Enviar Report | 📊 | Manual | Staff Lab |
| | 29 | Triagem | 🏥 | Manual | Staff Lab |
| | 30 | Reunião com Médico | 🤝 | Manual | Staff Lab |
| | 31 | Ligar ao Médico | 📞 | Manual | Staff Lab |
| **💰 BILLING** | | | | | |
| | 32 | Faturado | 🧾 | Auto: fatura criada | Staff Lab |
| | 33 | Passar Recibo | 📄 | Manual | Staff Lab |

> **Total: 33 status** em 6 categorias.

#### 📌 Regras do Sistema Multi-Badge

| Regra | Detalhe |
|-------|---------|
| **Simultâneos** | Um agendamento pode ter vários badges activos ao mesmo tempo |
| **Sem limite** | Não há limite de badges simultâneos |
| **Prioridade visual** | Badges ordenados por categoria (Logística > Produção > Componentes > Comunicação > Avaliação > Billing) |
| **Auto vs Manual** | Alguns aparecem automaticamente (trigger), outros são adicionados pelo funcionário |
| **Remover badge** | Clicar no badge → remove. Ou acção que resolve (ex: checklist completo → "Material Em Falta" desaparece) |
| **Configurável** | Admin pode criar novos status, cor/ícone, categoria, e trigger no módulo Configurações |
| **Componentes independentes** | Status de componentes NÃO seguem sequência obrigatória — podem ser usados em qualquer ordem conforme a dinâmica de cada clínica |

#### 🔀 Auto-Transições (regras de substituição automática)

> Quando um @comando WA ou acção na app activa um status, os status anteriores do mesmo fluxo são **auto-removidos**.
> Processadas via trigger SQL no Supabase — **impacto zero** na interface.

| Acção | Remove | Adiciona |
|-------|--------|----------|
| Tipo agendamento = **Prova** | — | 🔵 Para Prova |
| Tipo agendamento = **Colocação** | — | 🟣 Para Colocação |
| Tipo agendamento **muda** (ex: Prova → Colocação) | Remove o anterior (Para Prova) | Adiciona o novo (Para Colocação) |
| **@entregue** (tipo Prova) | Remove: Para Prova | Adiciona: Prova Entregue + 🧪 Em Prova |
| **@recolher** | Remove: Em Prova | Adiciona: 🟡 Para Recolher |
| **@recolhido** | Remove: Para Recolher | Adiciona: ✅ Prova Recolhida |
| **@entregue** (tipo Colocação) | Remove: Para Colocação | Adiciona: ✅ Colocação Entregue |
| **Checklist completo** | Remove: Material Em Falta | — |
| **Consideração respondida** | Remove: Responder Considerações | — |
| **Fatura paga (recibo)** | Remove: Passar Recibo, Faturado | — |

> **Regra de ouro:** O funcionário pode **sempre** adicionar/remover badges manualmente, sobrepondo as auto-transições.
> Exemplo: Se @entregue muda para "Em Prova" mas o funcionário quer pôr "Em Stand By", basta clicar.

#### 🏁 Status "Pronto" — Exclusivo Interno

> O status **"Pronto"** significa: o trabalho técnico está concluído e o funcionário de gestão pode limpar e preparar para entrega.

| Aspecto | Detalhe |
|---------|---------|
| **Quem vê** | Apenas Staff Lab (funcionários do laboratório) |
| **Quem activa** | Funcionário de produção (quando dá o trabalho como terminado) |
| **Quem actua** | Funcionário de gestão (limpa, embala, prepara entrega) |
| **Médico vê?** | ❌ Não — só vê quando mudar para "Prova Entregue" ou "Colocação Entregue" |
| **Quando desaparece** | Quando gestão marca como entregue (@entregue ou manual) |

#### 📦 "Criar Caixa" — Fluxo da Caixa Física

> A caixa é um recurso reutilizável — quando um plano é fechado, a caixa é libertada para outros pacientes.

```
Plano criado → 📦 Badge "Criar Caixa" aparece
  │
  ├─ Funcionário prepara caixa no lab
  ├─ Marca "Criar Caixa" como feito → badge desaparece
  │
  └─ [Caso complexo] Caixa fica no lab com materiais do paciente
       └─ Até clínica confirmar que correu tudo bem
       └─ Admin liberta caixa manualmente → disponível para reutilização
```

#### 📨 Fila WA — Sistema Interno (invisível ao utilizador)

> A "Fila WA" **não aparece na interface normal**. É um sistema **interno** de fiabilidade.

| Estado | Significado | Visível para |
|--------|-------------|--------------|
| 🕐 Agendada | Programada para envio futuro | Admin (se procurar) |
| 🟡 Pendente | Na fila, a processar | Ninguém (automático) |
| ✅ Enviada | Entregue com sucesso | Ninguém (tudo OK) |
| 🔴 Falhada | Falhou 3× → admin precisa intervir | Admin (notificação) |

> É como o "enviando..." do WhatsApp — só te preocupas se falhar.

#### 📝 Avisos — Histórico de Acções

> Qualquer **Admin ou Staff Lab** pode finalizar um aviso.

**Cada acção fica registada:** quem fez + o que fez + quando.

```
┌────────────────────────────────────────────────────┐
│ ⚠️ Aviso: "Forno avariado — usar forno 2"         │
│                                                     │
│ 📜 Histórico:                                      │
│ • João criou — 24/02 09:15                          │
│ • Maria viu — 24/02 09:30                           │
│ • Pedro viu — 24/02 10:00                           │
│ • Ana viu — 24/02 11:15                             │
│ • João finalizou — 25/02 14:00                      │
└────────────────────────────────────────────────────┘
```

**Visível via:** clicar/expandir aviso ou hover no ícone 🕐.

> 👉 Na BD de status configuráveis, cada entrada tem: **nome**, **cor**, **ícone**, **categoria**, **trigger** (auto/manual/@WA), **visibilidade** (todos/só lab) e **flag "default"**.
> O admin pode **adicionar status** mas **não pode eliminar** status em uso — apenas desactivar.

---

### 4.4 — Avisos para a Etapa 4

> ⚠️ Pontos que precisam de decisão antes de detalhar os fluxos:

| # | Aviso | Impacto | Decisão necessária |
|---|-------|---------|-------------------|
| 1 | **Conflitos de concorrência** — 2 pessoas editam o mesmo item | 🔴 | Confirmar lock optimista (Etapa 3.16) |
| 2 | **Rollback de merge** — soft delete com "Desfazer" por 48h | 🟡 | Confirmar prazo de 48h |
| 3 | **WhatsApp falha** — retry 3× + fila + notificação admin | 🟡 | Já definido (Etapa 3.13) |
| 4 | **Pedidos sem resposta** — escalação automática 24h→72h→7d | 🟢 | Já definido (Etapa 3.17) |
| 5 | **NAS offline** — health check 5 min + badge dashboard | 🟢 | Já definido (Etapa 3.18) |
| 6 | **Quem arranca cada fluxo** — qual trigger inicia cada workflow | 🔴 | Definir fluxo a fluxo |

### 4.5 — Sugestões para Detalhar

> 💡 Proposta de como avançar com a Etapa 4:

1. **Fluxo a fluxo** — começar pelo F1 (Criação de Paciente) até ao F10
2. **Cada fluxo terá:** diagrama de sequência, triggers, auto-transições, edge cases
3. **Status multi-badge** integrado em cada fluxo (quando badges aparecem/desaparecem)
4. **Prioridade:** F1 → F3 → F5 → F4 → F2 → F6 → F7 → F10 → F8 → F9
5. **Estimativa:** ~1 sessão por fluxo complexo (🔴), ~½ sessão por simples (🟢)

---

### 4.6 — F1: Criação de Paciente ✅

> **Complexidade:** 🔴 Alta — envolve Paciente, Plano, Anti-duplicação, Grupo WA, Caixa, Pedido, NAS, Z-API.
> **Quem pode criar:** Todos os roles (Admin, Staff Lab, Médico, Staff Clínica).
> **2 vias de criação:** Via App e Via WhatsApp (@criarpaciente).

#### 📌 Via 1 — Criação na App (standard)

**Auto-preenchimento por role:**

| Quem cria | Clínica | Médico principal | Médicos associados |
|-----------|---------|-----------------|-------------------|
| **Médico** | Auto (a sua clínica) | Auto (ele próprio) | Auto (ele + colaboradores) — pode adicionar mais |
| **Staff Clínica** | Auto (a sua clínica) | Tem de escolher | — |
| **Staff Lab** | Tem de escolher | Tem de escolher | — |
| **Admin** | Tem de escolher | Tem de escolher | — |

> **Instrução UX:** O primeiro médico seleccionado é automaticamente o médico principal.

**Formulário — Blocos:**

| # | Bloco | Campos principais |
|---|-------|-------------------|
| 1 | **Dados Paciente** | Nome completo, Clínica, ID Paciente Clínica (opcional), Notas lab |
| 2 | **Equipa Médica** | Médicos associados (multi-select), Médico principal (1º seleccionado) |
| 3 | **Plano de Tratamento** | Tipo de trabalho, Descrição, Nome do plano |
| 4 | **Fases** | Nome da fase, Ordem |
| 5 | **Agendamentos** | Tipo (Prova/Colocação/Ajuste/Outro), Data prevista |
| 6 | **Info Técnica** | Informação técnica relevante para o lab |
| 7 | **Considerações** | Notas técnicas iniciais (visíveis para clínica + lab) |
| 8 | **Anexos** | Upload de ficheiros (fotos, STL, vídeos) — armazenados na NAS |

> Anti-duplicação (ver regras 3.3) corre em **tempo real** ao preencher Nome + Clínica + ID Paciente Clínica.

**Ao GRAVAR:**

```
GRAVAR
  ├─ ✅ Paciente + Plano + Fases + Agendamentos criados na BD
  ├─ 📁 Pastas NAS criadas: /pacientes/[id-paciente]/[id-plano]/
  ├─ 📎 Ficheiros anexados movidos para NAS
  ├─ 💬 Badge "Criar Grupo" aparece (lembrete para grupo WA)
  ├─ 📦 Badge "Criar Caixa" aparece (se plano criado)
  ├─ 📋 Pedido E📋 auto-gerado (se Médico/Staff Clínica criou)
  └─ → Redireccionado para a ficha do paciente
```

> Se **Admin/Staff Lab** cria, **não** gera Pedido E📋 (o lab já sabe).

---

#### 📌 Via 2 — Criação via WhatsApp (@criarpaciente)

> Permite criar pacientes directamente do WhatsApp, gerando um formulário público (sem login) acessível via link tokenizado.

##### Variantes do @criarpaciente

| Variante | Exemplo | Resultado |
|----------|---------|-----------|
| **Isolado** | `@criarpaciente` | Envia link do formulário no grupo |
| **Com anexos** | Enviar fotos com legenda `@criarpaciente` | Link + fotos auto-inseridas nos anexos do plano |
| **Com texto** | `@criarpaciente zirconia coroa 46` | Link + texto vai para descrição do plano |
| **Como resposta** | Responder a uma mensagem com `@criarpaciente` | Link + texto da msg original + texto da resposta → descrição do plano |

> Em todos os casos: o sistema regista **quem** fez o @criarpaciente e **de quem** era a mensagem respondida (se aplicável).
> Se admin responde a mensagem de um médico → clínicas filtradas pelas do médico autor da mensagem original.

##### Fluxo técnico @criarpaciente

```
@criarpaciente no grupo WA
  │
  ├─ Z-API webhook recebe mensagem
  │   ├─ Identifica: quem enviou, grupo, texto extra, anexos, msg respondida
  │   └─ Verifica permissão do @comando para este utilizador
  │
  ├─ Gera token único (24h validade, multi-uso até submeter)
  ├─ Envia link no grupo WA:
  │   "📋 Formulário de novo paciente criado por [nome]
  │    🔗 [link com token]
  │    ⏰ Válido por 24h"
  │
  ├─ FILA DE DOWNLOAD (se há anexos):
  │   ├─ Descarrega um ficheiro de cada vez (sequencial)
  │   ├─ Se falhar → retry automático (3 tentativas com backoff)
  │   ├─ Quando todas terminam → confirma no WA:
  │   │   "✅ 5/5 ficheiros processados"
  │   └─ Se algum falhar 3× → avisa:
  │       "⚠️ 2 ficheiros falharam. Anexe manualmente no formulário: [link]"
  │
  └─ FORMULÁRIO PÚBLICO (sem login, acesso via token):
      ├─ Mesmo layout e blocos da app (Dados, Equipa, Plano, Fases,
      │   Agendamentos, Info Técnica, Considerações, Anexos)
      ├─ Clínica: só mostra clínicas do utilizador que fez @criarpaciente
      │   (ou do médico da msg respondida, se admin respondeu)
      ├─ Médico: auto-adicionado se médico; 1º seleccionado = principal
      ├─ Descrição do plano: pré-preenchida com texto do WA
      ├─ Anexos: pré-visualização (thumbnails) dos já descarregados
      │   + botão "Adicionar mais ficheiros" (upload manual)
      │
      ├─ 3 Botões:
      │   ├─ 💾 Guardar — salva rascunho, avisa no WA, não submete
      │   ├─ ✅ Submeter Pedido — envia para o lab
      │   └─ ❌ Cancelar — cancela e avisa no WA
      │
      └─ Avisos automáticos no WA:
           ├─ Ao guardar: "[nome] guardou o formulário — falta submeter"
           └─ 3h antes de expirar: "⚠️ O formulário expira em 3h"
```

> **Edição colaborativa:** Múltiplas pessoas podem aceder ao formulário antes de submeter. Ex: médico cria, assistente anexa fotos do PC da clínica.
> **1 plano por formulário.** Para adicionar mais planos, criar na app depois.

##### Ao SUBMETER o formulário

```
SUBMETER
  ├─ ✅ Paciente + Plano + Fases + Agendamentos criados na BD (como rascunho/pendente)
  ├─ 📁 Pastas NAS criadas: /pacientes/[id-paciente]/[id-plano]/
  ├─ 📎 Ficheiros movidos para NAS
  ├─ 💬 Grupo WA do paciente criado via Z-API:
  │     Nome: "AsymLAB - [nome paciente]"
  │     Membros: todos médicos associados + staff lab + colaboradores
  │     (Z-API usa autoInvite para quem não está nos contactos)
  ├─ 📋 Pedido E📋 gerado para o lab
  └─ Confirmação enviada no grupo WA de origem:
       "✅ Paciente [nome] submetido com sucesso"
```

---

#### 📌 Inbox de Pedidos — Como o Lab Processa

> Os pedidos aparecem numa **secção dedicada** na app (badge com contador de pendentes).
> O sistema já correu a **anti-duplicação automaticamente** em cada pedido.

```
╔══════════════════════════════════════════════════════════════╗
║  📋 PEDIDOS — Inbox do Laboratório                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🔴 NOVO  │ Paciente: "João Silva"                          ║
║           │ Criado por: Dr. Ferreira (Clínica Sorriso)      ║
║           │ Via: WhatsApp @criarpaciente                     ║
║           │ Há 15 minutos                                    ║
║           │                                                  ║
║           │ ⚠️ POSSÍVEL DUPLICADO DETECTADO:                ║
║           │ ┌─────────────────────────────────────┐          ║
║           │ │ "João R. Silva" — Clínica Sorriso   │          ║
║           │ │ ID Clínica: PAC-0412                │          ║
║           │ │ 2 planos activos                    │          ║
║           │ │ [👁️ Ver ficha]                      │          ║
║           │ └─────────────────────────────────────┘          ║
║           │                                                  ║
║           │ [✅ Aceitar]  [🔀 Transitar]  [❌ Cancelar]     ║
║                                                              ║
║  🟡 VISTO │ Paciente: "Maria Costa"                         ║
║           │ Sem duplicados encontrados ✅                    ║
║           │ [✅ Aceitar]  [❌ Cancelar]                      ║
╚══════════════════════════════════════════════════════════════╝
```

##### 3 Acções sobre o Pedido

| Acção | O que acontece |
|-------|----------------|
| ✅ **Aceitar** | Paciente + plano confirmados (saem de rascunho). Pedido sai da fila. Badges normais de workflow aparecem. Grupo WA mantém-se |
| 🔀 **Transitar** | Paciente **já existe** → sistema pergunta: "Criar novo plano neste paciente?" ou "Adicionar agendamento a plano activo [nome]?". Migra informação para o paciente existente. Avisa no grupo WA criado: "Este paciente já existe — info migrada para grupo existente." Elimina o grupo WA do pedido e redireciona participantes |
| ❌ **Cancelar** | Avisa grupo WA: "Pedido cancelado. Contacte admin para mais info." **Soft delete com 48h para reverter.** Elimina grupo WA do pedido |

---

#### 📌 Integração WhatsApp — Z-API

> **Serviço actual:** [Z-API](https://developer.z-api.io/) (REST API sobre WhatsApp Web).
> Custo: ~€17/mês. Sem limite de mensagens. Fila interna + webhooks para delivery/status.

**Capacidades Z-API usadas:**

| Feature | Endpoint Z-API | Uso no AsymLAB |
|---------|---------------|----------------|
| Receber mensagens | Webhook `on-message-received` | Detectar @comandos, capturar texto e anexos |
| Enviar mensagens | `send-message-text` | Confirmações, lembretes, links de formulário |
| Criar grupo | `create-group` + `autoInvite` | Grupo WA do paciente (com convite automático) |
| Enviar ficheiros | `send-message-image/document/video` | Enviar confirmações com media |
| Download de media | URLs dos webhooks | Descarregar ficheiros enviados pelos utilizadores |

**Alternativas mais baratas / gratuitas:**

| Serviço | Preço | Vantagem | Desvantagem |
|---------|-------|----------|-------------|
| **Z-API** (actual) | ~€17/mês | Simples, docs bons, sem limite | Pago |
| **Evolution-API** | **Grátis** (open-source) | Self-hosted, Docker, sem custos | Requer servidor + manutenção |
| **WAHA** | **Grátis** (Core) | Self-hosted, dashboard, integra n8n | Requer servidor + manutenção |

> **Recomendação:** Manter Z-API para MVP. Quando estável, testar Evolution-API ou WAHA na NAS/VPS.

---

#### 📌 Future Feature: @novotratamento

> Nos grupos WA de pacientes **já existentes**, o comando `@novotratamento` criará um novo plano de tratamento, usando o mesmo mecanismo de formulário tokenizado.
> A detalhar no fluxo F2 (Plano de Tratamento — lifecycle).

---

### 4.7 — F3: Fases e Agendamentos ✅

> **Complexidade:** 🔴 Alta — envolve Fase, Agendamento, Status multi-badge, Pedido, Grupo WA, Mensagem fixa.
> **Quem pode criar/editar:** Todos os roles.
> **Regra:** Criação/edição após a criação inicial do paciente → gera Pedido E📋.

#### 📌 Conceitos Fundamentais

**Fases:**
- Sempre **sequenciais** (ordem fixa definida na criação)
- Cada plano tem pelo menos 1 fase
- Apenas 1 fase pode estar activa de cada vez
- Transição entre fases: **prompt ao utilizador** (não automática)

**Agendamentos:**
- Cada agendamento pertence a 1 fase
- **Data opcional** — pode ser criado sem data (ex: "Prova" pedida mas sem data marcada)
- Múltiplos agendamentos por fase

**Tipos de Agendamento:**

| Tipo | Visível para | Badge auto | Exemplo |
|------|-------------|------------|---------|
| **Prova** | Todos | 🟡 Para Prova / Em Prova | Prova de estrutura na clínica |
| **Colocação** | Todos | 🟢 Para Colocar | Cimentação final |
| **Ajuste** | Todos | 🟠 Para Ajustar | Ajuste oclusal |
| **Marco Lab** 🆕 | **Só Staff Lab + Admin** | 🔵 (interno) | Produção da estrutura, scan concluído |
| **Outro** | Todos | ⚪ (genérico) | Qualquer outro tipo |

> O tipo **Marco Lab** é um marco interno do laboratório — invisível para Médico e Staff Clínica. Útil para organizar o workflow de produção sem expor para a clínica.

#### 📌 Criação de Fases e Agendamentos

**Cenário 1 — Na criação do paciente (F1):**
- Fases e agendamentos criados directamente no formulário de criação
- Não gera pedido adicional (já está no fluxo F1)

**Cenário 2 — Edição posterior (paciente já existe):**
- Qualquer alteração (adicionar fase, criar agendamento, editar, remover) → gera **Pedido E📋**
- O pedido é classificado por tipo:

##### Tipos de Pedido (distinção)

| Tipo Pedido | Quando | Exemplo |
|-------------|--------|---------|
| 📋 **Novo Paciente** | Criação via @criarpaciente ou app (por clínica) | F1 standard |
| 📋 **Novo Plano** | Adicionar novo plano a paciente existente | @novotratamento (futuro) ou via app |
| 📋 **Edição de Plano** | Alterar fases, agendamentos, info técnica de plano existente | Adicionar fase, remarcar, editar descrição |

> Na Inbox de Pedidos, cada pedido mostra a **etiqueta do tipo** para o lab saber rapidamente o contexto.
> Pedidos de edição incluem **diff** das alterações (o que mudou vs estado anterior).

#### 📌 Lifecycle de um Agendamento

```
CRIAÇÃO
  │
  ├─ Tipo escolhido (Prova/Colocação/Ajuste/Marco Lab/Outro)
  ├─ Data: opcional (pode ser definida depois)
  ├─ Badge auto-aparece conforme tipo:
  │   Ex: Tipo "Prova" → Badge "Para Prova" (sem data: "Para Prova — s/ data")
  │
  ├─ Notificação WA: mensagem fixa actualizada
  └─ Se via edição posterior → gera Pedido E📋 tipo "Edição de Plano"

DURANTE
  │
  ├─ Data definida/alterada → Badge mantém tipo, data actualizada
  ├─ Remarcação → Badge NÃO muda (mesmo tipo)
  │   ├─ Aviso no grupo WA: "📅 Agendamento [tipo] remarcado: [data antiga] → [data nova]"
  │   └─ Mensagem fixa actualizada
  │
  ├─ Tipo alterado → Badge MUDA
  │   Ex: "Prova" → "Colocação" = Badge "Para Prova" → "Para Colocar"
  │   └─ Aviso no WA: "🔄 Agendamento alterado de [Prova] para [Colocação]"
  │
  └─ Cancelamento → Badge removido + aviso WA

CONCLUSÃO
  │
  ├─ Agendamento marcado como concluído
  ├─ Badge desaparece
  └─ Sistema verifica: "Todos os agendamentos desta fase estão concluídos?"
      │
      ├─ SIM → PROMPT ao utilizador:
      │   ┌─────────────────────────────────────────┐
      │   │ ✅ Fase "[nome]" — todos os             │
      │   │ agendamentos concluídos!                 │
      │   │                                          │
      │   │ [▶️ Avançar para fase seguinte]          │
      │   │ [➕ Criar novo agendamento nesta fase]   │
      │   └─────────────────────────────────────────┘
      │
      └─ NÃO → Nada acontece (há agendamentos pendentes)
```

#### 📌 Transição entre Fases

```
FASE ACTIVA: "Moldagem"
  │
  ├─ Todos agendamentos concluídos
  ├─ Utilizador escolhe "Avançar para fase seguinte"
  │
  ├─ Fase "Moldagem" → estado: Concluída ✅
  ├─ Fase seguinte ("Prova Estrutura") → estado: Activa 🔵
  │
  ├─ Badges da nova fase aparecem automaticamente
  ├─ Mensagem fixa WA actualizada
  └─ Aviso WA: "✅ Fase [Moldagem] concluída → Agora em [Prova Estrutura]"

ÚLTIMA FASE:
  │
  ├─ Todos agendamentos concluídos
  ├─ Prompt: "Avançar" → Plano marcado como concluído
  └─ Congratulação no WA: "🎉 Plano [nome] concluído!"
```

#### 📌 Mensagem Fixa no Grupo WA

> Cada grupo WA de paciente tem uma **mensagem fixada (pinned)** com o resumo actualizado do plano.
> Actualizada a cada mudança relevante.

**Conteúdo da mensagem fixa:**

```
╔══════════════════════════════════════════╗
║ 📋 PLANO: Coroa Zircónia #46            ║
╠══════════════════════════════════════════╣
║                                          ║
║ 👤 Paciente: João Silva                  ║
║ 🏥 Clínica: Sorriso                     ║
║ 👨‍⚕️ Dr. Ferreira (principal)              ║
║                                          ║
║ ── FASES ──────────────────────────      ║
║ ✅ 1. Moldagem (concluída)               ║
║ 🔵 2. Prova Estrutura (activa)           ║
║    └ 📅 Prova — 28/02 15:00             ║
║ ⬜ 3. Acabamento                         ║
║ ⬜ 4. Colocação                          ║
║                                          ║
║ ── INFO TÉCNICA ─────────────────        ║
║ Zircónia monolítica, cor A2, preparo     ║
║ com chanfro, antagonista natural         ║
║                                          ║
║ ── STATUS ───────────────────────        ║
║ 🟡 Para Prova                            ║
║                                          ║
║ 🕐 Última actualização: 24/02 15:30     ║
╚══════════════════════════════════════════╝
```

**Regras técnicas da mensagem fixa:**

| Regra | Detalhe |
|-------|---------|
| **Actualização** | A cada mudança: novo agendamento, transição de fase, alteração de status, remarcação |
| **Método** | **Eliminar mensagem anterior + criar nova + fixar** (não editar — WA limita edição a ~15 min) |
| **Pin duration** | Pins no WA expiram (30 dias máx). Ao recriar, o timer reinicia |
| **Fallback** | Se a mensagem não puder ser fixada (limite de pins), enviar como mensagem normal |
| **Visibilidade Marco Lab** | Marcos internos do lab **NÃO aparecem** na mensagem fixa (só visíveis na app) |
---

### 4.8 — F5: Automações WhatsApp ✅

> **Complexidade:** 🔴 Alta — centraliza toda a lógica de comunicação WA.
> **Dependências:** F1 (criação), F3 (fases/agendamentos), Módulo Configurações.
> **Princípio:** O admin pode configurar todos os templates e permissões de @comandos.

#### 📌 Tabela de @Comandos Completa

| Comando | Quem pode usar | Onde funciona | Acção |
|---------|---------------|---------------|-------|
| `@criarpaciente` | Todos (configurável) | Grupo geral | Cria formulário tokenizado → novo paciente (ver F1 — 4.6) |
| `@entregue` | Staff Lab, Admin | Grupo do paciente | Confirma agendamento activo como concluído + muda status |
| `@recolher` | Todos | Grupo do paciente | Marca trabalho para recolha (bidirecional) |
| `@recolhido` | Staff Lab, Admin | Grupo do paciente | Confirma que trabalho foi recolhido pela clínica |
| `@urgente` | **Só Staff Lab, Admin** | Grupo do paciente | Marca como urgente — topo de todas as listas |
| `@nota` | Todos | Grupo do paciente | Adiciona nota rápida ao plano activo |

> **@material** — Removido dos @comandos. É uma automação de app (ver secção abaixo).
> **@foto** — Implícito no pedido de material em falta (app envia pedido com detalhe).
> **@status** — Já coberto pela mensagem fixa (sempre visível no grupo).

---

#### 📌 @entregue — Confirmar Entrega

```
Staff Lab envia @entregue no grupo WA do paciente
  │
  ├─ Sistema identifica o agendamento activo da fase activa
  ├─ Confirma agendamento como concluído
  ├─ Status muda automaticamente conforme tipo:
  │
  │   Tipo do Agendamento    →    Status resultante
  │   ─────────────────────────────────────────────
  │   Prova                  →    "Prova Entregue" ✅
  │   Colocação              →    "Colocação Entregue" ✅
  │   Ajuste                 →    "Ajuste Entregue" ✅
  │   Outro                  →    "Entregue" ✅
  │   Marco Lab              →    "Concluído" (interno)
  │
  ├─ Mensagem fixa actualizada
  ├─ Verifica: "Todos agendamentos da fase concluídos?"
  │   └─ Se SIM → prompt de transição de fase (ver F3 — 4.7)
  └─ Confirmação no grupo: "✅ [tipo] entregue — agendamento concluído"
```

> Se houver **múltiplos agendamentos activos** na fase, o sistema pergunta qual:
> "Qual agendamento quer confirmar? 1. Prova 28/02 | 2. Ajuste 01/03"

---

#### 📌 @recolher — Marcar para Recolha (bidirecional)

```
CENÁRIO A — Lab marca trabalho pronto para recolha:
  │
  Staff Lab envia @recolher
  ├─ Status → "Para Recolher" 📦
  ├─ Aparece no widget da clínica como trabalho pendente de recolha
  ├─ Mensagem fixa actualizada
  └─ Aviso no grupo: "📦 Trabalho pronto para recolha"

CENÁRIO B — Clínica pede para recolher:
  │
  Médico/Staff Clínica envia @recolher
  ├─ Pedido de recolha registado
  ├─ Aparece no widget do lab como "Recolha pedida pela clínica"
  └─ Aviso no grupo: "🏥 [nome] pediu recolha do trabalho"

EM AMBOS OS CASOS:
  │
  └─ Clínica vai ao lab buscar → Lab envia @recolhido
      ├─ Status → "Recolhido" ✅
      ├─ Badges de recolha removidos
      ├─ Mensagem fixa actualizada
      └─ Confirmação: "✅ Trabalho recolhido por [nome]"
```

> **Status de recolha no widget:**

| Status | Visível para | Significado |
|--------|-------------|-------------|
| 📦 **Para Recolher** | Todos | Lab marcou como pronto |
| 🏥 **Recolha Pedida** | Staff Lab + Admin | Clínica pediu para vir buscar |
| ✅ **Recolhido** | Todos | Confirmado — trabalho foi levantado |

---

#### 📌 @urgente — Marcar como Urgente (só lab)

```
Staff Lab envia @urgente no grupo WA
  │
  ├─ Badge "🔴 Urgente" adicionado ao paciente/plano
  ├─ Em todos os widgets onde este trabalho aparece:
  │   → vai para o TOPO da lista
  │   → highlight visual (borda vermelha / fundo tintado)
  │
  ├─ Mensagem fixa actualizada (com 🔴 no topo)
  ├─ Aviso no grupo: "🔴 Trabalho marcado como URGENTE por [nome]"
  │
  └─ Para remover urgência:
      Staff Lab envia @urgente novamente (toggle)
      ├─ Badge removido
      ├─ Volta à posição normal nos widgets
      └─ Aviso: "✅ Urgência removida por [nome]"
```

> **Só Staff Lab e Admin** podem usar @urgente.
> Na app: botão "Marcar Urgente" na ficha do paciente (mesma lógica do @).

---

#### 📌 @nota — Adicionar Nota Rápida

```
Qualquer membro envia @nota <texto> no grupo WA
  │
  ├─ Texto adicionado às Considerações do plano activo
  ├─ Prefixado com: "[nome] via WA — [data hora]:"
  │   Ex: "Dr. Ferreira via WA — 24/02 15:30: Paciente pede cor mais clara"
  │
  ├─ Visível na ficha do paciente (secção Considerações)
  ├─ Mensagem fixa NÃO actualizada (notas são detalhe, não status)
  └─ Confirmação no grupo: "📝 Nota adicionada ao plano"
```

> Sem texto após @nota → sistema responde: "⚠️ Use: @nota seguido do texto"
> @nota como resposta a uma mensagem → inclui o texto da mensagem respondida + texto extra.

---

#### 📌 Automação de Material em Falta (app, não @comando)

> Esta automação é disparada pela **app**, não por @comando no WA.
> O funcionário do lab faz check do material e marca o que falta.

```
Staff Lab na app → secção Material → marca item em falta
  │
  ├─ Sistema inicia cadência de avisos automáticos no WA:
  │
  │   FASE 1 — A cada 2 dias (máximo 3 avisos):
  │   ├─ Dia 0: "⚠️ Material em falta para [paciente]: [lista]"
  │   ├─ Dia 2: "⚠️ Lembrete: material em falta para [paciente]"
  │   └─ Dia 4: "⚠️ Último lembrete (fase 1): material em falta"
  │
  │   FASE 2 — A cada 7 dias (máximo 3 avisos):
  │   ├─ Dia 11: "⚠️ Material ainda em falta para [paciente]"
  │   ├─ Dia 18: "⚠️ Lembrete: material em falta há 18 dias"
  │   └─ Dia 25: "🔴 ÚLTIMO AVISO: material em falta para [paciente].
  │               Este é o último aviso automático."
  │
  └─ Após dia 25: automação para. Escalação para admin na app.

  RESOLUÇÃO:
  ├─ Clínica entrega material → Lab marca como recebido
  ├─ Automação de avisos cancelada
  └─ Confirmação: "✅ Material recebido para [paciente]"
```

> **Anti-spam — Throttling de mensagens:**

| Regra | Detalhe |
|-------|---------|
| **Intervalo mínimo** | 30s entre mensagens automáticas para o mesmo grupo |
| **Intervalo entre grupos** | 5-10s entre mensagens para grupos diferentes |
| **Fila sequencial** | Todas as mensagens automáticas entram numa fila (FIFO) |
| **Horário** | Mensagens automáticas só saem entre 08:00-20:00 (configurável) |
| **Limite diário** | Máximo de mensagens automáticas por dia (configurável, default 50) |

> Se o sistema detecta que várias automações de material coincidem, agrupa num resumo:
> "⚠️ Material em falta para 3 pacientes: [lista resumida]"

---

#### 📌 Descrição do Grupo WA

> A descrição do grupo WA do paciente contém instruções dos @comandos.
> Actualizada automaticamente quando novos comandos são configurados.

**Exemplo de descrição:**

```
🔬 AsymLAB — Grupo do paciente

📋 Comandos disponíveis:
@entregue — Confirmar entrega do trabalho
@recolher — Marcar para recolha / pedir recolha
@recolhido — Confirmar que trabalho foi levantado
@urgente — Marcar como urgente (só lab)
@nota <texto> — Adicionar nota ao plano

ℹ️ A mensagem fixada contém o resumo actualizado do plano.
```

---

#### 📌 Templates Configuráveis

> Todos os templates de mensagem são configuráveis pelo admin no **Módulo Configurações**.
> Isso permite melhorar com o uso e escalar a app para venda.

| Template | Variáveis disponíveis | Exemplo default |
|----------|----------------------|-----------------|
| Criação de paciente | `{paciente}`, `{medico}`, `{link}` | "📋 Formulário criado por {medico}. 🔗 {link}" |
| Entrega confirmada | `{tipo}`, `{paciente}` | "✅ {tipo} entregue — agendamento concluído" |
| Para recolher | `{paciente}` | "📦 Trabalho pronto para recolha" |
| Recolhido | `{nome}` | "✅ Trabalho recolhido por {nome}" |
| Urgente ON | `{nome}` | "🔴 Trabalho marcado como URGENTE por {nome}" |
| Urgente OFF | `{nome}` | "✅ Urgência removida por {nome}" |
| Nota adicionada | — | "📝 Nota adicionada ao plano" |
| Material em falta | `{paciente}`, `{lista}`, `{fase}` | "⚠️ Material em falta para {paciente}: {lista}" |
| Material último aviso | `{paciente}` | "🔴 ÚLTIMO AVISO: material em falta para {paciente}" |
| Fase concluída | `{fase_antiga}`, `{fase_nova}` | "✅ Fase {fase_antiga} concluída → Agora em {fase_nova}" |
| Plano concluído | `{plano}` | "🎉 Plano {plano} concluído!" |
| Remarcação | `{tipo}`, `{data_antiga}`, `{data_nova}` | "📅 {tipo} remarcado: {data_antiga} → {data_nova}" |
| Formulário guardado | `{nome}` | "{nome} guardou o formulário — falta submeter" |
| Formulário a expirar | — | "⚠️ O formulário expira em 3h" |

> O admin pode editar texto, emojis, e variáveis. O sistema valida que variáveis obrigatórias estão presentes.

---

### 4.9 — F4: Considerações ✅

> **Complexidade:** 🟡 Média — envolve permissões por lado, programação de envio, e integração com pedidos.
> **Visibilidade:** Todas as considerações são visíveis para todos os roles.
> **Edição:** Apenas editáveis pelo lado que as criou (clínica edita as da clínica, lab edita as do lab).

#### 📌 Estrutura das Considerações

As considerações são **agrupadas por fase/agendamento**, criando um histórico organizado por momento do tratamento.

```
📋 PLANO: Coroa Zircónia #46

── Fase 1: Moldagem ──────────────────────────
  📅 Agendamento: Impressão — 20/02
  │
  ├─ 🏥 Dr. Ferreira — 20/02 10:30
  │   "Preparo com chanfro, margem subgengival no vestibular"
  │
  └─ 🔬 Lab (Ana) — 20/02 15:00
      "Troquel limpo, margem nítida. Proceder com enceramento."
      📎 foto_troquel.jpg

── Fase 2: Prova Estrutura (activa) ──────────
  📅 Agendamento: Prova — 28/02
  │
  ├─ 🔬 Lab (João) — 27/02 09:00  ⏰ Programado: 27/02 18:00
  │   "Estrutura pronta. Verificar adaptação cervical e contactos."
  │   📎 scan_estrutura.stl
  │
  └─ (sem considerações da clínica ainda)
```

#### 📌 Tipos de Consideração

| Tipo | Conteúdo | Exemplo |
|------|----------|---------|
| **Texto livre** | Apenas texto | "Paciente pede cor mais clara" |
| **Com anexo** | Ficheiro(s) + texto opcional | Foto do troquel + "Margem irregular no distal" |
| **Com anexo sem texto** | Apenas ficheiro(s) | 3 fotos intraorais |

> Não existe tipo "alerta" — os avisos já são cobertos pelo sistema de Avisos (F8).

#### 📌 Quem cria e como

| Quem cria | Na app | No WA |
|-----------|--------|-------|
| **Staff Lab / Admin** | Directo na ficha do paciente | `@nota <texto>` (ver F5) |
| **Médico / Staff Clínica** | Directo na app → **gera Pedido E📋 tipo "Edição de Plano"** | `@nota <texto>` → gera Pedido também |

> As considerações da clínica **aparecem logo na app** (para o lab ver), mas com badge de "Pedido pendente" até o lab confirmar.

#### 📌 Envio para WhatsApp — Manual com Programação

> As considerações **NÃO são enviadas automaticamente** para o WhatsApp.
> O autor escolhe se e quando enviar.

```
Staff Lab cria consideração na app
  │
  ├─ Consideração guardada na BD
  ├─ Visível na ficha do paciente (para o lab)
  │
  └─ 3 Opções de envio:
      │
      ├─ 📤 Enviar agora para WA
      │   └─ Envia imediatamente para o grupo + todos vêem na app
      │
      ├─ ⏰ Programar envio
      │   ├─ Escolher data/hora de envio
      │   ├─ Na app: visível APENAS para o lab até à hora programada
      │   ├─ Clínica SÓ vê na app após a hora programada
      │   └─ Ícone ⏰ indica "programado" (visível só para o lab)
      │
      └─ 💾 Guardar sem enviar
          └─ Fica só na app, não envia para WA
```

> **Caso de uso**: Lab descobre um problema às 22h. Programa o envio para as 08:00 do dia seguinte. A clínica não vê nada até essa hora.

#### 📌 Impressão

> Qualquer consideração pode ser impressa directamente da app.
> O lab usa isto para notas internas que ficam junto à caixa do trabalho.

| Acção | Resultado |
|-------|-----------|
| 🖨️ **Imprimir consideração** | Gera PDF formatado com: paciente, fase, data, autor, texto, anexos |
| 🖨️ **Imprimir todas da fase** | PDF com todas as considerações da fase activa |
| 🖨️ **Imprimir resumo do plano** | PDF com considerações de todas as fases |

#### 📌 Edição e Permissões

| Acção | Quem pode |
|-------|-----------|
| **Criar** | Todos |
| **Editar** | Só o lado que criou (clínica edita da clínica, lab edita do lab) |
| **Eliminar** | Só o autor original + Admin |
| **Ver** | Todos (excepto programadas que ainda não "chegaram") |
| **Enviar para WA** | Só o autor original |
| **Imprimir** | Todos |

> Edições são registadas com histórico: "Editado por [nome] em [data]"

---

### 4.10 — Visualizador STL (Feature Transversal) ✅

> **Tecnologia:** Three.js + STLLoader (browser-native, sem plugins).
> **Onde aparece:** Em qualquer lugar onde um ficheiro `.stl` é referenciado.

#### 📌 Funcionalidades do Visualizador

| Feature | Detalhe |
|---------|---------|
| **Renderização 3D** | Visualização do modelo STL no browser |
| **Rotação/Zoom/Pan** | Controlos de rato/touch standard |
| **Medição** | Régua básica para medir distâncias no modelo |
| **Corte** | Plano de corte para ver secções transversais |
| **Cores** | Trocar cor do modelo (material, gengiva, etc.) |
| **Comparação** | Side-by-side de 2 STLs (antes/depois) |
| **Anotações** | Marcar pontos no modelo com texto (salvos na BD) |
| **Partilha** | Gerar link de visualização (com token, sem login) |
| **Fullscreen** | Modo ecrã inteiro para apresentação |

#### 📌 Onde aparece

| Local | Comportamento |
|-------|---------------|
| **Ficha do paciente → Anexos** | Click no `.stl` abre o visualizador inline |
| **Considerações** | Se a consideração tem `.stl` anexado, preview 3D inline |
| **Mensagem WA** | STL enviado no WA → link para visualizador web (token) |
| **Formulário @criarpaciente** | Preview 3D dos STLs anexados |

> **Performance:** STLs grandes (>50MB) carregam com loading progressivo. Thumbnails 2D gerados automaticamente para listagens.

---

### 4.11 — F2: Plano de Tratamento (Lifecycle) ✅

> **Complexidade:** 🔴 Alta — envolve estados, múltiplos planos, reabertura, analytics, e @novotratamento.
> **Dependências:** F1 (criação), F3 (fases), F4 (considerações), F5 (automações WA).

#### 📌 Conceito: Soft Delete

> **Soft delete** = os dados **não são apagados** da base de dados. Recebem uma flag `deleted_at` com timestamp. Isto permite **recuperar** dentro de um prazo (48h por defeito). Após esse prazo, uma tarefa agendada (cron job) apaga definitivamente.
> Usado em: cancelamento de plano, cancelamento de pedido, merge de duplicados.

#### 📌 Estados do Plano

```
                    ┌──────────────┐
                    │  🟡 Rascunho │ ← Criado via WA (antes do lab aceitar)
                    └──────┬───────┘
                           │ Lab aceita pedido
                    ┌──────▼───────┐
             ┌──────│  🔵 Activo   │◄───────────────────┐
             │      └──────┬───────┘                     │
             │             │                             │
             │    ┌────────┼────────┐                    │
             │    ▼        ▼        ▼                    │
         ┌───────┐  ┌──────────┐  ┌───────────┐         │
         │⏸️Paus.│  │✅Concl.  │  │❌Cancel.  │         │
         └───┬───┘  └────┬─────┘  └───────────┘         │
             │           │ Reabrir                       │
             │      ┌────▼─────┐                         │
             └──────│🔄Reaberto│─────────────────────────┘
                    └──────────┘
```

| Estado | Significado | Quem pode mudar |
|--------|-------------|-----------------|
| 🟡 **Rascunho** | Criado via WA, aguarda aceitação do lab | Automático (criação WA) |
| 🔵 **Activo** | Em produção — fases e agendamentos em curso | Lab (aceitar pedido) |
| ⏸️ **Pausado** | Temporariamente parado (ex: paciente viajou, problema) | Todos (lab directo, clínica como pedido) |
| ✅ **Concluído** | Todas as fases terminadas | Automático (última fase concluída) |
| ❌ **Cancelado** | Soft delete — recuperável por 48h | Lab/Admin |
| 🔄 **Reaberto** | Plano reaberto como Correcção ou Remake | Lab/Admin |

> Planos criados directamente na app (não via WA) entram como **Activo** se criados pelo lab, ou **Rascunho** se criados pela clínica.

#### 📌 Múltiplos Planos Simultâneos

> Um paciente pode ter **vários planos activos ao mesmo tempo**.
> Caso de uso: médicos diferentes a tratar dentes diferentes no mesmo paciente.

**Regras de múltiplos planos:**

| Regra | Detalhe |
|-------|---------|
| **Grupo WA** | 1 grupo por paciente (não por plano) — todos os planos no mesmo grupo |
| **Mensagem fixa** | Mostra **todos os planos activos** com resumo de cada |
| **Badges** | Cada plano tem os seus badges independentes |
| **Médico principal** | Pode ser diferente por plano |
| **NAS** | Cada plano tem a sua pasta: `/pacientes/[id]/[plano-1]/`, `/pacientes/[id]/[plano-2]/` |
| **Facturação** | Independente por plano |

**Mensagem fixa com múltiplos planos:**

```
╔══════════════════════════════════════════╗
║ 👤 João Silva — Clínica Sorriso         ║
╠══════════════════════════════════════════╣
║                                          ║
║ 📋 PLANO 1: Coroa Zircónia #46          ║
║ 👨‍⚕️ Dr. Ferreira (principal)              ║
║ 🔵 Fase activa: Prova Estrutura         ║
║ 📅 Prova — 28/02 15:00                  ║
║ 🟡 Para Prova                            ║
║                                          ║
║ ────────────────────────────────         ║
║                                          ║
║ 📋 PLANO 2: Implante #36                ║
║ 👨‍⚕️ Dra. Santos (principal)               ║
║ 🔵 Fase activa: Cicatrização            ║
║ ⬜ Sem agendamentos pendentes            ║
║                                          ║
║ 🕐 Última actualização: 24/02 15:30     ║
╚══════════════════════════════════════════╝
```

#### 📌 Edição do Plano

| Quem edita | O que pode editar | Como |
|------------|-------------------|------|
| **Staff Lab / Admin** | Tudo (tipo, descrição, info técnica, fases) | Directo na app |
| **Médico / Staff Clínica** | Tudo | Via app → gera **Pedido E📋 tipo "Edição de Plano"** |

> Edições incluem **diff** das alterações: "Descrição alterada: ~~zircónia~~ → dissilicato de lítio"
> Histórico de edições visível na ficha do plano.

#### 📌 Pausar Plano

```
Pausar plano
  │
  ├─ Motivo obrigatório (texto livre): "Paciente viajou 3 meses"
  ├─ Todos os agendamentos pendentes ficam "em espera"
  ├─ Badges de produção pausados (deixam de aparecer nos widgets)
  ├─ Mensagem fixa actualizada: "⏸️ PLANO PAUSADO: [motivo]"
  ├─ Aviso no grupo WA: "⏸️ Plano [nome] pausado: [motivo]"
  │
  └─ Para retomar:
      ├─ Botão "Retomar plano" na ficha
      ├─ Motivo de pausa limpo, badges reaparecem
      ├─ Aviso WA: "▶️ Plano [nome] retomado"
      └─ Se clínica retoma → gera pedido
```

#### 📌 Histórico do Paciente (sidebar)

> Quando o utilizador abre a ficha de um paciente, a **barra lateral** mostra:

```
┌─────────────────────────────┐
│ 👤 João Silva               │
│ Clínica Sorriso             │
├─────────────────────────────┤
│                             │
│ 📋 PLANOS ACTIVOS           │
│ ├─ Coroa Zircónia #46 🔵   │
│ └─ Implante #36 🔵         │
│                             │
│ 📜 HISTÓRICO                │
│ ├─ Ponte #34-36 ✅ (2025)  │
│ ├─ Prótese parcial ✅(2024)│
│ └─ Coroa #46 🔄 (2023)     │
│   └─ Reaberto: Remake       │
│                             │
└─────────────────────────────┘
```

> **Ao clicar** num plano do histórico → abre a ficha do paciente **nesse plano**, com todas as fases, agendamentos, considerações e ficheiros **read-only** (não editável).
> Planos reabertos mostram a classificação (Correcção/Remake) e link para o plano original.

#### 📌 Reabertura de Plano Concluído

> Quando um paciente volta com um problema num trabalho anterior, o plano pode ser reaberto.

```
Plano concluído → Botão "Reabrir Plano"
  │
  ├─ OBRIGATÓRIO escolher tipo de reabertura:
  │
  │   ┌─────────────────────────────────────────┐
  │   │ 🔄 Reabrir Plano: Coroa Zircónia #46    │
  │   │                                          │
  │   │ Tipo de reabertura:                      │
  │   │ ○ 🔧 Correcção — ajuste minor            │
  │   │   (ex: ajuste oclusal, polimento)        │
  │   │                                          │
  │   │ ○ 🔄 Remake — refazer total/parcial      │
  │   │   (ex: fratura, adaptação incorrecta)    │
  │   │                                          │
  │   │ Motivo: [texto obrigatório]              │
  │   │                                          │
  │   │ [Confirmar reabertura]                   │
  │   └─────────────────────────────────────────┘
  │
  ├─ Plano volta a estado 🔵 Activo
  ├─ Nova fase criada automaticamente: "[Correcção]" ou "[Remake]"
  ├─ Badge "🔄 Reaberto" no plano (permanente)
  ├─ Referência ao plano original mantida
  │
  ├─ Mensagem fixa WA actualizada
  ├─ Aviso WA: "🔄 Plano [nome] reaberto como [tipo]: [motivo]"
  │
  └─ ANALYTICS (registados automaticamente):
      ├─ Tipo: Correcção ou Remake
      ├─ Clínica associada
      ├─ Médico associado
      ├─ Tipo de trabalho original
      ├─ Tempo desde conclusão original
      └─ Motivo (texto livre)
```

> **Analytics futuros:** Dashboard com métricas de remakes/correcções por clínica, médico, tipo de trabalho, período.
> Permite identificar padrões: "Clínica X tem 3× mais remakes em coroas" → investigar.

#### 📌 @novotratamento — Criar Novo Plano via WA

> Usado nos grupos WA de pacientes **já existentes** para adicionar um novo plano de tratamento.

```
@novotratamento no grupo WA do paciente
  │
  ├─ Sistema identifica o paciente pelo grupo WA
  ├─ Verifica permissão do @comando
  │
  ├─ Gera token único (24h validade)
  ├─ Envia link no grupo:
  │   "📋 Novo plano de tratamento para [paciente]
  │    Criado por [nome]
  │    🔗 [link com token]
  │    ⏰ Válido por 24h"
  │
  └─ FORMULÁRIO PÚBLICO (sem login):
      ├─ Paciente: já preenchido (read-only)
      ├─ Clínica: auto (mesma do grupo)
      ├─ Médicos: auto-adicionado quem fez @novotratamento
      ├─ Blocos: Plano, Fases, Agendamentos, Info Técnica, Anexos
      │   (mesmos blocos do F1, sem dados do paciente)
      │
      ├─ 3 Botões: Guardar / Submeter / Cancelar
      └─ Ao submeter → Pedido E📋 tipo "Novo Plano"
```

> Variantes de @novotratamento seguem as mesmas regras do @criarpaciente:
> Com texto → descrição do plano. Com anexos → ficheiros anexados. Como resposta → inclui texto da msg original.

---

### 4.12 — F6: Fila de Pedidos ✅

> **Complexidade:** 🟡 Média — centraliza a UX da inbox de pedidos.
> **Dependências:** F1 (criação), F2 (plano), F3 (fases), F4 (considerações).

#### 📌 Tipos de Pedido

| Tipo | Ícone | Origem | Exemplo |
|------|-------|--------|---------|
| 📋 **Novo Paciente** | 🆕 | F1 (criação via app ou WA por clínica) | @criarpaciente |
| 📋 **Novo Plano** | 📋 | F2 (@novotratamento ou via app) | Novo plano em paciente existente |
| 📋 **Edição de Plano** | ✏️ | F3/F4 (alteração de fases, agendamentos, considerações) | Adicionar fase, remarcar, editar |

#### 📌 Ordem na Fila

```
PRIORIDADE DA FILA:

  1. 🔴 URGENTES (marcados com @urgente) — sempre no topo
     └─ Entre urgentes: ordem de chegada (FIFO)

  2. ⬜ NORMAIS — por ordem de chegada (FIFO)
     └─ Primeiro a chegar = primeiro na fila
```

> Urgente pode ser marcado via WA (@urgente) ou via app (botão "Marcar Urgente" na ficha do paciente).
> Não existe atribuição de pedidos a funcionários — qualquer membro do lab pode processar.

#### 📌 Filtros da Inbox

| Filtro | Opções |
|--------|--------|
| **Tipo** | Novo Paciente / Novo Plano / Edição de Plano / Todos |
| **Clínica** | Lista de clínicas activas |
| **Médico** | Lista de médicos |
| **Data** | Intervalo de datas (de — até) |
| **Urgência** | Urgente / Normal / Todos |
| **Estado** | Pendente / Visto / Todos |

#### 📌 Fluxo de Processamento

```
Pedido chega à Inbox
  │
  ├─ Estado: 🔴 Pendente (+ badge com contador no menu)
  │
  ├─ Funcionário do lab abre o pedido
  │   ├─ Estado: 🟡 Visto (registado quem viu e quando)
  │   ├─ Pode ver toda a informação submetida
  │   ├─ Anti-duplicação já correu automaticamente (resultado visível)
  │   │
  │   └─ 3 Acções:
  │       ├─ ✅ Aceitar → confirma (ver detalhes F1 — 4.6)
  │       ├─ 🔀 Transitar → duplicado (ver detalhes F1 — 4.6)
  │       └─ ❌ Cancelar → rejeita (soft delete 48h)
  │
  └─ Estado final: 🟢 Concluído (sai da fila activa, vai para histórico)
```

> **Histórico de pedidos:** Todos os pedidos processados ficam no histórico (filtráveis). Útil para auditar decisões.

#### 📌 Contadores e Badges no Menu

```
┌──────────────────────┐
│ 📋 Pedidos      (7)  │ ← badge vermelho com total de pendentes
│  ├─ 🆕 Novos    (3)  │
│  ├─ 📋 Planos   (2)  │
│  └─ ✏️ Edições  (2)  │
└──────────────────────┘
```

---

### 4.13 — F7: Merge de Paciente Duplicado ✅

> **Complexidade:** 🟡 Média — envolve merge de dados, grupos WA, e cleanup.
> **Trigger:** Funcionário do lab detecta duplicado (via anti-duplicação ou manualmente).

#### 📌 Quem sobrevive

> O paciente **mais antigo** (primeiro a ser criado) sobrevive sempre.
> Os dados do paciente mais recente (duplicado) são migrados para o mais antigo.

#### 📌 Fluxo de Merge

```
Lab detecta duplicado (via Inbox "Transitar" ou manualmente na ficha)
  │
  ├─ Sistema mostra comparação lado-a-lado:
  │   ┌──────────────────┬──────────────────┐
  │   │ 👤 SOBREVIVE      │ 👤 DUPLICADO     │
  │   │ T-0042            │ T-0089           │
  │   │ "João Silva"      │ "João R. Silva"  │
  │   │ Desde: Jan 2024   │ Desde: Fev 2026  │
  │   │ 2 planos activos  │ 1 plano activo   │
  │   │ Clínica Sorriso   │ Clínica Sorriso  │
  │   └──────────────────┴──────────────────┘
  │
  ├─ Escolher planos a migrar:
  │   ☑️ Coroa #46 — migrar para T-0042
  │   (se houver apenas 1 plano, migra automaticamente)
  │
  ├─ Confirmar merge → sistema executa:
  │
  │   DADOS:
  │   ├─ Planos seleccionados migrados para paciente sobrevivente
  │   ├─ Considerações, ficheiros, agendamentos migrados junto
  │   ├─ Pastas NAS movidas: /T-0089/plano-x/ → /T-0042/plano-x/
  │   ├─ Paciente duplicado → soft delete (48h para reverter)
  │   └─ Registo de merge: quem, quando, motivo
  │
  │   GRUPO WA:
  │   ├─ Verificar membros do grupo duplicado
  │   ├─ Membros novos (não existem no grupo sobrevivente):
  │   │   → Adicionar ao grupo sobrevivente (delay 10-30s entre cada)
  │   ├─ Enviar mensagem no grupo duplicado:
  │   │   "ℹ️ Este paciente foi unificado com T-0042.
  │   │    Toda a informação foi migrada para o grupo existente.
  │   │    Este grupo será eliminado."
  │   ├─ Aguardar 60s
  │   └─ Eliminar grupo duplicado
  │
  └─ Mensagem fixa do grupo sobrevivente actualizada com novos planos
```

#### 📌 Desfazer Merge (48h)

```
Dentro de 48h → botão "Desfazer Merge" no histórico
  │
  ├─ Paciente duplicado restaurado
  ├─ Planos voltam ao paciente original
  ├─ Pastas NAS restauradas
  ├─ Grupo WA: NÃO é recriado (já foi eliminado)
  │   → Aviso: "Grupo WA terá de ser recriado manualmente"
  └─ Após 48h: merge é permanente, soft delete expira
```

#### 📌 Gestão de Perfil — Desactivação e Remoção de Grupos

> Funcionalidade no perfil de cada utilizador.

```
Perfil do utilizador → Opção "Desactivar conta"
  │
  ├─ Conta desactivada (login bloqueado, dados mantidos)
  │
  └─ Botão "Remover de todos os grupos WA":
      ├─ Lista todos os grupos WA onde o utilizador está
      ├─ Confirmação: "Vai ser removido de [X] grupos. Confirmar?"
      ├─ Remoção sequencial com delay aleatório 10-30s entre cada
      ├─ Progresso: "Removido de 5/12 grupos..."
      └─ Conclusão: "✅ Removido de todos os grupos"
```

> **Anti-spam:** O delay aleatório 10-30s entre operações evita que o WhatsApp detecte comportamento automatizado.

---

### 4.14 — F10: Acesso NAS / Ficheiros ✅ (v2 — refinado)

> **Complexidade:** 🟡 Média — envolve NAS, Cloudflare Tunnel, upload/download, câmara.
> **Infraestrutura:** NAS local + Cloudflare Tunnel para acesso externo.

#### 📌 ID do Paciente — Formato T-xxxx

| Regra | Detalhe |
|-------|---------|
| **Formato** | `T-xxxx` (T = Trabalho, xxxx = números sequenciais) |
| **Auto-increment** | Ao aceitar pedido de criação → atribui o nº mais alto existente + 1 |
| **Edição manual** | O funcionário do lab pode alterar o nº (para transição para a app) |
| **Unicidade** | Sistema nunca permite 2 pacientes com o mesmo T-xxxx |
| **Exemplos** | T-0001, T-0042, T-1337 |

> Durante a transição para a app, o lab pode criar pacientes com IDs específicos para manter continuidade com o sistema anterior.

#### 📌 Estrutura de Pastas NAS

```
/asymlab/
  └─ /pacientes/
      ├─ /T-0001/
      │   ├─ /plano-1/
      │   │   ├─ /fase-1/
      │   │   │   ├─ foto_troquel.jpg
      │   │   │   ├─ scan_inicial.stl
      │   │   │   └─ scan_inicial(2).stl    ← versionamento
      │   │   └─ /fase-2/
      │   │       └─ scan_estrutura.stl
      │   └─ /plano-2/
      │       └─ /fase-1/
      │           └─ impressao_digital.stl
      └─ /T-0042/
          └─ ...
```

#### 📌 Upload de Ficheiros

```
Upload de ficheiro (via app ou formulário WA)
  │
  ├─ Ficheiro normal (foto, STL, vídeo, PDF):
  │   ├─ Upload para NAS na pasta correcta
  │   ├─ Metadata guardada no Supabase (nome, tipo, tamanho, data, autor)
  │   ├─ Thumbnail gerado (≤200KB) e guardado no Supabase Storage
  │   └─ Se o nome já existe na mesma pasta → versionamento:
  │       scan.stl → scan(2).stl → scan(3).stl
  │
  ├─ Ficheiro comprimido (ZIP, RAR, 7z):
  │   ├─ Upload para NAS (pasta temporária)
  │   ├─ Auto-extracção:
  │   │   ├─ Extrair conteúdo para a pasta de destino
  │   │   ├─ Aplicar regras de versionamento a cada ficheiro
  │   │   ├─ Gerar metadata e thumbnails para cada ficheiro
  │   │   └─ Eliminar ficheiro comprimido original
  │   ├─ Se falhar extracção → manter comprimido + aviso ao utilizador
  │   └─ Confirmação: "📦 5 ficheiros extraídos de arquivo.zip"
  │
  └─ Sem limite de tamanho por ficheiro
      (STLs podem ter 100MB+, vídeos podem ter GB)
```

#### 📌 Download e Acesso

| Cenário | Acesso |
|---------|--------|
| **Na app (rede local)** | Directo ao NAS via rede interna (mais rápido) |
| **Na app (externo)** | Via Cloudflare Tunnel (encriptado, sem expor portas) |
| **Via link WA** | URL tokenizado (validade configurável) via Cloudflare Tunnel |
| **Formulário público** | Token 24h — download via Cloudflare Tunnel |

#### 📌 Câmara no Desktop (Web Camera API)

> A PWA usa a Web Camera API do browser — tudo funciona dentro do browser, **sem instalar nada**.

```
Utilizador clica "📸 Tirar Foto" (em qualquer local: guia, anexos, etc.)
  │
  ├─ 1ª vez: Browser pede permissão "Permitir acesso à câmara?"
  │
  ├─ Se tem 1 câmara: abre automaticamente
  │
  ├─ Se tem múltiplas câmaras (webcam + USB):
  │   ┌─────────────────────────────────┐
  │   │ Seleccionar câmara:             │
  │   │ ○ Webcam integrada (default)    │
  │   │ ● USB Camera (Logitech C920)    │
  │   │ ☑ Lembrar esta escolha          │
  │   │ [Confirmar]                     │
  │   └─────────────────────────────────┘
  │
  └─ Interface de câmara custom (sem sair da app):
      ┌─────────────────────────────┐
      │    [preview câmara live]    │
      │                             │
      │   📷 (3 fotos tiradas)      │
      │   [min1] [min2] [min3]      │
      │                             │
      │  [📸 Tirar] [✅ Pronto]    │
      └─────────────────────────────┘
```

| Questão | Resposta |
|---------|---------|
| **Ligação** | Automática — browser detecta câmaras via sistema operativo |
| **Directório** | Não precisa — foto vai directo para a app (memória) |
| **API fabricante** | Não precisa — browser fala com driver universal |
| **Multi-computador** | Cada PC usa a sua câmara. Preferência guardada por browser |
| **Alternativas** | Arrastar ficheiros + file picker sempre disponíveis em paralelo |

> **Câmaras profissionais** (Nikon, Canon): funciona se o SO reconhecer como webcam. Caso contrário, fluxo alternativo: tirar foto com câmara → arrastar para a app.

#### 📌 Backup de Metadata

> Regra global (já definida na Etapa 3.10): export periódico dos metadados da BD para a NAS.

| Item | Formato | Frequência |
|------|---------|------------|
| **Metadata de ficheiros** | JSON + CSV | Diário |
| **Lista de pacientes** | JSON + CSV | Diário |
| **Planos e fases** | JSON + CSV | Diário |
| **Considerações** | JSON | Diário |
| **Histórico de edições** | JSON | Semanal |

---

### 4.15 — F8: Avisos e Notificações ✅ (v2 — refinado)

> **Complexidade:** 🟡 Média — envolve múltiplos canais e tipos de notificação.
> **Canais:** App (badges + toasts + push) + WhatsApp (F5) + Email.

#### 📌 Tipos de Notificação na App

| Tipo | O que é | Quando usar | Recomendação |
|------|---------|-------------|-------------|
| **Badge** 🔴 | Bolinha com número num ícone/menu | Indicar itens pendentes | ✅ **Sempre activo** — é passivo, não interrompe |
| **Toast** 📢 | Pop-up pequeno no canto do ecrã (3-5s) | Confirmar acções, avisos rápidos | ✅ **Sempre activo** — UX básico obrigatório |
| **Push** 🔔 | Notificação do browser/SO (fora da app) | Eventos importantes em tempo real | ✅ **Opt-in** — desactivado por defeito |

#### 📌 Push Notifications por Plataforma

> Como a app é PWA, as push notifications funcionam em **todas as plataformas**:

| Plataforma | Como funciona |
|-----------|---------------|
| **Windows** | Notificações no canto inferior direito + Centro de Notificações do Windows |
| **iOS** (≥16.4) | Notificações nativas do iPhone (requer instalar a PWA no ecrã inicial) |
| **Android** | Suporte total — idêntico a apps nativas |
| **macOS** | Via Safari/Chrome como notificação nativa |

> **Requisito:** O utilizador tem de "instalar" a PWA (Add to Home Screen / Install App).

#### 📌 Centro de Notificações (🔔)

> Ícone de sino no header da app, com badge de contagem.

```
🔔 (5)
┌─────────────────────────────────────────┐
│ NOTIFICAÇÕES                    [Limpar]│
├─────────────────────────────────────────┤
│ 🔴 Novo pedido: João Silva       2 min │
│    📋 Novo Paciente — Dr. Ferreira      │
│                                         │
│ 📅 Prova remarcada: Maria Costa  1h    │
│    28/02 → 03/03                        │
│                                         │
│ ✅ Fase concluída: Pedro Santos  3h    │
│    Moldagem → Prova Estrutura           │
│                                         │
│ 📝 Nova nota: Clínica Sorriso    5h    │
│    "Paciente pede cor mais clara"       │
│                                         │
│ 📦 Material recebido: Ana Costa  1d    │
│              [Ver todas →]              │
└─────────────────────────────────────────┘
```

#### 📌 Configurações de Notificação (perfil)

| Configuração | Opções | Onde |
|-------------|--------|------|
| **Mutar tudo** | On/Off | Perfil → Notificações |
| **Mutar por tipo** | Pedidos / Agendamentos / Notas / Material | Perfil → Notificações |
| **Push browser** | Activar/Desactivar | Perfil → Notificações |
| **Email** | Activar/Desactivar | Perfil → Notificações |
| **Som** | On/Off + escolher som | Perfil → Notificações |
| **Horário silêncio** | De — Até (ex: 22:00–08:00) | Perfil → Notificações |

#### 📌 Relatório Semanal Obrigatório (Email + PDF)

> **NÃO pode ser mutado pelo utilizador.** Só o admin pode desactivar.
> Enviado semanalmente para cada médico e clínica. PDF gerado on-the-fly (não ocupa espaço no Supabase). Log guardado na BD (metadata leve).

```
📧 Email semanal — Relatório de Trabalhos em Aberto

Para: Dr. Ferreira (Clínica Sorriso)
📎 Anexo: relatorio_semanal_2026-02-24.pdf

CONTEÚDO DO PDF:
┌─────────────────────────────────────────────────┐
│ 🔬 AsymLAB — Relatório Semanal                  │
│ Dr. Ferreira — Clínica Sorriso                   │
│ Semana de 17/02 a 24/02/2026                     │
├─────────────────────────────────────────────────┤
│ 📋 TRABALHOS EM ABERTO: 3                        │
│                                                   │
│ ┌─ T-0042 João Silva ─────────────────────────┐  │
│ │ Plano: Coroa Zircónia #46                    │  │
│ │ Fase: Prova Estrutura                        │  │
│ │ Status: 🟡 Para Prova — 28/02 15:00         │  │
│ │ ⚠️ PENDENTE DA CLÍNICA:                     │  │
│ │    • Material em falta há 5 dias             │  │
│ └──────────────────────────────────────────────┘  │
│                                                   │
│ 📊 Resumo: 1 urgente, 2 pendentes da clínica     │
└─────────────────────────────────────────────────┘
```

**Regras:**

| Regra | Detalhe |
|-------|---------|
| **Frequência** | Semanal (dia configurável pelo admin, default: segunda 08:00) |
| **Destinatários** | Cada médico + cada clínica (emails separados) |
| **Conteúdo** | Planos não-concluídos com destaque ⚠️ em pendentes da clínica |
| **Mutável** | ❌ Não — só admin pode desactivar |
| **Armazenamento** | Log metadata leve na BD (0 impacto). PDF gerado on-the-fly |

#### 📌 Reenvio de Relatório (na ficha da Clínica/Médico)

> Qualquer staff lab pode reenviar — não só o admin. Fica na ficha da clínica ou do médico.

```
Ficha da Clínica/Médico → Separador "📊 Relatórios"
  │
  ├─ 📊 Último enviado: 24/02/2026
  │
  ├─ [📤 Reenviar último] → reenvia exactamente o último
  ├─ [📊 Gerar novo]     → gera com dados actualizados
  │   └─ Escolher: email e/ou WA
  │
  └─ Histórico de envios:
      ├─ 24/02 08:00 — auto — email ✅ WA ✅
      ├─ 17/02 08:00 — auto — email ✅ WA ✅
      └─ 10/02 14:30 — reenviado por [João] — email ✅
```

> **Log de auditoria:** Configurações → Logs de Envios (para analytics e auditoria).

---

### 4.16 — F9: Documentação e Billing ✅ (v2 — refinado)

> **Complexidade:** 🟡 Média — envolve geração de documentos, facturação por fase, e integração TOConline.

#### 📌 Bloco Documentação (na ficha do paciente)

```
📁 DOCUMENTAÇÃO

  ├─ 📄 Facturas (emitidas por fase)               👁️ Lab + Clínica
  │   ├─ Via TOConline (integração) ou arrastar PDF
  │   └─ Associadas à fase do plano
  │
  ├─ 📄 Recibos (emitidos por nós)                 👁️ Lab + Clínica
  │   ├─ Via TOConline ou arrastar PDF
  │   └─ Associados à factura
  │
  └─ 📄 Outros Documentos                          👁️ Só Lab
      ├─ Encomendas feitas para o caso
      ├─ Digitalizações de documentos
      └─ Documentos variados
```

| Secção | Lab | Médico/Staff Clínica |
|--------|-----|---------------------|
| **Facturas** | ✅ Ver + Editar + Upload | ✅ Ver + Descarregar |
| **Recibos** | ✅ Ver + Editar + Upload | ✅ Ver + Descarregar |
| **Outros Documentos** | ✅ Ver + Editar + Upload | ❌ Não vê |

#### 📌 Facturação por Fase (não por plano)

> As facturas são emitidas **por fase**, não por plano. Uma fase pode fechar sem factura com aviso restrito.

```
Fechar fase sem factura:
  │
  ├─ 1º Modal de aviso:
  │   "⚠️ ATENÇÃO: Esta fase não tem factura associada.
  │    Tem a certeza que quer fechar sem facturar?"
  │   [Cancelar] [Continuar →]
  │
  ├─ 2º Confirmação por texto (anti-erro):
  │   "🔴 CONFIRMAÇÃO OBRIGATÓRIA
  │    Escreva 'SEM FACTURA' para confirmar:"
  │   [________] [Confirmar]
  │
  ├─ Registo: quem fechou, quando, sem factura
  └─ Badge permanente na fase: "⚠️ Sem factura"
```

> **Plano só conclui quando:** todas as fases fechadas + facturas emitidas (excepto fases marcadas "sem factura") + recibos emitidos.

#### 📌 Integração TOConline (modo leve)

> Integração segura: automação quando funciona, manual quando não funciona.

```
Emitir factura para fase concluída:
  │
  ├─ App pré-preenche dados:
  │   ├─ Cliente (clínica): nome, NIF, morada
  │   ├─ Itens: tipo de trabalho, material, dentes
  │   ├─ Valores: tabela de preços configurável
  │   └─ Referência: T-xxxx / Plano / Fase
  │
  ├─ 2 Opções:
  │   │
  │   ├─ 🔄 Criar no TOConline (via API)
  │   │   ├─ Se funcionar → factura criada + PDF auto-guardado
  │   │   └─ Se falhar → aviso: "Crie manualmente e arraste o PDF"
  │   │
  │   └─ 📁 Arrastar PDF manualmente
  │       └─ Sempre disponível (backup para quando API falha)
  │
  └─ Factura guardada no bloco Documentação + NAS
```

#### 📌 Guia de Transporte (com câmara + sugestões inteligentes)

> Sugestões de itens baseadas em contagem de frequência (não IA).

```
Staff Lab → "🚚 Nova Guia de Transporte"
  │
  ├─ Auto-preenchido:
  │   ├─ Dados lab (nome, morada, NIF)
  │   ├─ Clínica destinatária
  │   ├─ Paciente: T-xxxx + nome
  │   ├─ Plano: tipo de trabalho
  │   ├─ Nº da guia (sequencial)
  │   └─ Data de envio
  │
  ├─ 💡 SUGESTÕES DE ITENS (contagem de frequência):
  │   Combinação: clínica × médico × tipo_trabalho × tipo_agendamento_próximo
  │
  │   "Clínica Sorriso + Dr. Ferreira + Coroa Zircónia + Para Prova"
  │   ☑️ Prova de estrutura     (usado 95%) ← pré-seleccionado
  │   ☑️ Modelo antagonista     (usado 80%) ← pré-seleccionado
  │   ☐  Chave silicone         (usado 60%)
  │   + Adicionar item...
  │   + Criar novo item...
  │
  │   Threshold: ≥80% → pré-seleccionado | ≥50% → sugerido | <50% → não aparece
  │
  ├─ 📸 FOTOS DO ENVIO:
  │   ├─ Mobile: abre câmara nativa (múltiplas fotos sem sair)
  │   ├─ Desktop: abre Web Camera API (interface custom)
  │   └─ Alternativa: arrastar ficheiros
  │
  ├─ 📝 Notas (opcional)
  │
  └─ ACÇÕES:
      ├─ 💾 Guardar (só registo digital)
      ├─ 📤 Enviar por WA (guia + fotos no grupo do paciente)
      ├─ 📧 Enviar por email (future feature)
      └─ 🖨️ Imprimir (PDF acompanha trabalho)
```

> A base de dados de itens cresce com o uso — aprende as tendências por clínica, médico, e tipo de trabalho automaticamente.

#### 📌 Guia de Recepção (2 cenários)

##### Cenário 1: Após @recolhido

```
Staff Lab marca @recolhido no WA (ou marca na app)
  │
  ├─ Badge na app: "📦 Recepção pendente: T-0042"
  │
  └─ Staff Lab clica → formulário pré-preenchido:
      ├─ Paciente: T-0042 (auto)
      ├─ Clínica: Sorriso (auto)
      ├─ Agendamento: Moldagem 25/02 (auto)
      ├─ 💡 Sugestões de itens (mesma contagem de frequência):
      │   clínica × médico × tipo_trabalho × tipo_agendamento
      │   ☑️ Moldagem superior (95%)
      │   ☑️ Moldagem inferior (90%)
      │   ☐  Registo de mordida (60%)
      ├─ Estado: ○ OK  ○ Danificado  ○ Incompleto
      ├─ 📸 Fotos do que chegou
      ├─ 📝 Notas (opcional)
      └─ [💾 Guardar] [📤 Enviar WA] [🖨️ Imprimir]
```

##### Cenário 2: Entrega directa (sem @recolhido)

```
Trabalho chega directamente ao lab
  │
  ├─ Menu → "📦 Nova Recepção"
  │
  └─ 🔍 Pesquisar paciente: [____]
      │
      ├─ Paciente encontrado:
      │   ├─ Lista agendamentos pendentes:
      │   │   ○ Moldagem — 25/02
      │   │   ○ Prova — 03/03
      │   │   ○ Nenhum (recepção avulsa)
      │   └─ Seleccionar → abre formulário = Cenário 1
      │
      └─ Paciente não encontrado:
          ├─ Recepção avulsa (nome, clínica, itens, fotos)
          └─ Badge: "⚠️ Paciente não existe — criar?"
```

> As guias de transporte e recepção têm as mesmas opções de output: **registo digital**, **documento impresso (PDF)**, **envio WA com fotos**. O utilizador escolhe.

#### 📌 Relatório de Plano (com material/dentes/logística)

> Gerado automaticamente quando a **última fase** do plano tem o **último agendamento "Para Colocação" concluído**.
> O plano só fecha definitivamente quando facturas e recibos estiverem OK.

```
📋 RELATÓRIO DE PLANO — T-0042 João Silva
Plano: Coroa Zircónia #46
Período: 15/01/2026 — 28/02/2026 (44 dias)

🦷 DENTES: 46
📦 MATERIAL TOTAL:
├─ Zircónia Katana UTML (bloco A2-HT)
├─ Cimento RelyX Ultimate
└─ Pilar personalizado Ti

FASES:
├─ Fase 1: Moldagem (15/01 - 22/01) ✅
│   Material: Impressão digital (scanner TRIOS)
│   Factura: #F-2026-0042 ✅
│
├─ Fase 2: Prova Estrutura (25/01 - 05/02) ✅
│   Material: Zircónia Katana UTML
│   Factura: #F-2026-0043 ✅
│
└─ Fase 3: Cimentação (20/02 - 28/02) ✅
    Material: Cimento RelyX Ultimate
    Factura: #F-2026-0044 ✅

📊 RESUMO:
├─ 3 fases, 5 agendamentos
├─ 3 considerações, 8 ficheiros
├─ 0 remakes, 0 correcções
├─ Facturas: 3/3 emitidas ✅
└─ Tempo total: 44 dias
```

**Trigger e acções:**

```
Último agendamento "Para Colocação" concluído
  │
  ├─ Gera Relatório de Plano automaticamente
  ├─ Badge: "📋 Relatório pronto"
  │
  └─ Acções:
      ├─ 📤 Enviar por WA
      ├─ 📧 Enviar por email
      └─ 🖨️ Imprimir
```

#### 📌 Relatório de Fase (para fases com colocação)

> Cada fase que tem agendamento "Para Colocação" gera um mini-relatório com os seus materiais específicos.
> Essencial quando as fases têm materiais diferentes (provisório vs definitivo).

```
📋 RELATÓRIO DE FASE — T-0042 João Silva
Plano: Híbrida Superior
Fase: Provisório (Para Colocação)

🦷 DENTES: 14—24
📦 MATERIAL DESTA FASE:
├─ Dentes: Ivoclar Phonares II (A2, tamanho M)
├─ Base: PMMA fresada
└─ Parafusos: Prosthetic Screw M1.6

📝 CONSIDERAÇÕES:
├─ Cor confirmada pelo médico
└─ Oclusão verificada em articulador

📎 FOTOS: 4 (antes montagem, pós-montagem, oclusal, frontal)
```

> **Caso de uso:** Plano "Híbrida" com 4 fases (prova dentes, carga imediata, prova definitiva, colocação definitiva) — cada fase pode ter dentes e materiais diferentes. O relatório de fase permite a clínica saber exactamente o que foi usado.

---

### 4.17 — Sistema de Ajuda Integrado (Feature Transversal) ✅

> **Conceito:** Cada página, modal, ou interacção da app tem um ícone de ajuda **❓** que mostra uma explicação detalhada + vídeo tutorial.
> **Vídeos:** Gravados durante os testes QA, guardados na NAS (não no Supabase).
> **Abrangência:** TODOS os módulos — login, instalação PWA, ficha paciente, guias, pedidos, etc.

#### 📌 Como Funciona

```
Qualquer página/modal da app
  │
  ├─ Ícone ❓ no canto superior direito
  │
  └─ Ao clicar:
      ┌──────────────────────────────────────────┐
      │ ❓ AJUDA — Ficha do Paciente              │
      ├──────────────────────────────────────────┤
      │                                          │
      │ 📝 COMO FUNCIONA                         │
      │ A ficha do paciente mostra todos os      │
      │ planos activos e histórico. Pode:        │
      │ • Ver/editar dados do paciente           │
      │ • Navegar entre planos activos           │
      │ • Consultar histórico de planos          │
      │ • Aceder a ficheiros e considerações     │
      │                                          │
      │ 🎬 VÍDEO TUTORIAL                        │
      │ ┌────────────────────────────────┐       │
      │ │                                │       │
      │ │    [▶️ vídeo player]           │       │
      │ │    (carregado da NAS)          │       │
      │ │                                │       │
      │ └────────────────────────────────┘       │
      │                                          │
      │ ⏱️ Duração: 1:30                         │
      │                                          │
      │ [✕ Fechar]                               │
      └──────────────────────────────────────────┘
```

#### 📌 Origem dos Vídeos

| Aspecto | Detalhe |
|---------|---------|
| **Quando gravar** | Durante os testes QA finais de cada módulo |
| **Quem grava** | Sistema automático (browser recording durante testes) |
| **Onde ficam** | NAS: `/asymlab/ajuda/[modulo]/[pagina].webm` |
| **Performance** | Pode demorar a carregar (NAS) — é um plus, não crítico |
| **Formato** | WebM/MP4 (compatível com todos os browsers) |
| **Actualização** | Ao correr testes QA de novo → vídeos actualizados automaticamente |

#### 📌 Cobertura Completa

| Módulo | Exemplos de Ajuda |
|--------|-------------------|
| **Login** | Como fazer login, recuperar password |
| **Instalar PWA** | Como instalar no Windows, iOS, Android |
| **Dashboard** | Navegar widgets, badges, atalhos |
| **Pacientes** | Criar, pesquisar, ficha, histórico |
| **Planos** | Criar, editar, pausar, reabrir |
| **Fases/Agendamentos** | Adicionar, transitar status, remarcar |
| **Pedidos** | Inbox, aceitar, transitar, cancelar |
| **WhatsApp** | Usar @comandos, criar grupo, formulário |
| **Documentação** | Facturas, guias, relatórios |
| **Ficheiros** | Upload, STL viewer, câmara |
| **Notificações** | Configurar, mutar, push |
| **Configurações** | Utilizadores, clínicas, templates |

> **Em cada ajuda:** texto explicativo + vídeo gravado durante QA + links para ajudas relacionadas.

---

### 4.18 — Email como Canal Alternativo ao WhatsApp (Future Feature) 🔮

> **Status:** Future feature — documentado para implementação posterior.
> A arquitectura é **channel-agnostic** (abstracção por canal).

```
Módulo Configurações (Admin):
  │
  └─ Canal de comunicação:
      ○ WhatsApp apenas (default actual)
      ○ Email apenas
      ○ WhatsApp + Email (ambos)
      │
      └─ Ao enviar qualquer coisa:
          → Sistema verifica configuração
          → Envia pelo(s) canal(is) activo(s)
          → Botões/automações da app adaptam-se
```

> **Conceito:** O email entre clínica e lab funciona como o grupo WA — destinatários = participantes.
> Os CC do email = membros do grupo.
> **Para já:** Tudo via WA. Arquitectura preparada para adicionar email plug-in.

---

## Etapa 5 — Definir a Informação

> Define os campos detalhados de cada entidade da base de dados.
> Cruza os campos com os fluxos (F1—F10) e features transversais documentados na Etapa 4.
> Notação: **PK** = Primary Key, **FK** = Foreign Key, **auto** = gerado automaticamente.
> Todos os campos `created_at`, `updated_at` são automáticos e não estão listados (presentes em todas as tabelas).

---

### 5.1 — Paciente (`patients`)

> Referências: F1 (Criação), F2 (Plano), F7 (Merge), F10 (NAS)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `t_id` | TEXT | ✅ | auto | Formato `T-xxxx`. Sequencial, editável manualmente, **único** |
| `nome` | TEXT | ✅ | — | Nome completo do paciente |
| `id_paciente_clinica` | TEXT | ❌ | NULL | Código interno da clínica (ex: "PAC-0412"). Anti-duplicação |
| `clinica_id` | FK → `clinics` | ✅ | — | Clínica de origem |
| `medico_principal_id` | FK → `users` | ✅ | — | Médico que recebe o paciente |
| `notas_lab` | TEXT | ❌ | NULL | Só visível Staff Lab. Observações internas |
| `urgente` | BOOLEAN | ✅ | false | Toggle via `@urgente`. Destaque visual + topo da lista |
| `merged_into_id` | FK → `patients` | ❌ | NULL | Se mergeado → aponta para o survivor |
| `merged_at` | TIMESTAMP | ❌ | NULL | Data do merge |
| `merged_by` | FK → `users` | ❌ | NULL | Quem executou o merge |
| `deleted_at` | TIMESTAMP | ❌ | NULL | Soft delete (48h recoverável) |
| `deleted_by` | FK → `users` | ❌ | NULL | Quem eliminou |
| `origem` | ENUM | ✅ | 'app' | `app` \| `whatsapp` \| `formulario` |

**Tabela auxiliar: `patient_doctors`** (N:N)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `patient_id` | FK → `patients` | ✅ | — |
| `doctor_id` | FK → `users` | ✅ | — |

> A equipa do paciente = todos os médicos em `patient_doctors` + Staff Clínica de cada + Staff Lab.

---

### 5.2 — Plano de Tratamento (`treatment_plans`)

> Referências: F2 (Lifecycle), F3 (Fases), F5 (@novotratamento), F9 (Billing)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `patient_id` | FK → `patients` | ✅ | — | — |
| `nome` | TEXT | ✅ | — | Ex: "Coroa Zircónia #46" |
| `tipo_trabalho_id` | FK → `work_types` | ✅ | — | Configurável no módulo Configurações |
| `estado` | ENUM | ✅ | 'rascunho' | `rascunho` \| `activo` \| `pausado` \| `concluido` \| `cancelado` \| `reaberto` |
| `motivo_pausa` | TEXT | ❌ | NULL | Preenchido ao pausar |
| `motivo_cancelamento` | TEXT | ❌ | NULL | Preenchido ao cancelar |
| `tipo_reopen` | ENUM | ❌ | NULL | `correcao` \| `remake` (preenchido ao reabrir) |
| `reopen_de_plano_id` | FK → `treatment_plans` | ❌ | NULL | Plano original que este reabre |
| `medico_id` | FK → `users` | ✅ | — | Herda do paciente, editável |
| `clinica_id` | FK → `clinics` | ✅ | — | Herda do paciente |
| `data_inicio` | DATE | ✅ | auto (hoje) | — |
| `data_conclusao` | DATE | ❌ | NULL | Preenchida ao concluir |
| `notas` | TEXT | ❌ | NULL | — |
| `urgente` | BOOLEAN | ✅ | false | Herda do paciente, toggle individual |
| `origem` | ENUM | ✅ | 'app' | `app` \| `whatsapp` \| `formulario` |
| `deleted_at` | TIMESTAMP | ❌ | NULL | Soft delete (48h) |
| `deleted_by` | FK → `users` | ❌ | NULL | — |

---

### 5.3 — Fase (`phases`)

> Referências: F3 (Fases), F9 (Facturação por fase, Relatório de fase)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `plan_id` | FK → `treatment_plans` | ✅ | — | — |
| `nome` | TEXT | ✅ | — | Ex: "Moldagem", "Prova Estrutura", "Colocação" |
| `ordem` | INTEGER | ✅ | auto | Posição na sequência (reordenável) |
| `estado` | ENUM | ✅ | 'pendente' | `pendente` \| `em_curso` \| `concluida` \| `cancelada` |
| `sem_factura` | BOOLEAN | ✅ | false | Se true → fechada sem factura (com aviso duplo) |
| `sem_factura_por` | FK → `users` | ❌ | NULL | Quem confirmou fechar sem factura |
| `sem_factura_em` | TIMESTAMP | ❌ | NULL | Quando confirmou |
| `notas` | TEXT | ❌ | NULL | — |

---

### 5.4 — Agendamento (`appointments`)

> Referências: F3 (Agendamentos), F5 (@entregue, @recolher), F9 (Guias, Relatórios)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `phase_id` | FK → `phases` | ✅ | — | — |
| `tipo` | ENUM | ✅ | — | `moldagem` \| `para_prova` \| `para_colocacao` \| `reparacao` \| `ajuste` \| `outro` |
| `data_prevista` | TIMESTAMP | ❌ | NULL | Pode ser "sem data" inicialmente |
| `data_real` | TIMESTAMP | ❌ | NULL | Preenchida quando acontece |
| `estado` | ENUM | ✅ | 'agendado' | `agendado` \| `prova_entregue` \| `colocacao_entregue` \| `recolhido` \| `concluido` \| `cancelado` \| `remarcado` |
| `recolha_pronta` | BOOLEAN | ✅ | false | Lab marca pronto → envia mensagem WA |
| `recolhido_em` | TIMESTAMP | ❌ | NULL | Quando @recolhido |
| `recolhido_por` | FK → `users` | ❌ | NULL | — |
| `notas` | TEXT | ❌ | NULL | — |
| `ordem` | INTEGER | ✅ | auto | Posição dentro da fase |

---

### 5.5 — Consideração (`considerations`)

> Referências: F4 (Considerações), F5 (@nota)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `phase_id` | FK → `phases` | ✅ | — | Agrupada por fase |
| `appointment_id` | FK → `appointments` | ❌ | NULL | Opcionalmente associada ao agendamento |
| `autor_id` | FK → `users` | ✅ | — | Quem escreveu |
| `lado` | ENUM | ✅ | auto | `lab` \| `clinica` — determina quem pode editar |
| `tipo` | ENUM | ✅ | 'texto' | `texto` \| `com_anexo` \| `so_anexo` |
| `conteudo` | TEXT | ❌ | NULL | Texto livre (pode ser NULL se tipo `so_anexo`) |
| `versao` | INTEGER | ✅ | 1 | Auto-incremento a cada edição |
| `enviada_wa` | BOOLEAN | ✅ | false | Se já foi enviada para WA manualmente |
| `enviada_wa_em` | TIMESTAMP | ❌ | NULL | Quando foi enviada |
| `agendada_para` | TIMESTAMP | ❌ | NULL | Envio agendado (clínica só vê após esta data) |
| `origem` | ENUM | ✅ | 'app' | `app` \| `whatsapp` (via @nota) |

**Tabela auxiliar: `consideration_attachments`** (N:N)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `consideration_id` | FK → `considerations` | ✅ | — |
| `file_id` | FK → `files` | ✅ | — |
| `ordem` | INTEGER | ✅ | Ordem dos anexos |

---

### 5.6 — Pedido (`requests`)

> Referências: F1 (Criação), F2 (Plano), F6 (Fila)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `tipo` | ENUM | ✅ | — | `novo_paciente` \| `novo_plano` \| `editar_plano` \| `editar_paciente` \| `nova_fase` \| `novo_agendamento` \| `editar_fase` \| `editar_agendamento` \| `consideracao` \| `outro` |
| `descricao` | TEXT | ✅ | auto | Auto-gerada ou texto livre |
| `patient_id` | FK → `patients` | ❌ | NULL | Se aplicável |
| `plan_id` | FK → `treatment_plans` | ❌ | NULL | Se aplicável |
| `phase_id` | FK → `phases` | ❌ | NULL | Se aplicável |
| `appointment_id` | FK → `appointments` | ❌ | NULL | Se aplicável |
| `diff_json` | JSONB | ❌ | NULL | Diff automático: `{campo, valor_antigo, valor_novo}` |
| `prioridade` | ENUM | ✅ | 'normal' | `normal` \| `urgente` |
| `estado` | ENUM | ✅ | 'pendente' | `pendente` \| `visto` \| `concluido` |
| `criado_por` | FK → `users` | ✅ | auto | Médico ou Staff Clínica |
| `visto_por` | FK → `users` | ❌ | NULL | Staff Lab que abriu |
| `visto_em` | TIMESTAMP | ❌ | NULL | — |
| `concluido_por` | FK → `users` | ❌ | NULL | — |
| `concluido_em` | TIMESTAMP | ❌ | NULL | — |
| `form_token` | TEXT | ❌ | NULL | Se via formulário WA (token para link público) |
| `form_expiry` | TIMESTAMP | ❌ | NULL | Validade do token (24h) |
| `origem` | ENUM | ✅ | 'app' | `app` \| `whatsapp` \| `formulario` |

---

### 5.7 — Ficheiro (`files`)

> Referências: F4 (Anexos), F10 (NAS)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `nome_original` | TEXT | ✅ | — | Nome do ficheiro original |
| `nome_nas` | TEXT | ✅ | — | Nome guardado na NAS (pode ter versionamento: `scan(2).stl`) |
| `tipo` | ENUM | ✅ | — | `stl` \| `foto` \| `video` \| `documento` \| `comprimido` \| `outro` |
| `mime_type` | TEXT | ✅ | — | Ex: `model/stl`, `image/jpeg` |
| `caminho_nas` | TEXT | ✅ | — | Path relativo: `/pacientes/T-0042/plano-1/fase-1/scan.stl` |
| `tamanho` | BIGINT | ✅ | — | Em bytes |
| `thumbnail_url` | TEXT | ❌ | NULL | Supabase Storage (≤200KB). Auto-gerado |
| `patient_id` | FK → `patients` | ✅ | — | — |
| `plan_id` | FK → `treatment_plans` | ❌ | NULL | — |
| `phase_id` | FK → `phases` | ❌ | NULL | — |
| `enviado_por` | FK → `users` | ✅ | — | — |
| `versao` | INTEGER | ✅ | 1 | Versionamento: 1, 2, 3... |
| `origem` | ENUM | ✅ | 'app' | `app` \| `whatsapp` \| `formulario` |

---

### 5.8 — Grupo WhatsApp (`wa_groups`)

> Referências: F1 (Criação de grupo), F5 (Automações), F7 (Merge)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `patient_id` | FK → `patients` | ✅ | — | 1 grupo por paciente |
| `wa_group_id` | TEXT | ✅ | — | ID do grupo na Z-API |
| `nome_grupo` | TEXT | ✅ | — | Formato: `T-xxxx Nome Paciente` |
| `descricao` | TEXT | ❌ | NULL | Instruções de @comandos |
| `mensagem_fixada` | TEXT | ❌ | NULL | Resumo de planos activos |
| `activo` | BOOLEAN | ✅ | true | false → grupo eliminado (ex: merge) |

**Tabela auxiliar: `wa_group_members`** (N:N)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `group_id` | FK → `wa_groups` | ✅ | — |
| `user_id` | FK → `users` | ✅ | — |
| `wa_phone` | TEXT | ✅ | Nº telefone no WA |
| `added_at` | TIMESTAMP | ✅ | auto |

---

### 5.9 — Guia de Transporte (`transport_guides`)

> Referências: F9 (Guia com câmara + sugestões)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `numero` | TEXT | ✅ | auto | Sequencial: GT-0001, GT-0002... |
| `patient_id` | FK → `patients` | ✅ | — | — |
| `plan_id` | FK → `treatment_plans` | ❌ | NULL | — |
| `phase_id` | FK → `phases` | ❌ | NULL | — |
| `appointment_id` | FK → `appointments` | ❌ | NULL | — |
| `clinica_id` | FK → `clinics` | ✅ | — | Destinatário |
| `data_envio` | TIMESTAMP | ✅ | auto (agora) | — |
| `notas` | TEXT | ❌ | NULL | — |
| `enviada_wa` | BOOLEAN | ✅ | false | — |
| `enviada_wa_em` | TIMESTAMP | ❌ | NULL | — |
| `impressa` | BOOLEAN | ✅ | false | — |
| `pdf_path_nas` | TEXT | ❌ | NULL | Path do PDF na NAS |
| `criado_por` | FK → `users` | ✅ | auto | — |

**Tabela auxiliar: `transport_guide_items`** (itens enviados)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `id` | UUID | PK | auto |
| `guide_id` | FK → `transport_guides` | ✅ | — |
| `item_id` | FK → `guide_items` | ❌ | Referência ao catálogo (se existir) |
| `descricao` | TEXT | ✅ | Nome do item |
| `quantidade` | INTEGER | ✅ | 1 |

**Tabela auxiliar: `transport_guide_photos`** (fotos do envio)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `id` | UUID | PK | auto |
| `guide_id` | FK → `transport_guides` | ✅ | — |
| `file_id` | FK → `files` | ✅ | Referência ao ficheiro na NAS |
| `ordem` | INTEGER | ✅ | Ordem das fotos |

---

### 5.10 — Guia de Recepção (`reception_guides`)

> Referências: F9 (Guia de recepção, 2 cenários), F5 (@recolhido)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `numero` | TEXT | ✅ | auto | Sequencial: GR-0001, GR-0002... |
| `patient_id` | FK → `patients` | ❌ | NULL | NULL se recepção avulsa (paciente não existe) |
| `plan_id` | FK → `treatment_plans` | ❌ | NULL | — |
| `phase_id` | FK → `phases` | ❌ | NULL | — |
| `appointment_id` | FK → `appointments` | ❌ | NULL | — |
| `clinica_id` | FK → `clinics` | ❌ | NULL | — |
| `nome_avulso` | TEXT | ❌ | NULL | Se paciente não existe: nome livre |
| `cenario` | ENUM | ✅ | — | `pos_recolhido` \| `entrega_directa` |
| `estado_material` | ENUM | ✅ | 'ok' | `ok` \| `danificado` \| `incompleto` |
| `notas` | TEXT | ❌ | NULL | — |
| `enviada_wa` | BOOLEAN | ✅ | false | — |
| `impressa` | BOOLEAN | ✅ | false | — |
| `pdf_path_nas` | TEXT | ❌ | NULL | — |
| `criado_por` | FK → `users` | ✅ | auto | — |

> Tabelas auxiliares de itens e fotos: mesma estrutura que a guia de transporte.

---

### 5.11 — Catálogo de Itens de Guia (`guide_items`)

> Referências: F9 (Sugestões por contagem de frequência)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `nome` | TEXT | ✅ | — | Ex: "Prova de estrutura", "Modelo antagonista" |
| `activo` | BOOLEAN | ✅ | true | — |

**Tabela auxiliar: `guide_item_frequency`** (contagens para sugestões)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `id` | UUID | PK | auto |
| `item_id` | FK → `guide_items` | ✅ | — |
| `clinica_id` | FK → `clinics` | ✅ | — |
| `medico_id` | FK → `users` | ❌ | NULL = qualquer médico desta clínica |
| `tipo_trabalho_id` | FK → `work_types` | ❌ | NULL = qualquer tipo |
| `tipo_agendamento` | ENUM | ❌ | NULL = qualquer tipo |
| `contagem` | INTEGER | ✅ | 0 | Vezes que este item foi usado nesta combinação |
| `total_guias` | INTEGER | ✅ | 0 | Total de guias nesta combinação |

> `percentagem = contagem / total_guias × 100`. ≥80% → pré-seleccionado, ≥50% → sugerido, <50% → oculto.

---

### 5.12 — Factura (`invoices`)

> Referências: F9 (Facturação por fase, TOConline)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `numero` | TEXT | ✅ | — | Ex: "F-2026-0042" |
| `phase_id` | FK → `phases` | ✅ | — | Fatura é **por fase** |
| `plan_id` | FK → `treatment_plans` | ✅ | — | Para referência rápida |
| `patient_id` | FK → `patients` | ✅ | — | Para referência rápida |
| `clinica_id` | FK → `clinics` | ✅ | — | Cliente da factura |
| `valor_total` | DECIMAL(10,2) | ✅ | — | — |
| `iva` | DECIMAL(5,2) | ✅ | — | Percentagem de IVA |
| `valor_com_iva` | DECIMAL(10,2) | ✅ | — | — |
| `estado` | ENUM | ✅ | 'emitida' | `rascunho` \| `emitida` \| `paga` \| `anulada` |
| `toconline_id` | TEXT | ❌ | NULL | ID no TOConline (se criada via API) |
| `toconline_sync` | BOOLEAN | ✅ | false | Se está sincronizada com TOConline |
| `pdf_path_nas` | TEXT | ❌ | NULL | Path do PDF na NAS |
| `data_emissao` | DATE | ✅ | auto (hoje) | — |
| `data_vencimento` | DATE | ❌ | NULL | — |
| `criado_por` | FK → `users` | ✅ | auto | — |

**Tabela auxiliar: `invoice_items`** (linhas da factura)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `id` | UUID | PK | auto |
| `invoice_id` | FK → `invoices` | ✅ | — |
| `descricao` | TEXT | ✅ | Descrição do item |
| `quantidade` | INTEGER | ✅ | — |
| `preco_unitario` | DECIMAL(10,2) | ✅ | — |
| `iva` | DECIMAL(5,2) | ✅ | — |
| `total` | DECIMAL(10,2) | ✅ | — |

---

### 5.13 — Recibo (`receipts`)

> Referências: F9 (Billing)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `numero` | TEXT | ✅ | — | Ex: "R-2026-0042" |
| `invoice_id` | FK → `invoices` | ✅ | — | Associado à factura |
| `valor` | DECIMAL(10,2) | ✅ | — | — |
| `metodo_pagamento` | TEXT | ❌ | NULL | — |
| `toconline_id` | TEXT | ❌ | NULL | — |
| `pdf_path_nas` | TEXT | ❌ | NULL | — |
| `data_emissao` | DATE | ✅ | auto | — |
| `criado_por` | FK → `users` | ✅ | auto | — |

---

### 5.14 — Outros Documentos (`documents`)

> Referências: F9 (Bloco Documentação — só lab)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `patient_id` | FK → `patients` | ✅ | — | — |
| `plan_id` | FK → `treatment_plans` | ❌ | NULL | — |
| `titulo` | TEXT | ✅ | — | — |
| `tipo` | ENUM | ✅ | — | `encomenda` \| `digitalizacao` \| `outro` |
| `file_id` | FK → `files` | ✅ | — | Referência ao ficheiro na NAS |
| `notas` | TEXT | ❌ | NULL | — |
| `criado_por` | FK → `users` | ✅ | auto | — |

---

### 5.15 — Notificação (`notifications`)

> Referências: F8 (Avisos e Notificações)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `user_id` | FK → `users` | ✅ | — | Destinatário |
| `tipo` | ENUM | ✅ | — | `pedido` \| `agendamento` \| `nota` \| `material` \| `fase` \| `plano` \| `sistema` |
| `titulo` | TEXT | ✅ | — | Texto curto (ex: "Novo pedido: João Silva") |
| `corpo` | TEXT | ❌ | NULL | Detalhe |
| `link` | TEXT | ❌ | NULL | URL para navegar na app (ex: `/pacientes/T-0042`) |
| `lida` | BOOLEAN | ✅ | false | — |
| `lida_em` | TIMESTAMP | ❌ | NULL | — |
| `push_enviada` | BOOLEAN | ✅ | false | — |
| `email_enviado` | BOOLEAN | ✅ | false | — |

---

### 5.16 — Material e Componentes (`materials`)

> Referências: F9 (Relatório de plano/fase com materiais)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `nome` | TEXT | ✅ | — | Ex: "Zircónia Katana UTML" |
| `categoria` | ENUM | ✅ | — | `material` \| `componente` \| `dente` \| `parafuso` \| `cimento` \| `outro` |
| `marca` | TEXT | ❌ | NULL | Ex: "Ivoclar", "3M" |
| `referencia` | TEXT | ❌ | NULL | Código de referência |
| `activo` | BOOLEAN | ✅ | true | — |

**Tabela auxiliar: `phase_materials`** (materiais usados por fase)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `id` | UUID | PK | auto |
| `phase_id` | FK → `phases` | ✅ | — |
| `material_id` | FK → `materials` | ✅ | — |
| `quantidade` | TEXT | ❌ | Ex: "1 bloco A2-HT" |
| `dentes` | TEXT | ❌ | Ex: "14—24", "46" |
| `notas` | TEXT | ❌ | Ex: "Cor confirmada pelo médico" |

---

### 5.17 — Logística / Caixa (`boxes`)

> Referências: F3 (Caixa associada ao agendamento)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `appointment_id` | FK → `appointments` | ✅ | — | — |
| `notas` | TEXT | ❌ | NULL | — |

**Tabela auxiliar: `box_items`** (itens na caixa)

| Campo | Tipo | Obrig. | Notas |
|-------|------|--------|-------|
| `id` | UUID | PK | auto |
| `box_id` | FK → `boxes` | ✅ | — |
| `descricao` | TEXT | ✅ | Nome do item |
| `quantidade` | INTEGER | ✅ | 1 |
| `estado` | ENUM | ✅ | `na_caixa` \| `entregue` \| `devolvido` |

---

### 5.18 — Template de Mensagem (`message_templates`)

> Referências: F5 (Templates configuráveis pelo admin)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `comando` | TEXT | ✅ | — | Ex: "@criarpaciente", "@entregue", "notif_material" |
| `nome` | TEXT | ✅ | — | Nome legível: "Criação de paciente" |
| `template` | TEXT | ✅ | — | Template com variáveis: `{paciente}`, `{clinica}`, `{plano}` |
| `variaveis` | JSONB | ✅ | — | Lista de variáveis disponíveis + descrições |
| `activo` | BOOLEAN | ✅ | true | — |
| `editado_por` | FK → `users` | ❌ | NULL | Último admin que editou |

---

### 5.19 — Relatório Semanal Log (`weekly_report_logs`)

> Referências: F8 (Relatório semanal obrigatório, reenvio na ficha)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `clinica_id` | FK → `clinics` | ❌ | NULL | Se enviado para clínica |
| `medico_id` | FK → `users` | ❌ | NULL | Se enviado para médico |
| `tipo_envio` | ENUM | ✅ | 'auto' | `auto` \| `reenvio` \| `novo` |
| `canal` | ENUM | ✅ | — | `email` \| `whatsapp` \| `ambos` |
| `data_envio` | TIMESTAMP | ✅ | auto | — |
| `enviado_por` | FK → `users` | ❌ | NULL | NULL = sistema (auto) |
| `resumo_json` | JSONB | ✅ | — | Dados do relatório (para analytics, não gera PDF) |

> PDF gerado on-the-fly quando preciso, a partir do `resumo_json`. Zero armazenamento no Supabase.

---

### 5.20 — Ajuda Integrada (`help_contents`)

> Referências: 4.17 (Sistema de Ajuda Integrado)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `pagina_key` | TEXT | ✅ | — | Identificador único: `paciente_ficha`, `guia_transporte`, `login` |
| `titulo` | TEXT | ✅ | — | Título da ajuda |
| `conteudo` | TEXT | ✅ | — | Texto explicativo (markdown) |
| `video_path_nas` | TEXT | ❌ | NULL | Path na NAS: `/asymlab/ajuda/modulo/pagina.webm` |
| `video_duracao` | INTEGER | ❌ | NULL | Duração em segundos |
| `links_relacionados` | JSONB | ❌ | NULL | Links para outras ajudas |
| `ultima_gravacao_qa` | TIMESTAMP | ❌ | NULL | Quando o vídeo foi gravado nos testes QA |

---

### 5.21 — Log de Auditoria (`audit_logs`)

> Referências: F8 (Logs de envio), F9 (Facturas), F7 (Merge)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `user_id` | FK → `users` | ✅ | — | Quem fez a acção |
| `accao` | TEXT | ✅ | — | Ex: "criar_paciente", "fechar_fase_sem_factura", "merge" |
| `entidade` | TEXT | ✅ | — | Nome da tabela afectada |
| `entidade_id` | UUID | ✅ | — | ID do registo afectado |
| `dados_antes` | JSONB | ❌ | NULL | Estado antes da alteração |
| `dados_depois` | JSONB | ❌ | NULL | Estado depois da alteração |
| `ip` | TEXT | ❌ | NULL | IP do utilizador |
| `user_agent` | TEXT | ❌ | NULL | Browser/dispositivo |

---

### 5.22 — Configurações do Sistema (`system_settings`)

> Referências: F5 (Anti-spam), F8 (Relatório semanal), F9 (TOConline)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `key` | TEXT | PK | — | Identificador único |
| `value` | JSONB | ✅ | — | Valor da configuração |
| `updated_by` | FK → `users` | ✅ | — | Último admin que editou |

**Chaves pré-definidas:**

| Key | Valor Default | Descrição |
|-----|--------------|-----------|
| `wa_antispam_intervalo_min` | `5` | Segundos mínimos entre mensagens WA |
| `wa_antispam_limite_diario` | `200` | Máximo de mensagens WA por dia |
| `wa_horario_inicio` | `"08:00"` | Início do horário de envio WA |
| `wa_horario_fim` | `"20:00"` | Fim do horário de envio WA |
| `relatorio_semanal_dia` | `"monday"` | Dia de envio do relatório |
| `relatorio_semanal_hora` | `"08:00"` | Hora de envio |
| `toconline_api_key` | `null` | Chave API do TOConline |
| `toconline_activo` | `false` | Se a integração está activa |
| `canal_comunicacao` | `"whatsapp"` | `whatsapp` \| `email` \| `ambos` |
| `sugestao_threshold_pre` | `80` | % para pré-seleccionar itens nas guias |
| `sugestao_threshold_mostrar` | `50` | % mínimo para mostrar sugestão |

---

### 5.23 — Utilizador (`users`) — extensão módulo pacientes

> A tabela `users` já existe no sistema de auth (Supabase Auth). Estes são os campos **adicionais** necessários para o módulo pacientes.
> Referências: F1 (Criação), F5 (WA), F7 (Merge — desactivação), Etapa 2 (Actores)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | Supabase Auth | Mesmo ID do auth.users |
| `nome` | TEXT | ✅ | — | Nome completo |
| `email` | TEXT | ✅ | — | — |
| `telefone` | TEXT | ❌ | NULL | Número para WA |
| `role` | ENUM | ✅ | — | `admin` \| `staff_lab` \| `medico` \| `staff_clinica` |
| `clinica_id` | FK → `clinics` | ❌ | NULL | NULL para Admin/Staff Lab |
| `avatar_url` | TEXT | ❌ | NULL | Foto de perfil |
| `activo` | BOOLEAN | ✅ | true | false → conta desactivada (login bloqueado) |
| `desactivado_em` | TIMESTAMP | ❌ | NULL | — |
| `desactivado_por` | FK → `users` | ❌ | NULL | — |
| `ultimo_login` | TIMESTAMP | ❌ | NULL | — |
| `idioma` | TEXT | ✅ | 'pt' | — |

---

### 5.24 — Clínica (`clinics`)

> Referências: F1 (Associação paciente), F9 (Facturação, Guias)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `nome` | TEXT | ✅ | — | Nome da clínica |
| `nif` | TEXT | ❌ | NULL | Número de identificação fiscal |
| `morada` | TEXT | ❌ | NULL | — |
| `codigo_postal` | TEXT | ❌ | NULL | — |
| `cidade` | TEXT | ❌ | NULL | — |
| `telefone` | TEXT | ❌ | NULL | — |
| `email` | TEXT | ❌ | NULL | Email geral |
| `logo_url` | TEXT | ❌ | NULL | Supabase Storage |
| `desconto_percentagem` | DECIMAL(5,2) | ✅ | 0 | Desconto global para esta clínica |
| `activa` | BOOLEAN | ✅ | true | — |
| `notas_lab` | TEXT | ❌ | NULL | Observações internas do lab |

---

### 5.25 — Tipo de Trabalho (`work_types`)

> Referências: F2 (Plano), F9 (Preços, Guias — contagem frequência)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `nome` | TEXT | ✅ | — | Ex: "Coroa Zircónia", "Implante", "Facetas", "Híbrida" |
| `categoria` | TEXT | ❌ | NULL | Agrupamento: "Fixa", "Removível", "Implantologia" |
| `cor` | TEXT | ❌ | NULL | Cor para UI (hex) |
| `ordem` | INTEGER | ✅ | auto | Ordenação na listagem |
| `activo` | BOOLEAN | ✅ | true | — |

---

### 5.26 — Tabela de Preços (`price_table`)

> Referências: F9 (Facturação — tabela configurável pelo admin)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `work_type_id` | FK → `work_types` | ✅ | — | Tipo de trabalho |
| `material_id` | FK → `materials` | ❌ | NULL | NULL = preço base (sem material específico) |
| `complexidade` | ENUM | ✅ | 'normal' | `simples` \| `normal` \| `complexo` |
| `preco` | DECIMAL(10,2) | ✅ | — | Preço base (antes de descontos clínica) |
| `iva` | DECIMAL(5,2) | ✅ | 23.00 | Percentagem de IVA |
| `notas` | TEXT | ❌ | NULL | — |
| `activo` | BOOLEAN | ✅ | true | — |

> O preço final da factura = `price_table.preco × (1 - clinics.desconto_percentagem / 100)`.

---

### 5.27 — Fila de Mensagens WA (`wa_message_queue`)

> Referências: F5 (Anti-spam — FIFO queue com throttling)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `id` | UUID | PK | auto | — |
| `wa_group_id` | FK → `wa_groups` | ❌ | NULL | Grupo destinatário (NULL se mensagem directa) |
| `telefone_destino` | TEXT | ❌ | NULL | Se mensagem directa (não grupo) |
| `conteudo` | TEXT | ✅ | — | Texto da mensagem |
| `anexos` | JSONB | ❌ | NULL | Lista de URLs de ficheiros a anexar |
| `prioridade` | ENUM | ✅ | 'normal' | `normal` \| `urgente` |
| `estado` | ENUM | ✅ | 'pendente' | `pendente` \| `enviando` \| `enviada` \| `erro` |
| `tentativas` | INTEGER | ✅ | 0 | Número de tentativas de envio |
| `erro_detalhe` | TEXT | ❌ | NULL | Detalhe do erro (se falhou) |
| `agendada_para` | TIMESTAMP | ❌ | NULL | Envio agendado (horário fora de expediente) |
| `enviada_em` | TIMESTAMP | ❌ | NULL | — |
| `criado_por` | FK → `users` | ❌ | NULL | NULL = sistema (automático) |
| `comando_origem` | TEXT | ❌ | NULL | Ex: "@entregue", "notif_material" |

> **Regras anti-spam:** intervalo mínimo entre mensagens (configurável), limite diário, horário de funcionamento, fila FIFO com prioridade urgente no topo.

---

### 5.28 — Preferências de Notificação (`user_notification_settings`)

> Referências: F8 (Configurações de notificação no perfil)

| Campo | Tipo | Obrig. | Default | Notas |
|-------|------|--------|---------|-------|
| `user_id` | FK → `users` | PK | — | 1 registo por utilizador |
| `mutar_tudo` | BOOLEAN | ✅ | false | — |
| `mutar_pedidos` | BOOLEAN | ✅ | false | — |
| `mutar_agendamentos` | BOOLEAN | ✅ | false | — |
| `mutar_notas` | BOOLEAN | ✅ | false | — |
| `mutar_material` | BOOLEAN | ✅ | false | — |
| `push_activo` | BOOLEAN | ✅ | false | Opt-in (desactivado por defeito) |
| `push_subscription` | JSONB | ❌ | NULL | Web Push subscription object |
| `email_activo` | BOOLEAN | ✅ | true | — |
| `som_activo` | BOOLEAN | ✅ | true | — |
| `som_ficheiro` | TEXT | ✅ | 'default' | Nome do som escolhido |
| `silencio_inicio` | TIME | ❌ | NULL | Ex: 22:00 |
| `silencio_fim` | TIME | ❌ | NULL | Ex: 08:00 |

---

### 5.29 — Diagrama de Relações (ER simplificado)

```
clinics
  ├─ 1:N → users (médicos, staff clínica)
  │         ├─ 1:1 → user_notification_settings
  │         └─ 1:N → notifications
  └─ 1:N → price_table → work_types + materials

patients (T-xxxx)
  ├─ 1:N → treatment_plans → work_types
  │         ├─ 1:N → phases
  │         │         ├─ 1:N → appointments
  │         │         │         ├─ 1:1 → boxes → box_items
  │         │         │         └─ N:N → transport/reception_guides → guide_items
  │         │         ├─ 1:N → considerations → consideration_attachments → files
  │         │         ├─ 1:N → invoices → invoice_items
  │         │         └─ N:N → phase_materials → materials
  │         └─ 1:N → documents → files
  ├─ 1:1 → wa_groups → wa_group_members → users
  ├─ N:N → patient_doctors → users
  └─ 1:N → files

wa_message_queue (FIFO anti-spam)
  └─ referencia → wa_groups

requests (fila de pedidos)
  └─ referencia → patients, plans, phases, appointments

system_settings (configurações globais)
message_templates (templates WA)
guide_items → guide_item_frequency (sugestões)
help_contents (ajuda integrada + vídeos QA)
weekly_report_logs (logs relatórios semanais)
audit_logs (auditoria)
```

---

### 5.30 — Tabelas Resumo (Final)

| # | Tabela | Tipo | Registos esperados |
|---|--------|------|-------------------|
| 1 | `patients` | Core | Milhares |
| 2 | `treatment_plans` | Core | Milhares |
| 3 | `phases` | Core | Milhares |
| 4 | `appointments` | Core | Milhares |
| 5 | `considerations` | Core | Dezenas de milhar |
| 6 | `files` | Core | Dezenas de milhar |
| 7 | `requests` | Core | Milhares |
| 8 | `wa_groups` | Core | Milhares |
| 9 | `users` (extensão) | Auth | Centenas |
| 10 | `clinics` | Config | Dezenas |
| 11 | `work_types` | Catálogo | Dezenas |
| 12 | `transport_guides` | Documentação | Milhares |
| 13 | `reception_guides` | Documentação | Milhares |
| 14 | `invoices` | Billing | Milhares |
| 15 | `receipts` | Billing | Milhares |
| 16 | `documents` | Documentação | Centenas |
| 17 | `notifications` | UX | Dezenas de milhar |
| 18 | `materials` | Catálogo | Centenas |
| 19 | `boxes` | Logística | Milhares |
| 20 | `message_templates` | Config | Dezenas |
| 21 | `guide_items` | Catálogo | Dezenas |
| 22 | `help_contents` | Ajuda | Dezenas |
| 23 | `weekly_report_logs` | Logs | Milhares |
| 24 | `audit_logs` | Logs | Dezenas de milhar |
| 25 | `system_settings` | Config | Dezenas |
| 26 | `price_table` | Billing | Centenas |
| 27 | `wa_message_queue` | Infra | Milhares |
| 28 | `user_notification_settings` | UX | Centenas |
| — | *Tabelas auxiliares (N:N e itens)* | Relações | — |

> Total: **28 tabelas principais + ~8 tabelas auxiliares (N:N e itens)** ≈ **36 tabelas**.

---

## Etapa 6 — Desenhar a Interface

> Define a estrutura visual, navegação e layouts do Módulo Pacientes.
> Abordagem: **Mobile-first** com breakpoints para tablet e desktop.
> Contexto: A app já existe com sidebar dark mode, primary amber (#f59e0b), background `#111827`.
> Rota base: `/dashboard/patients`

> [!IMPORTANT]
> ### 🔄 Remodelação UI — Mockup V5 (Março 2026)
> A interface da Ficha do Paciente está a ser **remodelada** com base no **Mockup V5**.
> O layout, tabs, timeline e estrutura de informação descritos nas subsecções abaixo (6.1–6.17)
> referem-se à **versão original** e estão a ser substituídos pelas decisões do Mockup V5.
>
> **Documento de referência actualizado:**
> - Análise completa do Mockup V5 (15 decisões de design)
> - Guia Mestre de Implementação (F0–F7) com fases, tarefas e verificações
>
> **Principais mudanças face ao original:**
> - 5 tabs → **4 tabs** (Ficha Clínica, Documentação, Planos Fechados, Histórico)
> - Tab Ficheiros **eliminada** (ficheiros integrados nos campos de Info Técnica)
> - Timeline vertical → **Timeline horizontal** com fases como segmentos
> - Chat inline → **Drawer lateral** minimizável (~350px)
> - Rotas separadas por plano/fase → **Vista unificada** (tudo inline)
> - Bloco fixo de **Informação Técnica** entre timeline e tabs
>
> As subsecções 6.1–6.17 abaixo mantêm-se como referência histórica.
> Para a implementação actual, consultar o Guia Mestre.

---

### 6.1 — Mapa de Navegação

```
Sidebar → Pacientes (/dashboard/patients)
  │
  ├─ 📋 Lista de Pacientes (/dashboard/patients)
  │     └─ Clicar paciente → Ficha do Paciente
  │
  ├─ 👤 Ficha do Paciente (/dashboard/patients/[id])
  │     ├─ Tab: Planos
  │     │     └─ Clicar plano → Detalhe do Plano
  │     ├─ Tab: Ficheiros
  │     ├─ Tab: Considerações (todas as fases)
  │     ├─ Tab: Documentação (facturas, recibos, docs)
  │     └─ Tab: Histórico
  │
  ├─ 📑 Detalhe do Plano (/dashboard/patients/[id]/plans/[planId])
  │     ├─ Timeline de fases
  │     │     └─ Clicar fase → Detalhe da Fase
  │     └─ Logística / Materiais
  │
  ├─ 📦 Detalhe da Fase (/dashboard/patients/[id]/plans/[planId]/phases/[phaseId])
  │     ├─ Agendamentos
  │     ├─ Considerações
  │     ├─ Caixa / Logística
  │     └─ Materiais
  │
  └─ Componentes transversais (modals/drawers):
        ├─ 🆕 Criar Paciente (modal)
        ├─ 🆕 Criar Plano (modal)
        ├─ 🆕 Criar Fase (modal)
        ├─ 🆕 Criar Agendamento (modal)
        ├─ ✍️ Nova Consideração (drawer lateral)
        ├─ 📎 Upload Ficheiros (modal)
        ├─ 🚚 Guia de Transporte (modal full + câmara)
        ├─ 📦 Guia de Recepção (modal full)
        ├─ 💰 Emitir Factura (modal)
        ├─ 🔀 Merge Pacientes (wizard modal)
        ├─ 🔍 Visualizador STL (modal full screen)
        └─ 🔔 Centro de Notificações (drawer lateral)
```

---

### 6.2 — Lista de Pacientes (página principal)

> Rota: `/dashboard/patients`

#### Layout Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👥 Pacientes                    [+ Novo Paciente]   │ │
│ │ 1.247 pacientes                 [📦 Fila Pedidos]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ FILTROS (barra horizontal)                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔍 [Pesquisa T-xxxx ou nome]  [Clínica ▼] [Médico ▼]│ │
│ │ [Urgentes ○]  [Com plano activo ○]  [Ordenar: ▼]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ TABELA DE PACIENTES                                     │
│ ┌─────┬───────────┬──────────┬──────────┬──────┬─────┐ │
│ │ T-ID│ Nome      │ Clínica  │ Médico   │Planos│ ••• │ │
│ ├─────┼───────────┼──────────┼──────────┼──────┼─────┤ │
│ │🔴T42│ João Silva│ Sorriso  │ Dr.Ferr. │ 2    │ ••• │ │
│ │  T43│ Ana Costa │ DentPlus │ Dra.Lima │ 1    │ ••• │ │
│ │🔴T44│ Pedro M.  │ Sorriso  │ Dr.Ferr. │ 3    │ ••• │ │
│ └─────┴───────────┴──────────┴──────────┴──────┴─────┘ │
│                                                         │
│ Paginação: [← Anterior]  Pág 1 de 42  [Seguinte →]     │
└─────────────────────────────────────────────────────────┘
```

#### Layout Mobile (<768px)

```
┌───────────────────────────┐
│ 👥 Pacientes     [+ Novo] │
│ 🔍 [Pesquisar...]         │
│ [Filtros ▼]               │
│                           │
│ ┌─────────────────────┐   │
│ │ 🔴 T-0042           │   │
│ │ João Silva          │   │
│ │ Sorriso · Dr.Ferr.  │   │
│ │ 2 planos activos    │   │
│ └─────────────────────┘   │
│ ┌─────────────────────┐   │
│ │    T-0043           │   │
│ │ Ana Costa           │   │
│ │ DentPlus · Dra.Lima │   │
│ │ 1 plano activo      │   │
│ └─────────────────────┘   │
│                           │
│ [Carregar mais ↓]         │
└───────────────────────────┘
```

**Componentes:**

| Componente | Descrição |
|-----------|-----------|
| Badge urgente | 🔴 Círculo vermelho ao lado do T-ID |
| Badge planos | Número com cor: 0=cinza, 1+=azul |
| Menu `•••` | Editar, Eliminar (soft), Merge, Urgente toggle |
| Pesquisa | Debounced 300ms, pesquisa em T-ID + nome + id_clinica |
| Filtros mobile | Expandem abaixo da barra de pesquisa |
| Desktop: tabela | Colunas ordenáveis por click no header |
| Mobile: cards | Card com info compacta, tap → ficha |
| Paginação desktop | Números de página |
| Paginação mobile | Infinite scroll (carregar mais) |

---

### 6.3 — Fila de Pedidos (drawer lateral)

> Abre sobre a lista de pacientes (ou qualquer página). Drawer do lado direito.
> Rota: componente overlay, sem rota própria.

```
┌─────────────────────────────────────────────┐
│                              ┌────────────┐ │
│   (conteúdo da página)       │ FILA PEDID.│ │
│                              │            │ │
│                              │ 📋 3 pend. │ │
│                              │            │ │
│                              │ ┌────────┐ │ │
│                              │ │🔴URGENT│ │ │
│                              │ │ Novo PT │ │ │
│                              │ │ Dr.Ferr │ │ │
│                              │ │ há 5min │ │ │
│                              │ └────────┘ │ │
│                              │ ┌────────┐ │ │
│                              │ │ Normal │ │ │
│                              │ │ Edit PT│ │ │
│                              │ │ há 2h  │ │ │
│                              │ └────────┘ │ │
│                              │            │ │
│                              │ [Marcar ✓] │ │
│                              └────────────┘ │
└─────────────────────────────────────────────┘
```

**Comportamento:**
- Badge no botão `📦 Fila Pedidos` mostra count de pendentes
- Cada pedido: tipo, descrição, quem criou, há quanto tempo
- Click no pedido → navega para a entidade (paciente/plano/fase)
- Swipe left (mobile) → Marcar como visto/concluído

---

### 6.4 — Ficha do Paciente (full screen)

> Rota: `/dashboard/patients/[id]`
> Abre em **full screen** (substitui a vista da lista).
> Botão ← voltar para lista.

#### Layout Desktop

```
┌───────────────────────────────────────────────────────────────┐
│ ← Voltar    👤 T-0042 João Silva    🔴 URGENTE    [••• Menu] │
│ Clínica Sorriso · Dr. Ferreira · 3 planos                    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ [Planos] [Ficheiros] [Considerações] [Documentação] [Histór.]│
│ ─────────────────────────────────────────────────────────────│
│                                                               │
│ TAB ACTIVA: PLANOS                                           │
│                                                               │
│ ┌───────────────────────────────────┐                        │
│ │ 📑 Coroa Zircónia #46            │  [+ Novo Plano]        │
│ │ Estado: 🟢 Activo                │                        │
│ │ Fases: 2/3 completas             │                        │
│ │ Início: 15/01/2026               │                        │
│ │ [Ver detalhes →]                 │                        │
│ └───────────────────────────────────┘                        │
│ ┌───────────────────────────────────┐                        │
│ │ 📑 Facetas anteriores            │                        │
│ │ Estado: 🟡 Rascunho              │                        │
│ │ Fases: 0/0                       │                        │
│ │ [Ver detalhes →]                 │                        │
│ └───────────────────────────────────┘                        │
│                                                               │
│ ┌───────────────────────────────────┐                        │
│ │ 📑 Implante #36 (CONCLUÍDO)      │                        │
│ │ Estado: ⚫ Concluído             │                        │
│ │ Período: 01/06 — 15/09/2025      │                        │
│ └───────────────────────────────────┘                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### Tabs da Ficha

| Tab | Conteúdo |
|-----|---------|
| **Planos** | Lista de planos (activos no topo, concluídos em baixo). Cards com estado, progresso, datas |
| **Ficheiros** | Galeria: STL (com ícone 3D), fotos (thumbnails), documentos. Filtros por fase. Upload drag&drop |
| **Considerações** | Timeline de todas as considerações (todas as fases). Filtro por fase. Lado lab vs clínica |
| **Documentação** | Facturas + Recibos (visível para todos). Outros Documentos (só lab). Botão emitir factura |
| **Histórico** | Audit log filtrado para este paciente. Merge history. Criação, edições |

#### Layout Mobile

```
┌───────────────────────────┐
│ ← T-0042 João S.  🔴 [•••]│
│ Sorriso · Dr. Ferreira    │
├───────────────────────────┤
│ [Planos▼] scroll horizontal│
│ de tabs                    │
├───────────────────────────┤
│                           │
│ ┌─────────────────────┐   │
│ │ 📑 Coroa Zirc. #46  │   │
│ │ 🟢 Activo · 2/3     │   │
│ │ [Ver →]             │   │
│ └─────────────────────┘   │
│                           │
└───────────────────────────┘
```

> No mobile, tabs viram scroll horizontal (swipeable).

---

### 6.5 — Detalhe do Plano de Tratamento

> Rota: `/dashboard/patients/[id]/plans/[planId]`

#### Layout Desktop

```
┌──────────────────────────────────────────────────────────────┐
│ ← T-0042 João Silva  ·  📑 Coroa Zircónia #46              │
│ 🟢 Activo  ·  Início: 15/01  ·  Dr. Ferreira               │
│                                                [Acções ▼]   │
├─────────────────────────────────┬────────────────────────────┤
│                                 │                            │
│ TIMELINE DE FASES (esquerda)    │ DETALHE DA FASE (direita)  │
│                                 │                            │
│ ┌───────┐                      │ 📦 Fase 2: Prova Estrutura │
│ │ F1 ✅ │ Moldagem             │ Estado: 🟡 Em curso        │
│ │ ──── │                      │                            │
│ │ F2 🟡│ Prova Estrutura ← ● │ Agendamentos:              │
│ │ ──── │                      │ ┌──────────────────────┐   │
│ │ F3 ⬜│ Colocação            │ │ 📅 Para Prova        │   │
│ └───────┘                      │ │ 25/02 · 🟢 Entregue │   │
│                                 │ │ [Recolher] [Detalhes]│   │
│ [+ Nova Fase]                  │ └──────────────────────┘   │
│                                 │                            │
│                                 │ Considerações: (3)         │
│                                 │ ┌──────────────────────┐   │
│                                 │ │ 🔵 Lab: "Verificar   │   │
│                                 │ │ oclusão vestibular"  │   │
│                                 │ │ há 2h · 📎 1 anexo   │   │
│                                 │ └──────────────────────┘   │
│                                 │                            │
│                                 │ [+ Consideração]           │
│                                 │                            │
│                                 │ Materiais:                 │
│                                 │ · Zircónia Katana UTML     │
│                                 │ · Dentes: 46               │
│                                 │                            │
├─────────────────────────────────┴────────────────────────────┤
│ Acções rápidas:                                              │
│ [🚚 Guia Transporte] [📦 Guia Recepção] [💰 Factura] [📋 Rel]│
└──────────────────────────────────────────────────────────────┘
```

**Estrutura:**
- **Esquerda (30%):** Timeline vertical de fases com ícones de estado
- **Direita (70%):** Detalhe da fase seleccionada
- **Barra inferior:** Acções rápidas contextuais

#### Layout Mobile

```
┌───────────────────────────┐
│ ← Coroa Zirc. #46  [•••] │
│ 🟢 Activo · Dr. Ferreira  │
├───────────────────────────┤
│ Fases: (scroll horizontal)│
│ [✅ F1] [🟡 F2 ●] [⬜ F3] │
├───────────────────────────┤
│                           │
│ 📦 Fase 2: Prova Estrutura│
│ 🟡 Em curso               │
│                           │
│ ┌─────────────────────┐   │
│ │ 📅 Para Prova       │   │
│ │ 25/02 · 🟢 Entregue │   │
│ └─────────────────────┘   │
│                           │
│ Considerações (3) [+ Nova]│
│ (...)                     │
│                           │
│ ┌─────────────────────┐   │
│ │ 🚚 │ 📦 │ 💰 │ 📋  │   │
│ │Guia│Rec.│Fact│Relat│   │
│ └─────────────────────┘   │
└───────────────────────────┘
```

> No mobile: fases viram chips horizontais scroll, detalhe em accordion vertical.
> Barra de acções rápidas = FAB (floating action bar) no fundo.

---

### 6.6 — Considerações (componente reutilizável)

> Usado na ficha do paciente (tab), no detalhe da fase e como drawer lateral.

```
CONSIDERAÇÃO (card individual)
┌──────────────────────────────────────────────┐
│ 🔵 Lab · João (Staff Lab) · há 2h     [•••] │
│                                              │
│ "Verificar oclusão vestibular. A estrutura   │
│  está com 0.3mm de sobre-contorno."          │
│                                              │
│ 📎 scan_check.stl  📷 oclusal.jpg            │
│                                              │
│ v2 · Editado há 1h                           │
│ [📤 Enviar WA]                               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🟠 Clínica · Dra. Lima · há 1d        [•••] │
│                                              │
│ "Paciente queixa-se de sensibilidade na zona │
│  do provisório. Ajustar oclusão."            │
│                                              │
│ (sem anexos)                                 │
└──────────────────────────────────────────────┘
```

**Regras visuais:**
- 🔵 Fundo azul claro → Lab
- 🟠 Fundo laranja claro → Clínica
- Lado lab à esquerda, lado clínica à direita (como chat) — **desktop only**
- Mobile: todas empilhadas, com badge de lado
- Menu `•••`: Editar (só próprias, janela 1h), Enviar WA, Agendar envio, Ver versões

---

### 6.7 — Visualizador STL (modal full screen)

> Abre ao clicar ficheiro `.stl` em qualquer parte da app.

```
┌───────────────────────────────────────────────────────┐
│ ✕ Fechar    scan_superior.stl    v2    [⬇ Download]  │
├───────────────────────────────────────────────────────┤
│                                                       │
│                                                       │
│                 ┌───────────────────┐                 │
│                 │                   │                 │
│                 │   [Modelo 3D]     │                 │
│                 │   Rotação: drag   │                 │
│                 │   Zoom: scroll    │                 │
│                 │   Pan: shift+drag │                 │
│                 │                   │                 │
│                 └───────────────────┘                 │
│                                                       │
├───────────────────────────────────────────────────────┤
│ Controlos:                                            │
│ [🔄 Reset] [📐 Wireframe] [🎨 Cor] [📏 Medições]    │
│ [💡 Luz] [📸 Screenshot]                              │
└───────────────────────────────────────────────────────┘
```

**Tecnologia:** Three.js (ou react-three-fiber)
**Funcionalidades:**
- Rotação, zoom, pan com touch/mouse
- Wireframe toggle
- Alteração de cor do modelo
- Ferramenta de medição (distância entre 2 pontos)
- Controlo de iluminação
- Screenshot (exporta PNG)
- Funciona em mobile com gestos touch

---

### 6.8 — Guia de Transporte (modal com câmara)

> Modal large que abre ao clicar `🚚 Guia Transporte`.

```
┌─────────────────────────────────────────────────────────────┐
│ ✕  🚚 Nova Guia de Transporte — GT-0087                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Paciente: T-0042 João Silva (auto)                          │
│ Clínica:  Sorriso (auto)                                    │
│ Fase:     Prova Estrutura (auto)                            │
│ Agend.:   Para Prova — 25/02 (auto)                         │
│                                                             │
│ ──── Itens a enviar ────                                    │
│ ☑️ Prova de estrutura           (95% — pré-seleccionado)    │
│ ☑️ Modelo antagonista           (87% — pré-seleccionado)    │
│ ☐  Registo de mordida           (45% — sugerido)            │
│ [+ Adicionar item manual]                                   │
│                                                             │
│ ──── Fotos do envio ────                                    │
│ ┌─────────────────────────────┐                             │
│ │  📸 Abrir Câmara            │  ou  📁 Anexar ficheiros    │
│ └─────────────────────────────┘                             │
│                                                             │
│ [min1] [min2] [min3] — 3 fotos tiradas                      │
│                                                             │
│ Notas: [________________________]                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [💾 Guardar] [📤 Guardar + Enviar WA] [🖨️ Imprimir]  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Interface de câmara (quando aberta):**

```
┌─────────────────────────────────┐
│    ┌───────────────────────┐    │
│    │                       │    │
│    │   [Preview câmara]    │    │
│    │                       │    │
│    └───────────────────────┘    │
│                                 │
│  Fotos: [min1] [min2] [+]     │
│                                 │
│  [📸 Tirar Foto]  [✅ Pronto]  │
│                                 │
│  Câmara: [Webcam ▼]            │
│  ☑ Lembrar câmara              │
└─────────────────────────────────┘
```

> No mobile, a câmara usa a nativa do dispositivo via MediaStream API.

---

### 6.9 — Guia de Recepção (similar à guia de transporte)

> Mesma estrutura visual que a guia de transporte, com campos adicionais:

- Cenário: `Pós @recolhido` (auto) ou `Entrega directa` (manual)
- Estado do material: `OK` | `Danificado` | `Incompleto`
- Se cenário `Entrega directa`: campo pesquisa paciente com auto-complete
- Checklist de itens recebidos (pré-preenchido pelo mesmo sistema de frequência)
- Fotos do que chegou (câmara/anexo)
- Acções: `Guardar`, `Guardar + Enviar WA`, `Imprimir`

---

### 6.10 — Emitir Factura (modal)

> Modal com formulário de facturação. Rota: modal sem URL.

```
┌──────────────────────────────────────────────────────┐
│ ✕  💰 Emitir Factura — Fase: Prova Estrutura        │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Clínica: Sorriso (NIF: 501234567)       (auto)      │
│ Paciente: T-0042 João Silva             (auto)      │
│ Desconto clínica: 10%                   (auto)      │
│                                                      │
│ ──── Linhas da factura ────                          │
│ ┌────────────────────┬────┬────────┬────────┬──────┐│
│ │ Descrição          │Qtd │Preço un│ IVA    │Total ││
│ ├────────────────────┼────┼────────┼────────┼──────┤│
│ │ Coroa Zircónia     │ 1  │ 180,00 │ 23%    │221,40││
│ │  (auto: price_table)                              │
│ └────────────────────┴────┴────────┴────────┴──────┘│
│ [+ Adicionar linha]                                  │
│                                                      │
│ Subtotal: 180,00 €     Desconto: -18,00 €           │
│ IVA (23%): 37,26 €     Total: 199,26 €              │
│                                                      │
│ ☐ Sincronizar com TOConline                          │
│                                                      │
│ [💾 Guardar rascunho]  [📄 Emitir factura]           │
└──────────────────────────────────────────────────────┘
```

**Linha de factura auto-preenchida** a partir de: `price_table` (tipo trabalho × material × complexidade) × desconto clínica.
**Editável:** O utilizador pode alterar todos os valores antes de emitir.

---

### 6.11 — Merge de Pacientes (wizard modal)

> Wizard de 3 passos. Modal full screen.

```
Passo 1/3: Seleccionar duplicado
┌────────────────────────────────────────────────────────┐
│ 🔀 Merge de Pacientes — Passo 1 de 3                  │
│                                                        │
│ Paciente actual: T-0042 João Silva                     │
│                                                        │
│ Paciente duplicado:                                    │
│ 🔍 [Pesquisar paciente...]                             │
│                                                        │
│ Resultado: T-0087 Joao Silva (Sorriso, Dr. Ferreira)   │
│ ⚠️ Possível duplicado detectado (nome similar)         │
│                                                        │
│ [Cancelar]                          [Seguinte →]       │
└────────────────────────────────────────────────────────┘

Passo 2/3: Preview do merge
┌────────────────────────────────────────────────────────┐
│ 🔀 Merge — Passo 2 de 3: Preview                      │
│                                                        │
│ SURVIVOR (fica): T-0042 João Silva                     │
│ MERGEADO (desaparece): T-0087 Joao Silva               │
│                                                        │
│ O que vai ser transferido:                             │
│ ├─ 2 planos de tratamento                              │
│ ├─ 5 ficheiros                                         │
│ ├─ 1 grupo WhatsApp (será fundido)                     │
│ └─ 3 considerações                                     │
│                                                        │
│ ⚠️ ATENÇÃO: Esta acção não pode ser desfeita.          │
│                                                        │
│ [← Voltar]                          [Seguinte →]       │
└────────────────────────────────────────────────────────┘

Passo 3/3: Confirmação
┌────────────────────────────────────────────────────────┐
│ 🔴 CONFIRMAÇÃO OBRIGATÓRIA                            │
│                                                        │
│ Escreva "MERGE T-0087" para confirmar:                 │
│ [__________________]                                   │
│                                                        │
│ [← Voltar]                     [🔀 Confirmar Merge]   │
└────────────────────────────────────────────────────────┘
```

---

### 6.12 — Centro de Notificações (drawer)

> Drawer lateral direito. Acessível via ícone 🔔 no header da app.

```
┌─────────────────────────────────┐
│ 🔔 Notificações (5 novas)      │
│ [Marcar todas lidas] [⚙ Config]│
├─────────────────────────────────┤
│                                 │
│ HOJE                            │
│ ┌─────────────────────────┐    │
│ │ 🟢 Novo pedido          │    │
│ │ Dr. Ferreira criou plano│    │
│ │ T-0042 · há 5min        │    │
│ └─────────────────────────┘    │
│ ┌─────────────────────────┐    │
│ │ 🟡 Material em falta    │    │
│ │ Zircónia Katana UTML    │    │
│ │ Stock baixo · há 2h     │    │
│ └─────────────────────────┘    │
│                                 │
│ ONTEM                           │
│ ┌─────────────────────────┐    │
│ │ ⚫ Fase concluída       │    │
│ │ T-0038 · Moldagem ✅    │    │
│ │ ontem às 16:30          │    │
│ └─────────────────────────┘    │
│                                 │
│ [Ver todas →]                   │
└─────────────────────────────────┘
```

**Notificação:**
- Click → navega para a entidade
- Não lida: fundo ligeiramente highlight
- Lida: fundo normal
- Config: abre `user_notification_settings`

---

### 6.13 — Fechar Fase Sem Factura (fluxo de aviso)

> Sequência de 2 modals restritivos para evitar erros.

```
MODAL 1 — Aviso
┌──────────────────────────────────────┐
│ ⚠️ ATENÇÃO                          │
│                                      │
│ Esta fase não tem factura associada. │
│ Tem a certeza que quer fechar        │
│ sem facturar?                        │
│                                      │
│       [Cancelar]  [Continuar →]      │
└──────────────────────────────────────┘

MODAL 2 — Confirmação com texto
┌──────────────────────────────────────┐
│ 🔴 CONFIRMAÇÃO OBRIGATÓRIA          │
│                                      │
│ Escreva "SEM FACTURA" para confirmar:│
│ [__________________________]         │
│                                      │
│      [Cancelar]  [Confirmar]         │
└──────────────────────────────────────┘
```

> Registado no `audit_logs`: quem, quando, sem factura.
> Badge permanente na fase: `⚠️ Sem factura`.

---

### 6.14 — Componentes Reutilizáveis (Design System)

| Componente | Uso | Variantes |
|-----------|-----|-----------|
| `PatientCard` | Lista pacientes, pesquisa | Compacto (lista), Expandido (ficha) |
| `PlanCard` | Ficha paciente — tab planos | Com progresso, sem progresso |
| `PhaseChip` | Timeline de fases | ✅ Completa, 🟡 Em curso, ⬜ Pendente, ❌ Cancelada |
| `ConsiderationBubble` | Considerações | Lab (azul), Clínica (laranja) |
| `FilePreview` | Galeria ficheiros | STL (ícone 3D), Foto (thumbnail), Doc (ícone) |
| `GuideModal` | Guias transporte/recepção | Com câmara, sem câmara |
| `InvoiceForm` | Facturação | Rascunho, Emissão |
| `ConfirmDialog` | Acções destrutivas | Simples (2 botões), Com campo texto |
| `Badge` | Estados, contadores | Urgente(🔴), Activo(🟢), Rascunho(🟡), Concluído(⚫) |
| `NotificationItem` | Centro notificações | Lida, Não lida, Urgente |
| `EmptyState` | Listas vazias | Com ícone + CTA |
| `SearchBar` | Pesquisa global e local | Com filtros, sem filtros |
| `CameraCapture` | Câmara nas guias | Mobile (nativa), Desktop (MediaStream) |
| `STLViewer` | Visualizador 3D | Modal full screen |
| `AuditTimeline` | Histórico | Timeline vertical com ícones |

---

### 6.15 — Breakpoints e Responsividade

| Breakpoint | Dispositivo | Comportamento sidebar | Comportamento conteúdo |
|-----------|-------------|----------------------|----------------------|
| `< 640px` | Smartphone | Drawer overlay (hamburger) | Cards empilhados, tabs scroll horizontal, FAB inferior |
| `640—1023px` | Tablet | Drawer overlay | Tabela compacta, 2 colunas onde possível |
| `≥ 1024px` | Desktop | Sidebar fixa colapsável (64px / 256px) | Layout split (ex: timeline + detalhe), tabela completa |
| `≥ 1440px` | Desktop large | Sidebar fixa expandida | Mais colunas, mais espaço entre blocos |

**Regras globais:**
- Tabelas → Cards no mobile
- Modals → Full screen no mobile
- Paginação → Infinite scroll no mobile
- Tabs → Scroll horizontal no mobile
- Split layout (30/70) → Stack vertical no mobile
- FAB (floating action bar) no mobile para acções rápidas

---

### 6.16 — Acessibilidade (A11y)

| Requisito | Implementação |
|----------|--------------|
| Contraste | WCAG AA mínimo (4.5:1 para texto, 3:1 para UI) |
| Navegação teclado | Tab order lógico, focus visible, Escape fecha modals |
| Screen reader | `aria-label` em botões ícone, `role` em elementos custom |
| Touch targets | Mínimo 44×44px em mobile (WCAG 2.5.5) |
| Reduzir movimento | `prefers-reduced-motion` → desactiva animações |
| Labels de formulário | Todos os inputs com `<label>` associado |
| Feedback de acções | Toast notifications para confirmação de acções |

---

### 6.17 — Estados Visuais dos Planos e Fases

```
PLANOS:
  🟡 Rascunho    → border amarelo tracejado, texto cinza
  🟢 Activo      → border verde, texto normal
  ⏸️ Pausado     → border cinza, ícone pausa, texto dimmed
  ⚫ Concluído   → border cinza sólido, fundo subtil, badge ✅
  ❌ Cancelado   → border vermelho tracejado, texto strikethrough
  🔄 Reaberto    → border azul, badge "Correcção" ou "Remake"

FASES:
  ⬜ Pendente    → chip com fundo cinza escuro
  🟡 Em curso    → chip com fundo amber/primary, pulse animation
  ✅ Concluída   → chip com fundo verde, check mark
  ❌ Cancelada   → chip com fundo vermelho dimmed

AGENDAMENTOS:
  📅 Agendado        → ícone calendário, text normal
  🟢 Prova entregue  → badge verde "Entregue"
  🟢 Colocação entr. → badge verde "Colocação"
  📦 Recolhido       → badge azul "Recolhido"
  ✅ Concluído       → badge cinza "Concluído"
  🔄 Remarcado       → badge laranja "Remarcado" + nova data
  ❌ Cancelado       → badge vermelho "Cancelado"
```

> Todos os estados usam cores consistentes em toda a app para reconhecimento imediato.


## Etapa 7 — Priorizar e Fasear

> Define a ordem de implementação, o MVP (Minimum Viable Product) e as fases seguintes.
> Critérios de priorização: **dependências técnicas** → **valor de negócio** → **complexidade**.
> Estimativas: em semanas-dev (1 dev full-stack, ritmo sustentável).

---

### 7.1 — Roadmap Visual

```
              MVP                    Comunicação           Billing            Premium
           (Fase 1)                   (Fase 2)            (Fase 3)           (Fase 4)
        ┌───────────┐            ┌───────────┐        ┌───────────┐      ┌───────────┐
        │ Pacientes │            │ WhatsApp  │        │ Facturas  │      │ STL 3D    │
        │ Planos    │ ────────>  │ Grupos WA │  ───>  │ TOConline │ ──>  │ Merge     │
        │ Fases     │            │ Templates │        │ Recibos   │      │ Câmara HD │
        │ Ficheiros │            │ Notific.  │        │ Relatórios│      │ ML Sugest.│
        │ Consider. │            │ Anti-spam │        │ Audit Log │      │ Offline   │
        └───────────┘            └───────────┘        └───────────┘      └───────────┘
         ~6 semanas               ~4 semanas           ~4 semanas        ~4 semanas

                    ────────────── Total estimado: ~18 semanas ──────────────
```

---

### 7.2 — Fase 1: MVP (Core)

> **Objectivo:** Gerir pacientes, planos e fases com ficheiros e considerações.
> **Duração estimada:** ~6 semanas
> **Resultado:** O laboratório pode registar e acompanhar pacientes sem papel.

#### Funcionalidades MVP

| # | Feature | Tabelas | UI (Etapa 6) | Prioridade |
|---|---------|---------|-------------|-----------|
| 1 | CRUD Pacientes | `patients` | 6.2 Lista + 6.4 Ficha | 🔴 Crítica |
| 2 | CRUD Planos de Tratamento | `treatment_plans` | 6.4 Tab Planos + 6.5 Detalhe | 🔴 Crítica |
| 3 | Lifecycle dos Planos | `treatment_plans` (estados) | 6.17 Estados Visuais | 🔴 Crítica |
| 4 | CRUD Fases | `phases`, `phase_materials` | 6.5 Timeline | 🔴 Crítica |
| 5 | Agendamentos básicos | `appointments` | 6.5 Detalhe Fase | 🔴 Crítica |
| 6 | Upload de ficheiros | `files` | 6.4 Tab Ficheiros | 🟡 Alta |
| 7 | Considerações (texto + anexo) | `considerations`, `consideration_attachments` | 6.6 Componente | 🟡 Alta |
| 8 | Pesquisa e filtros | — | 6.2 Barra pesquisa | 🟡 Alta |
| 9 | Soft delete pacientes | `patients` (deleted_at) | 6.2 Menu ••• | 🟢 Média |
| 10 | Urgência toggle | `patients` (urgente) | 6.2 Badge 🔴 | 🟢 Média |

#### Tabelas necessárias (Fase 1)

```
patients
treatment_plans
phases
phase_materials
appointments
considerations
consideration_attachments
files
users (extensão — já existe base do Supabase Auth)
clinics (seed com dados iniciais)
work_types (seed com catálogo básico)
system_settings (seed com defaults)
```

> **Total: 12 tabelas** (+ seeds de configuração)

#### Critérios de Aceitação MVP

- [ ] Criar paciente com T-ID sequencial automático
- [ ] Criar plano de tratamento com estados (Rascunho → Activo → Concluído)
- [ ] Criar fases dentro de um plano (+ reordenar)
- [ ] Criar agendamentos dentro de uma fase
- [ ] Adicionar considerações (texto + 1 anexo mínimo)
- [ ] Upload de ficheiros (imagem, PDF, STL — sem viewer 3D)
- [ ] Pesquisar por T-ID e nome (debounced)
- [ ] Filtrar por clínica e médico
- [ ] Layout responsivo (desktop + mobile)
- [ ] Permissões básicas por role (admin, staff, doctor)

---

### 7.3 — Fase 2: Comunicação

> **Objectivo:** Automações WhatsApp, notificações e templates.
> **Duração estimada:** ~4 semanas
> **Dependência:** Fase 1 completa + conta Z-API activa.

#### Funcionalidades

| # | Feature | Tabelas | UI (Etapa 6) | Prioridade |
|---|---------|---------|-------------|-----------|
| 1 | Criação automática grupo WA | `wa_groups` | — (automático) | 🔴 Crítica |
| 2 | Comandos @ no WhatsApp | `wa_groups` (mensagem pinned) | — (WA nativo) | 🔴 Crítica |
| 3 | Templates de mensagem | `message_templates` | Definições (admin) | 🟡 Alta |
| 4 | Fila anti-spam FIFO | `wa_message_queue` | — (background) | 🟡 Alta |
| 5 | Notificações in-app | `notifications` | 6.12 Centro Notificações | 🟡 Alta |
| 6 | Configuração notificações | `user_notification_settings` | Definições (user) | 🟢 Média |
| 7 | Enviar consideração via WA | — | 6.6 Botão "Enviar WA" | 🟢 Média |
| 8 | Descrição grupo WA auto | `wa_groups` | — (automático) | 🟢 Média |

#### Tabelas adicionais (Fase 2)

```
wa_groups
wa_message_queue
message_templates
notifications
user_notification_settings
```

> **Total incremental: +5 tabelas** (acumulado: 17)

#### Critérios de Aceitação

- [ ] Grupo WA criado automaticamente ao criar paciente (via Z-API)
- [ ] Comandos @moldagem, @provaEstrutura, etc. reconhecidos
- [ ] Mensagens enviadas via fila anti-spam (intervalo mínimo, limite diário)
- [ ] Notificações in-app para novos pedidos, fases concluídas, material em falta
- [ ] Admin pode editar templates de mensagem
- [ ] User pode configurar mute, do-not-disturb hours

---

### 7.4 — Fase 3: Billing & Documentação

> **Objectivo:** Facturação, guias de transporte/recepção, relatórios.
> **Duração estimada:** ~4 semanas
> **Dependência:** Fase 1 completa + conta TOConline (opcional).

#### Funcionalidades

| # | Feature | Tabelas | UI (Etapa 6) | Prioridade |
|---|---------|---------|-------------|-----------|
| 1 | Guia de Transporte | `transport_guides`, `transport_guide_items` | 6.8 Modal câmara | 🔴 Crítica |
| 2 | Guia de Recepção | `reception_guides`, `reception_guide_items` | 6.9 Modal | 🔴 Crítica |
| 3 | Catálogo itens guia | `guide_items` | Admin (definições) | 🟡 Alta |
| 4 | Emitir Factura | `invoices`, `invoice_lines` | 6.10 Modal | 🟡 Alta |
| 5 | Tabela de Preços | `price_table` | Admin (definições) | 🟡 Alta |
| 6 | Sincronização TOConline | `invoices` (toconline_id) | 6.10 Checkbox | 🟢 Média |
| 7 | Recibos | `receipts` | 6.4 Tab Documentação | 🟢 Média |
| 8 | Outros Documentos | `documents` | 6.4 Tab Documentação | 🟢 Média |
| 9 | Relatório Semanal auto | `weekly_report_logs` | — (email/WA) | 🟢 Média |
| 10 | Aviso fechar sem factura | `audit_logs` | 6.13 Modals restritivos | 🟡 Alta |
| 11 | Audit Log | `audit_logs` | 6.4 Tab Histórico | 🟢 Média |

#### Tabelas adicionais (Fase 3)

```
transport_guides
transport_guide_items
reception_guides
reception_guide_items
guide_items
invoices
invoice_lines
price_table
receipts
documents
weekly_report_logs
audit_logs
```

> **Total incremental: +12 tabelas** (acumulado: 29)

#### Critérios de Aceitação

- [ ] Criar guia de transporte com itens pré-seleccionados + fotos
- [ ] Criar guia de recepção com estado do material
- [ ] Emitir factura com linhas auto-preenchidas (price_table × desconto)
- [ ] Sincronizar factura com TOConline (se activo)
- [ ] Aviso obrigatório ao fechar fase sem factura (2 modals)
- [ ] Audit log regista todas as acções críticas
- [ ] Relatório semanal enviado automaticamente (WA ou email)

---

### 7.5 — Fase 4: Premium & Advanced

> **Objectivo:** Features avançadas de alto valor mas não essenciais para operação.
> **Duração estimada:** ~4 semanas
> **Dependência:** Fase 1 + Fase 3 (guias com câmara).

#### Funcionalidades

| # | Feature | Tabelas | UI (Etapa 6) | Prioridade |
|---|---------|---------|-------------|-----------|
| 1 | Visualizador STL 3D | — | 6.7 Modal Three.js | 🟡 Alta |
| 2 | Merge de pacientes | `patients` (merge fields) | 6.11 Wizard 3 passos | 🟡 Alta |
| 3 | Câmara desktop HD | — | 6.8 Interface câmara | 🟢 Média |
| 4 | Sugestão ML para itens guia | `guide_items` (frequências) | 6.8 Checklist auto | 🟢 Média |
| 5 | Fila de pedidos | `requests` | 6.3 Drawer | 🟢 Média |
| 6 | Materiais e caixas | `materials`, `boxes`, `box_items` | Detalhe fase | 🟢 Média |
| 7 | Ajuda integrada | `help_contents` | Tooltip/drawer contextual | 🔵 Nice-to-have |
| 8 | Email como canal alternativo | — (canal_comunicacao) | Definições | 🔵 Nice-to-have |
| 9 | Exportação NAS periódica | — (cron job) | — (background) | 🔵 Nice-to-have |
| 10 | PWA offline (Service Worker) | — | — (cache strategy) | 🔵 Nice-to-have |

#### Tabelas adicionais (Fase 4)

```
requests
materials
boxes
box_items
help_contents
```

> **Total incremental: +5 tabelas** (acumulado: 34 + ~2 auxiliares = ~36)

#### Critérios de Aceitação

- [ ] Visualizador STL com rotação, zoom, wireframe, medições
- [ ] Merge de pacientes com preview + confirmação textual
- [ ] Câmara desktop com selecção de dispositivo e "lembrar câmara"
- [ ] Itens da guia sugeridos automaticamente (frequência > threshold)
- [ ] Fila de pedidos com badge e navegação
- [ ] PWA instável e funcional offline (cache de ficha do paciente)

---

### 7.6 — Resumo por Fase

| Fase | Foco | Tabelas | Estimativa | Dependências |
|------|------|---------|-----------|-------------|
| **1 — MVP** | Pacientes, planos, fases, ficheiros, considerações | 12 | ~6 sem | Supabase Auth (já existe) |
| **2 — Comunicação** | WhatsApp, notificações, templates, anti-spam | +5 = 17 | ~4 sem | Fase 1 + Z-API |
| **3 — Billing** | Guias, facturas, TOConline, relatórios, audit | +12 = 29 | ~4 sem | Fase 1 + TOConline (opcional) |
| **4 — Premium** | STL viewer, merge, câmara, ML, offline | +5 = 34 | ~4 sem | Fase 1 + Fase 3 |
| **TOTAL** | | ~36 tabelas | **~18 sem** | |

> Fases 2 e 3 podem ser desenvolvidas em **paralelo** se houver 2 devs.
> Cada fase termina com uma release estável e testada.

---

### 7.7 — Critérios de Qualidade (todas as fases)

| Critério | Requisito |
|---------|----------|
| **Testes** | Cada feature com testes funcionais manuais no browser (pré-commit) |
| **Responsividade** | Testar em 3 breakpoints antes de merge |
| **Permissões** | Verificar cada ecrã com role admin, staff e doctor |
| **Performance** | Lista de pacientes < 1s com 1000+ registos |
| **Segurança** | RLS habilitado em todas as tabelas Supabase |
| **Zero data loss** | Soft deletes em pacientes e planos |
| **Commits** | Semantic versioning: V1.x.0 (features), V1.x.y (fixes) |
| **Documentação** | Cada feature documentada antes de implementar |

---

### 7.8 — Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|----------|
| Z-API instável ou com breaking changes | Fase 2 bloqueada | Implementar fallback para envio manual + abstracção do provider |
| TOConline sem API funcional | Facturação manual | Facturação local funciona sem TOConline (sync é opcional) |
| Three.js pesado para mobile | STL viewer lento | Lazy loading, LOD (Level of Detail), optimização de mesh |
| Volume de dados > 10k pacientes | Performance de pesquisa | Índices Supabase + pesquisa server-side com debounce |
| Câmara não disponível (desktop sem webcam) | Guias sem foto | Fallback para upload de ficheiro |
| Service Worker complexo | Offline incompleto | Priorizar cache read-only (consulta), não cache write |

---

> **Próximo passo após a documentação:** Iniciar implementação da **Fase 1 (MVP)** — começar pela migração Supabase das 12 tabelas core.

---

### 7.9 — Arquitectura de Storage (NAS + Cloudflare Tunnel)

> **Decisão arquitectural permanente:** Todos os ficheiros pesados são guardados na NAS local do laboratório, não no Supabase Storage.

#### Infraestrutura

| Componente | Detalhe |
|------------|--------|
| **NAS** | Servidor local do laboratório |
| **Internet** | 100 Mbps upload / 900 Mbps download (escalável) |
| **UPS** | Alimentação ininterrupta — protege contra cortes de energia |
| **4G Failover** | Cartão de dados móveis — apenas para situações extremas |
| **Cloudflare Tunnel** | `cloudflared` na NAS — túnel seguro sem abrir portas |
| **Servidor ficheiros** | Nginx ou MinIO (S3-compatível) na NAS |

#### Fluxo

```
Upload:  App → Cloudflare Tunnel → NAS (guarda ficheiro)
                                  → Supabase (guarda path + metadata)

Fetch:   App → Cloudflare Edge → Tunnel → NAS (serve ficheiro)
         (zero custos de egress/storage cloud)
```

#### O que fica onde

| No Supabase (cloud) | Na NAS (local) |
|---------------------|---------------|
| Tabelas, metadata, paths | Fotos, vídeos, STLs, PDFs |
| Auth, RLS, sequências | Thumbnails gerados |
| Configurações, templates | Reports HTML |

#### Estratégia de Backup e Segurança (5 Camadas)

```
Camada 1: RAID na NAS           → protege contra falha de disco
Camada 2: Backup airgap auto    → protege contra ransomware
Camada 3: Versioning no disco   → protege contra malware adormecido
Camada 4: UPS                   → protege contra cortes de energia
Camada 5: 4G failover           → protege contra falha de internet
```

##### Automated Airgap (backup para disco externo)

| Estado | Internet | Porta USB | Disco Externo |
|--------|----------|-----------|---------------|
| **Normal** | ON | OFF (desactivada) | Isolado, invisível |
| **Backup** | OFF | ON (activada) | Acessível, a copiar |
| **Pós-backup** | OFF → ON | ON → OFF | Isolado novamente |

- **Frequência**: diária ou semanal, durante a noite
- **Tipo**: incremental (copia apenas alterações)
- **Versioning**: disco guarda múltiplas versões — mesmo que o último backup esteja comprometido, versões anteriores sobrevivem
- **Automatização**: NAS detecta internet → desactiva porta USB. Sem internet → activa porta → backup → desactiva → liga internet

> **Custo total mensal: ~€15** (cartão 4G). Hardware é investimento one-time.

---

### 7.10 — Future Features: Configuração de Infra

> Tarefas de configuração a realizar com assistência quando o hardware estiver disponível.

- [ ] Instalar e configurar `cloudflared` na NAS (Cloudflare Tunnel)
- [ ] Configurar Nginx ou MinIO na NAS como servidor de ficheiros
- [ ] Configurar RAID (espelhamento de 2 discos)
- [ ] Configurar automated airgap (script para desactivar/activar porta USB + internet)
- [ ] Configurar backup incremental com versioning (Hyper Backup ou rsync)
- [ ] Configurar UPS e notificações de falha de energia
- [ ] Configurar 4G failover automático
- [ ] Configurar health check (notificação se tunnel cair)
- [ ] Migrar ficheiros existentes do Supabase Storage para NAS
- [ ] Testar fluxo completo: upload → fetch → backup → restore