
# Plano: Adicionar Tooltips em Todas as Paginas

## Visao Geral

Este plano adiciona tooltips em todos os elementos que precisam de informacoes adicionais ao passar o mouse:
- Titulos truncados
- Botoes com apenas icones
- Badges e indicadores de status

## Arquivos a Modificar

### 1. src/pages/settings/Team.tsx (Pagina de Equipe)

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| CardTitle (nome do membro) | 251 | `{member.name}` (nome completo) |
| Botao Edit2 | 267-273 | "Editar membro" |
| Botao Power | 274-280 | "Ativar/Desativar" |
| Botao Trash2 (AlertDialog) | 281-303 | "Remover membro" |

---

### 2. src/pages/settings/GroupMembers.tsx (Membros do Grupo)

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| Botao ArrowLeft (voltar) | 101-108 | "Voltar para grupos" |
| Botao Edit2 (editar nome) | 263-272 | "Editar nome" |
| Botao Check (salvar nome) | 241-247 | "Salvar" |
| Botao X (cancelar edicao) | 248-255 | "Cancelar" |

---

### 3. src/pages/settings/WhatsAppConnect.tsx (Conexoes WhatsApp)

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Nota:** Os botoes nesta pagina ja tem texto, entao nao precisam de tooltips. Porem, o componente `InstanceCard` precisa.

---

### 4. src/components/whatsapp/InstanceCard.tsx

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| CardTitle (nome da instancia) | 90 | `{instance.name}` (nome completo - caso truncado) |
| Botao Trash2 (AlertDialog) | 170-175 | "Remover instancia" |

---

### 5. src/pages/Monitoring.tsx

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| Botao RefreshCw | 49-56 | "Atualizar lista de tickets" |

---

### 6. src/components/monitoring/TicketCard.tsx

Os botoes neste componente ja tem texto, nao precisam de tooltips adicionais.

---

### 7. src/pages/PendingDemands.tsx

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| Botao RefreshCw | 231-240 | "Atualizar lista de demandas" |
| Botao Filter | 152-163 | "Abrir filtros avancados" |

---

### 8. src/pages/Index.tsx (Dashboard)

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| Botao Filter (Popover) | 275-285 | "Abrir filtros avancados" |
| Botao ChevronLeft (paginacao) | ~615 | "Pagina anterior" |
| Botao ChevronRight (paginacao) | ~622 | "Proxima pagina" |

---

### 9. src/components/reports/TicketHistoryCard.tsx

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Linha | Tooltip Text |
|----------|-------|--------------|
| Botao ChevronDown/Up (expandir) | 122-134 | "Expandir detalhes" / "Recolher detalhes" |
| Botao Eye (ver detalhes) | 172-180 | "Ver detalhes completos" |
| Botao RotateCcw (reabrir) | 408-417 | "Reabrir demanda" |

---

### 10. src/components/ThemeToggle.tsx

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Tooltip Text |
|----------|--------------|
| Botao de tema | "Alternar para tema claro" ou "Alternar para tema escuro" (dinamico baseado no tema atual) |

---

### 11. src/components/layout/AppSidebar.tsx

O sidebar ja tem labels de texto, nao precisa de tooltips adicionais.

---

### 12. src/pages/settings/Settings.tsx (SLA)

**Imports a adicionar:**
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

**Tooltips a adicionar:**

| Elemento | Tooltip Text |
|----------|--------------|
| Botao Save | "Salvar alteracoes de SLA" |

---

## Padrao de Implementacao

Para cada botao com icone:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="sm" onClick={handleAction}>
      <Icon className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Descricao da acao</p>
  </TooltipContent>
</Tooltip>
```

Para botoes dentro de AlertDialogTrigger:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        ...
      </AlertDialog>
    </span>
  </TooltipTrigger>
  <TooltipContent>
    <p>Remover item</p>
  </TooltipContent>
</Tooltip>
```

---

## Resumo de Alteracoes por Arquivo

| Arquivo | Tooltips Adicionados |
|---------|---------------------|
| Team.tsx | 4 (Edit, Power, Trash, CardTitle) |
| GroupMembers.tsx | 4 (ArrowLeft, Edit2, Check, X) |
| InstanceCard.tsx | 2 (CardTitle, Trash) |
| Monitoring.tsx | 1 (Refresh) |
| PendingDemands.tsx | 2 (Refresh, Filter) |
| Index.tsx | 3 (Filter, ChevronLeft, ChevronRight) |
| TicketHistoryCard.tsx | 3 (Expand, Eye, Reabrir) |
| ThemeToggle.tsx | 1 (Botao tema) |
| Settings.tsx | 1 (Save) |
| **Total** | **21 tooltips** |

---

## Comportamento Esperado

- Ao passar o mouse sobre qualquer botao de icone, uma descricao clara da acao aparece
- Ao passar o mouse sobre titulos truncados, o texto completo aparece
- Os tooltips aparecem apos um breve delay (comportamento padrao do Radix)
- Os tooltips sao acessiveis via teclado (suporte a foco)
- Mantendo consistencia visual em toda a aplicacao
