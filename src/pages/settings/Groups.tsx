import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Trash2, Edit2, Power, Users, AlertCircle, Building2, UserCircle, Search, Filter, Archive, RotateCcw, Clock } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
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
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGroups, type MonitoredGroup } from "@/hooks/useGroups";
import { toast } from "@/hooks/use-toast";

export default function GroupsSettings() {
  const navigate = useNavigate();
  const { 
    groups, 
    archivedGroups,
    loading, 
    loadingArchived,
    addGroup,
    updateGroup, 
    classifyGroup, 
    archiveGroup,
    restoreGroup,
    deleteGroup,
    fetchArchivedGroups 
  } = useGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);
  const [groupToSwitch, setGroupToSwitch] = useState<MonitoredGroup | null>(null);
  const [editingGroup, setEditingGroup] = useState<MonitoredGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    whatsapp_id: "",
    sla_limit_minutes: 30,
  });
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [pendingDaysFilter, setPendingDaysFilter] = useState<"all" | "urgent" | "1-3" | "4-7">("all");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("");

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

  const handleRequestSwitch = (group: MonitoredGroup) => {
    setGroupToSwitch(group);
  };

  const handleConfirmSwitch = async () => {
    if (!groupToSwitch) return;
    
    try {
      await updateGroup(groupToSwitch.id, { is_client_group: !groupToSwitch.is_client_group });
      toast({
        title: groupToSwitch.is_client_group ? "Removido como grupo de cliente" : "Marcado como grupo de cliente",
      });
      setGroupToSwitch(null);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o tipo do grupo.",
        variant: "destructive",
      });
    }
  };

  const getDaysUntilArchive = (createdAt: string) => {
    const created = new Date(createdAt);
    const archiveDate = addDays(created, 7);
    const daysLeft = differenceInDays(archiveDate, new Date());
    return Math.max(0, daysLeft);
  };

  const pendingGroups = groups.filter(g => g.pending_classification);
  const clientGroups = groups.filter(g => !g.pending_classification && g.is_client_group);
  const internalGroups = groups.filter(g => !g.pending_classification && !g.is_client_group);
  
  const filteredPendingGroups = pendingGroups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(pendingSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (pendingDaysFilter === "all") return true;
    
    const daysLeft = getDaysUntilArchive(g.created_at);
    
    switch (pendingDaysFilter) {
      case "urgent":
        return daysLeft <= 1;
      case "1-3":
        return daysLeft >= 1 && daysLeft <= 3;
      case "4-7":
        return daysLeft >= 4 && daysLeft <= 7;
      default:
        return true;
    }
  });
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

  const handleOpenArchivedDialog = async () => {
    await fetchArchivedGroups();
    setShowArchivedDialog(true);
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreGroup(id);
      toast({ title: "Grupo restaurado com sucesso!" });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível restaurar o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveGroup(id);
      toast({ title: "Grupo arquivado com sucesso!" });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar o grupo.",
        variant: "destructive",
      });
    }
  };

  const headerContent = (
    <div className="flex flex-1 items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Grupos Monitorados</h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            Gerencie os grupos de WhatsApp monitorados
          </p>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" onClick={handleOpenArchivedDialog}>
            <Archive className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Arquivados</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver grupos arquivados</p>
        </TooltipContent>
      </Tooltip>
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

          {/* Archived Groups Dialog */}
          <Dialog open={showArchivedDialog} onOpenChange={(open) => {
            setShowArchivedDialog(open);
            if (!open) setArchivedSearchQuery("");
          }}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Grupos Arquivados
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Grupos que ficaram mais de 7 dias sem classificação. Você pode restaurá-los para o painel de classificação.
                </DialogDescription>
              </DialogHeader>
              
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar grupo..."
                  value={archivedSearchQuery}
                  onChange={(e) => setArchivedSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0">
                {(() => {
                  const filteredArchivedGroups = archivedGroups.filter(g =>
                    g.name.toLowerCase().includes(archivedSearchQuery.toLowerCase())
                  );
                  
                  if (loadingArchived) {
                    return (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    );
                  }
                  
                  if (archivedGroups.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum grupo arquivado</p>
                      </div>
                    );
                  }
                  
                  if (filteredArchivedGroups.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Nenhum grupo encontrado para "{archivedSearchQuery}"</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3 py-1">
                      {filteredArchivedGroups.map((group) => (
                        <Card key={group.id}>
                          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm sm:text-base">{group.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Arquivado em {group.archived_at ? format(new Date(group.archived_at), "dd/MM/yyyy 'às' HH:mm") : "Data desconhecida"}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" onClick={() => handleRestore(group.id)} className="flex-1 sm:flex-none">
                                    <RotateCcw className="h-4 w-4 mr-2 sm:mr-2" />
                                    <span>Restaurar</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Restaurar grupo</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="w-[95vw] max-w-md">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remover grupo permanentemente?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Todos os dados associados a este grupo serão removidos.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDelete(group.id)} className="w-full sm:w-auto">
                                            Remover
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remover permanentemente</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>

          {/* Switch Group Type Confirmation Dialog */}
          <AlertDialog open={!!groupToSwitch} onOpenChange={(open) => !open && setGroupToSwitch(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Alterar tipo do grupo?</AlertDialogTitle>
                <AlertDialogDescription>
                  {groupToSwitch?.is_client_group ? (
                    <>
                      Ao marcar como <strong>grupo interno</strong>, este grupo deixará de gerar demandas e métricas de SLA. 
                      Demandas abertas serão fechadas automaticamente.
                    </>
                  ) : (
                    <>
                      Ao marcar como <strong>grupo de cliente</strong>, este grupo passará a gerar tickets e demandas. 
                      Novas mensagens serão monitoradas para SLA.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSwitch}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CardTitle className="text-lg truncate flex-1 min-w-0 cursor-default">{group.name}</CardTitle>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{group.name}</p>
                            </TooltipContent>
                          </Tooltip>
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
                            onCheckedChange={() => handleRequestSwitch(group)}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/settings/groups/${group.id}/members`)}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerenciar membros</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(group)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar grupo</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(group)}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{group.is_active ? "Desativar" : "Ativar"}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
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
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remover grupo</p>
                            </TooltipContent>
                          </Tooltip>
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
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar grupo..."
                        value={pendingSearchQuery}
                        onChange={(e) => setPendingSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={pendingDaysFilter} onValueChange={(value: "all" | "urgent" | "1-3" | "4-7") => setPendingDaysFilter(value)}>
                      <SelectTrigger className="w-full sm:w-44">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Dias para arquivar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os grupos</SelectItem>
                        <SelectItem value="urgent">Urgente (menos de 24h)</SelectItem>
                        <SelectItem value="1-3">1 a 3 dias</SelectItem>
                        <SelectItem value="4-7">4 a 7 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredPendingGroups.map((group) => {
                    const daysLeft = getDaysUntilArchive(group.created_at);
                    const isUrgent = daysLeft <= 1;
                    
                    return (
                      <Card
                        key={group.id}
                        className={`min-w-0 overflow-hidden transition-all ${
                          isUrgent 
                            ? "border-destructive/70 bg-destructive/5 animate-pulse" 
                            : "border-amber-500/50 bg-amber-500/5"
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CardTitle className="text-lg truncate flex-1 min-w-0 cursor-default">{group.name}</CardTitle>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{group.name}</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {isUrgent ? (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Urgente
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  Novo
                                </Badge>
                              )}
                              <span className={`text-xs ${isUrgent ? "text-destructive font-medium" : "text-amber-600"}`}>
                                {isUrgent 
                                  ? "Arquiva em menos de 24h!" 
                                  : `Arquiva em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`
                                }
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                      <CardContent className="space-y-4 overflow-hidden">
                        <div className="pt-2 space-y-3">
                          <div className="flex items-center justify-between py-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <Label htmlFor={`client-pending-${group.id}`} className="text-sm cursor-pointer">
                                Grupo de Cliente
                              </Label>
                            </div>
                            <Switch
                              id={`client-pending-${group.id}`}
                              checked={false}
                              onCheckedChange={(checked) => handleClassify(group, checked)}
                            />
                          </div>
                          <div className="flex items-center justify-between py-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4 text-muted-foreground" />
                              <Label htmlFor={`internal-pending-${group.id}`} className="text-sm cursor-pointer">
                                Grupo Interno
                              </Label>
                            </div>
                            <Switch
                              id={`internal-pending-${group.id}`}
                              checked={false}
                              onCheckedChange={(checked) => handleClassify(group, !checked)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Ative uma das opções para classificar o grupo
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/settings/groups/${group.id}/members`)}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver membros</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(group)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar grupo</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
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
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remover grupo</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CardTitle className="text-lg truncate flex-1 min-w-0 cursor-default">{group.name}</CardTitle>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{group.name}</p>
                            </TooltipContent>
                          </Tooltip>
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
                            onCheckedChange={() => handleRequestSwitch(group)}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/settings/groups/${group.id}/members`)}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerenciar membros</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(group)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar grupo</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(group)}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{group.is_active ? "Desativar" : "Ativar"}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
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
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remover grupo</p>
                            </TooltipContent>
                          </Tooltip>
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
