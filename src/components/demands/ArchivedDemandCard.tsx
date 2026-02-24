import { useState } from "react";
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
import { User, MessageSquare, Tag, Calendar, Phone, FileText, RotateCcw, Archive } from "lucide-react";
import { PendingDemand } from "@/hooks/usePendingDemands";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArchivedDemandCardProps {
  demand: PendingDemand;
  onRestored?: () => void;
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

export function ArchivedDemandCard({ demand, onRestored }: ArchivedDemandCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();

  const priority = priorityConfig[demand.priority] || priorityConfig.normal;
  const category = categoryConfig[demand.category] || categoryConfig.geral;

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const { error } = await supabase
        .from("ticket_demands")
        .update({ status: "open" })
        .eq("id", demand.id);

      if (error) throw error;

      toast({
        title: "Demanda reaberta",
        description: "A demanda foi restaurada para a lista de pendentes.",
      });
      setIsModalOpen(false);
      onRestored?.();
    } catch (err: any) {
      toast({
        title: "Erro ao restaurar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Card
        className="border-l-4 border-l-muted-foreground/30 opacity-80 transition-all hover:opacity-100 hover:shadow-md cursor-pointer"
        onClick={() => setIsModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsModalOpen(true);
          }
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium leading-tight line-clamp-2 text-muted-foreground">
              {demand.description}
            </CardTitle>
            <div className="flex gap-1.5 flex-shrink-0">
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Archive className="h-3 w-3" />
                Fechada
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
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
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge className={category.className} variant="secondary">
              {category.label}
            </Badge>
            <Badge className={priority.className} variant="secondary">
              {priority.label}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Criada em {format(new Date(demand.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Demanda Arquivada
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-5">
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

            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isRestoring}>
                    <RotateCcw className="h-4 w-4" />
                    Reabrir Demanda
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reabrir demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta demanda será restaurada para a lista de pendentes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
                      {isRestoring ? "Restaurando..." : "Confirmar"}
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
