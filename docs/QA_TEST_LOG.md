# QA Test Log — AsymLAB

> **Documento permanente de registo de testes QA.**  
> Atualizado a cada sessão de testes. Não apagar histórico anterior.

---

## Regras de Execução QA

### 🔄 Política de Retry — Browser Automation

Sempre que o browser subagent falhar com um erro técnico (ex: `INVALID_ARGUMENT`, crash ou timeout):

1. **Reiniciar automaticamente** uma nova sessão de browser e voltar a executar os testes afetados
2. Repetir até um **máximo de 3 tentativas** por bloco de testes
3. Após 3 tentativas sem sucesso, **parar e informar o utilizador** com:
   - Qual o bloco/teste que falhou
   - Qual o erro encontrado
   - Quantas tentativas foram feitas

> **Nota:** Cada tentativa deve ser registada no log com o número de retry (ex: `⏭️ SKIP — Browser fail, tentativa 2/3`). Só se marca como `SKIP` definitivo após esgotar as 3 tentativas.

---

### 🚫 Regras Anti-INVALID_ARGUMENT

**Causa raiz identificada:** O erro `INVALID_ARGUMENT: Function call is missing a thought_signature` ocorre quando o browser subagent executa mais de ~12-15 passos internos numa única sessão. O sistema de assinatura de funções do modelo perde o rasto após esse limite.

**Regras obrigatórias para evitar este erro:**

| Regra | Descrição |
|-------|-----------|
| **1 utilizador por sessão** | Cada sessão de browser testa apenas UM utilizador. Nunca mudar de utilizador dentro da mesma sessão (logout + login = 2+ passos extra que consomem o limite). |
| **Máximo 10 ações por sessão** | Cada tarefa deve ter no máximo 10 interações (cliques, escritas, navegações). Dividir testes complexos em sub-sessões. |
| **Sem paralelismo** | Nunca lançar 2 sessões de browser em simultâneo. Sempre sequencial: esperar o resultado de uma antes de lançar a próxima. |
| **Tarefas focadas** | Uma tarefa = um objetivo específico (ex: "verificar sidebar", não "verificar sidebar + testar clínicas + fazer logout"). |
| **Sem screenshots excessivos** | Cada screenshot conta como 1 passo. Pedir no máximo 2-3 screenshots por sessão. |

**Exemplo de tarefa CORRETA:**
```
Vai a localhost:3000/login. Login com "X" / "Y". Tira screenshot da sidebar. Reporta os itens visíveis.
```

**Exemplo de tarefa INCORRETA (demasiados passos):**
```
Login, verifica sidebar, vai a Clínicas, verifica banner, vai a Médicos, verifica banner,
vai a Definições, confirma acesso restrito, faz logout, re-login com outro user, ...
```

---

## Legenda de Resultados

| Símbolo | Significado |
|---------|-------------|
| ✅ PASS | Funcionalidade testada e a funcionar conforme esperado |
| ❌ FAIL | Funcionalidade testada e com falha |
| ⚠️ PARTIAL | Funcionalidade parcialmente funcional |
| ⏭️ SKIP | Teste não executado (indicar motivo) |
| 🐛 BUG | Bug registado (indicar ID) |

---

## Contas de Teste

| Username | Role | Password | Clínicas |
|----------|------|----------|----------|
| test.admin | admin | Teste1234 | Todas |
| test.doctor | doctor | Teste1234 | Clinica QA Norte |
| test.staff.clinic | staff_clinic | Teste1234 | Clinica QA Norte |
| test.staff.lab | staff_lab | Teste1234 | Clinica QA Sul |
| test.conta.clinic | contabilidade_clinic | Teste1234 | — |
| test.conta.lab | contabilidade_lab | Teste1234 | — |

## Dados de Teste Criados

| Item | Estado |
|------|--------|
| Clinica QA Norte | ✅ Criada — test.doctor + test.staff.clinic (is_contact=true) |
| Clinica QA Sul | ✅ Criada — test.staff.lab |
| Dr. QA Test | ⏭️ A criar — médico de teste para módulo Médicos |

