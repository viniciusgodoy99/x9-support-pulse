
# Plano: Corrigir Demandas Duplicadas e Orphaned no Painel de Pendentes

## Problema Identificado

O sistema esta criando demandas duplicadas semanticamente identicas que nao sao detectadas pelo algoritmo de similaridade atual. Quando a IA analisa a mesma solicitacao com descricoes ligeiramente diferentes, ela cria uma nova demanda em vez de atualizar a existente.

**Dados do caso:**
- Ticket `cdd20787-f55d-437b-9d47-52f2316bf391` (status: resolved)
- Demanda 1 (15:26): "Questionamento sobre se os criativos ja foram gravados." → **open** (orphaned!)
- Demanda 2 (15:59): "Questionamento sobre o status de gravacao dos criativos." → resolved

A IA reconheceu que a demanda foi resolvida, mas criou uma nova entrada em vez de atualizar a existente porque o algoritmo de similaridade nao identificou como a mesma demanda.

## Causa Raiz

1. O algoritmo de similaridade (threshold >= 0.5) falha em detectar demandas semanticamente identicas com palavras diferentes
2. Quando `all_resolved = true`, o codigo de "safety net" para fechar demandas orphaned esta no lugar certo mas a execucao pode nao estar acontecendo corretamente

## Solucao Proposta

### Parte 1: Melhorar Algoritmo de Similaridade

**Arquivo: `supabase/functions/analyze-tickets/index.ts`**

Implementar um algoritmo de similaridade mais robusto que:
1. Usa stemming simples para palavras em portugues
2. Remove stopwords comuns
3. Considera palavras-chave especificas do contexto
4. Reduz threshold para 0.4 (mais sensivel a matches)

```typescript
const calculateSimilarity = (str1: string, str2: string): number => {
  // Remove pontuacao e converte para minusculas
  const clean = (s: string) => s.toLowerCase().replace(/[.,!?]/g, '');
  
  // Stopwords em portugues
  const stopwords = new Set(['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'e', 'se', 'que', 'para', 'por', 'com', 'sobre', 'ja', 'foram', 'foi', 'ser', 'esta', 'um', 'uma']);
  
  // Extrai palavras significativas (> 2 chars, nao stopwords)
  const getWords = (s: string) => clean(s).split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
  
  const words1 = getWords(str1);
  const words2 = getWords(str2);
  
  if (words1.length === 0 || words2.length === 0) {
    return str1.toLowerCase().includes(str2.toLowerCase().slice(0, 15)) ||
           str2.toLowerCase().includes(str1.toLowerCase().slice(0, 15)) ? 0.6 : 0;
  }
  
  // Conta palavras em comum (com match parcial)
  let matches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++;
        break;
      }
    }
  }
  
  // Calcula similaridade baseada na menor lista
  const minLen = Math.min(words1.length, words2.length);
  return minLen > 0 ? matches / minLen : 0;
};
```

### Parte 2: Garantir Limpeza de Demandas Orphaned

O codigo atual ja tem a logica de safety net (linhas 504-521), mas vamos garantir que ela seja executada corretamente e logar melhor para debug.

Adicionar verificacao ANTES do update das demandas para confirmar quantas estao abertas:

```typescript
if (analysis.all_resolved) {
  // Log demandas abertas ANTES da limpeza
  const { data: openDemands } = await supabase
    .from("ticket_demands")
    .select("id, description")
    .eq("ticket_id", ticket.id)
    .eq("status", "open");
  
  console.log(`Found ${openDemands?.length || 0} open demands to close for ticket ${ticket.id}`);
  
  // ... resto do codigo de limpeza ...
}
```

### Parte 3: Corrigir Dados Atuais (Migracao)

Executar SQL para fechar demandas orphaned em tickets ja resolvidos:

```sql
-- Fechar demandas que estao 'open' mas cujo ticket ja foi resolvido
UPDATE ticket_demands td
SET 
  status = 'resolved',
  resolved_at = t.resolved_at
FROM tickets t
WHERE td.ticket_id = t.id
  AND t.status = 'resolved'
  AND td.status = 'open';
```

## Detalhes das Alteracoes

### Arquivo: supabase/functions/analyze-tickets/index.ts

**Alteracao 1 - Melhorar calculateSimilarity (linhas 349-365)**

Substituir a funcao atual por versao mais robusta com:
- Remocao de stopwords em portugues
- Threshold reduzido de 0.5 para 0.4
- Match parcial de palavras mais flexivel

**Alteracao 2 - Adicionar log de debug (apos linha 503)**

Logar quantidade de demandas abertas antes da limpeza para facilitar debug futuro.

### Migracao SQL

Executar uma vez para corrigir dados historicos inconsistentes.

## Fluxo Apos Correcao

1. IA analisa conversa e identifica demandas
2. Algoritmo de similaridade melhorado detecta demandas semanticamente identicas
3. Atualiza demanda existente em vez de criar duplicata
4. Se `all_resolved = true`, fecha TODAS as demandas abertas do ticket (safety net)
5. Demandas orphaned sao automaticamente resolvidas

## Resultado Esperado

- Menos demandas duplicadas criadas
- Demandas resolvidas nao aparecem mais como pendentes
- Consistencia entre status do ticket e status das demandas
- Melhor logging para debug futuro

## Arquivos a Modificar

1. `supabase/functions/analyze-tickets/index.ts` - Melhorar algoritmo de similaridade e logging
2. Migracao SQL - Corrigir dados historicos (fechar demandas orphaned)
