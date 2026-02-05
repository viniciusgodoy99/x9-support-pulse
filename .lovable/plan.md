
# Plano: Exibir Nome Completo no Gráfico de Desempenho

## Problema

O gráfico de "Desempenho por Membro" atualmente exibe apenas o primeiro nome dos membros, o que causa confusão quando há nomes similares como "Mateus" e "Matheus".

**Código atual (linha 224):**
```tsx
firstName: member.name.split(" ")[0],
```

## Solução

Alterar a lógica de agregação para usar o nome completo do membro em vez do primeiro nome.

## Alterações

| Arquivo | Linhas | Modificação |
|---------|--------|-------------|
| src/pages/Index.tsx | 224, 231-234, 240-241 | Usar nome completo em vez de primeiro nome |

### Código Proposto

**Linha 224** - Extrair nome completo:
```tsx
fullName: member.name,  // Era: member.name.split(" ")[0]
```

**Linhas 231-245** - Atualizar agregação para usar nome completo:
```tsx
// 2. Aggregate by full name (combines results from multiple groups)
const aggregated = memberMetrics.reduce(
  (acc, curr) => {
    const existing = acc.find((a) => a.name === curr.fullName);
    if (existing) {
      existing.tickets += curr.tickets;
      existing.totalSlaMinutes += curr.totalSlaMinutes;
      existing.ticketsWithResponse += curr.ticketsWithResponse;
    } else {
      acc.push({
        name: curr.fullName,
        tickets: curr.tickets,
        totalSlaMinutes: curr.totalSlaMinutes,
        ticketsWithResponse: curr.ticketsWithResponse,
      });
    }
    return acc;
  },
  [] as { name: string; tickets: number; totalSlaMinutes: number; ticketsWithResponse: number }[]
);
```

## Resultado Visual

Antes: `Mateus` | `Matheus` | `Thiago`

Depois: `Mateus Silva` | `Matheus Medeiros` | `Thiago Barretto`

**Nota:** Se os nomes ficarem muito longos no eixo X do gráfico, o Recharts automaticamente rotaciona ou trunca conforme o espaço disponível.
