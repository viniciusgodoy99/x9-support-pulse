
# Plano: Ajustar Responsividade dos Cards de Grupos

## Problema Identificado

Os cards de grupos utilizam um grid que começa com 1 coluna em mobile e salta para 2 em `md` e 3 em `lg`. No entanto, os filtros e headers das seções podem estar quebrando em telas menores, e faltam breakpoints intermediários para tablets.

## Alteracoes Propostas

### Arquivo: src/pages/settings/Groups.tsx

**1. Ajustar grid dos cards em todas as secoes**

Alterar de:
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
```

Para:
```tsx
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

Isso adiciona:
- `gap-3` em mobile, `sm:gap-4` em telas maiores
- `sm:grid-cols-2` para tablets pequenos (a partir de 640px)
- `xl:grid-cols-4` para telas extra grandes

**2. Ajustar header dos filtros para mobile (Grupos de Clientes - linha 260)**

Alterar de:
```tsx
<div className="flex flex-wrap items-center justify-between gap-4">
```

Para:
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
```

Ajustar campos de busca para ocupar largura total em mobile:
```tsx
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
  <div className="relative w-full sm:w-48">
    ...
  </div>
  <Select ...>
    <SelectTrigger className="w-full sm:w-32">
      ...
    </SelectTrigger>
  </Select>
</div>
```

**3. Ajustar header da secao Aguardando Classificacao (linha 386)**

Alterar de:
```tsx
<div className="flex items-center justify-between gap-4">
```

Para:
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
```

E o campo de busca:
```tsx
<div className="relative w-full sm:w-64">
```

**4. Ajustar header da secao Grupos Internos (similar ao item 2)**

Aplicar as mesmas alteracoes de responsividade.

**5. Ajustar botoes de acao nos cards para telas pequenas**

Os botoes de acao (Users, Edit, Power, Delete) devem ter espacamento adequado:
```tsx
<div className="flex flex-wrap items-center gap-2">
```

## Resumo das Alteracoes

| Elemento | Antes | Depois |
|----------|-------|--------|
| Grid dos cards | `md:grid-cols-2 lg:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| Header filtros | `flex flex-wrap` | `flex flex-col sm:flex-row` |
| Campo busca | `w-48` ou `w-64` fixo | `w-full sm:w-48/64` |
| Select status | `w-32` fixo | `w-full sm:w-32` |
| Gap do grid | `gap-4` | `gap-3 sm:gap-4` |

## Comportamento Esperado

- **Mobile (< 640px)**: Cards em coluna unica, filtros empilhados verticalmente
- **Tablet (640-1023px)**: 2 colunas de cards, filtros em linha
- **Desktop (1024-1279px)**: 3 colunas de cards
- **Large (>= 1280px)**: 4 colunas de cards para aproveitar espaco

## Arquivos a Modificar

1. `src/pages/settings/Groups.tsx` - Ajustar grids e layouts dos headers em 3 secoes (linhas 260, 290, 386, 403, 446, 474)
