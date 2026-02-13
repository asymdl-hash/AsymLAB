
# Atualização da Arquitetura do Sistema - Módulo Clínicas

## Funcionalidades Implementadas

### 1. Persistência de Dados em Tempo Real (Auto-Save)
**Componentes Afetados:** `ClinicContactsList`, `ClinicDeliveryTab`, `ClinicTeamTab`, `ClinicForm`.

- **Mecanismo:** Implementado `onBlur` nos campos de input para disparar atualizações individuais (`updateRecord`).
- **Benefício:** Evita a perda de dados se o utilizador fechar a aba ou navegar sem clicar num botão "Guardar" global.
- **Sincronização:** Adicionado um `CustomEvent('clinic-updated')` para notificar a Sidebar e atualizar a lista de clínicas instantaneamente após a edição do nome.

### 2. Interface de Utilizador (UI/UX)
**Componentes Afetados:** `ClinicDeliveryTab`, `ClinicInfoTab`, `ConfirmModal`.

- **Google Maps:** Campo de URL transformado num input com botão de ação direta para abrir o mapa numa nova aba.
- **Upload de Logo:** Implementada área de "Drag & Drop" ou clique para upload de imagem.
  - *Nota Técnica:* Atualmente converte a imagem para Base64 e guarda no campo de texto `logo_url`. Para produção, recomenda-se configurar um Bucket no Supabase Storage.
- **Modais de Confirmação:** Substituídos os alertas nativos do navegador (`window.confirm`) por um componente `ConfirmModal` visualmente integrado com o design system, usado para remover contactos, entregas e membros da equipa.

### 3. Gestão de Contactos e Equipa
**Componentes Afetados:** `ClinicContactsList`, `ClinicTeamTab`.

- **Visualização em Cartões:** A lista de contactos foi redesenhada de Tabela para Cartões (Cards), melhorando a legibilidade e a consistência com as outras abas.
- **Edição Direta:** Todos os campos (Nome, Telefone, Email, Cargo) são editáveis diretamente na lista.

## Próximos Passos Recomendados

1. **Supabase Storage:** Configurar um bucket `clinics-logos` para gerir uploads de imagens de forma escalável.
2. **Validação de Links:** Adicionar validação de URL no campo Google Maps e Website.
3. **Máscaras de Input:** Implementar máscaras automáticas para NIF e Telefones.
