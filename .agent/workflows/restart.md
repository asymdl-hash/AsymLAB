---
description: Regra obrigatória para carregar e guardar o contexto após um reinício do PC ou nova sessão
---

# Workflow: Gestão de Contexto de Sessão (Restart)

## Quando Aplicar

Este workflow deve ser invocado (ativa ou formativa) **sempre que**:
- Iniciares uma nova conversa ou a pedido do utilizador após um reinício da máquina.
- O utilizador pedir para "recuperar o contexto das últimas 24h".
- Ao terminar uma sessão prolongada de trabalho e o utilizador mencionar que vai sair ou desligar/reiniciar o PC.

## Passos a Executar no Início da Sessão

### 1. Ler o Documento "Capitão" de Contexto
**Obrigatório**: Executa o ler ficheiro (`view_file`) no documento:
`f:\Asymlab\docs\ops\CONTEXT_RESTART.md`

Isto dar-te-á o ponto exato onde a sessão anterior terminou, os módulos focados e os próximos objetivos sem ter de colocar questões redundantes.

### 2. Verificar Estado Central
Para apoio secundário rápido:
- Lê o `INDEX.md` para veres a estrutura geral.
- Verifica os últimos commits no `ops/CHANGELOG.md`.

### 3. Confirmar Ambiente 
- Verifica se o servidor de desenvolvimento está a correr (Next.js em :3000). Caso não esteja, usa o workflow de `/local-build`.

---

// turbo
## Passos a Executar no Fim da Sessão (Preparar Reinício)

Sempre que o utilizador disser que vai reiniciar o PC ou deitar-se:
1. Faz um commit final do que estiver por versionar.
2. Atualiza os documentos de log aplicáveis (usando a regra `doc-sync` se pertinente).
3. Atualiza ou reescreve o ficheiro `f:\Asymlab\docs\ops\CONTEXT_RESTART.md` colocando a data, os feitos das últimas horas (em formato de lista detalhada e robusta) e define expressamente o "Onde Parámos" e "Próximo Foco".
4. Confirma que tudo foi empurrado (`git push`).
5. Avisa o utilizador que "O contexto e os backups foram guardados, podes reiniciar em segurança!".