---

## Matriz de Permissões (fonte: `permissions.ts`)

| Módulo | admin | doctor | staff_clinic | staff_lab | conta_clinic | conta_lab |
|--------|-------|--------|--------------|-----------|--------------|-----------|
| Dashboard | full | **none** | **none** | read | **none** | read |
| Clínicas | full | read | read | read | read | read |
| Médicos | full | read | read | read | **none** | **none** |
| Pacientes | full | full* | read | read | **none** | **none** |
| Agenda | full | **none** | **none** | **none** | **none** | **none** |
| Faturação | full | **none** | **none** | **none** | read | read |
| Relatórios | full | **none** | **none** | **none** | read | read |
| Definições | full | **none** | **none** | **none** | **none** | **none** |

> *Médico tem acesso total mas apenas aos seus pacientes (RLS)

---

## SESSÃO V2.4.0 — 2026-02-20

**Âmbito:** Auth, Permissões, Clínicas (parcial), Utilizadores (parcial)  
**Ambiente:** localhost:3000 + Supabase Cloud  

---

## BLOCO A — Preparação de Dados

| ID | Cenário | Resultado | Notas |
|----|---------|-----------|-------|
| A.1 | Criar 6 utilizadores test.* | ✅ PASS | Todos criados em Definições > Utilizadores |
| A.2 | Criar Clinica QA Norte | ✅ PASS | Nome guardado |
| A.3 | Adicionar equipa à QA Norte (doctor + staff.clinic) | ✅ PASS | Dois membros adicionados |
| A.4 | Marcar test.staff.clinic como is_contact | ✅ PASS | Toggle activado |
| A.5 | Criar Clinica QA Sul | ✅ PASS | Nome guardado |
| A.6 | Adicionar test.staff.lab à QA Sul | ✅ PASS | Membro adicionado |

---

## BLOCO B — Autenticação

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| B.1 | Login por username | test.admin | ✅ PASS | Dashboard carregou com "TEST Admin" no rodapé |
| B.2 | Logout | test.admin | ✅ PASS | Redireccionou para /login |
| B.3 | Login por email | — | ⏭️ SKIP | Não testado — sem conta email de teste criada |
| B.4 | Login com credenciais erradas | — | ⏭️ SKIP | Não testado nesta sessão |
| B.5 | Redirect automático se já logado | — | ⏭️ SKIP | Não testado nesta sessão |
| B.6 | Callback OAuth (set-password) | — | ⏭️ SKIP | Apenas relevante para contas email com invite |

---

## BLOCO C — Sidebar & Permissões por Role

### C.1 — Admin (test.admin)

**Resultado: ✅ PASS**

| Item Sidebar | Visível? | Badge Leitura? |
|-------------|---------|----------------|
| Dashboard | ✅ | ❌ (full) |
| Clínicas | ✅ | ❌ (full) |
| Médicos | ✅ | ❌ (full) |
| Pacientes | ✅ | ❌ (full) |
| Agenda | ✅ | ❌ (full) |
| Faturação | ✅ | ❌ (full) |
| Relatórios | ✅ | ❌ (full) |
| Definições | ✅ | ❌ (full) |

---

### C.2 — Staff Clínica (test.staff.clinic)

**Resultado: ✅ PASS**

| Item Sidebar | Visível? | Badge Leitura? |
|-------------|---------|----------------|
| Dashboard | ❌ | — |
| Clínicas | ✅ | ✅ [Leitura] |
| Médicos | ✅ | ✅ [Leitura] |
| Pacientes | ✅ | ✅ [Leitura] |
| Agenda | ❌ | — |
| Faturação | ❌ | — |
| Relatórios | ❌ | — |
| Definições | ❌ | — |

**Comportamentos verificados:**
- Banner "👁️ Modo Leitura" aparece em Clínicas ✅
- Só vê Clinica QA Norte (filtragem por RLS) ✅
- Dashboard → "Acesso Restrito" ✅

