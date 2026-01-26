import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingDemand {
  id: string;
  ticket_id: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  sla_exceeded: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  group_name: string;
  group_id: string;
  sla_limit_minutes: number;
}

export function usePendingDemands() {
  const [demands, setDemands] = useState<PendingDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // First get open demands with ticket info (excluding demands older than 7 days)
      const { data: demandsData, error: demandsError } = await supabase
        .from("ticket_demands")
        .select(`
          id,
          ticket_id,
          description,
          status,
          priority,
          category,
          created_at,
          sla_exceeded,
          tickets!inner (
            customer_name,
            customer_phone,
            group_id,
            monitored_groups!inner (
              name,
              sla_limit_minutes
            )
          )
        `)
        .eq("status", "open")
        .gte("created_at", sevenDaysAgoISO)
        .order("created_at", { ascending: true });

      if (demandsError) throw demandsError;

      // Transform the data to flat structure
      const transformedDemands: PendingDemand[] = (demandsData || []).map((d: any) => ({
        id: d.id,
        ticket_id: d.ticket_id,
        description: d.description,
        status: d.status,
        priority: d.priority,
        category: d.category,
        created_at: d.created_at,
        sla_exceeded: d.sla_exceeded,
        customer_name: d.tickets?.customer_name,
        customer_phone: d.tickets?.customer_phone,
        group_id: d.tickets?.group_id,
        group_name: d.tickets?.monitored_groups?.name || "Grupo desconhecido",
        sla_limit_minutes: d.tickets?.monitored_groups?.sla_limit_minutes || 30,
      }));

      // Sort by priority then by created_at
      const priorityOrder: Record<string, number> = {
        urgent: 1,
        high: 2,
        normal: 3,
        low: 4,
      };

      transformedDemands.sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setDemands(transformedDemands);
    } catch (err: any) {
      console.error("Error fetching pending demands:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pending-demands-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_demands" },
        () => {
          fetchDemands();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    demands,
    loading,
    error,
    refetch: fetchDemands,
  };
}
