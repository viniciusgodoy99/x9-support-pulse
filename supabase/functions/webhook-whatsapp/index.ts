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
    const senderJid = payload.data.key.participant || remoteJid;
    const senderPhone = senderJid.split("@")[0];
    const senderName = payload.data.pushName || "Cliente";
    const messageText =
      payload.data.message?.conversation ||
      payload.data.message?.extendedTextMessage?.text ||
      "";

    console.log("Processing message from:", senderPhone, "in group:", remoteJid);

    // Check if this group is monitored
    const { data: group, error: groupError } = await supabase
      .from("monitored_groups")
      .select("*")
      .eq("whatsapp_id", remoteJid)
      .eq("is_active", true)
      .maybeSingle();

    if (groupError) {
      console.error("Error fetching group:", groupError);
      throw groupError;
    }

    if (!group) {
      console.log("Group not monitored or inactive:", remoteJid);
      return new Response(
        JSON.stringify({ success: true, message: "Group not monitored" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Found monitored group:", group.name);

    // Check if sender is a team member
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

    const isTeamMember = !!teamMember;
    console.log("Is team member:", isTeamMember, teamMember?.name);

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
            resolved_by: teamMember.id,
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
