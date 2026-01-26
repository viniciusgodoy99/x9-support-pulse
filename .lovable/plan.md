

## Plano: Corrigir Duplicação de Demandas na Re-análise

### Problema Identificado

Quando a IA re-analisa um ticket, ela identifica demandas com descrições ligeiramente diferentes, causando:

1. **Fuzzy match falha** - A lógica atual (linhas 338-341) compara apenas os primeiros 30 caracteres
2. **Nova demanda é criada** - Com status "resolved"
3. **Demanda antiga permanece** - Com status "open"
4. **Card continua no painel** - Porque existe uma demanda `open` não atualizada

**Exemplo real do banco:**
```
13:07:34 - "Informações sobre vendas realizadas no evento." -> open (NÃO ATUALIZADA)
13:10:47 - "Volume de vendas realizadas no evento"         -> resolved (DUPLICATA)
```

---

### Solução Proposta

#### 1. Melhorar o Algoritmo de Matching de Demandas

**Arquivo:** `supabase/functions/analyze-tickets/index.ts`

Substituir a lógica simples de substring por uma comparação semântica mais robusta:

```typescript
// ANTES (linhas 338-341):
const existingDemand = existingDemands?.find(
  ed => ed.description.toLowerCase().includes(demand.description.toLowerCase().slice(0, 30)) ||
        demand.description.toLowerCase().includes(ed.description.toLowerCase().slice(0, 30))
);

// DEPOIS - Usar similaridade de palavras-chave:
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  
  return totalUniqueWords > 0 ? commonWords.length / totalUniqueWords : 0;
}

const existingDemand = existingDemands?.find(ed => {
  // Match exato ou alta similaridade
  if (ed.description.toLowerCase() === demand.description.toLowerCase()) return true;
  return calculateSimilarity(ed.description, demand.description) >= 0.5;
});
```

#### 2. Atualizar Demandas Antigas para "resolved" Quando Todas Forem Resolvidas

Adicionar lógica para marcar todas as demandas `open` como `resolved` quando `analysis.all_resolved === true`:

```typescript
if (analysis.all_resolved) {
  // Marcar TODAS as demandas open restantes como resolved
  const { error: updateOpenDemandsError } = await supabase
    .from("ticket_demands")
    .update({
      status: "resolved",
      resolved_at: lastCsMessageTimestamp,
      resolved_by_name: lastCsMessage?.sender_name || null,
      resolved_by_phone: lastCsMessage?.sender_phone || null,
    })
    .eq("ticket_id", ticket.id)
    .eq("status", "open");
    
  if (updateOpenDemandsError) {
    console.error("Error closing remaining open demands:", updateOpenDemandsError);
  } else {
    console.log(`Closed all remaining open demands for ticket ${ticket.id}`);
  }
}
```

---

### Fluxo Corrigido

```
IA analisa ticket
       │
       ▼
Identifica demanda: "Volume de vendas"
       │
       ▼
Busca demanda existente com similaridade >= 50%
       │
       ├── Encontrou "Informações sobre vendas" (similaridade 60%)
       │         │
       │         ▼
       │   ATUALIZA status para "resolved" ✅
       │
       └── Não encontrou match
                 │
                 ▼
           CRIA nova demanda

       │
       ▼
Se all_resolved == true
       │
       ▼
Fecha TODAS as demandas "open" restantes
       │
       ▼
Nenhum card permanece no painel de pendentes
```

---

### Mudanças Específicas

| Local | Mudança |
|-------|---------|
| Linhas 336-341 | Substituir lógica de substring por função de similaridade |
| Após linha 434 | Adicionar bloco para fechar demandas `open` restantes quando `all_resolved=true` |

---

### Resultado Esperado

- Demandas similares serão reconhecidas e atualizadas (não duplicadas)
- Quando a IA determinar que todas foram resolvidas, qualquer demanda "open" órfã será fechada
- Cards de demandas pendentes desaparecerão corretamente quando resolvidas

