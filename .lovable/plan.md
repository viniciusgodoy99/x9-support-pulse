

# Plano: Arquivar Grupos de Teste (3+ dias)

## Objetivo
Arquivar grupos pendentes há 3 ou mais dias para testar a funcionalidade de arquivamento.

## Grupos que serão arquivados (19 grupos)

| Nome | Criado em | Dias |
|------|-----------|------|
| Gorilla's house | 22/01/2026 | 3+ |
| PROMO PARA TENISTAS | 22/01/2026 | 3+ |
| Gestão de Automação e IA - Silver | 22/01/2026 | 3+ |
| Luiz Carpa a nova CHOQUEI | 22/01/2026 | 3+ |
| Futebol Real | 22/01/2026 | 3+ |
| Suporte matufast | 22/01/2026 | 3+ |
| United @CuriosidadesPRL | 22/01/2026 | 3+ |
| MENGÃO POTIGUAR | 22/01/2026 | 3+ |
| Unitão da Massa - Time do SESKO | 22/01/2026 | 3+ |
| Sócios CLIMB | 22/01/2026 | 3+ |
| oi | 22/01/2026 | 3+ |
| Hubspot Brasil | 22/01/2026 | 3+ |
| New Vision <> Climb | 22/01/2026 | 3+ |
| RN Automatizado | 22/01/2026 | 3+ |
| Turma do Meio Dia | 22/01/2026 | 3+ |
| Comunidade CRM Hub | 23/01/2026 | 3+ |
| Devano <> Climb | 23/01/2026 | 3+ |
| Carvalheira Na Ladeira 2026 | 23/01/2026 | 3+ |
| Climb.ai <> Garimpei na Web | 23/01/2026 | 3+ |

## Comando SQL

```sql
UPDATE monitored_groups
SET 
  is_archived = true,
  archived_at = now()
WHERE 
  pending_classification = true
  AND is_archived = false
  AND created_at < now() - interval '3 days';
```

## Resultado esperado

- 19 grupos serao movidos para "Grupos Arquivados"
- Eles aparecerao no dialog de arquivados ao clicar no botao
- Poderao ser restaurados a qualquer momento

