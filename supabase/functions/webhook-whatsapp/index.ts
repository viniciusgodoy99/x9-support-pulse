import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
      participant?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    messageTimestamp?: number;
  };
}

interface GroupParticipant {
  id: string;
  admin?: string;
}

// Fetch group info from Evolution API
async function fetchGroupInfo(groupJid: string): Promise<{ subject?: string } | null> {
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
  const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME");

  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
    console.error("Evolution API credentials not configured");
    return null;
  }

  try {
    // Ensure URL has protocol and encode instance name
    const baseUrl = evolutionApiUrl.startsWith("http") ? evolutionApiUrl : `https://${evolutionApiUrl}`;
    const encodedInstance = encodeURIComponent(evolutionInstance);
    const url = `${baseUrl}/group/fetchAllGroups/${encodedInstance}?getParticipants=false`;
    console.log("Fetching group info from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": evolutionApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    // Find the group in the list
    const group = data.find((g: any) => g.id === groupJid);
    return group || null;
  } catch (error) {
    console.error("Error fetching group info:", error);
    return null;
  }
}

// Fetch group participants from Evolution API
async function fetchGroupParticipants(groupJid: string): Promise<GroupParticipant[]> {
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
  const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME");

  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
    console.error("Evolution API credentials not configured");
    return [];
  }

  try {
    // Ensure URL has protocol and encode instance name
    const baseUrl = evolutionApiUrl.startsWith("http") ? evolutionApiUrl : `https://${evolutionApiUrl}`;
    const encodedInstance = encodeURIComponent(evolutionInstance);
    const url = `${baseUrl}/group/participants/${encodedInstance}?groupJid=${groupJid}`;
    console.log("Fetching participants from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": evolutionApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log("Participants response:", JSON.stringify(data, null, 2));
    
    // Evolution API returns participants in different formats depending on version
    return data.participants || data || [];
  } catch (error) {
    console.error("Error fetching participants:", error);
    return [];
  }
}

// Sync group members to database
async function syncGroupMembers(
  supabase: any,
  groupId: string,
  participants: GroupParticipant[]
) {
  console.log(`Syncing ${participants.length} participants for group ${groupId}`);

  for (const participant of participants) {
    const whatsappId = participant.id;
    const phoneNumber = whatsappId.split("@")[0];
    const isAdmin = participant.admin === "admin" || participant.admin === "superadmin";

    // Check if member already exists
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("whatsapp_id", whatsappId)
      .maybeSingle();

    if (!existingMember) {
      // Insert new member
      const { error: insertError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          whatsapp_id: whatsappId,
          phone_number: phoneNumber,
          is_admin: isAdmin,
          role: "unknown",
        });

      if (insertError) {
        console.error("Error inserting group member:", insertError);
      } else {
        console.log("Added new group member:", phoneNumber);
      }
    } else {
      // Update admin status if changed
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ is_admin: isAdmin })
        .eq("id", existingMember.id);

      if (updateError) {
        console.error("Error updating group member:", updateError);
      }
    }
  }
}

