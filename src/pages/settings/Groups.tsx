import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Trash2, Edit2, Power, Users, AlertCircle, Building2, UserCircle, Search, Filter } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const { groups, loading, addGroup, updateGroup, classifyGroup, deleteGroup } = useGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MonitoredGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    whatsapp_id: "",
    sla_limit_minutes: 30,
  });
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<"all" | "active" | "inactive">("all");

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

  const handleClassify = async (group: MonitoredGroup, isClientGroup: boolean) => {
    try {
      await classifyGroup(group.id, isClientGroup);
      toast({
        title: isClientGroup ? "Marcado como grupo de cliente" : "Marcado como grupo interno",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível classificar o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleToggleClientGroup = async (group: MonitoredGroup) => {
    try {
      await updateGroup(group.id, { is_client_group: !group.is_client_group });
      toast({
        title: group.is_client_group ? "Removido como grupo de cliente" : "Marcado como grupo de cliente",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o tipo do grupo.",
        variant: "destructive",
      });
    }
  };

  const pendingGroups = groups.filter(g => g.pending_classification);
  const clientGroups = groups.filter(g => !g.pending_classification && g.is_client_group);
  const internalGroups = groups.filter(g => !g.pending_classification && !g.is_client_group);
  
  const filteredPendingGroups = pendingGroups.filter(g =>
    g.name.toLowerCase().includes(pendingSearchQuery.toLowerCase())
  );
  
  const filteredClientGroups = clientGroups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(clientSearchQuery.toLowerCase());
    const matchesStatus = clientStatusFilter === "all" || 
      (clientStatusFilter === "active" && g.is_active) ||
      (clientStatusFilter === "inactive" && !g.is_active);
    return matchesSearch && matchesStatus;
  });
  
  const filteredInternalGroups = internalGroups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(internalSearchQuery.toLowerCase());
    const matchesStatus = internalStatusFilter === "all" || 
      (internalStatusFilter === "active" && g.is_active) ||
      (internalStatusFilter === "inactive" && !g.is_active);
    return matchesSearch && matchesStatus;
  });

  const headerContent = (
    <div className="flex flex-1 items-center gap-3">
      <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Grupos Monitorados</h1>
        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
          Gerencie os grupos de WhatsApp monitorados
        </p>
      </div>
    </div>
  );

  return (
    <MainLayout headerContent={headerContent}>
      <div className="space-y-6">

          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Editar Grupo
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
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

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
          <>
            {/* Client Groups Section */}
            {clientGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                      Grupos de Clientes ({filteredClientGroups.length})
                    </h2>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={clientStatusFilter} onValueChange={(v) => setClientStatusFilter(v as "all" | "active" | "inactive")}>
                      <SelectTrigger className="w-full sm:w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredClientGroups.map((group) => (
                    <Card
                      key={group.id}
                      className={`min-w-0 ${!group.is_active ? "opacity-60" : ""}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg truncate flex-1 min-w-0">{group.name}</CardTitle>
                          <div className="flex gap-1 flex-shrink-0">
                            {group.is_client_group && (
                              <Badge variant="default" className="bg-primary/80">
                                Cliente
                              </Badge>
                            )}
                            <Badge variant={group.is_active ? "secondary" : "outline"}>
                              {group.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Limite de SLA</p>
                          <p className="text-sm font-semibold">
                            {group.sla_limit_minutes} minutos
                          </p>
                        </div>
                        <div className="flex items-center justify-between py-2 border-t border-border">
                          <Label htmlFor={`client-${group.id}`} className="text-sm">
                            Grupo de Cliente
                          </Label>
                          <Switch
                            id={`client-${group.id}`}
                            checked={group.is_client_group}
                            onCheckedChange={() => handleToggleClientGroup(group)}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
              </div>
            )}

            {/* Pending Classification Section */}
            {pendingGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                      Aguardando Classificação ({filteredPendingGroups.length})
                    </h2>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar grupo..."
                      value={pendingSearchQuery}
                      onChange={(e) => setPendingSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredPendingGroups.map((group) => (
                    <Card
                      key={group.id}
                      className="min-w-0 border-amber-500/50 bg-amber-500/5"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg truncate flex-1 min-w-0">{group.name}</CardTitle>
                          <Badge variant="outline" className="flex-shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            Novo
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            Este grupo é de cliente?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleClassify(group, true)}
                              className="flex-1"
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              Sim, é cliente
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClassify(group, false)}
                              className="flex-1"
                            >
                              <UserCircle className="h-4 w-4 mr-2" />
                              Não
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/settings/groups/${group.id}/members`)}
                            title="Ver membros"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(group)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover grupo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
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
              </div>
            )}

            {/* Internal Groups Section */}
            {internalGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                      Grupos Internos ({filteredInternalGroups.length})
                    </h2>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={internalSearchQuery}
                        onChange={(e) => setInternalSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={internalStatusFilter} onValueChange={(v) => setInternalStatusFilter(v as "all" | "active" | "inactive")}>
                      <SelectTrigger className="w-full sm:w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredInternalGroups.map((group) => (
                    <Card
                      key={group.id}
                      className={`min-w-0 ${!group.is_active ? "opacity-60" : ""}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg truncate flex-1 min-w-0">{group.name}</CardTitle>
                          <Badge variant={group.is_active ? "secondary" : "outline"} className="flex-shrink-0">
                            {group.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Limite de SLA</p>
                          <p className="text-sm font-semibold">
                            {group.sla_limit_minutes} minutos
                          </p>
                        </div>
                        <div className="flex items-center justify-between py-2 border-t border-border">
                          <Label htmlFor={`client-${group.id}`} className="text-sm">
                            Grupo de Cliente
                          </Label>
                          <Switch
                            id={`client-${group.id}`}
                            checked={group.is_client_group}
                            onCheckedChange={() => handleToggleClientGroup(group)}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