---

### C.3 — Staff Lab (test.staff.lab)

**Resultado: ✅ PASS (Sessão 3 — tarefa minimalista)**

| Item Sidebar | Visível? | Badge Leitura? |
|-------------|---------|----------------|
| Dashboard | ✅ | ✅ [Leitura] |
| Clínicas | ✅ | ✅ [Leitura] |
| Médicos | ✅ | ✅ [Leitura] |
| Pacientes | ✅ | ✅ [Leitura] |
| Agenda | ❌ | — |
| Faturação | ❌ | — |
| Relatórios | ❌ | — |
| Definições | ❌ | — |

**Comportamentos verificados:**
- Dashboard com banner "👁️ Modo Leitura — Pode visualizar as informações, mas não fazer alterações." ✅
- Todos os 4 módulos com badge [Leitura] ✅
- Agenda, Faturação, Relatórios e Definições ausentes da sidebar ✅
- Rodapé: "Ligado como TEST Staff Lab • AsymLAB v2.4" ✅

**Nota:** Falhou em tarefas longas (INVALID_ARGUMENT). Passou com tarefa minimalista (≤8 passos). Nova regra adicionada ao QA.

---

### C.4 — Doctor (test.doctor)

**Resultado: ✅ PASS (Sessão 2)**

| Item Sidebar | Visível? | Badge Leitura? |
|-------------|---------|----------------|
| Dashboard | ❌ | — (none → Acesso Restrito ao entrar) |
| Clínicas | ✅ | ✅ [Leitura] |
| Médicos | ✅ | ✅ [Leitura] |
| Pacientes | ✅ | ❌ (full — sem badge) |
| Agenda | ❌ | — |
| Faturação | ❌ | — |
| Relatórios | ❌ | — |
| Definições | ❌ | — |

**Comportamentos verificados:**
- Redirect para /dashboard → banner "Acesso Restrito" ✅
- Clínicas e Médicos em modo leitura ✅
- Pacientes sem badge (acesso full) ✅
- RLS filtragem: vê apenas Clinica QA Norte ✅

---

### C.5 — Contabilidade Clínica (test.conta.clinic)

**Resultado: ✅ PASS (Sessão 2)**

| Item Sidebar | Visível? | Badge Leitura? |
|-------------|---------|----------------|
| Dashboard | ❌ | — (Acesso Restrito) |
| Clínicas | ✅ | ✅ [Leitura] |
| Médicos | ❌ | — |
| Pacientes | ❌ | — |
| Faturação | ✅ | ✅ [Leitura] |
| Relatórios | ✅ | ✅ [Leitura] |
| Agenda / Definições | ❌ | — |

**Comportamentos verificados:**
- Dashboard → "Acesso Restrito" ✅
- Password resetada via admin antes do teste ✅

---

### C.6 — Contabilidade Lab (test.conta.lab)

**Resultado: ✅ PASS (Sessão 2)**

| Item Sidebar | Visível? | Badge Leitura? |
|-------------|---------|----------------|
| Dashboard | ✅ | ✅ [Leitura] |
| Clínicas | ✅ | ✅ [Leitura] |
| Médicos | ❌ | — |
| Pacientes | ❌ | — |
| Faturação | ✅ | ✅ [Leitura] |
| Relatórios | ✅ | ✅ [Leitura] |
| Agenda / Definições | ❌ | — |

**Comportamentos verificados:**
- Dashboard em modo leitura (banner "Modo Leitura") ✅
- Só vê módulos de contabilidade + Dashboard ✅

---

## BLOCO D — Módulo Clínicas (admin: acesso full)

### D.1 — Lista de Clínicas

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.1.1 | Listar todas as clínicas | test.admin | ⏭️ SKIP | A executar — verificar paginação e ordenação |
| D.1.2 | Criar nova clínica | test.admin | ✅ PASS | Clinica QA Norte e Sul criadas |
| D.1.3 | Pesquisar clínica por nome | test.admin | ⏭️ SKIP | Não testado |

