

# Relatorio Diario de Demandas - Uma Mensagem por Grupo

## Resumo da Feature

Implementar um sistema automatizado que envia, de segunda a sexta as 15h (horario de Brasilia), mensagens individuais de relatorio para cada grupo cliente no grupo "X9 de Atendimento". Cada grupo tera sua propria mensagem dedicada.

## Mudanca Principal

Em vez de uma unica mensagem consolidada, o sistema enviara **uma mensagem separada para cada grupo cliente**, permitindo:

- Melhor organizacao visual no WhatsApp
- Facilidade para copiar/encaminhar relatorio especifico
- Mensagens mais curtas e focadas
- Possibilidade de reagir/responder a grupos especificos

## Dados Identificados

| Elemento | Valor |
|----------|-------|
| Grupo de Destino | X9 de Atendimento |
| WhatsApp ID | `120363422213957419@g.us` |
| Grupos Cliente Ativos | 5 grupos |
| Horario de Envio | 15:00 BRT (18:00 UTC) |
| Dias | Segunda a Sexta |

## Fluxo de Mensagens

```text
15:00 - Mensagem 1: Arttico | Lize
15:00 - Mensagem 2: Arttico | Nautt Finance
15:00 - Mensagem 3: Arttico | Segantini
15:00 - Mensagem 4: Climb <> Arttico
15:00 - Mensagem 5: Tastto | Casa da Gil
15:00 - Mensagem 6: Resumo Geral (opcional)
```

## Exemplos de Mensagens Individuais

### Mensagem 1 - Grupo com Demandas Resolvidas

```text
ARTTICO | LIZE - Relatorio do Dia (30/01)

Oi, equipe! Aqui vai o resumo de hoje para o grupo Arttico | Lize:

Tivemos 3 demandas:

1. Solicitacao de alteracao no cronograma de postagens
   Resolvida em 18 minutos

2. Duvida sobre metricas do Instagram
   Resolvida em 32 minutos

3. Pedido de orcamento para campanha de trafego
   Ainda pendente

Resumo: 2 resolvidas, 1 pendente
Tempo medio: 25 min | SLA: Tudo ok!
```

### Mensagem 2 - Grupo com SLA Estourado

```text
ARTTICO | NAUTT FINANCE - Relatorio do Dia (30/01)

Atencao, equipe! Resumo do grupo Arttico | Nautt Finance:

Recebemos 2 demandas hoje:

1. Reclamacao sobre atraso na entrega dos criativos
   Pendente - SLA ESTOURADO

2. Solicitacao de relatorio mensal de performance
   Pendente

Resumo: 0 resolvidas, 2 pendentes
SLA estourado: 1 demanda precisa de atencao urgente!
```

### Mensagem 3 - Grupo sem Demandas

```text
ARTTICO | SEGANTINI - Relatorio do Dia (30/01)

Dia tranquilo no grupo Arttico | Segantini!

Nenhuma demanda registrada hoje. Otimo sinal de que esta tudo fluindo bem por la.
```

### Mensagem 4 - Grupo com Bom Desempenho

```text
TASTTO | CASA DA GIL - Relatorio do Dia (30/01)

Excelente dia no grupo Tastto | Casa da Gil!

Tivemos 4 demandas e todas foram resolvidas:

1. Duvida sobre prazo de entrega do projeto
   Resolvida em 15 minutos

2. Solicitacao de ajuste nas cores do logo
   Resolvida em 28 minutos

3. Feedback sobre ultima postagem
   Resolvida em 22 minutos

4. Confirmacao de reuniao
   Resolvida em 8 minutos

Resumo: 4 resolvidas, 0 pendentes
Tempo medio: 18 min | Parabens ao time!
```

### Mensagem Final - Resumo Geral

```text
RESUMO GERAL DO DIA (30/01)

Boa tarde! Fechando o dia com os numeros consolidados:

Total de demandas: 12
Resolvidas: 8 | Pendentes: 4
Tempo medio de resolucao: 22 min
SLA estourado: 1 (Nautt Finance)

Grupos destaque:
- Tastto | Casa da Gil: 100% resolvido
- Arttico | Lize: Bom ritmo

Atencao:
- Nautt Finance: 1 SLA estourado

Vamos com tudo amanha!
```

## Implementacao Tecnica

### 1. Nova Edge Function: `daily-report`

Criar em `supabase/functions/daily-report/index.ts`:

**Logica de Execucao:**
```text
1. Buscar grupos com is_client_group = true e is_active = true
2. Para cada grupo:
   a. Buscar demandas do dia (created_at >= hoje 00:00)
   b. Formatar mensagem individual
   c. Enviar via UAZAPI
   d. Aguardar 2 segundos (evitar rate limit)
3. Enviar mensagem de resumo geral
```

**Dados a Buscar por Demanda:**
- `description` (texto da demanda)
- `status` (open/resolved)
- `resolution_time_minutes` (tempo de resolucao)
- `sla_exceeded` (se passou do prazo)

**Envio Sequencial:**
- Pequeno delay entre mensagens (2 segundos)
- Evita bloqueio por spam no WhatsApp
- Mantém ordem logica das mensagens

### 2. Configuracao do Cron Job

Usar `pg_cron` para agendar a execucao:

- Expressao cron: `0 18 * * 1-5` (18:00 UTC = 15:00 BRT, seg-sex)
- Endpoint: `/functions/v1/daily-report`

### 3. Configuracoes na Tabela Settings

| Key | Valor Padrao | Descricao |
|-----|--------------|-----------|
| `daily_report_enabled` | `true` | Habilita/desabilita o relatorio |
| `daily_report_group_id` | `120363422213957419@g.us` | Grupo de destino |
| `daily_report_include_summary` | `true` | Incluir mensagem de resumo geral |

### 4. Atualizacao do config.toml

Adicionar a nova edge function com `verify_jwt = false`.

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/daily-report/index.ts` | Criar |
| `supabase/config.toml` | Adicionar funcao |
| Tabela `settings` | Inserir configuracoes |
| SQL (cron job) | Executar via ferramenta |

## Vantagens desta Abordagem

1. **Organizacao**: Cada grupo tem sua mensagem dedicada
2. **Legibilidade**: Mensagens mais curtas e focadas
3. **Interacao**: Possivel reagir/responder a grupos especificos
4. **Encaminhamento**: Facil copiar relatorio de um grupo especifico
5. **Escalabilidade**: Funciona bem mesmo com muitos grupos

## Proximos Passos Apos Implementacao

1. Testar a edge function manualmente
2. Verificar o envio das mensagens individuais
3. Validar o delay entre mensagens
4. Monitorar os primeiros relatorios automaticos

