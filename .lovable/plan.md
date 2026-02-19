
# Narrativa por IA para Grupos com Apenas Interações (sem demandas)

## Situação Atual

- Grupos **com demandas**: IA gera narrativa baseada nas descrições das demandas
- Grupos **sem demandas (só interações)**: mensagem fixa `"Hoje passamos por aqui e mantivemos o contato em dia. 😊"`

## Objetivo

Usar a IA para gerar uma narrativa humanizada também para grupos sem demandas formais, baseando-se no conteúdo real das mensagens trocadas no dia.

## Dados Disponíveis para a IA

A tabela `messages` tem os campos:
- `content` — texto da mensagem
- `sender_name` — nome de quem enviou
- `sender_role` — papel do remetente (cliente, atendente, etc.)
- `created_at` — horário da mensagem

Esses campos permitem à IA entender o tom e o conteúdo das trocas do dia, mesmo sem demandas identificadas.

## Mudanças no Código

### Arquivo: `supabase/functions/daily-report/index.ts`

### 1. Buscar mensagens do dia por grupo (em `prepareReports`)

Adicionar uma query que traga as mensagens de hoje dos grupos que serão processados, limitando a 20 mensagens por grupo para não sobrecarregar o contexto da IA:

```typescript
// Fetch messages for groups with no demands (for AI narrative context)
const { data: todayMessages } = await supabase
  .from("messages")
  .select("group_id, content, sender_name, sender_role, created_at")
  .in("group_id", groupIds)
  .gte("created_at", todayStartISO)
  .order("created_at", { ascending: true });
```

Organizar por grupo em um Map:
```typescript
const messagesByGroup = new Map<string, typeof todayMessages>();
for (const msg of todayMessages || []) {
  if (!messagesByGroup.has(msg.group_id)) messagesByGroup.set(msg.group_id, []);
  messagesByGroup.get(msg.group_id)!.push(msg);
}
```

### 2. Adicionar `messages` ao `GroupReport`

Incluir as mensagens do dia no interface e no objeto de report:

```typescript
interface GroupReport {
  group: MonitoredGroup;
  demands: TicketDemand[];
  messages: { content: string; sender_name: string; sender_role: string }[];
  // ... demais campos
}
```

### 3. Atualizar `generateNarrativeSummary`

Remover o early return fixo para grupos sem demandas. Em vez disso, passar as mensagens como contexto alternativo:

**Antes:**
```typescript
// No demands today — use a fixed friendly message, skip AI
if (!hasDemands) {
  return "Hoje passamos por aqui e mantivemos o contato em dia. 😊";
}
```

**Depois:**
```typescript
// Grupos sem demandas: usar conteúdo das mensagens como contexto
if (!hasDemands) {
  if (!messages || messages.length === 0) {
    return "Hoje passamos por aqui e mantivemos o contato em dia. 😊";
  }
  // gerar narrativa com base nas mensagens
}
```

Para grupos **sem demandas**, o prompt para a IA será diferente:

- **Input**: lista das mensagens do dia (sender_name, sender_role, content), truncadas se necessário
- **Instrução adicional**: "Não há demandas formais registradas. Baseie-se nas mensagens abaixo para descrever brevemente o que foi conversado no dia, de forma humanizada e focada no relacionamento."
- **Fallback**: se a IA falhar, usar a mensagem fixa atual

### 4. Atualizar `formatGroupMessage` e `generateNarrativeSummary`

Assinar a função com o parâmetro `messages`:
```typescript
async function generateNarrativeSummary(
  groupName: string,
  demands: TicketDemand[],
  messages: { content: string; sender_name: string; sender_role: string }[],
  hasDemands: boolean
): Promise<string>
```

## Fluxo Atualizado

```text
Grupo tem interação no dia?
        |
        v
    Sim → Vai receber relatório
        |
        v
Tem ticket_demands hoje?
   /          \
  Sim          Não
   |            |
   v            v
Narrativa     Busca mensagens do dia
baseada em    e envia para IA gerar
demandas      narrativa baseada no
              conteúdo das mensagens
```

## Comportamento do Fallback

- Se a IA falhar (API indisponível, erro de rede): usa a mensagem fixa atual como fallback
- Se o grupo não tiver mensagens com conteúdo suficiente: usa a mensagem fixa como fallback

## Arquivo Modificado

- `supabase/functions/daily-report/index.ts`

## Impacto

- Grupos com apenas interações passam a receber uma narrativa gerada por IA, coerente com o que foi realmente conversado no dia
- O custo de chamadas à IA aumenta proporcionalmente — grupos sem demandas antes não consumiam tokens, agora consumirão
- A resiliência (batching, try/catch, fallback) permanece intacta
