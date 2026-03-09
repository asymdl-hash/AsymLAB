# 🗂️ Pacientes NAS — Hierarquia e Regras

> Especificação completa da estrutura de pastas NAS para o módulo pacientes.
> Baseada na demonstração NAS criada pelo utilizador (01/03/2026).
> Última actualização: 09/03/2026

---

## 1. Hierarquia Completa

```
T-xxxx/                                          ← Só ID, sem nome
│
├── 📂 Chat Interno/
│   ├── 📂 Galeria/                              ← Anexos partilhados no chat
│   └── 📋 Metadata Do Chat Interno              ← Logs mensagens, vistas, etc.
│
├── 📂 Historico/
│   └── 📋 Metadata dos Logs                     ← Registo de tudo que aconteceu
│
├── 📂 Info/
│   ├── 📂 Alertas/
│   │   ├── 🖼️ Alerta N Anexo N.bmp             ← Imagens anexadas ao alerta
│   │   └── 📋 Metadata Alerta N                 ← Dados do alerta
│   ├── 📂 Logo/
│   │   └── 🖼️ Logo Paciente.bmp                 ← Avatar/foto
│   └── 📋 Metadata Paciente
│
└── 📂 Plano X/                                   ← Um por plano de tratamento
    │
    ├── 📂 Info Plano/                             ← Media ao nível do PLANO
    │   ├── 📂 CBCT/                              ← Volumes DICOM
    │   ├── 📂 Considerações/                     ← Considerações iniciais (nível plano)
    │   │   └── 📄 Consideração Inicial VN.pdf    ← Versionadas
    │   ├── 📂 Escala de Cor/
    │   │   ├── 📂 Escala/                        ← Fotos da escala de cor
    │   │   └── 📂 Polarizada/                    ← Fotos com filtro polarizado
    │   ├── 📂 Retrato/                           ← (antes: Face)
    │   │   ├── 📂 Repouso/
    │   │   ├── 📂 Sorriso Natural/                ← (antes: Natural)
    │   │   ├── 📂 Sorriso Máximo/                 ← (antes: Sorriso Alto)
    │   │   ├── 📂 45º/
    │   │   └── 📂 Perfil/
    │   ├── 📂 Close-up/                           ← [NOVO]
    │   │   ├── 📂 Repouso/
    │   │   ├── 📂 Sorriso Natural/
    │   │   ├── 📂 Sorriso Máximo/
    │   │   ├── 📂 Retractores Frontal/
    │   │   └── 📂 Retractores 45º/
    │   ├── 📂 Vista Oclusal/                      ← (antes: Intra-Orais)
    │   │   ├── 📂 Intraoral Superior/
    │   │   └── 📂 Intraoral Inferior/
    │   ├── 📂 45º/                                ← [NOVO] secção 45º
    │   ├── 📂 Orto-Periapical/
    │   ├── 📂 Outros/                             ← (antes: Outras Fotos)
    │   ├── 📂 Relatório Plano/                   ← Relatório global versionado
    │   │   └── 📄 Relatório Plano VN.pdf
    │   ├── 📂 Stl's/                             ← STL, OBJ, PLY
    │   └── 📋 Metadata info paciente
    │
    ├── 📂 Fase N + Título/                        ← Uma pasta por fase
    │   ├── 📂 Documentação/
    │   │   ├── 📂 Faturas/
    │   │   ├── 📂 Recibos/
    │   │   └── 📂 Outros Documentos/
    │   ├── 📂 Agendamento X + Tipo Principal + Data/
    │   │   ├── 📂 Componentes/                    ← PDF versionado
    │   │   ├── 📂 Consideração nº X/
    │   │   │   └── 📄 Consideração Médico VN.pdf ← Versionadas
    │   │   ├── 📂 Dentes/
    │   │   │   └── 📄 Registo Dentes nºX VN.pdf  ← Versionado
    │   │   ├── 📂 Fresagem/
    │   │   │   ├── 📂 CNC nºX Nome_Material/
    │   │   │   │   ├── 📂 Nesting/
    │   │   │   │   ├── 📄 CNC nºX VN.pdf        ← Versionado
    │   │   │   │   └── 🔧 .stl, .metadata, .constructionInfo, etc.
    │   │   │   └── 📂 CNC nºY Sem Info/          ← Material não escolhido
    │   │   └── 📂 Guias/
    │   │       ├── 📂 Guia Recepção/
    │   │       └── 📂 Guia Transporte/
    │   ├── 📄 Relatório Fase VN.pdf               ← Versionado
    │   └── 📋 Explicação (descrição + nota)
    │
    └── 📂 Fase Y (Não Iniciada) + Título/         ← Futuras, criadas mas vazias
```

