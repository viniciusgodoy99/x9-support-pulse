
# Plano: Corrigir Gráfico de Tempo Médio e Adicionar Filtro de Membro

## Situacao Atual

O grafico "Tempo Medio por Membro" no Dashboard usa **dados mockados**. Os nomes "Joao", "Maria", "Carlos" sao placeholders estaticos, nao refletem os membros reais da equipe nem dados reais de atendimento.

A logica correta ja existe na pagina de Relatorios e funciona assim:
1. Para cada membro da equipe (role = CS), busca tickets onde `resolved_by` = ID do membro
2. Filtra apenas tickets resolvidos que possuem `first_response_at`
3. Calcula: `(timestamp first_response_at - timestamp created_at) / 60000` = minutos
4. Faz a media de todos os tickets do membro

## Alteracoes Necessarias

### Arquivo: `src/pages/Index.tsx`

1. **Adicionar imports necessarios**
   - `useTeamMembers` hook para buscar membros reais
   - `useMemo` do React para calculos otimizados
   - Componentes de Select para o filtro

2. **Adicionar estado para o filtro**
   - Estado `selectedMember` para controlar qual membro esta selecionado (default: "all")

3. **Implementar calculo real do tempo medio**
   - Usar `useMemo` para calcular `teamPerformance` baseado nos tickets reais
   - Filtrar por membro selecionado quando aplicavel
   - Logica identica a da pagina de Relatorios

4. **Adicionar filtro de selecao**
   - Select dropdown no header do card
   - Opcao "Todos" + lista de membros CS ativos
   - Atualiza o grafico dinamicamente

## Resultado Esperado

- Grafico mostrara dados reais baseados nos atendimentos resolvidos
- Usuario podera filtrar para ver apenas um membro especifico
- Quando "Todos" selecionado, mostra comparativo entre todos os CS
- Quando membro especifico selecionado, mostra apenas ele (util para analise individual)

---

## Detalhes Tecnicos

### Imports a adicionar:
```typescript
import { useMemo } from "react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### Estado do filtro:
```typescript
const [selectedMember, setSelectedMember] = useState<string>("all");
```

### Calculo do desempenho:
```typescript
const csMembers = useMemo(() => 
  members.filter(m => m.role === "CS" && m.is_active),
  [members]
);

const teamPerformance = useMemo(() => {
  const membersToShow = selectedMember === "all" 
    ? csMembers 
    : csMembers.filter(m => m.id === selectedMember);

  return membersToShow.map(member => {
    const memberTickets = tickets.filter(
      t => t.resolved_by === member.id && t.status === "resolved"
    );

    const ticketsWithResponse = memberTickets.filter(t => t.first_response_at);
    const avgTime = ticketsWithResponse.length > 0
      ? ticketsWithResponse.reduce((acc, t) => {
          const created = new Date(t.created_at).getTime();
          const responded = new Date(t.first_response_at!).getTime();
          return acc + (responded - created) / (1000 * 60);
        }, 0) / ticketsWithResponse.length
      : 0;

    return {
      name: member.name.split(" ")[0],
      tempo: Math.round(avgTime),
    };
  });
}, [csMembers, tickets, selectedMember]);
```

### Select no CardHeader:
```typescript
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  <CardTitle className="flex items-center gap-2">
    <TrendingUp className="h-5 w-5 text-primary" />
    Tempo Medio por Membro
  </CardTitle>
  <Select value={selectedMember} onValueChange={setSelectedMember}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filtrar membro" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      {csMembers.map(member => (
        <SelectItem key={member.id} value={member.id}>
          {member.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</CardHeader>
```
