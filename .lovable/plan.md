
# Plano: Filtrar Mensagens de Alerta de SLA para Apenas Clientes Reais

## Problema Identificado

A lógica atual na função `sendSlaBreachNotifications` busca mensagens usando `sender_role = "client"`:

```typescript
const { data: firstClientMessage } = await supabase
  .from("messages")
  .select("created_at")
  .eq("ticket_id", ticketId)
  .eq("sender_role", "client")  // <-- Problema aqui
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
```

Isso inclui qualquer pessoa que não seja CS, incluindo **gestores de tráfego** que estão classificados como `traffic_manager` na tabela `group_members`.

## Solução

Modificar as queries para buscar o **role real do membro no grupo** através de um JOIN com a tabela `group_members`, filtrando apenas mensagens de pessoas classificadas como `role = 'client'` no grupo.

## Alterações Necessárias

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

#### 1. Query para timestamp da primeira mensagem do cliente (linhas 237-251)

**Antes:**
```typescript
const { data: firstClientMessage } = await supabase
  .from("messages")
  .select("created_at")
  .eq("ticket_id", ticketId)
  .eq("sender_role", "client")
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
```

**Depois:**
```typescript
// Get group_id from the ticket
const groupId = (demand.tickets as any)?.group_id;

// First, get all group members with role = 'client'
const { data: clientMembers } = await supabase
  .from("group_members")
  .select("phone_number")
  .eq("group_id", groupId)
  .eq("role", "client");

const clientPhoneNumbers = (clientMembers || []).map(m => m.phone_number);

// Find first message from an actual client member
let firstClientMessage = null;
if (clientPhoneNumbers.length > 0) {
  const { data } = await supabase
    .from("messages")
    .select("created_at, sender_phone")
    .eq("ticket_id", ticketId)
    .in("sender_phone", clientPhoneNumbers)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  
  firstClientMessage = data;
}
```

#### 2. Query para nome do cliente (linhas 272-288)

**Antes:**
```typescript
const { data: firstClientMessage } = await supabase
  .from("messages")
  .select("sender_name")
  .eq("ticket_id", ticketId)
  .eq("sender_role", "client")
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
```

**Depois:**
```typescript
// Reuse clientPhoneNumbers from above
let firstClientMessageForName = null;
if (clientPhoneNumbers.length > 0) {
  const { data } = await supabase
    .from("messages")
    .select("sender_name, sender_phone")
    .eq("ticket_id", ticketId)
    .in("sender_phone", clientPhoneNumbers)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  
  firstClientMessageForName = data;
}

if (firstClientMessageForName?.sender_name && firstClientMessageForName.sender_name !== "Cliente") {
  customerName = firstClientMessageForName.sender_name;
}
```

#### 3. Otimização: Buscar membros clientes uma única vez

Para evitar queries duplicadas, buscar a lista de membros clientes do grupo uma única vez no início do loop e reutilizar:

```typescript
for (const demand of demandsToNotify) {
  // ... existing code ...
  
  const ticketId = (demand.tickets as any)?.id;
  const groupId = (demand.tickets as any)?.group_id;
  
  // Get all group members with role = 'client' once
  let clientPhoneNumbers: string[] = [];
  if (groupId) {
    const { data: clientMembers } = await supabase
      .from("group_members")
      .select("phone_number")
      .eq("group_id", groupId)
      .eq("role", "client");
    
    clientPhoneNumbers = (clientMembers || []).map(m => m.phone_number);
    console.log(`Found ${clientPhoneNumbers.length} client members in group ${groupId}`);
  }
  
  // Use clientPhoneNumbers in subsequent queries...
}
```

## Fluxo de Validação

```text
Demanda com SLA estourado
          |
          v
Buscar group_id do ticket
          |
          v
Buscar membros com role='client' no grupo
          |
          v
Filtrar mensagens por sender_phone IN (clientes reais)
          |
          v
Usar primeira mensagem de cliente real para:
  - Timestamp do "Tempo aberto"
  - Nome do solicitante
```

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Primeira msg de Gabriel (traffic_manager) | Considerado cliente | Ignorado |
| Primeira msg de João (cliente real) | Considerado cliente | Considerado cliente |
| Timestamp usado | Msg de qualquer "não-CS" | Msg de membro com role='client' |
| Nome do solicitante | Qualquer pessoa | Apenas cliente real |

## Benefícios

1. **Precisão**: Apenas clientes externos reais são considerados para métricas de SLA
2. **Consistência**: Alinhado com a lógica de geração de demandas que já ignora gestores de tráfego
3. **Controle**: Permite classificar corretamente quem é cliente em cada grupo

## Ações

1. Modificar a busca de `firstClientMessage` para usar `group_members.role = 'client'`
2. Modificar a busca de nome do cliente para usar a mesma lógica
3. Adicionar logs para debug da filtragem de membros clientes
4. Deploy da edge function
5. Testar enviando mensagens de diferentes tipos de membros
