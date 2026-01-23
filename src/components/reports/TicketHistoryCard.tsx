import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, Tag, Eye, User, Phone, Calendar, Timer, FileText, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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

const categoryConfig: Record<string, { label: string; className: string }> = {
  duvida: { label: "Dúvida", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  solicitacao: { label: "Solicitação", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  reclamacao: { label: "Reclamação", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  agendamento: { label: "Agendamento", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  suporte_tecnico: { label: "Suporte Técnico", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  financeiro: { label: "Financeiro", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  feedback: { label: "Feedback", className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  geral: { label: "Geral", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
};

export function TicketHistoryCard({ ticket }: TicketHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const created = new Date(ticket.created_at);
  const resolved = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date();
  const duration = Math.round((resolved.getTime() - created.getTime()) / (1000 * 60));
  const limit = ticket.monitored_groups?.sla_limit_minutes || 30;
  
  const slaStatus = duration < limit / 2 ? "ok" : duration < limit ? "warning" : "critical";
  const hasAiAnalysis = !!ticket.ai_summary || (ticket.demands && ticket.demands.length > 0);
  
  // Get unique categories from demands
  const uniqueCategories = ticket.demands 
    ? [...new Set(ticket.demands.map(d => d.category || "geral"))]
    : [];
  
  return (
    <>
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
            {uniqueCategories.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {uniqueCategories.map((cat) => {
                  const config = categoryConfig[cat] || categoryConfig.geral;
                  return (
                    <Badge
                      key={cat}
                      variant="outline"
                      className={cn("text-xs", config.className)}
                    >
                      {config.label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
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
        
        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 gap-1.5"
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
    
    {/* Modal de Detalhes */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Atendimento
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Gerais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Grupo:</span>{" "}
                  <span className="font-medium">{ticket.monitored_groups?.name || "N/A"}</span>
                </span>
              </div>
              {ticket.customer_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Cliente:</span>{" "}
                    <span className="font-medium">{ticket.customer_name}</span>
                  </span>
                </div>
              )}
              {ticket.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Telefone:</span>{" "}
                    <span className="font-medium">{ticket.customer_phone}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Criado em:</span>{" "}
                  <span className="font-medium">{created.toLocaleString("pt-BR")}</span>
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sla-ok" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Resolvido em:</span>{" "}
                    <span className="font-medium">{resolved.toLocaleString("pt-BR")}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Tempo de Atendimento:</span>{" "}
                  <span className="font-medium">{duration} minutos</span>
                </span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* SLA */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              SLA
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Limite:</span>{" "}
                <span className="font-medium">{limit} minutos</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-medium",
                  slaStatus === "ok" && "border-sla-ok text-sla-ok bg-sla-ok/10",
                  slaStatus === "warning" && "border-sla-warning text-sla-warning bg-sla-warning/10",
                  slaStatus === "critical" && "border-sla-critical text-sla-critical bg-sla-critical/10"
                )}
              >
                {slaStatus === "ok" && "✓ Dentro do SLA"}
                {slaStatus === "warning" && "⚠ Alerta"}
                {slaStatus === "critical" && "✕ SLA Estourado"}
              </Badge>
            </div>
          </div>
          
          {/* Resumo da IA */}
          {ticket.ai_summary && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Resumo da IA
                </h3>
                <p className="text-sm bg-muted/50 p-4 rounded-lg">
                  {ticket.ai_summary}
                </p>
                {ticket.analysis_count > 0 && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{ticket.analysis_count} análise{ticket.analysis_count > 1 ? "s" : ""} realizada{ticket.analysis_count > 1 ? "s" : ""}</span>
                    {ticket.last_analysis_at && (
                      <span>Última análise: {new Date(ticket.last_analysis_at).toLocaleString("pt-BR")}</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Demandas */}
          {ticket.demands && ticket.demands.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Demandas Identificadas ({ticket.demands.length})
                </h3>
                <div className="space-y-2">
                  {ticket.demands.map((demand) => (
                    <DemandRow key={demand.id} demand={demand} />
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Notas */}
          {ticket.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Notas
                </h3>
                <p className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                  {ticket.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
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
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className={cn("text-xs", getPriorityColor(demand.priority))}>
            {demand.priority}
          </Badge>
          {demand.category && categoryConfig[demand.category] && (
            <Badge variant="outline" className={cn("text-xs", categoryConfig[demand.category].className)}>
              {categoryConfig[demand.category].label}
            </Badge>
          )}
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
