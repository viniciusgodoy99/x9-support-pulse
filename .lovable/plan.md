
# Plano: Cadastro de Grupos Internos e Modal de Confirmação de Troca

## Resumo

Implementar duas melhorias na gestao de grupos:
1. Adicionar botao para cadastrar grupos internos manualmente (similar ao fluxo de grupos de clientes)
2. Adicionar modal de confirmacao ao trocar um grupo entre cliente e interno

---

## Funcionalidades

### 1. Cadastro Manual de Grupos Internos

Adicionar um botao "Novo Grupo Interno" na secao de Grupos Internos que abre um dialog para cadastrar um grupo diretamente como interno (sem passar pela classificacao pendente).

**Campos do formulario:**
- Nome do grupo
- WhatsApp ID
- Limite de SLA (opcional, ja que grupos internos nao geram demandas)

### 2. Modal de Confirmacao de Troca

Ao clicar no Switch "Grupo de Cliente" em qualquer card de grupo (seja cliente ou interno), exibir um modal de confirmacao explicando as consequencias da troca:

**De Cliente para Interno:**
- Alerta de que demandas abertas serao fechadas automaticamente
- Grupo deixara de gerar metricas de SLA

**De Interno para Cliente:**
- Grupo passara a gerar tickets e demandas
- Mensagens futuras serao monitoradas para SLA

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/settings/Groups.tsx` | Adicionar dialog de cadastro de grupo interno, adicionar modal de confirmacao de troca |
| `src/hooks/useGroups.tsx` | Adicionar funcao `addInternalGroup` para criar grupos ja classificados como internos |

---

## Detalhes da Implementacao

### Novos Estados

```text
- showNewInternalDialog: boolean - Controla o dialog de novo grupo interno
- groupToSwitch: MonitoredGroup | null - Armazena o grupo que esta sendo trocado
- showSwitchConfirmDialog: boolean - Controla o modal de confirmacao de troca
```

### Novo Dialog: Cadastrar Grupo Interno

Semelhante ao dialog de edicao existente, mas:
- Titulo: "Novo Grupo Interno"
- Campos: Nome, WhatsApp ID
- Ao salvar, cria o grupo com `is_client_group: false` e `pending_classification: false`

### Modal de Confirmacao de Troca

```text
Titulo: "Alterar tipo do grupo?"

Se grupo.is_client_group = true:
  Mensagem: "Ao marcar como grupo interno, este grupo deixara de gerar demandas e metricas de SLA. Demandas abertas serao fechadas automaticamente."
  Botoes: [Cancelar] [Confirmar]

Se grupo.is_client_group = false:
  Mensagem: "Ao marcar como grupo de cliente, este grupo passara a gerar tickets e demandas. Novas mensagens serao monitoradas para SLA."
  Botoes: [Cancelar] [Confirmar]
```

### Fluxo Atualizado

1. Usuario clica no Switch "Grupo de Cliente"
2. Sistema abre modal de confirmacao (em vez de trocar imediatamente)
3. Usuario confirma ou cancela
4. Se confirmado, executa `handleToggleClientGroup` com fechamento automatico de tickets (se necessario)

---

## Secao Tecnica

### Modificacoes no useGroups.tsx

```typescript
// Nova funcao para adicionar grupo interno
const addInternalGroup = async (group: { name: string; whatsapp_id: string; sla_limit_minutes?: number }) => {
  try {
    const { error } = await supabase.from("monitored_groups").insert({
      ...group,
      is_client_group: false,
      pending_classification: false,
      is_archived: false,
    });
    if (error) throw error;
    await fetchGroups();
  } catch (err) {
    console.error("Error adding internal group:", err);
    throw err;
  }
};
```

### Modificacoes no Groups.tsx

1. Adicionar estados para controlar os novos dialogs
2. Modificar `handleToggleClientGroup` para abrir confirmacao primeiro
3. Adicionar `handleConfirmSwitch` para executar a troca apos confirmacao
4. Adicionar componente de dialog para cadastro de grupo interno
5. Adicionar componente AlertDialog para confirmacao de troca

### Botao "Novo Grupo Interno"

Posicionamento: No header da secao "Grupos Internos", ao lado dos filtros de busca

```tsx
<Button variant="outline" onClick={() => setShowNewInternalDialog(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Novo Grupo
</Button>
```

---

## Beneficios

- Permite cadastrar grupos internos sem passar pelo fluxo de classificacao pendente
- Evita trocas acidentais entre cliente/interno com confirmacao explicita
- Informa ao usuario as consequencias da troca de tipo
