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
| @entregue | Marca trabalho como entregue | Staff Lab |
| @recolher | Pede recolha do trabalho | Médico, Staff Clínica |
| @recolhido | Confirma que trabalho foi recolhido | Staff Lab |
| @urgente | Marca trabalho como urgente | Todos |
| @material | Notifica material em falta | Sistema automático |

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

## Etapa 5 — Definir a Informação

*(Por definir — campos detalhados de cada entidade)*

---

## Etapa 6 — Desenhar a Interface

*(Por definir — mockups e layouts)*

---

## Etapa 7 — Priorizar e Fasear

*(Por definir — MVP vs futuro)*