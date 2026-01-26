
# Plano: Adicionar Filtro de Busca para Grupos Aguardando Classificação

## Objetivo

Adicionar um campo de busca no canto direito da seção "Aguardando Classificação" para filtrar grupos por nome.

## Alterações

### Arquivo: src/pages/settings/Groups.tsx

**1. Adicionar estado para o filtro de busca (após linha 42)**
```typescript
const [pendingSearchQuery, setPendingSearchQuery] = useState("");
```

**2. Adicionar import do ícone Search (linha 3)**
```typescript
import { MessageSquare, Trash2, Edit2, Power, Users, AlertCircle, Building2, UserCircle, Search } from "lucide-react";
```

**3. Criar lista filtrada de grupos pendentes (após linha 138)**
```typescript
const filteredPendingGroups = pendingGroups.filter(g =>
  g.name.toLowerCase().includes(pendingSearchQuery.toLowerCase())
);
```

**4. Modificar o header da seção "Aguardando Classificação" (linhas 329-334)**

Adicionar um layout flex com o título à esquerda e o campo de busca à direita:
```tsx
<div className="flex items-center justify-between gap-4">
  <div className="flex items-center gap-2">
    <AlertCircle className="h-5 w-5 text-amber-500" />
    <h2 className="text-xl font-semibold text-foreground">
      Aguardando Classificação ({filteredPendingGroups.length})
    </h2>
  </div>
  <div className="relative w-64">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Buscar grupo..."
      value={pendingSearchQuery}
      onChange={(e) => setPendingSearchQuery(e.target.value)}
      className="pl-9"
    />
  </div>
</div>
```

**5. Atualizar o map para usar a lista filtrada (linha 336)**
```tsx
{filteredPendingGroups.map((group) => (
```

## Comportamento

- O filtro busca pelo nome do grupo (case-insensitive)
- O contador no título mostra quantos grupos estão visíveis após o filtro
- Campo de busca aparece apenas quando há grupos pendentes
- Design consistente com outros filtros do sistema

## Arquivos a Modificar

1. `src/pages/settings/Groups.tsx` - Adicionar estado, filtro e campo de busca
