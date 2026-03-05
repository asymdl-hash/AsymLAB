---
description: Regra obrigatória — desenvolver sempre em Light Mode. Dark Mode só após app finalizada.
---

# 🌞 Regra Light Mode Obrigatória

## Regra Principal

> **TODA a implementação de UI deve ser feita em Light Mode.**
> Dark Mode só será preparado **depois da app estar finalizada**.

## Instruções para o Agente

1. **Nunca** usar classes dark mode (`dark:`, `bg-gray-900`, `bg-slate-800`, `text-white` em contexto dark, etc.) ao criar novos componentes ou páginas
2. **Sempre** usar backgrounds claros (`bg-white`, `bg-gray-50`, `bg-gray-100`)
3. **Sempre** usar texto escuro (`text-gray-900`, `text-gray-700`, `text-gray-500`)
4. **Cores primárias** mantêm-se: amber (#f59e0b), com contrastes adequados para fundo claro
5. **Hero headers** e elementos de destaque podem ter fundo escuro pontuais, mas o restante da app deve ser light
6. Ao modificar componentes existentes que estejam em dark mode, **converter para light mode**
7. **Cards, modals, drawers, dropdowns** — todos em fundo claro com bordas subtis
8. **Sombras** subtis para criar profundidade (shadow-sm, shadow-md)

## Estética Premium Light Mode

- Fundos: branco com acentos em cinza claro
- Bordas: `border-gray-200` ou `border-gray-100`
- Texto: hierarquia com `gray-900` (títulos), `gray-700` (corpo), `gray-500` (secundário)
- Gradientes suaves em headers se necessário
- Micro-animações e hover states com transições suaves

## Quando aplicar Dark Mode (FUTURO)

- Só após **confirmação explícita do utilizador** de que a app está finalizada
- Usar CSS custom properties / Tailwind dark mode toggle
- Implementar como tema alternativo, não como defeito
