

# Plano: Notificacoes de SLA do Final de Semana na Segunda-Feira

## Problema

Atualmente, a funcao `sendSlaBreachNotifications` roda a cada hora (cron `0 * * * *`) e envia notificacoes imediatamente quando detecta estouro de SLA. Porem, no final de semana (sabado/domingo), nao ha equipe para atender. As notificacoes de demandas que estourarem o SLA no fim de semana devem ser enviadas apenas na segunda-feira, dentro do horario comercial.

## Solucao

Adicionar uma verificacao de horario comercial na funcao `sendSlaBreachNotifications` em `analyze-tickets/index.ts`. Se estiver fora do horario comercial (fora de seg-sex 08:00-18:00 BRT), as notificacoes simplesmente nao sao enviadas naquele momento. Na segunda-feira as 08:00, o cron roda novamente e, como as demandas ainda estao com `sla_exceeded = true` e `status = open` sem registro em `sla_notifications`, elas serao notificadas normalmente.

O mecanismo ja funciona corretamente para esse cenario porque:
- A verificacao de duplicatas usa a tabela `sla_notifications` (so marca como notificado apos envio bem-sucedido)
- Se a notificacao nao foi enviada no fim de semana, nao ha registro, entao sera enviada na segunda

## Alteracao

| Arquivo | Local | Modificacao |
|---------|-------|-------------|
| `supabase/functions/analyze-tickets/index.ts` | Inicio da funcao `sendSlaBreachNotifications` (~linha 250) | Adicionar verificacao de horario comercial BRT |

### Codigo a adicionar (apos a verificacao de `enabledSetting`, antes de buscar demandas):

```typescript
// Check if we're within business hours (Mon-Fri, 08:00-18:00 BRT)
const nowBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const dayOfWeek = nowBRT.getDay(); // 0=Sun, 6=Sat
const hour = nowBRT.getHours();

if (dayOfWeek === 0 || dayOfWeek === 6 || hour < 8 || hour >= 18) {
  console.log("Outside business hours (BRT), skipping SLA notifications");
  return { sent, errors };
}
```

## Resultado esperado

- Sexta 18:01+: Notificacoes pausadas
- Sabado/Domingo: Nenhuma notificacao enviada
- Segunda 08:00: Todas as demandas que estouraram SLA no fim de semana sao notificadas de uma vez
- Seg-Sex 08:00-18:00: Comportamento normal, notificacoes enviadas em tempo real

## Riscos

Nenhum. A verificacao e adicionada no inicio da funcao, antes de qualquer processamento. Se estiver fora do horario, a funcao retorna imediatamente sem efeitos colaterais.

