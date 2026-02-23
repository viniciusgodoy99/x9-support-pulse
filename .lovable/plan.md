

# Corrigir Envio de Notificacoes de Estouro de SLA

## Problemas Identificados

Ao investigar os logs e o codigo, foram encontrados **3 problemas** que impedem o envio de alertas de SLA:

### Problema 1: Autenticacao bloqueia o cron job
A funcao `analyze-tickets` valida o token usando `getClaims()` (que espera um JWT de usuario autenticado). Porem, o cron job envia o **anon key** como Bearer token, que nao e um JWT de usuario valido. Resultado: a funcao retorna 401 silenciosamente e nunca executa a partir do cron.

### Problema 2: Hoje e domingo
A funcao `sendSlaBreachNotifications` verifica horario comercial (segunda a sexta, 08-18h BRT) antes de enviar alertas. Como hoje e domingo, mesmo quando a funcao roda (via teste manual), as notificacoes sao bloqueadas.

### Problema 3: testMode nao esta implementado
A pagina de Testes envia `{ testMode: true }` mas a funcao `analyze-tickets` nao reconhece esse parametro — nao existe logica para ignorar a checagem de horario comercial no modo de teste.

## Solucao

### Arquivo: `supabase/functions/analyze-tickets/index.ts`

1. **Remover validacao por `getClaims`**: Substituir por validacao simples do token JWT (verificar se o token e o anon key ou um token de usuario valido). Isso permite que tanto o cron job quanto chamadas do frontend funcionem.

2. **Adicionar suporte ao parametro `testMode`**: Quando `testMode: true`, pular a verificacao de horario comercial na funcao `sendSlaBreachNotifications`, permitindo testar alertas a qualquer hora/dia.

3. **Adicionar suporte ao parametro `groupId` no modo teste**: Permitir filtrar demandas de um grupo especifico para simulacao.

## Detalhes Tecnicos

### Mudanca na autenticacao (linhas 656-684)

Remover o bloco `getClaims` e substituir por uma validacao que aceita tanto o anon key quanto tokens de usuario:

```typescript
// Aceitar tanto anon key quanto user JWT
const token = authHeader.replace("Bearer ", "");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

// Se nao e o anon key, verificar se e um user JWT valido
if (token !== anonKey) {
  const supabaseAnon = createClient(supabaseUrl, anonKey!);
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) {
    return 401 response;
  }
}
```

### Mudanca na funcao sendSlaBreachNotifications (linhas 250-458)

Adicionar parametro `testMode: boolean` que, quando ativo:
- Pula a verificacao de horario comercial (dia da semana e hora)
- Permite envio a qualquer momento

### Mudanca no handler principal (linhas 697-705)

Extrair `testMode` e `groupId` do body e passar para `sendSlaBreachNotifications`:

```typescript
const body = await req.json();
const testMode = body.testMode === true;
const targetGroupId = body.groupId || null;
```

### Arquivo modificado
- `supabase/functions/analyze-tickets/index.ts`

## Resultado Esperado

- O cron job horario passara a executar a funcao normalmente
- O botao "Simular Alerta de SLA" na pagina de Testes funcionara em qualquer horario/dia
- Alertas de SLA serao enviados ao grupo "X9 de Atendimento" quando houver demandas com estouro

