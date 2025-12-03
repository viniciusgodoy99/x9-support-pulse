import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GroupParticipant {
  id: string;
  admin?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      throw new Error("Evolution API credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { groupId } = await req.json();

    if (!groupId) {
      throw new Error("groupId is required");
    }

    // Get group info
    const { data: group, error: groupError } = await supabase
      .from("monitored_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      throw new Error("Group not found");
    }

    console.log("Fetching participants for group:", group.name, group.whatsapp_id);

    // Fetch participants from Evolution API
    const url = `${evolutionApiUrl}/group/participants/${evolutionInstance}?groupJid=${group.whatsapp_id}`;
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
      throw new Error(`Evolution API error: ${response.status}`);
    }

    const data = await response.json();
    const participants: GroupParticipant[] = data.participants || data || [];

    console.log(`Found ${participants.length} participants`);

    // Sync participants to database
    let added = 0;
    let updated = 0;

    for (const participant of participants) {
      const whatsappId = participant.id;
      const phoneNumber = whatsappId.split("@")[0];
      const isAdmin = participant.admin === "admin" || participant.admin === "superadmin";

      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id, is_admin")
        .eq("group_id", groupId)
        .eq("whatsapp_id", whatsappId)
        .maybeSingle();

      if (!existingMember) {
        const { error: insertError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            whatsapp_id: whatsappId,
            phone_number: phoneNumber,
            is_admin: isAdmin,
            role: "unknown",
          });

        if (!insertError) {
          added++;
        }
      } else if (existingMember.is_admin !== isAdmin) {
        await supabase
          .from("group_members")
          .update({ is_admin: isAdmin })
          .eq("id", existingMember.id);
        updated++;
      }
    }

    console.log(`Sync complete: ${added} added, ${updated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${participants.length} participants`,
        added,
        updated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
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
