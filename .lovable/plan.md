

# Plano: Corrigir Endpoint UAZAPI para Notificacoes de SLA

## Problema Identificado

Os logs mostram erro **405 Method Not Allowed**:
```
Failed to send WhatsApp message: 405 - {"code":405,"message":"Method Not Allowed.","data":{}}
```

Consultando a documentacao oficial da UAZAPI, identifiquei que o endpoint e os parametros estao incorretos.

## Comparacao: Codigo Atual vs Documentacao UAZAPI

| Aspecto | Codigo Atual | UAZAPI Oficial |
|---------|-------------|----------------|
| Endpoint | `/message/text` | `/send/text` |
| Campo destino | `chatid` | `number` |
| Campo mensagem | `text` | `text` |

## Correcao Necessaria

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

Na funcao `sendWhatsAppMessage`, alterar:

**Antes:**
```typescript
const response = await fetch(`${baseUrl}/message/text`, {
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
```

**Depois:**
```typescript
const response = await fetch(`${baseUrl}/send/text`, {
  method: "POST",
  headers: {
    "token": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    number: groupJid,
    text: message,
  }),
});
```

## Formato da Mensagem

A mensagem de alerta de SLA sera enviada com o seguinte formato (ja implementado corretamente):

```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* [Nome do Grupo do Cliente]
📝 *Demanda:* [Descricao gerada pela IA]
⏱️ *Tempo aberto:* X minutos
🎯 *Limite SLA:* 30 minutos
🔴 *Prioridade:* Alta/Normal/etc

Por favor, verifique o atendimento!
```

Exemplo concreto com dados atuais:
```text
⚠️ *ALERTA DE SLA*

📋 *Grupo:* X9 de Atendimento
📝 *Demanda:* Solicitação de relatório/resultado das campanhas executadas.
⏱️ *Tempo aberto:* 45 minutos
🎯 *Limite SLA:* 30 minutos
🟡 Normal

Por favor, verifique o atendimento!
```

## Acoes

1. Alterar endpoint de `/message/text` para `/send/text`
2. Alterar campo `chatid` para `number` no body
3. Deploy da edge function
4. Executar teste para confirmar envio no grupo "X9 de Atendimento"

## Resultado Esperado

A mensagem sera enviada corretamente para o grupo configurado (120363422213957419@g.us) sempre que uma demanda ultrapassar o limite de SLA.

