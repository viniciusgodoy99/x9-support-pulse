import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLICKUP_BASE = "https://api.clickup.com/api/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ClickUp token from settings
    const { data: setting, error: settingError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "clickup_api_token")
      .single();

    if (settingError || !setting?.value) {
      return new Response(
        JSON.stringify({ error: "Token do ClickUp não configurado. Vá em Configurações > Integrações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clickupToken = setting.value;
    const { action, ...params } = await req.json();

    let result: any;

    switch (action) {
      case "get_teams": {
        const res = await fetch(`${CLICKUP_BASE}/team`, {
          headers: { Authorization: clickupToken },
        });
        result = await res.json();
        if (!res.ok) throw new Error(`ClickUp API error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case "get_spaces": {
        const res = await fetch(`${CLICKUP_BASE}/team/${params.team_id}/space?archived=false`, {
          headers: { Authorization: clickupToken },
        });
        result = await res.json();
        if (!res.ok) throw new Error(`ClickUp API error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case "get_folders": {
        const res = await fetch(`${CLICKUP_BASE}/space/${params.space_id}/folder?archived=false`, {
          headers: { Authorization: clickupToken },
        });
        result = await res.json();
        if (!res.ok) throw new Error(`ClickUp API error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case "get_lists": {
        // Lists can be in a folder or folderless in a space
        let url: string;
        if (params.folder_id) {
          url = `${CLICKUP_BASE}/folder/${params.folder_id}/list?archived=false`;
        } else {
          url = `${CLICKUP_BASE}/space/${params.space_id}/list?archived=false`;
        }
        const res = await fetch(url, {
          headers: { Authorization: clickupToken },
        });
        result = await res.json();
        if (!res.ok) throw new Error(`ClickUp API error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case "get_members": {
        const res = await fetch(`${CLICKUP_BASE}/list/${params.list_id}/member`, {
          headers: { Authorization: clickupToken },
        });
        result = await res.json();
        if (!res.ok) throw new Error(`ClickUp API error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      case "create_task": {
        const body: any = {
          name: params.name,
          description: params.description,
          priority: params.priority, // 1=urgent, 2=high, 3=normal, 4=low
          status: params.status || undefined,
          tags: params.tags || [],
        };
        if (params.assignees?.length) {
          body.assignees = params.assignees;
        }
        if (params.due_date) {
          body.due_date = params.due_date;
        }

        const res = await fetch(`${CLICKUP_BASE}/list/${params.list_id}/task`, {
          method: "POST",
          headers: {
            Authorization: clickupToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        result = await res.json();
        if (!res.ok) throw new Error(`ClickUp API error [${res.status}]: ${JSON.stringify(result)}`);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ClickUp proxy error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
