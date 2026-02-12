# AsymLAB PWA

Progressive Web App para Gestão Clínica com autenticação Supabase.

## 🚀 Versão Atual: V1.0.0

### Funcionalidades

- ✅ Autenticação com Supabase (Email/Password)
- ✅ PWA completa (instalável, offline-ready)
- ✅ Responsividade total (Desktop, Tablet, Mobile)
- ✅ Design System "Medical Brutalism"
- ✅ Proteção de rotas

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Copiar .env.local.example para .env.local e preencher credenciais

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📁 Estrutura do Projeto

```
F:\AsymLAB\
├── docs/
│   ├── ACESSOS.md          # Credenciais (não versionado)
│   └── CHANGELOG.md        # Histórico de versões
├── public/
│   ├── manifest.json       # Configuração PWA
│   └── icons/              # Ícones da aplicação
├── src/
│   ├── app/
│   │   ├── login/          # Página de autenticação
│   │   ├── dashboard/      # Página protegida
│   │   └── layout.tsx      # Layout raiz
│   ├── components/
│   │   └── AuthForm.tsx    # Componente de login
│   ├── lib/
│   │   └── supabase.ts     # Cliente Supabase
│   └── styles/
│       ├── globals.css     # Design System
│       └── design-tokens.ts
├── .env.local              # Variáveis de ambiente (não versionado)
├── next.config.js
├── package.json
└── tsconfig.json
```

## 🎨 Design System

**Estética:** Medical Brutalism

- **Tipografia:** Space Grotesk + IBM Plex Mono
- **Paleta:** Monocromática com acento azul clínico
- **Layout:** Assimétrico, espaçamento preciso
- **Motion:** Mínimo, intencional

## 📖 Documentação

Ver `docs/CHANGELOG.md` para histórico completo de versões.

## 🔐 Segurança

- Credenciais em `.env.local` (não versionado)
- Proteção de rotas via middleware
- Type-safety com TypeScript

## 📝 Licença

Propriedade privada - AsymLAB
