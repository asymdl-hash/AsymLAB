
# Resumo das Correções de Estabilidade e UX

## 1. Problema: "Não consigo editar os campos"
**Causa Identificada:**
O sistema de auto-save disparava um evento global (`clinic-updated`) a cada gravação (debounce de 1.5s). Este evento forçava a Sidebar a recarregar, o que por sua vez causava um "soft refresh" da página via Next.js Router ou remount do componente pai. Resultado: O formulário era reiniciado e o cursor perdia o foco enquanto o utilizador ainda estava a escrever.

**Solução Aplicada:**
- **Removido o refresh global continuo:** O `handleAutoSave` agora guarda os dados silenciosamente sem recarregar a Sidebar.
- **Refresh Cirúrgico:** O evento `clinic-updated` (que atualiza o nome na barra lateral) agora é disparado **apenas** quando o utilizador sai (`onBlur`) do campo "Nome Comercial". Isto garante que a lista de clínicas está sempre atualizada sem interromper o fluxo de escrita noutros campos.

## 2. Problema: "Aviso de erro ao sair da página"
**Causa Identificada:**
Havia um `alert()` nativo do browser dentro do bloco `catch` em componentes como `ClinicContactsList`. Se uma gravação falhasse (por exemplo, ao navegar para fora da página interrompendo o pedido de rede), o alerta bloqueava a navegação e assustava o utilizador.

**Solução Aplicada:**
- **Remoção de Alertas Nativos:** Todos os `alert("Erro...")` foram removidos.
- **Tratamento Silencioso:** Erros de gravação são registados na consola. O utilizador já tem feedback visual através do indicador global "🔄 A guardar..." / "✅ Guardado". Se o "Guardado" não aparecer, o utilizador sabe que houve problema, sem janelas intrusivas.

## 3. Melhoria Técnica: Acesso a Dados (React Hook Form)
- Substituído o uso instável de `control._formValues` (API interna) por `getValues()` e `watch()` (API pública).
- Isto garante que ao editar Contactos ou Pontos de Entrega, o ID correto do registo na base de dados é sempre utilizado, prevenindo erros de "Registo não encontrado" ou "Erro ao guardar".

## Estado Atual
O sistema deve agora permitir edição fluida sem perdas de foco, com feedback visual claro e sem interrupções por pop-ups de erro.
