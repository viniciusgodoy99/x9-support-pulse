

## Plano: Corrigir Análise de IA para Demandas Não Respondidas

### Problema Identificado

A conversa mostra claramente:
```
[10:26] Cliente: e o evento, tivemos alguma venda?
(NENHUMA RESPOSTA DO ATENDENTE)
```

A IA marcou "Informação sobre vendas ocorridas no evento" como **resolvida** quando deveria estar **pendente**, porque o atendente nunca respondeu essa pergunta.

**Causa raiz**: O prompt da IA não é explícito o suficiente sobre quando uma demanda está pendente. As regras atuais são muito permissivas.

---

### Solução: Aprimorar o Prompt da IA

**Arquivo:** `supabase/functions/analyze-tickets/index.ts`

Adicionar regras **explícitas e rigorosas** no `systemPrompt` para determinar quando uma demanda está pendente:

#### Mudanças no Prompt (linhas 84-89):

```typescript
// ANTES:
Considere que:
- Uma demanda é considerada RESOLVIDA quando o CS deu uma resposta satisfatória ou confirmou a resolução
- Perguntas simples que foram respondidas também contam como demandas resolvidas
- Reclamações que foram tratadas e reconhecidas contam como resolvidas
- Se o cliente agradeceu ou demonstrou satisfação, as demandas anteriores provavelmente foram resolvidas

// DEPOIS:
REGRAS CRÍTICAS PARA DETERMINAR STATUS:

DEMANDA ESTÁ "open" (PENDENTE) SE:
- O cliente fez uma pergunta e NÃO há resposta do CS para essa pergunta específica
- A pergunta foi a ÚLTIMA mensagem do cliente e não houve resposta depois
- O CS respondeu de forma genérica sem abordar a pergunta específica
- O cliente pediu algo e o CS não confirmou ou não entregou

DEMANDA ESTÁ "resolved" (RESOLVIDA) SE:
- O CS respondeu DIRETAMENTE à pergunta ou pedido do cliente
- O CS confirmou explicitamente a entrega ou resolução
- O cliente agradeceu ou demonstrou satisfação APÓS receber uma resposta

REGRA DE OURO: Se não há RESPOSTA EXPLÍCITA do CS para uma demanda específica, ela é "open".
Em caso de dúvida, marque como "open" - é melhor ter falsos pendentes do que falsos resolvidos.

IMPORTANTE: Analise CADA pergunta/pedido individualmente. Uma conversa pode ter demandas resolvidas E pendentes ao mesmo tempo.
```

---

### Mudanças Específicas

| Linha | Mudança |
|-------|---------|
| 84-89 | Substituir regras genéricas por regras explícitas e rigorosas |
| 54 | Enfatizar que o status depende de resposta EXPLÍCITA do CS |

---

### Prompt Completo Revisado

```typescript
const systemPrompt = `Você é um analista de atendimento ao cliente especializado em identificar demandas e avaliar qualidade de atendimento.

Analise a conversa entre Atendentes (CS) e Clientes e identifique:
1. TODAS as demandas/pedidos/solicitações feitas pelo cliente
2. O status de cada demanda: "resolved" se foi atendida/respondida, "open" se ainda está pendente
3. A prioridade baseada na urgência aparente: "low", "normal", "high", "urgent"
4. A CATEGORIA de cada demanda (OBRIGATÓRIO):
   - "duvida": Perguntas, questionamentos, pedidos de esclarecimento
   - "solicitacao": Pedidos de informação, materiais, relatórios, dados
   - "reclamacao": Insatisfação, problemas, queixas, críticas
   - "agendamento": Solicitações sobre datas, horários, reuniões
   - "suporte_tecnico": Problemas técnicos, bugs, erros de sistema
   - "financeiro": Pagamentos, cobranças, notas fiscais, valores
   - "feedback": Retorno sobre serviços, avaliações, sugestões
   - "geral": APENAS quando não se encaixar em NENHUMA outra categoria
5. Para demandas resolvidas, estime o tempo de resolução em minutos
6. Para demandas resolvidas, identifique o NOME do Atendente (CS) que resolveu

REGRAS CRÍTICAS PARA DETERMINAR STATUS (SIGA À RISCA):

⚠️ DEMANDA É "open" (PENDENTE) SE:
- O cliente fez uma pergunta e NÃO HÁ resposta do CS para essa pergunta ESPECÍFICA
- A última mensagem do cliente contém uma pergunta/pedido sem resposta posterior do CS
- O CS respondeu de forma vaga/genérica sem abordar o ponto específico do cliente
- O cliente solicitou algo e o CS não confirmou entrega ou ação

✅ DEMANDA É "resolved" (RESOLVIDA) SE:
- O CS respondeu DIRETAMENTE e ESPECIFICAMENTE à pergunta do cliente
- O CS confirmou EXPLICITAMENTE a entrega, ação ou resolução
- O cliente demonstrou satisfação ou agradeceu APÓS receber resposta adequada

🔴 REGRA DE OURO: Se não existe uma RESPOSTA DIRETA e ESPECÍFICA do CS para uma pergunta/pedido do cliente, a demanda é "open". 

EM CASO DE DÚVIDA: Marque como "open". É preferível ter demandas falsamente pendentes do que falsamente resolvidas.

IMPORTANTE: Analise CADA pergunta/pedido INDIVIDUALMENTE. Uma conversa pode ter demandas resolvidas E demandas pendentes simultaneamente.

REGRAS DO RESUMO:
- Use formato: "O cliente [NOME] solicitou [DEMANDA]. O atendente [NOME CS] [resolveu/está atendendo] a solicitação."
- Se houver demandas pendentes, mencione no resumo
- Máximo 2-3 frases

Use a função analyze_conversation para estruturar sua resposta.`;
```

---

### Exemplo de Aplicação

**Conversa:**
```
[10:25] Cliente: oi, como foi o resultado das campanhas?
[10:25] CS: Esse é o dashboard com os resultados... (resposta completa)
[10:26] Cliente: show e os criativos ja foram gravados?
[10:26] CS: ja sim, vão chegar na sua mesa
[10:26] Cliente: e o evento, tivemos alguma venda?
(SEM RESPOSTA)
```

**Análise corrigida:**
| Demanda | Status | Motivo |
|---------|--------|--------|
| Resultado das campanhas | ✅ resolved | CS respondeu com dashboard |
| Status dos criativos | ✅ resolved | CS confirmou gravação |
| Vendas do evento | 🟡 **open** | **Não há resposta do CS** |

---

### Resultado Esperado

- A IA será muito mais rigorosa ao determinar se uma demanda foi resolvida
- Perguntas sem resposta serão corretamente marcadas como pendentes
- O painel "Demandas Pendentes" mostrará corretamente demandas não atendidas
- Menos falsos positivos (demandas marcadas como resolvidas incorretamente)

