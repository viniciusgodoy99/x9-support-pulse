import { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertTriangle, Brain, ListTodo, Timer, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Ticket, TicketDemand } from "@/hooks/useTickets";

interface TicketCardProps {
  ticket: Ticket;
  onResolve: (id: string) => Promise<void>;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function getSlaStatus(waitingTimeMinutes: number, slaLimit: number) {
  if (waitingTimeMinutes < slaLimit / 2) {
    return "ok";
  }
  if (waitingTimeMinutes < slaLimit) {
    return "warning";
  }
  return "critical";
}

function DemandItem({ demand }: { demand: TicketDemand }) {
  const priorityColors = {
    low: "text-muted-foreground",
    normal: "text-foreground",
    high: "text-sla-warning",
    urgent: "text-sla-critical",
  };

  return (
    <div className="flex items-start gap-2 text-sm">
      <div className={cn(
        "mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0",
        demand.status === "resolved"
          ? "bg-sla-ok/20 text-sla-ok"
          : demand.sla_exceeded
            ? "bg-sla-critical/20 text-sla-critical"
            : "bg-muted text-muted-foreground"
      )}>
        {demand.status === "resolved" ? (
          <CheckCircle className="h-3 w-3" />
        ) : demand.sla_exceeded ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Timer className="h-3 w-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "truncate",
          demand.status === "resolved" ? "line-through text-muted-foreground" : priorityColors[demand.priority]
        )}>
          {demand.description}
        </p>
        {demand.status === "resolved" && demand.resolution_time_minutes && (
          <p className="text-xs text-muted-foreground">
            Resolvido em {demand.resolution_time_minutes}min
          </p>
        )}
        {demand.sla_exceeded && demand.status === "open" && (
          <p className="text-xs text-sla-critical font-medium">
            SLA excedido!
          </p>
        )}
      </div>
    </div>
  );
}

export function TicketCard({ ticket, onResolve }: TicketCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [showDemands, setShowDemands] = useState(false);
  const [isAiSummaryExpanded, setIsAiSummaryExpanded] = useState(true);

  useEffect(() => {
    const startTime = new Date(ticket.created_at).getTime();

    const updateTime = () => {
      setElapsedTime(Date.now() - startTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [ticket.created_at]);

  const waitingTimeMinutes = elapsedTime / (1000 * 60);
  const slaLimit = ticket.monitored_groups?.sla_limit_minutes || 30;
  const slaStatus = getSlaStatus(waitingTimeMinutes, slaLimit);

  const handleResolve = async () => {
    try {
      setIsResolving(true);
      await onResolve(ticket.id);
    } finally {
      setIsResolving(false);
    }
  };

  // Calculate demand stats
  const demands = ticket.demands || [];
  const openDemands = demands.filter(d => d.status === "open");
  const resolvedDemands = demands.filter(d => d.status === "resolved");
  const slaExceededDemands = demands.filter(d => d.sla_exceeded && d.status === "open");
  const hasAnalysis = ticket.analysis_count > 0;

  return (
    <div className={cn(
      "relative h-full",
      slaStatus === "critical" && "ice-crystal-border ice-frost-corners"
    )}>
      {slaStatus === "critical" && (
        <>
          <div className="frost-corner frost-corner-tl" />
          <div className="frost-corner frost-corner-tr" />
          <div className="frost-corner frost-corner-bl" />
          <div className="frost-corner frost-corner-br" />
        </>
      )}
      <Card
        className={cn(
          "transition-all duration-300 frosted-glass border-border/50 relative z-10 h-full flex flex-col",
          slaStatus === "ok" && "border-sla-ok/70 bg-sla-ok/15",
          slaStatus === "warning" && "border-sla-warning/70 bg-sla-warning/15",
          slaStatus === "critical" && "border-sla-critical/70 bg-sla-critical/15 animate-sla-pulse"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {ticket.monitored_groups?.name || "Grupo Desconhecido"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {ticket.customer_name || ticket.customer_phone || "Cliente"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-xs",
                  slaStatus === "ok" && "border-sla-ok text-sla-ok",
                  slaStatus === "warning" && "border-sla-warning text-sla-warning",
                  slaStatus === "critical" && "border-sla-critical text-sla-critical"
                )}
              >
                {ticket.first_response_at ? "Em Atendimento" : "Aguardando"}
              </Badge>
              {hasAnalysis && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Brain className="h-3 w-3" />
                  {ticket.analysis_count}x
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className={cn(
                "h-5 w-5",
                slaStatus === "ok" && "text-sla-ok",
                slaStatus === "warning" && "text-sla-warning",
                slaStatus === "critical" && "text-sla-critical"
              )} />
              <span className={cn(
                "text-2xl font-mono font-bold",
                slaStatus === "ok" && "text-sla-ok",
                slaStatus === "warning" && "text-sla-warning",
                slaStatus === "critical" && "text-sla-critical"
              )}>
                {formatDuration(elapsedTime)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {slaStatus === "ok" && (
                <>
                  <CheckCircle className="h-4 w-4 text-sla-ok" />
                  <span>Dentro do SLA ({slaLimit}min)</span>
                </>
              )}
              {slaStatus === "warning" && (
                <>
                  <AlertTriangle className="h-4 w-4 text-sla-warning" />
                  <span>Aproximando do limite ({slaLimit}min)</span>
                </>
              )}
              {slaStatus === "critical" && (
                <>
                  <AlertTriangle className="h-4 w-4 text-sla-critical" />
                  <span>SLA ESTOURADO! (Limite: {slaLimit}min)</span>
                </>
              )}
            </div>

            {/* AI Summary */}
            {ticket.ai_summary && (
              <div className="p-2 rounded-md bg-muted/50 border border-border/50">
                <button
                  onClick={() => setIsAiSummaryExpanded(!isAiSummaryExpanded)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors group/ai mb-1"
                  title={isAiSummaryExpanded ? "Minimizar resumo" : "Expandir resumo"}
                >
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3" />
                    <span>Resumo IA</span>
                  </div>
                  {isAiSummaryExpanded ? (
                    <ChevronUp className="h-3 w-3 opacity-50 group-hover/ai:opacity-100" />
                  ) : (
                    <ChevronDown className="h-3 w-3 opacity-50 group-hover/ai:opacity-100" />
                  )}
                </button>
                {isAiSummaryExpanded && (
                  <p className="text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    {ticket.ai_summary}
                  </p>
                )}
              </div>
            )}

            {/* Demands Section */}
            {demands.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowDemands(!showDemands)}
                  className="flex items-center justify-between w-full text-sm hover:bg-muted/50 p-1 rounded -mx-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ListTodo className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Demandas</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end ml-auto">
                    {slaExceededDemands.length > 0 && (
                      <Badge variant="destructive" className="whitespace-nowrap text-[10px] sm:text-xs px-1 sm:px-2">
                        {slaExceededDemands.length} SLA!
                      </Badge>
                    )}
                    <Badge variant="outline" className="whitespace-nowrap text-[10px] sm:text-xs px-1 sm:px-2">
                      {openDemands.length} / {resolvedDemands.length}
                    </Badge>
                  </div>
                </button>

                {showDemands && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    {demands.map(demand => (
                      <DemandItem key={demand.id} demand={demand} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next Analysis Indicator */}
            {ticket.next_analysis_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Brain className="h-3 w-3" />
                <span>
                  Próxima análise: {new Date(ticket.next_analysis_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={handleResolve}
            disabled={isResolving}
          >
            {isResolving ? "Resolvendo..." : "Forçar Resolução"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
