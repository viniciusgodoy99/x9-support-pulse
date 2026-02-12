

# Plano: Envio Individual por Grupo + Intervalo 30s + Horario 17:50

## Resumo

Atualmente, todas as mensagens de resumo diario sao enviadas para um unico grupo alvo (X9 de Atendimento). A mudanca fara com que cada resumo seja enviado diretamente no grupo WhatsApp do respectivo cliente, com intervalo de 30 segundos entre envios, a partir das 17:50 BRT.

## Mudancas Necessarias

### 1. Edge Function `daily-report/index.ts` (2 linhas alteradas)

**Linha 419** - Destino da mensagem:
- Atual: `targetGroupId` (grupo fixo de monitoramento)
- Novo: `report.group.whatsapp_id` (grupo WhatsApp do proprio cliente)

**Linha 430** - Intervalo entre envios:
- Atual: `sleep(2000)` (2 segundos)
- Novo: `sleep(30000)` (30 segundos)

Nenhuma outra parte do codigo sera alterada. A logica de busca de grupos, geracao de narrativa por IA e formatacao da mensagem permanecem identicas.

### 2. Cron Job - Horario de disparo

Atualmente existem 2 cron jobs duplicados para o daily-report:
- `daily-report-15h-brt` (jobid 3): `0 18 * * 1-5` (18:00 UTC = 15:00 BRT)
- `daily-report-trigger` (jobid 4): `0 21 * * 1-5` (21:00 UTC = 18:00 BRT)

Acao:
- Remover ambos os cron jobs antigos
- Criar um unico cron job: `50 20 * * 1-5` (20:50 UTC = 17:50 BRT), de segunda a sexta

### Fluxo apos a mudanca

```text
17:50 BRT - Cron dispara a Edge Function
   |
   v
Para cada grupo cliente com demandas no dia:
   |
   +-- Gera narrativa via IA
   +-- Envia mensagem no grupo WhatsApp DO CLIENTE (whatsapp_id)
   +-- Aguarda 30 segundos
   +-- Proximo grupo...
```

### Risco e mitigacao

- **Risco**: Timeout da Edge Function se houver muitos grupos (30s x N grupos). Com o limite padrao de ~150s, suporta ate ~4-5 grupos por execucao.
- **Mitigacao**: O projeto atualmente tem poucos grupos ativos, entao o timeout nao deve ser problema. Se crescer, pode-se ajustar futuramente.

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/daily-report/index.ts` | Linhas 419 e 430 |
| Cron jobs (via SQL) | Remover 2 antigos, criar 1 novo |

