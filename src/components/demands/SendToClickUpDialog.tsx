import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useClickUp } from "@/hooks/useClickUp";
import { useToast } from "@/hooks/use-toast";
import { PendingDemand } from "@/hooks/usePendingDemands";
import { ExternalLink, Loader2, Send, Calendar } from "lucide-react";

interface SendToClickUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand: PendingDemand;
}

const priorityMap: Record<string, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export function SendToClickUpDialog({ open, onOpenChange, demand }: SendToClickUpDialogProps) {
  const { toast } = useToast();
  const {
    teams, spaces, folders, lists, members,
    loading, error,
    fetchTeams, fetchSpaces, fetchFolders, fetchLists, fetchMembers,
    createTask,
  } = useClickUp();

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sending, setSending] = useState(false);
  const [taskUrl, setTaskUrl] = useState<string | null>(null);

  // Initialize fields when dialog opens
  useEffect(() => {
    if (open) {
      setTaskName(`[${demand.group_name}] ${demand.description.slice(0, 100)}`);
      setTaskDescription(
        `**Demanda do Sistema X9**\n\n` +
        `**Grupo:** ${demand.group_name}\n` +
        `**Cliente:** ${demand.customer_name || "Não identificado"}\n` +
        `**Telefone:** ${demand.customer_phone || "—"}\n` +
        `**Categoria:** ${demand.category}\n` +
        `**Prioridade:** ${demand.priority}\n` +
        `**Criado em:** ${new Date(demand.created_at).toLocaleString("pt-BR")}\n\n` +
        `**Descrição:**\n${demand.description}`
      );
      setTaskUrl(null);
      setSelectedTeam("");
      setSelectedSpace("");
      setSelectedFolder("");
      setSelectedList("");
      setSelectedAssignees([]);
      setDueDate("");
      fetchTeams();
    }
  }, [open, demand]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedSpace("");
    setSelectedFolder("");
    setSelectedList("");
    setSelectedAssignees([]);
    fetchSpaces(teamId);
  };

  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpace(spaceId);
    setSelectedFolder("");
    setSelectedList("");
    setSelectedAssignees([]);
    fetchFolders(spaceId);
    fetchLists(spaceId);
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedList("");
    setSelectedAssignees([]);
    if (folderId === "__none__") {
      fetchLists(selectedSpace);
    } else {
      fetchLists(selectedSpace, folderId);
    }
  };

  const handleListChange = (listId: string) => {
    setSelectedList(listId);
    setSelectedAssignees([]);
    fetchMembers(listId);
  };

  const toggleAssignee = (id: number) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!selectedList || !taskName.trim()) return;

    setSending(true);
    try {
      const result = await createTask({
        list_id: selectedList,
        name: taskName,
        description: taskDescription,
        priority: priorityMap[demand.priority] || 3,
        assignees: selectedAssignees,
        due_date: dueDate ? new Date(dueDate).getTime() : undefined,
        tags: [demand.category],
      });

      setTaskUrl(result.url);
      toast({
        title: "Tarefa criada no ClickUp!",
        description: `Tarefa "${taskName}" criada com sucesso.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar para ClickUp
          </DialogTitle>
        </DialogHeader>

        {taskUrl ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-4">
              <ExternalLink className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Tarefa criada com sucesso!</h3>
            <a
              href={taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-sm"
            >
              Abrir no ClickUp
            </a>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Task Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da Tarefa</label>
              <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} />
            </div>

            {/* Hierarchy Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Destino no ClickUp</label>

              <Select value={selectedTeam} onValueChange={handleTeamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Workspace" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTeam && (
                <Select value={selectedSpace} onValueChange={handleSpaceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Space" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedSpace && folders.length > 0 && (
                <Select value={selectedFolder} onValueChange={handleFolderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Pasta (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem pasta (folderless)</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedSpace && (
                <Select value={selectedList} onValueChange={handleListChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Lista" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Assignees */}
            {selectedList && members.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsáveis</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`assignee-${m.id}`}
                          checked={selectedAssignees.includes(m.id)}
                          onCheckedChange={() => toggleAssignee(m.id)}
                        />
                        <label htmlFor={`assignee-${m.id}`} className="text-sm cursor-pointer truncate">
                          {m.username || m.email}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedAssignees.map((id) => {
                        const m = members.find((mm) => mm.id === id);
                        return m ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {m.username || m.email}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Data de Entrega (opcional)
              </label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={5}
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedList || !taskName.trim() || sending || loading}
                className="gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
