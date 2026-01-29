
# Plano: Corrigir Identificacao do Solicitante nas Notificacoes de SLA

## Problema Identificado

A mensagem de SLA mostra "Cliente desconhecido" mesmo que o cliente tenha sido identificado. A investigacao revelou:

| Campo | Valor | Origem |
|-------|-------|--------|
| `tickets.customer_name` | "Cliente" (generico) | Webhook no momento da criacao |
| `messages.sender_name` | "Gabriel Pereira" (real) | Mensagem original do cliente |
| `group_members.name` | "Gabriel Pereira" | Sincronizado posteriormente |

O problema e que o webhook criou o ticket com `customer_name: "Cliente"` (valor padrao), e as atualizacoes posteriores de nome aconteceram apenas na tabela `messages` e `group_members`, nao no ticket.

## Solucao

Modificar a funcao `sendSlaBreachNotifications` no `analyze-tickets` para buscar o nome correto do solicitante quando o `customer_name` do ticket estiver vazio ou generico:

1. Primeiro tentar `tickets.customer_name`
2. Se vazio/generico, buscar na primeira mensagem do ticket com `sender_role = 'client'`
3. Se ainda vazio, buscar em `group_members` pelo `customer_phone`

## Alteracoes Necessarias

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

#### Modificar a secao de notificacoes SLA (linhas 146-189)

Adicionar uma subconsulta para buscar o nome real quando necessario:

```typescript
for (const demand of demandsToNotify) {
  // ... existing notification check ...

  // Get customer info - FALLBACK logic
  let customerName = (demand.tickets as any)?.customer_name;
  
  // If name is empty, generic, or null - try to get from first client message
  if (!customerName || customerName === "Cliente" || customerName === "Cliente desconhecido") {
    const ticketId = (demand.tickets as any)?.id;
    if (ticketId) {
      // Fetch first client message to get real name
      const { data: firstClientMessage } = await supabase
        .from("messages")
        .select("sender_name")
        .eq("ticket_id", ticketId)
        .eq("sender_role", "client")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (firstClientMessage?.sender_name && firstClientMessage.sender_name !== "Cliente") {
        customerName = firstClientMessage.sender_name;
        console.log(`Found customer name from first message: ${customerName}`);
      }
    }
  }
  
  // Final fallback
  customerName = customerName || "Cliente desconhecido";
  
  // Build alert message with correct name
  const alertMessage = `...`
}
```

## Fluxo de Resolucao de Nome

```text
1. tickets.customer_name existe e != "Cliente"?
   └─ SIM → Usar esse nome
   └─ NAO ↓

2. Buscar primeira mensagem do cliente no ticket
   └─ Encontrou sender_name != "Cliente"?
      └─ SIM → Usar esse nome
      └─ NAO ↓

3. Usar "Cliente desconhecido" (fallback final)
```

## Resultado Esperado

A mensagem sera enviada com o nome real:

```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* X9 de Atendimento
👤 *Solicitante:* Gabriel Pereira
📝 *Demanda:* Resultado das campanhas de marketing/anúncios
⏱️ *Tempo aberto:* 5 minutos
🎯 *Limite SLA:* 3 minutos
🟡 Normal

Por favor, verifique o atendimento!
```

## Acoes

1. Modificar funcao `sendSlaBreachNotifications` no `analyze-tickets`
2. Adicionar logica de fallback para buscar nome da primeira mensagem
3. Deploy da edge function
4. Testar com ticket existente para confirmar nome correto
