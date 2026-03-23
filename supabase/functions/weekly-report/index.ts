import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;

interface MonitoredGroup {
  id: string;
  name: string;
  whatsapp_id: string;
}

interface WeeklyGroupData {
  group: MonitoredGroup;
  demands: {
    description: string;
    status: string;
    category: string;
    priority: string;
    resolved_by_name: string | null;
    created_at: string;
    resolved_at: string | null;
  }[];
  messages: {
    content: string;
    sender_name: string | null;
    sender_role: string;
    created_at: string;
  }[];
}

interface WeeklyPreview {
  groupId: string;
  groupName: string;
  whatsappId: string;
  demandsCount: number;
  resolvedCount: number;
  pendingCount: number;
  messagesCount: number;
  message: string | null;
  error?: string;
}

function normalizeApiUrl(url: string): string {
  if (!url) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  };
  return `${fmt(start)} a ${fmt(end)}`;
}

async function generateWeeklySummary(
  groupName: string,
  data: WeeklyGroupData,
  dateRange: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!data.demands.length && !data.messages.length) {
    return "Semana tranquila por aqui! Seguimos atentos e disponíveis para qualquer necessidade. 😊";
  }

  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not configured, using fallback");
    return data.demands.map((d) => `- ${d.description} (${d.status})`).join("\n");
  }

  const systemPrompt = `Você é um especialista em copywriting responsável por criar resumos semanais de interações com clientes. Seu objetivo é transformar uma semana de acontecimentos em uma mensagem organizada, humanizada e focada em progresso.

DIRETRIZES OBRIGATÓRIAS:

Tom de voz: Profissional, mas conversacional e acolhedor

ESTRUTURA OBRIGATÓRIA - Separe em exatamente 2 seções:

1. ✅ O que foi decidido/feito esta semana
   - Liste em tópicos curtos e claros o que foi resolvido, decidido ou concluído
   - Use verbos como "resolvemos", "alinhamos", "ficou definido", "foi entregue"

2. 📌 O que ficou combinado para as próximas semanas
   - Liste em tópicos o que ficou pendente ou agendado para execução futura
   - Use verbos como "ficou combinado", "vamos acompanhar", "próximo passo será"

Se não houver itens para uma das seções, inclua a seção com "Nenhum item nesta categoria esta semana."

FORMATO DE SAÍDA:
Retorne APENAS o corpo com as 2 seções. NÃO inclua cabeçalho, data, saudação ou despedida.
Use emojis nos tópicos para dar leveza. Mantenha conciso (máximo 8 tópicos por seção).`;

  const resolvedDemands = data.demands.filter((d) => d.status === "resolved");
  const pendingDemands = data.demands.filter((d) => d.status === "open");

  let userContent = `Cliente: ${groupName}\nPeríodo: ${dateRange}\n\n`;

  if (data.demands.length > 0) {
    userContent += `Demandas da semana (${data.demands.length} total):\n`;
    for (const d of data.demands) {
      const status = d.status === "resolved" ? "✅ Resolvida" : "⏳ Pendente";
      const resolvedBy = d.resolved_by_name ? ` (por ${d.resolved_by_name})` : "";
      userContent += `- [${status}] ${d.description}${resolvedBy}\n`;
    }
  }

  if (data.messages.length > 0) {
    const sampleMessages = data.messages.slice(0, 30);
    userContent += `\nAmostra de mensagens da semana (${data.messages.length} total):\n`;
    for (const m of sampleMessages) {
      const sender = m.sender_name || m.sender_role;
      userContent += `[${sender}]: ${m.content}\n`;
    }
  }

  if (!data.demands.length && data.messages.length > 0) {
    userContent += "\nNão houve demandas formais esta semana. Baseie-se nas mensagens para identificar o que foi discutido/decidido e o que ficou pendente.";
  }

  try {
    console.log(`Generating weekly narrative for ${groupName}...`);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status} - ${errorText}`);
      return buildFallbackSummary(resolvedDemands, pendingDemands);
    }

    const result = await response.json();
    const narrative = result.choices?.[0]?.message?.content?.trim();

    if (!narrative) {
      return buildFallbackSummary(resolvedDemands, pendingDemands);
    }

    console.log(`Generated weekly narrative: ${narrative.substring(0, 100)}...`);
    return narrative;
  } catch (error) {
    console.error(`Error generating weekly narrative: ${error}`);
    return buildFallbackSummary(resolvedDemands, pendingDemands);
  }
}

function buildFallbackSummary(
  resolved: { description: string }[],
  pending: { description: string }[]
): string {
  let text = "✅ O que foi decidido/feito esta semana\n";
  if (resolved.length > 0) {
    text += resolved.map((d) => `- ${d.description}`).join("\n") + "\n";
  } else {
    text += "- Nenhum item nesta categoria esta semana.\n";
  }
  text += "\n📌 O que ficou combinado para as próximas semanas\n";
  if (pending.length > 0) {
    text += pending.map((d) => `- ${d.description}`).join("\n") + "\n";
  } else {
    text += "- Nenhum item nesta categoria esta semana.\n";
  }
  return text;
}

async function formatWeeklyMessage(
  groupName: string,
  data: WeeklyGroupData,
  dateRange: string
): Promise<string> {
  const name = groupName.toUpperCase();
  const narrative = await generateWeeklySummary(name, data, dateRange);

  return `📊 ${name}
