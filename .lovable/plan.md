

# Plano: Escalar Envio do Resumo Diario para Qualquer Quantidade de Grupos

## Problema

A funcao `daily-report` processa os grupos sequencialmente com `sleep(30000)` (30 segundos) entre cada envio. Com 53 grupos (e crescendo), a funcao precisa de mais de 26 minutos, mas o limite de execucao de uma Edge Function e de aproximadamente 150 segundos. Resultado: apenas os 2-3 primeiros grupos recebem o resumo.

Mesmo reduzindo o sleep para 2 segundos, cada grupo precisa de ~3-5 segundos (chamada de IA + envio WhatsApp + sleep), totalizando ~160-265 segundos para 53 grupos -- ainda estouraria o limite.

## Solucao: Processamento em Lotes Auto-Invocantes

A funcao vai processar grupos em lotes de 10. Ao terminar um lote, ela chama a si mesma passando o proximo lote como parametro, garantindo que funcione com qualquer quantidade de grupos.

```text
Cron 17:50 BRT
    |
    v
daily-report (offset=0)
    |-- Processa grupos 1-10 (~50s)
    |-- Chama daily-report (offset=10)
    |       |-- Processa grupos 11-20 (~50s)
    |       |-- Chama daily-report (offset=20)
    |       |       |-- Processa grupos 21-30 (~50s)
    |       |       |-- ... continua ate acabar
    |       |       v
    v       v
  Todos os grupos processados
```

## Alteracoes

| Arquivo | Modificacao |
|---------|-------------|
| `supabase/functions/daily-report/index.ts` | Reestruturar para processar em lotes de 10 com auto-invocacao |

### Detalhes tecnicos

1. **Aceitar parametro `offset`**: A funcao recebe um `offset` (padrao 0) e um `batchId` para rastrear a execucao completa

2. **Preparar dados uma vez**: Na primeira invocacao (offset=0), busca todos os grupos e demandas, monta os reports e filtra apenas os que tem demandas. Salva essa lista filtrada no corpo da proxima chamada

3. **Processar lote**: Processa apenas 10 grupos por invocacao (AI + envio + 2s sleep entre mensagens)

4. **Auto-invocar proximo lote**: Se ainda houver grupos restantes, a funcao chama a si mesma via HTTP com o proximo offset, passando os dados ja preparados (reports pre-computados)

5. **Sleep reduzido**: Intervalo entre mensagens reduzido de 30s para 2s

### Estrutura do codigo:

```typescript
// Na primeira chamada (sem offset), prepara tudo e envia primeiro lote
// Nas chamadas seguintes, recebe reports prontos e continua enviando

const BATCH_SIZE = 10;

// Aceitar body com offset e reports pre-computados
const body = await req.json().catch(() => ({}));
const offset = body.offset || 0;
const precomputedReports = body.reports || null;

// Se offset=0, buscar dados e preparar reports
// Se offset>0, usar reports recebidos no body

// Processar lote atual (offset ate offset+BATCH_SIZE)
// Sleep de 2s entre cada envio

// Se ainda restam grupos, chamar a si mesmo:
fetch(`${supabaseUrl}/functions/v1/daily-report`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${supabaseKey}`
  },
  body: JSON.stringify({
    offset: offset + BATCH_SIZE,
    reports: reportsWithDemands,
    instanceData: { api_url, api_token },
    dateStr
  })
});
```

### Calculo de tempo por lote

- 10 grupos x (~3s AI + ~1s envio + 2s sleep) = ~60 segundos por lote
- Bem dentro do limite de 150 segundos

### Escalabilidade

| Grupos com demandas | Lotes necessarios | Tempo total |
|---------------------|-------------------|-------------|
| 10 | 1 | ~60s |
| 30 | 3 | ~180s (3 invocacoes) |
| 53 | 6 | ~360s (6 invocacoes) |
| 100 | 10 | ~600s (10 invocacoes) |

Cada lote roda em sua propria invocacao, sem risco de timeout.

## Resultado Esperado

- Todos os grupos com demandas recebem o resumo diario, independente da quantidade
- Cada lote processa 10 grupos em ~60 segundos
- Intervalo de 2 segundos entre mensagens evita rate limiting na UAZAPI
- Logs claros indicando qual lote esta sendo processado e quantos restam

