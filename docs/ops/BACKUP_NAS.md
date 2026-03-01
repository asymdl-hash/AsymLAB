
# Plano de Implementação: Backup, NAS e Segurança

> [!IMPORTANT]
> **Regra Operacional — Verificação de Backup:**
> Sempre que uma implementação **crie, edite ou elimine tabelas** (ou outras estruturas) no Supabase, deve-se verificar se o script de backup (`scripts/backup-supabase.js`) precisa de ser actualizado para incluir/remover essas tabelas. Consultar a lista `TABLES` no script e actualizar conforme necessário. Isto aplica-se também a alterações em storage buckets, edge functions, e RLS policies.

> [!WARNING]
> **Regra Operacional — Integridade e Sincronização de Dados:**
> Sempre que se implementem funcionalidades que leiam ou escrevam dados, verificar:
> 1. **Fonte Única de Verdade (Single Source of Truth):** Cada dado deve ter **uma única fonte** — nunca ler de um sítio e escrever noutro (ex: o bug `auth.users.phone` vs `user_profiles.phone`).
> 2. **Dados Duplicados:** Confirmar que não existem dados armazenados em dois locais diferentes sem sincronização automática.
> 3. **Dados Orphan:** Ao eliminar registos, verificar se existem referências noutras tabelas (usar `ON DELETE CASCADE` quando aplicável).
> 4. **Campos Obrigatórios:** Garantir que campos essenciais (nome, telefone, email) são populados durante o fluxo de criação do utilizador e guardados na tabela correcta (`user_profiles`).
> 5. **Migração de Dados Legacy:** Se existem dados antigos em locais diferentes (ex: `auth.users.phone`), criar um script de migração para unificar.

> [!IMPORTANT]
> **Regra Operacional — Testes Obrigatórios Pré-Commit:**
> Antes de qualquer `git commit`, o agente deve testar o fluxo alterado no browser simulando um utilizador real. Ver workflow detalhada em `.agent/workflows/pre-commit-test.md`.
>
> **Contas de Teste Exclusivas** (nunca usar contas reais de produção nos testes automáticos):
>
> | Role | Username | Password |
> |---|---|---|
> | `admin` | `test.admin` | `Teste1234` |
> | `doctor` | `test.doctor` | `Teste1234` |
> | `staff_clinic` | `test.staff.clinic` | `Teste1234` |
> | `staff_lab` | `test.staff.lab` | `Teste1234` |
> | `contabilidade_clinic` | `test.conta.clinic` | `Teste1234` |
> | `contabilidade_lab` | `test.conta.lab` | `Teste1234` |
>
> Todos os usernames acima usam o sufixo `@asymlab.app` internamente (ex: `test.admin@asymlab.app`).

---

## 1. Redundância de Dados — Backup Local ✅ IMPLEMENTADO (V1.7.0 → V1.9.0)

**Objetivo:** Manter uma cópia local (JSON) da base de dados Supabase.

