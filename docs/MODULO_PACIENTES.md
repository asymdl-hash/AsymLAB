# 🦷 Módulo Pacientes — AsymLAB

> **Documento colaborativo de design.**  
> Construído iterativamente — cada secção é discutida e validada antes de implementar.  
> Última actualização: 24/02/2026

---

## Progresso

| Etapa | Tema | Estado |
|-------|------|--------|
| 1 | Definir o Problema | ✅ Concluída |
| 2 | Identificar os Actores | ✅ Concluída |
| 3 | Definir as Entidades | ✅ Concluída (23 secções) |
| 4 | Mapear os Fluxos | 🟡 Em discussão |
| 5 | Definir a Informação | ⬜ Por definir |
| 6 | Desenhar a Interface | ⬜ Por definir |
| 7 | Priorizar e Fasear | ⬜ Por definir |

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

### 4.14 — F10: Acesso NAS / Ficheiros ✅

> **Complexidade:** 🟡 Média — envolve NAS, Cloudflare Tunnel, upload/download.
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

#### 📌 Backup de Metadata

> Regra global (já definida na Etapa 3.10): export periódico dos metadados da BD para a NAS.

| Item | Formato | Frequência |
|------|---------|------------|
| **Metadata de ficheiros** | JSON + CSV | Diário |
| **Lista de pacientes** | JSON + CSV | Diário |
| **Planos e fases** | JSON + CSV | Diário |
| **Considerações** | JSON | Diário |
| **Histórico de edições** | JSON | Semanal |

> Garante portabilidade: se migrar do Supabase, toda a informação está na NAS.

---

### 4.15 — F8: Avisos e Notificações ✅

> **Complexidade:** 🟡 Média — envolve múltiplos canais e tipos de notificação.
> **Canais:** App (badges + toasts + push) + WhatsApp (F5) + Email.

#### 📌 Tipos de Notificação na App

| Tipo | O que é | Quando usar | Exemplo |
|------|---------|-------------|---------|
| **Badge** 🔴 | Bolinha com número num ícone/menu | Indicar itens pendentes | "Pedidos (7)" no menu |
| **Toast** 📢 | Pop-up pequeno no canto do ecrã, desaparece após 3-5s | Confirmar acções, avisos rápidos | "✅ Paciente criado com sucesso" |
| **Push** 🔔 | Notificação do browser (aparece mesmo fora da app) | Eventos importantes em tempo real | "🔴 Novo pedido urgente: João Silva" |

#### 📌 Centro de Notificações (🔔)

> Ícone de sino no header da app, com badge de contagem.

```
🔔 (5)
┌─────────────────────────────────────────┐
│ NOTIFICAÇÕES                    [Limpar]│
├─────────────────────────────────────────┤
│                                         │
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
│                                         │
│              [Ver todas →]              │
└─────────────────────────────────────────┘
```

#### 📌 Configurações de Notificação (perfil)

> No perfil do utilizador → secção "Notificações".

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
> Enviado semanalmente para cada médico e clínica associada.

```
📧 Email semanal — Relatório de Trabalhos em Aberto

Para: Dr. Ferreira (Clínica Sorriso)
Assunto: "AsymLAB — Relatório semanal: 3 trabalhos em aberto"

📎 Anexo: relatorio_semanal_2026-02-24.pdf

CONTEÚDO DO PDF:
┌─────────────────────────────────────────────────┐
│ 🔬 AsymLAB — Relatório Semanal                  │
│ Dr. Ferreira — Clínica Sorriso                   │
│ Semana de 17/02 a 24/02/2026                     │
├─────────────────────────────────────────────────┤
│                                                   │
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
│ ┌─ T-0089 Maria Costa ────────────────────────┐  │
│ │ Plano: Implante #36                          │  │
│ │ Fase: Cicatrização                           │  │
│ │ Status: ⬜ Sem agendamentos — s/ data        │  │
│ │ ⚠️ PENDENTE DA CLÍNICA:                     │  │
│ │    • Data de próxima consulta não definida    │  │
│ └──────────────────────────────────────────────┘  │
│                                                   │
│ ┌─ T-0103 Pedro Santos ──────────────────────┐   │
│ │ Plano: Facetas #11-21                       │   │
│ │ Fase: Acabamento                            │   │
│ │ Status: 🟢 Para Colocar — data não definida │   │
│ └─────────────────────────────────────────────┘   │
│                                                   │
│ 📊 Resumo: 1 urgente, 2 pendentes da clínica     │
└─────────────────────────────────────────────────┘
```