Resumo Semanal — ${dateRange}

${narrative}

Bom fim de semana! 🚀`;
}

async function sendWhatsAppMessage(
  apiUrl: string,
  token: string,
  groupId: string,
  message: string
): Promise<boolean> {
  try {
    const normalizedUrl = normalizeApiUrl(apiUrl);
    const endpoint = `${normalizedUrl}/send/text`;

    console.log(`Sending weekly message to ${groupId}...`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify({
        number: groupId,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send message: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`Weekly message sent successfully to ${groupId}`);
    return true;
  } catch (error) {
    console.error(`Error sending message: ${error}`);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const previewOnly = body.previewOnly === true;
    const targetGroupId = body.targetGroupId || null;

    // Check if weekly report is enabled
    const { data: enabledSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "weekly_report_enabled")
      .single();

    if (!previewOnly && enabledSetting?.value === "false") {
      console.log("Weekly report is disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Weekly report is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get default WhatsApp instance
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("is_default", true)
      .single();

    if (instanceError || !instance) {
      console.error("No default WhatsApp instance found:", instanceError);
      return new Response(
        JSON.stringify({ success: false, error: "No default WhatsApp instance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active client groups
    let groupsQuery = supabase
      .from("monitored_groups")
      .select("id, name, whatsapp_id")
      .eq("is_client_group", true)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("name");

    if (targetGroupId) {
      groupsQuery = groupsQuery.eq("id", targetGroupId);
    }

    const { data: groups, error: groupsError } = await groupsQuery;

    if (groupsError || !groups || groups.length === 0) {
      console.log("No active client groups found");
      return new Response(
        JSON.stringify({ success: true, message: "No groups found", previews: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${groups.length} active client groups for weekly report`);

    // Calculate week range (Monday to Friday, BRT)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    
    // Find the Monday of this week (BRT)
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - mondayOffset);
    weekStart.setUTCHours(3, 0, 0, 0); // 00:00 BRT = 03:00 UTC

    const weekEnd = new Date(now);
    weekEnd.setUTCHours(3, 0, 0, 0);
    if (now.getUTCHours() < 3) {
      weekEnd.setUTCDate(weekEnd.getUTCDate() - 1);
    }

    const weekStartISO = weekStart.toISOString();
    const weekEndISO = now.toISOString();

    const dateRange = formatDateRange(
      new Date(weekStart.getTime() - 3 * 60 * 60 * 1000),
      new Date(now.getTime() - 3 * 60 * 60 * 1000)
    );

    console.log(`Week range: ${weekStartISO} to ${weekEndISO} (${dateRange})`);

    const groupIds = groups.map((g) => g.id);

    // Fetch messages for the week
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("group_id, content, sender_name, sender_role, created_at")
      .in("group_id", groupIds)
      .gte("created_at", weekStartISO)
      .lte("created_at", weekEndISO)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (messagesError) throw messagesError;

    // Organize messages by group
    const messagesByGroup = new Map<string, WeeklyGroupData["messages"]>();
    for (const msg of messagesData || []) {
      if (!messagesByGroup.has(msg.group_id)) {
        messagesByGroup.set(msg.group_id, []);
      }
      messagesByGroup.get(msg.group_id)!.push({
        content: msg.content,
        sender_name: msg.sender_name,
        sender_role: msg.sender_role,
        created_at: msg.created_at,
      });
    }

    // Fetch demands for the week
    const TICKET_BATCH = 50;
    const ticketGroupMap = new Map<string, string>();
    let allDemands: WeeklyGroupData["demands"] & { ticket_id: string }[] = [];

    for (let i = 0; i < groupIds.length; i += TICKET_BATCH) {
      const batchGroupIds = groupIds.slice(i, i + TICKET_BATCH);

      const { data: batchTickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id, group_id")
        .in("group_id", batchGroupIds);

      if (ticketsError) throw ticketsError;
      if (!batchTickets || batchTickets.length === 0) continue;

      for (const t of batchTickets) {
        ticketGroupMap.set(t.id, t.group_id);
      }

      const batchTicketIds = batchTickets.map((t) => t.id);
      const DEMAND_BATCH = 100;

      for (let j = 0; j < batchTicketIds.length; j += DEMAND_BATCH) {
        const demandBatchIds = batchTicketIds.slice(j, j + DEMAND_BATCH);

        const { data: demands, error: demandsError } = await supabase
          .from("ticket_demands")
          .select("description, status, category, priority, resolved_by_name, created_at, resolved_at, ticket_id")
          .in("ticket_id", demandBatchIds)
          .gte("created_at", weekStartISO)
          .order("created_at", { ascending: true });

        if (demandsError) throw demandsError;
        if (demands) allDemands.push(...(demands as any));
      }
    }

    console.log(`Found ${allDemands.length} demands for the week`);

    // Build weekly data per group
    const weeklyData: { group: MonitoredGroup; data: WeeklyGroupData }[] = groups
      .map((group) => {
        const groupDemands = allDemands
          .filter((d) => ticketGroupMap.get((d as any).ticket_id) === group.id)
          .map(({ ticket_id, ...rest }) => rest);

        return {
          group,
          data: {
            group,
            demands: groupDemands,
            messages: messagesByGroup.get(group.id) || [],
          } as WeeklyGroupData,
        };
      })
      .filter((item) => item.data.demands.length > 0 || item.data.messages.length > 0);

    console.log(`${weeklyData.length} groups have activity this week`);

    // Preview mode
    if (previewOnly) {
      console.log(`Preview mode: generating weekly messages for ${weeklyData.length} groups`);
      const CONCURRENCY = 5;
      const previews: WeeklyPreview[] = [];

      for (let i = 0; i < weeklyData.length; i += CONCURRENCY) {
        const batch = weeklyData.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async ({ group, data }) => {
            try {
              const message = await formatWeeklyMessage(group.name, data, dateRange);
              const resolved = data.demands.filter((d) => d.status === "resolved");
              const pending = data.demands.filter((d) => d.status === "open");
              return {
                groupId: group.id,
                groupName: group.name,
                whatsappId: group.whatsapp_id,
                demandsCount: data.demands.length,
                resolvedCount: resolved.length,
                pendingCount: pending.length,
                messagesCount: data.messages.length,
                message,
              } as WeeklyPreview;
            } catch (error) {
              return {
                groupId: group.id,
                groupName: group.name,
                whatsappId: group.whatsapp_id,
                demandsCount: data.demands.length,
                resolvedCount: 0,
                pendingCount: 0,
                messagesCount: data.messages.length,
                message: null,
                error: String(error),
              } as WeeklyPreview;
            }
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") previews.push(r.value);
        }
      }

      // Include groups without activity
      for (const group of groups) {
        if (!previews.find((p) => p.groupId === group.id)) {
          previews.push({
            groupId: group.id,
            groupName: group.name,
            whatsappId: group.whatsapp_id,
            demandsCount: 0,
            resolvedCount: 0,
            pendingCount: 0,
            messagesCount: 0,
            message: null,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, previews, dateRange }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send mode - process in batches
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < weeklyData.length; i += BATCH_SIZE) {
      const batch = weeklyData.slice(i, i + BATCH_SIZE);

      for (const { group, data } of batch) {
        try {
          const message = await formatWeeklyMessage(group.name, data, dateRange);
          const success = await sendWhatsAppMessage(
            instance.api_url,
            instance.api_token,
            group.whatsapp_id,
            message
          );

          if (success) sentCount++;
          else failedCount++;
        } catch (error) {
          console.error(`Error sending weekly to ${group.name}: ${error}`);
          failedCount++;
        }

        await sleep(2000);
      }
    }

    console.log(`Weekly report complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Weekly report sent",
        details: {
          totalGroups: weeklyData.length,
          messagesSent: sentCount,
          messagesFailed: failedCount,
          dateRange,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating weekly report:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
