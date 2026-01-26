
# Plano: Adicionar Filtro por Dias Restantes para Arquivamento

## Objetivo
Adicionar um seletor de filtro na secao "Aguardando Classificacao" para permitir filtrar os grupos pelo numero de dias restantes ate o arquivamento automatico.

---

## Alteracoes em `src/pages/settings/Groups.tsx`

### 1. Adicionar novo estado para o filtro de dias

```tsx
const [pendingDaysFilter, setPendingDaysFilter] = useState<"all" | "urgent" | "1-3" | "4-7">("all");
```

### 2. Atualizar a logica de filtragem dos grupos pendentes

Modificar `filteredPendingGroups` para incluir o novo filtro:

```tsx
const filteredPendingGroups = pendingGroups.filter(g => {
  const matchesSearch = g.name.toLowerCase().includes(pendingSearchQuery.toLowerCase());
  
  if (!matchesSearch) return false;
  
  if (pendingDaysFilter === "all") return true;
  
  const daysLeft = getDaysUntilArchive(g.created_at);
  
  switch (pendingDaysFilter) {
    case "urgent":
      return daysLeft <= 1;
    case "1-3":
      return daysLeft >= 1 && daysLeft <= 3;
    case "4-7":
      return daysLeft >= 4 && daysLeft <= 7;
    default:
      return true;
  }
});
```

### 3. Adicionar o componente Select ao lado do campo de busca

Inserir um seletor junto ao campo de busca existente na secao de grupos pendentes:

```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
  <div className="flex items-center gap-2">
    <AlertCircle className="h-5 w-5 text-amber-500" />
    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
      Aguardando Classificacao ({filteredPendingGroups.length})
    </h2>
  </div>
  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
    <div className="relative w-full sm:w-48">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar grupo..."
        value={pendingSearchQuery}
        onChange={(e) => setPendingSearchQuery(e.target.value)}
        className="pl-9"
      />
    </div>
    <Select value={pendingDaysFilter} onValueChange={(value: "all" | "urgent" | "1-3" | "4-7") => setPendingDaysFilter(value)}>
      <SelectTrigger className="w-full sm:w-44">
        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Dias para arquivar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os grupos</SelectItem>
        <SelectItem value="urgent">Urgente (menos de 24h)</SelectItem>
        <SelectItem value="1-3">1 a 3 dias</SelectItem>
        <SelectItem value="4-7">4 a 7 dias</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

---

## Resultado Visual

```
+-----------------------------------------------------------------------+
| ⚠️ Aguardando Classificacao (12)                                      |
|                                                                       |
| [🔍 Buscar grupo...     ] [🕐 Todos os grupos     ▼]                 |
|                                  - Todos os grupos                    |
|                                  - Urgente (menos de 24h)             |
|                                  - 1 a 3 dias                         |
|                                  - 4 a 7 dias                         |
|                                                                       |
| +----------------+ +----------------+ +----------------+              |
| | Grupo A        | | Grupo B        | | Grupo C        |              |
| | 🔴 Urgente     | | 🟡 2 dias      | | 🟡 5 dias      |              |
| +----------------+ +----------------+ +----------------+              |
+-----------------------------------------------------------------------+
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/pages/settings/Groups.tsx | Adicionar estado de filtro, atualizar logica de filtragem e adicionar Select na UI |

---

## Detalhes Tecnicos

- Reutilizar o componente Select ja importado no arquivo
- O icone Clock ja esta importado e sera usado no SelectTrigger
- Os filtros sao cumulativos: busca por nome + filtro por dias funcionam juntos
- Layout responsivo: em mobile, os filtros empilham verticalmente