### D.2 — Aba Dados da Clínica (ClinicInfoTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.2.1 | Editar nome da clínica (auto-save) | test.admin | ✅ PASS | "Clinica QA Norte" guardado |
| D.2.2 | Editar email geral (auto-save via RHF watch) | test.admin | ✅ PASS | `qa.norte@test.com` guardado e persistido após renavegação |
| D.2.3 | Upload de logo da clínica | test.admin | ⏭️ SKIP | Não testado |
| D.2.4 | Editar morada / NIF | test.admin | ⏭️ SKIP | Não testado |

### D.3 — Aba Equipa (ClinicTeamTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.3.1 | Adicionar membro à equipa | test.admin | ✅ PASS | Doctor + Staff adicionados |
| D.3.2 | Toggle is_contact | test.admin | ✅ PASS | Toggle activado para test.staff.clinic |
| D.3.3 | Remover membro da equipa | test.admin | ⏭️ SKIP | Não testado nesta sessão |
| D.3.4 | Definir role do membro na clínica | test.admin | ⏭️ SKIP | Não testado |

### D.4 — Aba Entrega (ClinicDeliveryTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.4.1 | Criar ponto de entrega básico | test.admin | 🐛 BUG #001 → ✅ CORRIGIDO | Erro `country column not found` — corrigido |
| D.4.2 | Criar ponto com contacto externo | test.admin | ✅ PASS | "Ponto QA Externo" criado, distância 010km, guardado 07:20:56 |
| D.4.3 | Editar ponto de entrega | test.admin | ⏭️ SKIP | Não testado |
| D.4.4 | Eliminar ponto de entrega | test.admin | ⏭️ SKIP | Não testado |

### D.5 — Aba Contactos (ClinicContactsList)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.5.1 | Ver lista de contactos (smart contacts: membros is_contact) | test.admin | ⏭️ SKIP | Não testado |
| D.5.2 | Contactos externos visíveis | test.admin | ⏭️ SKIP | Não testado |

### D.6 — Aba Descontos (ClinicDiscountsTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.6.1 | Ver tabela de descontos | test.admin | ⏭️ SKIP | Não testado |
| D.6.2 | Adicionar desconto | test.admin | ⏭️ SKIP | Não testado |
| D.6.3 | Remover desconto | test.admin | ⏭️ SKIP | Não testado |

### D.7 — Aba Segurança (ClinicSecurityTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.7.1 | Ver utilizadores com acesso à clínica | test.admin | ⏭️ SKIP | Não testado |
| D.7.2 | Revogar acesso de utilizador | test.admin | ⏭️ SKIP | Não testado |
| D.7.3 | Adicionar utilizador via aba Segurança | test.admin | ⏭️ SKIP | Não testado |

### D.8 — Clínicas em Modo Leitura (staff_clinic / doctor / staff_lab / conta_clinic / conta_lab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| D.8.1 | Ver clínica em modo leitura | test.staff.clinic | ✅ PASS | Banner "Modo Leitura" visível |
| D.8.2 | Tentar editar campo (botões desactivados?) | test.staff.clinic | ⏭️ SKIP | Verificar se campos/botões estão desactivados |
| D.8.3 | Verificar filtragem RLS (só ver clínicas da equipa) | test.staff.clinic | ✅ PASS | Só vê QA Norte |
| D.8.4 | Verificar filtragem RLS (staff.lab vê QA Sul) | test.staff.lab | ⏭️ SKIP | Não testado |
| D.8.5 | doctor não consegue editar clínica | test.doctor | ⏭️ SKIP | Esperado: banner "Modo Leitura" |

---

## BLOCO E — Módulo Médicos

### E.1 — Lista de Médicos (admin: full)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| E.1.1 | Listar médicos | test.admin | ⏭️ SKIP | Não testado |
| E.1.2 | Criar novo médico | test.admin | ⏭️ SKIP | Não testado |
| E.1.3 | Pesquisar médico | test.admin | ⏭️ SKIP | Não testado |

