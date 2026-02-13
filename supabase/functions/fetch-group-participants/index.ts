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
  name?: string;
}

interface ContactInfo {
  phone?: string;
  name?: string;
  exists?: boolean;
}

// Fetch contact info from UAZAPI to get real phone number and name
async function fetchContactInfo(
  baseUrl: string,
  apiKey: string,
  whatsappId: string
): Promise<ContactInfo | null> {
  try {
    // Extract the ID part (without @lid or @s.whatsapp.net)
    const cleanId = whatsappId.split("@")[0];
    
    // Try /contact/check endpoint to get real phone number
    const url = `${baseUrl}/contact/check`;
    console.log("Fetching contact info for:", cleanId);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: cleanId,
      }),
    });

    if (!response.ok) {
      console.log("Contact check failed for:", cleanId, response.status);
      return null;
    }

    const data = await response.json();
    console.log("Contact info response:", JSON.stringify(data));
    
    // UAZAPI returns: { Exists, JID, PN, Name, ... }
    return {
      phone: data.PN || data.phone,
      name: data.Name || data.name || data.PushName || data.pushName,
      exists: data.Exists || data.exists,
    };
  } catch (error) {
    console.error("Error fetching contact info:", error);
    return null;
  }
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  // Removes all non-digit characters
  return phone.replace(/\D/g, "");
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

    // Fetch ALL team members to map roles
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("*")
      .eq("is_active", true);

    if (teamError) {
      console.error("Error fetching team members:", teamError);
    }

    // Create a map for fast lookup by normalized phone number
    const teamMemberMap = new Map<string, any>();
    if (teamMembers) {
      teamMembers.forEach(member => {
        const normalized = normalizePhoneNumber(member.phone_number);
        if (normalized) {
          teamMemberMap.set(normalized, member);
        }
      });
    }
    console.log(`Loaded ${teamMemberMap.size} active team members for role mapping`);

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
      let rawPhoneNumber = participant.phoneNumber 
        ? participant.phoneNumber.replace("@s.whatsapp.net", "")
        : whatsappId.split("@")[0];
      let participantName = participant.name;
      const isAdmin = participant.admin === "admin" || participant.admin === "superadmin";

      // If we only have a LID (not a real phone number), try to fetch contact info
      // LIDs are typically long numeric strings without country code format
      const isLid = whatsappId.includes("@lid") || 
                   (!whatsappId.includes("@s.whatsapp.net") && rawPhoneNumber.length > 13);
      
      if (isLid) {
        console.log("Participant has LID, attempting to fetch real phone number:", whatsappId);
        const contactInfo = await fetchContactInfo(baseUrl, apiKey, whatsappId);
        if (contactInfo) {
          if (contactInfo.phone) {
            const realPhone = contactInfo.phone.replace("@s.whatsapp.net", "");
            console.log("Got real phone number:", realPhone, "for LID:", rawPhoneNumber);
            rawPhoneNumber = realPhone;
          }
          if (contactInfo.name) {
            participantName = contactInfo.name;
            console.log("Got name:", participantName);
          }
        }
      }

      // Fallback: check if this LID was already resolved in another group
      if (isLid && rawPhoneNumber.length > 13) {
        const { data: resolvedMember } = await supabase
          .from("group_members")
          .select("phone_number, name, role")
          .eq("whatsapp_id", whatsappId)
          .neq("phone_number", rawPhoneNumber)
          .limit(1)
          .maybeSingle();

        if (resolvedMember && resolvedMember.phone_number.length <= 13) {
          console.log("Found resolved phone from other group:", resolvedMember.phone_number, "for LID:", rawPhoneNumber);
          rawPhoneNumber = resolvedMember.phone_number;
          if (resolvedMember.name) participantName = resolvedMember.name;
          if (resolvedMember.role && resolvedMember.role !== "unknown") {
            role = resolvedMember.role;
          }
        }
      }

      // Determine correct role based on team_members
      const normalizedPhone = normalizePhoneNumber(rawPhoneNumber);
      const teamMember = teamMemberMap.get(normalizedPhone);
      
      let role = "unknown";
      if (teamMember) {
        const teamRole = teamMember.role;
        // Map team roles to group roles
        if (["CS", "Support", "Admin", "Manager", "CRMManager"].includes(teamRole)) {
          role = "cs";
        } else if (["PerformanceManager", "SocialMedia"].includes(teamRole)) {
          role = "traffic_manager";
        } else if (["ClientTeam"].includes(teamRole)) {
          role = "client";
        }
        console.log(`Matched team member ${teamMember.name} (${normalizedPhone}) with role ${teamRole} -> group role ${role}`);
      }

      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id, is_admin, phone_number, name, role")
        .eq("group_id", groupId)
        .eq("whatsapp_id", whatsappId)
        .maybeSingle();

      if (!existingMember) {
        const { error: insertError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            whatsapp_id: whatsappId,
            phone_number: rawPhoneNumber,
            is_admin: isAdmin,
            role: role as any,
            name: participantName || (teamMember ? teamMember.name : null),
          });

        if (!insertError) {
          added++;
          console.log("Added member:", rawPhoneNumber, "role:", role);
        } else {
             console.error("Error adding member:", insertError);
        }
      } else {
        // Update admin status, phone_number, name AND ROLE if changed
        const updates: any = {};
        
        // Always force update role if we found a match in team_members and current role is different
        // OR if current role is unknown/traffic_manager/client but should be CS
        // Basically if we have a definitive team match, that takes precedence
        if (teamMember && existingMember.role !== role) {
            updates.role = role;
            console.log(`Updating role for ${rawPhoneNumber} from ${existingMember.role} to ${role}`);
        }

        if (existingMember.is_admin !== isAdmin) {
          updates.is_admin = isAdmin;
        }
        if (existingMember.phone_number !== rawPhoneNumber && rawPhoneNumber) {
          updates.phone_number = rawPhoneNumber;
        }
        if (participantName && existingMember.name !== participantName) {
          updates.name = participantName;
        }
        // If we found a team member name and existing name is null/empty, update it
        if (teamMember && !existingMember.name) {
             updates.name = teamMember.name;
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("group_members")
            .update(updates)
            .eq("id", existingMember.id);
          updated++;
          console.log("Updated member:", rawPhoneNumber, "updates:", updates);
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
