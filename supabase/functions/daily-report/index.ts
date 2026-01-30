import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MonitoredGroup {
  id: string;
  name: string;
  whatsapp_id: string;
}

interface TicketDemand {
  id: string;
  description: string;
  status: string;
  resolution_time_minutes: number | null;
  sla_exceeded: boolean;
  created_at: string;
  ticket_id: string;
}

interface GroupReport {
  group: MonitoredGroup;
  demands: TicketDemand[];
  totalDemands: number;
  resolvedCount: number;
  pendingCount: number;
  slaExceededCount: number;
  avgResolutionTime: number | null;
}

// Normalize API URL to include https://
function normalizeApiUrl(url: string): string {
  if (!url) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

// Format date as DD/MM
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

// Format individual group message - Commercial format for clients
function formatGroupMessage(report: GroupReport, dateStr: string): string {
  const groupName = report.group.name.toUpperCase();
  
  // No demands case
  if (report.totalDemands === 0) {
    return `${groupName}
Resumo de Atendimento - ${dateStr}

Olá! Hoje não houve novas demandas registradas no seu canal de atendimento.

Estamos à disposição para qualquer necessidade!

Atenciosamente,
Equipe de Atendimento`;
  }

  // Build topics list
  const topicsList = report.demands
    .map((demand) => {
      const statusText = demand.status === "resolved" ? "Concluído" : "Em andamento";
      return `• ${demand.description} - ${statusText}`;
    })
    .join("\n");

  // Build conclusion
  let conclusion: string;
  const topicWord = report.totalDemands === 1 ? "assunto" : "assuntos";
  const finalizedWord = report.resolvedCount === 1 ? "finalizado" : "finalizados";
  
  if (report.resolvedCount === report.totalDemands) {
    conclusion = `Hoje ${report.totalDemands === 1 ? "foi tratado" : "foram tratados"} ${report.totalDemands} ${topicWord} no seu canal de atendimento, ${report.totalDemands === 1 ? "sendo ele já" : "todos já"} ${finalizedWord}. Excelente dia de parceria!`;
  } else if (report.pendingCount > 0) {
    const pendingWord = report.pendingCount === 1 ? "está" : "estão";
    const followupWord = report.pendingCount === 1 ? "será concluído" : "serão concluídos";
    conclusion = `Hoje ${report.totalDemands === 1 ? "foi tratado" : "foram tratados"} ${report.totalDemands} ${topicWord} no seu canal de atendimento, sendo ${report.resolvedCount} já ${finalizedWord}. ${report.pendingCount === 1 ? "O demais" : "Os demais"} ${pendingWord} em acompanhamento e ${followupWord} em breve.`;
  } else {
    conclusion = `Hoje ${report.totalDemands === 1 ? "foi tratado" : "foram tratados"} ${report.totalDemands} ${topicWord} no seu canal de atendimento.`;
  }

  return `${groupName}
Resumo de Atendimento - ${dateStr}

Olá! Segue o resumo das principais atividades de hoje:

TÓPICOS TRATADOS

${topicsList}

CONCLUSÃO

${conclusion}

Agradecemos a parceria!

Atenciosamente,
Equipe de Atendimento`;
}

// Format general summary message - Corporate format for clients
function formatSummaryMessage(reports: GroupReport[], dateStr: string): string {
  const totalDemands = reports.reduce((sum, r) => sum + r.totalDemands, 0);
  const totalResolved = reports.reduce((sum, r) => sum + r.resolvedCount, 0);
  const totalPending = reports.reduce((sum, r) => sum + r.pendingCount, 0);

  // Find highlight groups (100% resolved)
  const highlightGroups = reports
    .filter((r) => r.totalDemands > 0 && r.resolvedCount === r.totalDemands)
    .map((r) => `• ${r.group.name}: 100% concluído`);

  let message = `RESUMO GERAL DE ATENDIMENTOS - ${dateStr}

Prezados parceiros,

Segue o consolidado das atividades do dia:

• Total de demandas atendidas: ${totalDemands}
• Demandas finalizadas: ${totalResolved}
• Em acompanhamento: ${totalPending}`;

  if (highlightGroups.length > 0) {
    message += `

DESTAQUES DO DIA

${highlightGroups.join("\n")}`;
  }

  message += `

Agradecemos a confiança e seguimos à disposição!

Equipe de Atendimento`;

  return message;
}

// Send message via UAZAPI
async function sendWhatsAppMessage(
  apiUrl: string,
  token: string,
  groupId: string,
  message: string
): Promise<boolean> {
  try {
    const normalizedUrl = normalizeApiUrl(apiUrl);
    const endpoint = `${normalizedUrl}/send/text`;

    console.log(`Sending message to ${groupId}...`);

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

    console.log(`Message sent successfully to ${groupId}`);
    return true;
  } catch (error) {
    console.error(`Error sending message: ${error}`);
    return false;
  }
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting daily report generation...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if daily report is enabled
    const { data: enabledSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "daily_report_enabled")
      .single();

    if (enabledSetting?.value === "false") {
      console.log("Daily report is disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Daily report is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target group ID
    const { data: groupIdSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "daily_report_group_id")
      .single();

    const targetGroupId = groupIdSetting?.value || "120363422213957419@g.us";

    // Check if summary should be included
    const { data: includeSummarySetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "daily_report_include_summary")
      .single();

    const includeSummary = includeSummarySetting?.value !== "false";

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active client groups
    const { data: groups, error: groupsError } = await supabase
      .from("monitored_groups")
      .select("id, name, whatsapp_id")
      .eq("is_client_group", true)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("name");

    if (groupsError) {
      console.error("Error fetching groups:", groupsError);
      throw groupsError;
    }

    if (!groups || groups.length === 0) {
      console.log("No active client groups found");
      return new Response(
        JSON.stringify({ success: true, message: "No active client groups" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${groups.length} active client groups`);

    // Calculate today's date range (BRT timezone - UTC-3)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(3, 0, 0, 0); // 00:00 BRT = 03:00 UTC
    
    // If current UTC time is before 03:00, we need yesterday's BRT date
    if (now.getUTCHours() < 3) {
      todayStart.setDate(todayStart.getDate() - 1);
    }

    const todayStartISO = todayStart.toISOString();
    const dateStr = formatDate(new Date(todayStart.getTime() - 3 * 60 * 60 * 1000)); // Convert to BRT for display

    console.log(`Fetching demands from ${todayStartISO} (${dateStr})`);

    // Fetch demands for all groups in one query
    const groupIds = groups.map((g) => g.id);
    
    const { data: allTickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, group_id")
      .in("group_id", groupIds);

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      throw ticketsError;
    }

    const ticketIds = allTickets?.map((t) => t.id) || [];
    const ticketGroupMap = new Map(allTickets?.map((t) => [t.id, t.group_id]) || []);

    let allDemands: TicketDemand[] = [];
    if (ticketIds.length > 0) {
      const { data: demands, error: demandsError } = await supabase
        .from("ticket_demands")
        .select("id, description, status, resolution_time_minutes, sla_exceeded, created_at, ticket_id")
        .in("ticket_id", ticketIds)
        .gte("created_at", todayStartISO)
        .order("created_at", { ascending: true });

      if (demandsError) {
        console.error("Error fetching demands:", demandsError);
        throw demandsError;
      }

      allDemands = demands || [];
    }

    console.log(`Found ${allDemands.length} demands for today`);

    // Build reports for each group
    const reports: GroupReport[] = groups.map((group) => {
      const groupDemands = allDemands.filter(
        (d) => ticketGroupMap.get(d.ticket_id) === group.id
      );

      const resolvedDemands = groupDemands.filter((d) => d.status === "resolved");
      const pendingDemands = groupDemands.filter((d) => d.status === "open");
      const slaExceeded = groupDemands.filter((d) => d.sla_exceeded);

      const resolutionTimes = resolvedDemands
        .filter((d) => d.resolution_time_minutes)
        .map((d) => d.resolution_time_minutes!);
      
      const avgResolutionTime =
        resolutionTimes.length > 0
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          : null;

      return {
        group,
        demands: groupDemands,
        totalDemands: groupDemands.length,
        resolvedCount: resolvedDemands.length,
        pendingCount: pendingDemands.length,
        slaExceededCount: slaExceeded.length,
        avgResolutionTime,
      };
    });

    // Send individual messages for each group
    let sentCount = 0;
    let failedCount = 0;

    for (const report of reports) {
      const message = formatGroupMessage(report, dateStr);
      const success = await sendWhatsAppMessage(
        instance.api_url,
        instance.api_token,
        targetGroupId,
        message
      );

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Wait 2 seconds between messages to avoid rate limiting
      await sleep(2000);
    }

    // Send summary message if enabled
    if (includeSummary) {
      const summaryMessage = formatSummaryMessage(reports, dateStr);
      const summarySuccess = await sendWhatsAppMessage(
        instance.api_url,
        instance.api_token,
        targetGroupId,
        summaryMessage
      );

      if (summarySuccess) {
        sentCount++;
        console.log("Summary message sent successfully");
      } else {
        failedCount++;
        console.error("Failed to send summary message");
      }
    }

    console.log(`Daily report completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily report sent: ${sentCount} messages`,
        details: {
          groupsProcessed: groups.length,
          messagesSent: sentCount,
          messagesFailed: failedCount,
          totalDemands: allDemands.length,
          date: dateStr,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating daily report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