**Regras do relatório:**

| Regra | Detalhe |
|-------|---------|
| **Frequência** | Semanal (dia configurável pelo admin, default: segunda) |
| **Destinatários** | Cada médico + cada clínica (emails separados) |
| **Conteúdo** | Todos os planos não-concluídos associados ao médico/clínica |
| **Destaque** | Items pendentes da clínica (material, datas, informação) com ⚠️ |
| **Mutável** | ❌ Não — utilizador não pode desactivar. Só admin pode |
| **Formato** | Email com resumo + PDF completo em anexo |
| **Horário** | Configurável pelo admin (default: segunda 08:00) |

---

### 4.16 — F9: Documentação e Billing ✅

> **Complexidade:** 🟡 Média — envolve geração de documentos e facturação.
> **Nota:** Esta secção define a estrutura. Detalhes de facturação serão refinados durante implementação.

#### 📌 Tipos de Documento

| Documento | Quando | Gerado por | Formato |
|-----------|--------|-----------|---------|
| **Guia de Transporte** | Trabalho enviado para a clínica | Staff Lab (manual ou auto) | PDF |
| **Guia de Recepção** | Material/trabalho recebido no lab | Staff Lab | PDF |
| **Relatório Semanal** | Semanalmente (automático) | Sistema | PDF (ver F8) |
| **Relatório de Plano** | Plano concluído | Sistema | PDF |
| **Considerações (impressão)** | A pedido | Qualquer (ver F4) | PDF |
| **Factura** | Por definir | Por definir | PDF |
| **Recibo** | Por definir | Por definir | PDF |

#### 📌 Guia de Transporte (detalhe)

```
Trabalho pronto para envio → Staff Lab gera Guia de Transporte
  │
  ├─ Auto-preenchido:
  │   ├─ Dados do lab (nome, morada, NIF)
  │   ├─ Dados da clínica destinatária
  │   ├─ Paciente: T-xxxx + nome
  │   ├─ Plano: tipo de trabalho
  │   ├─ Conteúdo: lista de items enviados
  │   ├─ Data de envio
  │   └─ Nº da guia (sequencial)
  │
  ├─ 3 Opções:
  │   ├─ 🖨️ Imprimir (acompanha trabalho fisicamente)
  │   ├─ 📤 Enviar por WA (PDF no grupo do paciente)
  │   └─ 📧 Enviar por email
  │
  └─ Guardada no histórico do paciente + NAS
```

#### 📌 Facturação (estrutura base)

> ⚠️ **A detalhar durante implementação.** Estrutura base definida:

| Conceito | Proposta |
|----------|----------|
| **Unidade de facturação** | Por plano de tratamento |
| **Preço** | Definido por tipo de trabalho (tabela de preços configurável) |
| **Orçamento** | Gerado ao criar plano, pode ser revisto |
| **Factura** | Gerada ao concluir plano (ou parcial ao concluir fase) |
| **Histórico** | Todas as facturas guardadas na NAS + BD |
| **Integração contabilística** | A definir (export CSV/PDF para software de contabilidade) |

> A tabela de preços é configurável pelo admin: tipo de trabalho × material × complexidade.

---

## Etapa 5 — Definir a Informação

*(Por definir — campos detalhados de cada entidade)*

---

## Etapa 6 — Desenhar a Interface

*(Por definir — mockups e layouts)*

---

## Etapa 7 — Priorizar e Fasear

*(Por definir — MVP vs futuro)*