### ✅ O que já está implementado:
- **Script de Backup:** `scripts/backup-supabase.js`
  - Conecta ao Supabase via `supabase-js`
  - **3 modos de backup:** FULL, INCREMENTAL e AUTO (V1.9.0)
  - Exporta todas as tabelas para JSON com paginação
  - Guarda em `F:\AsymLAB\DB\Supabase\backups\FULL_YYYY-MM-DD_HH-MM-SS\` ou `INCR_...`
  - Metadata v3.0 com tipo, timestamp, row counts, status
  - `_summary.json` para backups incrementais
  - Limpeza automática de backups antigos (retenção configurável)
  - Log em `DB\Supabase\logs\backup.log`

- **Batch Wrapper:** `scripts/backup-daily.bat`
  - Para execução via Task Scheduler ou duplo-clique

- **Configuração:** `DB\Supabase\config.json`
  - Path base, retenção, horário, lista de tabelas
  - `default_mode: "auto"` — modo de backup padrão (V1.9.0)
  - `full_backup_interval_days: 7` — consolida com FULL a cada N dias (V1.9.0)
  - Preparado para transição NAS (alterar `base_path`)

- **API Route:** `src/app/api/backup/route.ts`
  - `POST /api/backup` — trigger manual (aceita `{ mode: "full"|"incremental"|"auto" }`) (V1.9.0)
  - `GET /api/backup` — info do último backup + último FULL + contagens por tipo (V1.9.0)

- **API de Config:** `src/app/api/backup/config/route.ts`
  - `GET /api/backup/config` — ler config + lista backups + stats (total_full, total_incremental) (V1.9.0)
  - `PUT /api/backup/config` — atualizar config (inclui default_mode, full_backup_interval_days) (V1.9.0)

- **Painel de Definições:** `src/app/dashboard/settings/page.tsx`
  - `src/components/settings/BackupSettings.tsx`
  - Cards de estatísticas: total (split Full/Incr), espaço, tabelas, modo atual (V1.9.0)
  - Seletor visual de modo: Automático, Sempre Full, Sempre Incremental (V1.9.0)
  - Configuração editável (path, retenção, horário, intervalo FULL) (V1.9.0)
  - Toggle automático on/off
  - Botão "Backup Agora" com dropdown para forçar modo (V1.9.0)
  - Histórico visual com badges `FULL` (azul), `INCR` (verde), `Manual` (roxo) (V1.9.0)

### ✅ Ativação (servidor local):
- [x] Task Scheduler ativo: `AsymLAB_Backup_Supabase` — diário às 23:30
  ```powershell
  schtasks /create /tn "AsymLAB_Backup_Supabase" /tr "F:\AsymLAB\scripts\backup-daily.bat" /sc daily /st 23:30 /f /rl HIGHEST
  ```

### Tabelas monitorizadas:
| Tabela | Descrição |
|---|---|
| `clinics` | Dados das clínicas |
| `clinic_contacts` | Contactos das clínicas |
| `clinic_delivery_points` | Pontos de entrega |
| `clinic_staff` | Equipa/funcionários |
| `clinic_discounts` | Descontos |
| `organization_settings` | Configurações da organização |

> **Nota:** Ao criar novas tabelas no Supabase, adicionar ao array `tables` em `config.json` e ao array `TABLES` em `src/app/api/backup/route.ts`.

---

## 2. Migração para NAS 🔜 FUTURO (Quando NAS for adquirida)

> **Decisão (28/02/2026):** Hardware e arquitectura definidos. Implementar quando NAS for comprada.

### 2.0 — Hardware Decidido

#### Lista de Compras

| Item | Modelo | Especificação | Preço est. |
|------|--------|---------------|------------|
| **NAS** | Synology DS925+ | 4 bays, 2x 2.5GbE, M.2 NVMe slots, Docker | ~€550 |
| **Discos (Storage)** | 2x Seagate IronWolf Pro 8TB | NAS-rated, 5 anos garantia, 300TB/ano workload | ~€400 |
| **SSD Cache** | 2x Crucial T500 1TB NVMe | Cache de leitura/escrita nos slots M.2 internos | ~€160 |
| **UPS** | APC BX1600MI | 1600VA/900W, ~5h autonomia a 55W, USB auto-shutdown | ~€180 |
| **Disco Backup** | WD Elements 8TB USB | Backup air-gapped externo | ~€150 |
| | | **Total** | **~€1.440** |

#### Porquê DS925+ (Plus Series):
- **RAM expansível** — escala sem trocar NAS
- **2.5GbE** — 3x mais rápido que rede normal (STLs pesados)
- **M.2 NVMe** — SSD cache = ficheiros frequentes servidos instantaneamente
- **Docker** — pode correr o "Lab API" directamente na NAS (elimina PC)
- **4 bays** — começa com 2 discos RAID 1, adiciona mais 2 no futuro (RAID 5)

#### Porquê IronWolf **Pro** em vez de normal:
- 5 anos garantia (vs 3 anos)
- 300TB/ano workload (vs 180TB)
- Sensores de vibração para NAS multi-disco

### 2.1 — Arquitectura: Uma Só App (AsymLAB via Vercel)

> **Decisão:** NÃO teremos duas apps separadas (AsymLAB + AsymLAB LOCAL).
> A Synology Drive fornece acesso remoto aos ficheiros — o botão 📁 redireciona para o portal da NAS.

```
┌─────────────────────────────────────────────────┐
│             Supabase (Cloud)                     │
│  Base de dados principal — fonte de verdade      │
└────────────┬────────────────────────────────────┘
             │
     ┌───────▼───────┐         ┌──────────────────┐
     │   Vercel       │         │   Synology NAS    │
     │   (App única)  │         │   (DS925+)        │
     │                │         │                    │
     │  • UI completa │  📁──►  │  • Synology Drive  │
     │  • Botão 📁    │         │    (acesso remoto)  │
     │    redireciona  │         │  • Ficheiros STL   │
     │    para NAS    │         │  • Fotos/scans      │
     │  • Acessível   │         │  • Backup local     │
     │    de qualquer  │         │  • API local (Docker)│
     │    lugar        │         │                    │
     └────────────────┘         └──────────────────┘
```

**Botão 📁 — Comportamento:**
- Redireciona para URL da NAS (ex: `https://nas.asymlab.pt/Pacientes/T-0006`)
- Funciona em qualquer sítio (lab, casa, mobile)
- Sem necessidade de localhost

### 2.2 — Migração do PC actual para NAS

| Passo | Acção | Detalhes |
|-------|-------|---------|
| 1 | Instalar NAS + discos | Criar volume RAID 1, instalar DSM |
| 2 | Copiar pastas | `F:\AsymLAB\DB\Pacientes\` → `\\NAS\AsymLAB\DB\Pacientes\` |
| 3 | Activar Synology Drive | Acesso remoto via browser/app |
| 4 | Mudar path no código | **1 linha:** `PATIENTS_BASE_PATH = '\\\\NAS\\AsymLAB\\DB\\Pacientes'` |
| 5 | Mudar botão 📁 | **1 linha:** redirecionar para URL Synology Drive |
| 6 | Configurar backup air-gapped | Ver §2.3 |
| 7 | Migrar scripts de backup Supabase | PC → NAS (Node.js no Docker) |

### 2.3 — Backup Air-Gapped Automático (Protecção Anti-Ransomware)

> **Decisão:** Backup diário isolado às 1h da manhã com corte total de rede durante o processo.

**Fluxo automático (Task Scheduler da Synology):**

```
00:55  → Script desliga interface de rede da NAS (ifconfig eth0 down)
         NAS fica COMPLETAMENTE isolada — sem internet, sem rede local
         
01:00  → Monta disco USB externo (WD Elements 8TB)
         Hyper Backup executa backup incremental (só mudanças do dia)
         
01:15  → Ejecta disco USB (sync && umount)
         Disco fica fisicamente ligado mas logicamente inacessível
         
01:16  → Religa interface de rede (ifconfig eth0 up)
         NAS volta a estar acessível normalmente
```

**Janela de exposição:** ~20 minutos/dia em que o disco está montado, mas **sem rede** — impossível atacar remotamente.

**Script bash para a Synology:**
```bash
#!/bin/bash
# /volume1/scripts/airgap-backup.sh

# 1. Desligar rede
ifconfig eth0 down
sleep 10

# 2. Montar USB e fazer backup (Hyper Backup faz via API)
# O Hyper Backup é agendado separadamente para 01:00

# 3. Esperar pelo backup (estimativa 15 min)
sleep 900

# 4. Ejectar USB
sync
umount /volumeUSB1/usbshare

