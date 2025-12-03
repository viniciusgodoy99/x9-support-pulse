import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  monitored_groups?: {
    id: string;
    name: string;
    whatsapp_id: string;
    sla_limit_minutes: number;
  };
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

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data as Ticket[]);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]);

  return { tickets, loading, error, refetch: fetchTickets, resolveTicket };
}
