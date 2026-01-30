

# Plano: Corrigir Cálculo do Tempo Aberto para Usar Timestamp da Solicitação Original

## Problema Identificado

O "Tempo aberto" nas notificações de SLA mostra "0 minutos" porque:

| Evento | Timestamp |
|--------|-----------|
| Cliente solicitou | 13:33:59 |
| IA criou demanda | 13:37:41 |
| Notificação enviada | 13:37:45 |

A lógica atual calcula: `NOW() - demand.created_at` = 13:37 - 13:37 = 0 minutos

O correto seria: `NOW() - message.created_at` = 13:37 - 13:33 = ~4 minutos

## Solução

Modificar a edge function `analyze-tickets` para:

1. **Ao criar a demanda**: Salvar o timestamp da mensagem original do cliente que gerou a demanda (novo campo ou usar campo existente)
2. **Ao calcular tempo aberto**: Usar esse timestamp original em vez do `created_at` da demanda

## Opções de Implementação

### Opção A: Buscar primeira mensagem do ticket (mais simples)

Usar o timestamp da primeira mensagem do cliente no ticket como referência.

Prós: Simples, não requer alteração de schema
Contras: Pode não ser preciso se houver múltiplas demandas no mesmo ticket

### Opção B: Adicionar campo `request_timestamp` na demanda (mais preciso)

Pedir para a IA identificar qual mensagem gerou cada demanda e salvar o timestamp.

Prós: Mais preciso para cada demanda individual
Contras: Requer alteração de schema e lógica da IA

### Recomendação: Opção A (implementação imediata)

Como a maioria dos tickets tem uma demanda principal, usar o timestamp da primeira mensagem do cliente é uma solução adequada e imediata.

## Alterações Necessárias

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

#### 1. Na função `sendSlaBreachNotifications` (linhas 162-165)

Mudar a lógica para buscar a primeira mensagem do cliente ao invés de usar `demand.created_at`:

```typescript
// ANTES (atual):
const demandCreatedAt = new Date(demand.created_at);
const timeOpenMs = Date.now() - demandCreatedAt.getTime();
const timeOpenMinutes = Math.round(timeOpenMs / (60 * 1000));

// DEPOIS (proposto):
// Buscar a primeira mensagem do cliente no ticket
const ticketId = (demand.tickets as any)?.id;
let requestTimestamp = new Date(demand.created_at);

if (ticketId) {
  const { data: firstClientMessage } = await supabase
    .from("messages")
    .select("created_at")
    .eq("ticket_id", ticketId)
    .eq("sender_role", "client")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  
  if (firstClientMessage?.created_at) {
    requestTimestamp = new Date(firstClientMessage.created_at);
    console.log(`Using original request timestamp: ${firstClientMessage.created_at}`);
  }
}

const timeOpenMs = Date.now() - requestTimestamp.getTime();
const timeOpenMinutes = Math.round(timeOpenMs / (60 * 1000));
```

## Resultado Esperado

Com a mensagem original às 13:33 e a notificação às 13:37:

| Campo | Antes | Depois |
|-------|-------|--------|
| Tempo aberto | 0 minutos | 4 minutos |

A mensagem agora será:

```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* X9 de Atendimento
👤 *Solicitante:* Gabriel Pereira
📝 *Demanda:* Solicitação de informações sobre o resultado das campanhas.
⏱️ *Tempo aberto:* 4 minutos
🎯 *Limite SLA:* 3 minutos
🟡 Normal

Por favor, verifique o atendimento!
```

## Ações

1. Modificar função `sendSlaBreachNotifications` no `analyze-tickets`
2. Adicionar query para buscar timestamp da primeira mensagem do cliente
3. Usar esse timestamp no cálculo do tempo aberto
4. Deploy da edge function
5. Testar enviando uma solicitação e verificando se o tempo aparece corretamente

