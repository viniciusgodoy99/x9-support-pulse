import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export function useSettings() {
  const [globalSla, setGlobalSla] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "global_sla_minutes")
        .single();

      if (error) throw error;
      if (data) setGlobalSla(parseInt(data.value));
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const updateGlobalSla = async (minutes: number): Promise<boolean> => {
    try {
      // Update the global setting
      const { error: settingsError } = await supabase
        .from("settings")
        .update({ value: minutes.toString() })
        .eq("key", "global_sla_minutes");

      if (settingsError) throw settingsError;

      // Update all client groups to use the new SLA value
      const { error: groupsError } = await supabase
        .from("monitored_groups")
        .update({ sla_limit_minutes: minutes })
        .eq("is_client_group", true);

      if (groupsError) throw groupsError;

      setGlobalSla(minutes);
      return true;
    } catch (err) {
      console.error("Error updating global SLA:", err);
      setError("Erro ao atualizar SLA");
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    globalSla,
    loading,
    error,
    updateGlobalSla,
    refetch: fetchSettings,
  };
}
