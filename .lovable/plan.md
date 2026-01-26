
# Plano: Cards de Demanda Pendente Clicaveis com Modal de Detalhes

## Objetivo
Tornar os cards de demandas pendentes clicaveis, abrindo um modal com visualizacao detalhada da demanda especifica. A interface sera responsiva para todas as telas (desktop, tablet e mobile).

## Situacao Atual

O componente `PendingDemandCard` exibe informacoes resumidas da demanda:
- Descricao (truncada em 2 linhas)
- Prioridade e categoria (badges)
- Nome do grupo e cliente
- Tempo de espera em tempo real
- Status do SLA (OK, Warning, Critical)

Atualmente o card nao e clicavel e nao ha modal de detalhes.

## Solucao Proposta

### Abordagem
Seguir o padrao ja estabelecido no `TicketHistoryCard`, adicionando:
1. Estado para controlar abertura do modal
2. Card clicavel com cursor pointer e efeito hover
3. Modal responsivo com detalhes completos da demanda
4. Botao para reabrir demanda (marcar como pendente) caso necessario

### Estrutura do Modal de Detalhes

O modal exibira as seguintes secoes:

```text
+------------------------------------------+
|  Detalhes da Demanda                [X]  |
+------------------------------------------+
|                                          |
|  INFORMACOES GERAIS                      |
|  ┌────────────────┬───────────────────┐  |
|  │ Grupo: [nome]  │ Cliente: [nome]   │  |
|  │ Telefone: [x]  │ Criado: [data]    │  |
|  └────────────────┴───────────────────┘  |
|                                          |
|  ──────────────────────────────────────  |
|                                          |
|  CLASSIFICACAO                           |
|  [Badge Prioridade] [Badge Categoria]    |
|                                          |
|  ──────────────────────────────────────  |
|                                          |
|  DESCRICAO                               |
|  ┌────────────────────────────────────┐  |
|  │ Texto completo da demanda          │  |
|  │ sem truncamento                    │  |
|  └────────────────────────────────────┘  |
|                                          |
|  ──────────────────────────────────────  |
|                                          |
|  STATUS DO SLA                           |
|  Tempo aguardando: Xh Xm Xs              |
|  Limite SLA: XX minutos                  |
|  [Badge Status: OK/Alerta/Excedido]      |
|                                          |
+------------------------------------------+
```

## Alteracoes por Arquivo

### 1. src/components/demands/PendingDemandCard.tsx

Modificacoes:
- Importar componentes de Dialog
- Adicionar estado `isModalOpen`
- Tornar o Card clicavel com `onClick` e `cursor-pointer`
- Adicionar efeito de hover mais pronunciado (`hover:shadow-lg hover:scale-[1.02]`)
- Criar modal de detalhes com todas as informacoes

```typescript
// Novos imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar, Phone, FileText, Timer, CheckCircle2 } from "lucide-react";

// Novo estado
const [isModalOpen, setIsModalOpen] = useState(false);

// Card clicavel
<Card 
  className={`border-l-4 ${slaStatusStyles[slaStatus]} transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer`}
  onClick={() => setIsModalOpen(true)}
>

// Modal de detalhes (apos o Card)
<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
    {/* Conteudo detalhado */}
  </DialogContent>
</Dialog>
```

### Conteudo do Modal

O modal tera as seguintes secoes responsivas:

**Secao 1 - Informacoes Gerais (grid 1 coluna em mobile, 2 em desktop)**
- Nome do grupo
- Nome do cliente (se disponivel)
- Telefone do cliente (se disponivel)
- Data/hora de criacao

**Secao 2 - Classificacao**
- Badge de prioridade
- Badge de categoria

**Secao 3 - Descricao Completa**
- Texto completo da demanda em area destacada

**Secao 4 - Status do SLA**
- Tempo de espera atualizado em tempo real
- Limite de SLA do grupo
- Badge de status (OK/Alerta/Excedido)
- Barra de progresso visual do SLA

## Responsividade

### Desktop (>640px)
- Modal com largura `max-w-lg` (512px)
- Grid de informacoes em 2 colunas
- Cards com hover scale

### Tablet (640px - 768px)
- Modal ocupa mais largura da tela
- Grid adapta para 2 colunas
- Hover effects mantidos

### Mobile (<640px)
- Modal ocupa largura total (com margens)
- Grid de informacoes em 1 coluna
- Hover effects reduzidos (sem scale)
- Textos ajustados para telas menores

## Acessibilidade

- Card com `role="button"` e `tabIndex={0}` para navegacao por teclado
- Modal fecha com ESC
- Foco retorna ao card apos fechar modal

## Detalhes Tecnicos

Classes de responsividade a utilizar:
- `grid grid-cols-1 sm:grid-cols-2` - Grid responsivo
- `text-sm sm:text-base` - Textos adaptaveis
- `p-4 sm:p-6` - Padding responsivo
- `max-w-lg w-full mx-4 sm:mx-auto` - Largura do modal

Componentes do SLA visual:
- Progress bar usando `div` com `width` dinamico baseado na porcentagem
- Cores condicionais: verde (ok), amarelo (warning), vermelho (critical)

## Resultado Esperado

1. Cards de demanda pendente clicaveis com feedback visual
2. Modal responsivo com informacoes detalhadas
3. Tempo de espera atualizado em tempo real no modal
4. Visualizacao clara do status do SLA
5. Interface consistente com o padrao existente no `TicketHistoryCard`
6. Experiencia fluida em todas as telas
