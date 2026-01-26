

# Plano: Corrigir Inconsistencia de Role entre Membros e Mensagens

## Problema Identificado

O Gabriel Pereira esta marcado como "Cliente" na pagina de membros do grupo, porem:
1. Na tabela `messages`, suas mensagens estao com `sender_role: cs`
2. O resumo da IA usa o `sender_role` das mensagens para identificar quem e cliente vs atendente
3. Como resultado, a IA identifica incorretamente Gabriel como "atendente"

**Dados encontrados:**
- `group_members`: Gabriel Pereira → role: `client`
- `messages`: Gabriel Pereira → sender_role: `cs` (incorreto!)

## Causa Raiz

Quando o role de um membro e alterado na interface (de "cs" para "client", por exemplo), apenas o registro em `group_members` e atualizado. As mensagens ja salvas mantem o `sender_role` antigo.

## Solucao Proposta

### Parte 1: Atualizar Mensagens ao Alterar Role do Membro

**Arquivo: `src/hooks/useGroupMembers.tsx`**

Modificar a funcao `updateMemberRole` para sincronizar o `sender_role` nas mensagens existentes quando o role de um membro for alterado.

```typescript
const updateMemberRole = async (memberId: string, role: GroupMemberRole) => {
  // 1. Buscar dados do membro (phone_number)
  // 2. Atualizar role em group_members
  // 3. Atualizar sender_role em TODAS as mensagens desse phone_number
  // 4. Se role === "cs", adicionar a team_members e sincronizar em outros grupos
};
```

**Logica de mapeamento de roles:**
- `cs` → sender_role: `cs`
- `client` → sender_role: `client`
- `traffic_manager` → sender_role: `client` (nao e atendente)
- `unknown` → sender_role: `client` (padrao seguro)

### Parte 2: Corrigir Dados Historicos (Migracao)

Criar uma query para corrigir os dados atuais do Gabriel e qualquer outro membro com inconsistencia.

**Query de correcao:**
```sql
-- Atualizar mensagens de Gabriel Pereira para sender_role correto
UPDATE messages 
SET sender_role = 'client'
WHERE sender_phone = '558494397878'
  AND sender_role = 'cs';
```

### Parte 3: Garantir Consistencia no Webhook

**Arquivo: `supabase/functions/webhook-whatsapp/index.ts`**

Revisar a logica de determinacao de `sender_role` no webhook. Atualmente:
```typescript
const isCS = senderMember?.role === "cs";
const senderRole = (isCS || !!teamMember) ? "cs" : "client";
```

Esta logica esta correta, mas o problema e que se o membro foi "cs" no passado e depois virou "client", as mensagens antigas permanecem incorretas.

### Alteracoes Detalhadas

#### 1. src/hooks/useGroupMembers.tsx

Na funcao `updateMemberRole`:

```typescript
const updateMemberRole = async (memberId: string, role: GroupMemberRole) => {
  try {
    // Fetch current member data
    const { data: member, error: fetchError } = await supabase
      .from("group_members")
      .select("phone_number, name")
      .eq("id", memberId)
      .single();

    if (fetchError) throw fetchError;

    // Update role in group_members
    const { error: updateError } = await supabase
      .from("group_members")
      .update({ role })
      .eq("id", memberId);

    if (updateError) throw updateError;

    // NOVO: Atualizar sender_role em mensagens existentes
    const newSenderRole = role === "cs" ? "cs" : "client";
    const { error: messagesError } = await supabase
      .from("messages")
      .update({ sender_role: newSenderRole })
      .eq("sender_phone", member.phone_number);

    if (messagesError) {
      console.error("Error updating messages sender_role:", messagesError);
    } else {
      console.log(`Updated sender_role to '${newSenderRole}' for all messages from ${member.phone_number}`);
    }

    // Logica existente para CS: adicionar a team_members e sincronizar grupos
    if (role === "cs" && member) {
      // ... codigo existente ...
    }

    // NOVO: Se removido de CS, remover de team_members
    if (role !== "cs" && member) {
      const { error: deleteTeamError } = await supabase
        .from("team_members")
        .delete()
        .eq("phone_number", member.phone_number);

      if (!deleteTeamError) {
        console.log(`Removed ${member.phone_number} from team_members`);
      }
    }

    await fetchMembers();
  } catch (err) {
    console.error("Error updating member role:", err);
    throw err;
  }
};
```

#### 2. Migracao para Corrigir Dados Existentes

Executar via SQL para corrigir Gabriel especificamente e garantir consistencia geral:

```sql
-- Corrigir mensagens de membros que sao 'client' em group_members mas tem sender_role 'cs' em messages
UPDATE messages m
SET sender_role = 'client'
WHERE m.sender_phone IN (
  SELECT gm.phone_number 
  FROM group_members gm 
  WHERE gm.role = 'client'
)
AND m.sender_role = 'cs';

-- Garantir que mensagens de membros 'traffic_manager' tambem sejam 'client'
UPDATE messages m
SET sender_role = 'client'
WHERE m.sender_phone IN (
  SELECT gm.phone_number 
  FROM group_members gm 
  WHERE gm.role = 'traffic_manager'
)
AND m.sender_role = 'cs';
```

## Fluxo Apos Correcao

1. Usuario altera role de um membro de "cs" para "client"
2. `group_members.role` e atualizado
3. **NOVO**: `messages.sender_role` e atualizado para todas as mensagens desse numero
4. **NOVO**: Se era "cs" e virou outra coisa, remove de `team_members`
5. Proxima analise de IA usara os roles corretos nas mensagens

## Resultado Esperado

- Resumos de IA identificarao corretamente quem e cliente vs atendente
- Consistencia entre `group_members.role` e `messages.sender_role`
- Alteracoes de role terao efeito imediato nas proximas analises
- Dados historicos corrigidos via migracao

## Arquivos a Modificar

1. `src/hooks/useGroupMembers.tsx` - Sincronizar sender_role em mensagens ao alterar role
2. Migracao SQL - Corrigir dados inconsistentes existentes

