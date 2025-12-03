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
      participantAlt?: string; // Real phone number with @s.whatsapp.net
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
  phoneNumber?: string; // Real phone number: "558494947662@s.whatsapp.net"
  admin?: string;
}

// Fetch group info from Evolution API
async function fetchGroupInfo(groupJid: string): Promise<{ subject?: string; participants?: GroupParticipant[] } | null> {
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
    const url = `${baseUrl}/group/findGroupInfos/${encodedInstance}?groupJid=${groupJid}`;
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
    console.log("Group info response:", JSON.stringify(data, null, 2));
    // Response is the group object directly with 'subject' and 'participants' fields
    return data || null;
  } catch (error) {
    console.error("Error fetching group info:", error);
    return null;
  }
}

// Sync group members to database using participants from findGroupInfos
async function syncGroupMembers(
  supabase: any,
  groupId: string,
  participants: GroupParticipant[]
) {
  console.log(`Syncing ${participants.length} participants for group ${groupId}`);

  for (const participant of participants) {
    const whatsappId = participant.id;
    // Use phoneNumber field (real number) if available, otherwise fallback to id
    const phoneNumber = participant.phoneNumber 
      ? participant.phoneNumber.replace("@s.whatsapp.net", "")
      : whatsappId.split("@")[0];
    const isAdmin = participant.admin === "admin" || participant.admin === "superadmin";

    // Check if member already exists by whatsapp_id
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id, phone_number")
      .eq("group_id", groupId)
      .eq("whatsapp_id", whatsappId)
      .maybeSingle();

    if (!existingMember) {
      // Check if the person is already a CS in team_members
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("id, role")
        .eq("phone_number", phoneNumber)
        .eq("is_active", true)
        .maybeSingle();

      const role = teamMember?.role === "CS" ? "cs" : "unknown";

      // Insert new member
      const { error: insertError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          whatsapp_id: whatsappId,
          phone_number: phoneNumber,
          is_admin: isAdmin,
          role: role,
        });

      if (insertError) {
        console.error("Error inserting group member:", insertError);
      } else {
        console.log("Added new group member:", phoneNumber, "role:", role);
      }
    } else {
      // Update admin status and phone_number if changed
      const updates: any = { is_admin: isAdmin };
      if (existingMember.phone_number !== phoneNumber) {
        updates.phone_number = phoneNumber;
      }
      
      const { error: updateError } = await supabase
        .from("group_members")
        .update(updates)
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

  // First, check if group already exists (race condition protection)
  const { data: existingGroup } = await supabase
    .from("monitored_groups")
    .select("id, is_client_group")
    .eq("whatsapp_id", remoteJid)
    .maybeSingle();

  if (existingGroup) {
    console.log("Group already exists:", existingGroup.id);
    return { id: existingGroup.id, is_client_group: existingGroup.is_client_group };
  }

  // Try to fetch group info from Evolution API (includes participants)
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
    
    // If it's a unique constraint error, try to fetch the existing group
    if (createError.code === '23505') {
      const { data: existingAfterError } = await supabase
        .from("monitored_groups")
        .select("id, is_client_group")
        .eq("whatsapp_id", remoteJid)
        .maybeSingle();
      
      if (existingAfterError) {
        console.log("Group was created by another request:", existingAfterError.id);
        return { id: existingAfterError.id, is_client_group: existingAfterError.is_client_group };
      }
    }
    return null;
  }

  console.log("Group auto-registered:", newGroup.id, "Name:", groupName);

  // Sync participants from the groupInfo response (has phoneNumber field)
  if (groupInfo?.participants && groupInfo.participants.length > 0) {
    await syncGroupMembers(supabase, newGroup.id, groupInfo.participants);
    console.log(`Synced ${groupInfo.participants.length} members for new group`);
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

    // Extract real phone number from participantAlt (preferred) or fallback to participant
    const participantAlt = payload.data.key.participantAlt;
    const participantId = payload.data.key.participant || remoteJid;
    const senderPhone = participantAlt 
      ? participantAlt.replace("@s.whatsapp.net", "")
      : participantId.split("@")[0];
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
      console.log("No members found, fetching group info with participants...");
      const groupInfo = await fetchGroupInfo(remoteJid);
      if (groupInfo?.participants && groupInfo.participants.length > 0) {
        await syncGroupMembers(supabase, group.id, groupInfo.participants);
      }
    }

    // Update sender info in group_members - search by phone_number (not whatsapp_id)
    const { data: senderMember } = await supabase
      .from("group_members")
      .select("id, name, role")
      .eq("group_id", group.id)
      .eq("phone_number", senderPhone)
      .maybeSingle();

    // Update name if we have pushName
    if (senderMember && senderName && senderName !== "Cliente") {
      await supabase
        .from("group_members")
        .update({ name: senderName })
        .eq("id", senderMember.id);
      console.log("Updated member name:", senderPhone, "->", senderName);
    }

    // Check if sender is a CS (team member) based on group_members role
    const isCS = senderMember?.role === "cs";

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
