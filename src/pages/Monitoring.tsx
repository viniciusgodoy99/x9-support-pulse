import { Radio, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/MainLayout";
import { TicketCard } from "@/components/monitoring/TicketCard";
import { useTickets } from "@/hooks/useTickets";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function Monitoring() {
  const { tickets, loading, refetch, resolveTicket } = useTickets("open");

  const handleResolve = async (ticketId: string) => {
    try {
      await resolveTicket(ticketId);
      toast({
        title: "Ticket resolvido",
        description: "O ticket foi marcado como resolvido com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível resolver o ticket.",
        variant: "destructive",
      });
    }
  };

  const headerContent = (
    <div className="flex flex-1 items-center gap-3">
      <Radio className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Monitoramento</h1>
        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
          Acompanhe os tickets abertos e tempos de resposta
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
            <Radio className="h-5 w-5" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{tickets.length}</span> tickets abertos
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Atualizar lista de tickets</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Radio className="h-16 w-16 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Nenhum ticket aberto</h2>
            <p>Todos os clientes foram atendidos! 🎉</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
