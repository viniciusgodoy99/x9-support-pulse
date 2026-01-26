
# Plano: Mover Botoes do Header para Abaixo em Mobile/Tablet

## Objetivo
Retirar os botoes de acao do header nas versoes tablet e mobile, posicionando-os abaixo do header para manter a responsividade e uma interface limpa.

## Paginas Afetadas

As seguintes paginas possuem botoes no `headerContent` que precisam ser movidos:

| Pagina | Botao no Header |
|--------|----------------|
| Index.tsx (Dashboard) | Botao "Filtros" com Popover |
| Monitoring.tsx | Botao "Atualizar" |
| Team.tsx | Botao "Novo Membro" (DialogTrigger) |
| WhatsAppConnect.tsx | Botao "Nova Instancia" |
| GroupMembers.tsx | Botao "Sincronizar" |

**Paginas SEM botoes no header** (nao precisam alteracao):
- Groups.tsx - apenas titulo
- Settings.tsx - apenas titulo
- PendingDemands.tsx - botoes ja estao abaixo do header

## Estrategia de Implementacao

Para cada pagina afetada, aplicar o seguinte padrao:

### 1. Simplificar o headerContent
Manter apenas o titulo, icone e subtitulo no header. Remover os botoes.

```typescript
const headerContent = (
  <div className="flex flex-1 items-center gap-3">
    <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
    <div>
      <h1>Titulo</h1>
      <p className="hidden sm:block">Subtitulo</p>
    </div>
  </div>
);
```

### 2. Criar uma barra de acoes abaixo do header
Adicionar uma div no inicio do conteudo da pagina contendo os botoes de acao:

```typescript
<MainLayout headerContent={headerContent}>
  <div className="space-y-6">
    {/* Barra de Acoes */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {/* Info contextual opcional */}
      </div>
      <div className="flex items-center gap-2">
        {/* Botoes de acao */}
      </div>
    </div>
    
    {/* Conteudo da pagina */}
  </div>
</MainLayout>
```

## Alteracoes por Arquivo

### 1. src/pages/Index.tsx
**Antes:** Popover de Filtros no header
**Depois:** 
- Header simplificado com icone + titulo + subtitulo
- Barra de acoes no topo do conteudo com o Popover de Filtros

### 2. src/pages/Monitoring.tsx
**Antes:** Botao "Atualizar" no header
**Depois:**
- Header simplificado
- Barra de acoes com botao "Atualizar" + contador de tickets

### 3. src/pages/settings/Team.tsx
**Antes:** DialogTrigger "Novo Membro" no header
**Depois:**
- Header simplificado
- Barra de acoes com botao "Novo Membro" + contador de membros

### 4. src/pages/settings/WhatsAppConnect.tsx
**Antes:** Botao "Nova Instancia" no header
**Depois:**
- Header simplificado
- Barra de acoes com botao "Nova Instancia" + contador de instancias

### 5. src/pages/settings/GroupMembers.tsx
**Antes:** Botao "Sincronizar" no header (alem do botao de voltar)
**Depois:**
- Header com botao voltar + icone + titulo + nome do grupo
- Barra de acoes com botao "Sincronizar"

## Padrao Visual da Barra de Acoes

A barra de acoes seguira o padrao ja existente em `PendingDemands.tsx`:

```typescript
<div className="flex flex-wrap items-center justify-between gap-4">
  {/* Lado esquerdo: informacao contextual */}
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-5 w-5" />
      <span className="text-sm">
        <span className="font-semibold text-foreground">{count}</span> itens
      </span>
    </div>
  </div>

  {/* Lado direito: botoes de acao */}
  <div className="flex items-center gap-2">
    <Button>Acao</Button>
  </div>
</div>
```

## Beneficios

1. **Header mais limpo**: Apenas informacoes de identificacao da pagina
2. **Melhor usabilidade mobile**: Botoes com mais espaco e mais faceis de tocar
3. **Consistencia**: Mesmo padrao de `PendingDemands.tsx` aplicado em todas as paginas
4. **Responsividade**: Barra de acoes usa `flex-wrap` para adaptar-se a telas menores

## Resumo de Arquivos a Modificar

1. `src/pages/Index.tsx` - Mover Popover de filtros
2. `src/pages/Monitoring.tsx` - Mover botao Atualizar
3. `src/pages/settings/Team.tsx` - Mover botao Novo Membro
4. `src/pages/settings/WhatsAppConnect.tsx` - Mover botao Nova Instancia
5. `src/pages/settings/GroupMembers.tsx` - Mover botao Sincronizar
