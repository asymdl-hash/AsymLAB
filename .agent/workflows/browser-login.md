---
description: Procedimento de login no browser automatizado — limpar campos antes de digitar e usar credenciais correctas
---

# Login no Browser (Browser Subagent)

## Regras Obrigatórias

1. **Credenciais correctas** — Usar SEMPRE as credenciais documentadas em `docs/acessos/ACESSOS_DIRECTOS.md`:
   - Email: `asymdl@gmail.com`
   - Password: `FabioDias123?!`

2. **Limpar campos ANTES de digitar** — Os campos podem ter conteúdo pré-preenchido. NUNCA digitar directamente.

3. **Método recomendado**: Usar JavaScript com native setter para evitar concatenação:

```javascript
const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]');
const passInput = document.querySelector('input[type="password"]');
const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

nativeSetter.call(emailInput, 'asymdl@gmail.com');
emailInput.dispatchEvent(new Event('input', { bubbles: true }));
emailInput.dispatchEvent(new Event('change', { bubbles: true }));

nativeSetter.call(passInput, 'FabioDias123?!');
passInput.dispatchEvent(new Event('input', { bubbles: true }));
passInput.dispatchEvent(new Event('change', { bubbles: true }));
```

4. **Porta**: O server pode estar em `localhost:3000` ou `localhost:3001` (verificar ambos se necessário).

5. **Mockups** — Qualquer mockup gerado deve sempre incluir versões **light** e **dark**.
