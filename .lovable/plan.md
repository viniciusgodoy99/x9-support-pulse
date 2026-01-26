
# Plano: Corrigir Responsividade Mobile em Todos os Paineis

## Objetivo
Padronizar a responsividade em todas as paginas do aplicativo, utilizando como base os padroes ja implementados nas paginas de configuracoes (Groups.tsx) e no Dashboard (Index.tsx).

---

## Problemas Identificados

1. **Monitoring.tsx**: Grid usa `md:grid-cols-2` em vez de `sm:grid-cols-2`, fazendo com que os cards fiquem em coluna unica ate 768px
2. **PendingDemands.tsx**: 
   - Grid usa `md:grid-cols-2` em vez de `sm:grid-cols-2`
   - `SelectTrigger` com largura fixa `w-[180px]` pode causar overflow em mobile
   - Popover de filtros tem largura fixa `w-80` que pode nao caber em telas pequenas
3. **GroupMembers.tsx**: 
   - `SelectTrigger` com largura fixa `w-44` causa overflow horizontal em mobile
   - Layout do card de membro nao empilha corretamente em mobile
4. **Team.tsx**: Grid usa `md:grid-cols-2` em vez de padrao responsivo completo

---

## Solucao

### 1. Ajustar Monitoring.tsx

**Linha 80 - Grid de Tickets:**
```tsx
// De:
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

// Para:
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

---

### 2. Ajustar PendingDemands.tsx

**Linha 117-131 - Filtros na barra de acao:**
```tsx
// De:
<div className="flex items-center gap-2">
  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
    <SelectTrigger className="w-[180px]">
      ...

// Para:
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
    <SelectTrigger className="w-full sm:w-[180px]">
      ...
```

**Linha 153 - PopoverContent:**
```tsx
// De:
<PopoverContent className="w-80" align="end">

// Para:
<PopoverContent className="w-[90vw] sm:w-80" align="end">
```

**Linha 253 - Grid de Demandas:**
```tsx
// De:
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

// Para:
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

---

### 3. Ajustar GroupMembers.tsx

**Linha 131-145 - Barra de acao:**
```tsx
// De:
<div className="flex flex-wrap items-center justify-between gap-4">

// Para:
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
```

**Linha 149 - Grid de stats:**
```tsx
// De:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

// Para:
<div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
```

**Linha 235 - Layout do card de membro:**
```tsx
// De:
<div className="flex items-center justify-between">
  <div className="flex items-center gap-4 flex-1">
    ...
  </div>
  <Select ...>
    <SelectTrigger className="w-44">
      ...

// Para:
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div className="flex items-center gap-4 flex-1 min-w-0">
    ...
  </div>
  <Select ...>
    <SelectTrigger className="w-full sm:w-44">
      ...
```

---

### 4. Ajustar Team.tsx

**Linha 244 - Grid de membros:**
```tsx
// De:
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

// Para:
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

---

## Resultado Visual Esperado (Mobile)

### Monitoring (antes e depois)
```
ANTES:                    DEPOIS:
+------------------+      +------------------+
| Ticket A         |      | Ticket A         |
+------------------+      +------------------+
| Ticket B         |      | Ticket B         |
+------------------+      +------------------+
(coluna unica ate 768px)  (coluna unica, sem overflow)
```

### PendingDemands (antes e depois)
```
ANTES:                         DEPOIS:
+------------------------+     +------------------+
| [Grupo ▼] [Filtros] [R]|     | [Grupo        ▼] |
+------------------------+     | [Filtros] [Atual]|
(overflow horizontal)          +------------------+
                               (empilhado, sem overflow)
```

### GroupMembers (antes e depois)
```
ANTES:                              DEPOIS:
+---------------------------+       +------------------+
| 👤 Nome [CS (Atendiment..]|       | 👤 Nome          |
+---------------------------+       | 📞 5511999...    |
(select truncado)                   | [CS (Atendi.. ▼] |
                                    +------------------+
                                    (empilhado, sem corte)
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/pages/Monitoring.tsx | Ajustar grid responsivo |
| src/pages/PendingDemands.tsx | Ajustar barra de filtros, popover e grid |
| src/pages/settings/GroupMembers.tsx | Ajustar barra de acao, stats e cards de membros |
| src/pages/settings/Team.tsx | Ajustar grid responsivo |

---

## Padroes de Responsividade Utilizados

1. **Grids adaptativos**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
2. **Gaps responsivos**: `gap-3 sm:gap-4`
3. **Larguras responsivas**: `w-full sm:w-[180px]`, `w-full sm:w-44`
4. **Layouts que empilham**: `flex-col sm:flex-row`
5. **Popover responsivo**: `w-[90vw] sm:w-80`
6. **Overflow controlado**: `overflow-hidden`, `min-w-0`, `truncate`