### E.2 — Ficha do Médico — Aba Dados (DoctorDataTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| E.2.1 | Campo "Nome Completo" — só leitura (vem de auth) | test.admin | ✅ PASS (sessão anterior) | Campo `disabled` — editável só em Definições |
| E.2.2 | Campo "Telefone" — desbloqueado (sem auth.phone) | test.admin | ✅ PASS (sessão anterior) | Campo editável + botão Guardar |
| E.2.3 | Campo "Telefone" — bloqueado (com auth.phone) | test.admin | ✅ PASS (sessão anterior) | Campo read-only + ícone cadeado |
| E.2.4 | Clicar cadeado → modal "Ir para Definições" (admin) | test.admin | ✅ PASS (sessão anterior) | Link para /dashboard/settings |
| E.2.5 | Clicar cadeado → modal "Contactar administrador" (não-admin) | test.doctor | ⏭️ SKIP | Verificar mensagem para role sem admin |
| E.2.6 | Guardar número de telefone (sem auth.phone) | test.admin | ⏭️ SKIP | Confirmar que guarda em auth + profile |
| E.2.7 | Email de contacto — guardar via botão Guardar | test.admin | ⏭️ SKIP | Botão directo no tab (não auto-save) |
| E.2.8 | Clínicas associadas — ver lista | test.admin | ⏭️ SKIP | Verificar lista de clínicas do médico |
| E.2.9 | Abrir modal de Parceiros da Clínica | test.admin | ⏭️ SKIP | Clicar numa clínica associada |
| E.2.10 | Adicionar parceiro à clínica do médico | test.admin | ⏭️ SKIP | Modal de parceiros |

### E.3 — Ficha do Médico — Aba Análise (DoctorAnalyticsTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| E.3.1 | Ver análises do médico | test.admin | ⏭️ SKIP | Não testado |

### E.4 — Ficha do Médico — Aba Permissões (DoctorPermissionsTab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| E.4.1 | Ver permissões do médico | test.admin | ⏭️ SKIP | Não testado |
| E.4.2 | Alterar permissões | test.admin | ⏭️ SKIP | Não testado |

### E.5 — Módulo Médicos em Modo Leitura (doctor / staff_clinic / staff_lab)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| E.5.1 | Ver ficha do médico em modo leitura | test.doctor | ⏭️ SKIP | Esperado: ver dados mas não editar |
| E.5.2 | Ver ficha do médico em modo leitura | test.staff.clinic | ⏭️ SKIP | Esperado: banner "Modo Leitura" |
| E.5.3 | conta_clinic → Médicos não visíveis | test.conta.clinic | ⏭️ SKIP | Esperado: "Acesso Restrito" |

---

## BLOCO F — Módulo Pacientes

> ⚠️ Módulo Pacientes ainda não está implementado. Testes a adicionar quando disponível.

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| F.1 | Admin — ver lista de pacientes | test.admin | ⏭️ SKIP | Módulo não disponível |
| F.2 | Doctor — ver apenas os seus pacientes (RLS) | test.doctor | ⏭️ SKIP | Módulo não disponível |
| F.3 | staff_clinic — lista em modo leitura | test.staff.clinic | ⏭️ SKIP | Módulo não disponível |
| F.4 | conta_clinic — "Acesso Restrito" | test.conta.clinic | ⏭️ SKIP | Módulo não disponível |

---

## BLOCO G — Módulo Agenda

> ⚠️ Módulo Agenda ainda não está implementado.

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| G.1 | Admin — ver agenda | test.admin | ⏭️ SKIP | Módulo não disponível |
| G.2 | Outros roles — "Acesso Restrito" | Todos os outros | ⏭️ SKIP | Módulo não disponível |

---

## BLOCO H — Módulo Faturação

