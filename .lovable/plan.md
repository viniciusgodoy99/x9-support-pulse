
# Plano: Ajustar Header do Dashboard

## Objetivo
Alterar o header do painel de Dashboard para ter aparencia de banner/card com fundo escuro e estilo frosted glass, conforme a imagem de referencia.

## Situacao Atual
O header atual e um simples container flex sem estilizacao de fundo:
```typescript
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
```

## Alteracoes Necessarias

### Arquivo: `src/pages/Index.tsx`

Modificar o header (linhas 254-375) para:

1. **Envolver em um container estilizado**
   - Adicionar background frosted-glass
   - Adicionar padding adequado
   - Aplicar border-radius para cantos arredondados
   - Usar cor de fundo mais escura (card)

2. **Estrutura do novo header:**
```typescript
<div className="frosted-glass rounded-lg p-4 sm:p-6 border-border/50">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    {/* Lado esquerdo: Icone + Titulo + Subtitulo */}
    <div className="flex items-center gap-3">
      <Snowflake className="h-8 w-8 text-primary" />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Visao geral do monitoramento de SLA
        </p>
      </div>
    </div>

    {/* Lado direito: Botao Filtros */}
    <Popover>...</Popover>
  </div>
</div>
```

## Detalhes Tecnicos

A classe `frosted-glass` ja existe no CSS do projeto e aplica:
- `backdrop-filter: blur(10px)` - efeito de desfoque
- `background: hsl(var(--card) / 0.8)` - fundo semi-transparente
- `border: 1px solid hsl(var(--border) / 0.5)` - borda sutil

Classes adicionais a aplicar:
- `rounded-lg` - cantos arredondados
- `p-4 sm:p-6` - padding responsivo
- `border-border/50` - borda adicional para definicao

## Resultado Esperado
O header tera aparencia de um banner/card com:
- Fundo escuro semi-transparente com efeito frosted glass
- Icone de floco de neve animado com cor primaria (azul gelo)
- Titulo "Dashboard" em negrito
- Subtitulo "Visao geral do monitoramento de SLA" em cinza
- Botao "Filtros" alinhado a direita com icone de filtro
- Layout responsivo que empilha em telas menores
