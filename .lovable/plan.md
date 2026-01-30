
# Plano: Implementar Critérios Objetivos de Prioridade

## Situação Atual

A prioridade das demandas é definida **subjetivamente pela IA** com base na "urgência aparente". Isso resulta em classificações inconsistentes.

## Nova Lógica de Prioridade

Implementar critérios **objetivos e hierárquicos**:

| Critério | Prioridade | Peso |
|----------|------------|------|
| Tempo aberto > 2x SLA | `urgent` | 1º (mais alto) |
| Cliente usou palavras de urgência | `urgent` | 2º |
| Tempo aberto > 1x SLA | `high` | 3º |
| Solicitação normal | `normal` | 4º |
| Dúvida simples | `low` | 5º (mais baixo) |

**Palavras de urgência a detectar:**
- "urgente", "urgência", "preciso agora", "imediato", "imediatamente"
- "o mais rápido possível", "asap", "pressa", "emergência", "emergencial"
- "não pode esperar", "prioridade", "prioritário"

## Alterações Necessárias

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

#### 1. Adicionar função para detectar palavras de urgência

```typescript
function hasUrgencyKeywords(messages: Message[]): boolean {
  const urgencyKeywords = [
    "urgente", "urgência", "urgencia",
    "preciso agora", "imediato", "imediatamente",
    "o mais rápido possível", "mais rápido possível",
    "asap", "pressa", "emergência", "emergencia",
    "emergencial", "não pode esperar", "nao pode esperar",
    "prioridade", "prioritário", "prioritario"
  ];
  
  // Verificar apenas mensagens de clientes
  const clientMessages = messages.filter(m => 
    m.group_role === "client" || m.sender_role === "client"
  );
  
  for (const msg of clientMessages) {
    const content = msg.content.toLowerCase();
    if (urgencyKeywords.some(keyword => content.includes(keyword))) {
      return true;
    }
  }
  return false;
}
```

#### 2. Adicionar função para calcular prioridade objetiva

```typescript
function calculateObjectivePriority(
  category: string,
  timeOpenMinutes: number,
  slaLimitMinutes: number,
  hasUrgencyWords: boolean
): "low" | "normal" | "high" | "urgent" {
  // 1. Tempo aberto > 2x SLA = urgent
  if (timeOpenMinutes > slaLimitMinutes * 2) {
    return "urgent";
  }
  
  // 2. Cliente usou palavras de urgência = urgent
  if (hasUrgencyWords) {
    return "urgent";
  }
  
  // 3. Tempo aberto > 1x SLA = high
  if (timeOpenMinutes > slaLimitMinutes) {
    return "high";
  }
  
  // 4. Dúvida simples = low
  if (category === "duvida") {
    return "low";
  }
  
  // 5. Solicitação normal = normal
  return "normal";
}
```

#### 3. Modificar a criação de demandas para usar prioridade objetiva

Após a IA retornar as demandas, recalcular a prioridade com base nos critérios objetivos:

```typescript
// Após criar a demanda no banco
const hasUrgency = hasUrgencyKeywords(messages);

// Calcular tempo aberto desde primeira mensagem do cliente
const firstClientMsg = messages
  .filter(m => m.group_role === "client" || m.sender_role === "client")
  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

let timeOpenMinutes = 0;
if (firstClientMsg) {
  timeOpenMinutes = Math.round((Date.now() - new Date(firstClientMsg.created_at).getTime()) / 60000);
}

// Prioridade objetiva
const objectivePriority = calculateObjectivePriority(
  demand.category,
  timeOpenMinutes,
  groupSlaLimit,
  hasUrgency
);

// Usar a prioridade objetiva ao inserir no banco
```

## Fluxo de Decisão

```text
Demanda criada
       |
       v
Tempo aberto > 2x SLA?
       |
   +---+---+
   |       |
  SIM     NÃO
   |       |
   v       |
URGENT     v
       Cliente usou palavras de urgência?
              |
          +---+---+
          |       |
         SIM     NÃO
          |       |
          v       |
       URGENT     v
              Tempo aberto > 1x SLA?
                     |
                 +---+---+
                 |       |
                SIM     NÃO
                 |       |
                 v       |
              HIGH       v
                     Categoria = "duvida"?
                            |
                        +---+---+
                        |       |
                       SIM     NÃO
                        |       |
                        v       v
                      LOW    NORMAL
```

## Resultado Esperado

| Cenário | Antes (IA) | Depois (Objetivo) |
|---------|------------|-------------------|
| SLA 5 min, aberto há 12 min | "normal" | **urgent** (>2x SLA) |
| Cliente escreveu "urgente" | "normal" | **urgent** |
| SLA 5 min, aberto há 6 min | "normal" | **high** (>1x SLA) |
| Pergunta sobre horário | "normal" | **low** (dúvida) |
| Pedido de relatório | "normal" | **normal** |

## Ações

1. Adicionar função `hasUrgencyKeywords` para detectar palavras de urgência
2. Adicionar função `calculateObjectivePriority` com a lógica de critérios
3. Modificar a inserção de demandas para usar prioridade objetiva
4. Deploy da edge function
5. Testar com diferentes cenários para validar a classificação
