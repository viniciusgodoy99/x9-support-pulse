
# Plano: Corrigir Responsividade dos Cards para Tablet

## Problema Identificado

Na imagem, podemos ver que em telas de tablet (aproximadamente 768-1024px), os cards estão sendo cortados na lateral direita. O terceiro card ("Climb.ai <> Garimpei na Web") está parcialmente visível, indicando um problema de overflow. Isso ocorre porque:

1. O grid atual pula de `sm:grid-cols-2` (640px+) direto para `lg:grid-cols-3` (1024px+)
2. Falta o breakpoint intermediario `md:grid-cols-2` para garantir 2 colunas em tablets
3. Os cards nao tem largura minima definida, causando esmagamento

## Alteracoes Propostas

### Arquivo: src/pages/settings/Groups.tsx

**1. Ajustar grid dos cards em todas as secoes**

Alterar o grid atual:
```tsx
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

Para incluir breakpoint `md` explicitamente e garantir que tablets usem 2 colunas:
```tsx
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

**2. Adicionar largura minima aos cards**

Adicionar `min-w-0` nos cards para evitar overflow horizontal:
```tsx
<Card className="min-w-0 ...">
```

**3. Garantir que o container nao tenha overflow**

Verificar se o container principal tem `overflow-hidden` ou `overflow-x-auto` adequado.

**4. Ajustar o titulo dos cards para truncar em telas menores**

Adicionar truncamento ao titulo para evitar quebra de layout:
```tsx
<CardTitle className="text-lg truncate">{group.name}</CardTitle>
```

**5. Ajustar badges para nao quebrarem o layout**

Usar `flex-shrink-0` nos badges e `flex-wrap` no container:
```tsx
<div className="flex items-start justify-between gap-2">
  <CardTitle className="text-lg truncate flex-1 min-w-0">{group.name}</CardTitle>
  <div className="flex gap-1 flex-shrink-0">
    ...badges
  </div>
</div>
```

## Secoes a Modificar

- **Linha 290**: Grid de Grupos de Clientes
- **Linha 403**: Grid de Aguardando Classificacao
- **Linha 489** (aprox): Grid de Grupos Internos

## Comportamento Esperado

| Tamanho da Tela | Breakpoint | Colunas |
|-----------------|------------|---------|
| Mobile (< 640px) | default | 1 coluna |
| Tablet pequeno (640-767px) | sm | 2 colunas |
| Tablet grande (768-1023px) | md | 2 colunas |
| Desktop (1024-1279px) | lg | 3 colunas |
| Desktop grande (>= 1280px) | xl | 4 colunas |

## Resumo Tecnico

1. Adicionar `min-w-0` em todos os cards para resetar a largura minima do flexbox/grid
2. Adicionar `truncate` nos titulos dos grupos
3. Reorganizar o header dos cards para acomodar titulos longos + badges
4. Manter `md:grid-cols-2` explicito para garantir 2 colunas em tablets
