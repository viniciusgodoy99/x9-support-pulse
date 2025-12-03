import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroupMembers, GroupMemberRole } from "@/hooks/useGroupMembers";
import { useGroups } from "@/hooks/useGroups";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  User,
  Phone,
  Shield,
  Users,
  Loader2,
  Edit2,
  Check,
  X,
} from "lucide-react";

const roleLabels: Record<GroupMemberRole, string> = {
  cs: "CS (Atendimento)",
  client: "Cliente",
  traffic_manager: "Gestor de Tráfego",
  unknown: "Não definido",
};

const roleColors: Record<GroupMemberRole, string> = {
  cs: "bg-primary/20 text-primary border-primary/30",
  client: "bg-accent/20 text-accent-foreground border-accent/30",
  traffic_manager: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  unknown: "bg-muted/50 text-muted-foreground border-muted",
};

export default function GroupMembers() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups } = useGroups();
  const { members, loading, updateMemberRole, updateMemberName, syncFromEvolution } =
    useGroupMembers(groupId);

  const [syncing, setSyncing] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const group = groups.find((g) => g.id === groupId);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncFromEvolution();
      toast.success(`Sincronizado: ${result.added} novos, ${result.updated} atualizados`);
    } catch (err) {
      toast.error("Erro ao sincronizar participantes");
    } finally {
      setSyncing(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: GroupMemberRole) => {
    try {
      await updateMemberRole(memberId, role);
      toast.success("Função atualizada");
    } catch (err) {
      toast.error("Erro ao atualizar função");
    }
  };

  const handleStartEditName = (memberId: string, currentName: string | null) => {
    setEditingName(memberId);
    setTempName(currentName || "");
  };

  const handleSaveName = async (memberId: string) => {
    try {
      await updateMemberName(memberId, tempName);
      setEditingName(null);
      toast.success("Nome atualizado");
    } catch (err) {
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleCancelEditName = () => {
    setEditingName(null);
    setTempName("");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings/groups")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Membros do Grupo
              </h1>
              {group && (
                <p className="text-muted-foreground">{group.name}</p>
              )}
            </div>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {members.filter((m) => m.role === "cs").length}
                  </p>
                  <p className="text-xs text-muted-foreground">CS</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold">
                    {members.filter((m) => m.role === "client").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">
                    {members.filter((m) => m.role === "unknown").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Não definido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum membro encontrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Clique em "Sincronizar" para buscar os participantes do grupo
              </p>
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {members.map((member) => (
              <Card
                key={member.id}
                className="bg-card/50 backdrop-blur border-border/50 hover:bg-card/70 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingName === member.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="h-8 w-48"
                              placeholder="Nome do membro"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleSaveName(member.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleCancelEditName}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">
                              {member.name || "Sem nome"}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() =>
                                handleStartEditName(member.id, member.name)
                              }
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone_number}</span>
                          {member.is_admin && (
                            <Badge variant="outline" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Select
                      value={member.role}
                      onValueChange={(value: GroupMemberRole) =>
                        handleRoleChange(member.id, value)
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cs">CS (Atendimento)</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="traffic_manager">
                          Gestor de Tráfego
                        </SelectItem>
                        <SelectItem value="unknown">Não definido</SelectItem>
                      </SelectContent>
                    </Select>
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
