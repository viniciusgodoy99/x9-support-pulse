import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

type Demanda = {
  titulo: string;
  status: "aberta" | "andamento" | "resolvida";
  aberta_em: string;
  resolvida_em: string | null;
  prioridade: string;
};

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toYMD(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toISOString().slice(0, 10);
}

function normalizeStatus(s: string | null | undefined, resolvedAt: string | null): Demanda["status"] {
  const v = (s ?? "").toLowerCase();
  if (resolvedAt || v.includes("resolv") || v === "closed" || v === "done") return "resolvida";
  if (v.includes("andamento") || v.includes("progress") || v === "in_progress") return "andamento";
  return "aberta";
}

function normalizePriority(p: string | null | undefined): string {
  const v = (p ?? "").toLowerCase();
  if (v.startsWith("alt") || v === "high" || v === "urgent") return "alta";
  if (v.startsWith("bai") || v === "low") return "baixa";
  return "media";
}

function emptyPayload(cliente: string) {
  return {
    cliente,
    demandas_abertas: 0,
    demandas_resolvidas: 0,
    tempo_resposta_medio_min: 0,
    sla_pct: 0,
    demandas: [] as Demanda[],
  };
}

export default defineTool({
  name: "atendimento_cliente",
  title: "Atendimento do cliente",
  description:
    "Retorna as demandas e métricas de atendimento (abertas, resolvidas, tempo de resposta, SLA) de um cliente, a partir dos grupos monitorados pelo X9.",
  inputSchema: {
    cliente: z
      .string()
      .describe("Nome do cliente (casar com o nome do grupo/cliente, case-insensitive e parcial)."),
    since: z.string().optional().describe("Data inicial YYYY-MM-DD (opcional)."),
    until: z.string().optional().describe("Data final YYYY-MM-DD (opcional)."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ cliente, since, until }) => {
    const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;
    const url = env.SUPABASE_URL!;
    const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const asText = (obj: unknown) => ({
      content: [{ type: "text" as const, text: JSON.stringify(obj) }],
    });

    const query = (cliente ?? "").trim();
    if (!query) return asText(emptyPayload(cliente ?? ""));

    // 1) Match groups by name (case-insensitive, accent-insensitive, partial).
    const { data: allGroups, error: gErr } = await supabase
      .from("monitored_groups")
      .select("id, name, sla_limit_minutes")
      .eq("is_archived", false);

    if (gErr || !allGroups) return asText(emptyPayload(query));

    const needle = stripAccents(query.toLowerCase());
    const groups = allGroups.filter((g) =>
      stripAccents((g.name ?? "").toLowerCase()).includes(needle),
    );
    if (groups.length === 0) return asText(emptyPayload(query));

    const groupIds = groups.map((g) => g.id);
    const clienteLabel = groups[0].name ?? query;

    // 2) Date range
    const sinceIso = since ? new Date(since + "T00:00:00Z").toISOString() : null;
    const untilIso = until ? new Date(until + "T23:59:59Z").toISOString() : null;

    // 3) Fetch tickets for those groups (batched)
    const tickets: Array<{
      id: string;
      group_id: string;
      created_at: string;
      first_response_at: string | null;
      resolved_at: string | null;
    }> = [];
    for (let i = 0; i < groupIds.length; i += 50) {
      const chunk = groupIds.slice(i, i + 50);
      let q = supabase
        .from("tickets")
        .select("id, group_id, created_at, first_response_at, resolved_at")
        .in("group_id", chunk);
      if (sinceIso) q = q.gte("created_at", sinceIso);
      if (untilIso) q = q.lte("created_at", untilIso);
      const { data } = await q;
      if (data) tickets.push(...(data as any));
    }

    if (tickets.length === 0) {
      return asText({ ...emptyPayload(clienteLabel) });
    }

    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    const ticketIds = tickets.map((t) => t.id);

    // 4) Fetch demands for those tickets (batched)
    const demandsRaw: Array<{
      id: string;
      ticket_id: string;
      description: string;
      status: string;
      priority: string;
      created_at: string;
      resolved_at: string | null;
      sla_exceeded: boolean;
    }> = [];
    for (let i = 0; i < ticketIds.length; i += 75) {
      const chunk = ticketIds.slice(i, i + 75);
      const { data } = await supabase
        .from("ticket_demands")
        .select("id, ticket_id, description, status, priority, created_at, resolved_at, sla_exceeded")
        .in("ticket_id", chunk)
        .order("created_at", { ascending: false });
      if (data) demandsRaw.push(...(data as any));
    }

    // 5) Compute metrics
    let abertas = 0;
    let resolvidas = 0;
    let slaOk = 0;
    let slaTotal = 0;
    const respostaMins: number[] = [];

    const demandas: Demanda[] = demandsRaw.map((d) => {
      const st = normalizeStatus(d.status, d.resolved_at);
      if (st === "resolvida") resolvidas += 1;
      else abertas += 1;

      slaTotal += 1;
      if (!d.sla_exceeded) slaOk += 1;

      const parent = ticketMap.get(d.ticket_id);
      if (parent?.first_response_at && parent?.created_at) {
        const diff =
          (new Date(parent.first_response_at).getTime() -
            new Date(parent.created_at).getTime()) /
          60000;
        if (diff >= 0 && diff < 60 * 24 * 30) respostaMins.push(diff);
      }

      return {
        titulo: (d.description ?? "").slice(0, 140),
        status: st,
        aberta_em: toYMD(d.created_at)!,
        resolvida_em: toYMD(d.resolved_at),
        prioridade: normalizePriority(d.priority),
      };
    });

    const tempoMedio =
      respostaMins.length > 0
        ? Math.round(respostaMins.reduce((a, b) => a + b, 0) / respostaMins.length)
        : 0;
    const slaPct = slaTotal > 0 ? Math.round((slaOk / slaTotal) * 100) : 0;

    return asText({
      cliente: clienteLabel,
      demandas_abertas: abertas,
      demandas_resolvidas: resolvidas,
      tempo_resposta_medio_min: tempoMedio,
      sla_pct: slaPct,
      demandas: demandas.slice(0, 20),
    });
  },
});
