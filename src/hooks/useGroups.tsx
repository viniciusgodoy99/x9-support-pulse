import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MonitoredGroup {
  id: string;
  name: string;
  whatsapp_id: string;
  is_active: boolean;
  sla_limit_minutes: number;
  created_at: string;
  updated_at: string;
}

export function useGroups() {
  const [groups, setGroups] = useState<MonitoredGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("monitored_groups")
        .select("*")
        .order("name");

      if (error) throw error;
      setGroups(data);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const addGroup = async (group: { name: string; whatsapp_id: string; sla_limit_minutes?: number }) => {
    try {
      const { error } = await supabase.from("monitored_groups").insert(group);
      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error("Error adding group:", err);
      throw err;
    }
  };

  const updateGroup = async (id: string, updates: Partial<MonitoredGroup>) => {
    try {
      const { error } = await supabase
        .from("monitored_groups")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error("Error updating group:", err);
      throw err;
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from("monitored_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return { groups, loading, error, refetch: fetchGroups, addGroup, updateGroup, deleteGroup };
}
