
# Plano: Tornar Últimos Atendimentos Clicáveis no Dashboard

## Objetivo
Transformar a seção "Últimos Atendimentos" do Dashboard em cards clicáveis que abrem um modal com detalhes completos do atendimento, melhorando a experiência do usuário.

## Abordagem
Reutilizar o componente `TicketHistoryCard` já existente na página de Relatórios, que possui toda a funcionalidade necessária: exibição de informações, modal de detalhes, resumo da IA e lista de demandas.

## Alterações Necessárias

### Arquivo: `src/pages/Index.tsx`

1. **Importar o componente existente**
   - Adicionar import do `TicketHistoryCard` de `@/components/reports/TicketHistoryCard`

2. **Substituir a renderização manual dos tickets**
   - Trocar o código atual que renderiza manualmente cada ticket (linhas 167-203) pelo componente `TicketHistoryCard`
   - O componente já possui:
     - Exibição do nome do grupo e data
     - Badge de tempo de SLA com cores (verde/amarelo/vermelho)
     - Botão de expandir para ver resumo da IA
     - Botão "Ver Detalhes" que abre modal completo
     - Tags de categorias das demandas

## Resultado Esperado
Os últimos atendimentos no Dashboard terão a mesma aparência e funcionalidade da página de Relatórios, permitindo ao usuário clicar para ver todos os detalhes do atendimento, incluindo resumo da IA, demandas identificadas e métricas de SLA.

---

## Detalhes Técnicos

### Código a ser modificado

**Importação a adicionar:**
```typescript
import { TicketHistoryCard } from "@/components/reports/TicketHistoryCard";
```

**Renderização a substituir:**
```typescript
// De:
{recentResolved.map((ticket) => {
  // ... código manual de renderização ...
})}

// Para:
{recentResolved.map((ticket) => (
  <TicketHistoryCard key={ticket.id} ticket={ticket} />
))}
```

**Imports a remover (não mais utilizados):**
- `Badge` (se não usado em outro lugar)
- `cn` (se não usado em outro lugar)
