import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GroupParticipant {
  id: string;
  phoneNumber?: string; // Real phone number: "558494947662@s.whatsapp.net"
  admin?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!apiUrl || !apiKey) {
      throw new Error("UAZAPI credentials not configured");
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

    // Fetch group info from UAZAPI using POST /group/info
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
    const url = `${baseUrl}/group/info`;
    console.log("UAZAPI URL:", url, "groupjid:", group.whatsapp_id);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupjid: group.whatsapp_id,
        force: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI error:", response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 404) {
        if (errorText.includes("rate-overlimit")) {
          throw new Error("Rate limit atingido na UAZAPI. Aguarde alguns minutos e tente novamente.");
        }
        if (errorText.includes("No participants")) {
          throw new Error("Não foi possível obter participantes deste grupo. O grupo pode estar inacessível.");
        }
        throw new Error("Grupo não encontrado na UAZAPI.");
      }
      throw new Error(`UAZAPI error: ${response.status}`);
    }

    const data = await response.json();
    console.log("UAZAPI group info response received");
    
    // UAZAPI returns: { Name, Participants: [{ JID, PN, IsAdmin, IsSuperAdmin, ... }] }
    // Map to internal format
    const participants: GroupParticipant[] = (data.Participants || []).map((p: any) => ({
      id: p.JID || p.id,
      phoneNumber: p.PN || p.phoneNumber,
      admin: p.IsAdmin ? "admin" : (p.IsSuperAdmin ? "superadmin" : undefined),
    }));

    console.log(`Found ${participants.length} participants`);

    // Sync participants to database
    let added = 0;
    let updated = 0;

    for (const participant of participants) {
      const whatsappId = participant.id;
      // Use phoneNumber field (real number) if available, otherwise fallback to id
      const phoneNumber = participant.phoneNumber 
        ? participant.phoneNumber.replace("@s.whatsapp.net", "")
        : whatsappId.split("@")[0];
      const isAdmin = participant.admin === "admin" || participant.admin === "superadmin";

      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id, is_admin, phone_number")
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

        const { error: insertError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            whatsapp_id: whatsappId,
            phone_number: phoneNumber,
            is_admin: isAdmin,
            role: role,
          });

        if (!insertError) {
          added++;
          console.log("Added member:", phoneNumber, "role:", role);
        }
      } else {
        // Update admin status and phone_number if changed
        const updates: any = {};
        if (existingMember.is_admin !== isAdmin) {
          updates.is_admin = isAdmin;
        }
        if (existingMember.phone_number !== phoneNumber) {
          updates.phone_number = phoneNumber;
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("group_members")
            .update(updates)
            .eq("id", existingMember.id);
          updated++;
        }
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
