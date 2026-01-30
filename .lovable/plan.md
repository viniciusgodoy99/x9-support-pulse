

# Plano: Filtrar Demandas para Apenas Clientes Reais

## Problema Identificado

A demanda de SLA foi criada por **Gabriel Pereira**, que no banco de dados está marcado como `role: client`, mas na realidade é um **gestor de tráfego** (membro interno). O sistema atualmente:

1. Marca qualquer pessoa não-CS como `sender_role: client` nas mensagens
2. A IA analisa e cria demandas para todas as mensagens de "clientes"
3. Isso inclui erroneamente solicitações de membros internos (gestores de tráfego, etc.)

## Estrutura Atual de Roles

| Role no grupo | Descrição | Deve gerar demanda? |
|---------------|-----------|---------------------|
| `cs` | Atendente/Customer Success | Não |
| `client` | Cliente externo real | Sim |
| `traffic_manager` | Gestor de tráfego (interno) | Não |
| `unknown` | Não classificado | Depende |

## Solução Proposta

Modificar a edge function `analyze-tickets` para que, antes de criar uma demanda, verifique se o solicitante identificado é realmente um **cliente externo** e não um membro interno (CS, gestor de tráfego, etc.).

### Alterações Necessárias

#### Arquivo: `supabase/functions/analyze-tickets/index.ts`

**1. Adicionar busca do role real do solicitante nas mensagens analisadas:**

Ao processar as mensagens para análise, buscar o role do grupo para cada sender:

```typescript
// Após buscar as mensagens do ticket, enriquecer com role do grupo
const messagesWithRoles = await Promise.all(messages.map(async (m) => {
  const { data: memberRole } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", ticket.group_id)
    .eq("phone_number", m.sender_phone)
    .maybeSingle();
  
  return {
    ...m,
    group_role: memberRole?.role || "unknown"
  };
}));
```

**2. Modificar o system prompt da IA para identificar o role real:**

Adicionar no prompt:
- Instrução para a IA considerar apenas mensagens de clientes externos
- Ignorar solicitações de pessoas marcadas como `cs`, `traffic_manager` ou outros roles internos

**3. Filtrar demandas criadas:**

Após a IA retornar as demandas, filtrar aquelas que vieram de membros internos:

```typescript
// Filtrar demandas de membros internos
const validDemands = analysis.demands.filter(demand => {
  // Verificar se o solicitante é um cliente real
  // Buscar nas mensagens quem fez a solicitação
  const isFromExternalClient = checkIfFromExternalClient(messages, demand);
  return isFromExternalClient;
});
```

## Fluxo de Validação

```text
Mensagem recebida
       |
       v
É de um membro com role no grupo?
       |
   +---+---+
   |       |
  SIM     NÃO
   |       |
   v       v
Role = 'client'?   Verificar team_members
   |                    |
  SIM                  NÃO
   |                    |
   v                    v
Gera demanda      Não gera demanda
```

## Opção Alternativa (Mais Simples)

Se a classificação de roles no grupo estiver correta, podemos simplesmente:
1. Alterar o role de **Gabriel Pereira** de `client` para `traffic_manager`
2. Isso já impediria que suas mensagens gerassem demandas

### Correção imediata via SQL:
```sql
UPDATE group_members 
SET role = 'traffic_manager' 
WHERE phone_number = '558494397878' 
  AND group_id = 'f6df1fdb-8c01-400a-83d5-2d11ad5c71e3';
```

## Recomendação

Implementar **ambas** as soluções:
1. **Correção imediata**: Atualizar o role do Gabriel para `traffic_manager`
2. **Prevenção futura**: Modificar a lógica de criação de demandas para só considerar roles = `client` ou `unknown` (pessoas não classificadas)

## Ações

1. Modificar `analyze-tickets` para verificar o role real do solicitante
2. Filtrar demandas de membros com roles internos (cs, traffic_manager)
3. Manter a lógica de criar demandas apenas para `client` ou `unknown`
4. Deploy da edge function
5. Testar com mensagens de diferentes tipos de membros

