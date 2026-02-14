# 📋 AsymLAB - Roadmap & Decisões

**Última atualização:** 2026-02-13

---

## 🎯 Funcionalidades Implementadas

### ✅ V1.1.0 - Módulo de Clínicas (2026-02-13)
- [x] CRUD completo de clínicas
- [x] Upload de logo com drag-and-drop
- [x] Gestão de contactos (Nome, Telefone)
- [x] Gestão de pontos de entrega (Smart Maps URL)
- [x] Gestão de equipa
- [x] Gestão de descontos
- [x] Auto-save com debounce e feedback visual
- [x] Proteção contra saída com alterações pendentes
- [x] Smart Maps URL UI (ícone interativo)

---

## 🚧 Em Implementação

### 🔐 Sistema de Acesso & Segurança (V1.2.0 - Em curso)
**Status:** Em desenvolvimento  
**Responsável:** Gemini + User  

**Tarefas:**
- [ ] Criar tabelas base (`user_profiles`, `user_clinic_access`)
- [ ] Implementar Edge Function `/api/admin/invite-clinic-user`
- [ ] Criar aba "Acesso & Segurança" no ClinicForm
- [ ] Aplicar RLS policies básicas
- [ ] Atualizar página de login (remover Sign Up público)

**Arquitetura Decidida:**
- User Metadata: `{ app_role: 'admin' | 'clinic_user' | 'doctor' | 'staff' }`
- Tabela `user_profiles` para dados adicionais
- Tabela `user_clinic_access` para associações clinic_user ↔ clinic
- RLS dinâmico baseado em role

---

## 📅 Backlog (Por Implementar)

### 🏥 Módulo de Médicos
**Prioridade:** Alta (após Acesso & Segurança)

**Funcionalidades:**
- [ ] CRUD de médicos
- [ ] Associação médico → clínica(s)
- [ ] Associação médico → colaboradores
- [ ] Relação many-to-many: médico ↔ pacientes

**Tabelas a criar:**
```sql
- doctor_profiles
- doctor_clinic_assignments (médico → clínica)
- doctor_staff_assignments (médico → colaboradores)
- patient_care_team (paciente → médicos/colaboradores)
```

---

### 👥 Sistema de Permissões Granulares
**Prioridade:** Média

**Decisão Pendente:** Aguarda implementação do módulo Médicos

**Conceito:**
- Aba "Permissões" em cada clínica
- Configurações:
  - Clinic User pode editar pacientes? (Sim/Não)
  - Campos editáveis específicos (multi-select)
  - Médicos/Clínicas podem ter diferentes níveis de acesso
- Tabela: `clinic_user_permissions` ou `role_based_permissions`

**Questões em aberto:**
- Granularidade: Por campo? Por módulo? Por ação (CRUD)?
- UI: Checkboxes? Matrix de permissões?

---

### 📊 Módulo de Relatórios
**Prioridade:** Baixa

**Aguarda definição:**
- Que relatórios são necessários?
- Financeiros? Clínicos? Operacionais?

---

### 💾 Backup Local (NAS)
**Prioridade:** Média  
**Status:** Planeado (Ver `docs/future_features_plan.md`)

**Tarefas:**
- [ ] Criar script Node.js `scripts/sync-db-local.ts`
- [ ] Conectar ao Supabase e descarregar dados
- [ ] Guardar JSON estruturado em `F:\AsymLAB\DB\`
- [ ] Configurar Task Scheduler (Windows) para automação noturna

---

## ❓ Decisões Pendentes

### 1. Staff - Restrições de Acesso
**Contexto:** Staff vê todos os pacientes, mas tem limitações em módulos/funcionalidades  
**Decisão:** 🔴 **Por decidir**

**Opções:**
- A. Lista fixa de módulos permitidos (hardcoded)
- B. Sistema de permissões granulares (tabela `staff_permissions`)
- C. Híbrido: Defaults + overrides por utilizador

---

### 2. Doctors - Workflow e Funcionalidades
**Contexto:** Médicos acedem ao módulo Pacientes + possivelmente Notas Clínicas  
**Decisão:** 🔴 **Aguarda explicação do user**

**Questões:**
- Que módulos específicos?
- Working notes? Prescrições? Histórico clínico?
- Integração com sistema de agendamento?

---

### 3. Clinic Users - Campos Editáveis
**Contexto:** Clinic users veem pacientes mas com capacidade de edição limitada  
**Decisão:** 🟡 **Parcialmente decidido**

**Acordado:**
- Read-only por defeito
- Alguns campos específicos editáveis (a definir)
- Configuração na aba "Permissões" da clínica

**Por decidir:**
- Que campos específicos?
- Como gerir conflitos (2 users editam simultaneamente)?

---

## 🐛 Bugs Conhecidos

### Linting Errors (Não bloqueantes)
**Status:** 🟡 Conhecidos, não impedem funcionalidade

- `Cannot find module 'react-hook-form'` (TypeScript config issue)
- `Cannot find module 'lucide-react'` (TypeScript config issue)
- `Cannot find namespace 'NodeJS'` (falta @types/node)
- Button `size` e `variant` props type errors (shadcn/ui config)

**Ação:** Resolver quando tiver tempo de ajustar tsconfig.json e instalar @types faltantes.

---

## 📝 Implementações Parciais

### Logo Upload
**Status:** ✅ Funcional (Base64)  
**Limitação:** Apenas Base64, não usa Supabase Storage

**Próximos passos (quando necessário):**
- Configurar Supabase Storage bucket `clinic-logos`
- Atualizar `ClinicInfoTab` para upload real
- Implementar CDN/caching

---

## 🗂️ Referencias Úteis

- **Documentação Supabase Auth:** https://supabase.com/docs/guides/auth
- **RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security
- **Edge Functions:** https://supabase.com/docs/guides/functions

---

## 📊 Métricas de Desenvolvimento

**Total de Módulos:** 2 (Dashboard, Clínicas)  
**Total de Tabelas:** 7 (clinics, clinic_contacts, clinic_delivery_points, clinic_staff, clinic_discounts, organization_settings, + auth tables)  
**Versão Atual:** V1.1.0  
**Próxima Release:** V1.2.0 (Acesso & Segurança)
