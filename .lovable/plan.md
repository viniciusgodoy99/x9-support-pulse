

# Redesenhar Pagina de Testes com Cards de Grupos e Preview de Mensagem

## Objetivo

Ao selecionar uma instancia na pagina de Testes, exibir todos os grupos de cliente como cards. Cada card tera um botao para visualizar a mensagem que seria enviada (preview), sem efetivamente enviar.

## Mudancas

### 1. Edge Function `daily-report/index.ts`

Adicionar suporte ao parametro `previewOnly: true` no body da requisicao:

- Quando `previewOnly` estiver ativo, a funcao gera as mensagens normalmente (incluindo narrativa via IA) mas **nao envia** pelo WhatsApp
- Retorna um array com `{ groupId, groupName, message }` para cada grupo
- Suporte opcional a `targetGroupId` para preview de um grupo especifico

Trecho relevante no handler principal:
```typescript
const previewOnly = body.previewOnly === true;

// ... gera reports normalmente ...

if (previewOnly) {
  // Gera mensagens sem enviar
  const previews = [];
  for (const report of batch) {
    const message = await formatGroupMessage(report, dateStr);
    previews.push({
      groupId: report.group.id,
      groupName: report.group.name,
      whatsappId: report.group.whatsapp_id,
      hasDemands: report.totalDemands > 0,
      demandsCount: report.totalDemands,
      messagesCount: report.messages.length,
      message,
    });
  }
  return Response with previews array;
}
```

### 2. Pagina `src/pages/settings/Tests.tsx` — Redesenho completo

**Novo fluxo do card "Resumo Diario":**

1. Usuario seleciona a instancia WhatsApp (dropdown)
2. Ao selecionar, automaticamente carrega e exibe todos os grupos de cliente como cards (grid responsivo)
3. Cada card de grupo mostra:
   - Nome do grupo
   - Badge indicando se tem demandas ou apenas interacoes
   - Quantidade de demandas/mensagens do dia
   - Botao "Visualizar Mensagem" (icone Eye)
   - Botao "Enviar" (icone Send) para envio individual
4. Botao global "Disparar para Todos" continua existindo no topo
5. Botao "Carregar Previews" que chama a edge function com `previewOnly: true` e preenche os cards com as mensagens geradas

**Modal de Preview:**
- Dialog/modal que abre ao clicar "Visualizar Mensagem"
- Mostra o nome do grupo no titulo
- Corpo da mensagem formatada (como seria enviada no WhatsApp)
- Botoes: "Fechar" e "Enviar esta mensagem" (opcional)

**Card "Estouro de SLA"** permanece igual.

### 3. Estrutura dos componentes

Criar um componente auxiliar `GroupPreviewCard` dentro do mesmo arquivo (ou inline) para cada grupo:

```typescript
interface GroupPreview {
  groupId: string;
  groupName: string;
  whatsappId: string;
  hasDemands: boolean;
  demandsCount: number;
  messagesCount: number;
  message: string | null; // null = ainda nao gerou preview
}
```

## Arquivos modificados

- `supabase/functions/daily-report/index.ts` — adicionar suporte a `previewOnly`
- `src/pages/settings/Tests.tsx` — redesenho com cards de grupos e modal de preview

## Fluxo

```text
Seleciona instancia
      |
      v
Carrega grupos de cliente do banco
      |
      v
Exibe grupos como cards (grid)
      |
      v
Clica "Carregar Previews"
      |
      v
Chama daily-report com previewOnly=true
      |
      v
Preenche cada card com a mensagem gerada
      |
      v
Clica "Visualizar" em um card
      |
      v
Abre modal com a mensagem completa
```

