import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Plus, Trash2, Edit2, Power, Users } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGroups, type MonitoredGroup } from "@/hooks/useGroups";
import { toast } from "@/hooks/use-toast";

export default function GroupsSettings() {
  const navigate = useNavigate();
  const { groups, loading, addGroup, updateGroup, deleteGroup } = useGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MonitoredGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    whatsapp_id: "",
    sla_limit_minutes: 30,
  });

  const resetForm = () => {
    setFormData({ name: "", whatsapp_id: "", sla_limit_minutes: 30 });
    setEditingGroup(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, formData);
        toast({ title: "Grupo atualizado com sucesso!" });
      } else {
        await addGroup(formData);
        toast({ title: "Grupo adicionado com sucesso!" });
      }
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (group: MonitoredGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      whatsapp_id: group.whatsapp_id,
      sla_limit_minutes: group.sla_limit_minutes,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup(id);
      toast({ title: "Grupo removido com sucesso!" });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (group: MonitoredGroup) => {
    try {
      await updateGroup(group.id, { is_active: !group.is_active });
      toast({
        title: group.is_active ? "Grupo desativado" : "Grupo ativado",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do grupo.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              Grupos Monitorados
            </h1>
            <p className="text-muted-foreground">
              Gerencie os grupos de WhatsApp monitorados
            </p>
          </div>

          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "Editar Grupo" : "Adicionar Novo Grupo"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cliente/Grupo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Cliente ABC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_id">WhatsApp ID (JID)</Label>
                  <Input
                    id="whatsapp_id"
                    value={formData.whatsapp_id}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp_id: e.target.value })
                    }
                    placeholder="Ex: 5511999999999@g.us"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do grupo no formato do WhatsApp (ex: 123456789@g.us)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla_limit">Limite de SLA (minutos)</Label>
                  <Input
                    id="sla_limit"
                    type="number"
                    min={1}
                    value={formData.sla_limit_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sla_limit_minutes: parseInt(e.target.value) || 30,
                      })
                    }
                    placeholder="30"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit">
                    {editingGroup ? "Salvar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Nenhum grupo cadastrado</h2>
              <p>Adicione grupos de WhatsApp para começar o monitoramento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className={!group.is_active ? "opacity-60" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant={group.is_active ? "default" : "secondary"}>
                      {group.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp ID</p>
                    <p className="text-sm font-mono">{group.whatsapp_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Limite de SLA</p>
                    <p className="text-sm font-semibold">
                      {group.sla_limit_minutes} minutos
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/settings/groups/${group.id}/members`)}
                      title="Gerenciar membros"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(group)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover grupo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todos os tickets
                            associados a este grupo serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(group.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
