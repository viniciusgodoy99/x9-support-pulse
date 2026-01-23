import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGroups } from "@/hooks/useGroups";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Clock, Save, MessageSquare } from "lucide-react";

export default function Settings() {
  const { groups, loading: groupsLoading, updateGroup } = useGroups();
  
  const [editingSla, setEditingSla] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filter only client groups
  const clientGroups = useMemo(() => 
    groups.filter(g => g.is_client_group && g.is_active),
    [groups]
  );

  const handleSlaChange = (groupId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingSla(prev => ({ ...prev, [groupId]: numValue }));
  };

  const handleSaveSla = async (groupId: string) => {
    const newSla = editingSla[groupId];
    if (newSla === undefined || newSla < 1) {
      toast({
        title: "Valor inválido",
        description: "O limite de SLA deve ser maior que 0 minutos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingId(groupId);
      await updateGroup(groupId, { sla_limit_minutes: newSla });
      toast({
        title: "SLA atualizado",
        description: `Limite de SLA alterado para ${newSla} minutos.`,
      });
      setEditingSla(prev => {
        const updated = { ...prev };
        delete updated[groupId];
        return updated;
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o SLA. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Ajuste os limites de SLA por grupo
            </p>
          </div>
        </div>

        {/* SLA Configuration Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Limites de SLA por Grupo</CardTitle>
            </div>
            <CardDescription>
              Configure o tempo máximo de resposta (em minutos) para cada grupo de clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : clientGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum grupo de cliente encontrado.</p>
                <p className="text-sm mt-1">
                  Classifique grupos como "Cliente" na página de Grupos para configurar o SLA.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="w-[120px] text-center">SLA Atual</TableHead>
                    <TableHead className="w-[150px]">Novo SLA (min)</TableHead>
                    <TableHead className="w-[100px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientGroups.map(group => {
                    const currentSla = group.sla_limit_minutes;
                    const editedSla = editingSla[group.id];
                    const hasChanges = editedSla !== undefined && editedSla !== currentSla;
                    const isSaving = savingId === group.id;

                    return (
                      <TableRow key={group.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{group.name}</span>
                            {group.is_active && (
                              <Badge variant="outline" className="text-xs">
                                Ativo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            {currentSla} min
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={editedSla ?? currentSla}
                            onChange={(e) => handleSlaChange(group.id, e.target.value)}
                            className="w-full"
                            placeholder="minutos"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSaveSla(group.id)}
                            disabled={!hasChanges || isSaving}
                            className="gap-1.5"
                          >
                            {isSaving ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Salvar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
