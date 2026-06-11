import { Radio, RefreshCw, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/MainLayout";
import { TicketCard } from "@/components/monitoring/TicketCard";
import { useTickets } from "@/hooks/useTickets";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandFilter } from "@/components/filters/BrandFilter";

export default function Monitoring() {
  const { tickets, loading, refetch, resolveTicket } = useTickets("open");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  const sortedTickets = useMemo(() => {
    let filtered = [...tickets];

    if (selectedBrand !== "all") {
      filtered = filtered.filter((t) => {
        const groupName = (t.monitored_groups?.name || "").toLowerCase();
        return groupName.includes(selectedBrand);
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [tickets, sortOrder, selectedBrand]);

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
      <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Monitoramento</h1>
        <p className="text-muted-foreground text-[10px] sm:text-xs hidden sm:block font-medium">
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
              <span className="font-semibold text-foreground">{sortedTickets.length}</span> tickets abertos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BrandFilter value={selectedBrand} onChange={setSelectedBrand} />
            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger className="w-[180px] h-9">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Mais Antigo (SLA)</SelectItem>
                <SelectItem value="desc">Mais Recente</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="h-9"
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
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Radio className="h-16 w-16 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Nenhum ticket aberto</h2>
            <p>Todos os clientes foram atendidos! 🎉</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {sortedTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onResolve={handleResolve}
                onDemandDeleted={() => refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