> ⚠️ Módulo Faturação ainda não está implementado.

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| H.1 | Admin — ver faturação | test.admin | ⏭️ SKIP | Módulo não disponível |
| H.2 | conta_clinic — faturação em modo leitura | test.conta.clinic | ⏭️ SKIP | Módulo não disponível |
| H.3 | Outros roles (doctor/staff) — "Acesso Restrito" | — | ⏭️ SKIP | Módulo não disponível |

---

## BLOCO I — Módulo Relatórios

> ⚠️ Módulo Relatórios ainda não está implementado.

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| I.1 | Admin — ver relatórios | test.admin | ⏭️ SKIP | Módulo não disponível |
| I.2 | conta_clinic / conta_lab — modo leitura | — | ⏭️ SKIP | Módulo não disponível |
| I.3 | Outros — "Acesso Restrito" | — | ⏭️ SKIP | Módulo não disponível |

---

## BLOCO J — Módulo Definições (apenas admin)

### J.1 — Gestão de Utilizadores (UserManagement)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| J.1.1 | Ver lista de utilizadores | test.admin | ✅ PASS | Lista com todos os 6 utilizadores test.* + outros |
| J.1.2 | Criar utilizador por username | test.admin | ✅ PASS | 6 utilizadores test.* criados |
| J.1.3 | Criar utilizador por email (invite link) | test.admin | ✅ PASS | Modal com tabs Username/Email; tab Email envia link de convite sem password |
| J.1.4 | Seleccionar clínicas ao criar utilizador | test.admin | ⏭️ SKIP | Dropdown de clínicas no modal criar |
| J.1.5 | Adicionar tags/funções ao criar utilizador | test.admin | ⏭️ SKIP | Ex: "Rececionista", "Assistente" |
| J.1.6 | Editar utilizador (nome, role, clínicas) | test.admin | ✅ PASS | Campos: Nome, Telemóvel, Perfil/Role, Clínicas, Tags |
| J.1.7 | Resetar password | test.admin | ✅ PASS | Reset executado para conta.clinic e conta.lab com sucesso |
| J.1.8 | Enviar credenciais por WhatsApp | test.admin | ⏭️ SKIP | Só disponível em utilizadores sem login anterior |
| J.1.9 | Enviar credenciais por email | test.admin | ⏭️ SKIP | Só disponível em utilizadores sem login anterior |
| J.1.10 | Tentar enviar credenciais após login — alerta | test.admin | ✅ PASS | Modal "Convite Não Disponível" com instrução de usar Reset Password |
| J.1.11 | Eliminar utilizador | test.admin | ⏭️ SKIP | Não testado |
| J.1.12 | Filtrar/pesquisar utilizador na lista | test.admin | ⏭️ SKIP | Não testado |
| J.1.13 | Ver roles e permissões (painel "Roles") | test.admin | ✅ PASS | Accordion com todos os 5 roles e permissões detalhadas |
| J.1.14 | Link "Ver Ficha do Médico" para roles=doctor | test.admin | ⏭️ SKIP | Não testado |

### J.2 — Backup (BackupSettings)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| J.2.1 | Ver painel de Backup | test.admin | ✅ PASS | Stats: 7 backups (1 Full + 6 Incr), 9 tabelas monitorizadas, modo Auto |
| J.2.2 | Fazer backup manual "Auto" | test.admin | ✅ PASS | Backup executado: 8 backups após — entrada `20/02/2026 07:29:17` |
| J.2.3 | Fazer backup "Forçar Full" | test.admin | ⏭️ SKIP | Dropdown > Forçar Full |
| J.2.4 | Fazer backup "Forçar Incremental" | test.admin | ⏭️ SKIP | Dropdown > Forçar Incremental |
| J.2.5 | Alterar diretório de backup e guardar | test.admin | ⏭️ SKIP | Campo "Diretório" + botão "Guardar Alterações" |
| J.2.6 | Alterar modo de backup (Auto/Full/Incremental) | test.admin | ⏭️ SKIP | 3 botões de selecção de modo |
| J.2.7 | Alterar horário diário de backup | test.admin | ⏭️ SKIP | Campo time picker |
| J.2.8 | Alterar retenção (dias) | test.admin | ⏭️ SKIP | Campo numérico |
| J.2.9 | Alterar intervalo Full (dias) | test.admin | ⏭️ SKIP | Campo numérico (desactivado em modo Full) |
| J.2.10 | Toggle backup automático ON/OFF | test.admin | ⏭️ SKIP | Switch ON/OFF |
| J.2.11 | Confirmar histórico de backups | test.admin | ✅ PASS | Histórico actualizado em tempo real, tags FULL/INCR correctas |
| J.2.12 | Reconfigurar backup (BackupWizard) | test.admin | ⏭️ SKIP | Botão "Reconfigurar" → wizard |

