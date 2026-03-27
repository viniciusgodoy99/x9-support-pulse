import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Message {
  id: string;
  sender_name: string | null;
  sender_phone: string | null;
  sender_role: string;
  content: string;
  created_at: string;
  group_role?: "cs" | "client" | "traffic_manager" | "unknown";
}

interface Demand {
  description: string;
  status: "open" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  category: "duvida" | "solicitacao" | "reclamacao" | "agendamento" | "suporte_tecnico" | "financeiro" | "feedback" | "geral";
  resolution_time_minutes?: number;
  resolved_by_name?: string;
}

interface AnalysisResult {
  demands: Demand[];
  all_resolved: boolean;
  summary: string;
}

// ============ PRIORITY CALCULATION FUNCTIONS ============

/**
 * Detects urgency keywords in client messages
 */
function hasUrgencyKeywords(messages: Message[]): boolean {
  const urgencyKeywords = [
    "urgente", "urgência", "urgencia",
    "preciso agora", "imediato", "imediatamente",
    "o mais rápido possível", "mais rápido possível",
    "asap", "pressa", "emergência", "emergencia",
    "emergencial", "não pode esperar", "nao pode esperar",
    "prioridade", "prioritário", "prioritario"
  ];

  // Check only client messages
  const clientMessages = messages.filter(m =>
    m.group_role === "client" || m.sender_role === "client"
  );

  for (const msg of clientMessages) {
    const content = msg.content.toLowerCase();
    if (urgencyKeywords.some(keyword => content.includes(keyword))) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates objective priority based on time open, SLA, and urgency keywords
 * Priority hierarchy:
 * 1. Time open > 2x SLA = urgent
 * 2. Client used urgency keywords = urgent
 * 3. Time open > 1x SLA = high
 * 4. Category is "duvida" (simple question) = low
 * 5. Normal request = normal
 */
function calculateObjectivePriority(
  category: string,
  timeOpenMinutes: number,
  slaLimitMinutes: number,
  hasUrgencyWords: boolean
): "low" | "normal" | "high" | "urgent" {
  // 1. Time open > 2x SLA = urgent
  if (timeOpenMinutes > slaLimitMinutes * 2) {
    return "urgent";
  }

  // 2. Client used urgency keywords = urgent
  if (hasUrgencyWords) {
    return "urgent";
  }

  // 3. Time open > 1x SLA = high
  if (timeOpenMinutes > slaLimitMinutes) {
    return "high";
  }

  // 4. Simple question = low
  if (category === "duvida") {
    return "low";
  }

  // 5. Normal request = normal
  return "normal";
}

// ============ BUSINESS HOURS CALCULATION ============

/**
 * Calculates the number of business minutes between two dates.
 * Business hours: Monday-Friday, 08:00 - 18:00
 */
function calculateBusinessMinutes(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Clone to avoid modifying original dates
  let current = new Date(start);
  let minutes = 0;

  // Helper to check if a specific time is within business hours
  const isBusinessTime = (date: Date) => {
    const day = date.getDay();
    const hour = date.getHours();
    // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return false;
    // 08:00 to 18:00
    if (hour < 8 || hour >= 18) return false;
    return true;
  };

  // If start and end are on the same day
  if (start.toDateString() === end.toDateString()) {
    // If it's a weekend, 0 minutes
    const day = start.getDay();
    if (day === 0 || day === 6) return 0;

    // Calculate overlap with 08:00-18:00
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const endHour = end.getHours();
    const endMin = end.getMinutes();

    const startTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;

    const businessStart = 8 * 60; // 08:00
    const businessEnd = 18 * 60;  // 18:00

    // Effective start: max(start, 08:00)
    const effectiveStart = Math.max(startTimeInMinutes, businessStart);
    // Effective end: min(end, 18:00)
    const effectiveEnd = Math.min(endTimeInMinutes, businessEnd);

    if (effectiveStart < effectiveEnd) {
      return effectiveEnd - effectiveStart;
    }
    return 0;
  }

  // Iterate day by day (for simplicity and robustness)
  // 1. Remaining minutes in start day
  if (isBusinessTime(start) || (start.getDay() !== 0 && start.getDay() !== 6 && start.getHours() < 18)) {
    const day = start.getDay();
    if (day !== 0 && day !== 6) {
      const startHour = start.getHours();
      const startMin = start.getMinutes();
      const startTimeInMinutes = startHour * 60 + startMin;
      const businessStart = 8 * 60;
      const businessEnd = 18 * 60;

      const effectiveStart = Math.max(startTimeInMinutes, businessStart);
      if (effectiveStart < businessEnd) {
        minutes += businessEnd - effectiveStart;
      }
    }
  }

  // Move to next day 00:00
  current.setDate(current.getDate() + 1);
  current.setHours(0, 0, 0, 0);

  // 2. Full days between
  while (current.toDateString() !== end.toDateString()) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      minutes += 10 * 60; // 10 hours per business day
    }
    current.setDate(current.getDate() + 1);
  }

  // 3. Minutes in end day
  const endDay = end.getDay();
  if (endDay !== 0 && endDay !== 6) {
    const endHour = end.getHours();
    const endMin = end.getMinutes();
    const endTimeInMinutes = endHour * 60 + endMin;
    const businessStart = 8 * 60;
    const businessEnd = 18 * 60;

    // Effective end: min(end, 18:00)
    const effectiveEnd = Math.min(endTimeInMinutes, businessEnd);

    if (effectiveEnd > businessStart) {
      minutes += effectiveEnd - businessStart;
    }
  }

  return minutes;
}

