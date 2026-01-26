
# Plano: Ajustar Responsividade do Modal de Grupos Arquivados

## Objetivo
Melhorar a experiencia do modal de grupos arquivados em dispositivos moveis, garantindo melhor usabilidade e layout adaptativo.

---

## Alteracoes em `src/pages/settings/Groups.tsx`

### 1. Adicionar import do hook useIsMobile

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
```

### 2. Usar o hook no componente

```tsx
const isMobile = useIsMobile();
```

### 3. Ajustar classes do DialogContent para mobile

Modificar as classes do `DialogContent` para adaptar melhor em telas pequenas:

```tsx
<DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
```

### 4. Reestruturar o layout dos cards de grupos arquivados

Modificar o layout dos cards para empilhar verticalmente em mobile:

**Antes:**
```tsx
<CardContent className="flex items-center justify-between p-4">
```

**Depois:**
```tsx
<CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4">
```

### 5. Ajustar botoes de acao para mobile

Os botoes de restaurar e excluir devem ocupar toda a largura em mobile:

```tsx
<div className="flex gap-2 w-full sm:w-auto">
  <Button size="sm" onClick={() => handleRestore(group.id)} className="flex-1 sm:flex-none">
    <RotateCcw className="h-4 w-4 mr-2" />
    Restaurar
  </Button>
  {/* Delete button... */}
</div>
```

### 6. Adicionar area de scroll separada

Separar o cabecalho e busca da area de scroll para manter o campo de busca sempre visivel:

```tsx
<DialogContent className="...">
  <DialogHeader>
    {/* Titulo e descricao fixos */}
  </DialogHeader>
  
  <div className="relative sticky top-0 bg-background py-2">
    {/* Campo de busca sempre visivel */}
  </div>
  
  <div className="flex-1 overflow-y-auto min-h-0">
    {/* Lista de grupos com scroll */}
  </div>
</DialogContent>
```

### 7. Melhorar espacamento e tipografia para mobile

- Reduzir padding dos cards em mobile: `p-3 sm:p-4`
- Ajustar tamanho do texto do nome do grupo
- Garantir truncamento adequado do nome

---

## Resultado Visual (Mobile)

```
+----------------------------------+
| [X]                              |
|   Grupos Arquivados              |
|   Grupos que ficaram...          |
|                                  |
| [🔍 Buscar grupo...            ] |
|                                  |
| +------------------------------+ |
| | Gorilla's house              | |
| | Arquivado em 26/01/2026      | |
| |                              | |
| | [  Restaurar  ] [🗑️]        | |
| +------------------------------+ |
|                                  |
| +------------------------------+ |
| | PROMO PARA TENISTAS          | |
| | Arquivado em 26/01/2026      | |
| |                              | |
| | [  Restaurar  ] [🗑️]        | |
| +------------------------------+ |
+----------------------------------+
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/pages/settings/Groups.tsx | Ajustar layout responsivo do modal de grupos arquivados |

---

## Detalhes Tecnicos

- Usar classes Tailwind responsivas (`sm:`, `md:`) para adaptar layout
- Manter campo de busca fixo no topo com `sticky`
- Usar `flex-col` em mobile e `flex-row` em desktop para cards
- Ajustar tamanhos de padding e gaps para telas menores
- Garantir que botoes sejam tocaveis com tamanho minimo adequado