// Auto-register a new group
async function autoRegisterGroup(
  supabase: any,
  remoteJid: string,
  instanceName: string
): Promise<{ id: string; is_client_group: boolean } | null> {
  console.log("Auto-registering new group:", remoteJid);

  // Try to fetch group info from Evolution API
  const groupInfo = await fetchGroupInfo(remoteJid);
  const groupName = groupInfo?.subject || `Grupo ${remoteJid.split("@")[0].slice(-6)}`;

  // Create the group with pending classification
  const { data: newGroup, error: createError } = await supabase
    .from("monitored_groups")
    .insert({
      name: groupName,
      whatsapp_id: remoteJid,
      evolution_instance: instanceName,
      is_active: true,
      is_client_group: false,
      pending_classification: true,
      sla_limit_minutes: 30,
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating group:", createError);
    return null;
  }

  console.log("Group auto-registered:", newGroup.id, "Name:", groupName);

  // Fetch and sync participants
  const participants = await fetchGroupParticipants(remoteJid);
  if (participants.length > 0) {
    await syncGroupMembers(supabase, newGroup.id, participants);
    console.log(`Synced ${participants.length} members for new group`);
  }

  return { id: newGroup.id, is_client_group: false };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // Only process message events
    if (payload.event !== "messages.upsert") {
      console.log("Ignoring non-message event:", payload.event);
      return new Response(
        JSON.stringify({ success: true, message: "Event ignored" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const remoteJid = payload.data.key.remoteJid;
    
    // Only process group messages (ends with @g.us)
    if (!remoteJid.endsWith("@g.us")) {
      console.log("Ignoring non-group message:", remoteJid);
      return new Response(
        JSON.stringify({ success: true, message: "Not a group message" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const senderJid = payload.data.key.participant || remoteJid;
    const senderPhone = senderJid.split("@")[0];
    const senderName = payload.data.pushName || "Cliente";
    const messageText =
      payload.data.message?.conversation ||
      payload.data.message?.extendedTextMessage?.text ||
      "";

    console.log("Processing message from:", senderPhone, "in group:", remoteJid);

    // Check if this group exists (active or not)
    let { data: group, error: groupError } = await supabase
      .from("monitored_groups")
      .select("*")
      .eq("whatsapp_id", remoteJid)
      .maybeSingle();

    if (groupError) {
      console.error("Error fetching group:", groupError);
      throw groupError;
    }

    // If group doesn't exist, auto-register it
    if (!group) {
      console.log("New group detected, auto-registering:", remoteJid);
      const newGroup = await autoRegisterGroup(supabase, remoteJid, payload.instance);
      
      if (!newGroup) {
        return new Response(
          JSON.stringify({ success: false, message: "Failed to register group" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Group auto-registered, pending classification",
          groupId: newGroup.id
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If group is inactive, ignore
    if (!group.is_active) {
      console.log("Group is inactive:", remoteJid);
      return new Response(
        JSON.stringify({ success: true, message: "Group is inactive" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If group is not a client group, don't process tickets
    if (!group.is_client_group) {
      console.log("Group is not a client group, skipping ticket processing:", remoteJid);
      return new Response(
        JSON.stringify({ success: true, message: "Not a client group" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Found monitored client group:", group.name);

    // Check if we need to sync group members (first time or no members)
    const { data: existingMembers, error: membersError } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .limit(1);

    if (!membersError && (!existingMembers || existingMembers.length === 0)) {
      console.log("No members found, fetching participants...");
      const participants = await fetchGroupParticipants(remoteJid);
      if (participants.length > 0) {
        await syncGroupMembers(supabase, group.id, participants);
      }
    }

    // Update sender info in group_members if exists
    const { data: senderMember } = await supabase
      .from("group_members")
      .select("id, name")
      .eq("group_id", group.id)
      .eq("whatsapp_id", senderJid)
      .maybeSingle();

    if (senderMember && !senderMember.name && senderName) {
      await supabase
        .from("group_members")
        .update({ name: senderName })
        .eq("id", senderMember.id);
    }

    // Check if sender is a CS (team member) based on group_members role
    const { data: groupMember } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", group.id)
      .eq("whatsapp_id", senderJid)
      .maybeSingle();

    const isCS = groupMember?.role === "cs";

    // Also check team_members table for backward compatibility
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("*")
      .eq("phone_number", senderPhone)
      .eq("is_active", true)
      .maybeSingle();

    if (teamError) {
      console.error("Error fetching team member:", teamError);
      throw teamError;
    }

    const isTeamMember = !!teamMember || isCS;
    console.log("Is team member:", isTeamMember, teamMember?.name || (isCS ? "CS from group" : ""));

    if (!isTeamMember) {
      // Customer message - check for existing open ticket or create new one
      const { data: existingTicket, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("group_id", group.id)
        .eq("status", "open")
        .maybeSingle();

      if (ticketError) {
        console.error("Error fetching ticket:", ticketError);
        throw ticketError;
      }

      if (!existingTicket) {
        // Create new ticket
        const { data: newTicket, error: createError } = await supabase
          .from("tickets")
          .insert({
            group_id: group.id,
            status: "open",
            customer_phone: senderPhone,
            customer_name: senderName,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating ticket:", createError);
          throw createError;
        }

        console.log("New ticket created:", newTicket.id);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Ticket created",
            ticketId: newTicket.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        console.log("Existing ticket found:", existingTicket.id);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Ticket exists",
            ticketId: existingTicket.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // Team member message
      const { data: openTicket, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("group_id", group.id)
        .eq("status", "open")
        .maybeSingle();

      if (ticketError) {
        console.error("Error fetching ticket:", ticketError);
        throw ticketError;
      }

      if (!openTicket) {
        console.log("No open ticket for team response");
        return new Response(
          JSON.stringify({ success: true, message: "No open ticket" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if this is a resolution command
      const isResolutionCommand = messageText.toLowerCase().trim() === "/resolvido";

      if (isResolutionCommand) {
        // Resolve the ticket
        const { error: updateError } = await supabase
          .from("tickets")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: teamMember?.id || null,
          })
          .eq("id", openTicket.id);

        if (updateError) {
          console.error("Error resolving ticket:", updateError);
          throw updateError;
        }

        console.log("Ticket resolved:", openTicket.id);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Ticket resolved",
            ticketId: openTicket.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else if (!openTicket.first_response_at) {
        // First response from team
        const { error: updateError } = await supabase
          .from("tickets")
          .update({
            first_response_at: new Date().toISOString(),
          })
          .eq("id", openTicket.id);

        if (updateError) {
          console.error("Error updating first response:", updateError);
          throw updateError;
        }

        console.log("First response recorded for ticket:", openTicket.id);
        return new Response(
          JSON.stringify({
            success: true,
            message: "First response recorded",
            ticketId: openTicket.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Message processed",
          ticketId: openTicket.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});