
# Plano: Melhorar Cores das Barras do Grafico

## Situacao Atual

O grafico de desempenho por membro usa duas cores:
- **Tickets**: `hsl(var(--primary))` - azul ice primario
- **SLA Medio**: `hsl(var(--chart-2))` - verde-azulado (chart-2)

Ambas as cores sao tons de azul/ciano, o que pode dificultar a distincao visual.

## Solucao

Alterar a cor da barra de SLA Medio para usar `--chart-4` (azul mais escuro) que oferece maior contraste com a cor primaria, mantendo a paleta de cores "frozen/ice" do tema.

Cores disponiveis na paleta (de src/index.css):
- `--chart-1`: 195 100% 50% (ciano brilhante)
- `--chart-2`: 180 70% 45% (verde-azulado)
- `--chart-3`: 200 40% 60% (azul medio)
- `--chart-4`: 210 50% 40% (azul escuro) - **melhor contraste**
- `--chart-5`: 220 40% 30% (azul profundo)

## Alteracao

| Arquivo | Linha | Modificacao |
|---------|-------|-------------|
| src/pages/Index.tsx | 594-595 | Alterar cores das barras |

## Codigo Atual

```tsx
<Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tickets" />
<Bar dataKey="avgSla" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="SLA Médio (min)" />
```

## Codigo Proposto

```tsx
<Bar dataKey="tickets" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Tickets" />
<Bar dataKey="avgSla" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="SLA Médio (min)" />
```

## Resultado Visual

- **Tickets**: Ciano brilhante (chart-1) - cor vibrante e chamativa
- **SLA Medio**: Azul escuro (chart-4) - contraste claro com a primeira barra

Ambas as cores permanecem dentro da paleta "ice/snow" do tema, mas com contraste suficiente para distincao imediata.
