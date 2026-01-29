
# Plano: Corrigir Intervalo de Analise para 1 Hora

## Problema Identificado

O `analyze-tickets` ja foi corrigido, porem o **webhook-whatsapp** ainda esta criando novos tickets com `next_analysis_at` de **2 minutos** em vez de **1 hora**.

### Arquivo com Problema

**`supabase/functions/webhook-whatsapp/index.ts`**

- **Linha 486**: `const nextAnalysisAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // +2 minutes`

## Alteracao Necessaria

### Linha 486

```typescript
// De:
const nextAnalysisAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // +2 minutes

// Para:
const nextAnalysisAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour
```

## Atualizar Ticket Existente

O ticket `010f17cd-1fd0-4182-b2e6-6919a72c9026` ainda tem `next_analysis_at` em 2 minutos. Apos corrigir o codigo, vou atualizar este ticket para ter o intervalo correto de 1 hora.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| supabase/functions/webhook-whatsapp/index.ts | Alterar 2 minutos para 1 hora na criacao de tickets |

## Acoes Pos-Implementacao

1. Fazer deploy da edge function `webhook-whatsapp`
2. Atualizar o `next_analysis_at` do ticket existente para 1 hora no futuro
