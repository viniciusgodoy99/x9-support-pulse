import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  name: string;
  phone_number: string;
  role: "CS" | "Manager" | "Support" | "Admin" | "PerformanceManager" | "CRMManager" | "SocialMedia" | "ClientTeam";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("name");

      if (error) throw error;
      setMembers(data as TeamMember[]);
    } catch (err) {
      console.error("Error fetching team members:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar membros");
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (member: { name: string; phone_number: string; role?: TeamMember["role"] }) => {
    try {
      const { error } = await supabase.from("team_members").insert(member);
      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error("Error adding member:", err);
      throw err;
    }
  };

  const updateMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error("Error updating member:", err);
      throw err;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      console.error("Error deleting member:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return { members, loading, error, refetch: fetchMembers, addMember, updateMember, deleteMember };
}
