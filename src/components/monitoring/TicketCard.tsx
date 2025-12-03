import { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/hooks/useTickets";

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

export function TicketCard({ ticket, onResolve }: TicketCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

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

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        slaStatus === "ok" && "border-sla-ok bg-sla-ok/10",
        slaStatus === "warning" && "border-sla-warning bg-sla-warning/10",
        slaStatus === "critical" && "border-sla-critical bg-sla-critical/10 animate-sla-pulse"
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleResolve}
          disabled={isResolving}
        >
          {isResolving ? "Resolvendo..." : "Forçar Resolução"}
        </Button>
      </CardContent>
    </Card>
  );
}
