

# Plano: Notificacao de Estouro de SLA no WhatsApp

## Objetivo

Implementar uma feature que envia notificacoes automaticas no grupo "X9 de Atendimento" sempre que uma demanda ultrapassar o limite de SLA configurado.

## Analise do Sistema Atual

| Componente | Status Atual |
|------------|--------------|
| Grupo de notificacao | Existe: "X9 de Atendimento" (whatsapp_id: `120363422213957419@g.us`) |
| Deteccao de SLA | Ja existe: campo `sla_exceeded` na tabela `ticket_demands` |
| Integracao UAZAPI | Configurada com secrets `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` |
| SLA global | 30 minutos configurado na tabela `settings` |

## Arquitetura da Solucao

```text
+-------------------+     +--------------------+     +-------------------+
|  analyze-tickets  | --> | Detecta demanda    | --> | Envia notificacao |
|  (cron 1h)        |     | com SLA estourado  |     | via UAZAPI        |
+-------------------+     +--------------------+     +-------------------+
                                    |
                                    v
                          +--------------------+
                          | Grupo X9 de        |
                          | Atendimento        |
                          +--------------------+
```

## Detalhes Tecnicos

### 1. Nova Tabela: `sla_notifications`

Necessaria para evitar notificacoes duplicadas. Campos:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| demand_id | uuid | FK para ticket_demands |
| notified_at | timestamp | Quando foi notificado |
| notification_type | text | Tipo: "sla_breach" |

### 2. Nova Configuracao na Tabela `settings`

| Key | Value | Descricao |
|-----|-------|-----------|
| sla_notification_group_id | 120363422213957419@g.us | WhatsApp ID do grupo de notificacoes |
| sla_notifications_enabled | true | Habilitar/desabilitar notificacoes |

### 3. Modificacao: `supabase/functions/analyze-tickets/index.ts`

Adicionar funcao para enviar mensagem via UAZAPI:

```typescript
async function sendWhatsAppMessage(groupJid: string, message: string): Promise<boolean> {
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  
  // POST para endpoint /message/text da UAZAPI
  const response = await fetch(`${apiUrl}/message/text`, {
    method: "POST",
    headers: {
      "token": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatid: groupJid,
      text: message,
    }),
  });
  
  return response.ok;
}
```

Adicionar logica apos processar demandas:

```typescript
// Verificar demandas com SLA estourado que ainda nao foram notificadas
const demandsWithSlaBreached = // query demandas sla_exceeded = true sem notificacao

for (const demand of demandsWithSlaBreached) {
  // Montar mensagem de alerta
  const alertMessage = `⚠️ *ALERTA DE SLA*\n\n` +
    `📋 *Grupo:* ${groupName}\n` +
    `📝 *Demanda:* ${demand.description}\n` +
    `⏱️ *Tempo aberto:* ${tempoAberto} minutos\n` +
    `🎯 *Limite SLA:* ${slaLimit} minutos\n\n` +
    `Por favor, verifique o atendimento!`;
  
  // Enviar para grupo X9 de Atendimento
  await sendWhatsAppMessage(notificationGroupId, alertMessage);
  
  // Registrar notificacao para evitar duplicatas
  await supabase.from("sla_notifications").insert({...});
}
```

### 4. Nova Pagina de Configuracao (Opcional)

Interface na area de Settings para:
- Habilitar/desabilitar notificacoes
- Selecionar grupo de destino das notificacoes
- Customizar template da mensagem

## Fluxo de Execucao

1. Cron job executa `analyze-tickets` a cada hora
2. Para cada ticket analisado, verifica demandas com `sla_exceeded = true`
3. Para cada demanda com SLA estourado, verifica se ja foi notificada
4. Se nao foi notificada:
   - Monta mensagem de alerta formatada
   - Envia para o grupo "X9 de Atendimento" via UAZAPI
   - Registra na tabela `sla_notifications`
5. Continua processamento normal

## Formato da Mensagem

```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* [Nome do Grupo do Cliente]
📝 *Demanda:* [Descricao da demanda]
⏱️ *Tempo aberto:* [X] minutos
🎯 *Limite SLA:* 30 minutos
🔴 *Prioridade:* [Alta/Normal/etc]

Por favor, verifique o atendimento!
```

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| supabase/functions/analyze-tickets/index.ts | Modificar | Adicionar logica de notificacao |
| Nova migracao SQL | Criar | Tabela `sla_notifications` + configuracoes |

## Consideracoes

- Notificacoes sao enviadas apenas uma vez por demanda (controle via tabela `sla_notifications`)
- O grupo de notificacao e configuravel via tabela `settings`
- A funcionalidade pode ser desabilitada sem alterar codigo
- Logs detalhados para auditoria de notificacoes enviadas

