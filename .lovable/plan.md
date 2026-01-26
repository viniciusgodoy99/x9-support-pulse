
# Plano: Priorizar Role do Grupo sobre Team Members

## Problema Identificado

Gabriel Pereira está:
1. Na tabela `team_members` (por ser CS em algum grupo)
2. No grupo `[TESTES INTERNOS] Climb.ai` com role: `client`
3. No grupo `[INTERNO] Climb.ai` com role: `cs`

A lógica atual do webhook (linha 515):
```typescript
const senderRole = (isCS || !!teamMember) ? "cs" : "client";
```

Como Gabriel está em `team_members`, a condição `!!teamMember` é sempre `true`, resultando em `sender_role: "cs"` **mesmo em grupos onde ele é cliente**.

## Causa Raiz

A tabela `team_members` representa pessoas que são CS "globalmente", mas um mesmo telefone pode ter papéis diferentes em grupos distintos. A lógica atual não respeita essa diferenciação.

## Solucao Proposta

### Alterar a Logica de sender_role no Webhook

**Arquivo: `supabase/functions/webhook-whatsapp/index.ts`**

A prioridade deve ser:
1. **PRIMEIRO**: Verificar o role do membro no grupo específico (`senderMember.role`)
2. **SEGUNDO**: Verificar se está em `team_members` (fallback para casos sem role definido)

**Logica Corrigida:**
```typescript
// Determinar sender_role com base no role ESPECÍFICO DO GRUPO
let senderRole: "cs" | "client" = "client";

if (senderMember?.role) {
  // Se tem role definido no grupo, usar esse role
  senderRole = senderMember.role === "cs" ? "cs" : "client";
} else if (teamMember) {
  // Fallback: se nao tem role no grupo mas esta em team_members, assume CS
  senderRole = "cs";
}
```

### Correcao de Dados Historicos

Executar SQL para corrigir mensagens de Gabriel no grupo de testes:

```sql
-- Corrigir sender_role das mensagens de Gabriel no grupo [TESTES INTERNOS]
UPDATE messages m
SET sender_role = 'client'
WHERE m.sender_phone = '558494397878'
  AND m.sender_role = 'cs'
  AND m.group_id = 'e0794e32-3eb1-4541-9e2b-0dac9cc7b252';
```

## Detalhes das Alteracoes

### Arquivo: supabase/functions/webhook-whatsapp/index.ts

**Alteracao na linha 515-516:**

Substituir:
```typescript
const senderRole = (isCS || !!teamMember) ? "cs" : "client";
```

Por:
```typescript
// Determinar sender_role: role do grupo tem PRIORIDADE sobre team_members
// Isso permite que uma pessoa seja CS em um grupo e Cliente em outro
let senderRole: "cs" | "client" = "client";
if (senderMember?.role) {
  // Role definido no grupo especifico tem prioridade
  senderRole = senderMember.role === "cs" ? "cs" : "client";
  console.log("Using group-specific role:", senderMember.role, "->", senderRole);
} else if (teamMember) {
  // Fallback para team_members quando nao ha role no grupo
  senderRole = "cs";
  console.log("Using team_members fallback -> cs");
}
```

## Fluxo Apos Correcao

1. Mensagem chega no webhook
2. Busca `senderMember` no grupo específico
3. **SE** senderMember.role existe → usa esse role para determinar sender_role
4. **SENAO SE** está em team_members → assume "cs" (fallback)
5. **SENAO** → assume "client"
6. Mensagem é salva com sender_role correto para aquele grupo
7. IA analisa e identifica Gabriel como cliente no grupo de testes

## Resultado Esperado

- Mensagens de Gabriel em `[TESTES INTERNOS] Climb.ai` → sender_role: `client`
- Mensagens de Gabriel em `[INTERNO] Climb.ai` → sender_role: `cs`
- IA identificará corretamente quem é cliente e quem é atendente em cada grupo
- Demandas de cliente serão criadas quando Gabriel perguntar algo no grupo de testes

## Arquivos a Modificar

1. `supabase/functions/webhook-whatsapp/index.ts` - Alterar logica de sender_role (linhas 513-516)
2. Migracao SQL - Corrigir mensagens historicas de Gabriel no grupo de testes
