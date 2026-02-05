

# Plano: Agregar Desempenho por Membro Corretamente

## Entendimento do Problema

O membro da equipe pode estar em varios grupos de cliente. Atualmente, se existem multiplos registros na tabela `team_members` para a mesma pessoa (mesmo nome, telefones diferentes), o grafico exibe cada registro separadamente.

**Comportamento atual:**
- Matheus Medeiros (ID 1) - 5 tickets resolvidos
- Matheus Medeiros (ID 2) - 3 tickets resolvidos
- Grafico mostra: "Matheus" com 5 tickets | "Matheus" com 3 tickets

**Comportamento esperado:**
- Matheus Medeiros (todos os IDs) - 8 tickets resolvidos no total
- Grafico mostra: "Matheus" com 8 tickets e SLA medio ponderado

---

## Solucao

Modificar a logica do `teamPerformance` em `src/pages/Index.tsx` para:

1. Calcular as metricas individuais de cada registro do membro
2. Agregar os resultados pelo primeiro nome (ou nome completo)
3. Somar os tickets e calcular a media ponderada do SLA

---

## Alteracao

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Index.tsx` | Refatorar o `useMemo` de `teamPerformance` (linhas 209-231) |

---

## Codigo Atual (linhas 209-231)

```tsx
const teamPerformance = useMemo(() => {
  const membersToShow = selectedCS === "all" 
    ? csMembers 
    : csMembers.filter((m) => m.id === selectedCS);

  return membersToShow.map((member) => {
    const memberTickets = filteredTickets.filter(
      (t) => t.resolved_by === member.id && t.status === "resolved"
    );

    const ticketsWithResponse = memberTickets.filter((t) => t.first_response_at);
    const avgSla = ticketsWithResponse.length > 0
      ? ticketsWithResponse.reduce((acc, t) => {
          const created = new Date(t.created_at).getTime();
          const responded = new Date(t.first_response_at!).getTime();
          return acc + (responded - created) / (1000 * 60);
        }, 0) / ticketsWithResponse.length
      : 0;

    return {
      name: member.name.split(" ")[0],
      tickets: memberTickets.length,
      avgSla: Math.round(avgSla),
    };
  });
}, [csMembers, filteredTickets, selectedCS]);
```

---

## Codigo Proposto

```tsx
const teamPerformance = useMemo(() => {
  const membersToShow = selectedCS === "all" 
    ? csMembers 
    : csMembers.filter((m) => m.id === selectedCS);

  // 1. Calcular metricas individuais de cada registro
  const memberMetrics = membersToShow.map((member) => {
    const memberTickets = filteredTickets.filter(
      (t) => t.resolved_by === member.id && t.status === "resolved"
    );

    const ticketsWithResponse = memberTickets.filter((t) => t.first_response_at);
    
    const totalSlaMinutes = ticketsWithResponse.reduce((acc, t) => {
      const created = new Date(t.created_at).getTime();
      const responded = new Date(t.first_response_at!).getTime();
      return acc + (responded - created) / (1000 * 60);
    }, 0);

    return {
      firstName: member.name.split(" ")[0],
      tickets: memberTickets.length,
      totalSlaMinutes,
      ticketsWithResponse: ticketsWithResponse.length,
    };
  });

  // 2. Agregar por primeiro nome (junta resultados de varios grupos)
  const aggregated = memberMetrics.reduce((acc, curr) => {
    const existing = acc.find((a) => a.name === curr.firstName);
    if (existing) {
      // Soma tickets e tempo total para calcular media ponderada depois
      existing.tickets += curr.tickets;
      existing.totalSlaMinutes += curr.totalSlaMinutes;
      existing.ticketsWithResponse += curr.ticketsWithResponse;
    } else {
      acc.push({
        name: curr.firstName,
        tickets: curr.tickets,
        totalSlaMinutes: curr.totalSlaMinutes,
        ticketsWithResponse: curr.ticketsWithResponse,
      });
    }
    return acc;
  }, [] as { 
    name: string; 
    tickets: number; 
    totalSlaMinutes: number; 
    ticketsWithResponse: number;
  }[]);

  // 3. Calcular media ponderada final e formatar para o grafico
  return aggregated.map((m) => ({
    name: m.name,
    tickets: m.tickets,
    avgSla: m.ticketsWithResponse > 0 
      ? Math.round(m.totalSlaMinutes / m.ticketsWithResponse) 
      : 0,
  }));
}, [csMembers, filteredTickets, selectedCS]);
```

---

## Exemplo de Agregacao

```text
Dados de entrada (por registro individual):
+--------------------------------+----------+------------+
| Membro (ID)                    | Tickets  | SLA Total  |
+--------------------------------+----------+------------+
| Matheus Medeiros (ID abc-123)  | 5        | 75 min     |
| Matheus Medeiros (ID def-456)  | 3        | 60 min     |
| Thiago Barretto (ID ghi-789)   | 4        | 40 min     |
| Thiago Barretto (ID jkl-012)   | 2        | 50 min     |
+--------------------------------+----------+------------+

Resultado agregado:
+----------+----------+-------------------+
| Nome     | Tickets  | SLA Medio         |
+----------+----------+-------------------+
| Matheus  | 8        | 16.9 min (135/8)  |
| Thiago   | 6        | 15 min (90/6)     |
+----------+----------+-------------------+
```

---

## Beneficios

- Membros com multiplos registros aparecem uma unica vez no grafico
- Total de tickets e somado corretamente entre todos os registros
- SLA medio e calculado como media ponderada (mais preciso)
- Funciona independente de quantos registros o membro tenha na tabela

