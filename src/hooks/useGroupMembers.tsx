import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GroupMemberRole = "cs" | "client" | "traffic_manager" | "unknown";

export interface GroupMember {
  id: string;
  group_id: string;
  whatsapp_id: string;
  phone_number: string;
  name: string | null;
  role: GroupMemberRole;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export function useGroupMembers(groupId?: string) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("name", { nullsFirst: false });

      if (error) throw error;
      setMembers(data as GroupMember[]);
    } catch (err) {
      console.error("Error fetching group members:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar membros");
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, role: GroupMemberRole) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error("Error updating member role:", err);
      throw err;
    }
  };

  const updateMemberName = async (memberId: string, name: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ name })
        .eq("id", memberId);
      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error("Error updating member name:", err);
      throw err;
    }
  };

  const syncFromEvolution = async () => {
    if (!groupId) return;

    try {
      const response = await supabase.functions.invoke("fetch-group-participants", {
        body: { groupId },
      });

      if (response.error) throw response.error;
      await fetchMembers();
      return response.data;
    } catch (err) {
      console.error("Error syncing from Evolution:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    updateMemberRole,
    updateMemberName,
    syncFromEvolution,
  };
}
