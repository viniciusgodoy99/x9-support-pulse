
# Plano: Corrigir Scroll Horizontal no Dashboard Mobile

## Problema
O dashboard apresenta scroll horizontal em dispositivos moveis, prejudicando a experiencia do usuario conforme mostrado na imagem. Isso ocorre porque alguns elementos estao ultrapassando a largura da viewport.

---

## Causas Identificadas

1. **MainLayout.tsx**: O container principal usa `overflow-auto` sem restricao horizontal
2. **Graficos Recharts**: O `ResponsiveContainer` pode expandir alem do container pai
3. **Cards de estatisticas**: Podem ter conteudo que ultrapassa em telas muito pequenas
4. **Padding excessivo**: O `p-6` (24px) em ambos os lados pode ser demais para mobile

---

## Solucao

### 1. Ajustar MainLayout.tsx

Adicionar `overflow-x-hidden` ao container principal e reduzir padding em mobile:

```tsx
<div className="flex-1 p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
  {children}
</div>
```

### 2. Ajustar Index.tsx - Container Principal

Adicionar `overflow-hidden` ao wrapper principal do dashboard:

```tsx
<div className="space-y-6 w-full max-w-full overflow-hidden">
```

### 3. Ajustar Cards de Graficos

Adicionar restricao de largura nos CardContent dos graficos:

```tsx
<CardContent className="overflow-hidden">
```

### 4. Limitar Largura do ResponsiveContainer

Envolver cada `ResponsiveContainer` em um div com restricao:

```tsx
<div className="w-full overflow-hidden">
  <ResponsiveContainer width="100%" height={chartHeight}>
    ...
  </ResponsiveContainer>
</div>
```

### 5. Ajustar Labels do PieChart

Desabilitar labels em mobile para o PieChart, pois os labels longos causam overflow:

```tsx
<Pie
  ...
  label={isMobile ? false : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  labelLine={!isMobile}
  ...
/>
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/components/layout/MainLayout.tsx | Adicionar `overflow-x-hidden` e padding responsivo |
| src/pages/Index.tsx | Adicionar restricoes de overflow nos containers de graficos e ajustar labels do PieChart |

---

## Detalhes Tecnicos

- `overflow-x-hidden`: Impede scroll horizontal cortando conteudo que excede
- `max-w-full`: Garante que o elemento nao exceda a largura do pai
- `w-full`: Define largura 100% do container pai
- Padding responsivo `p-4 sm:p-6`: 16px em mobile, 24px em desktop
- Labels condicionais no PieChart evitam texto longo quebrando o layout

---

## Resultado Esperado

Apos as alteracoes, o dashboard devera:
- Nao apresentar mais scroll horizontal em nenhum dispositivo
- Manter todos os graficos visiveis e funcionais
- Ter espacamento adequado para mobile
- O PieChart mostrara apenas as cores/segmentos em mobile (tooltip ainda disponivel ao tocar)
