import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PendingDemand } from "@/hooks/usePendingDemands";

export function useArchivedDemands() {
  const [demands, setDemands] = useState<PendingDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      setError(null);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error: fetchError } = await supabase
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
        .eq("status", "closed")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const transformed: PendingDemand[] = (data || []).map((d: any) => ({
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

      setDemands(transformed);
    } catch (err: any) {
      console.error("Error fetching archived demands:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, []);

  return { demands, loading, error, refetch: fetchDemands };
}
