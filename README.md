# AsymLAB - Sistema de Gestão Clínica

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/asymdl-hash/AsymLAB/releases)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Progressive Web App (PWA) profissional para gestão clínica e laboratório, desenvolvida com Next.js 14, TypeScript, Tailwind CSS v4 e shadcn/ui.

## 🚀 Funcionalidades

- ✅ **Autenticação Segura** - Sistema de login com Supabase
- ✅ **Dashboard Moderno** - Interface clean com design profissional
- ✅ **Gestão de Pacientes** - Fichas clínicas completas
- ✅ **Agendamento** - Sistema de marcações e consultas
- ✅ **Faturação** - Gestão financeira integrada
- ✅ **Relatórios** - Análises e estatísticas
- ✅ **PWA** - Funciona offline e pode ser instalado
- ✅ **Responsivo** - Design adaptável a todos os dispositivos

## 🎨 Design System

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4 + shadcn/ui
- **Ícones**: Lucide React
- **Fonte**: Inter (Google Fonts)
- **Componentes**: Button, Card, Badge, Input, Dialog
- **Paleta de Cores**:
  - Primária: `#0f172a` (azul escuro)
  - Header: `#1e293b` (slate dark)
  - Background: `#f8f9fa` (cinza claro)
  - Accent: `#3b82f6` (azul)

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase (para autenticação)

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/asymdl-hash/AsymLAB.git
cd AsymLAB
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um ficheiro `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Execute o servidor de desenvolvimento**
```bash
npm run dev
```

5. **Abra o browser**
```
http://localhost:3000
```

## 🏗️ Estrutura do Projeto

```
AsymLAB/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── login/              # Página de login
│   │   ├── globals.css         # Estilos globais (Tailwind)
│   │   └── layout.tsx          # Layout principal
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── badge.tsx
│   │   ├── Sidebar.tsx         # Barra lateral
│   │   └── DashboardLayout.tsx # Layout do dashboard
│   └── lib/                    # Utilitários
│       ├── supabase.ts         # Cliente Supabase
│       └── utils.ts            # Funções auxiliares
├── public/                     # Ficheiros estáticos
├── docs/                       # Documentação
│   ├── ACESSOS.md             # Credenciais
│   └── CHANGELOG.md           # Histórico de versões
├── tailwind.config.js         # Configuração Tailwind
├── postcss.config.js          # Configuração PostCSS
└── package.json               # Dependências
```

## 📚 Documentação

- **[Changelog](./docs/CHANGELOG.md)** - Histórico completo de versões
- **[Commits](https://github.com/asymdl-hash/AsymLAB/commits/main)** - Histórico de commits no GitHub
- **[Acessos](./docs/ACESSOS.md)** - Credenciais e configurações

## 🔄 Histórico de Versões

### [V2.1.0](https://github.com/asymdl-hash/AsymLAB/commit/f1db354) - 2026-02-12
- ✨ Dashboard com efeito de sobreposição
- 🎨 Container branco único sobrepõe header dark
- 💫 Design clean como página flutuante

### [V2.0.2](https://github.com/asymdl-hash/AsymLAB/commit/25b6436) - 2026-02-12
- 🔧 Fix Tailwind CSS v4
- 📦 Instalado @tailwindcss/postcss
- 🎨 Atualizado globals.css para @import tailwindcss

### [V2.0.0](https://github.com/asymdl-hash/AsymLAB/commit/3d423cd) - 2026-02-12
- 🎨 Redesign completo com Tailwind CSS
- ✨ Login, Sidebar e Dashboard profissionais
- 🎯 Ícones Lucide React
- 🌑 Header dark (#1e293b)

### [V1.9.0](https://github.com/asymdl-hash/AsymLAB/commit/afd129f) - 2026-02-12
- 📦 Implementação Tailwind CSS + shadcn/ui
- 🎨 Design system profissional
- ✨ Componentes Button, Card, Badge
- 🔤 Fonte Inter (Google Fonts)

### [V1.8.0](https://github.com/asymdl-hash/AsymLAB/commit/95340ee) - 2026-02-12
- 🎨 Redesign com estilo moderno
- 🌑 Sidebar cinza clara
- 🌙 Header dark
- ✨ UI clean inspirada em design profissional

### [V1.0.0](https://github.com/asymdl-hash/AsymLAB/commit/a994de8) - Inicial
- 🎉 Estrutura base PWA
- 🔐 Módulo de Autenticação Supabase
- 📱 Progressive Web App configurada

**[Ver histórico completo de commits →](https://github.com/asymdl-hash/AsymLAB/commits/main)**

## 🛠️ Tecnologias

- **[Next.js 14](https://nextjs.org/)** - Framework React
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Framework CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI
- **[Supabase](https://supabase.com/)** - Backend e autenticação
- **[Lucide React](https://lucide.dev/)** - Ícones
- **[PWA](https://web.dev/progressive-web-apps/)** - Progressive Web App

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento (localhost:3000)

# Produção
npm run build        # Cria build de produção
npm start            # Inicia servidor de produção

# Linting
npm run lint         # Verifica código com ESLint
```

## 🤝 Contribuir

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'V2.2.0: Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o ficheiro [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**asymdl-hash**
- GitHub: [@asymdl-hash](https://github.com/asymdl-hash)
- Projeto: [AsymLAB](https://github.com/asymdl-hash/AsymLAB)

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) - Framework incrível
- [Tailwind CSS](https://tailwindcss.com/) - Estilização moderna
- [shadcn/ui](https://ui.shadcn.com/) - Componentes lindos
- [Supabase](https://supabase.com/) - Backend poderoso

---

**Desenvolvido com ❤️ para gestão clínica profissional**
