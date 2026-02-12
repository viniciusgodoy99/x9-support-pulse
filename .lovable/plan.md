

# Plano: Gestores de Trafego Resolvendo Demandas

## Problema

No webhook-whatsapp (linhas 515-518), o codigo mapeia o `sender_role` da mensagem salva no banco de dados assim:

```typescript
senderRole = senderMember.role === "cs" ? "cs" : "client";
```

Isso significa que um membro com role `traffic_manager` no grupo tem suas mensagens salvas como **"client"**. Consequencia: a IA interpreta as respostas do gestor de trafego como **novas demandas do cliente**, em vez de reconhece-las como respostas da equipe que resolvem demandas.

A edge function `analyze-tickets` ja reconhece `traffic_manager` como equipe nas buscas internas (linhas 800-803, 889-890, 978-979), mas como as mensagens foram salvas com `sender_role = "client"`, a IA recebe informacao incorreta.

## Solucao

Alterar **1 linha** no webhook-whatsapp para tratar `traffic_manager` como membro da equipe ao salvar a mensagem.

## Alteracao

| Arquivo | Linha | Modificacao |
|---------|-------|-------------|
| `supabase/functions/webhook-whatsapp/index.ts` | 518 | Mapear `traffic_manager` para `"cs"` |

### Codigo atual (linha 518):
```typescript
senderRole = senderMember.role === "cs" ? "cs" : "client";
```

### Codigo proposto:
```typescript
senderRole = (senderMember.role === "cs" || senderMember.role === "traffic_manager") ? "cs" : "client";
```

## O que ja funciona corretamente (nao precisa mudar)

- **analyze-tickets**: O prompt da IA (linhas 498-503) ja diz que "Qualquer membro da equipe pode resolver demandas" e ja reconhece "Gestor de Trafego (Equipe)" como equipe
- **analyze-tickets**: A logica de fallback para `resolved_by` (linhas 800-803, 889-890, 978-979) ja inclui `traffic_manager`
- **webhook-whatsapp**: A deteccao de `isTeamMember` (linha 465) ja inclui qualquer role definido no grupo

## Resultado esperado

Antes: Mensagem do gestor de trafego salva como `sender_role = "client"` -> IA cria demanda a partir da mensagem dele

Depois: Mensagem do gestor de trafego salva como `sender_role = "cs"` -> IA reconhece como resposta da equipe e pode resolver demandas

