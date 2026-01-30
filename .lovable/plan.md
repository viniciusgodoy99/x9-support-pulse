

# Transformar Relatorio Diario em Narrativa Humanizada com IA

## Objetivo

Modificar a funcao `daily-report` para usar IA (Lovable AI) para transformar os topicos do dia em um resumo narrativo fluido e humanizado, em vez de uma lista com bullet points.

## Formato Desejado

```
📋 [NOME DO GRUPO]
Resumo do dia DD/MM

[2-3 linhas narrativas sobre conversas e alinhamentos do dia]

Até amanhã! 👋
```

## Exemplo de Saida

```
📋 ARTTICO DIGITAL
Resumo do dia 30/01

Hoje conversamos sobre os dados necessários para a plataforma e alinhamos alguns pontos importantes. Como parte desse processo, vamos receber por e-mail o banco de imagens com a logo para darmos continuidade ao trabalho.

Até amanhã! 👋
```

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/daily-report/index.ts`

**1. Criar funcao de geracao de narrativa com IA**

Nova funcao `generateNarrativeSummary` que:
- Recebe o nome do grupo e a lista de topicos/demandas do dia
- Chama o Lovable AI (google/gemini-3-flash-preview) com um prompt de copywriting
- Retorna um texto narrativo de 2-3 linhas

```typescript
async function generateNarrativeSummary(
  groupName: string,
  demands: TicketDemand[]
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    // Fallback: listar topicos sem IA
    return demands.map(d => d.description).join(". ");
  }

  const topicsList = demands.map(d => d.description).join("\n- ");
  
  const systemPrompt = `Você é um especialista em copywriting...
  // Prompt fornecido pelo usuario
  `;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Topicos do dia:\n- ${topicsList}` }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**2. Modificar funcao `formatGroupMessage`**

Tornar a funcao `async` e chamar `generateNarrativeSummary`:

```typescript
// ANTES: funcao sincrona com bullet points
function formatGroupMessage(report: GroupReport, dateStr: string): string {
  const groupName = report.group.name.toUpperCase();
  const topicsList = report.demands
    .map((demand) => `🔹${demand.description}`)
    .join("\n\n");
  
  return `📋 *${groupName}*...`;
}

// DEPOIS: funcao assincrona com narrativa IA
async function formatGroupMessage(
  report: GroupReport, 
  dateStr: string
): Promise<string> {
  const groupName = report.group.name.toUpperCase();
  
  // Gera narrativa humanizada via IA
  const narrative = await generateNarrativeSummary(groupName, report.demands);
  
  return `📋 ${groupName}
Resumo do dia ${dateStr}

${narrative}

Até amanhã! 👋`;
}
```

**3. Ajustar chamadas no loop principal**

Adicionar `await` na chamada de `formatGroupMessage`:

```typescript
for (const report of reports) {
  if (report.totalDemands === 0) {
    continue;
  }

  // Agora com await
  const message = await formatGroupMessage(report, dateStr);
  // ...
}
```

## Prompt de IA Completo

O prompt seguira exatamente as diretrizes fornecidas:

- Tom profissional mas conversacional
- Evitar linguagem de demandas, listas ou cobranças
- Focar em dialogo, alinhamentos e colaboracao
- Usar verbos como "conversamos", "alinhamos", "ficou combinado"
- Conectar informacoes de forma fluida como narrativa
- Saida apenas do corpo da mensagem (2-3 linhas)

## Fallback

Se a IA falhar ou nao estiver configurada, o sistema usara um fallback simples concatenando os topicos em uma frase, garantindo que o relatorio sempre seja enviado.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/daily-report/index.ts` | Adicionar integracao com Lovable AI para gerar narrativas humanizadas |

