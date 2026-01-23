import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MessageSquare, Tag, AlertTriangle } from "lucide-react";
import { PendingDemand } from "@/hooks/usePendingDemands";

interface PendingDemandCardProps {
  demand: PendingDemand;
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

function getSlaStatus(waitingTimeMinutes: number, slaLimit: number) {
  const percentage = (waitingTimeMinutes / slaLimit) * 100;
  if (percentage >= 100) return "critical";
  if (percentage >= 75) return "warning";
  return "ok";
}

export function PendingDemandCard({ demand }: PendingDemandCardProps) {
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

  return (
    <Card className={`border-l-4 ${slaStatusStyles[slaStatus]} transition-all hover:shadow-md`}>
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
  );
}