---

## 2. Regras de Nomeação

| Regra | Correcto | Incorrecto |
|-------|----------|------------|
| Planos | `Plano X` | `Plano NºX` |
| Agendamentos | `X + Tipo + Data` | `NºX + Tipo + Data` |
| CNC Fresagem | `CNC nºX Nome_Material` | Nome longo |
| Sem informação | `Sem Info` | Vazio |

### Rename Automático
| Quando | O que muda |
|--------|-----------|
| Mudar tipo principal do agendamento | Pasta agendamento renomeia |
| Adicionar data ao agendamento | "Sem Info" → data real |
| Escolher material de fresagem | "Sem Info" → nome do material |

---

## 3. Regras de Sincronização NAS ↔ Supabase

| Dados | NAS | Supabase |
|-------|:---:|:--------:|
| Chat mensagens (todas) | ✅ Sempre | Últimas 50-100 |
| Histórico/Logs | ✅ Sempre | ✅ Sempre |
| Ficheiros (STL, CBCT, fotos) | ✅ Sempre | Thumbnails |
| Metadados (paciente, alertas) | ✅ Sempre | ✅ Sempre |
| PDFs relatórios/considerações | ✅ Sempre | Link / referência |

---

## 4. Criação Automática de Pastas

### Ao criar paciente
```
T-{id}/
├── Chat Interno/
│   └── Galeria/
├── Historico/
├── Info/
│   ├── Alertas/
│   └── Logo/
```

### Ao criar plano
```
T-{id}/Plano {n}/
├── Info Plano/
│   ├── CBCT/
│   ├── Considerações/
│   ├── Escala de Cor/
│   │   ├── Escala/
│   │   └── Polarizada/
│   ├── Retrato/
│   │   ├── Repouso/
│   │   ├── Sorriso Natural/
│   │   ├── Sorriso Máximo/
│   │   ├── 45º/
│   │   └── Perfil/
│   ├── Close-up/
│   │   ├── Repouso/
│   │   ├── Sorriso Natural/
│   │   ├── Sorriso Máximo/
│   │   ├── Retractores Frontal/
│   │   └── Retractores 45º/
│   ├── Vista Oclusal/
│   │   ├── Intraoral Superior/
│   │   └── Intraoral Inferior/
│   ├── 45º/
│   ├── Orto-Periapical/
│   ├── Outros/
│   ├── Relatório Plano/
│   └── Stl's/
```

### Ao criar fase
```
T-{id}/Plano {n}/Fase {n} + {título}/
├── Documentação/
│   ├── Faturas/
│   ├── Recibos/
│   └── Outros Documentos/
```

### Ao criar agendamento
```
T-{id}/Plano {n}/Fase {n}/Ag {n} + {tipo_principal} + {data}/
├── Componentes/
├── Dentes/
├── Fresagem/
├── Guias/
│   ├── Guia Recepção/
│   └── Guia Transporte/
```

---

## 5. Conceitos de Negócio por Pasta

### Fresagem (dentro do Agendamento)
- Cada registo CNC tem pasta própria com ficheiros CAM
- Registo criado automaticamente quando status = "Para Colocação" + escala cor
- Material = "Sem Info" até funcionário escolher via Widget Fresagem
- **Widget Fresagem implementado (V1.74.0)**: 3 estados (pendente→em_curso→concluido), dropdown materiais, check NAS, open folder
- Materiais sugeridos por frequência (clínica × médico × tipo trabalho)
- Pasta `Nesting/` para ficheiros de nesting

### Dentes (dentro do Agendamento)
- Obrigatório quando tipo trabalho tem `requires_teeth_record = true`
- PDF versionado gerado ao guardar registo
- Registo de quem criou e quem editou

### Componentes (dentro do Agendamento)
- Igual a Dentes mas para componentes

### Guias (dentro do Agendamento)
- Guia Recepção: confirmar recepção do trabalho
- Guia Transporte: enviar por WhatsApp/Email
- Se já enviada, só permite editar + reenviar
- PDFs versionados

### Considerações (dentro do Agendamento)
- Numeração por **plano** (não por fase)
- Versões: V1 (criação), V1.1 (médico edita), V2 (lab responde)
- Importação entre fases com selecção granular
- Estão no agendamento para saber quando foram atribuídas
