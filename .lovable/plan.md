

# Plano: Blindar a Cadeia de Lotes do Resumo Diario

## Problemas no Codigo Atual

Revisando o arquivo `supabase/functions/daily-report/index.ts`, identifiquei 2 problemas principais:

1. **Loop sem protecao**: O `for` que processa cada grupo (linhas 380-394) nao tem `try/catch` individual. Se `formatGroupMessage` (que chama a IA) lancar uma excecao inesperada, o loop inteiro morre e o lote para ali -- sem invocar o proximo lote.

2. **Sem validacao da auto-invocacao**: Apos o `fetch` recursivo (linha 403), o codigo nao verifica `selfInvokeResponse.ok`. Se a chamada falhar (ex: 500, timeout de rede), a cadeia e silenciosamente interrompida sem nenhum erro nos logs.

O `await` no fetch ja existe (linha 403) e o header de Authorization tambem (linha 409), entao esses pontos ja estao corretos.

## Alteracoes

| Arquivo | Modificacao |
|---------|-------------|
| `supabase/functions/daily-report/index.ts` | Blindar loop com try/catch individual + validar resposta da auto-invocacao |

### Detalhes

**1. Try/catch individual no loop (linhas 380-394)**

Envolver `formatGroupMessage` + `sendWhatsAppMessage` em try/catch para que a falha de um grupo nao interrompa os demais:

```typescript
for (const report of batch) {
  try {
    const message = await formatGroupMessage(report, dateStr);
    const success = await sendWhatsAppMessage(...);
    if (success) sentCount++;
    else failedCount++;
  } catch (error) {
    console.error(`Erro ao enviar para o grupo ${report.group.whatsapp_id} (${report.group.name}): ${error}`);
    failedCount++;
  }
  await sleep(2000);
}
```

**2. Validacao da resposta recursiva (linhas 420-422)**

Apos o fetch, verificar se a resposta foi bem-sucedida e logar erro caso contrario:

```typescript
const selfResult = await selfInvokeResponse.text();
if (!selfInvokeResponse.ok) {
  console.error(`Erro na chamada recursiva para offset ${nextOffset}: ${selfInvokeResponse.status} - ${selfResult}`);
  throw new Error(`Recursive call failed for offset ${nextOffset}: ${selfInvokeResponse.status}`);
}
console.log(`Proximo lote acionado com sucesso: Offset ${nextOffset}`);
```

**3. Logs em portugues mais descritivos (linhas 375, 396, 401)**

Atualizar mensagens de log para o padrao solicitado:
- "Iniciando processamento do lote: Offset X a Y de Z grupos"
- "Lote finalizado: X enviados, Y falharam"
- "Proximo lote acionado com sucesso: Offset X"

## Resultado Esperado

- Se a geracao de IA falhar para 1 grupo, os outros 9 do lote continuam normalmente
- Se a auto-invocacao falhar, o erro fica registrado nos logs com status e corpo da resposta
- Logs claros em portugues para facilitar depuracao

