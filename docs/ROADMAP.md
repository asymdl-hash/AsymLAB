# 🚀 Roadmap & Features Futuras — AsymLAB

> Funcionalidades planeadas para versões futuras. Ordenadas por prioridade.

## 🔴 Alta Prioridade (Próximas versões)

### F. Módulo Pacientes
- [ ] Ficha do paciente completa
- [ ] Histórico de consultas
- [ ] Upload de documentos/exames
- [ ] Pesquisa e filtros avançados

### G. Módulo Agenda
- [ ] Calendário de marcações
- [ ] Vista diária/semanal/mensal
- [ ] Notificações de consultas
- [ ] Integração com pacientes e médicos

### H. Módulo Faturação
- [ ] Criação de faturas
- [ ] Integração com descontos das clínicas
- [ ] Relatórios de faturação
- [ ] Exportação PDF

### I. Módulo Relatórios
- [ ] Dashboard com métricas
- [ ] Gráficos de evolução
- [ ] Exportação de dados

---

## 🟡 Média Prioridade

### Gemini MCP Integration (Google AI)
- [ ] Integrar Google Gemini MCP servers para funcionalidades AI
- [ ] **O que é:** MCP servers managed pela Google Cloud que ligam modelos AI a serviços externos (BigQuery, Maps, PostgreSQL, Firestore, etc.)
- [ ] **Casos de uso potenciais:**
  - AI assistant para análise de dados clínicos
  - Sugestões automáticas baseadas em histórico
  - Processamento de linguagem natural para pesquisa de pacientes
  - Geração automática de relatórios com insights
- [ ] **Abordagem:** Criar **branch Vercel** (Preview) para experimentar sem afectar produção
- [ ] **Referência:** [Google Cloud MCP](https://cloud.google.com/blog/products/ai-machine-learning/open-model-context-protocol-servers)
- [ ] **Lançamento:** Google lançou MCP servers managed em Dez 2025, expandido em 2026

### PWA Improvements
- [ ] Notificações push nativas
- [ ] Sincronização offline avançada
- [ ] App Store (TWA para Android)

---

## 🟢 Baixa Prioridade / Exploratório

### B.6 OAuth Flow Improvements
- [ ] Teste completo do fluxo de convite via email
- [ ] Melhorar feedback de entrega de email na UI
- [ ] Suporte para outros providers OAuth (Google, Microsoft)

---

## 📝 Notas Técnicas

### Branch Vercel para Experimentação
Para testar features experimentais (como Gemini MCP) sem afectar produção:

1. **Criar branch Git:** `git checkout -b feature/gemini-mcp`
2. **Push para GitHub:** `git push origin feature/gemini-mcp`
3. **Vercel Preview:** Automaticamente cria um deployment preview em URL separado
4. **Testar isoladamente:** Todas as alterações ficam no preview, produção intacta
5. **Quando aprovado:** Merge para `main` → deploy automático para produção

> **Nota:** Cada push para um branch não-main gera um Preview Deployment na Vercel com URL única, permitindo testar sem risco.

---

**Última actualização:** 21/02/2026