# 5. Religar rede
ifconfig eth0 up
```

**Impacto:** Durante ~20 min às 1h da manhã, ninguém acede à NAS. Sem impacto real.

### 2.4 — Configuração UPS + NAS

| Configuração | Detalhe |
|-------------|---------|
| Cabo USB | UPS → NAS (porta USB) |
| DSM → Energy | Activar "Quando UPS atinge nível crítico → Desligar NAS em segurança" |
| DSM → Startup | "Ligar automaticamente quando eletricidade volta" ✅ |
| Autonomia | ~5h com NAS + router a 55W |

### ⚠️ Nota: Supabase Storage NÃO será usado

> **Decisão (28/02/2026):** Ficheiros de pacientes ficam na NAS local, **não** no Supabase Storage.
> **Razão:** Custo de storage cloud seria demasiado elevado para o volume de STLs, fotos e scans esperado.

### ⚠️ Dependências para implementar:
- [ ] NAS adquirida e instalada no laboratório
- [ ] Synology Drive activado e acessível remotamente
- [ ] Domínio/subdomínio configurado (ex: `nas.asymlab.pt`)
- [ ] Disco USB externo para backup air-gapped

### 2.5 — Estratégia de Armazenamento de Ficheiros (Decisão Arquitectural)

> **Decisão (28/02/2026):** Abordagem híbrida — thumbnails no Supabase, ficheiros completos no PC/NAS.

#### Princípio

| Tipo de ficheiro | Onde fica | Porquê |
|-----------------|-----------|--------|
| **Thumbnails** (previews pequenos) | **Supabase Storage** | Pouco espaço, carregamento rápido na ficha |
| **Ficheiros completos** (PDFs, STLs, fotos HD) | **Pasta local / NAS** | Custo zero de storage cloud |

#### Regras para Thumbnails no Supabase

- **Apenas** pacientes **activos** (não arquivados/inactivos)
- **Apenas** da **fase activa** do plano de tratamento (não fases passadas)
- Formato: JPEG comprimido, max 200x200px (~10-30KB cada)
- Quando paciente é arquivado → thumbnails **removidas** do Supabase
- Quando fase muda → thumbnails da fase anterior **removidas**, novas carregadas
- **Estimativa de espaço:** ~50 pacientes activos × 5 thumbnails × 30KB = **~7.5MB** (negligível)

#### Fluxo: Como o Médico Acede aos Ficheiros

```
AGORA (sem NAS):
┌─────────────┐                      ┌──────────────────┐
│  Médico em   │   1. Abre ficha     │  Supabase         │
│  qualquer    │ ──────────────────→  │  (thumbnails)     │
│  dispositivo │   2. Vê previews     │  JPEG 200x200     │
│  (Vercel)    │ ←──────────────────  │  Fase activa      │
│              │                      └──────────────────┘
│              │   3. Clica "Ver PDF"                      
│              │ ──── Cloudflare ───→ ┌──────────────────┐
│              │      Tunnel (grátis)  │  PC do Lab        │
│              │ ←── PDF completo ──  │  F:\DB\T-0006\   │
│              │                      │  faturas\          │
└─────────────┘                      └──────────────────┘

FUTURO (com NAS):
┌─────────────┐                      ┌──────────────────┐
│  Médico em   │   1. Abre ficha     │  Supabase         │
│  qualquer    │ ──────────────────→  │  (thumbnails)     │
│  dispositivo │   2. Vê previews     │  Fase activa      │
│  (Vercel)    │ ←──────────────────  └──────────────────┘
│              │                                           
│              │   3. Clica "Ver PDF"                      
│              │ ──── HTTPS ────────→ ┌──────────────────┐
│              │                      │  NAS (Synology)   │
│              │ ←── PDF completo ──  │  T-0006/faturas/  │
│              │   (Synology Drive)    │  fatura_01.pdf    │
└─────────────┘                      └──────────────────┘
```

#### Estrutura de Pastas por Paciente

> ⚠️ **A DEFINIR:** A organização das subpastas de cada paciente será discutida e decidida em conjunto antes da implementação.
> A estrutura actual (apenas pasta raiz `T-XXXX/`) será expandida com subpastas específicas para:
> - Informação pessoal do paciente (perfil, avatar, documentos pessoais)
> - Planos de tratamento e respectivos ficheiros
> - Faturação
> - Outros documentos

#### Implementação (Ordem)

| Passo | O quê | Quando |
|-------|-------|--------|
| 1 | Gerar thumbnails automaticamente ao upload | Próxima sprint |
| 2 | Guardar thumbnails no Supabase Storage (bucket `thumbnails`) | Próxima sprint |
| 3 | Configurar **Cloudflare Tunnel** no PC do lab | Quando faturação estiver pronta |
| 4 | API endpoint para servir ficheiros via tunnel | Quando faturação estiver pronta |
| 5 | Migrar para NAS + Synology Drive | Quando NAS for comprada |

#### Custos Estimados

| Item | Supabase (Free Tier) | Observação |
|------|---------------------|------------|
| Thumbnails | ~7.5MB de 1GB grátis | < 1% do limite |
| Cloudflare Tunnel | **Grátis** | Sem limites de tráfego |
| NAS (futuro) | **0€/mês** | Hardware já pago |

---

### 2.6 — Foto Avatar do Paciente (Feature Futura)

> **Decisão (28/02/2026):** Ao clicar no avatar de iniciais, o utilizador pode escolher uma foto do paciente.
> Funciona igual aos avatares de médicos e clínicas.

#### Fluxo

1. Utilizador clica no **avatar de iniciais** (sidebar ou hero header)
2. Abre selector de ficheiro → escolhe foto
3. App redimensiona automaticamente para **120x120px JPEG** (~5-15KB)
4. Thumbnail guardada:
   - **Supabase Storage** (bucket `patient-avatars`) — enquanto paciente **activo**
   - **NAS/Pasta local** — pasta `perfil/` dentro da pasta do paciente (ex: `T-0006/perfil/avatar.jpg`)
   - Localização exacta depende da estrutura de pastas final (§2.5 — a definir)

#### Gestão automática de storage no Supabase

| Estado do paciente | Avatar no Supabase? | Avatar na NAS? |
|-------------------|--------------------|-|
| **Activo** | ✅ Sim (thumbnail) | ✅ Sim (original) |
| **Inactivo/Arquivado** | ❌ Removido automaticamente | ✅ Mantido |
| **Reactivado/Consultado** | ✅ Re-carregado da NAS | ✅ Sim |

#### Impacto no storage

- ~100 pacientes activos × 15KB = **~1.5MB** (negligível no free tier)
- Pacientes inactivos custam **0€** no Supabase (avatar só na NAS)

---

## 3. Acesso & Segurança (Gestão de Utilizadores)
**Objetivo:** Permitir criar utilizadores para clínicas com acesso restrito e granular.

### ✅ Implementado (V1.9.0):
- **Login por Username:** Utilizadores podem fazer login com email ou username
  - Username é convertido internamente para `username@asymlab.app`
  - Campo de login aceita ambos os formatos
  - "Esqueci-me da password" só aparece para emails reais (com @)
- **API de Gestão de Utilizadores:** `src/app/api/users/route.ts`
  - `GET /api/users` — lista todos os users com profiles, roles e clínicas
  - `POST /api/users` — criar user (username ou email)
  - `PATCH /api/users` — reset password, alterar role/nome, eliminar
  - Usa `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Painel de Gestão:** `src/components/settings/UserManagement.tsx`
  - Lista de utilizadores com avatares, badges de role, tipo de login
  - Modal "Novo Utilizador" (toggle username/email, roles)
  - Modal "Resetar Password"
  - Eliminar utilizador com confirmação
  - Integrado em Definições > Utilizadores