### J.3 — Outros módulos das Definições

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| J.3.1 | Não-admin acede a /dashboard/settings → "Acesso Restrito" | test.doctor | ⏭️ SKIP | Verificar PermissionGuard no módulo settings |

---

## BLOCO K — Minha Conta (/dashboard/minha-conta)

> Acessível a todos os roles — não tem restrições de permissão

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| K.1 | Ver página "A Minha Conta" | test.admin | ⏭️ SKIP | Verificar conteúdo da página |
| K.2 | Alterar password | test.admin | ⏭️ SKIP | Confirmar formulário de alteração de password |
| K.3 | Página acessível a role sem acesso à settings | test.doctor | ⏭️ SKIP | Verificar que /minha-conta não é bloqueado por PermissionGuard |

---

## BLOCO L — Dashboard

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| L.1 | Admin vê Dashboard completo | test.admin | ⏭️ SKIP | Verificar widgets e stats |
| L.2 | staff_lab vê Dashboard (modo leitura) | test.staff.lab | ⏭️ SKIP | Banner "Modo Leitura" esperado |
| L.3 | conta_lab vê Dashboard (modo leitura) | test.conta.lab | ⏭️ SKIP | Banner "Modo Leitura" esperado |
| L.4 | staff_clinic → Dashboard "Acesso Restrito" | test.staff.clinic | ✅ PASS | "Acesso Restrito" confirmado |
| L.5 | doctor → Dashboard "Acesso Restrito" | test.doctor | ✅ PASS | "Acesso Restrito" confirmado após login |
| L.6 | conta_clinic → Dashboard "Acesso Restrito" | test.conta.clinic | ✅ PASS | "Acesso Restrito" confirmado após login |

---

## BLOCO M — Sidebar UX & PWA

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| M.1 | Sidebar recolhe/expande (botão PanelLeft) | test.admin | ⏭️ SKIP | Não testado |
| M.2 | Sidebar mobile — botão hamburger | test.admin | ⏭️ SKIP | Não testado |
| M.3 | Sidebar mobile fecha com Escape | test.admin | ⏭️ SKIP | Não testado |
| M.4 | Sidebar mobile fecha ao clicar overlay | test.admin | ⏭️ SKIP | Não testado |
| M.5 | Avatar do utilizador → link para Minha Conta | test.admin | ⏭️ SKIP | Não testado |
| M.6 | Botão Logout no rodapé da sidebar | test.admin | ✅ PASS | Redireccionou para /login |
| M.7 | PWA — instalação como app no telemóvel | — | ⏭️ SKIP | Verificar manifest.json e service worker |
| M.8 | PWA — funciona offline (módulos críticos) | — | ⏭️ SKIP | Service worker cache |

---

## REGISTO DE BUGS

### BUG #001 — Campo `country` na tabela `clinic_delivery_points` ✅ CORRIGIDO

