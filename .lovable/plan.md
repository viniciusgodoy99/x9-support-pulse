
# Plano: Adicionar Campo de Busca no Modal de Grupos Arquivados

## Objetivo
Adicionar um campo de busca no dialog de grupos arquivados para filtrar grupos pelo nome.

---

## Alteracoes em `src/pages/settings/Groups.tsx`

### 1. Adicionar novo estado para o filtro de busca

```tsx
const [archivedSearchQuery, setArchivedSearchQuery] = useState("");
```

### 2. Limpar busca ao fechar o dialog

Ao fechar o dialog, resetar o campo de busca:

```tsx
<Dialog 
  open={showArchivedDialog} 
  onOpenChange={(open) => {
    setShowArchivedDialog(open);
    if (!open) setArchivedSearchQuery("");
  }}
>
```

### 3. Adicionar campo de busca apos o DialogHeader

Inserir o campo de busca logo apos o `DialogDescription`:

```tsx
<div className="relative mt-2">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Buscar grupo..."
    value={archivedSearchQuery}
    onChange={(e) => setArchivedSearchQuery(e.target.value)}
    className="pl-9"
  />
</div>
```

### 4. Filtrar grupos arquivados pela busca

Criar lista filtrada antes de renderizar:

```tsx
const filteredArchivedGroups = archivedGroups.filter(g =>
  g.name.toLowerCase().includes(archivedSearchQuery.toLowerCase())
);
```

### 5. Atualizar renderizacao para usar lista filtrada

Substituir `archivedGroups.length` e `archivedGroups.map` por `filteredArchivedGroups`:

- Verificar se ha grupos: `filteredArchivedGroups.length === 0`
- Mostrar mensagem adequada quando nao ha resultados da busca vs nenhum grupo arquivado
- Iterar sobre `filteredArchivedGroups.map(...)`

---

## Resultado Visual

```
+------------------------------------------+
| [X] Grupos Arquivados                    |
|------------------------------------------|
| Grupos que ficaram mais de 7 dias...     |
|                                          |
| [🔍 Buscar grupo...                    ] |
|                                          |
| +--------------------------------------+ |
| | Gorilla's house                      | |
| | Arquivado em 26/01/2026 às 14:12     | |
| |                   [Restaurar] [🗑️]  | |
| +--------------------------------------+ |
| ...                                      |
+------------------------------------------+
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/pages/settings/Groups.tsx | Adicionar estado, campo de busca e logica de filtro no dialog de arquivados |
