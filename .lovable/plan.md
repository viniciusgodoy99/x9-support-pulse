
# Plano: Ajustar Botões de Classificação para Não Ultrapassar o Card

## Problema Identificado

Os botões "Sim, é cliente" e "Não" na seção "Aguardando Classificação" estão ultrapassando os limites do card pai em telas menores. Isso acontece porque:

1. Os botões usam `flex-1` que distribui o espaço igualmente, mas não respeita o limite do container
2. O texto dos botões ("Sim, é cliente") é longo e não quebra
3. Falta `overflow-hidden` no container pai para evitar vazamento

## Alterações Propostas

### Arquivo: src/pages/settings/Groups.tsx

**1. Adicionar overflow-hidden no Card (linha 405-407)**

```tsx
<Card
  key={group.id}
  className="min-w-0 overflow-hidden border-amber-500/50 bg-amber-500/5"
>
```

**2. Ajustar container dos botões de classificação (linha 422)**

Alterar de:
```tsx
<div className="flex gap-2">
```

Para:
```tsx
<div className="flex flex-col sm:flex-row gap-2">
```

Isso faz os botões empilharem em mobile e ficarem lado a lado em telas maiores.

**3. Remover flex-1 e adicionar largura adaptativa (linhas 423-439)**

Alterar os botões para:
```tsx
<Button
  size="sm"
  onClick={() => handleClassify(group, true)}
  className="w-full sm:flex-1 text-xs sm:text-sm"
>
  <Building2 className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
  <span className="truncate">Sim, é cliente</span>
</Button>
<Button
  variant="outline"
  size="sm"
  onClick={() => handleClassify(group, false)}
  className="w-full sm:flex-1"
>
  <UserCircle className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
  Não
</Button>
```

**4. Garantir que o CardContent não ultrapasse (linha 417)**

Adicionar `overflow-hidden`:
```tsx
<CardContent className="space-y-4 overflow-hidden">
```

## Resumo das Alterações

| Elemento | Antes | Depois |
|----------|-------|--------|
| Card container | `min-w-0` | `min-w-0 overflow-hidden` |
| Container botões | `flex gap-2` | `flex flex-col sm:flex-row gap-2` |
| Botão "Sim" | `flex-1` | `w-full sm:flex-1 text-xs sm:text-sm` + texto truncado |
| Botão "Não" | `flex-1` | `w-full sm:flex-1` |
| CardContent | `space-y-4` | `space-y-4 overflow-hidden` |

## Comportamento Esperado

- **Mobile**: Botões empilhados verticalmente, ocupando largura total
- **Tablet/Desktop**: Botões lado a lado com distribuição igual
- **Texto longo**: Truncado com reticências se necessário
- **Sem overflow**: Conteúdo sempre dentro dos limites do card

## Arquivo a Modificar

1. `src/pages/settings/Groups.tsx` - Linhas 405-440 (seção Aguardando Classificação)
