import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MonitoredGroup {
  id: string;
  name: string;
  whatsapp_id: string;
  is_active: boolean;
  is_client_group: boolean;
  pending_classification: boolean;
  sla_limit_minutes: number;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useGroups() {
  const [groups, setGroups] = useState<MonitoredGroup[]>([]);
  const [archivedGroups, setArchivedGroups] = useState<MonitoredGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("monitored_groups")
        .select("*")
        .eq("is_archived", false)
        .order("pending_classification", { ascending: false })
        .order("name");

      if (error) throw error;
      setGroups(data as MonitoredGroup[]);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArchivedGroups = useCallback(async () => {
    try {
      setLoadingArchived(true);
      const { data, error } = await supabase
        .from("monitored_groups")
        .select("*")
        .eq("is_archived", true)
        .order("archived_at", { ascending: false });

      if (error) throw error;
      setArchivedGroups(data as MonitoredGroup[]);
    } catch (err) {
      console.error("Error fetching archived groups:", err);
    } finally {
      setLoadingArchived(false);
    }
  }, []);

  const addGroup = async (group: { name: string; whatsapp_id: string; sla_limit_minutes?: number }) => {
    try {
      const { error } = await supabase.from("monitored_groups").insert({
        ...group,
        is_client_group: false,
        pending_classification: false,
        is_archived: false,
      });
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

  const classifyGroup = async (id: string, isClientGroup: boolean) => {
    try {
      const { error } = await supabase
        .from("monitored_groups")
        .update({
          is_client_group: isClientGroup,
          pending_classification: false,
        })
        .eq("id", id);
      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error("Error classifying group:", err);
      throw err;
    }
  };

  const archiveGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from("monitored_groups")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await fetchGroups();
    } catch (err) {
      console.error("Error archiving group:", err);
      throw err;
    }
  };

  const restoreGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from("monitored_groups")
        .update({
          is_archived: false,
          archived_at: null,
          created_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await Promise.all([fetchGroups(), fetchArchivedGroups()]);
    } catch (err) {
      console.error("Error restoring group:", err);
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
      await Promise.all([fetchGroups(), fetchArchivedGroups()]);
    } catch (err) {
      console.error("Error deleting group:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    archivedGroups,
    loading,
    loadingArchived,
    error,
    refetch: fetchGroups,
    fetchArchivedGroups,
    addGroup,
    updateGroup,
    classifyGroup,
    archiveGroup,
    restoreGroup,
    deleteGroup,
  };
}