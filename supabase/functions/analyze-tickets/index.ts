import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Message {
  id: string;
  sender_name: string | null;
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
}

interface AnalysisResult {
  demands: Demand[];
  all_resolved: boolean;
  summary: string;
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
4. Para demandas resolvidas, estime o tempo aproximado de resolução em minutos

Considere que:
- Uma demanda é considerada RESOLVIDA quando o CS deu uma resposta satisfatória ou confirmou a resolução
- Perguntas simples que foram respondidas também contam como demandas resolvidas
- Reclamações que foram tratadas e reconhecidas contam como resolvidas
- Se o cliente agradeceu ou demonstrou satisfação, as demandas anteriores provavelmente foram resolvidas

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
                description: "Resumo executivo do atendimento em até 2 frases"
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
          .select("id, sender_name, sender_role, content, created_at")
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
              next_analysis_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes for testing
            })
            .eq("id", ticket.id);
          continue;
        }

        console.log(`Found ${messages.length} messages to analyze for ticket ${ticket.id}`);

        // Call AI to analyze the conversation
        const analysis = await analyzeConversation(messages as Message[]);
        console.log(`Analysis result for ticket ${ticket.id}:`, JSON.stringify(analysis, null, 2));

        // Get existing demands for this ticket
        const { data: existingDemands } = await supabase
          .from("ticket_demands")
          .select("id, description, status")
          .eq("ticket_id", ticket.id);

        // Process each demand from analysis
        for (const demand of analysis.demands) {
          // Check if this demand already exists (fuzzy match on description)
          const existingDemand = existingDemands?.find(
            ed => ed.description.toLowerCase().includes(demand.description.toLowerCase().slice(0, 30)) ||
                  demand.description.toLowerCase().includes(ed.description.toLowerCase().slice(0, 30))
          );

          if (existingDemand) {
            // Update existing demand if status changed
            if (existingDemand.status !== demand.status) {
              const updates: Record<string, any> = { status: demand.status };
              
              if (demand.status === "resolved") {
                updates.resolved_at = new Date().toISOString();
                updates.resolution_time_minutes = demand.resolution_time_minutes || null;
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

            const { error: insertError } = await supabase
              .from("ticket_demands")
              .insert({
                ticket_id: ticket.id,
                description: demand.description,
                status: demand.status,
                priority: demand.priority,
                category: demand.category || "geral",
                resolution_time_minutes: demand.status === "resolved" ? demand.resolution_time_minutes : null,
                resolved_at: demand.status === "resolved" ? new Date().toISOString() : null,
                sla_exceeded: slaExceeded,
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

        if (analysis.all_resolved || forceResolve) {
          // All demands resolved OR force resolve - close the ticket
          ticketUpdates.status = "resolved";
          ticketUpdates.resolved_at = new Date().toISOString();
          ticketUpdates.next_analysis_at = null;
          
          // If force resolve, mark all open demands as resolved
          if (forceResolve) {
            const { error: updateDemandsError } = await supabase
              .from("ticket_demands")
              .update({
                status: "resolved",
                resolved_at: new Date().toISOString(),
              })
              .eq("ticket_id", ticket.id)
              .eq("status", "open");
            
            if (updateDemandsError) {
              console.error(`Error updating demands for force resolve:`, updateDemandsError);
            }
          }
          
          console.log(`${forceResolve ? 'Force resolving' : 'All demands resolved - closing'} ticket ${ticket.id}`);
        } else {
          // Still has open demands - schedule next analysis in 2 minutes (for testing)
          ticketUpdates.next_analysis_at = new Date(Date.now() + 2 * 60 * 1000).toISOString();
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

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed ${analyzedCount} tickets`,
        analyzed: analyzedCount,
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
