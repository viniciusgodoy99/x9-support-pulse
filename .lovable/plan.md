
# Plano de Correção: Demandas em Grupos Internos

## Problema Identificado

O grupo "X9 de Atendimento" está classificado como **grupo interno** (`is_client_group: false`), mas ainda possui um **ticket aberto com demanda**, o que não deveria acontecer.

### Causa Raiz

O sistema possui duas falhas de consistência:

1. **Tickets órfãos**: Quando um grupo é reclassificado de "grupo de clientes" para "grupo interno", os tickets e demandas existentes permanecem no banco de dados

2. **Análise sem filtro**: A Edge Function `analyze-tickets` processa todos os tickets abertos sem verificar se o grupo associado ainda é um grupo de clientes

---

## Solução Proposta

### Parte 1: Correção na Edge Function

Adicionar filtro na query de tickets para incluir apenas grupos de clientes ativos:

**Arquivo:** `supabase/functions/analyze-tickets/index.ts`

```text
Alteração na query (linhas 587-610):

ANTES:
- Busca tickets com status = 'open'
- Não filtra por is_client_group

DEPOIS:
- Busca tickets com status = 'open'
- Faz JOIN com monitored_groups
- Filtra apenas grupos com is_client_group = true E is_active = true
```

### Parte 2: Limpeza de Dados Existentes

Executar SQL para fechar tickets órfãos de grupos internos:

```text
1. Identificar tickets abertos de grupos internos
2. Atualizar status para 'resolved' com nota explicativa
3. Marcar demandas pendentes como 'resolved' com razão de fechamento
```

### Parte 3: Trigger de Consistência (Opcional)

Criar trigger no banco que, ao alterar `is_client_group` para `false`:
- Fecha automaticamente tickets abertos do grupo
- Remove demandas pendentes ou marca como resolvidas

---

## Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `supabase/functions/analyze-tickets/index.ts` | Adicionar filtro `is_client_group = true` na query |
| Banco de dados | SQL para limpar tickets do "X9 de Atendimento" |

---

## Benefícios

- Grupos internos nunca mais terão demandas no painel de pendentes
- Consistência entre classificação do grupo e monitoramento de SLA
- Dados limpos sem tickets órfãos

---

## Seção Tecnica

### Query Atual (linhas 587-603)
```sql
SELECT id, group_id, created_at, last_analysis_at, analysis_count, 
       monitored_groups (name)
FROM tickets
WHERE status = 'open'
  AND next_analysis_at <= NOW()
ORDER BY next_analysis_at
LIMIT 10
```

### Query Corrigida
```sql
SELECT t.id, t.group_id, t.created_at, t.last_analysis_at, t.analysis_count,
       monitored_groups (name, is_client_group, is_active)
FROM tickets t
JOIN monitored_groups mg ON t.group_id = mg.id
WHERE t.status = 'open'
  AND t.next_analysis_at <= NOW()
  AND mg.is_client_group = true
  AND mg.is_active = true
ORDER BY t.next_analysis_at
LIMIT 10
```

### SQL de Limpeza
```sql
-- Fechar tickets de grupos não-clientes
UPDATE tickets 
SET status = 'resolved', 
    resolved_at = NOW(),
    notes = 'Fechado automaticamente: grupo reclassificado como interno'
WHERE group_id IN (
  SELECT id FROM monitored_groups 
  WHERE is_client_group = false
)
AND status = 'open';

-- Resolver demandas pendentes desses tickets
UPDATE ticket_demands 
SET status = 'resolved',
    resolved_at = NOW()
WHERE ticket_id IN (
  SELECT t.id FROM tickets t
  JOIN monitored_groups mg ON t.group_id = mg.id
  WHERE mg.is_client_group = false
)
AND status = 'open';
```
