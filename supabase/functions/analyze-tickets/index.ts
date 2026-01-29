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
  sender_role: "cs" | "client";
  content: string;
  created_at: string;
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

async function sendSlaBreachNotifications(supabase: SupabaseClient): Promise<{ sent: number; errors: number }> {
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

  if (!demandsToNotify || demandsToNotify.length === 0) {
    console.log("No SLA breached demands to notify");
    return { sent, errors };
  }

  console.log(`Found ${demandsToNotify.length} demands with SLA breach to check for notifications`);

  for (const demand of demandsToNotify) {
    // Check if already notified
    const { data: existingNotification } = await supabase
      .from("sla_notifications")
      .select("id")
      .eq("demand_id", demand.id)
      .eq("notification_type", "sla_breach")
      .single();

    if (existingNotification) {
      console.log(`Demand ${demand.id} already notified, skipping`);
      continue;
    }

    // Calculate time open
    const demandCreatedAt = new Date(demand.created_at);
    const timeOpenMs = Date.now() - demandCreatedAt.getTime();
    const timeOpenMinutes = Math.round(timeOpenMs / (60 * 1000));

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

    // Get customer info
    const customerName = (demand.tickets as any)?.customer_name || "Cliente desconhecido";

    // Build alert message
    const alertMessage = `⚠️ *ALERTA DE SLA*\n\n` +
      `📋 *Grupo:* ${groupName}\n` +
      `👤 *Solicitante:* ${customerName}\n` +
      `📝 *Demanda:* ${demand.description}\n` +
      `⏱️ *Tempo aberto:* ${timeOpenMinutes} minutos\n` +
      `🎯 *Limite SLA:* ${slaLimitMinutes} minutos\n` +
      `${priorityDisplay}\n\n` +
      `Por favor, verifique o atendimento!`;

    // Send notification
    const messageSent = await sendWhatsAppMessage(notificationGroupId, alertMessage);

    if (messageSent) {
      // Record notification to avoid duplicates
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
        console.log(`SLA breach notification sent for demand ${demand.id}`);
        sent++;
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

  // Format conversation for AI
  const conversationText = messages.map(m => {
    const role = m.sender_role === "cs" ? "Atendente (CS)" : "Cliente";
    const name = m.sender_name || "Desconhecido";
    const time = new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `[${time}] ${role} (${name}): ${m.content}`;
  }).join("\n");

  const systemPrompt = `Você é um analista de atendimento ao cliente especializado em identificar demandas e avaliar qualidade de atendimento.

Analise a conversa entre Atendentes (CS) e Clientes e identifique:
1. TODAS as demandas/pedidos/solicitações feitas pelo cliente
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
6. Para demandas resolvidas, identifique o NOME do Atendente (CS) que resolveu a demanda com base nas mensagens
7. Gere um RESUMO ESTRUTURADO seguindo este formato:
   "O cliente [NOME DO CLIENTE] solicitou [DESCRIÇÃO DA DEMANDA PRINCIPAL]. O atendente [NOME DO CS] [resolveu/está atendendo] a solicitação."

REGRAS CRÍTICAS PARA DETERMINAR STATUS (SIGA À RISCA):

⚠️ DEMANDA É "open" (PENDENTE) SE:
- O cliente fez uma pergunta e NÃO HÁ resposta do CS para essa pergunta ESPECÍFICA
- A última mensagem do cliente contém uma pergunta/pedido sem resposta posterior do CS
- O CS respondeu de forma vaga/genérica sem abordar o ponto específico do cliente
- O cliente solicitou algo e o CS não confirmou entrega ou ação

✅ DEMANDA É "resolved" (RESOLVIDA) SE:
- O CS respondeu DIRETAMENTE e ESPECIFICAMENTE à pergunta do cliente
- O CS confirmou EXPLICITAMENTE a entrega, ação ou resolução
- O cliente demonstrou satisfação ou agradeceu APÓS receber resposta adequada

🔴 REGRA DE OURO: Se não existe uma RESPOSTA DIRETA e ESPECÍFICA do CS para uma pergunta/pedido do cliente, a demanda é "open". 

EM CASO DE DÚVIDA: Marque como "open". É preferível ter demandas falsamente pendentes do que falsamente resolvidas.

IMPORTANTE: Analise CADA pergunta/pedido INDIVIDUALMENTE. Uma conversa pode ter demandas resolvidas E demandas pendentes simultaneamente.

REGRAS DE CATEGORIZAÇÃO:
- SEMPRE escolha a categoria mais específica possível
- "geral" deve ser usado APENAS como último recurso
- Se houver dúvida entre duas categorias, escolha a que melhor representa a INTENÇÃO do cliente

REGRAS DO RESUMO:
- SEMPRE comece identificando o cliente pelo nome (quem tem role = "client")
- Descreva a demanda principal de forma clara e objetiva
- Identifique o atendente (CS) que tratou/resolveu a solicitação (quem tem role = "cs")
- Use "O cliente [NOME]" para quem faz a solicitação
- Use "O atendente [NOME]" para quem resolve
- Se houver demandas pendentes, MENCIONE NO RESUMO
- Máximo de 2-3 frases

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a force resolve request
    let ticketId: string | null = null;
    let forceResolve = false;
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        ticketId = body.ticketId || null;
        forceResolve = body.forceResolve === true;
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
      const { data, error: ticketsError } = await supabase
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
        .eq("status", "open")
        .lte("next_analysis_at", new Date().toISOString())
        .order("next_analysis_at", { ascending: true })
        .limit(10); // Process up to 10 tickets per run

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        throw ticketsError;
      }
      
      ticketsToAnalyze = data;
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
        
        const { data: messages, error: messagesError } = await supabase
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

        if (!messages || messages.length === 0) {
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

        // Get timestamp of last message for accurate resolved_at (instead of NOW())
        const lastMessageTimestamp = messages[messages.length - 1].created_at;

        // Find timestamp of last CS message for demand resolution
        const lastCsMessageTimestamp = [...messages].reverse().find(m => m.sender_role === "cs")?.created_at || lastMessageTimestamp;

        console.log(`Found ${messages.length} messages to analyze for ticket ${ticket.id}`);

        // Call AI to analyze the conversation
        const analysis = await analyzeConversation(messages as Message[]);
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
            // Update existing demand if status changed
            if (existingDemand.status !== demand.status) {
              const updates: Record<string, any> = { status: demand.status };
              
              if (demand.status === "resolved") {
                updates.resolved_at = lastCsMessageTimestamp;
                updates.resolution_time_minutes = demand.resolution_time_minutes || null;
                
                // Find CS who resolved this demand
                let resolvedByName = demand.resolved_by_name || null;
                let resolvedByPhone: string | null = null;
                
                if (!resolvedByName) {
                  const lastCsMessage = [...messages as Message[]].reverse().find(m => m.sender_role === "cs");
                  if (lastCsMessage) {
                    resolvedByName = lastCsMessage.sender_name || null;
                  }
                }
                
                if (resolvedByName && messages) {
                  const csMessage = (messages as any[]).find(m => m.sender_name === resolvedByName && m.sender_role === "cs");
                  if (csMessage?.sender_phone) {
                    resolvedByPhone = csMessage.sender_phone;
                  }
                }
                
                updates.resolved_by_name = resolvedByName;
                updates.resolved_by_phone = resolvedByPhone;
              }
              
              // Check if SLA exceeded (demand open for more than 2 minutes - for testing)
              if (demand.status === "open") {
                const demandAge = Date.now() - new Date(ticket.created_at).getTime();
                if (demandAge > 2 * 60 * 1000) {
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
            const demandAge = Date.now() - new Date(ticket.created_at).getTime();
            const slaExceeded = demand.status === "open" && demandAge > 2 * 60 * 1000; // 2 minutes for testing

            // For resolved demands, find CS who resolved if AI didn't identify
            let resolvedByName = demand.resolved_by_name || null;
            let resolvedByPhone: string | null = null;
            
            if (demand.status === "resolved" && !resolvedByName) {
              // Fallback: find the last CS message
              const lastCsMessage = [...messages as Message[]].reverse().find(m => m.sender_role === "cs");
              if (lastCsMessage) {
                resolvedByName = lastCsMessage.sender_name || null;
              }
            }
            
            // Find phone for the CS
            if (resolvedByName && messages) {
              const csMessage = (messages as any[]).find(m => m.sender_name === resolvedByName && m.sender_role === "cs");
              if (csMessage?.sender_phone) {
                resolvedByPhone = csMessage.sender_phone;
              }
            }

            const { error: insertError } = await supabase
              .from("ticket_demands")
              .insert({
                ticket_id: ticket.id,
                description: demand.description,
                status: demand.status,
                priority: demand.priority,
                category: demand.category || "geral",
                resolution_time_minutes: demand.status === "resolved" ? demand.resolution_time_minutes : null,
                resolved_at: demand.status === "resolved" ? lastCsMessageTimestamp : null,
                sla_exceeded: slaExceeded,
                resolved_by_name: resolvedByName,
                resolved_by_phone: resolvedByPhone,
              });

            if (insertError) {
              console.error(`Error inserting demand for ticket ${ticket.id}:`, insertError);
            } else {
              console.log(`Created new demand: ${demand.description} (${demand.status})`);
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
          
          // Find CS who resolved the ticket based on last CS message
          const lastCsMessage = [...messages as any[]].reverse().find(m => m.sender_role === "cs");
          if (lastCsMessage?.sender_phone) {
            // Look up team_member by phone number
            const { data: teamMember } = await supabase
              .from("team_members")
              .select("id")
              .eq("phone_number", lastCsMessage.sender_phone)
              .single();
            
            if (teamMember) {
              ticketUpdates.resolved_by = teamMember.id;
              console.log(`Ticket ${ticket.id} resolved_by set to team_member ${teamMember.id}`);
            } else {
              console.log(`No team_member found for phone ${lastCsMessage.sender_phone}`);
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
          const lastCsMessageForDemands = [...messages as Message[]].reverse().find(m => m.sender_role === "cs");
          const { error: updateOpenDemandsError, count: closedDemandsCount } = await supabase
            .from("ticket_demands")
            .update({
              status: "resolved",
              resolved_at: lastCsMessageTimestamp,
              resolved_by_name: lastCsMessageForDemands?.sender_name || null,
              resolved_by_phone: lastCsMessageForDemands?.sender_phone || null,
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
        errors.push(`Ticket ${ticket.id}: ${errorMsg}`);
        
        // If rate limited, stop processing more tickets
        if (errorMsg.includes("Rate limit")) {
          console.log("Rate limited - stopping analysis job");
          break;
        }
      }
    }

    console.log(`Analysis job completed. Analyzed: ${analyzedCount}, Errors: ${errors.length}`);

    // Send SLA breach notifications after analysis
    const notificationResult = await sendSlaBreachNotifications(supabase);
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
