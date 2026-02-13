

# Plano: Corrigir Sincronizacao de Membros da Equipe em Novos Grupos

## Problema Identificado

O sistema usa LIDs (identificadores internos do WhatsApp) para identificar participantes dos grupos. A funcao `fetch-group-participants` tenta resolver LIDs para numeros reais via endpoint `/contact/check` da UAZAPI, mas esse endpoint falha frequentemente, deixando membros com numeros tipo `232864855683198` em vez do numero real.

Membros da equipe afetados (dados reais do banco):

| LID | Numero Real | Nome | Papel |
|-----|-------------|------|-------|
| 232864855683198 | 558498682288 | Mateus Araujo | CS |
| 9766789234786 | 558481408381 | Thiago Barretto | CS |
| 229570682831044 | 558496771436 | Pablo Santos | Traffic Manager |
| 275960289095916 | 558499470066 | Hercilio Neto | Traffic Manager |
| 32719732002886 | 558499615044 | Victor Motta | Traffic Manager |

Esses membros ja foram identificados corretamente em alguns grupos (quando enviaram mensagens e o webhook enriqueceu os dados), mas em novos grupos a sincronizacao nao aproveita essa informacao existente.

## Solucao

Adicionar uma etapa no `fetch-group-participants` que, apos falhar em resolver um LID via `/contact/check`, consulta a propria tabela `group_members` para verificar se o mesmo `whatsapp_id` ja foi resolvido em outro grupo. Se sim, copia o numero real, nome e papel.

## Alteracao

| Arquivo | Modificacao |
|---------|-------------|
| `supabase/functions/fetch-group-participants/index.ts` | Adicionar consulta de fallback ao banco de dados apos falha do `/contact/check` |

### Logica a adicionar (apos o bloco `fetchContactInfo` para LIDs, ~linha 160):

```typescript
// Fallback: check if this LID was already resolved in another group
if (isLid && rawPhoneNumber.length > 13) {
  const { data: resolvedMember } = await supabase
    .from("group_members")
    .select("phone_number, name, role")
    .eq("whatsapp_id", whatsappId)
    .lt("phone_number", "99999999999999") // real phones have <= 13 digits
    .not("phone_number", "eq", rawPhoneNumber)
    .limit(1)
    .maybeSingle();

  if (resolvedMember && resolvedMember.phone_number.length <= 13) {
    console.log("Found resolved phone from other group:", resolvedMember.phone_number);
    rawPhoneNumber = resolvedMember.phone_number;
    if (resolvedMember.name) participantName = resolvedMember.name;
    // Also inherit the role if it was defined
    if (resolvedMember.role && resolvedMember.role !== "unknown") {
      role = resolvedMember.role;
    }
  }
}
```

### Posicao no codigo

O bloco sera adicionado apos o bloco existente que tenta `/contact/check` (linhas 154-166), antes da verificacao de `teamMemberMap` (linha 169). Isso garante que:

1. Primeiro tenta resolver via UAZAPI (`/contact/check`)
2. Se falhar, busca no banco se outro grupo ja tem esse LID resolvido
3. Depois faz o matching com `team_members` usando o numero real obtido

## Resultado Esperado

- Ao sincronizar um novo grupo, membros da equipe que ja foram identificados em outros grupos serao automaticamente reconhecidos com numero real, nome e papel correto
- Reduz drasticamente a quantidade de membros "Nao definido" em novos grupos
- Nao afeta membros que ainda nao foram identificados em nenhum grupo (continuam como "unknown" ate enviarem uma mensagem)

