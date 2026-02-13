
# Atualização da Arquitetura - Melhorias de UX e Correções

## 1. Gestão de Contactos
- **Remoção do Campo Email:** A lista de contactos foi simplificada para incluir apenas **Nome/Cargo** e **Telefone**, conforme solicitado.
- **Persistência Garantida:** Reforçada a lógica de gravação individual. Agora, ao editar um contacto, o sistema emite um evento global que confirma visualmente a gravação no topo da página.

## 2. Upload de Logo (Drag & Drop)
- **Funcionalidade Arrastar:** Implementada área sensível a "drag-and-drop". Pode arrastar uma imagem diretamente para a caixa do logo.
- **Botão Remover:** Adicionado um botão "X" vermelho sobre a imagem para remover o logo facilmente.
- **Gravação Imediata:** A atualização do logo agora força um estado "dirty" no formulário e desencadeia o processo de auto-save.

## 3. Segurança e Feedback de Gravação
- **Indicador Visual Global:** Adicionada barra de estado no topo do formulário que mostra claramente:
  - 🔄 "A guardar..." (com animação)
  - ✅ "Guardado às HH:mm"
- **Proteção de Saída:** Se tentar fechar a aba ou atualizar a página enquanto o sistema está a guardar ("A guardar..."), o browser irá bloquear e pedir confirmação, prevenindo perda de dados acidental.
- **Sincronização:** O estado de gravação é partilhado entre todas as abas (Dados, Contactos, Equipa). Se gravar um contacto, o indicador global confirma "Guardado".
