
# Plano: Adicionar Tooltips aos Titulos Truncados e Botoes com Icones

## Objetivo

Melhorar a experiencia do usuario adicionando tooltips que exibem informacoes completas ao passar o mouse sobre:
1. Titulos de grupos que estao truncados
2. Botoes que possuem apenas icones (sem texto)

## Alteracoes Propostas

### Arquivo: src/pages/settings/Groups.tsx

**1. Importar componentes de Tooltip**

Adicionar na linha 1-6:
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**2. Envolver o conteudo principal com TooltipProvider**

O `TooltipProvider` deve envolver todo o conteudo para que os tooltips funcionem corretamente.

**3. Adicionar Tooltip aos titulos truncados (3 locais)**

Para cada `CardTitle` com texto truncado, envolver com Tooltip:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <CardTitle className="text-lg truncate flex-1 min-w-0 cursor-default">
      {group.name}
    </CardTitle>
  </TooltipTrigger>
  <TooltipContent>
    <p>{group.name}</p>
  </TooltipContent>
</Tooltip>
```

**Locais:**
- Linha 298 - Grupos de Clientes
- Linha 411 - Aguardando Classificacao
- Linha 530 - Grupos Internos

**4. Adicionar Tooltip aos botoes com icones**

Cada botao de icone sera envolvido com Tooltip:

| Icone | Tooltip Text |
|-------|-------------|
| Users | "Gerenciar membros" |
| Edit2 | "Editar grupo" |
| Power | "Ativar/Desativar" |
| Trash2 | "Remover grupo" |

Exemplo de implementacao:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
      <Edit2 className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Editar grupo</p>
  </TooltipContent>
</Tooltip>
```

**Locais dos botoes:**

**Grupos de Clientes (linhas 329-374):**
- Users (linha 329) - "Gerenciar membros"
- Edit2 (linha 337) - "Editar grupo"
- Power (linha 344) - "Ativar/Desativar"
- Trash2 (linha 353) - "Remover grupo"

**Aguardando Classificacao (linhas 442-480):**
- Users (linha 443) - "Ver membros"
- Edit2 (linha 451) - "Editar grupo"
- Trash2 (linha 460) - "Remover grupo"

**Grupos Internos (linhas 553-599):**
- Users (linha 554) - "Gerenciar membros"
- Edit2 (linha 562) - "Editar grupo"
- Power (linha 569) - "Ativar/Desativar"
- Trash2 (linha 578) - "Remover grupo"

## Observacao sobre AlertDialog

O botao de Trash2 esta dentro de um `AlertDialogTrigger`. Para adicionar tooltip neste caso, o Tooltip deve envolver o AlertDialogTrigger:

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
    <p>Remover grupo</p>
  </TooltipContent>
</Tooltip>
```

Alternativamente, podemos usar a abordagem mais simples de adicionar o `title` attribute nos botoes dentro do AlertDialogTrigger, ja que o tooltip nativo do navegador funcionara.

## Resumo das Alteracoes

| Tipo | Quantidade | Descricao |
|------|------------|-----------|
| Import | 1 | Adicionar componentes Tooltip |
| TooltipProvider | 1 | Envolver conteudo principal |
| Tooltip em titulos | 3 | CardTitle em cada secao |
| Tooltip em botoes | 11 | Botoes de acao (Users, Edit, Power, Delete) |

## Comportamento Esperado

- Ao passar o mouse sobre um titulo truncado, o nome completo do grupo aparece
- Ao passar o mouse sobre qualquer botao de icone, uma descricao da acao aparece
- Os tooltips aparecem apos um breve delay (comportamento padrao do Radix)
- Os tooltips sao acessiveis via teclado

## Arquivo a Modificar

1. `src/pages/settings/Groups.tsx`
