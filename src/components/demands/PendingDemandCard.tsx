import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import { Clock, User, MessageSquare, Tag, AlertTriangle, Calendar, Phone, FileText, Timer, Archive, Send } from "lucide-react";
import { PendingDemand } from "@/hooks/usePendingDemands";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SendToClickUpDialog } from "@/components/demands/SendToClickUpDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingDemandCardProps {
  demand: PendingDemand;
  onArchived?: () => void;
  onDeleted?: () => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgente", className: "bg-destructive text-destructive-foreground" },
  high: { label: "Alta", className: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
  normal: { label: "Normal", className: "bg-primary/20 text-primary" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
};

const categoryConfig: Record<string, { label: string; className: string }> = {
  duvida: { label: "Dúvida", className: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  solicitacao: { label: "Solicitação", className: "bg-green-500/20 text-green-700 dark:text-green-400" },
  reclamacao: { label: "Reclamação", className: "bg-red-500/20 text-red-700 dark:text-red-400" },
  agendamento: { label: "Agendamento", className: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
  suporte_tecnico: { label: "Suporte Técnico", className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
  financeiro: { label: "Financeiro", className: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  feedback: { label: "Feedback", className: "bg-pink-500/20 text-pink-700 dark:text-pink-400" },
  geral: { label: "Geral", className: "bg-muted text-muted-foreground" },
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatDurationDetailed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getSlaStatus(waitingTimeMinutes: number, slaLimit: number) {
  const percentage = (waitingTimeMinutes / slaLimit) * 100;
  if (percentage >= 100) return "critical";
  if (percentage >= 75) return "warning";
  return "ok";
}

function getSlaPercentage(waitingTimeMinutes: number, slaLimit: number) {
  return Math.min((waitingTimeMinutes / slaLimit) * 100, 100);
}

export function PendingDemandCard({ demand, onArchived, onDeleted }: PendingDemandCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClickUpOpen, setIsClickUpOpen] = useState(false);
  const { toast } = useToast();
  const [elapsedTime, setElapsedTime] = useState(
    Date.now() - new Date(demand.created_at).getTime()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - new Date(demand.created_at).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [demand.created_at]);

  const waitingTimeMinutes = Math.floor(elapsedTime / 60000);
  const slaStatus = getSlaStatus(waitingTimeMinutes, demand.sla_limit_minutes);
  const slaPercentage = getSlaPercentage(waitingTimeMinutes, demand.sla_limit_minutes);
  const priority = priorityConfig[demand.priority] || priorityConfig.normal;
  const category = categoryConfig[demand.category] || categoryConfig.geral;

  const slaStatusStyles = {
    ok: "border-l-primary",
    warning: "border-l-yellow-500",
    critical: "border-l-destructive",
  };

  const slaTimeStyles = {
    ok: "text-primary",
    warning: "text-yellow-600 dark:text-yellow-400",
    critical: "text-destructive",
  };

  const slaProgressStyles = {
    ok: "bg-primary",
    warning: "bg-yellow-500",
    critical: "bg-destructive",
  };

  const slaStatusLabels = {
    ok: { label: "Dentro do SLA", className: "bg-primary/20 text-primary" },
    warning: { label: "SLA em Risco", className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
    critical: { label: "SLA Excedido", className: "bg-destructive/20 text-destructive" },
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      const { error } = await supabase
        .from("ticket_demands")
        .update({ status: "closed" })
        .eq("id", demand.id);

      if (error) throw error;

      toast({
        title: "Demanda arquivada",
        description: "A demanda foi marcada como fechada e arquivada.",
      });
      setIsModalOpen(false);
      onArchived?.();
    } catch (err: any) {
      toast({
        title: "Erro ao arquivar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <Card
        className={`border-l-4 ${slaStatusStyles[slaStatus]} transition-all hover:shadow-lg sm:hover:scale-[1.02] cursor-pointer`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
              {demand.description}
            </CardTitle>
            <div className="flex gap-1.5 flex-shrink-0">
              <Badge className={priority.className} variant="secondary">
                {priority.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Group and Customer */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="truncate max-w-[150px]">{demand.group_name}</span>
            </div>
            {demand.customer_name && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{demand.customer_name}</span>
              </div>
            )}
          </div>

          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge className={category.className} variant="secondary">
              {category.label}
            </Badge>
          </div>

          {/* Waiting Time */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Clock className={`h-4 w-4 ${slaTimeStyles[slaStatus]}`} />
              <span className={`text-sm font-medium ${slaTimeStyles[slaStatus]}`}>
                {formatDuration(elapsedTime)} aguardando
              </span>
            </div>
            {slaStatus === "critical" && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">SLA excedido</span>
              </div>
            )}
            {slaStatus === "warning" && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                SLA em risco
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes da Demanda
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5">
            {/* General Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informações Gerais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Grupo</p>
                    <p className="text-sm font-medium truncate">{demand.group_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-medium truncate">
                      {demand.customer_name || "Não identificado"}
                    </p>
                  </div>
                </div>
                {demand.customer_phone && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm font-medium">{demand.customer_phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm font-medium">
                      {format(new Date(demand.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Classification */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Classificação
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge className={priority.className} variant="secondary">
                  Prioridade: {priority.label}
                </Badge>
                <Badge className={category.className} variant="secondary">
                  {category.label}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Full Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Descrição
              </h3>
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {demand.description}
                </p>
              </div>
            </div>

            <Separator />

            {/* SLA Status */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Status do SLA
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Timer className={`h-4 w-4 mt-0.5 ${slaTimeStyles[slaStatus]}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo aguardando</p>
                      <p className={`text-sm font-semibold ${slaTimeStyles[slaStatus]}`}>
                        {formatDurationDetailed(elapsedTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Limite SLA</p>
                      <p className="text-sm font-semibold">{demand.sla_limit_minutes} minutos</p>
                    </div>
                  </div>
                </div>

                {/* SLA Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={slaStatusLabels[slaStatus].className} variant="secondary">
                      {slaStatusLabels[slaStatus].label}
                    </Badge>
                    <span className={`text-sm font-medium ${slaTimeStyles[slaStatus]}`}>
                      {Math.round(slaPercentage)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full transition-all ${slaProgressStyles[slaStatus]}`}
                      style={{ width: `${slaPercentage}%` }}
                    />
                  </div>
                </div>

                {slaStatus === "critical" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">
                      O tempo de SLA foi excedido. Esta demanda requer atenção imediata.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Actions */}
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsClickUpOpen(true);
                }}
              >
                <Send className="h-4 w-4" />
                ClickUp
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 flex-1" disabled={isArchiving}>
                    <Archive className="h-4 w-4" />
                    Arquivar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta demanda será marcada como fechada e removida da lista de pendentes.
                      Você poderá visualizá-la na aba de demandas arquivadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
                      {isArchiving ? "Arquivando..." : "Confirmar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2 flex-1" disabled={isDeleting}>
                    <AlertTriangle className="h-4 w-4" />
                    Encerrar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar demanda permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A demanda será excluída permanentemente do sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          setIsDeleting(true);
                          const { error } = await supabase
                            .from("ticket_demands")
                            .delete()
                            .eq("id", demand.id);
                          if (error) throw error;
                          toast({
                            title: "Demanda encerrada",
                            description: "A demanda foi excluída permanentemente.",
                          });
                          setIsModalOpen(false);
                          onDeleted?.();
                          onArchived?.();
                        } catch (err: any) {
                          toast({
                            title: "Erro ao encerrar",
                            description: err.message,
                            variant: "destructive",
                          });
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Excluindo..." : "Excluir Permanentemente"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
