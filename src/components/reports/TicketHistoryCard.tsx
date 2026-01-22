import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ticket, TicketDemand } from "@/hooks/useTickets";

interface TicketHistoryCardProps {
  ticket: Ticket;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "border-destructive text-destructive";
    case "high":
      return "border-sla-warning text-sla-warning";
    case "normal":
      return "border-primary text-primary";
    default:
      return "border-muted-foreground text-muted-foreground";
  }
};

export function TicketHistoryCard({ ticket }: TicketHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const created = new Date(ticket.created_at);
  const resolved = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date();
  const duration = Math.round((resolved.getTime() - created.getTime()) / (1000 * 60));
  const limit = ticket.monitored_groups?.sla_limit_minutes || 30;
  
  const slaStatus = duration < limit / 2 ? "ok" : duration < limit ? "warning" : "critical";
  const hasAiAnalysis = !!ticket.ai_summary || (ticket.demands && ticket.demands.length > 0);
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">
                {ticket.monitored_groups?.name || "Grupo"}
              </p>
              {hasAiAnalysis && (
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  <Brain className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {created.toLocaleString("pt-BR")}
            </p>
            {ticket.customer_name && (
              <p className="text-sm text-muted-foreground">
                Cliente: {ticket.customer_name}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "font-mono",
                slaStatus === "ok" && "border-sla-ok text-sla-ok",
                slaStatus === "warning" && "border-sla-warning text-sla-warning",
                slaStatus === "critical" && "border-sla-critical text-sla-critical"
              )}
            >
              <Clock className="h-3 w-3 mr-1" />
              {duration}min
            </Badge>
            
            {hasAiAnalysis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8 p-0"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {ticket.ai_summary && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Resumo da IA</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ticket.ai_summary}
                </p>
              </div>
            )}
            
            {ticket.demands && ticket.demands.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Demandas Identificadas</p>
                <div className="space-y-2">
                  {ticket.demands.map((demand) => (
                    <DemandRow key={demand.id} demand={demand} />
                  ))}
                </div>
              </div>
            )}
            
            {ticket.analysis_count > 0 && (
              <p className="text-xs text-muted-foreground">
                {ticket.analysis_count} análise{ticket.analysis_count > 1 ? "s" : ""} realizada{ticket.analysis_count > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DemandRow({ demand }: { demand: TicketDemand }) {
  const isResolved = demand.status === "resolved";
  
  return (
    <div className="flex items-start gap-3 p-2 rounded-md bg-background border border-border">
      {isResolved ? (
        <CheckCircle2 className="h-4 w-4 text-sla-ok mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-sla-critical mt-0.5 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm">{demand.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={cn("text-xs", getPriorityColor(demand.priority))}>
            {demand.priority}
          </Badge>
          {isResolved && demand.resolution_time_minutes && (
            <span className="text-xs text-muted-foreground">
              Resolvido em {demand.resolution_time_minutes}min
            </span>
          )}
          {demand.sla_exceeded && (
            <Badge variant="outline" className="text-xs border-sla-critical text-sla-critical">
              SLA Estourado
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
