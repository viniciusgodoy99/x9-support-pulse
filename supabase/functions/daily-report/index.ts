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

interface BatchPayload {
  offset: number;
  reports: GroupReport[];
  instanceData: { api_url: string; api_token: string };
  dateStr: string;
}

function normalizeApiUrl(url: string): string {
  if (!url) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

async function generateNarrativeSummary(
  groupName: string,
  demands: TicketDemand[]
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not configured, using fallback");
    return demands.map((d) => d.description).join(". ") + ".";
  }

  const topicsList = demands.map((d) => `- ${d.description}`).join("\n");

  const systemPrompt = `Você é um especialista em copywriting responsável por criar resumos diários de conversas com clientes. Seu objetivo é transformar interações e acontecimentos do dia em mensagens humanizadas, fluidas e focadas em progresso.

DIRETRIZES OBRIGATÓRIAS:

Tom de voz: Profissional, mas conversacional e acolhedor

Evite: Linguagem de demandas, listas de tarefas, cobranças ou senso de urgência

Foque em: Diálogo, alinhamentos, progressos naturais e colaboração

ESTILO DE ESCRITA:

Use verbos como "conversamos", "alinhamos", "ficou combinado", "vamos receber"

Conecte as informações de forma fluida, como uma narrativa

Transmita sensação de colaboração e andamento natural

Evite bullet points ou linguagem técnica demais

FORMATO DE SAÍDA:

Retorne APENAS o corpo da mensagem (2-3 linhas sobre o que foi conversado/alinhado, focando no diálogo e nos próximos passos de forma natural).

NÃO inclua cabeçalho, data ou despedida - apenas o texto narrativo.`;

  try {
    console.log(`Generating narrative for ${groupName} with ${demands.length} topics...`);

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
            {
              role: "user",
              content: `Cliente: ${groupName}\n\nTópicos do dia:\n${topicsList}`,
            },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status} - ${errorText}`);
      return demands.map((d) => d.description).join(". ") + ".";
    }

    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content?.trim();

    if (!narrative) {
      console.error("Empty narrative from AI, using fallback");
      return demands.map((d) => d.description).join(". ") + ".";
    }

    console.log(`Generated narrative: ${narrative.substring(0, 100)}...`);
    return narrative;
  } catch (error) {
    console.error(`Error generating narrative: ${error}`);
    return demands.map((d) => d.description).join(". ") + ".";
  }
}

async function formatGroupMessage(
  report: GroupReport,
  dateStr: string
): Promise<string> {
  const groupName = report.group.name.toUpperCase();
  const narrative = await generateNarrativeSummary(groupName, report.demands);

  return `📋 ${groupName}
Resumo do dia ${dateStr}

${narrative}

Até amanhã! 👋`;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Prepare all reports (only on first invocation)
async function prepareReports(supabase: ReturnType<typeof createClient>): Promise<{
  reports: GroupReport[];
  dateStr: string;
  instance: { api_url: string; api_token: string };
} | null> {
  // Check if daily report is enabled
  const { data: enabledSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "daily_report_enabled")
    .single();

  if (enabledSetting?.value === "false") {
    console.log("Daily report is disabled");
    return null;
  }

  // Get default WhatsApp instance
  const { data: instance, error: instanceError } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("is_default", true)
    .single();

  if (instanceError || !instance) {
    console.error("No default WhatsApp instance found:", instanceError);
    return null;
  }

  // Get all active client groups
  const { data: groups, error: groupsError } = await supabase
    .from("monitored_groups")
    .select("id, name, whatsapp_id")
    .eq("is_client_group", true)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("name");

  if (groupsError || !groups || groups.length === 0) {
    console.log("No active client groups found");
    return null;
  }

  console.log(`Found ${groups.length} active client groups`);

  // Calculate today's date range (BRT timezone - UTC-3)
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(3, 0, 0, 0);

  if (now.getUTCHours() < 3) {
    todayStart.setDate(todayStart.getDate() - 1);
  }

  const todayStartISO = todayStart.toISOString();
  const dateStr = formatDate(new Date(todayStart.getTime() - 3 * 60 * 60 * 1000));

  console.log(`Fetching demands from ${todayStartISO} (${dateStr})`);

  // Fetch demands
  const groupIds = groups.map((g) => g.id);

  const { data: allTickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, group_id")
    .in("group_id", groupIds);

  if (ticketsError) throw ticketsError;

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

    if (demandsError) throw demandsError;
    allDemands = demands || [];
  }

  console.log(`Found ${allDemands.length} demands for today`);

  // Build reports and filter only groups with demands
  const reports: GroupReport[] = groups
    .map((group) => {
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
    })
    .filter((r) => r.totalDemands > 0);

  console.log(`${reports.length} groups have demands today`);

  return {
    reports,
    dateStr,
    instance: { api_url: instance.api_url, api_token: instance.api_token },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse body for batch parameters
    const body: Partial<BatchPayload> = await req.json().catch(() => ({}));
    const offset = body.offset || 0;
    const precomputedReports = body.reports || null;
    const precomputedInstance = body.instanceData || null;
    const precomputedDateStr = body.dateStr || null;

    let reports: GroupReport[];
    let instanceData: { api_url: string; api_token: string };
    let dateStr: string;

    if (offset === 0 && !precomputedReports) {
      // First invocation: prepare all data
      console.log("Starting daily report generation (first batch)...");
      const prepared = await prepareReports(supabase);

      if (!prepared) {
        return new Response(
          JSON.stringify({ success: true, message: "No reports to send" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      reports = prepared.reports;
      instanceData = prepared.instance;
      dateStr = prepared.dateStr;

      console.log(`Total groups with demands: ${reports.length}, processing in batches of ${BATCH_SIZE}`);
    } else {
      // Subsequent invocation: use precomputed data
      reports = precomputedReports!;
      instanceData = precomputedInstance!;
      dateStr = precomputedDateStr!;
      console.log(`Continuing batch at offset ${offset}, ${reports.length} total groups`);
    }

    // Process current batch
    const batch = reports.slice(offset, offset + BATCH_SIZE);
    console.log(`Iniciando processamento do lote: Offset ${offset + 1} a ${offset + batch.length} de ${reports.length} grupos`);

    let sentCount = 0;
    let failedCount = 0;

    for (const report of batch) {
      try {
        const message = await formatGroupMessage(report, dateStr);
        const success = await sendWhatsAppMessage(
          instanceData.api_url,
          instanceData.api_token,
          report.group.whatsapp_id,
          message
        );

        if (success) sentCount++;
        else failedCount++;
      } catch (error) {
        console.error(`Erro ao enviar para o grupo ${report.group.whatsapp_id} (${report.group.name}): ${error}`);
        failedCount++;
      }

      // 2s between messages to avoid rate limiting
      await sleep(2000);
    }

    console.log(`Lote finalizado: ${sentCount} enviados, ${failedCount} falharam`);

    // If more groups remain, self-invoke for next batch
    const nextOffset = offset + BATCH_SIZE;
    if (nextOffset < reports.length) {
      console.log(`Invoking next batch at offset ${nextOffset} (${reports.length - nextOffset} groups remaining)`);

      const selfInvokeResponse = await fetch(
        `${supabaseUrl}/functions/v1/daily-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            offset: nextOffset,
            reports,
            instanceData,
            dateStr,
          } as BatchPayload),
        }
      );

      const selfResult = await selfInvokeResponse.text();
      if (!selfInvokeResponse.ok) {
        console.error(`Erro na chamada recursiva para offset ${nextOffset}: ${selfInvokeResponse.status} - ${selfResult}`);
        throw new Error(`Recursive call failed for offset ${nextOffset}: ${selfInvokeResponse.status}`);
      }
      console.log(`Proximo lote acionado com sucesso: Offset ${nextOffset}`);
    } else {
      console.log("All batches completed!");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch ${Math.floor(offset / BATCH_SIZE) + 1} complete`,
        details: {
          batchOffset: offset,
          batchSize: batch.length,
          totalGroups: reports.length,
          messagesSent: sentCount,
          messagesFailed: failedCount,
          hasMoreBatches: nextOffset < reports.length,
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
