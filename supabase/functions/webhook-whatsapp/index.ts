import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// UAZAPI Webhook Payload Interface
interface UAZAPIPayload {
  BaseUrl: string;
  EventType: string;  // "messages", "connection", etc.
  instanceName: string;
  owner: string;
  token: string;
  chatSource?: string;
  chat: {
    wa_chatid: string;
    wa_isGroup: boolean;
    name: string;
    id?: string;
  };
  message: {
    chatid: string;
    isGroup: boolean;
    groupName: string;
    text: string;
    content: string | object;
    sender: string;           // LID interno
    sender_pn: string;        // Número real: "558498371318@s.whatsapp.net"
    sender_lid: string;
    senderName: string;       // Nome do remetente
    fromMe: boolean;
    messageTimestamp: number;
    messageType: string;
    type: string;             // "text", "media", etc.
    id: string;
    messageid: string;
  };
}

interface GroupParticipant {
  id: string;
  phoneNumber?: string; // Real phone number: "558494947662@s.whatsapp.net"
  admin?: string;
}

// Fetch group info from UAZAPI (same endpoint structure as Evolution)
async function fetchGroupInfo(groupJid: string): Promise<{ subject?: string; participants?: GroupParticipant[] } | null> {
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");

  if (!apiUrl || !apiKey || !instanceName) {
    console.error("UAZAPI credentials not configured");
    return null;
  }

  try {
    // Ensure URL has protocol and encode instance name
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
    const encodedInstance = encodeURIComponent(instanceName);
    const url = `${baseUrl}/group/findGroupInfos/${encodedInstance}?groupJid=${groupJid}`;
    console.log("Fetching group info from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI error:", response.status, errorText);
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

// Auto-register a new group - uses group name from UAZAPI payload
async function autoRegisterGroup(
  supabase: any,
  remoteJid: string,
  instanceName: string,
  groupNameFromPayload?: string
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

  // Use group name from payload, or fetch from API, or use fallback
  let groupName = groupNameFromPayload;
  let groupInfo = null;

  if (!groupName) {
    // Try to fetch group info from UAZAPI (includes participants)
    groupInfo = await fetchGroupInfo(remoteJid);
    groupName = groupInfo?.subject || `Grupo ${remoteJid.split("@")[0].slice(-6)}`;
  }

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

  // Sync participants from the groupInfo response if we fetched it
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

    const payload: UAZAPIPayload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // Only process message events from UAZAPI
    if (payload.EventType !== "messages") {
      console.log("Ignoring non-message event:", payload.EventType);
      return new Response(
        JSON.stringify({ success: true, message: "Event ignored" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract data from UAZAPI format
    const remoteJid = payload.message?.chatid || payload.chat?.wa_chatid;
    const isGroup = payload.message?.isGroup || payload.chat?.wa_isGroup;
    
    // Only process group messages
    if (!isGroup || !remoteJid?.endsWith("@g.us")) {
      console.log("Ignoring non-group message:", remoteJid);
      return new Response(
        JSON.stringify({ success: true, message: "Not a group message" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ignore messages sent by the bot itself
    if (payload.message?.fromMe) {
      console.log("Ignoring own message");
      return new Response(
        JSON.stringify({ success: true, message: "Own message ignored" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract sender info from UAZAPI format
    // sender_pn contains the real phone number: "558498371318@s.whatsapp.net"
    const senderPhone = payload.message?.sender_pn 
      ? payload.message.sender_pn.replace("@s.whatsapp.net", "")
      : payload.message?.sender?.split("@")[0] || "";
    const senderName = payload.message?.senderName || "Cliente";
    
    // Message text - can be in 'text' or 'content' (content can be object for media)
    const messageText = payload.message?.text || 
      (typeof payload.message?.content === 'string' ? payload.message.content : "") || 
      "";

    // Group name comes directly from UAZAPI payload
    const groupName = payload.message?.groupName || payload.chat?.name;
    const instanceName = payload.instanceName;

    console.log("Processing message from:", senderPhone, "Name:", senderName, "in group:", remoteJid, "Group name:", groupName);

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

    // If group doesn't exist, auto-register it with the group name from payload
    if (!group) {
      console.log("New group detected, auto-registering:", remoteJid);
      const newGroup = await autoRegisterGroup(supabase, remoteJid, instanceName, groupName);
      
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

    // Update name if we have senderName
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
