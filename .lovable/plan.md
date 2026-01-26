
# Plano: Unificar Dashboard e Relatorios em um Unico Painel

## Objetivo
Combinar as funcionalidades do Dashboard e Relatorios em uma unica pagina responsiva, eliminando redundancia e melhorando a experiencia do usuario.

## Analise das Diferencas

### Dashboard possui:
- 4 Stats Cards (Tickets Hoje, Pendentes, SLA Medio, Resolvidos)
- Grafico de Tempo Medio por Membro (com filtro simples)
- Ultimos 5 Atendimentos (sem paginacao)

### Relatorios possui:
- Filtros Avancados (CS, Grupo, Categorias)
- Grafico Tendencia Semanal (LineChart)
- Grafico Distribuicao de SLA (PieChart)
- Grafico Desempenho por Membro (BarChart com 2 metricas)
- Historico de Atendimentos com paginacao

## Estrutura da Pagina Unificada

A nova pagina combinara todos os elementos em uma estrutura organizada por abas (tabs) para facilitar navegacao em telas menores:

### Layout Proposto:

```
+------------------------------------------+
| Header: Dashboard + Botao Filtros        |
+------------------------------------------+
| [Stats Cards - 4 em grid responsivo]     |
+------------------------------------------+
| [Tabs: Visao Geral | Graficos | Historico]
+------------------------------------------+
| Conteudo da aba selecionada              |
+------------------------------------------+
```

### Aba "Visao Geral" (padrao):
- Tendencia Semanal (LineChart)
- Distribuicao de SLA (PieChart)

### Aba "Desempenho":
- Grafico Tempo Medio por Membro (BarChart completo)

### Aba "Historico":
- Lista de atendimentos com paginacao

## Alteracoes Necessarias

### 1. Arquivo: `src/pages/Index.tsx`

Refatorar completamente para incluir:

**Imports adicionais:**
- Tabs, TabsList, TabsTrigger, TabsContent do Radix
- LineChart, PieChart, Cell do Recharts
- Popover, PopoverContent, PopoverTrigger
- Checkbox, Label, Badge, Button
- useGroups hook
- Icones adicionais (Filter, Brain, Clock, ChevronLeft, ChevronRight, etc.)

**Estados adicionais:**
- selectedCS, selectedGroup, selectedCategories (filtros)
- currentPage (paginacao)
- slaDistribution (dados do pie chart)

**Calculos adicionais:**
- filteredTickets (baseado nos filtros)
- weeklyTrend (tendencia semanal)
- resolvedTickets com paginacao
- slaDistribution (distribuicao OK/Alerta/Estourado)

**Interface:**
- Stats Cards mantidos no topo
- Sistema de abas para organizar conteudo
- Filtros avancados no header (Popover)
- Grid responsivo que se adapta a diferentes tamanhos de tela

### 2. Arquivo: `src/pages/Reports.tsx`

- Sera removido (conteudo migrado para Index.tsx)

### 3. Arquivo: `src/App.tsx`

- Remover rota `/reports`
- Manter redirecionamento ou remover import de Reports

### 4. Arquivo: `src/components/layout/AppSidebar.tsx`

- Remover item "Relatorios" do menu de navegacao
- Manter apenas "Dashboard" que agora contem tudo

## Responsividade

### Desktop (> 1024px):
- Stats Cards: 4 colunas
- Graficos lado a lado (2 colunas)
- Tabs com conteudo amplo

### Tablet (768px - 1024px):
- Stats Cards: 2 colunas
- Graficos empilhados ou lado a lado conforme espaco
- Tabs funcionais

### Mobile (< 768px):
- Stats Cards: 1 coluna (ou 2 compactas)
- Graficos em coluna unica com altura reduzida
- Tabs ocupando largura total
- Historico com cards compactos

## Detalhes Tecnicos

### Estrutura de Tabs:
```typescript
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="overview">Visao Geral</TabsTrigger>
    <TabsTrigger value="performance">Desempenho</TabsTrigger>
    <TabsTrigger value="history">Historico</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Tendencia + Distribuicao SLA */}
  </TabsContent>
  
  <TabsContent value="performance">
    {/* Grafico Tempo Medio por Membro */}
  </TabsContent>
  
  <TabsContent value="history">
    {/* Lista paginada de atendimentos */}
  </TabsContent>
</Tabs>
```

### Grid Responsivo dos Stats:
```typescript
<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
  {/* Stats Cards */}
</div>
```

### Grid Responsivo dos Graficos:
```typescript
<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
  {/* Graficos lado a lado em desktop, empilhados em mobile */}
</div>
```

### Altura Responsiva dos Graficos:
```typescript
<ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
  {/* Grafico */}
</ResponsiveContainer>
```

## Arquivos a Modificar

1. **src/pages/Index.tsx** - Reescrever com todo o conteudo unificado
2. **src/pages/Reports.tsx** - Deletar
3. **src/App.tsx** - Remover rota /reports
4. **src/components/layout/AppSidebar.tsx** - Remover item Relatorios do menu

## Resultado Final

- Uma unica pagina "Dashboard" com todas as informacoes
- Interface organizada por abas para facil navegacao
- Filtros avancados acessiveis de qualquer aba
- Layout totalmente responsivo
- Menos cliques para acessar informacoes
- Codigo mais limpo e sem duplicacao
