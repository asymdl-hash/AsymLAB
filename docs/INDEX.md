# 📚 AsymLAB — Índice Central de Documentação

> **Ponto de entrada único** para toda a documentação do projecto.
> Última actualização: 05/03/2026 · Versão: V2.1.0

---

## Estado Actual do Projecto

| Módulo | Estado | Progresso | Doc |
|--------|--------|:---------:|-----|
| 🏗️ Infra & Auth | ✅ Produção | 100% | [DEPLOY](ops/DEPLOY.md) |
| 🏥 Clínicas | ✅ Produção | 100% | — |
| 👨‍⚕️ Médicos | ✅ Produção | 100% | — |
| 🦷 Pacientes | ✅ Produção | 100% | [PACIENTES](modulos/PACIENTES.md) |
| 📦 Fila de Pedidos | ✅ Produção | 100% | — |
| ⚙️ Definições (Catálogos) | ✅ Produção | 100% | [DECISOES](core/DECISOES.md) |
| 📂 NAS / Storage | 🔧 Em curso | ~75% | [PACIENTES_NAS](modulos/PACIENTES_NAS.md) |
| 🔧 Widgets | 🔧 Em curso | ~80% | [DECISOES](core/DECISOES.md#6-widgets) |
| 💬 Chat Interno | 🔧 Em curso | ~40% | [DECISOES](core/DECISOES.md#3-chat-interno) |
| 📅 Calendário | 📋 Planeado | 0% | [DECISOES](core/DECISOES.md#4-calendário) |
| 💰 Faturação | 📋 Planeado | 0% | [DECISOES](core/DECISOES.md#5-faturação--toconline) |
| 📊 Analytics | 📋 Planeado | 0% | — |

---

## 📂 Mapa de Documentos

### Core — Arquitectura e Decisões

| Documento | Descrição | Linhas |
|-----------|-----------|:------:|
| [ROADMAP.md](core/ROADMAP.md) | Features por prioridade (✅/🔴/🟡/🟢) | ~124 |
| [DECISOES.md](core/DECISOES.md) | Todas as decisões de design validadas | ~300 |

### Módulos — Especificações Funcionais

| Documento | Descrição | Linhas |
|-----------|-----------|:------:|
| [PACIENTES.md](modulos/PACIENTES.md) | Design completo do módulo (7 etapas, 28 tabelas) | ~4171 |
| [PACIENTES_NAS.md](modulos/PACIENTES_NAS.md) | Hierarquia NAS, regras pastas, integração storage | ~350 |

### Ops — Operações e Qualidade

| Documento | Descrição | Linhas |
|-----------|-----------|:------:|
| [CHANGELOG.md](ops/CHANGELOG.md) | Histórico de versões e commits | ~200 |
| [CONTEXT_RESTART.md](ops/CONTEXT_RESTART.md) | **[KEY]** Contexto das últimas 24h para reinícios do PC | ~30 |
| [QA_TEST_LOG.md](ops/QA_TEST_LOG.md) | Registo de testes QA (110 testes, 97 PASS) | ~589 |
| [DEPLOY.md](ops/DEPLOY.md) | Guia de deploy Vercel | ~80 |
| [SETUP_NOVO_PC.md](ops/SETUP_NOVO_PC.md) | Configuração de novo PC de desenvolvimento | ~500 |
| [BACKUP_NAS.md](ops/BACKUP_NAS.md) | Backup Supabase, NAS, segurança, regras operacionais | ~868 |

### Acessos — Credenciais e Ligações

| Documento | Descrição | Linhas |
|-----------|-----------|:------:|
| [ACESSOS.md](acessos/ACESSOS.md) | Credenciais e tokens | ~80 |
| [ACESSOS_DIRECTOS.md](acessos/ACESSOS_DIRECTOS.md) | Links directos para serviços | ~180 |

---

## 🔑 Regras Operacionais

> Extraídas de [BACKUP_NAS.md](ops/BACKUP_NAS.md) — aplicam-se a **toda** a implementação.

| Regra | Resumo |
|-------|--------|
| **Backup** | Ao criar/editar/eliminar tabelas → verificar se `scripts/backup-supabase.js` precisa actualização |
| **Source of Truth** | Cada dado tem UMA fonte. Nunca ler de um sítio e escrever noutro |
| **Testes Pré-Commit** | Antes de `git commit` → testar no browser simulando utilizador real |
| **NAS = Master** | A NAS mantém SEMPRE a info completa. Supabase = cache parcial |
| **Doc Sync** | Ao implementar/decidir/commitar → actualizar docs correspondentes ([workflow](../.agent/workflows/doc-sync.md)) |

---

## 📋 Glossário

| Termo | Significado |
|-------|-------------|
| **T-ID** | Identificador único do paciente (ex: T-0042) |
| **CNC** | Registo de fresagem com material e ficheiros CAM |
| **Remake** | Fase de refazer trabalho — entra para analytics como ineficiência |
| **Widget** | Mini-painel na app que mostra tarefas pendentes a funcionários específicos |
| **Info Plano** | Pasta NAS com media e dados ao nível do plano (CBCT, Face, STLs, etc.) |
| **Consideração** | Comunicação formal entre médico e laboratório, versionada |
| **POT** | Plano Original de Tratamento |

---

## 🔄 Última Sincronização por Documento

| Documento | Última Actualização | Autor |
|-----------|:-------------------:|-------|
| INDEX.md | 05/03/2026 | Antigravity |
| DECISOES.md | 05/03/2026 | Antigravity |
| PACIENTES_NAS.md | 02/03/2026 | Antigravity |
| ROADMAP.md | 03/03/2026 | Antigravity |
| PACIENTES.md | 27/02/2026 | Antigravity |
| QA_TEST_LOG.md | 21/02/2026 | Antigravity |
| CHANGELOG.md | 03/03/2026 | Antigravity |
