
# Plano: Ajustar Responsividade da Versao Mobile do Dashboard

## Objetivo
Melhorar a experiencia do Dashboard em dispositivos moveis, garantindo melhor usabilidade, legibilidade e organizacao visual.

---

## Problemas Identificados

1. **Cards de Estatisticas**: Grid de 2 colunas pode causar textos truncados em telas muito pequenas
2. **Graficos lado a lado**: O grid `md:grid-cols-2` pode ficar apertado em tablets
3. **Barra de Acao**: Layout pode empilhar de forma desorganizada
4. **Card do Historico de Atendimentos**: 
   - Titulo e badge podem sobrepor em mobile
   - Botoes de paginacao muito pequenos para toque
5. **TicketHistoryCard**: Layout interno pode ficar apertado
6. **Labels dos Graficos**: Podem ficar cortados em telas pequenas
7. **Popover de Filtros**: Pode nao caber bem em mobile

---

## Alteracoes em `src/pages/Index.tsx`

### 1. Ajustar Barra de Acao para empilhar corretamente

```tsx
// Linha 263 - Barra de acao
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
```

### 2. Ajustar largura do Popover de Filtros para mobile

```tsx
// Linha 289 - PopoverContent
<PopoverContent className="w-[90vw] sm:w-80" align="end">
```

### 3. Ajustar cards de estatisticas para single column em telas muito pequenas

```tsx
// Linha 384 - Grid de stats
<div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
```

Como `xs` nao existe no Tailwind padrao, usar alternativa:

```tsx
<div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
```

E ajustar o conteudo interno dos StatsCards para mobile

### 4. Ajustar header do Desempenho por Membro

```tsx
// Linha 518 - Header do card
<CardHeader className="flex flex-col gap-3 p-4 sm:p-6">
  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
    Desempenho por Membro
  </CardTitle>
  <Select value={selectedCS} onValueChange={setSelectedCS}>
    <SelectTrigger className="w-full sm:w-[180px]">
      <SelectValue placeholder="Filtrar membro" />
    </SelectTrigger>
    ...
  </Select>
</CardHeader>
```

### 5. Ajustar header do Historico de Atendimentos para mobile

```tsx
// Linha 572-581
<CardHeader className="p-4 sm:p-6">
  <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
    <div className="flex items-center gap-2">
      <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      Historico de Atendimentos
    </div>
    {resolvedTickets.length > 0 && (
      <Badge variant="secondary" className="w-fit">
        {resolvedTickets.length} total
      </Badge>
    )}
  </CardTitle>
</CardHeader>
```

### 6. Melhorar paginacao para mobile

```tsx
// Linha 596-632
{totalPages > 1 && (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
    <span className="text-sm text-muted-foreground order-2 sm:order-1">
      Pagina {currentPage} de {totalPages}
    </span>
    <div className="flex items-center gap-2 order-1 sm:order-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="h-9 px-3"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sm:hidden ml-1">Anterior</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="h-9 px-3"
      >
        <span className="sm:hidden mr-1">Proximo</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
)}
```

### 7. Ajustar titulos dos graficos para mobile

```tsx
// Titulos de cards de graficos
<CardTitle className="flex items-center gap-2 text-base sm:text-lg">
```

### 8. Reduzir altura dos graficos em mobile (ja implementado, validar)

O `chartHeight` ja usa `isMobile ? 250 : 300`, manter como esta.

---

## Alteracoes em `src/components/reports/TicketHistoryCard.tsx`

### 1. Ajustar layout interno do card para mobile

```tsx
// Linha 67 - CardContent padding
<CardContent className="p-3 sm:p-4">
```

### 2. Ajustar layout do header do card

```tsx
// Linha 68-144 - Reestruturar para empilhar em mobile
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
  <div className="flex-1 min-w-0">
    ...
  </div>
  <div className="flex items-center justify-between sm:justify-end gap-2">
    ...
  </div>
</div>
```

### 3. Ajustar DialogContent do modal para mobile

```tsx
// Linha 202
<DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
```

---

## Alteracoes em `src/components/dashboard/StatsCard.tsx`

### 1. Ajustar tamanho do valor para mobile

```tsx
<div className={cn(
  "text-2xl sm:text-3xl font-bold",
  ...
)}>
  {value}
</div>
```

### 2. Ajustar padding interno

```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6 sm:pb-2">
```

---

## Resultado Visual Esperado (Mobile)

```
+----------------------------------+
| Dashboard                        |
+----------------------------------+
| 10 tickets hoje                  |
|              [Filtros (2)]       |
+----------------------------------+
| +--------------+ +--------------+|
| | Tickets Hoje | | Pendentes    ||
| |     10       | |     0        ||
| +--------------+ +--------------+|
| +--------------+ +--------------+|
| | SLA Medio    | | Resolvidos   ||
| |    2min      | |    10        ||
| +--------------+ +--------------+|
+----------------------------------+
| Tendencia Semanal                |
| [Grafico de Linha - 250px]       |
+----------------------------------+
| Distribuicao de SLA              |
| [Grafico Pizza - 250px]          |
+----------------------------------+
| Desempenho por Membro            |
| [Select: Todos          ▼]       |
| [Grafico de Barras]              |
+----------------------------------+
| Historico de Atendimentos        |
| 30 total                         |
|                                  |
| [Card de Ticket]                 |
| [Card de Ticket]                 |
| ...                              |
|                                  |
| [Anterior] [Proximo]             |
| Pagina 1 de 3                    |
+----------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/pages/Index.tsx | Ajustar layouts, espacamentos, headers e paginacao para mobile |
| src/components/reports/TicketHistoryCard.tsx | Ajustar padding, layout interno e modal para mobile |
| src/components/dashboard/StatsCard.tsx | Ajustar tamanho de fonte e padding para mobile |

---

## Detalhes Tecnicos

- Usar classes responsivas Tailwind (`sm:`, `md:`, `lg:`) para adaptar layouts
- Priorizar `flex-col` em mobile e `flex-row` em desktop
- Ajustar paddings: `p-3 sm:p-4` ou `p-4 sm:p-6`
- Ajustar tamanhos de fonte: `text-base sm:text-lg`, `text-2xl sm:text-3xl`
- Botoes de paginacao maiores e com labels em mobile para melhor acessibilidade
- Popover de filtros ocupa 90% da largura da tela em mobile
- Manter graficos com altura reduzida (250px) em mobile
