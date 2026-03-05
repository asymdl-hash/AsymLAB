---
description: Protocolo de seleção de modelos — escolher o agente certo para cada tipo de tarefa
---

# Protocolo de Model Routing

> [!CAUTION]
> ### REGRA OBRIGATÓRIA — Sugestão de Modelo
> O agente DEVE sugerir o modelo de IA mais adequado ANTES de iniciar qualquer tarefa significativa.
> Se a meio de uma tarefa detectar que outra tarefa requer um modelo diferente, DEVE **parar e informar o utilizador**.
> O utilizador troca manualmente o modelo no Antigravity e diz "avança".
> **NUNCA** avançar com um modelo sub-óptimo quando um superior é claramente mais adequado.

## 1. Protocolo Obrigatório — Sugestão Antes de Executar

**REGRA:** No final de cada fase de planeamento (ou antes de iniciar uma nova tarefa), o agente DEVE incluir um bloco de sugestão com este formato:

```
🤖 MODELO SUGERIDO: [Nome do Modelo]
📋 MOTIVO: [Razão pela qual este modelo é o ideal]
⚠️ RISCOS: [Riscos da tarefa e como serão mitigados]
💡 ALTERNATIVAS: [Outras abordagens possíveis]
```

O utilizador troca o modelo no Antigravity e responde "avança" para iniciar a execução.

## 2. Hierarquia de Seleção

### 🟢 Gemini 3.1 Pro (High) — Velocidade + Contexto Largo

| Quando usar | Exemplos |
|------------|----------|
| Prototipagem rápida ("Vibe Coding") | Criar componente novo simples |
| Leitura de grandes volumes de código (1M tokens) | Analisar toda a codebase, indexação |
| Processamento de media (imagens, SVGs, UI) | Gerar assets, analisar screenshots |
| Operações de baixa latência | Edições simples, renaming, formatação |

### 🔵 Claude Sonnet 4.6 (Thinking) — Equilíbrio Raciocínio + Execução

| Quando usar | Exemplos |
|------------|----------|
| Browser Agent (testes E2E, QA visual) | Testes de login, sidebar, permissões |
| Frontend intermédio | Componentes React, lógica de forms |
| Lógica de negócio padrão | Services, hooks, API routes |
| Planeamento de tarefas médias | Planear features com 2-5 ficheiros |

### 🔴 Claude Opus 4.6 (Thinking) — Máxima Profundidade

| Quando usar | Exemplos |
|------------|----------|
| Refatoração arquitetural | Reestruturar módulos inteiros |
| Bugs lógicos complexos | Problemas de estado, race conditions |
| Migrações de base de dados | SQL DDL, triggers, RLS policies |
| Operações irreversíveis no Terminal | Scripts de produção, deploys |
| Planeamento estratégico | Desenhar arquitectura nova, decisões críticas |

## 3. Regras Gerais

| Regra | Descrição |
|-------|-----------|
| **Sugerir SEMPRE** | Nunca avançar para execução sem antes sugerir o modelo |
| **Zero erros em DB** | Migrações → sempre Opus ou verificação dupla |
| **Browser = Sonnet** | Testes de browser e E2E → sempre Sonnet |
| **Planear antes** | Apresentar possíveis erros e soluções ANTES de executar |
| **Indicações extras** | Mostrar alternativas e riscos antes de decisões irreversíveis |
| **Escalar se necessário** | Se detectar complexidade acima do esperado → **parar e sugerir modelo superior** |

## 4. Quando PARAR e Pedir Mudança

O agente DEVE parar e sugerir mudança de modelo quando:

| Situação | Acção |
|----------|-------|
| Tarefa de UI/design depois de lógica de negócio | Parar → sugerir modelo com melhor visão visual |
| Migração SQL após frontend | Parar → sugerir Opus para segurança DB |
| Browser test após implementação | Parar → sugerir Sonnet para E2E |
| Refactoração arquitectural inesperada | Parar → sugerir Opus |
| Tarefa simples/mecânica | Parar → sugerir Gemini Pro para velocidade |

**Formato da sugestão:**
```
🤖 MODELO SUGERIDO: [Nome]
📋 MOTIVO: [Porquê]
💡 ALTERNATIVA: [Outra opção]
```
