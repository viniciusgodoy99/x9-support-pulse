
# Remover Mensagem de Topicos Vazios e Ajustar Formato

## Objetivo

Fazer duas alteracoes na funcao de relatorio diario:
1. Remover o bloco que envia mensagem quando nao ha topicos
2. Remover o negrito dos topicos (conforme solicitado anteriormente)

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/daily-report/index.ts`

**Mudanca 1: Remover bloco "sem topicos" (linhas 55-63)**

Remover completamente:
```typescript
// No topics case
if (report.totalDemands === 0) {
  return `📋 *${groupName}*
_Resumo do dia ${dateStr}_

Hoje não houve novos tópicos registrados.

Qualquer necessidade, estamos à disposição! 👋`;
}
```

**Mudanca 2: Remover negrito dos topicos (linha 68)**

```typescript
// ANTES
return `🔹 *${demand.description}*`;

// DEPOIS
return `🔹${demand.description}`;
```

**Mudanca 3: Pular grupos sem topicos no loop de envio (linhas 334-351)**

Adicionar verificacao para nao enviar mensagem de grupos vazios:
```typescript
for (const report of reports) {
  // Skip groups with no topics
  if (report.totalDemands === 0) {
    continue;
  }
  
  const message = formatGroupMessage(report, dateStr);
  // ... resto do codigo
}
```

## Resultado

Grupos sem topicos no dia simplesmente nao receberao mensagem, evitando envio de conteudo vazio ou desnecessario.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/daily-report/index.ts` | Remover bloco sem topicos, remover negrito e pular grupos vazios |
