
# Exibir grupos sempre, independente dos previews

## Problema
Atualmente os cards dos grupos so aparecem apos clicar em "Carregar Previews", pois a grid depende dos dados de preview para mostrar informacoes. O usuario quer que os grupos aparecam assim que a instancia for selecionada, e o botao "Carregar Previews" sirva apenas para carregar as mensagens.

## Mudancas

### Arquivo: `src/pages/settings/Tests.tsx`

1. **Mostrar grid de grupos sempre que `drInstance` estiver selecionado** — a grid ja faz isso (linha 205: `drInstance && filteredGroups.length > 0`), entao os grupos ja aparecem. O problema real e que o filtro "Com interacao" / "Sem interacao" so faz sentido apos previews carregados, e os badges/contadores tambem.

2. **Ajustar os cards** para exibirem o nome do grupo mesmo sem preview carregado — isso ja acontece. O botao "Visualizar Mensagem" ja permite carregar individualmente.

3. **Desabilitar filtro de interacao ate que os previews sejam carregados** — quando nao ha previews, o filtro "Com interacao" mostraria 0 resultados (todos os grupos cairiam em "sem interacao"). Para evitar confusao, o filtro so deve estar habilitado apos `previews.size > 0`.

4. **Badges de contagem** — manter visivel apenas apos previews carregados (ja esta assim).

### Detalhes tecnicos

- Na linha do filtro Select (linha 175-188), adicionar `disabled={previews.size === 0}` no SelectTrigger para que o filtro fique desabilitado ate carregar previews.
- Resetar o filtro para "all" quando nao houver previews, para garantir que todos os grupos aparecam por padrao.
- Nenhuma outra mudanca necessaria — a grid ja mostra todos os grupos quando `interactionFilter === "all"`.

Na verdade, relendo o codigo, o comportamento ja deveria estar correto: a grid aparece quando `drInstance` esta definido e `filteredGroups.length > 0`. Se o filtro esta em "all", `filteredGroups` retorna todos os `clientGroups`. Entao os grupos ja deveriam aparecer sem clicar em "Carregar Previews".

O possivel problema e que o `interactionFilter` pode estar em "with" ou "without" por padrao em algum cenario, ou que `clientGroups` esta vazio. Vou garantir que:

1. O filtro inicie sempre em "all"
2. O filtro de interacao seja desabilitado quando nao ha previews
3. Ao trocar de instancia, resetar o filtro para "all"