// ============ SLA NOTIFICATION FUNCTIONS ============

async function sendWhatsAppMessage(groupJid: string, message: string): Promise<boolean> {
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");

  if (!apiUrl || !apiKey) {
    console.error("UAZAPI credentials not configured");
    return false;
  }
  try {
    // Normalizar URL - adicionar https:// se necessário
    const baseUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;

    const response = await fetch(`${baseUrl}/send/text`, {
      method: "POST",
      headers: {
        "token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: groupJid,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send WhatsApp message: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`WhatsApp message sent successfully to ${groupJid}`);
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

async function sendSlaBreachNotifications(supabase: SupabaseClient, testMode = false, targetGroupId: string | null = null): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  // Check if notifications are enabled
  const { data: enabledSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "sla_notifications_enabled")
    .single();

  if (!enabledSetting || enabledSetting.value !== "true") {
    console.log("SLA notifications are disabled");
    return { sent, errors };
  }

  // Check if we're within business hours (Mon-Fri, 08:00-18:00 BRT) — skip in testMode
  if (!testMode) {
    const nowBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dayOfWeek = nowBRT.getDay(); // 0=Sun, 6=Sat
    const hour = nowBRT.getHours();

    if (dayOfWeek === 0 || dayOfWeek === 6 || hour < 8 || hour >= 18) {
      console.log("Outside business hours (BRT), skipping SLA notifications");
      return { sent, errors };
    }
  } else {
    console.log("testMode enabled — skipping business hours check");
  }

  // Get notification group ID
  const { data: groupIdSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "sla_notification_group_id")
    .single();

  if (!groupIdSetting?.value) {
    console.log("No notification group configured");
    return { sent, errors };
  }

  const notificationGroupId = groupIdSetting.value;

  // Get global SLA limit
  const { data: slaSettings } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "global_sla_minutes")
    .single();

  const slaLimitMinutes = slaSettings?.value ? parseInt(slaSettings.value) : 30;

  // Find demands with SLA exceeded that haven't been notified
  const { data: demandsToNotify, error: demandsError } = await supabase
    .from("ticket_demands")
    .select(`
      id,
      description,
      priority,
      created_at,
      ticket_id,
      tickets (
        id,
        group_id,
        customer_name,
        customer_phone,
        monitored_groups (
          name
        )
      )
    `)
    .eq("sla_exceeded", true)
    .eq("status", "open");

  if (demandsError) {
    console.error("Error fetching demands for SLA notifications:", demandsError);
    return { sent, errors };
  }

  let filteredDemands = demandsToNotify || [];

  // Filter by target group if specified (test mode)
  if (targetGroupId && filteredDemands.length > 0) {
    // targetGroupId is the monitored_groups.id — filter demands whose ticket belongs to that group
    filteredDemands = filteredDemands.filter(d => (d.tickets as any)?.group_id === targetGroupId);
    console.log(`Filtered to ${filteredDemands.length} demands for target group ${targetGroupId}`);
  }

  if (filteredDemands.length === 0) {
    console.log("No SLA breached demands to notify");
    return { sent, errors };
  }

  console.log(`Found ${filteredDemands.length} demands with SLA breach to check for notifications`);

  for (const demand of filteredDemands) {
    // Count how many times this demand has already been notified
    const { data: existingNotifications, error: notifCountError } = await supabase
      .from("sla_notifications")
      .select("id")
      .eq("demand_id", demand.id)
      .eq("notification_type", "sla_breach");

    const previousCount = (existingNotifications || []).length;

    // Get ticket ID and group ID for queries
    const ticketId = (demand.tickets as any)?.id;
    const groupId = (demand.tickets as any)?.group_id;

    // Get all group members with role = 'client' (real clients only)
    let clientPhoneNumbers: string[] = [];
    if (groupId) {
      const { data: clientMembers } = await supabase
        .from("group_members")
        .select("phone_number")
        .eq("group_id", groupId)
        .eq("role", "client");

      clientPhoneNumbers = (clientMembers || []).map(m => m.phone_number);
      console.log(`Found ${clientPhoneNumbers.length} client members in group ${groupId}`);
    }

    // Calculate time open - use first REAL client message timestamp instead of demand created_at
    let requestTimestamp = new Date(demand.created_at);

    // Get the timestamp of the first message from an actual client member
    if (ticketId && clientPhoneNumbers.length > 0) {
      const { data: firstClientMessage } = await supabase
        .from("messages")
        .select("created_at, sender_phone")
        .eq("ticket_id", ticketId)
        .in("sender_phone", clientPhoneNumbers)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstClientMessage?.created_at) {
        requestTimestamp = new Date(firstClientMessage.created_at);
        console.log(`Using original request timestamp from real client: ${firstClientMessage.created_at}`);
      }
    }

    const timeOpenMinutes = calculateBusinessMinutes(requestTimestamp, new Date());

    // Get group name
    const groupName = (demand.tickets as any)?.monitored_groups?.name || "Grupo desconhecido";

    // Format priority for display
    const priorityMap: Record<string, string> = {
      low: "🟢 Baixa",
      normal: "🟡 Normal",
      high: "🟠 Alta",
      urgent: "🔴 Urgente"
    };
    const priorityDisplay = priorityMap[demand.priority] || demand.priority;

    // Get customer info - with fallback logic using REAL clients only
    let customerName = (demand.tickets as any)?.customer_name;

    // If name is empty, generic, or null - try to get from first REAL client message
    if (!customerName || customerName === "Cliente" || customerName === "Cliente desconhecido") {
      if (ticketId && clientPhoneNumbers.length > 0) {
        const { data: firstClientMessage } = await supabase
          .from("messages")
          .select("sender_name, sender_phone")
          .eq("ticket_id", ticketId)
          .in("sender_phone", clientPhoneNumbers)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstClientMessage?.sender_name && firstClientMessage.sender_name !== "Cliente") {
          customerName = firstClientMessage.sender_name;
          console.log(`Found customer name from real client message: ${customerName}`);
        }
      }
    }

    // Final fallback
    customerName = customerName || "Cliente desconhecido";

    // Build alert message with counter
    const alertCount = previousCount + 1;
    const counterSuffix = alertCount > 1 ? ` (${alertCount}x)` : "";
    const alertMessage = `⚠️ *ALERTA DE SLA${counterSuffix}*\n\n` +
      `📋 *Grupo:* ${groupName}\n` +
      `👤 *Solicitante:* ${customerName}\n` +
      `📝 *Demanda:* ${demand.description}\n` +
      `⏱️ *Tempo aberto:* ${timeOpenMinutes} minutos\n` +
      `🎯 *Limite SLA:* ${slaLimitMinutes} minutos\n` +
      `${priorityDisplay}\n\n` +
      `Por favor, verifique o atendimento!`;

    // Send notification to X9 group
    const messageSent = await sendWhatsAppMessage(notificationGroupId, alertMessage);

    if (messageSent) {
      // Record notification
      const { error: insertError } = await supabase
        .from("sla_notifications")
        .insert({
          demand_id: demand.id,
          notification_type: "sla_breach",
        });

      if (insertError) {
        console.error(`Error recording notification for demand ${demand.id}:`, insertError);
        errors++;
      } else {
        console.log(`SLA breach notification #${alertCount} sent for demand ${demand.id}`);
        sent++;
      }

      // Send direct message to CS members in the group
      if (groupId) {
        const { data: csMembers } = await supabase
          .from("group_members")
          .select("phone_number, name")
          .eq("group_id", groupId)
          .eq("role", "cs");

        if (csMembers && csMembers.length > 0) {
          // Check if CS direct notifications are enabled
          const { data: csNotifSetting } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "sla_cs_direct_notification")
            .single();

          const csNotifEnabled = csNotifSetting?.value !== "false"; // enabled by default

          if (csNotifEnabled) {
            for (const cs of csMembers) {
              const csName = cs.name || "CS";
              const directMessage = `⚠️ *ALERTA DE SLA${counterSuffix}*\n\n` +
                `Olá ${csName}, uma demanda no grupo *${groupName}* ultrapassou o SLA.\n\n` +
                `👤 *Solicitante:* ${customerName}\n` +
                `📝 *Demanda:* ${demand.description}\n` +
                `⏱️ *Tempo aberto:* ${timeOpenMinutes} minutos\n` +
                `🎯 *Limite SLA:* ${slaLimitMinutes} minutos\n` +
                `${priorityDisplay}\n\n` +
                `Por favor, verifique o atendimento!`;

              const csPhone = cs.phone_number.replace(/\D/g, "");
              const csJid = csPhone.includes("@") ? csPhone : `${csPhone}@s.whatsapp.net`;

              const csSent = await sendWhatsAppMessage(csJid, directMessage);
              if (csSent) {
                console.log(`Direct SLA alert sent to CS ${csName} (${csPhone}) for demand ${demand.id}`);
              } else {
                console.error(`Failed to send direct SLA alert to CS ${csName} (${csPhone})`);
              }
            }
          } else {
            console.log("CS direct notifications are disabled");
          }
        } else {
          console.log(`No CS members found in group ${groupId} for direct notification`);
        }
      }
    } else {
      errors++;
    }
  }

  console.log(`SLA notifications complete: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}

async function analyzeConversation(messages: Message[]): Promise<AnalysisResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    throw new Error("AI configuration missing");
  }

  // Format conversation for AI - include group_role for context
  const conversationText = messages.map(m => {
    // Determine display role based on group_role
    let roleDisplay: string;
    if (m.group_role === "cs" || m.sender_role === "cs") {
      roleDisplay = "Atendente (CS)";
    } else if (m.group_role === "traffic_manager") {
      roleDisplay = "Gestor de Tráfego (Equipe)";
    } else if (m.group_role === "client") {
      roleDisplay = "Cliente";
    } else if (m.group_role === "unknown" || !m.group_role) {
      roleDisplay = "Membro (Não classificado)";
    } else {
      roleDisplay = m.sender_role === "cs" ? "Atendente (CS)" : "Membro (Não classificado)";
    }

    const name = m.sender_name || "Desconhecido";
    const time = new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `[${time}] ${roleDisplay} (${name}): ${m.content}`;
  }).join("\n");

  const systemPrompt = `Você é um analista de atendimento ao cliente especializado em identificar demandas e avaliar qualidade de atendimento.

Analise a conversa entre a Equipe de Atendimento (CS, Gestores, etc) e Clientes e identifique:
1. APENAS demandas/pedidos/solicitações feitas por CLIENTES EXTERNOS (marcados como "Cliente" nas mensagens)
2. O status de cada demanda: "resolved" se foi atendida/respondida, "open" se ainda está pendente
3. A prioridade baseada na urgência aparente: "low", "normal", "high", "urgent"
4. A CATEGORIA de cada demanda (OBRIGATÓRIO - você DEVE classificar cada demanda):
   - "duvida": Perguntas, questionamentos, pedidos de esclarecimento
   - "solicitacao": Pedidos de informação, materiais, relatórios, dados, envio de arquivos
   - "reclamacao": Insatisfação, problemas, queixas, críticas
   - "agendamento": Solicitações sobre datas, horários, reuniões, gravações, calendário
   - "suporte_tecnico": Problemas técnicos, bugs, erros de sistema, falhas
   - "financeiro": Pagamentos, cobranças, notas fiscais, valores, orçamentos
   - "feedback": Retorno sobre serviços, avaliações, sugestões de melhoria
   - "geral": APENAS quando não se encaixar em NENHUMA outra categoria
5. Para demandas resolvidas, estime o tempo aproximado de resolução em minutos
6. Para demandas resolvidas, identifique o NOME do membro da equipe que resolveu a demanda
7. Gere um RESUMO ESTRUTURADO seguindo este formato:
   "O cliente [NOME DO CLIENTE] solicitou [DESCRIÇÃO DA DEMANDA PRINCIPAL]. O membro da equipe [NOME] [resolveu/está atendendo] a solicitação."

⚠️ REGRA CRÍTICA - QUEM PODE GERAR DEMANDAS:
- APENAS mensagens de "Cliente" devem gerar demandas
- IGNORE solicitações de "Atendente (CS)" ou "Gestor de Tráfego" - são instruções internas

⚠️ REGRA CRÍTICA - QUEM PODE RESOLVER DEMANDAS:
- Qualquer membro da equipe pode resolver demandas: "Atendente (CS)", "Gestor de Tráfego (Equipe)", etc.

REGRAS CRÍTICAS PARA DETERMINAR STATUS (SIGA À RISCA):

⚠️ DEMANDA É "open" (PENDENTE) SE:
- O cliente fez uma pergunta e NÃO HÁ resposta da equipe para essa pergunta ESPECÍFICA
- A última mensagem do cliente contém uma pergunta/pedido sem resposta posterior da equipe
- A equipe respondeu de forma vaga/genérica sem abordar o ponto específico do cliente
- O cliente solicitou algo e a equipe não confirmou entrega ou ação

✅ DEMANDA É "resolved" (RESOLVIDA) SE:
- Um membro da equipe respondeu DIRETAMENTE e ESPECIFICAMENTE à pergunta do cliente
- A equipe confirmou EXPLICITAMENTE a entrega, ação ou resolução
- O cliente demonstrou satisfação ou agradeceu APÓS receber resposta adequada

🔴 REGRA DE OURO: Se não existe uma RESPOSTA DIRETA e ESPECÍFICA da equipe para uma pergunta/pedido do cliente, a demanda é "open". 

EM CASO DE DÚVIDA: Marque como "open". É preferível ter demandas falsamente pendentes do que falsamente resolvidas.

IMPORTANTE: Analise CADA pergunta/pedido INDIVIDUALMENTE. Uma conversa pode ter demandas resolvidas E demandas pendentes simultaneamente.

REGRAS DE CATEGORIZAÇÃO:
- SEMPRE escolha a categoria mais específica possível
- "geral" deve ser usado APENAS como último recurso
- Se houver dúvida entre duas categorias, escolha a que melhor representa a INTENÇÃO do cliente

REGRAS DO RESUMO:
- SEMPRE comece identificando o cliente pelo nome (quem tem role = "Cliente")
- Descreva a demanda principal de forma clara e objetiva
- Identifique o membro da equipe que tratou/resolveu a solicitação
- Use "O cliente [NOME]" para quem faz a solicitação
- Use "O membro da equipe [NOME]" para quem resolve
- Se houver demandas pendentes, MENCIONE NO RESUMO
- Máximo de 2-3 frases
- Se não houver demandas de clientes externos, indique isso no resumo

Use a função analyze_conversation para estruturar sua resposta.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analise esta conversa:\n\n${conversationText}` }
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze_conversation",
          description: "Retorna a análise estruturada da conversa com demandas identificadas",
          parameters: {
            type: "object",
            properties: {
              demands: {
                type: "array",
                description: "Lista de demandas identificadas na conversa",
                items: {
                  type: "object",
                  properties: {
                    description: {
                      type: "string",
                      description: "Descrição clara e concisa da demanda"
                    },
                    status: {
                      type: "string",
                      enum: ["open", "resolved"],
                      description: "Status da demanda: 'resolved' se foi atendida, 'open' se pendente"
                    },
                    priority: {
                      type: "string",
                      enum: ["low", "normal", "high", "urgent"],
                      description: "Prioridade baseada na urgência aparente"
                    },
                    category: {
                      type: "string",
                      enum: ["duvida", "solicitacao", "reclamacao", "agendamento", "suporte_tecnico", "financeiro", "feedback", "geral"],
                      description: "Categoria da demanda: duvida (perguntas), solicitacao (pedidos), reclamacao (insatisfação), agendamento (datas/horários), suporte_tecnico (problemas técnicos), financeiro (pagamentos), feedback (retorno sobre serviços), geral (outros)"
                    },
                    resolution_time_minutes: {
                      type: "number",
                      description: "Tempo estimado de resolução em minutos (apenas para resolvidas)"
                    },
                    resolved_by_name: {
                      type: "string",
                      description: "Nome do Atendente (CS) que resolveu esta demanda (apenas para resolvidas)"
                    }
                  },
                  required: ["description", "status", "priority", "category"]
                }
              },
              all_resolved: {
                type: "boolean",
                description: "true se todas as demandas foram resolvidas"
              },
              summary: {
                type: "string",
                description: "Resumo estruturado no formato: 'O cliente [NOME] solicitou [DEMANDA]. O atendente [NOME CS] resolveu/está atendendo a solicitação.' Sempre identificando cliente, demanda e atendente. Máximo 2-3 frases."
              }
            },
            required: ["demands", "all_resolved", "summary"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "analyze_conversation" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("AI response:", JSON.stringify(data, null, 2));

  // Extract tool call result
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== "analyze_conversation") {
    console.error("Unexpected AI response format:", data);
    throw new Error("Invalid AI response format");
  }

  const result = JSON.parse(toolCall.function.arguments) as AnalysisResult;
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT for internal function calls
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Accept both anon key (cron jobs) and valid user JWTs (frontend)
    if (token !== anonKey) {
      const supabaseAnon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        anonKey!,
      );
      const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
      if (userError || !user) {
        console.log("Auth failed: token is neither anon key nor valid user JWT");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`Authenticated as user: ${user.id}`);
    } else {
      console.log("Authenticated via anon key (cron job)");
    }
  } catch (_authErr) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }



  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a force resolve request
    let ticketId: string | null = null;
    let forceResolve = false;

    let testMode = false;
    let targetGroupId: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        ticketId = body.ticketId || null;
        forceResolve = body.forceResolve === true;
        testMode = body.testMode === true;
        targetGroupId = body.groupId || null;
      } catch {
        // Not JSON body, continue with normal flow
      }
    }

    console.log(`Starting ticket analysis job... ticketId=${ticketId}, forceResolve=${forceResolve}`);

    let ticketsToAnalyze;

    if (ticketId) {
      // Analyze specific ticket
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          group_id,
          created_at,
          last_analysis_at,
          analysis_count,
          monitored_groups (
            name
          )
        `)
        .eq("id", ticketId)
        .single();

      if (error) {
        console.error("Error fetching ticket:", error);
        throw error;
      }

      ticketsToAnalyze = data ? [data] : [];
    } else {
      // Find tickets that need analysis (next_analysis_at <= now AND status = open)
      // IMPORTANT: Only analyze tickets from active client groups (is_client_group = true AND is_active = true)
      const { data, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          id,
          group_id,
          created_at,
          last_analysis_at,
          analysis_count,
          monitored_groups!inner (
            name,
            is_client_group,
            is_active
          )
        `)
        .eq("status", "open")
        .eq("monitored_groups.is_client_group", true)
        .eq("monitored_groups.is_active", true)
        .lte("next_analysis_at", new Date().toISOString())
        .order("next_analysis_at", { ascending: true })
        .limit(10); // Process up to 10 tickets per run

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        throw ticketsError;
      }

      ticketsToAnalyze = data;
      console.log(`Filtered to ${ticketsToAnalyze?.length || 0} tickets from active client groups`);
    }

    if (!ticketsToAnalyze || ticketsToAnalyze.length === 0) {
      console.log("No tickets pending analysis");
      return new Response(
        JSON.stringify({ success: true, message: "No tickets to analyze", analyzed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${ticketsToAnalyze.length} tickets to analyze`);

    let analyzedCount = 0;
    const errors: string[] = [];

    for (const ticket of ticketsToAnalyze) {
      try {
        const groupName = (ticket.monitored_groups as any)?.name || ticket.group_id;
        console.log(`Analyzing ticket ${ticket.id} for group ${groupName}${forceResolve ? ' (FORCE RESOLVE)' : ''}`);

        // For force resolve, fetch ALL messages; otherwise only since last analysis
        const sinceTime = forceResolve ? ticket.created_at : (ticket.last_analysis_at || ticket.created_at);

        const { data: rawMessages, error: messagesError } = await supabase
          .from("messages")
          .select("id, sender_name, sender_phone, sender_role, content, created_at")
          .eq("ticket_id", ticket.id)
          .gte("created_at", sinceTime)
          .order("created_at", { ascending: true });

        if (messagesError) {
          console.error(`Error fetching messages for ticket ${ticket.id}:`, messagesError);
          errors.push(`Ticket ${ticket.id}: ${messagesError.message}`);
          continue;
        }

        if (!rawMessages || rawMessages.length === 0) {
          console.log(`No new messages for ticket ${ticket.id}, skipping analysis`);
          // Still update next_analysis_at to avoid repeated checks
          await supabase
            .from("tickets")
            .update({
              next_analysis_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
            })
            .eq("id", ticket.id);
          continue;
        }

        // Enrich messages with actual group_role from group_members table
        const messages = await Promise.all(rawMessages.map(async (m) => {
          const { data: memberData } = await supabase
            .from("group_members")
            .select("role")
            .eq("group_id", ticket.group_id)
            .eq("phone_number", m.sender_phone)
            .maybeSingle();

          let role = memberData?.role || "unknown";

          // Se role é unknown, verificar se é membro da equipe como fallback
          if (role === "unknown") {
            const { data: tmData } = await supabase
              .from("team_members")
              .select("id")
              .eq("phone_number", m.sender_phone)
              .eq("is_active", true)
              .maybeSingle();
            if (tmData) role = "cs";
          }

          return {
            ...m,
            group_role: role
          } as Message;
        }));

        console.log(`Enriched ${messages.length} messages with group roles`);

        // Log role distribution for debugging
        const roleDistribution = messages.reduce((acc, m) => {
          acc[m.group_role || 'unknown'] = (acc[m.group_role || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log(`Role distribution: ${JSON.stringify(roleDistribution)}`);

        // Get timestamp of last message for accurate resolved_at (instead of NOW())
        const lastMessageTimestamp = messages[messages.length - 1].created_at;

        // Find timestamp of last Team message (CS or Traffic Manager) for demand resolution
        const lastTeamMessage = [...messages].reverse().find(m =>
          m.sender_role === "cs" ||
          m.group_role === "cs" ||
          m.group_role === "traffic_manager"
        )?.created_at || lastMessageTimestamp;

        console.log(`Found ${messages.length} messages to analyze for ticket ${ticket.id}`);

        // Call AI to analyze the conversation
        const analysis = await analyzeConversation(messages);
        console.log(`Analysis result for ticket ${ticket.id}:`, JSON.stringify(analysis, null, 2));

        // Get existing demands for this ticket
        const { data: existingDemands } = await supabase
          .from("ticket_demands")
          .select("id, description, status")
          .eq("ticket_id", ticket.id);

        // Helper function to calculate similarity between two strings (improved for Portuguese)
        const calculateSimilarity = (str1: string, str2: string): number => {
          // Remove punctuation and convert to lowercase
          const clean = (s: string) => s.toLowerCase().replace(/[.,!?'"()]/g, '');

          // Portuguese stopwords
          const stopwords = new Set([
            'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das',
            'em', 'no', 'na', 'nos', 'nas', 'e', 'se', 'que', 'para',
            'por', 'com', 'sobre', 'ja', 'foram', 'foi', 'ser', 'esta',
            'um', 'uma', 'uns', 'umas', 'ao', 'aos', 'pelo', 'pela'
          ]);

          // Extract significant words (> 2 chars, not stopwords)
          const getWords = (s: string) => clean(s).split(/\s+/)
            .filter(w => w.length > 2 && !stopwords.has(w));

          const words1 = getWords(str1);
          const words2 = getWords(str2);

          if (words1.length === 0 || words2.length === 0) {
            // Fallback to substring check for very short descriptions
            return str1.toLowerCase().includes(str2.toLowerCase().slice(0, 15)) ||
              str2.toLowerCase().includes(str1.toLowerCase().slice(0, 15)) ? 0.6 : 0;
          }

          // Count matching words (with partial matching)
          let matches = 0;
          for (const w1 of words1) {
            for (const w2 of words2) {
              if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
                matches++;
                break;
              }
            }
          }

          // Calculate similarity based on the smaller list
          const minLen = Math.min(words1.length, words2.length);
          return minLen > 0 ? matches / minLen : 0;
        };

        // Process each demand from analysis
        for (const demand of analysis.demands) {
          // Check if this demand already exists (improved similarity matching)
          const existingDemand = existingDemands?.find(ed => {
            // Exact match
            if (ed.description.toLowerCase() === demand.description.toLowerCase()) return true;
            // Similarity >= 40% (lowered threshold for better matching)
            const similarity = calculateSimilarity(ed.description, demand.description);
            if (similarity >= 0.4) {
              console.log(`Similarity match: "${ed.description.slice(0, 50)}..." ↔ "${demand.description.slice(0, 50)}..." = ${(similarity * 100).toFixed(0)}%`);
              return true;
            }
            return false;
          });

          if (existingDemand) {
            // Check if status changed OR if SLA needs re-evaluation
            const statusChanged = existingDemand.status !== demand.status;

            // Re-evaluate SLA for open demands even if status hasn't changed
            if (existingDemand.status === "open" && demand.status === "open" && !statusChanged) {
              // Get SLA limit
              const { data: slaSettingsExisting } = await supabase
                .from("settings")
                .select("value")
                .eq("key", "global_sla_minutes")
                .single();
              const slaLimitExisting = slaSettingsExisting?.value ? parseInt(slaSettingsExisting.value) : 30;

              // Calculate business minutes from first client message
              const firstClientMsgExisting = (messages as Message[])
                .filter(m => m.group_role === "client" || m.sender_role === "client")
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

              let timeOpenExisting = 0;
              if (firstClientMsgExisting) {
                timeOpenExisting = calculateBusinessMinutes(new Date(firstClientMsgExisting.created_at), new Date());
              } else {
                timeOpenExisting = calculateBusinessMinutes(new Date(ticket.created_at), new Date());
              }

              if (timeOpenExisting > slaLimitExisting) {
                // Check current sla_exceeded value
                const { data: currentDemand } = await supabase
                  .from("ticket_demands")
                  .select("sla_exceeded")
                  .eq("id", existingDemand.id)
                  .single();

                if (currentDemand && !currentDemand.sla_exceeded) {
                  await supabase
                    .from("ticket_demands")
                    .update({ sla_exceeded: true })
                    .eq("id", existingDemand.id);
                  console.log(`SLA exceeded for existing demand ${existingDemand.id} (${timeOpenExisting}min > ${slaLimitExisting}min)`);
                }
              }
            }

            if (statusChanged) {
              const updates: Record<string, any> = { status: demand.status };

              if (demand.status === "resolved") {
                updates.resolved_at = lastTeamMessage;
                updates.resolution_time_minutes = demand.resolution_time_minutes || null;

                // Find Team Member who resolved this demand
                let resolvedByName = demand.resolved_by_name || null;
                let resolvedByPhone: string | null = null;

                if (!resolvedByName) {
                  const lastTeamMsg = [...messages as Message[]].reverse().find(m =>
                    m.sender_role === "cs" || m.group_role === "cs" || m.group_role === "traffic_manager"
                  );
                  if (lastTeamMsg) {
                    resolvedByName = lastTeamMsg.sender_name || null;
                  }
                }

                if (resolvedByName && messages) {
                  const teamMessage = (messages as any[]).find(m => m.sender_name === resolvedByName);
                  if (teamMessage?.sender_phone) {
                    resolvedByPhone = teamMessage.sender_phone;
                  }
                }

                updates.resolved_by_name = resolvedByName;
                updates.resolved_by_phone = resolvedByPhone;
              }

              // Check if SLA exceeded for open demands
              if (demand.status === "open") {
                const { data: slaSettingsUpdate } = await supabase
                  .from("settings")
                  .select("value")
                  .eq("key", "global_sla_minutes")
                  .single();
                const slaLimitUpdate = slaSettingsUpdate?.value ? parseInt(slaSettingsUpdate.value) : 30;

                const firstClientMsgUpdate = (messages as Message[])
                  .filter(m => m.group_role === "client" || m.sender_role === "client")
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

                let timeOpenUpdate = 0;
                if (firstClientMsgUpdate) {
                  timeOpenUpdate = calculateBusinessMinutes(new Date(firstClientMsgUpdate.created_at), new Date());
                } else {
                  timeOpenUpdate = calculateBusinessMinutes(new Date(ticket.created_at), new Date());
                }

                if (timeOpenUpdate > slaLimitUpdate) {
                  updates.sla_exceeded = true;
                }
              }

              await supabase
                .from("ticket_demands")
                .update(updates)
                .eq("id", existingDemand.id);

              console.log(`Updated demand ${existingDemand.id} to status: ${demand.status}`);
            }
          } else {
            // Create new demand

            // Get global SLA limit for priority calculation
            const { data: slaSettings } = await supabase
              .from("settings")
              .select("value")
              .eq("key", "global_sla_minutes")
              .single();
            const slaLimitMinutes = slaSettings?.value ? parseInt(slaSettings.value) : 30;

            // ... existing code ...

            // Calculate time open from first client message
            const firstClientMsg = (messages as Message[])
              .filter(m => m.group_role === "client" || m.sender_role === "client")
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

            let timeOpenMinutes = 0;
            if (firstClientMsg) {
              // Use business hours for time open
              timeOpenMinutes = calculateBusinessMinutes(new Date(firstClientMsg.created_at), new Date());
            }

            // Check for urgency keywords in client messages
            const hasUrgency = hasUrgencyKeywords(messages as Message[]);

            // Calculate objective priority based on criteria
            const objectivePriority = calculateObjectivePriority(
              demand.category || "geral",
              timeOpenMinutes,
              slaLimitMinutes,
              hasUrgency
            );

            console.log(`Priority calculation for "${demand.description.slice(0, 40)}...": ` +
              `timeOpen=${timeOpenMinutes}min (business), SLA=${slaLimitMinutes}min, hasUrgency=${hasUrgency}, ` +
              `AI=${demand.priority} -> Objective=${objectivePriority}`);

            // Use business minutes for SLA check too
            // Note: we use timeOpenMinutes calculated above which already respects business hours
            // But if we want to check based on ticket creation for fallbacks:
            const businessMinutesSinceCreation = calculateBusinessMinutes(new Date(ticket.created_at), new Date());

            // Use timeOpenMinutes if available (more accurate as it's from first client msg), else fallback to ticket creation
            const minutesForSla = timeOpenMinutes > 0 ? timeOpenMinutes : businessMinutesSinceCreation;

            const slaExceeded = demand.status === "open" && minutesForSla > slaLimitMinutes;

            // For resolved demands, find Team Member who resolved if AI didn't identify
            let resolvedByName = demand.resolved_by_name || null;
            let resolvedByPhone: string | null = null;

            if (demand.status === "resolved" && !resolvedByName) {
              // Fallback: find the last Team message
              const lastTeamMsg = [...messages as Message[]].reverse().find(m =>
                m.sender_role === "cs" || m.group_role === "cs" || m.group_role === "traffic_manager"
              );
              if (lastTeamMsg) {
                resolvedByName = lastTeamMsg.sender_name || null;
              }
            }

            // Find phone for the Team Member
            if (resolvedByName && messages) {
              const teamMessage = (messages as any[]).find(m => m.sender_name === resolvedByName);
              if (teamMessage?.sender_phone) {
                resolvedByPhone = teamMessage.sender_phone;
              }
            }

            const { error: insertError } = await supabase
              .from("ticket_demands")
              .insert({
                ticket_id: ticket.id,
                description: demand.description,
                status: demand.status,
                priority: objectivePriority, // Use objective priority instead of AI priority
                category: demand.category || "geral",
                resolution_time_minutes: demand.status === "resolved" ? demand.resolution_time_minutes : null,
                resolved_at: demand.status === "resolved" ? lastTeamMessage : null,
                sla_exceeded: slaExceeded,
                resolved_by_name: resolvedByName,
                resolved_by_phone: resolvedByPhone,
              });

            if (insertError) {
              console.error(`Error inserting demand for ticket ${ticket.id}:`, insertError);
            } else {
              console.log(`Created new demand: ${demand.description} (${demand.status}) with priority ${objectivePriority}`);
            }
          }
        }

        // Update ticket with analysis results
        const ticketUpdates: Record<string, any> = {
          last_analysis_at: new Date().toISOString(),
          analysis_count: (ticket.analysis_count || 0) + 1,
          ai_summary: analysis.summary,
        };

        if (analysis.all_resolved) {
          // All demands resolved - close the ticket
          ticketUpdates.status = "resolved";
          ticketUpdates.resolved_at = lastMessageTimestamp;
          ticketUpdates.next_analysis_at = null;

          // Find Team Member who resolved the ticket based on last Team message
          const lastTeamMsg = [...messages as any[]].reverse().find(m =>
            m.sender_role === "cs" || m.group_role === "cs" || m.group_role === "traffic_manager"
          );
          if (lastTeamMsg?.sender_phone) {
            // Look up team_member by phone number
            const { data: teamMember } = await supabase
              .from("team_members")
              .select("id")
              .eq("phone_number", lastTeamMsg.sender_phone)
              .single();

            if (teamMember) {
              ticketUpdates.resolved_by = teamMember.id;
              console.log(`Ticket ${ticket.id} resolved_by set to team_member ${teamMember.id}`);
            } else {
              console.log(`No team_member found for phone ${lastTeamMsg.sender_phone}`);
            }
          }

          // Log open demands BEFORE cleanup (debug)
          const { data: openDemandsBeforeCleanup } = await supabase
            .from("ticket_demands")
            .select("id, description")
            .eq("ticket_id", ticket.id)
            .eq("status", "open");

          console.log(`All demands resolved - closing ticket ${ticket.id}. Found ${openDemandsBeforeCleanup?.length || 0} orphaned open demands to close.`);
          if (openDemandsBeforeCleanup && openDemandsBeforeCleanup.length > 0) {
            console.log(`Orphaned demands: ${openDemandsBeforeCleanup.map(d => d.description.slice(0, 40)).join('; ')}`);
          }

          // Close ALL remaining open demands (safety net for any orphaned demands)
          const lastTeamMsgForDemands = [...messages as Message[]].reverse().find(m =>
            m.sender_role === "cs" || m.group_role === "cs" || m.group_role === "traffic_manager"
          );
          const { error: updateOpenDemandsError, count: closedDemandsCount } = await supabase
            .from("ticket_demands")
            .update({
              status: "resolved",
              resolved_at: lastTeamMessage,
              resolved_by_name: lastTeamMsgForDemands?.sender_name || null,
              resolved_by_phone: lastTeamMsgForDemands?.sender_phone || null,
            })
            .eq("ticket_id", ticket.id)
            .eq("status", "open");

          if (updateOpenDemandsError) {
            console.error("Error closing remaining open demands:", updateOpenDemandsError);
          } else if (closedDemandsCount && closedDemandsCount > 0) {
            console.log(`Closed ${closedDemandsCount} remaining open demands for ticket ${ticket.id}`);
          }
        } else {
          // Still has open demands - schedule next analysis in 1 hour
          ticketUpdates.next_analysis_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          console.log(`Ticket ${ticket.id} has open demands - next analysis at ${ticketUpdates.next_analysis_at}`);
        }

        await supabase
          .from("tickets")
          .update(ticketUpdates)
          .eq("id", ticket.id);

        analyzedCount++;
      } catch (ticketError) {
        const errorMsg = ticketError instanceof Error ? ticketError.message : "Unknown error";
        console.error(`Error analyzing ticket ${ticket.id}:`, errorMsg);
        errors.push(`Ticket analysis failed`);

        // If rate limited, stop processing more tickets
        if (errorMsg.includes("Rate limit")) {
          console.log("Rate limited - stopping analysis job");
          break;
        }
      }
    }

    console.log(`Analysis job completed. Analyzed: ${analyzedCount}, Errors: ${errors.length}`);

    // Send SLA breach notifications after analysis
    const notificationResult = await sendSlaBreachNotifications(supabase, testMode, targetGroupId);
    console.log(`SLA notifications: ${notificationResult.sent} sent, ${notificationResult.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed ${analyzedCount} tickets`,
        analyzed: analyzedCount,
        notifications_sent: notificationResult.sent,
        notification_errors: notificationResult.errors,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Analysis job error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An internal error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
