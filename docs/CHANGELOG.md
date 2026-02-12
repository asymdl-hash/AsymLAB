# Changelog - AsymLAB

Registo histórico de todas as versões e alterações do projeto AsymLAB PWA.

---

## V1.0.0 - 2026-02-12

### 🎯 Estrutura Base PWA e Módulo de Autenticação Supabase

**Adicionado:**

#### Estrutura do Projeto
- Projeto Next.js 14 com TypeScript e App Router
- Configuração PWA completa (`manifest.json`, Service Worker via `next-pwa`)
- Estrutura de pastas organizada (`src/app`, `src/components`, `src/lib`, `src/styles`)

#### Design System "Medical Brutalism"
- Tipografia forte: Space Grotesk (display) + IBM Plex Mono (body)
- Paleta monocromática com acento azul clínico (#00a8e8)
- Sistema de espaçamento baseado em 4px
- Tokens de design exportados como constantes TypeScript

#### Autenticação
- Integração completa com Supabase Auth
- Página de login responsiva (Desktop, Tablet, Mobile)
- Formulário otimizado para gestores de passwords
- Proteção de rotas via middleware Next.js
- Helper functions type-safe para autenticação

#### Páginas
- `/login` - Página de autenticação com layout assimétrico
- `/dashboard` - Página protegida com informações do utilizador
- Redirecionamento automático de `/` para `/login`

#### Responsividade
- Mobile-first approach
- Breakpoints: 768px (tablet), 1024px (desktop)
- Layout adapta-se automaticamente a todos os dispositivos

**Técnico:**
- Next.js: 14.0.4
- React: 18.2.0
- TypeScript: 5.3.3
- Supabase JS: 2.39.0
- next-pwa: 5.6.0

**Credenciais:**
- Supabase Project URL: `https://ikfmcsdvnmtgpysyjyk.supabase.co`
- Credenciais guardadas em `docs/ACESSOS.md` (não versionado)

**Próximos Passos (V1.1.0+):**
- Adicionar testes automatizados
- Implementar recuperação de password
- Adicionar autenticação social (Google)
- Sincronização com Pasta Local
- Módulo de Ficha do Paciente
