---
description: Regra obrigatória — criar mockup antes de implementar UI e garantir fidelidade visual total entre mockup e código
---

# 🎨 Regra de Fidelidade Visual — Mockup → Implementação

> [!CAUTION]
> ### REGRA OBRIGATÓRIA — Fidelidade Visual Total
> O agente DEVE SEMPRE criar um mockup visual ANTES de implementar qualquer alteração significativa de UI/frontend.
> O mockup é uma **promessa estética** ao utilizador. A implementação DEVE reproduzir fielmente o mockup.
> **Violação desta regra = resultado inaceitável.**

## Quando aplicar

Esta regra aplica-se a QUALQUER alteração que afecte a aparência visual:
- Novos componentes (cards, modais, drawers, timelines, etc.)
- Redesign de componentes existentes
- Mudanças de layout (grids, flexbox, espaçamento)
- Paletas de cores, tipografia, ícones
- Animações e transições
- Responsividade (mobile/tablet/desktop)

## Fluxo obrigatório

### 1. 🖼️ Criar Mockup ANTES de Codificar

- Usar a ferramenta `generate_image` para criar um mockup visual do componente/layout
- O mockup deve mostrar:
  - Cores exactas, espaçamento, tipografia
  - Estados (hover, active, disabled, empty, loading)
  - Variações de tamanho (mobile vs desktop) se aplicável
- Mostrar o mockup ao utilizador e obter aprovação

### 2. ✅ Aprovação do Utilizador

- O utilizador DEVE aprovar o mockup antes da implementação começar
- Se o utilizador pedir alterações, criar novo mockup e repetir
- **NUNCA** começar a codificar sem aprovação explícita do mockup

### 3. 💻 Implementação Fiel

- Ao codificar, o mockup aprovado é a referência ÚNICA
- Cada detalhe conta: border-radius, padding, font-size, cores, sombras
- Usar valores exactos (não "parecidos") para corresponder ao mockup

### 4. 📸 Comparação Iterativa (OBRIGATÓRIO)

Após implementar, o agente DEVE:

1. **Tirar screenshot** da implementação no browser (`browser_subagent`)
2. **Comparar visualmente** o screenshot com o mockup original
3. **Identificar diferenças** — cores, espaçamento, tamanhos, alinhamento, fontes
4. **Corrigir** cada diferença encontrada
5. **Repetir** os passos 1-4 até o screenshot ser **muito semelhante** ao mockup

> [!IMPORTANT]
> Mínimo de **2 iterações** de comparação. Não aceitar a primeira tentativa como final.

### 5. 📋 Documentar Resultado

- Guardar screenshot final lado-a-lado com o mockup
- Registar no walkthrough/artefacto qualquer desvio intencional (e porquê)

## Checklist Rápido

```
[ ] Mockup criado com generate_image
[ ] Mockup apresentado ao utilizador
[ ] Aprovação recebida
[ ] Implementação codificada baseada no mockup
[ ] Screenshot #1 tirado e comparado com mockup
[ ] Diferenças identificadas e corrigidas
[ ] Screenshot #2 tirado e recomparado
[ ] Resultado final aprovado (semelhança >90% com mockup)
```

## ❌ O que NÃO fazer

- ❌ Implementar UI sem criar mockup primeiro
- ❌ Mostrar mockup excelente e entregar implementação medíocre
- ❌ Fazer `commit` sem comparar screenshot com mockup
- ❌ Aceitar "está bom o suficiente" sem iteração de correcção
- ❌ Ignorar detalhes como sombras, border-radius, cores exactas

## ✅ O que SEMPRE fazer

- ✅ Mockup → Aprovação → Implementação → Comparação → Correcção → Comparação
- ✅ Usar valores CSS exactos que correspondam ao mockup
- ✅ Iterar até a implementação corresponder visualmente ao mockup
- ✅ Documentar qualquer desvio técnico necessário
