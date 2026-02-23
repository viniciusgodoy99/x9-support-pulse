- Filtrar Demandas Pendentes Apenas de Grupos de Clientes e feitas por clientes, demandas que foram feitas por membros da equipe não deve entrar como demanda pendentes

## Problema

O hook `usePendingDemands` busca todas as demandas abertas sem filtrar por tipo de grupo. Isso faz com que demandas de grupos internos (onde `is_client_group = false`) tambem aparecam na lista de demandas pendentes.

## Solucao

Adicionar filtros na query do hook `usePendingDemands` para garantir que apenas demandas de grupos marcados como `is_client_group = true` e `is_active = true` sejam retornadas.

## Detalhes Tecnicos

### Arquivo: `src/hooks/usePendingDemands.tsx`

Na query Supabase (linha 36-59), adicionar dois filtros na relacao `monitored_groups`:

```typescript
.eq("tickets.monitored_groups.is_client_group", true)
.eq("tickets.monitored_groups.is_active", true)
```

Como o join com `monitored_groups` ja usa `!inner`, grupos que nao atendem esses criterios serao automaticamente excluidos dos resultados. Nenhuma outra mudanca e necessaria.  
  
