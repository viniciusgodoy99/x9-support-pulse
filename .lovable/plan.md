

# Plano: Remover Botao de Novo Grupo Interno

## Resumo

O usuario esclareceu que nao deseja um botao separado para cadastrar grupos internos. O cadastro de grupos internos deve continuar sendo feito atraves do fluxo de classificacao de grupos pendentes (usando os botoes "Sim, e cliente" ou "Nao" nos cards de Aguardando Classificacao).

A funcionalidade de modal de confirmacao de troca implementada esta correta e sera mantida.

---

## Alteracao Necessaria

Remover o botao "Novo Grupo" e o dialog associado da secao de Grupos Internos.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/settings/Groups.tsx` | Remover botao "Novo Grupo", estados e dialog relacionados |
| `src/hooks/useGroups.tsx` | Remover funcao `addInternalGroup` (opcional, pode manter para uso futuro) |

---

## Detalhes da Implementacao

### Elementos a Remover em Groups.tsx

1. **Estado**: `showNewInternalDialog` (linha 65)
2. **Estado**: `newInternalFormData` (linhas 73-76)
3. **Funcao**: `resetNewInternalForm` (linhas 90-92)
4. **Funcao**: `handleAddInternalGroup` (linhas 190-204)
5. **Botao**: "Novo Grupo" na secao de Grupos Internos (linhas 927-930)
6. **Dialog**: Dialog de novo grupo interno (linhas 486-528)

### Elementos a Manter

- Modal de confirmacao de troca (AlertDialog com `groupToSwitch`) - esta funcionando corretamente
- Switch "Grupo de Cliente" nos cards de grupos classificados
- Fluxo de classificacao nos cards de "Aguardando Classificacao"

---

## Fluxo Correto (Mantido)

```text
1. Grupo novo aparece em "Aguardando Classificacao"
2. Usuario clica "Sim, e cliente" ou "Nao"
3. Grupo e movido para "Grupos de Clientes" ou "Grupos Internos"
4. Se quiser trocar depois, usa o Switch "Grupo de Cliente" no card
5. Sistema exibe modal de confirmacao antes de trocar
```

---

## Secao Tecnica

### Codigo a Remover - Botao (linhas 927-930)
```tsx
<Button variant="outline" onClick={() => setShowNewInternalDialog(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Novo Grupo
</Button>
```

### Codigo a Remover - Estados (linhas 65, 73-76)
```tsx
const [showNewInternalDialog, setShowNewInternalDialog] = useState(false);
const [newInternalFormData, setNewInternalFormData] = useState({
  name: "",
  whatsapp_id: "",
});
```

### Codigo a Remover - Dialog (linhas 486-528)
O dialog completo de "Novo Grupo Interno" sera removido.

