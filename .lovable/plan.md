

# Plano: Sistema de Arquivamento Automatico de Grupos

## Visao Geral

Implementar logica de arquivamento automatico para grupos que ficam "Aguardando Classificacao" por mais de 7 dias, com opcao de recuperacao.

---

## 1. Alteracao no Banco de Dados

### Adicionar coluna `is_archived` na tabela `monitored_groups`

```sql
ALTER TABLE monitored_groups 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE monitored_groups 
ADD COLUMN archived_at timestamp with time zone;
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| is_archived | boolean | Indica se o grupo esta arquivado |
| archived_at | timestamp | Data/hora do arquivamento |

---

## 2. Logica de Arquivamento Automatico

### Opcao A: Arquivamento no Frontend (simples)
Ao carregar os grupos, verificar se algum grupo pendente tem `created_at` maior que 7 dias e marcar como arquivado automaticamente.

### Opcao B: Arquivamento via Cron Job (recomendado)
Criar uma funcao no banco que roda periodicamente via `pg_cron`:

```sql
-- Funcao para arquivar grupos pendentes antigos
CREATE OR REPLACE FUNCTION archive_old_pending_groups()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE monitored_groups
  SET 
    is_archived = true,
    archived_at = now()
  WHERE 
    pending_classification = true
    AND is_archived = false
    AND created_at < now() - interval '7 days';
END;
$$;

-- Agendar execucao diaria
SELECT cron.schedule(
  'archive-old-pending-groups',
  '0 3 * * *', -- Executa as 3h da manha
  'SELECT archive_old_pending_groups()'
);
```

**Recomendo a Opcao B** pois mantem a logica no backend e nao depende do usuario acessar a pagina.

---

## 3. Alteracoes no Hook `useGroups.tsx`

### 3.1 Atualizar interface `MonitoredGroup`

```tsx
export interface MonitoredGroup {
  // ... campos existentes
  is_archived: boolean;
  archived_at: string | null;
}
```

### 3.2 Atualizar query para excluir arquivados por padrao

```tsx
const fetchGroups = async () => {
  const { data, error } = await supabase
    .from("monitored_groups")
    .select("*")
    .eq("is_archived", false) // Excluir arquivados
    .order("pending_classification", { ascending: false })
    .order("name");
};
```

### 3.3 Adicionar funcao para buscar grupos arquivados

```tsx
const fetchArchivedGroups = async () => {
  const { data, error } = await supabase
    .from("monitored_groups")
    .select("*")
    .eq("is_archived", true)
    .order("archived_at", { ascending: false });
  
  return data;
};
```

### 3.4 Adicionar funcao para restaurar grupo

```tsx
const restoreGroup = async (id: string) => {
  await supabase
    .from("monitored_groups")
    .update({
      is_archived: false,
      archived_at: null,
      created_at: new Date().toISOString() // Reset timer
    })
    .eq("id", id);
  
  await fetchGroups();
};
```

### 3.5 Adicionar funcao para arquivar manualmente

```tsx
const archiveGroup = async (id: string) => {
  await supabase
    .from("monitored_groups")
    .update({
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq("id", id);
  
  await fetchGroups();
};
```

---

## 4. Alteracoes na Pagina `Groups.tsx`

### 4.1 Adicionar estados para grupos arquivados

```tsx
const [showArchivedDialog, setShowArchivedDialog] = useState(false);
const [archivedGroups, setArchivedGroups] = useState<MonitoredGroup[]>([]);
const [loadingArchived, setLoadingArchived] = useState(false);
```

### 4.2 Adicionar botao "Grupos Arquivados" no header

```tsx
<Button
  variant="outline"
  onClick={() => {
    fetchArchivedGroups();
    setShowArchivedDialog(true);
  }}
>
  <Archive className="h-4 w-4 mr-2" />
  Grupos Arquivados
</Button>
```

### 4.3 Criar Dialog/Sheet para exibir grupos arquivados

```tsx
<Dialog open={showArchivedDialog} onOpenChange={setShowArchivedDialog}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Archive className="h-5 w-5" />
        Grupos Arquivados
      </DialogTitle>
      <DialogDescription>
        Grupos que ficaram mais de 7 dias sem classificacao.
        Voce pode restaura-los para o painel de classificacao.
      </DialogDescription>
    </DialogHeader>
    
    {archivedGroups.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum grupo arquivado
      </div>
    ) : (
      <div className="space-y-3">
        {archivedGroups.map((group) => (
          <Card key={group.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  Arquivado em {format(new Date(group.archived_at), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleRestore(group.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(group.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </DialogContent>
</Dialog>
```

### 4.4 Adicionar indicador visual de tempo restante nos grupos pendentes

Mostrar quantos dias restam antes do arquivamento automatico:

```tsx
const getDaysUntilArchive = (createdAt: string) => {
  const created = new Date(createdAt);
  const archiveDate = addDays(created, 7);
  const daysLeft = differenceInDays(archiveDate, new Date());
  return Math.max(0, daysLeft);
};

// No card de grupo pendente:
<p className="text-xs text-amber-600">
  Arquiva em {getDaysUntilArchive(group.created_at)} dias
</p>
```

---

## 5. Imports Adicionais

```tsx
// Groups.tsx
import { Archive, RotateCcw } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
```

---

## 6. Fluxo de Usuario

```
[Novo Grupo Detectado]
        |
        v
[Aguardando Classificacao]
        |
   7 dias sem acao
        |
        v
[Arquivado Automaticamente]
        |
   Usuario clica "Restaurar"
        |
        v
[Volta para Aguardando Classificacao]
   (timer resetado)
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar colunas `is_archived` e `archived_at` |
| Migracao SQL | Criar funcao e cron job para arquivamento automatico |
| src/hooks/useGroups.tsx | Adicionar funcoes `fetchArchivedGroups`, `restoreGroup`, `archiveGroup` |
| src/pages/settings/Groups.tsx | Adicionar botao, dialog e logica de grupos arquivados |

---

## Comportamento Esperado

1. Grupos pendentes por mais de 7 dias sao arquivados automaticamente (via cron diario)
2. Botao "Grupos Arquivados" aparece no header da pagina de grupos
3. Ao clicar, abre dialog listando todos os grupos arquivados
4. Usuario pode restaurar (volta para pendentes com timer resetado) ou deletar permanentemente
5. Cards de grupos pendentes mostram contador de "Arquiva em X dias"

