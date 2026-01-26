import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
      // Fetch current member to get phone_number and name
      const { data: member, error: fetchError } = await supabase
        .from("group_members")
        .select("phone_number, name")
        .eq("id", memberId)
        .single();

      if (fetchError) throw fetchError;

      // Update role in current group
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ role })
        .eq("id", memberId);

      if (updateError) throw updateError;

      // Sync sender_role in ALL messages from this phone number
      const newSenderRole = role === "cs" ? "cs" : "client";
      const { error: messagesError } = await supabase
        .from("messages")
        .update({ sender_role: newSenderRole })
        .eq("sender_phone", member.phone_number);

      if (messagesError) {
        console.error("Error updating messages sender_role:", messagesError);
      } else {
        console.log(`Updated sender_role to '${newSenderRole}' for all messages from ${member.phone_number}`);
      }

      // If role is "cs", integrate with team_members and sync across all groups
      if (role === "cs" && member) {
        // Check if already exists in team_members
        const { data: existingTeamMember } = await supabase
          .from("team_members")
          .select("id")
          .eq("phone_number", member.phone_number)
          .maybeSingle();

        if (!existingTeamMember) {
          // Add to team_members
          const { error: insertError } = await supabase
            .from("team_members")
            .insert({
              phone_number: member.phone_number,
              name: member.name || "CS",
              role: "CS",
              is_active: true,
            });

          if (insertError) {
            console.error("Error adding to team_members:", insertError);
          } else {
            toast({
              title: "Membro adicionado à equipe",
              description: `${member.name || member.phone_number} foi adicionado à equipe como CS`,
            });
          }
        }

        // Update role to "cs" in ALL groups where this person exists (by phone_number)
        const { error: syncError } = await supabase
          .from("group_members")
          .update({ role: "cs" })
          .eq("phone_number", member.phone_number);

        if (syncError) {
          console.error("Error syncing role across groups:", syncError);
        } else {
          console.log("Synced CS role across all groups for:", member.phone_number);
        }
      }

      // If removed from CS, remove from team_members
      if (role !== "cs" && member) {
        const { error: deleteTeamError } = await supabase
          .from("team_members")
          .delete()
          .eq("phone_number", member.phone_number);

        if (!deleteTeamError) {
          console.log(`Removed ${member.phone_number} from team_members`);
        }
      }

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
