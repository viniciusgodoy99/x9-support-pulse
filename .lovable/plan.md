

# Simplificar Mensagens - Remover Status dos Topicos

## Objetivo

Remover os indicadores de status ("✅ Concluído", "⏳ Em andamento") de cada tópico nas mensagens do relatório. O formato será ainda mais limpo, contendo apenas o título e a descrição detalhada de cada tópico.

## Novo Formato Final

### Mensagem por Grupo

```
📋 *[NOME DO GRUPO]*
_Resumo do dia DD/MM_

📌 *TÓPICOS PRINCIPAIS*

🔹 *[Título do Tópico 1]*
[Descrição detalhada do que foi discutido]

🔹 *[Título do Tópico 2]*
[Descrição detalhada do que foi discutido]

Até amanhã! 👋
```

### Mensagem Quando Nao Ha Topicos

```
📋 *[NOME DO GRUPO]*
_Resumo do dia DD/MM_

Hoje não houve novos tópicos registrados.

Qualquer necessidade, estamos à disposição! 👋
```

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/daily-report/index.ts`

**Funcao `formatGroupMessage`**

Mudancas:
- Remover status "Concluído" e "Em andamento" de cada tópico
- Cada tópico terá apenas: emoji 🔹 + título em negrito + descrição
- Manter formatação WhatsApp (*negrito*, _itálico_)
- Manter encerramento "Até amanhã! 👋"

## Exemplo de Mensagem Final

```
📋 *GRUPO EXEMPLO*
_Resumo do dia 30/01_

📌 *TÓPICOS PRINCIPAIS*

🔹 *Alteração de Preço*
Solicitação de ajuste no valor do produto X conforme negociação comercial.

🔹 *Dúvida sobre Entrega*
Questionamento sobre prazo de entrega do pedido #1234.

Até amanhã! 👋
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/daily-report/index.ts` | Simplificar `formatGroupMessage` removendo status dos tópicos e remover envio do resumo geral |

