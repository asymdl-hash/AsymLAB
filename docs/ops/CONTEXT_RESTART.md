# Contexto de Reinício (Session Context)

> **Regra:** Este documento deve ser lido pelo agente no início de cada sessão (após reinício do PC ou nova interação) para carregar o contexto das últimas 24h. Deve ser atualizado antes de terminar a sessão para garantir passagens de turno sem quebras.

## Estado Atual (Últimas 24h) - Versão Atual: V1.82.0
- **Foco Principal:** Finalização da secção de Definições de Laboratório (Catálogos) e integração do core de dados com os Widgets de Odontograma e Produção.
- **Módulos Concluídos/Atualizados:**
  - **Widget Dentes (Paciente):** Implementado inline, seleção de 32 dentes no odontograma com `shift+click`, ligado aos `teeth_records`.
  - **Widget Componentes (Paciente):** Implementado formulário completo (material, qtd, ref. fabricante/fornecedor). Integra automaticamente os dados dos materiais do catálogo.
  - **Catálogos (Definições):** Refatoração da tabela `milling_materials`. Adicionados novos catálogos (Marcas, Fornecedores, Fases de Produção). A ficha de material agora contém PVP, Margens, IVA, e Refs estáticas (Fabricante/Fornecedor) + Checkbox "Reunião" para debater material incompleto.
  - **Custos de Produção (Definições > Tipos Trabalho):** Tabela de custos em tempo real (Mão de Obra + Material). Fases coloridas. Cálculos de Margem operacionais e persistentes.
- **Base de Dados & Infra:** 
  - Todo o código está com commit (`V1.82.0`) e efetuado o `push` para a origin `main`.
  - Base de dados Supabase (Production) atualizada com as novas tabelas e dados inseridos usando seeds seguras via Dashboard Browser.

## Ponto de Situação e Próximos Passos
**Onde parámos?** A interface dos materiais e a atribuição aos widgets das tarefas funcionam e têm rastreabilidade completa até à origem. A base da PWA está operacional. As ligações entre catálogo e pacientes comunicam em real-time.
**Next Actions (A decidir):** 
1. Continuar a desenvolver funcionalidades focadas no fluxo da clínica (Fila de Pedidos interativa).
2. Concluir a integração 100% cloud das pastas do NAS na UI dos ficheiros dos pacientes.
3. Iniciar módulos de calendário ou chat caso a gestão do trabalho do laboratório seja considerada "Done" pelo administrador.

*(Este ficheiro está sincronizado e pode ser lido ao reiniciar a máquina para continuar exatamente de onde ficámos).*
