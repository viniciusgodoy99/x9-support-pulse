

# Ajuste das Mensagens de Relatorio para Formato Comercial

## Objetivo

Reformular as mensagens do relatorio diario para um formato mais comercial e profissional, adequado para visualizacao por clientes. As mensagens devem apresentar os topicos principais discutidos e uma conclusao final, sem expor metricas internas como SLA.

## Estrutura Proposta das Mensagens

### Mensagem por Grupo (Cliente)

```
[NOME DO GRUPO]
Resumo de Atendimento - DD/MM

Ola! Segue o resumo das principais atividades de hoje:

TOPICOS TRATADOS

- [Descricao da demanda 1] - Concluido
- [Descricao da demanda 2] - Concluido
- [Descricao da demanda 3] - Em andamento

CONCLUSAO

Hoje foram tratados X assuntos, sendo Y ja finalizados. 
[Mensagem positiva sobre o atendimento/parceria].

Atenciosamente,
Equipe de Atendimento
```

### Mensagem de Resumo Geral

```
RESUMO GERAL DE ATENDIMENTOS - DD/MM

Prezados parceiros,

Segue o consolidado das atividades do dia:

- Total de demandas atendidas: X
- Demandas finalizadas: Y
- Em acompanhamento: Z

DESTAQUES DO DIA

[Lista de grupos com 100% de resolucao]

Agradecemos a confianca e seguimos a disposicao!

Equipe de Atendimento
```

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/daily-report/index.ts`

**Funcao `formatGroupMessage`** (linhas 52-127):
- Remover referencias a SLA e metricas internas
- Reformular para tom comercial
- Adicionar secao de "Topicos Tratados" com lista de demandas
- Adicionar secao de "Conclusao" com resumo positivo
- Adicionar assinatura profissional

**Funcao `formatSummaryMessage`** (linhas 130-190):
- Remover emojis e linguagem informal
- Usar tom corporativo ("Prezados parceiros")
- Substituir "SLA estourado" por "Em acompanhamento"
- Adicionar secao de "Destaques do Dia"
- Adicionar assinatura profissional

## Mapeamento de Termos

| Termo Atual | Novo Termo |
|-------------|------------|
| SLA estourado | Em acompanhamento |
| Pendente | Em andamento |
| Resolvida | Concluido |
| Demanda | Topico/Assunto |
| Equipe | - (remover referencias internas) |

## Exemplo de Mensagem Reformulada

**Antes:**
```
GRUPO EXEMPLO - Relatorio do Dia (30/01)

Atencao, equipe! Resumo do grupo Grupo Exemplo:

Tivemos 3 demandas:

1. Solicitar alteracao de preco
   Resolvida em 15 minutos

2. Duvida sobre entrega
   Ainda pendente

Resumo: 1 resolvida, 2 pendentes
SLA estourado: 1 demanda precisa de atencao urgente!
```

**Depois:**
```
GRUPO EXEMPLO
Resumo de Atendimento - 30/01

Ola! Segue o resumo das principais atividades de hoje:

TOPICOS TRATADOS

- Alteracao de preco solicitada - Concluido
- Duvida sobre entrega - Em andamento
- Atualizacao cadastral - Em andamento

CONCLUSAO

Hoje foram tratados 3 assuntos no seu canal de atendimento, sendo 1 ja finalizado. Os demais estao em acompanhamento e serao concluidos em breve.

Agradecemos a parceria!

Atenciosamente,
Equipe de Atendimento
```

## Fluxo de Implementacao

```
1. Atualizar formatGroupMessage com novo formato comercial
2. Atualizar formatSummaryMessage com novo formato corporativo
3. Testar a Edge Function para validar as novas mensagens
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/daily-report/index.ts` | Reformular funcoes de formatacao de mensagens |

