

# Corrigir Demandas de Membros da Equipe Aparecendo como Pendentes

## Problema Identificado

Membros da equipe (como "Mateus Araujo", CS) estao cadastrados na tabela `team_members`, mas em alguns grupos de clientes seu papel em `group_members` esta como `unknown`. A logica atual trata `unknown` como "client", fazendo com que mensagens desses membros da equipe gerem demandas como se fossem clientes.

Grupos afetados incluem: Arttico | B2bit ads, Arttico | EKO, Arttico | Farmafórmula Partage, Tastto | Fogo ao Quadrado, entre outros.

## Solucao

Corrigir a logica em **dois pontos** para que, quando `group_members.role = 'unknown'`, o sistema verifique a tabela `team_members` como fallback antes de tratar a pessoa como cliente.

## Detalhes Tecnicos

### 1. Arquivo: `supabase/functions/webhook-whatsapp/index.ts` (linhas 516-518)

**Antes:** Se `senderMember.role` existe (mesmo sendo `'unknown'`), o codigo ja atribui o papel sem verificar `team_members`.

**Depois:** Adicionar verificacao para que `role = 'unknown'` caia no fallback de `team_members`:

```typescript
if (senderMember?.role && senderMember.role !== "unknown") {
  senderRole = (senderMember.role === "cs" || senderMember.role === "traffic_manager") ? "cs" : "client";
} else if (teamMember) {
  senderRole = "cs";
}
```

### 2. Arquivo: `supabase/functions/analyze-tickets/index.ts` (linhas 840-853)

Na funcao de enriquecimento de mensagens, quando `group_members.role` e `'unknown'`, verificar tambem a tabela `team_members`:

```typescript
const messages = await Promise.all(rawMessages.map(async (m) => {
  const { data: memberData } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", ticket.group_id)
    .eq("phone_number", m.sender_phone)
    .maybeSingle();

  let role = memberData?.role || "unknown";

  // Se role e unknown, verificar se e membro da equipe
  if (role === "unknown") {
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("phone_number", m.sender_phone)
      .eq("is_active", true)
      .maybeSingle();
    if (teamMember) role = "cs";
  }

  return { ...m, group_role: role } as Message;
}));
```

### 3. Arquivo: `supabase/functions/analyze-tickets/index.ts` (linhas 486-493)

Na funcao `analyzeConversation`, garantir que o roleDisplay para `unknown` tambem faca fallback para `sender_role`:

Ja esta implementado na linha 493 (`m.sender_role === "cs" ? "Atendente (CS)" : "Cliente"`), mas com a correcao no passo 2, o `group_role` ja chegara corrigido.

### Arquivos modificados
- `supabase/functions/webhook-whatsapp/index.ts`
- `supabase/functions/analyze-tickets/index.ts`

## Resultado Esperado

- Mensagens de membros da equipe serao corretamente identificadas como "cs" mesmo quando seu papel no grupo e "unknown"
- A IA nao criara demandas a partir de mensagens da equipe
- Novas demandas geradas serao exclusivamente de clientes reais
- Demandas existentes incorretas serao naturalmente resolvidas nas proximas analises

