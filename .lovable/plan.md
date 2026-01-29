

# Plano: Adicionar Nome do Solicitante nas Notificacoes de SLA

## Objetivo

Incluir o nome do usuario/cliente que fez a solicitacao na mensagem de alerta de SLA enviada ao grupo "X9 de Atendimento".

## Analise do Codigo Atual

A query atual busca demandas com SLA estourado mas NAO inclui os dados do cliente:

```typescript
const { data: demandsToNotify } = await supabase
  .from("ticket_demands")
  .select(`
    id,
    description,
    priority,
    created_at,
    ticket_id,
    tickets (
      id,
      group_id,
      monitored_groups (name)
    )
  `)
```

Os campos `customer_name` e `customer_phone` existem na tabela `tickets` mas nao estao sendo buscados.

## Alteracoes Necessarias

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

#### 1. Modificar a Query (linhas 116-128)

Adicionar `customer_name` e `customer_phone` na selecao do ticket:

```typescript
tickets (
  id,
  group_id,
  customer_name,
  customer_phone,
  monitored_groups (name)
)
```

#### 2. Modificar a Mensagem de Alerta (linhas 176-183)

Extrair o nome do cliente e incluir na mensagem:

```typescript
// Get customer info
const customerName = (demand.tickets as any)?.customer_name || "Cliente desconhecido";

// Build alert message
const alertMessage = `⚠️ *ALERTA DE SLA*\n\n` +
  `📋 *Grupo:* ${groupName}\n` +
  `👤 *Solicitante:* ${customerName}\n` +
  `📝 *Demanda:* ${demand.description}\n` +
  `⏱️ *Tempo aberto:* ${timeOpenMinutes} minutos\n` +
  `🎯 *Limite SLA:* ${slaLimitMinutes} minutos\n` +
  `${priorityDisplay}\n\n` +
  `Por favor, verifique o atendimento!`;
```

## Novo Formato da Mensagem

```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* [Nome do Grupo do Cliente]
👤 *Solicitante:* [Nome do Cliente]
📝 *Demanda:* [Descricao gerada pela IA]
⏱️ *Tempo aberto:* X minutos
🎯 *Limite SLA:* 30 minutos
🟡 Normal

Por favor, verifique o atendimento!
```

## Exemplo com Dados Reais

```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* X9 de Atendimento
👤 *Solicitante:* João Silva
📝 *Demanda:* Solicitação de relatório/resultado das campanhas executadas.
⏱️ *Tempo aberto:* 45 minutos
🎯 *Limite SLA:* 30 minutos
🟡 Normal

Por favor, verifique o atendimento!
```

## Acoes

1. Atualizar query para incluir `customer_name` e `customer_phone`
2. Adicionar linha com nome do solicitante na mensagem
3. Deploy da edge function
4. Testar para confirmar envio com dados do cliente

