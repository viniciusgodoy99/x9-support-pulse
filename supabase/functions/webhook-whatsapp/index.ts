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

// Fetch group info from UAZAPI
async function fetchGroupInfo(groupJid: string): Promise<{ subject?: string; participants?: GroupParticipant[] } | null> {
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");

  if (!apiUrl || !apiKey) {
    console.error("UAZAPI credentials not configured");
    return null;
  }

  try {
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
    const url = `${baseUrl}/group/info`;
    console.log("Fetching group info from UAZAPI:", url, "groupjid:", groupJid);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupjid: groupJid,
        force: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("UAZAPI group info response:", JSON.stringify(data, null, 2));

    // Map UAZAPI response to internal format
    // UAZAPI returns: { Name, Participants: [{ JID, PN, IsAdmin, ... }] }
    return {
      subject: data.Name,
      participants: data.Participants?.map((p: any) => ({
        id: p.JID || p.id,
        phoneNumber: p.PN || p.phoneNumber,
        admin: p.IsAdmin ? "admin" : (p.IsSuperAdmin ? "superadmin" : undefined),
      })),
    };
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

    // NOTE: We no longer return early for fromMe messages here
    // This allows us to update member info even for our own sent messages
    // We'll check fromMe later, after updating member info

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

    console.log("Found monitored group:", group.name, "is_client_group:", group.is_client_group);

    // ===== ALWAYS UPDATE MEMBER INFO (regardless of is_client_group) =====
    // Get sender_lid to match with whatsapp_id in group_members
    // sender_lid format: "248519843647735@lid" - we need to match this with stored whatsapp_id
    const senderLid = payload.message?.sender_lid || payload.message?.sender || "";
    const senderLidClean = senderLid.replace("@lid", "").replace("@s.whatsapp.net", "");
    
    console.log("Looking for member - senderLid:", senderLid, "senderLidClean:", senderLidClean, "senderPhone:", senderPhone);

    // Search by whatsapp_id (LID) OR phone_number
    const { data: senderMember } = await supabase
      .from("group_members")
      .select("id, name, role, phone_number, whatsapp_id")
      .eq("group_id", group.id)
      .or(`whatsapp_id.ilike.%${senderLidClean}%,phone_number.eq.${senderPhone}`)
      .maybeSingle();

    console.log("Found member:", senderMember?.id, "whatsapp_id:", senderMember?.whatsapp_id, "current phone:", senderMember?.phone_number);

    // Update name AND phone_number with real values from webhook
    if (senderMember) {
      const updates: Record<string, string> = {};
      
      // Update name if we have a valid senderName
      if (senderName && senderName !== "Cliente" && senderName !== senderMember.name) {
        updates.name = senderName;
        console.log("Will update name from", senderMember.name, "to", senderName);
      }
      
      // Update phone_number with the REAL phone number from sender_pn
      if (senderPhone && senderMember.phone_number !== senderPhone) {
        updates.phone_number = senderPhone;
        console.log("Will update phone_number from", senderMember.phone_number, "to", senderPhone);
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("group_members")
          .update(updates)
          .eq("id", senderMember.id);
        
        if (updateError) {
          console.error("Error updating member:", updateError);
        } else {
          console.log("Successfully updated member:", senderMember.id, "updates:", updates);
        }
      } else {
        console.log("No updates needed for member:", senderMember.id);
      }
    } else {
      console.log("No matching member found for senderLid:", senderLidClean, "or senderPhone:", senderPhone);
    }

    // ===== CHECK IF CLIENT GROUP =====
    // For NON-client groups, skip ticket processing entirely
    if (!group.is_client_group) {
      console.log("Group is not a client group, skipping ticket processing:", remoteJid);
      return new Response(
        JSON.stringify({ success: true, message: "Not a client group, member info updated" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // FOR CLIENT GROUPS: Process tickets for ALL messages (including fromMe)
    // This ensures any interaction triggers monitoring
    console.log("Processing tickets for client group:", group.name, 
      payload.message?.fromMe ? "(own message)" : "(received message)");

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

    // Check if sender has a defined role in group_members
    // Any role other than 'unknown' is considered part of the team/attendance
    // Roles: cs, client, traffic_manager = team | unknown = potential customer
    const hasDefinedRole = senderMember?.role && senderMember.role !== "unknown";
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

    // Team member = in team_members table OR has any defined role in the group
    const isTeamMember = !!teamMember || hasDefinedRole;
    console.log("Is team member:", isTeamMember, "role:", senderMember?.role, teamMember?.name || "");

    // ===== TICKET PROCESSING WITH MESSAGE STORAGE =====
    // Check for existing open ticket
    let { data: existingTicket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("group_id", group.id)
      .eq("status", "open")
      .maybeSingle();

    if (ticketError) {
      console.error("Error fetching ticket:", ticketError);
      throw ticketError;
    }

    let ticketId: string;

    if (!existingTicket) {
      // Create new ticket with next_analysis_at set to 1 hour from now
      const nextAnalysisAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour
      
      const { data: newTicket, error: createError } = await supabase
        .from("tickets")
        .insert({
          group_id: group.id,
          status: "open",
          customer_phone: isTeamMember ? null : senderPhone,
          customer_name: isTeamMember ? null : senderName,
          next_analysis_at: nextAnalysisAt,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating ticket:", createError);
        throw createError;
      }

      ticketId = newTicket.id;
      console.log("New ticket created:", ticketId, "next_analysis_at:", nextAnalysisAt);
    } else {
      ticketId = existingTicket.id;
      console.log("Using existing ticket:", ticketId);
    }

    // ===== SAVE MESSAGE TO DATABASE =====
    // Determinar sender_role: role do grupo tem PRIORIDADE sobre team_members
    // Isso permite que uma pessoa seja CS em um grupo e Cliente em outro
    let senderRole: "cs" | "client" = "client";
    if (senderMember?.role) {
      // Role definido no grupo específico tem prioridade
      senderRole = (senderMember.role === "cs" || senderMember.role === "traffic_manager") ? "cs" : "client";
      console.log("Using group-specific role:", senderMember.role, "->", senderRole);
    } else if (teamMember) {
      // Fallback para team_members quando não há role no grupo
      senderRole = "cs";
      console.log("Using team_members fallback -> cs");
    }
    const messageType = payload.message?.type || payload.message?.messageType || "text";
    const whatsappMessageId = payload.message?.id || payload.message?.messageid;

    // Only save if we have message content
    if (messageText && messageText.trim()) {
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          ticket_id: ticketId,
          group_id: group.id,
          sender_phone: senderPhone,
          sender_name: senderName,
          sender_role: senderRole,
          content: messageText,
          message_type: messageType,
          whatsapp_message_id: whatsappMessageId,
        });

      if (messageError) {
        console.error("Error saving message:", messageError);
        // Don't throw - message saving failure shouldn't block ticket processing
      } else {
        console.log("Message saved for ticket:", ticketId, "role:", senderRole);
      }
    }

    // ===== HANDLE TEAM MEMBER SPECIFIC ACTIONS =====
    if (isTeamMember) {
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
          .eq("id", ticketId);

        if (updateError) {
          console.error("Error resolving ticket:", updateError);
          throw updateError;
        }

        console.log("Ticket resolved:", ticketId);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Ticket resolved",
            ticketId: ticketId,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else if (!existingTicket?.first_response_at) {
        // First response from team
        const { error: updateError } = await supabase
          .from("tickets")
          .update({
            first_response_at: new Date().toISOString(),
          })
          .eq("id", ticketId);

        if (updateError) {
          console.error("Error updating first response:", updateError);
          throw updateError;
        }

        console.log("First response recorded for ticket:", ticketId);
      }
    } else {
      // Update customer info on existing ticket if not set
      if (existingTicket && (!existingTicket.customer_phone || !existingTicket.customer_name)) {
        const updates: Record<string, string> = {};
        if (!existingTicket.customer_phone && senderPhone) updates.customer_phone = senderPhone;
        if (!existingTicket.customer_name && senderName) updates.customer_name = senderName;
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("tickets")
            .update(updates)
            .eq("id", ticketId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingTicket ? "Message saved" : "Ticket created and message saved",
        ticketId: ticketId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
