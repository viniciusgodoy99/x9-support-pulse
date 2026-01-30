

# Plano: Adicionar Switch de Classificacao nos Cards Pendentes

## Problema Identificado

Os cards de "Aguardando Classificacao" atualmente usam dois botoes separados para classificar:
- "Sim, e cliente" (botao primario)
- "Nao" (botao outline)

O usuario espera ver um controle de Switch ou opcao mais clara para "Grupo Interno", similar ao que existe nos cards de grupos ja classificados.

---

## Solucao Proposta

Substituir os dois botoes de classificacao por um controle mais intuitivo:

### Opcao 1: Switch com Labels (Recomendado)

Adicionar um Switch identico ao dos cards classificados, com label "Grupo de Cliente":
- Switch OFF = Grupo Interno
- Switch ON = Grupo de Cliente

Apos o usuario mover o switch, o grupo e classificado automaticamente.

### Opcao 2: Radio Group

Usar RadioGroup com duas opcoes explicitas:
- "Grupo de Cliente"
- "Grupo Interno"

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/settings/Groups.tsx` | Substituir botoes de classificacao por Switch nos cards pendentes |

---

## Detalhes da Implementacao

### Codigo Atual (linhas 744-767)

```tsx
<div className="pt-2">
  <p className="text-sm text-muted-foreground mb-3">
    Este grupo é de cliente?
  </p>
  <div className="flex flex-col sm:flex-row gap-2">
    <Button size="sm" onClick={() => handleClassify(group, true)} ...>
      Sim, é cliente
    </Button>
    <Button variant="outline" size="sm" onClick={() => handleClassify(group, false)} ...>
      Não
    </Button>
  </div>
</div>
```

### Codigo Proposto (Opcao Switch)

```tsx
<div className="pt-2 space-y-3">
  <div className="flex items-center justify-between py-2 border-t border-border">
    <Label htmlFor={`client-pending-${group.id}`} className="text-sm">
      Grupo de Cliente
    </Label>
    <Switch
      id={`client-pending-${group.id}`}
      checked={false}
      onCheckedChange={(checked) => handleClassify(group, checked)}
    />
  </div>
  <p className="text-xs text-muted-foreground">
    Ative para grupo de cliente ou desative para grupo interno
  </p>
</div>
```

### Codigo Proposto (Opcao Radio Group)

```tsx
<div className="pt-2 space-y-3">
  <p className="text-sm text-muted-foreground">
    Classificar grupo como:
  </p>
  <RadioGroup 
    onValueChange={(value) => handleClassify(group, value === "client")}
    className="flex flex-col gap-2"
  >
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="client" id={`client-${group.id}`} />
      <Label htmlFor={`client-${group.id}`} className="text-sm flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Grupo de Cliente
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="internal" id={`internal-${group.id}`} />
      <Label htmlFor={`internal-${group.id}`} className="text-sm flex items-center gap-2">
        <UserCircle className="h-4 w-4" />
        Grupo Interno
      </Label>
    </div>
  </RadioGroup>
</div>
```

---

## Secao Tecnica

### Fluxo Atualizado

```text
1. Grupo novo aparece em "Aguardando Classificacao"
2. Card mostra Switch/RadioGroup para classificar
3. Usuario ativa o switch (cliente) ou mantem desativado (interno)
   OU seleciona opcao no RadioGroup
4. Grupo e movido para a secao correspondente
5. Se quiser trocar depois, usa o Switch "Grupo de Cliente" no card
6. Sistema exibe modal de confirmacao antes de trocar
```

### Importacoes Necessarias (se usar RadioGroup)

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
```

---

## Beneficios

- Interface consistente entre cards pendentes e classificados
- Opcao explicita para "Grupo Interno" visivel no card
- UX mais intuitiva com Switch ou RadioGroup em vez de botoes

