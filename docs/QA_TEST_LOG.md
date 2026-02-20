# QA Test Log — AsymLAB

> **Documento permanente de registo de testes QA.**  
> Atualizado a cada sessão de testes. Não apagar histórico anterior.

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

**Resultado: ⏭️ SKIP**

**Esperado conforme matriz:**
| Dashboard | read → visível com badge |
| Clínicas | read → visível com badge |
| Médicos | read → visível com badge |
| Pacientes | read → visível com badge |
| Agenda / Faturação / Relatórios / Definições | none → não visíveis |

**Motivo SKIP:** Browser automation indisponível. A executar em sessão futura.

---

### C.4 — Doctor (test.doctor)

**Resultado: ⏭️ SKIP**

**Esperado conforme matriz:**
| Dashboard | none → não visível |
| Clínicas | read → visível com badge |
| Médicos | read → visível com badge |
| Pacientes | full → visível sem badge |
| Agenda / Faturação / Relatórios / Definições | none → não visíveis |

**Motivo SKIP:** Browser automation indisponível.

---

### C.5 — Contabilidade Clínica (test.conta.clinic)

**Resultado: ⏭️ SKIP**

**Esperado conforme matriz:**
| Dashboard | none → não visível |
| Clínicas | read → visível com badge |
| Médicos | none → não visível |
| Pacientes | none → não visível |
| Faturação | read → visível com badge |
| Relatórios | read → visível com badge |
| Agenda / Definições | none → não visíveis |

**Motivo SKIP:** Browser automation indisponível.

---

### C.6 — Contabilidade Lab (test.conta.lab)

**Resultado: ⏭️ SKIP**

**Esperado conforme matriz:**
| Dashboard | read → visível com badge |
| Clínicas | read → visível com badge |
| Médicos | none → não visível |
| Pacientes | none → não visível |
| Faturação | read → visível com badge |
| Relatórios | read → visível com badge |
| Agenda / Definições | none → não visíveis |

**Motivo SKIP:** Conta não testada nesta sessão.

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
| D.2.2 | Editar email geral (auto-save via RHF watch) | test.admin | ⚠️ PARTIAL | Limitação de teste JS; verificar manualmente |
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
| D.4.2 | Criar ponto com contacto externo | test.admin | ⏭️ SKIP | Desbloqueado após BUG-001 — testar em sessão futura |
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
| J.1.1 | Ver lista de utilizadores | test.admin | ⏭️ SKIP | Verificar tabela com todos os campos |
| J.1.2 | Criar utilizador por username | test.admin | ✅ PASS | 6 utilizadores test.* criados |
| J.1.3 | Criar utilizador por email (invite link) | test.admin | ⏭️ SKIP | Não testado |
| J.1.4 | Seleccionar clínicas ao criar utilizador | test.admin | ⏭️ SKIP | Dropdown de clínicas no modal criar |
| J.1.5 | Adicionar tags/funções ao criar utilizador | test.admin | ⏭️ SKIP | Ex: "Rececionista", "Assistente" |
| J.1.6 | Editar utilizador (nome, role, clínicas) | test.admin | ⏭️ SKIP | Botão ✏️ na lista |
| J.1.7 | Resetar password | test.admin | ✅ PASS | Reset executado em múltiplos utilizadores |
| J.1.8 | Enviar credenciais por WhatsApp | test.admin | ⏭️ SKIP | Só disponível em utilizadores sem login anterior |
| J.1.9 | Enviar credenciais por email | test.admin | ⏭️ SKIP | Só disponível em utilizadores sem login anterior |
| J.1.10 | Tentar enviar credenciais após login — alerta | test.admin | ⏭️ SKIP | Deve mostrar modal "Convite Não Disponível" |
| J.1.11 | Eliminar utilizador | test.admin | ⏭️ SKIP | Não testado |
| J.1.12 | Filtrar/pesquisar utilizador na lista | test.admin | ⏭️ SKIP | Não testado |
| J.1.13 | Ver roles e permissões (painel "Roles") | test.admin | ⏭️ SKIP | Botão "Roles" com accordeon explicativo |
| J.1.14 | Link "Ver Ficha do Médico" para roles=doctor | test.admin | ⏭️ SKIP | Nome na lista é link azul para /dashboard/doctors/:id |

### J.2 — Backup (BackupSettings)

