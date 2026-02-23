
# Adicionar Página "Testes" na Sidebar

## Contexto

Antes de tudo: **hoje é domingo**, e o cron do `daily-report` roda apenas de segunda a sexta (`50 20 * * 1-5`). Por isso, nao houve envio de resumo diario hoje. O `analyze-tickets` roda a cada hora e os cron jobs mostram "succeeded", mas nao ha logs da edge function — pode ser que a funcao nao esteja deployada. A pagina de testes vai permitir disparar manualmente esses processos para validar.

## O que sera feito

### 1. Adicionar item "Testes" na Sidebar

- Icone: `FlaskConical` (lucide-react)
- Posicao: dentro do grupo "Configuracoes", apos o WhatsApp
- Rota: `/settings/tests`

### 2. Criar pagina `src/pages/settings/Tests.tsx`

A pagina tera duas secoes (cards):

**Card 1: Resumo Diario**
- Label: "Instancia WhatsApp" + dropdown com as instancias disponiveis
- Label: "Grupo de destino do resumo" + dropdown com os grupos de cliente ativos
- Label: "Tipo de envio" + dropdown (Todos os grupos / Grupo especifico)
- Se "Grupo especifico", mostrar dropdown para selecionar qual grupo tera o relatorio gerado
- Botao "Disparar Resumo Diario" que chama a edge function `daily-report` via POST

**Card 2: Estouro de SLA**
- Label: "Instancia WhatsApp" + dropdown com as instancias
- Label: "Grupo de notificacao" + mostra o grupo configurado em settings (`sla_notification_group_id`)
- Label: "Grupo para simular estouro" + dropdown com grupos de cliente ativos
- Botao "Simular Alerta de SLA" que chama a edge function `analyze-tickets` via POST com parametro de teste

Ambos os cards mostrarao:
- Status do ultimo disparo (loading, sucesso, erro)
- Resposta da edge function em um bloco de texto expansivel

### 3. Registrar rota no App.tsx

- Adicionar `/settings/tests` como rota protegida apontando para o componente `Tests`

## Detalhes tecnicos

### Arquivos a criar
- `src/pages/settings/Tests.tsx`

### Arquivos a modificar
- `src/components/layout/AppSidebar.tsx` — adicionar item "Testes" com icone `FlaskConical`
- `src/App.tsx` — registrar rota `/settings/tests`

### Dados dos dropdowns
- **Instancias**: query em `whatsapp_instances` (nome + status)
- **Grupos de cliente**: query em `monitored_groups` onde `is_client_group = true` e `is_archived = false`
- **Grupo de notificacao SLA**: lido da tabela `settings` (key = `sla_notification_group_id`)

### Chamadas as edge functions
- Resumo diario: `POST /functions/v1/daily-report` com body opcional `{ targetGroupId: "..." }`
- Estouro de SLA: `POST /functions/v1/analyze-tickets` com body `{ testMode: true, groupId: "..." }`

### Layout
- Usa `MainLayout` com header "Testes de Envio"
- Cards com `Card`, `CardHeader`, `CardContent` do shadcn
- Dropdowns com `Select` do shadcn
- Botoes com `Button` do shadcn
- Feedback com `toast` e area de resposta inline