| Campo | Detalhe |
|-------|---------|
| **ID** | BUG-001 |
| **Severidade** | 🔴 Crítico (bloqueava criação de pontos de entrega) |
| **Módulo** | Clínicas > Aba Entrega |
| **Descrição** | `ClinicDeliveryTab.tsx` tentava inserir `country: 'Portugal'` mas a coluna não existe na tabela. |
| **Erro** | `Could not find the 'country' column of 'clinic_delivery_points'` |
| **Ficheiro** | `src/components/clinics/tabs/ClinicDeliveryTab.tsx` |
| **Correção** | Removida a linha `country: 'Portugal'` |
| **Status** | ✅ CORRIGIDO — Commit V2.4.1 — 2026-02-20 |

---

## RESUMO GERAL (Actualizado — V2.4.2/V2.4.3)

| Bloco | Total | PASS | FAIL | PARTIAL | SKIP | BUG |
|-------|-------|------|------|---------|------|-----|
| A — Preparação | 6 | 6 | 0 | 0 | 0 | 0 |
| B — Auth | 6 | 2 | 0 | 0 | 4 | 0 |
| C — Sidebar/Permissões | 6 | 6 | 0 | 0 | 0 | 0 |
| D — Clínicas | 23 | 7 | 0 | 0 | 15 | 1 |
| E — Médicos | 14 | 3 | 0 | 0 | 11 | 0 |
| F — Pacientes | 4 | 0 | 0 | 0 | 4 | 0 |
| G — Agenda | 2 | 0 | 0 | 0 | 2 | 0 |
| H — Faturação | 3 | 0 | 0 | 0 | 3 | 0 |
| I — Relatórios | 3 | 0 | 0 | 0 | 3 | 0 |
| J — Definições | 26 | 9 | 0 | 0 | 17 | 0 |
| K — Minha Conta | 3 | 0 | 0 | 0 | 3 | 0 |
| L — Dashboard | 6 | 3 | 0 | 0 | 3 | 0 |
| M — Sidebar UX/PWA | 8 | 1 | 0 | 0 | 7 | 0 |
| **TOTAL** | **110** | **37** | **0** | **0** | **72** | **1 corrigido** |

**Taxa de sucesso (executados):** 37/37 = **100%**  
**Cobertura:** 37/110 = **34%** — restantes: módulos não implementados (F/G/H/I) + funcionalidades a executar

---

## PENDÊNCIAS — PRÓXIMA SESSÃO QA

### Alta Prioridade (funcionalidades existentes, ainda não executadas)

- [ ] **D.7.1-D.7.3** — Aba Segurança da Clínica
- [ ] **D.5.1-D.5.2** — Aba Contactos da Clínica
- [ ] **D.6.1-D.6.3** — Aba Descontos da Clínica
- [ ] **J.1.11** — Eliminar utilizador
- [ ] **J.2.3-J.2.10** — Backup: Forçar Full/Incr, configurações, toggle, wizard
- [ ] **L.2** — Dashboard modo leitura (staff.lab)

### Média Prioridade

- [ ] **E.2.6-E.2.10** — Guardar telefone, email, parceiros no médico
- [ ] **J.1.4, J.1.5** — Clínicas + Tags ao criar utilizador
- [ ] **K.1-K.3** — Página Minha Conta
- [ ] **M.1-M.8** — UX da Sidebar e PWA

### Baixa Prioridade (módulos não implementados)

- [ ] **Bloco F** — Pacientes (quando implementado)
- [ ] **Bloco G** — Agenda (quando implementado)
- [ ] **Bloco H** — Faturação (quando implementado)
- [ ] **Bloco I** — Relatórios (quando implementado)

---

## HISTÓRICO DE SESSÕES

| Versão | Data | Âmbito | PASS | FAIL | PARTIAL | Bugs |
|--------|------|--------|------|------|---------|------|
| V2.4.0 | 2026-02-20 | Auth, Permissões C.1-C.2, Clínicas (parcial), Utilisadores (parcial) | 22 | 0 | 1 | 1 corrigido |
| V2.4.3 | 2026-02-20 | Permissões C.4-C.6, D.2.2, D.4.2, J.1 Utilizadores, J.2 Backup, L.5-L.6 | +14 | 0 | 0 | 0 |