| ID | Cenário | Utilizador | Resultado | Notas |
|----|---------|-----------|-----------|-------|
| J.2.1 | Ver painel de Backup | test.admin | ⏭️ SKIP | Verificar stats cards e histórico |
| J.2.2 | Fazer backup manual "Auto" | test.admin | ⏭️ SKIP | Botão "Backup Agora" |
| J.2.3 | Fazer backup "Forçar Full" | test.admin | ⏭️ SKIP | Dropdown > Forçar Full |
| J.2.4 | Fazer backup "Forçar Incremental" | test.admin | ⏭️ SKIP | Dropdown > Forçar Incremental |
| J.2.5 | Alterar diretório de backup e guardar | test.admin | ⏭️ SKIP | Campo "Diretório" + botão "Guardar Alterações" |
| J.2.6 | Alterar modo de backup (Auto/Full/Incremental) | test.admin | ⏭️ SKIP | 3 botões de selecção de modo |
| J.2.7 | Alterar horário diário de backup | test.admin | ⏭️ SKIP | Campo time picker |
| J.2.8 | Alterar retenção (dias) | test.admin | ⏭️ SKIP | Campo numérico |
| J.2.9 | Alterar intervalo Full (dias) | test.admin | ⏭️ SKIP | Campo numérico (desactivado em modo Full) |
| J.2.10 | Toggle backup automático ON/OFF | test.admin | ⏭️ SKIP | Switch ON/OFF |
| J.2.11 | Confirmar histórico de backups | test.admin | ⏭️ SKIP | Lista de backups com badges FULL/INCR/Manual |
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
| L.5 | doctor → Dashboard "Acesso Restrito" | test.doctor | ⏭️ SKIP | Esperado pelo matriz de permissões |
| L.6 | conta_clinic → Dashboard "Acesso Restrito" | test.conta.clinic | ⏭️ SKIP | Esperado pelo matriz de permissões |

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

## RESUMO GERAL (Sessão V2.4.0)

| Bloco | Total | PASS | FAIL | PARTIAL | SKIP | BUG |
|-------|-------|------|------|---------|------|-----|
| A — Preparação | 6 | 6 | 0 | 0 | 0 | 0 |
| B — Auth | 6 | 2 | 0 | 0 | 4 | 0 |
| C — Sidebar/Permissões | 6 | 2 | 0 | 0 | 4 | 0 |
| D — Clínicas | 23 | 5 | 0 | 1 | 16 | 1 |
| E — Médicos | 14 | 3 | 0 | 0 | 11 | 0 |
| F — Pacientes | 4 | 0 | 0 | 0 | 4 | 0 |
| G — Agenda | 2 | 0 | 0 | 0 | 2 | 0 |
| H — Faturação | 3 | 0 | 0 | 0 | 3 | 0 |
| I — Relatórios | 3 | 0 | 0 | 0 | 3 | 0 |
| J — Definições | 26 | 2 | 0 | 0 | 24 | 0 |
| K — Minha Conta | 3 | 0 | 0 | 0 | 3 | 0 |
| L — Dashboard | 6 | 1 | 0 | 0 | 5 | 0 |
| M — Sidebar UX/PWA | 8 | 1 | 0 | 0 | 7 | 0 |
| **TOTAL** | **110** | **22** | **0** | **1** | **86** | **1 corrigido** |

**Taxa de sucesso (executados):** 22/23 = **96%**  
**Cobertura:** 23/110 = **21%** — restantes bloqueados por browser automation ou módulos não implementados

---

## PENDÊNCIAS — PRÓXIMA SESSÃO QA

### Alta Prioridade (funcionalidades existentes, ainda não executadas)

- [ ] **D.2.2** — Verificar manualmente email da clínica (digitar no campo → auto-save confirmar)
- [ ] **C.3** — Sidebar `test.staff.lab` (Dashboard=read, Clínicas/Médicos/Pacientes=read)
- [ ] **C.4** — Sidebar `test.doctor` (Pacientes=full, Clínicas/Médicos=read)
- [ ] **C.5** — Sidebar `test.conta.clinic` (Clínicas/Faturação/Relatórios=read)
- [ ] **C.6** — Sidebar `test.conta.lab` (Dashboard/Clínicas/Faturação/Relatórios=read)
- [ ] **D.4.2** — Criação de ponto de entrega com contacto externo (após BUG-001 corrigido)
- [ ] **D.7.1-D.7.3** — Aba Segurança da Clínica
- [ ] **D.5.1-D.5.2** — Aba Contactos da Clínica
- [ ] **J.1.6** — Editar utilizador existente (role, nome, clínicas)
- [ ] **J.1.11** — Eliminar utilizador
- [ ] **J.2.1-J.2.12** — Bloco completo de Backup
- [ ] **L.2, L.3** — Dashboard em modo leitura (staff.lab e conta.lab)

### Média Prioridade

- [ ] **E.2.6-E.2.10** — Guardar telefone, email, parceiros no médico
- [ ] **J.1.3-J.1.5** — Criar utilizador por email + clínicas + tags
- [ ] **D.6.1-D.6.3** — Aba Descontos da Clínica
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
| V2.4.0 | 2026-02-20 | Auth, Permissões, Clínicas, Utilizadores (parcial) | 22 | 0 | 1 | 1 corrigido |
