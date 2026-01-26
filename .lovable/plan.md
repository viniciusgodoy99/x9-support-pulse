

# Plano: Transformar Header do Dashboard em Header da Pagina

## Objetivo
Mover o header estilizado do Dashboard (com titulo, subtitulo e botao de filtros) para o header fixo da pagina no MainLayout, mantendo a responsividade.

## Situacao Atual

### MainLayout (header atual):
```typescript
<header className="h-14 border-b border-border/50 flex items-center px-4 frosted-glass sticky top-0 z-20">
  <SidebarTrigger className="mr-4" />
  <Snowflake className="h-5 w-5 text-primary animate-pulse" />
</header>
```

### Index.tsx (header do Dashboard):
- Container frosted-glass com padding
- Icone Snowflake + Titulo "Dashboard" + Subtitulo
- Botao "Filtros" com Popover de filtros avancados

## Desafio
O header do Dashboard contem logica especifica da pagina (filtros, estados, dados). Precisamos manter essa logica na pagina Index.tsx mas posicionar visualmente como header da pagina.

## Solucao Proposta

### Abordagem: Manter header no Index.tsx mas estilizar como header fixo

1. **Arquivo: `src/components/layout/MainLayout.tsx`**
   - Simplificar o header para conter apenas o SidebarTrigger
   - Ou remover padding do conteudo para permitir header customizado por pagina

2. **Arquivo: `src/pages/Index.tsx`**
   - Transformar o header do dashboard em um elemento sticky/fixed
   - Aplicar estilos para funcionar como header da pagina
   - Integrar o SidebarTrigger no lado esquerdo

### Alteracoes em MainLayout.tsx:
```typescript
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <SnowEffect />
        <AppSidebar />
        <main className="flex-1 flex flex-col relative z-10">
          {/* Header simplificado - apenas controle da sidebar */}
          <header className="h-14 border-b border-border/50 flex items-center px-4 frosted-glass sticky top-0 z-20">
            <SidebarTrigger className="mr-4" />
            {/* Titulo e acoes serao injetados por cada pagina */}
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

### Alteracao Alternativa (Recomendada):
Modificar MainLayout para aceitar um "headerContent" como prop:

```typescript
interface MainLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export function MainLayout({ children, headerContent }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <SnowEffect />
        <AppSidebar />
        <main className="flex-1 flex flex-col relative z-10">
          <header className="border-b border-border/50 frosted-glass sticky top-0 z-20 px-4 py-3">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {headerContent || (
                <Snowflake className="h-5 w-5 text-primary animate-pulse" />
              )}
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

### Alteracoes em Index.tsx:
```typescript
return (
  <MainLayout 
    headerContent={
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3">
          <Snowflake className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
              Visao geral do monitoramento de SLA
            </p>
          </div>
        </div>
        
        <Popover>
          {/* Botao Filtros e conteudo do popover */}
        </Popover>
      </div>
    }
  >
    <div className="space-y-6">
      {/* Conteudo do dashboard sem o header */}
    </div>
  </MainLayout>
);
```

## Responsividade

### Desktop (>1024px):
- Header com altura automatica baseada no conteudo
- Titulo, subtitulo e botao filtros em linha
- SidebarTrigger a esquerda

### Tablet (768px-1024px):
- Layout similar ao desktop
- Icone e texto podem ficar menores

### Mobile (<768px):
- Subtitulo oculto para economizar espaco
- Botao Filtros ocupa largura menor
- Elementos empilhados se necessario

## Arquivos a Modificar

1. **src/components/layout/MainLayout.tsx**
   - Adicionar prop `headerContent`
   - Ajustar altura do header para flexivel
   - Manter SidebarTrigger

2. **src/pages/Index.tsx**
   - Mover conteudo do header para prop `headerContent`
   - Remover div do header do conteudo principal

3. **Outras paginas** (opcional)
   - Podem passar seu proprio headerContent ou usar o padrao

## Resultado Esperado
- Header integrado com SidebarTrigger + Dashboard info + Filtros
- Layout responsivo em todas as telas
- Efeito frosted-glass mantido
- Header fixo no topo durante scroll
- Consistencia visual com o design mostrado na imagem

