

# Plano: Sincronizar Status da Instancia WhatsApp

## Problema Identificado

A instancia "Arttico X9" mostra status `connected` na UAZAPI, mas no banco de dados local esta como `waiting` com `phone_number: null`. Isso impede a sincronizacao correta das mensagens do grupo "Nautt Finance".

---

## Solucao

Adicionar um botao de "Sincronizar Todas" que forca a atualizacao do status de todas as instancias de uma vez, chamando a edge function com `action: 'status'` para cada instancia.

---

## Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/settings/WhatsAppConnect.tsx` | Adicionar botao "Sincronizar Todas" e handler para sincronizar em lote |
| `src/hooks/useWhatsAppInstances.tsx` | Adicionar funcao `syncAllStatuses` que percorre todas as instancias |

---

## Detalhes da Implementacao

### 1. Adicionar Estado e Handler em WhatsAppConnect.tsx

```tsx
const [syncingAll, setSyncingAll] = useState(false);

const handleSyncAll = useCallback(async () => {
  setSyncingAll(true);
  let successCount = 0;
  let errorCount = 0;

  for (const instance of instances) {
    try {
      await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'status', instanceId: instance.id },
      });
      successCount++;
    } catch (err) {
      console.error(`Error syncing ${instance.name}:`, err);
      errorCount++;
    }
  }

  await fetchInstances();
  setSyncingAll(false);

  toast({
    title: 'Sincronizacao concluida',
    description: `${successCount} instancia(s) sincronizada(s)${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}`,
  });
}, [instances, fetchInstances, toast]);
```

### 2. Adicionar Botao na Action Bar

```tsx
<div className="flex flex-wrap items-center justify-between gap-4">
  <div className="flex items-center gap-2 text-muted-foreground">
    <Smartphone className="h-5 w-5" />
    <span className="text-sm">
      <span className="font-semibold text-foreground">{instances.length}</span> instancias
    </span>
  </div>
  <div className="flex items-center gap-2">
    <Button 
      variant="outline" 
      onClick={handleSyncAll}
      disabled={syncingAll || instances.length === 0}
    >
      {syncingAll ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Sincronizar Todas
    </Button>
    <Button onClick={() => setShowAddDialog(true)}>
      <Plus className="h-4 w-4 mr-2" />
      Nova Instancia
    </Button>
  </div>
</div>
```

---

## Fluxo de Uso

```text
1. Usuario acessa pagina de Conexoes WhatsApp
2. Usuario clica em "Sincronizar Todas"
3. Sistema chama edge function com action='status' para cada instancia
4. Edge function consulta UAZAPI e atualiza banco de dados
5. Interface atualiza mostrando status correto (connected)
6. Webhook volta a funcionar para grupos vinculados a instancia
```

---

## Beneficios

- Corrige dessincronizacao entre UAZAPI e banco local
- Permite sincronizar todas as instancias com um clique
- Feedback visual durante o processo de sincronizacao
- Toast informando quantidade de instancias sincronizadas