- **Variável de Ambiente:** `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel



### ✅ Implementado (V1.10.0 / V1.10.2) — Permissões Granulares por Role:

#### 3.1 Sistema de Permissões (3 Níveis) ✅
Cada módulo da app suporta **3 níveis de acesso**, configuráveis por role:

| Nível | Descrição | Ações Permitidas |
|-------|-----------|-----------------| 
| **Sem Acesso** | Menu completamente escondido | Nada — o módulo não aparece na sidebar/navegação |
| **Só Leitura** | Pode ver mas não alterar | Ver dados, abrir imagens/ficheiros. **Não pode** editar, eliminar ou adicionar. |
| **Acesso Total** | Pode fazer tudo | Editar campos, anexar ficheiros, criar novos registos, eliminar |

**Ficheiros implementados:**
- `src/lib/permissions.ts` — Matriz de permissões, tipos, helper functions
- `src/contexts/AuthContext.tsx` — Provider global com role do user, funções hasAccess/canEdit/isReadOnly
- `src/components/PermissionGuard.tsx` — Componente reutilizável + hook `useModulePermission`
- `src/components/Sidebar.tsx` — Sidebar dinâmica com filtro de menu e badges "Leitura"
- `src/app/dashboard/page.tsx` — Dashboard protegido, botão "Novo Paciente" condicional
- `src/app/dashboard/clinics/layout.tsx` — Layout clínicas protegido com banner read-only
- `src/app/dashboard/settings/page.tsx` — Definições restritas a Admin
- `src/components/clinics/ClinicForm.tsx` — Formulário com `<fieldset disabled>` para read-only

#### 3.2 Módulos controlados: ✅ (Atualizado V1.8.0)
| Módulo | Admin | Médico | Utilizador Clínica | Staff Clínica | Staff Lab |
|--------|-------|--------|-------------------|---------------|----------|
| Dashboard | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ✅ Total |
| Clínicas | ✅ Total | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura |
| Pacientes | ✅ Total | ✅ Total* | 👁️ Leitura | 👁️ Leitura | 👁️ Leitura |
| Agenda | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |
| Faturação | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |
| Relatórios | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |
| Definições | ✅ Total | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso | ❌ Sem Acesso |

> *Médico tem acesso total mas apenas aos pacientes que lhe estão associados (ver §3.3)

#### 3.3 ✅ RLS (Row Level Security) no Supabase — IMPLEMENTADO (V1.11.0):
Regras de visibilidade dos dados — **quem vê o quê:**

```
Hierarquia de acesso (implementada V1.8.0):
├── Admin (app_role='admin') → Vê TUDO, edita TUDO
├── Médico (app_role='doctor') → Vê clínicas e pacientes associados
├── Utilizador Clínica (app_role='clinic_user') → Vê clínicas associadas (leitura)
├── Staff Clínica (app_role='staff_clinic') → Vê clínicas associadas (leitura)
└── Staff Lab (app_role='staff_lab') → Dashboard + clínicas + pacientes (leitura)
```

**Helper Functions criadas:**
- `get_user_role()` — Retorna o app_role do utilizador autenticado
- `is_admin()` — Verifica se é admin
- `get_user_clinic_ids()` — Retorna IDs das clínicas associadas ao user

**Tabelas protegidas com RLS:**
| Tabela | RLS | Policies | Lógica |
|--------|-----|----------|--------|
| `user_profiles` | ✅ | 7 | User vê o seu, Admin vê todos |
| `user_clinic_access` | ✅ | 4 | User vê as suas associações, Admin vê todas |
| `clinics` | ✅ | 6 | Admin vê todas, outros só clínicas associadas |
| `clinic_contacts` | ✅ | 5 | Segue a clínica-mãe |
| `clinic_delivery_points` | ✅ | 5 | Segue a clínica-mãe |
| `clinic_staff` | ✅ | 5 | Segue a clínica-mãe |
| `clinic_discounts` | ✅ | 5 | Segue a clínica-mãe |
| `organization_settings` | ✅ | 3 | Qualquer autenticado lê, só Admin edita |

**Ficheiro de migração:** `supabase/migrations/20260215_rls_policies.sql`

> **Nota:** As API routes usam `service_role_key` que bypassa RLS. As policies aplicam-se ao client Supabase (anon key) usado pelo frontend.
> **⏳ Futuro:** Quando a tabela de pacientes migrar para Supabase, será necessário criar policies adicionais para filtrar por médico associado.

#### 3.4 ✅ Convite por Clínica — IMPLEMENTADO:
- ✅ Tab "Segurança & Acessos" na ficha da clínica (`ClinicSecurityTab.tsx`)
- ✅ Criar utilizador com username (para staff sem email pessoal)
- ✅ Associa automaticamente o `clinic_id` ao novo utilizador
- ✅ Envio de credenciais via WhatsApp (`handleSendWhatsApp`)
- ✅ Copiar credenciais para clipboard
- ✅ Remover acesso de utilizador à clínica
- ✅ Edge Function: `supabase/functions/invite-clinic-user`

#### 3.5 🔜 Contactos Inteligentes + Role Contabilidade (FUTURO):

##### Contactos da Clínica (aba Dados)
O bloco "Contactos" na aba Dados deve mostrar automaticamente os membros da equipa marcados como contacto, em vez de inserção manual duplicada.

**Abordagem:** Adicionar flag `is_contact` + `contact_phone` à tabela `user_clinic_access`:
```
user_clinic_access (alteração)
├── is_contact (boolean, default false) ← membro aparece nos contactos?
└── contact_phone (text, nullable)      ← telefone para contacto logístico
```

- Na **aba Equipa**: toggle "Contacto da Clínica" ao lado de cada membro
- Na **aba Dados → Contactos**: lista automática de membros com `is_contact = true` + contactos manuais existentes
- Badges: `Membro` (automático) vs `Manual` (inserido à mão)

> **Nota:** Esta abordagem substitui a ideia de multi-role. Um médico pode ser `is_contact = true` sem precisar de dois roles — mantém o `app_role` principal e aparece nos contactos.

##### Contactos por Local de Entrega
Cada ponto de entrega deve poder ter contacto(s) associado(s):
- **Escolher da lista** (membros com `is_contact = true`)
- **Ou adicionar manualmente** (pessoa externa)

##### Role Contabilidade (quando Faturação existir)
- Novo role `accountant` para contabilistas de clínicas
- Acesso apenas ao módulo de **Faturação** e **Relatórios** (leitura + exportação)
- **Sem acesso** a pacientes, clínicas ou definições
- **Implementar quando:** módulo de Faturação estiver funcional

| Módulo | Contabilidade |
|--------|:---:|
| Dashboard | ❌ Sem Acesso |
| Clínicas | ❌ Sem Acesso |
| Pacientes | ❌ Sem Acesso |
| Agenda | ❌ Sem Acesso |
| Faturação | 👁️ Leitura + Exportação |
| Relatórios | 👁️ Leitura + Exportação |
| Definições | ❌ Sem Acesso |

---

## 4. Login ✅ IMPLEMENTADO (V1.9.0)
- ~~Remover opção de "Sign Up" público no componente de Login.~~ ✅ Já não existe
- ~~Manter apenas "Sign In" e "Esqueci a Password".~~ ✅ Implementado
- ✅ Login aceita email ou username
- ✅ "Esqueci a Password" condicional (só para emails reais)

### ✅ Implementado (V1.9.4):
- ✅ **Ícone de ajuda (ℹ️) no campo "Email ou Username":**
  - Ícone `HelpCircle` clicável ao lado da label
  - Ao clicar, abre popover com explicação
  - Fecha ao clicar fora ou no X
  - Design discreto e responsivo

---

## Arquitetura dos Ambientes

```
┌─────────────────────────────────────────────────┐
│             Supabase (Cloud)                     │
│  Base de dados principal — fonte de verdade      │
│  Auth, Storage, RLS, Edge Functions              │
└────────────┬──────────────────┬──────────────────┘
             │                  │
     ┌───────▼───────┐  ┌──────▼───────────────┐
     │   Vercel       │  │   Servidor Local      │
     │   (Produção)   │  │   (PC/NAS)            │
     │                │  │                        │
     │  • App online  │  │  • App local           │
     │    24/7         │  │  • Backups automáticos │
     │  • Acessível   │  │  • Task Scheduler      │
     │    de qualquer  │  │  • Dados locais        │
     │    lugar        │  │    (redundância)       │
     └────────────────┘  └────────────────────────┘
