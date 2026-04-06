import { useState } from "react";
import { Users, Plus, Trash2, Edit2, Power } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { toast } from "@/hooks/use-toast";

const roleLabels: Record<TeamMember["role"], string> = {
  CS: "Customer Success",
  Manager: "Gerente",
  Support: "Suporte",
  Admin: "Administrador",
  PerformanceManager: "Gestor de Performance",
  CRMManager: "Gestor de CRM/IFOOD",
  SocialMedia: "Social Media",
  ClientTeam: "Equipe Cliente",
  Leader: "Líder",
};

export default function TeamSettings() {
  const { members, loading, addMember, updateMember, deleteMember } = useTeamMembers();
  const [isOpen, setIsOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    role: "CS" as TeamMember["role"],
  });

  const resetForm = () => {
    setFormData({ name: "", phone_number: "", role: "CS" });
    setEditingMember(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await updateMember(editingMember.id, formData);
        toast({ title: "Membro atualizado com sucesso!" });
      } else {
        await addMember(formData);
        toast({ title: "Membro adicionado com sucesso!" });
      }
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o membro.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone_number: member.phone_number,
      role: member.role,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMember(id);
      toast({ title: "Membro removido com sucesso!" });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o membro.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await updateMember(member.id, { is_active: !member.is_active });
      toast({
        title: member.is_active ? "Membro desativado" : "Membro ativado",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do membro.",
        variant: "destructive",
      });
    }
  };

  const headerContent = (
    <div className="flex flex-1 items-center gap-3">
      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Equipe</h1>
        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
          Gerencie os membros da equipe de atendimento
        </p>
      </div>
    </div>
  );

  return (
    <MainLayout headerContent={headerContent}>
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{members.length}</span> membros
            </span>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Membro
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Editar Membro" : "Adicionar Novo Membro"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (apenas números)</Label>
                  <Input
                    id="phone"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone_number: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="Ex: 5511999999999"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para identificar mensagens da equipe
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value as TeamMember["role"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CS">Customer Success</SelectItem>
                      <SelectItem value="Support">Suporte</SelectItem>
                      <SelectItem value="Manager">Gerente</SelectItem>
                      <SelectItem value="Admin">Administrador</SelectItem>
                      <SelectItem value="PerformanceManager">Gestor de Performance</SelectItem>
                      <SelectItem value="CRMManager">Gestor de CRM/IFOOD</SelectItem>
                      <SelectItem value="SocialMedia">Social Media</SelectItem>
                      <SelectItem value="ClientTeam">Equipe Cliente</SelectItem>
                      <SelectItem value="Leader">Líder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit">
                    {editingMember ? "Salvar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-16 w-16 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Nenhum membro cadastrado</h2>
              <p>Adicione membros da equipe para identificar respostas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Card
                key={member.id}
                className={!member.is_active ? "opacity-60" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-mono">{member.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Função</p>
                    <Badge variant="outline">{roleLabels[member.role]}</Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar membro</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(member)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{member.is_active ? "Desativar" : "Ativar"}</p>
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
                                <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(member.id)}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remover membro</p>
                      </TooltipContent>
                    </Tooltip>
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
