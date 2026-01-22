import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TicketDemand {
  id: string;
  ticket_id: string;
  description: string;
  status: "open" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  resolved_at: string | null;
  resolution_time_minutes: number | null;
  sla_exceeded: boolean;
}

export interface Ticket {
  id: string;
  group_id: string;
  status: "open" | "resolved";
  customer_phone: string | null;
  customer_name: string | null;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  sentiment: string | null;
  notes: string | null;
  next_analysis_at: string | null;
  last_analysis_at: string | null;
  analysis_count: number;
  ai_summary: string | null;
  monitored_groups?: {
    id: string;
    name: string;
    whatsapp_id: string;
    sla_limit_minutes: number;
  };
  demands?: TicketDemand[];
}

export function useTickets(status?: "open" | "resolved") {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("tickets")
        .select(`
          *,
          monitored_groups (
            id,
            name,
            whatsapp_id,
            sla_limit_minutes
          )
        `)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      // Fetch demands for each ticket
      const ticketIds = ticketsData?.map(t => t.id) || [];
      
      let demands: TicketDemand[] = [];
      if (ticketIds.length > 0) {
        const { data: demandsData, error: demandsError } = await supabase
          .from("ticket_demands")
          .select("*")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: true });
        
        if (demandsError) {
          console.error("Error fetching demands:", demandsError);
        } else {
          demands = (demandsData || []) as TicketDemand[];
        }
      }

      // Attach demands to tickets
      const ticketsWithDemands = ticketsData?.map(ticket => ({
        ...ticket,
        demands: demands.filter(d => d.ticket_id === ticket.id),
      })) as Ticket[];

      setTickets(ticketsWithDemands);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  };

  const resolveTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;
      await fetchTickets();
    } catch (err) {
      console.error("Error resolving ticket:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTickets();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("tickets-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          fetchTickets();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_demands",
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  return { tickets, loading, error, refetch: fetchTickets, resolveTicket };
}