```

---

## 5. Backup Incremental ✅ IMPLEMENTADO (V1.9.0)

**Objetivo:** Sistema inteligente que só descarrega dados alterados desde o último backup, poupando tempo, banda e espaço.

### ✅ O que foi implementado:

#### 5.1 Migração SQL (Supabase)
- Função trigger reutilizável `handle_updated_at()` em todas as tabelas
- Coluna `updated_at` adicionada a: `clinics`, `clinic_contacts`, `clinic_delivery_points`, `clinic_staff`, `clinic_discounts`, `organization_settings`, `user_clinic_access`
- Migração aplicada via MCP: `add_updated_at_to_all_tables`

#### 5.2 Lógica de 3 Modos (Script + API)

| Modo | Comportamento |
|------|---------------|
| **AUTO** (padrão) | FULL se sem base ou último FULL > N dias, senão INCREMENTAL |
| **FULL** | Backup completo de todas as tabelas + infraestrutura |
| **INCREMENTAL** | Só dados alterados desde o último backup (added/modified/deleted) |

#### 5.3 Estrutura de pastas:
```
backups/
├── FULL_2026-02-15_23-30/       ← Backup base completo
│   ├── tabela.json              (todos os registos)
│   ├── _metadata.json           (version: 3.0, type: "full")
│   └── _infrastructure/         (schema, auth, RLS, functions)
│
├── INCR_2026-02-16_23-30/       ← Apenas diferenças
│   ├── tabela.json              { added: [], modified: [], deleted_ids: [] }
│   ├── _metadata.json           (type: "incremental", base_backup, since)
│   └── _summary.json            (contagem de mudanças por tabela)
│
└── FULL_2026-02-22_23-30/       ← Consolidação semanal automática
```

#### 5.4 Ficheiros modificados:
| Ficheiro | Versão |
|----------|--------|
| `scripts/backup-supabase.js` | Reescrito com 3 modos, CLI `--mode` |
| `src/app/api/backup/route.ts` | POST aceita `{ mode }`, GET retorna info FULL/INCR |
| `src/app/api/backup/config/route.ts` | Novos campos: `default_mode`, `full_backup_interval_days` |
| `DB/Supabase/config.json` | `default_mode: "auto"`, `full_backup_interval_days: 7` |
| `src/components/settings/BackupSettings.tsx` | Badges, dropdown, seletor de modo, stats por tipo |

---

## 6. Optimização de Performance ✅ PARCIAL (V1.9.1)

**Objetivo:** Maximizar a velocidade da app na Vercel e Supabase.

### ✅ Implementado (V1.9.1):

#### 6.1 Indexes no Supabase
Adicionados indexes de `clinic_id` nas tabelas filhas para acelerar queries de filtro:
- `idx_clinic_contacts_clinic` → `clinic_contacts(clinic_id)`
- `idx_clinic_delivery_points_clinic` → `clinic_delivery_points(clinic_id)`
- `idx_clinic_staff_clinic` → `clinic_staff(clinic_id)`
- `idx_clinic_discounts_clinic` → `clinic_discounts(clinic_id)`

> Migração: `add_performance_indexes`

#### 6.2 Edge Runtime (API Routes)
3 API routes migradas para Edge Runtime (elimina cold starts de 1-3s):
- `src/app/api/users/route.ts` → `export const runtime = 'edge'`
- `src/app/api/users/clinic-access/route.ts` → `export const runtime = 'edge'`
- `src/app/api/my-account/route.ts` → `export const runtime = 'edge'`

> **Nota:** As routes de backup (`/api/backup/*`) usam `fs` e `child_process` — incompatíveis com Edge Runtime.

### 🔜 Reavaliação Futura (quando a app crescer):

| Área | Quando reavaliar | O que analisar |
|------|------------------|----------------|
| **Caching (revalidate)** | Se migrar para Server Components | Aplicar `revalidate` nas páginas que mudam pouco |
| **Bundle Size** | Se adicionar novas libs pesadas | Correr `npx @next/bundle-analyzer` |
| **Connection Pooling** | Se usar ORM (Prisma/Drizzle) | Configurar PgBouncer no Supabase |
| **Supabase Pro ($25/mês)** | Se ultrapassar 500MB dados ou 5GB bandwidth | Avaliar necessidade |
| **Vercel Pro ($20/mês)** | Se API routes demorarem >10s ou precisar de builds paralelas | Avaliar necessidade |

> **Análise completa:** Ver relatório detalhado na conversa de 15/02/2026.

---

## Prioridades Atualizadas (27/02/2026 — V1.50.1)
1. ~~Implementar script de backup~~ ✅ V1.7.0
2. ~~Painel de backups nas Definições~~ ✅ V1.7.0
3. ~~Implementar gestão de utilizadores~~ ✅ V1.9.0
4. ~~Login por username~~ ✅ V1.9.0
5. ~~Ícone de ajuda no login~~ ✅ V1.9.4
6. ~~Sistema de permissões granulares~~ ✅ V1.10.0 / V1.10.2
7. ~~RLS policies no Supabase~~ ✅ V1.11.0
8. ~~Convite por clínica~~ ✅ (ClinicSecurityTab + Edge Function)
9. ~~Novos roles (Staff Lab, Staff Clínica) + Avatar~~ ✅ V1.8.0
10. ~~Ativar Task Scheduler no servidor local~~ ✅ (operacional — configurado via Wizard)
11. ~~Backup Incremental~~ ✅ V1.9.0 (FULL/INCR/AUTO com updated_at triggers)
12. ~~Optimização de Performance~~ ✅ V1.9.1 (Indexes + Edge Runtime)
13. ~~Módulo Pacientes MVP~~ ✅ V1.10–V1.50.1 (~96% completo)
14. ~~Anti-Duplicação Levenshtein~~ ✅ V1.42.0
15. ~~Lifecycle Planos (6 estados)~~ ✅ V1.24.0
16. ~~Lifecycle Fases (4 estados + sequencial)~~ ✅ V1.30.0
17. ~~Agendamentos UI (6 tipos, 7 estados)~~ ✅ V1.32.0 + V1.43.0
18. ~~Considerações V2 (templates, versioning, share, lab inside)~~ ✅ V1.38–V1.40
19. ~~Multi-Badge (33 status, 6 categorias)~~ ✅ V1.35.0
20. ~~Fila Kanban (drag & drop, filtros)~~ ✅ V1.27–V1.29
21. ~~Guias Transporte + Recepção~~ ✅ V1.37 + V1.44
22. ~~Facturação Base (invoices, receipts)~~ ✅ V1.36.0
23. ~~Catálogos (5 sub-tabs CRUD, seed data)~~ ✅ V1.41.0
24. ~~Light/Dark Mode toggle por utilizador~~ ✅ V1.45–V1.47
25. ~~Hero headers gradient (paciente + fila)~~ ✅ V1.49–V1.50
26. [x] Módulo Médicos — Base (V1.13.0)
27. ~~Permissões granulares pacientes~~ ✅ V1.52.0
28. ~~Médicos associados N:N (UI chips)~~ ✅ V1.52.0
29. ~~Materiais por fase (UI inline)~~ ✅ V1.52.0
30. ~~Responsividade mobile/tablet~~ ✅ V1.53.0
31. ~~Modal facturação por fase~~ ✅ V1.55.0
32. ~~Acções rápidas no Kanban~~ ✅ V1.56.0
33. ~~Auto-transições multi-badge (SQL triggers)~~ ✅ V1.57.0
34. ~~Export PDF considerações~~ ✅ V1.58.0
35. ~~Contactos Inteligentes~~ ✅ (já implementado — ClinicContactsList + ClinicDeliveryTab)
36. [ ] Role Contabilidade (quando Faturação existir — ver §3.5)
37. [ ] Migração NAS (quando adquirida)
38. [ ] Reanálise de Performance (quando app crescer — ver §6)
39. [ ] Módulo Médicos — Analytics (ver §7)
40. [ ] Módulo Médicos — WhatsApp Permissions (ver §8)
41. ~~Sidebar Reordenável por Utilizador~~ ✅ V1.59.0
42. ~~Thumbnails ficheiros (previews no DocumentsTab)~~ ✅ V1.60.0
43. ~~Lock optimista (concorrência multi-user)~~ ✅ V1.61.0

---

## 7. Módulo Médicos — Analytics 🔜 (FUTURO)

**Objetivo:** Dashboard analítico na aba Analytics do perfil do médico.

### Métricas sugeridas:
- Total de pacientes ativos / inativos
- Nº de consultas por período
- Taxa de adesão ao tratamento
- Evolução de novos pacientes por mês
- Distribuição por clínica
- Tempo médio de tratamento

> **Implementar quando:** módulo de Pacientes e Agenda estiverem completos com dados reais.

---

## 8. Módulo Médicos — WhatsApp Permissions 🔜 (FUTURO)

**Objetivo:** Configurar permissões granulares de WhatsApp por médico.

### Funcionalidades planeadas:
- Toggle global: Z-API ignora / avisa / responde
- Controlo por comando @ (ex: @iniciar, @ficheiro, etc.)
- Notificações: ativar/desactivar tipos específicos
- Modo "Férias" — Z-API responde automaticamente com mensagem pré-definida

### Tabela sugerida:
```sql
CREATE TABLE doctor_whatsapp_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command TEXT NOT NULL,             -- ex: '@iniciar', '@ficheiro', 'global'
  action TEXT DEFAULT 'respond',     -- 'ignore', 'warn', 'respond'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

> **Implementar quando:** sistema de comandos WhatsApp estiver estabilizado.

---

## 9. Email de Contacto vs Email de Login ✅ (V1.13.1)

**Objetivo:** Separar o email de login do email de contacto para permitir comunicações com utilizadores criados por username.

### Conceito

| Tipo de conta | Email de Login | Email de Contacto |
|---|---|---|
| **Criada por Email** | `user@gmail.com` | Auto-preenchido = `user@gmail.com` |
| **Criada por Username** | `username@asymlab.app` (virtual) | Vazio — editável na ficha |

### Regras
1. `contact_email` é uma coluna em `user_profiles`
2. Para utilizadores por email, o `contact_email` é **auto-preenchido** na criação
3. Para utilizadores por username, o `contact_email` é **editável** na ficha do médico
4. O `contact_email` é usado para **comunicações** (notificações, relatórios, etc.)
5. O email de login nunca é exposto na ficha do médico

### Migração SQL
```sql
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;
-- Auto-preencher para contas email existentes
UPDATE public.user_profiles up
SET contact_email = au.email
FROM auth.users au
WHERE up.user_id = au.id
  AND au.email NOT LIKE '%@asymlab.app'
  AND up.contact_email IS NULL;
```

### Implementação futura
- [ ] Auto-preencher `contact_email` na criação de novos utilizadores por email (UserManagement)
- [ ] Usar `contact_email` para envio de emails/notificações
- [ ] Validar unicidade do email de contacto (opcional)

---

## 10. Manutenção Técnica — Itens Pendentes (Setup 18/02/2026)

> [!IMPORTANT]
> Estes itens foram identificados durante o setup do novo PC (V2.2.2) e devem ser resolvidos antes de avançar para novas funcionalidades.

### 10.1 — ~~`config.json` desactualizado (Backup)~~ ✅ RESOLVIDO (V2.2.4)
- `doctor_profiles` removida de `config.json` e da função `createDoctorProfile` em `doctorsService.ts`
- Decisão: tabela não vai ser criada — `specialty` e `license_number` não são necessários no projecto

### 10.2 — ~~Coluna `updated_at` em falta (`delivery_point_contacts`)~~ ✅ RESOLVIDO (V2.2.4)
- Coluna `updated_at` adicionada via SQL Editor do Supabase Dashboard
- Trigger `handle_updated_at_delivery_point_contacts` criado automaticamente

### ~~10.3 — Telefone desincronizado (`ivoassistente@asymlab.app`)~~ ✅ RESOLVIDO (V2.3.0)
- Arquitectura phone reformulada: `auth.users.phone` é agora o Master e `user_profiles.phone` o Mirror (via trigger)
- Trigger `sync_auth_phone_to_profile` activo em produção
- Dados do Ivo corrigidos manualmente via SQL (19/02/2026)

### ~~10.4 — Advisors Supabase (Segurança & Performance)~~ ✅ RESOLVIDO (V2.3.1, 20/02/2026)

#### Segurança — todos resolvidos
| Problema | Qtd | Estado |
|----------|-----|--------|
| `function_search_path_mutable` | 12 funções | ✅ Migration `security_fix_function_search_path` |
| `rls_policy_always_true` | 5 tabelas | ✅ Migration `security_fix_rls_policies_tables` |
| `multiple_permissive_policies` | 16 policies | ✅ Limpeza via SQL directo |
| `auth_leaked_password_protection` | Global | ⚠️ **Só disponível no Supabase Pro** — ver secção 12 |

#### Performance — todos resolvidos
| Problema | Qtd | Estado |
|----------|-----|--------|
| `unindexed_foreign_keys` | 4 FKs | ✅ Migration `perf_add_missing_fk_indexes` |
| `auth_rls_initplan` | 5 policies | ✅ Incluído nas migrations de RLS |
| `unused_index` | 3 índices | ✅ Removidos via SQL directo |

> **Referência:** [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

## 11. Arquitectura do Phone — Regra Permanente ✅ IMPLEMENTADO (V2.3.0)

> [!IMPORTANT]
> **Regra Arquitectural — Phone (Telefone):**
> `auth.users.phone` é **sempre** a fonte de verdade (master). `user_profiles.phone` é **sempre** um mirror sincronizado.
> Esta regra aplica-se a **todos os utilizadores**, independentemente do método de registo (email, username, convite).
> **Nunca** permitir edição directa do `user_profiles.phone` sem passar pela API protegida.

### Conceito

| Campo | Localização | Papel |
|-------|-------------|-------|
| `phone` | `auth.users` | **Master** — fonte de verdade. Só editável via API com `service_role_key` (admin) |
| `phone` | `user_profiles` | **Mirror** — cópia automática. Nunca editado directamente pelo frontend |

### Comportamento por cenário (universalmente aplicável)

| Cenário | auth.phone | profile.phone | Comportamento na app |
|---------|-----------|--------------|----------------------|
| **Sem número** | `null` | `null` | Campo editável → ao gravar, actualiza **ambos** via API |
| **Auth tem, profile não** | `914xxxxxx` | `null` | Trigger copia automaticamente. Campo bloqueado (read-only) |
| **Ambos preenchidos** | `914xxxxxx` | `914xxxxxx` | Campo bloqueado (read-only) |
| **User tenta editar campo bloqueado (tem permissão admin)** | — | — | Modal: "Só editável em Definições → Utilizadores" + link directo para esse utilizador |
| **User tenta editar campo bloqueado (sem permissão)** | — | — | Modal: "Sem permissão. Contacta o administrador." |

### Implementação técnica — 3 componentes

#### A) Trigger PostgreSQL (automático — permanente)
Quando admin actualiza `auth.users.phone` nas Definições → espelha para `user_profiles.phone`:

```sql
CREATE OR REPLACE FUNCTION sync_auth_phone_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE public.user_profiles SET phone = NEW.phone WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_phone_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_phone_to_profile();
```

#### B) API Route server-side (`/api/users/phone`)
O frontend **não consegue ler `auth.users.phone` directamente** (protegido pelo Supabase).
Criamos uma API route com `SUPABASE_SERVICE_ROLE_KEY`:

- `GET /api/users/[id]/phone` → devolve `{ hasAuthPhone: boolean }` (sem expor o número)
- `POST /api/users/[id]/phone` → actualiza `auth.users.phone` + `user_profiles.phone` em simultâneo (só admin)

#### C) Lógica no componente de perfil (ficha do utilizador)
1. Ao carregar a ficha → chama `GET /api/users/[id]/phone`
2. Se `hasAuthPhone = true` → campo phone bloqueado (read-only) + ícone de cadeado + link
3. Se `hasAuthPhone = false` → campo editável → ao gravar chama `POST /api/users/[id]/phone`
4. Verificação de role: se `app_role === 'admin'` → link para Definições → Utilizadores → perfil; caso contrário → "Contacta o administrador"

### Estado de implementação

| Componente | Estado |
|-----------|--------|
| Correcção imediata (`ivoassistente@asymlab.app`) | ✅ Feito (SQL directo, 19/02/2026) |
| Trigger PostgreSQL | ✅ Activo em produção |
| API Route `/api/users/[id]/phone` | ✅ `GET` + `POST` implementados |
| Frontend `DoctorDataTab` — campo bloqueado + modal | ✅ Implementado (V2.3.0) |

### ✅ Testes validados manualmente (20/02/2026)

| # | Cenário | Resultado |
|---|---------|----------|
| 1 | **Admin sem phone** (Fabio Dias) | ✅ Campo editável + placeholder `9XX XXX XXX` |
| 2 | **Admin vê doctor com phone** (Dr. João Alves) | ✅ Campo 🔒 + "Alterar nas Definições →" |
| 3 | **Staff sem permissão** (Ivo Assistente) | ✅ Campo 🔒 + "Contactar administrador" + banner "Modo Leitura" |

---

## 12. Upgrade Supabase Pro 🔜 FUTURO

> [!NOTE]
> A funcionalidade de **Leaked Password Protection** (integração com HaveIBeenPwned.org) está disponível apenas no **plano Pro** do Supabase. Activar quando for feito o upgrade.

### O que fica desbloqueado no Pro:
- **`auth_leaked_password_protection`** — verifica se as passwords dos utilizadores estão em bases de dados de fugas conhecidas
- Activar em: Supabase Dashboard → Authentication → Sign In / Up → **Password Strength** → Leaked passwords protection: `ON`

### Outros benefícios do Pro relevantes para o AsymLAB:
- Backups diários automáticos (actualmente só temos o nosso script custom)
- PITR (Point-In-Time Recovery)
- Mais throughput de API
- SLA garantido

- **Prioridade:** Futura — considerar quando a clínica tiver utilizadores reais em produção
