---
description: Acesso directo ao Supabase Dashboard via browser — executar SQL, criar buckets, gerir storage e configurações
---

# Acesso ao Supabase via Browser

Quando o Supabase MCP não estiver disponível ou falhar (connection closed, timeout, etc.), 
usa o **browser** para aceder directamente ao Supabase Dashboard.

## Dados do Projecto

- **Project ID**: `kfnrstxrhaetgrujyjyk`
- **Dashboard URL**: `https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk`

## URLs Directas

| Recurso | URL |
|---------|-----|
| SQL Editor | `https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk/sql/new` |
| Storage Buckets | `https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk/storage/buckets` |
| Table Editor | `https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk/editor` |
| Auth Users | `https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk/auth/users` |
| Database Settings | `https://supabase.com/dashboard/project/kfnrstxrhaetgrujyjyk/settings/database` |

## Procedimento SQL Editor

// turbo-all

1. Navegar para o SQL Editor URL (acima)
2. Clicar em "New Query" se necessário
3. Usar JavaScript do Monaco editor para injectar SQL (autocomplete pode interferir com typing directo)
   ```js
   const editor = document.querySelector('.monaco-editor');
   const monacoEditor = editor.__proto__.constructor._codeEditorService?._editors?.values()?.next()?.value;
   // ou usar: monaco.editor.getModels()[0].setValue('SQL HERE');
   ```
4. Clicar no botão "Run" (verde, canto inferior direito)
5. Verificar resultado no painel "Results"

## Procedimento Storage

1. Navegar para Storage Buckets URL
2. Clicar "New bucket"
3. Preencher nome, activar "Public" se necessário
4. Clicar "Create"

## Notas

- A sessão do Supabase já está autenticada no browser
- Sempre tirar screenshot para confirmação
- Preferir o MCP primeiro, usar browser como fallback
