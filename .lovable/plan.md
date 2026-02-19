
# Ajuste na Lógica do Relatório Diário: Interações ao invés de Demandas

## Situação Atual vs. Nova Regra

| Critério | Atual | Novo |
|---|---|---|
| Gatilho de envio | Grupo com `ticket_demands` no dia | Grupo com qualquer `message` no dia |
| Grupos afetados hoje | 11 | 23 |
| Narrativa da IA | Baseada nas demandas identificadas | Baseada nas demandas (se houver) ou numa mensagem padrão |

## Arquivo a Modificar

`supabase/functions/daily-report/index.ts`

## Mudanças Técnicas Detalhadas

### 1. Buscar grupos com mensagens no dia (tabela `messages`)

Substituir a lógica que busca `ticket_demands` para filtrar grupos pela lógica que busca `messages`. A query ficará:

```sql
SELECT DISTINCT group_id
FROM messages
WHERE group_id IN (ids dos grupos clientes)
  AND created_at >= todayStartISO
```

Isso retorna os IDs dos grupos que tiveram qualquer mensagem (de cliente, membro da equipe ou bot) no dia.

### 2. Manter o enriquecimento de demandas como dado adicional

As `ticket_demands` continuam sendo buscadas para enriquecer a narrativa da IA quando existirem. A diferença é que elas não são mais o critério de inclusão — apenas um dado de contexto opcional.

### 3. Ajustar o filtro de reports

Linha atual:
```typescript
.filter((r) => r.totalDemands > 0)
```

Nova lógica:
```typescript
.filter((r) => groupsWithMessages.has(r.group.id))
```

Onde `groupsWithMessages` é o `Set<string>` dos IDs dos grupos que tiveram mensagens.

### 4. Ajustar a geração da narrativa da IA

A função `generateNarrativeSummary` receberá uma flag indicando se há demandas formais ou não:

- **Com demandas**: comportamento atual — narrativa baseada nas descrições das demandas.
- **Sem demandas (apenas interações)**: a IA recebe uma instrução diferente, gerando uma mensagem como: _"Hoje tivemos uma troca de mensagens por aqui. Até amanhã! 👋"_ — simples e sem inventar tópicos.

Alternativamente (mais simples e seguro): se não há demandas, pular a IA e usar uma mensagem padrão fixa:

```
📋 NOME DO GRUPO
Resumo do dia DD/MM

Hoje passamos por aqui e mantivemos o contato em dia. 😊

Até amanhã! 👋
```

### 5. Logs atualizados

- `"Found X groups with messages today (filtering by any interaction)"`
- `"Group [nome]: X demands, Y messages"`

## Impacto

- Grupos que hoje têm conversa mas nenhuma demanda formalizada passarão a receber o resumo
- O volume de relatórios enviados hoje subiria de 11 para 23 grupos
- A cadeia de lotes (batching) e a resiliência já implementadas continuam funcionando normalmente
