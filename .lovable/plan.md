
# Plano: Deletar Demandas de Membros Nao-Cliente

## Demandas a Serem Removidas

| ID | Grupo | Solicitante | Role | Motivo da Remocao |
|----|-------|-------------|------|-------------------|
| `27790c0e-e700-46f4-80c9-59ef16e96c95` | Arttico \| Lize | Lucas Felipe | traffic_manager | Gestor de trafego, nao cliente |
| `3eab35a2-9580-454f-b2ad-125b33a3d2de` | Tastto \| Casa da Gil | Victor Motta - Tastto | unknown | Role nao classificado como cliente |

## Demandas que Permanecerao

| ID | Grupo | Solicitante | Role | Status |
|----|-------|-------------|------|--------|
| `62668ed8-57bf-4551-9eba-6bba9f8c704c` | X9 de Atendimento | Gabriel Pereira | client | Valida - cliente real |
| `fe66926c-e0e0-4fdb-ab26-76d6f743b9d9` | Arttico \| Nautt Finance | Matheus Medeiros | nao cadastrado | Nao selecionada |
| `19d9e612-f639-4bcf-a141-e829c0699959` | Arttico \| Nautt Finance | Matheus Medeiros | nao cadastrado | Nao selecionada |

## Acao de Limpeza

Executar DELETE seguro com WHERE explicito nos IDs confirmados:

```sql
DELETE FROM ticket_demands 
WHERE id IN (
  '27790c0e-e700-46f4-80c9-59ef16e96c95',
  '3eab35a2-9580-454f-b2ad-125b33a3d2de'
)
AND status = 'open';
```

## Medidas de Seguranca

1. Deletar apenas por IDs explicitos (nao por condicao generica)
2. Adicionar condicao `AND status = 'open'` como camada extra de seguranca
3. Verificar contagem apos execucao para confirmar que apenas 2 registros foram afetados

## Resultado Esperado

- 2 demandas removidas
- 3 demandas permanecem no painel
- Nenhum dado de cliente real afetado
