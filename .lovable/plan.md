

# Ajustes na Pagina de Testes

## Mudancas

### 1. Filtro de grupos no Resumo Diario
Adicionar um filtro com 3 opcoes ao lado do botao "Carregar Previews":
- **Todos** (padrao) — mostra todos os grupos
- **Com interacao** — mostra apenas grupos que possuem preview carregado com `messagesCount > 0`
- **Sem interacao** — mostra apenas grupos sem preview ou com `messagesCount === 0`

### 2. Remover secao de Estouro de SLA
Apagar completamente o Card 2 (Estouro de SLA) e todo o estado associado (`slaInstance`, `slaTargetGroup`, `slaStatus`, `slaResponse`, `slaNotificationGroupName`, `fetchSlaNotificationGroup`, `handleSlaTest`).

## Detalhes Tecnicos

### Arquivo: `src/pages/settings/Tests.tsx`

**Adicionar estado do filtro:**
```typescript
const [interactionFilter, setInteractionFilter] = useState<"all" | "with" | "without">("all");
```

**Adicionar Select de filtro** na barra de acoes do Resumo Diario, ao lado do botao "Carregar Previews".

**Filtrar grupos no grid** usando `useMemo`:
```typescript
const filteredGroups = useMemo(() => {
  if (interactionFilter === "all") return clientGroups;
  return clientGroups.filter(g => {
    const preview = previews.get(g.id);
    if (interactionFilter === "with") return preview && preview.messagesCount > 0;
    return !preview || preview.messagesCount === 0;
  });
}, [clientGroups, previews, interactionFilter]);
```

**Remover:** Todo o Card 2 (Estouro de SLA), estados `sla*`, funcao `fetchSlaNotificationGroup`, funcao `handleSlaTest`, e o `useEffect` que chama `fetchSlaNotificationGroup`.

