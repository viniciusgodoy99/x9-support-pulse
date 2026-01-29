

# Plano: Corrigir URL da API UAZAPI para Notificacoes de SLA

## Problema Identificado

O erro nos logs e claro:
```
Error sending WhatsApp message: TypeError: Invalid URL: 'climb.uazapi.com/message/text'
```

A URL esta invalida porque falta o prefixo `https://`. O valor em `EVOLUTION_API_URL` e `climb.uazapi.com`, mas a funcao `sendWhatsAppMessage` no `analyze-tickets` esta usando a URL diretamente sem adicionar o protocolo.

## Comparacao com Outras Edge Functions

As outras edge functions ja tratam este caso corretamente:

| Edge Function | Tratamento da URL |
|---------------|-------------------|
| `webhook-whatsapp` | `const baseUrl = apiUrl.startsWith("http") ? apiUrl : \`https://${apiUrl}\`;` |
| `whatsapp-connect` | Mesma verificacao nas linhas 64-65 |
| `analyze-tickets` | **NAO TEM TRATAMENTO** - usa `${apiUrl}/message/text` diretamente |

## Correcao Necessaria

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

Na funcao `sendWhatsAppMessage` (linha 46), adicionar a normalizacao da URL:

```typescript
// De:
const response = await fetch(`${apiUrl}/message/text`, {

// Para:
const baseUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
const response = await fetch(`${baseUrl}/message/text`, {
```

## Alteracao Completa

```typescript
async function sendWhatsAppMessage(groupJid: string, message: string): Promise<boolean> {
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");

  if (!apiUrl || !apiKey) {
    console.error("UAZAPI credentials not configured");
    return false;
  }

  try {
    // Normalizar URL - adicionar https:// se necessario
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
    
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
    // ... resto do codigo
```

## Acoes

1. Modificar a funcao `sendWhatsAppMessage` no `analyze-tickets`
2. Deploy da edge function
3. Testar novamente

## Resultado Esperado

Apos a correcao, a URL sera `https://climb.uazapi.com/message/text` em vez de `climb.uazapi.com/message/text`, permitindo o envio correto das notificacoes.

