
# Plano: Ajustar Responsividade 100% do Painel de Dashboard

## Problemas Identificados

Apos analisar o codigo do `Index.tsx`, identifiquei os seguintes problemas que ainda causam scroll horizontal ou quebra de layout em mobile:

### 1. Grid de Graficos (Tendencia + Distribuicao SLA)
- **Linha 416**: Usa `grid-cols-1 md:grid-cols-2` com `gap-6`
- **Problema**: O gap de 6 (24px) e muito para mobile. Deveria usar `gap-4 sm:gap-6`

### 2. CardContent dos Graficos
- **Linhas 424, 470, 537**: O `CardContent` tem `overflow-hidden` mas falta padding responsivo
- **Problema**: Falta `p-3 sm:p-4` para consistencia com outros componentes

### 3. ResponsiveContainer sem restricao de largura
- **Linhas 431, 477, 550**: Os wrappers `<div className="w-full overflow-hidden">` estao corretos, mas os graficos ainda podem causar overflow em casos extremos

### 4. Eixo Y dos Graficos (YAxis)
- **Problema Principal**: O `YAxis` do Recharts tem largura fixa padrao que pode causar overflow em telas muito pequenas
- **Solucao**: Reduzir a largura do YAxis em mobile com `width={isMobile ? 30 : 40}`

### 5. CardContent do Historico de Atendimentos
- **Linha 585**: Falta padding responsivo - deveria ser `p-3 sm:p-4`

### 6. Container Principal do Space
- **Linha 261**: O `space-y-6` pode ser demais para mobile
- **Solucao**: Usar `space-y-4 sm:space-y-6`

---

## Alteracoes em `src/pages/Index.tsx`

### 1. Ajustar espacamento do container principal (Linha 261)
```tsx
// De:
<div className="space-y-6 w-full max-w-full overflow-hidden">

// Para:
<div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
```

### 2. Ajustar gap do grid de graficos (Linha 416)
```tsx
// De:
<div className="grid gap-6 grid-cols-1 md:grid-cols-2">

// Para:
<div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
```

### 3. Ajustar padding e overflow do CardContent - Grafico de Tendencia (Linha 424)
```tsx
// De:
<CardContent className="overflow-hidden">

// Para:
<CardContent className="p-3 sm:p-4 overflow-hidden">
```

### 4. Ajustar YAxis do LineChart para mobile (Linhas 434-435)
```tsx
// De:
<XAxis dataKey="day" className="text-xs" />
<YAxis className="text-xs" />

// Para:
<XAxis dataKey="day" className="text-xs" tick={{ fontSize: 10 }} />
<YAxis className="text-xs" width={isMobile ? 30 : 40} tick={{ fontSize: 10 }} />
```

### 5. Ajustar padding e overflow do CardContent - Grafico de SLA (Linha 470)
```tsx
// De:
<CardContent className="overflow-hidden">

// Para:
<CardContent className="p-3 sm:p-4 overflow-hidden">
```

### 6. Ajustar padding e overflow do CardContent - Desempenho (Linha 537)
```tsx
// De:
<CardContent className="overflow-hidden">

// Para:
<CardContent className="p-3 sm:p-4 overflow-hidden">
```

### 7. Ajustar YAxis do BarChart para mobile (Linhas 553-554)
```tsx
// De:
<XAxis dataKey="name" className="text-xs" />
<YAxis className="text-xs" />

// Para:
<XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
<YAxis className="text-xs" width={isMobile ? 30 : 40} tick={{ fontSize: 10 }} />
```

### 8. Ajustar padding do CardContent - Historico (Linha 585)
```tsx
// De:
<CardContent>

// Para:
<CardContent className="p-3 sm:p-4">
```

### 9. Ajustar espacamento interno do container de cards (Linha 414)
```tsx
// De:
<div className="space-y-6">

// Para:
<div className="space-y-4 sm:space-y-6">
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/pages/Index.tsx | Ajustar espacamentos, paddings, YAxis dos graficos |

---

## Resumo das Correcoes

1. **Espacamentos responsivos**: `space-y-4 sm:space-y-6`, `gap-4 sm:gap-6`
2. **Paddings responsivos nos CardContent**: `p-3 sm:p-4`
3. **YAxis com largura responsiva**: `width={isMobile ? 30 : 40}`
4. **Fonte menor nos eixos**: `tick={{ fontSize: 10 }}`

---

## Resultado Esperado

Apos as alteracoes:
- Nenhum scroll horizontal em telas de 320px ate 400px
- Graficos visiveis e funcionais em qualquer tamanho de tela
- Espacamentos proporcionais ao tamanho da tela
- Eixos dos graficos legiveis mas compactos em mobile
