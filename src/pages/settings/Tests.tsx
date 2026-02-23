import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Send, AlertTriangle, ChevronDown, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface MonitoredGroup {
  id: string;
  name: string;
  whatsapp_id: string;
}

type InvokeStatus = "idle" | "loading" | "success" | "error";

export default function Tests() {
  const { instances, loading: loadingInstances } = useWhatsAppInstances();
  const { toast } = useToast();

  const [clientGroups, setClientGroups] = useState<MonitoredGroup[]>([]);
  const [slaNotificationGroupId, setSlaNotificationGroupId] = useState<string | null>(null);
  const [slaNotificationGroupName, setSlaNotificationGroupName] = useState<string>("");

  // Daily report state
  const [drInstance, setDrInstance] = useState("");
  const [drSendType, setDrSendType] = useState<"all" | "specific">("all");
  const [drTargetGroup, setDrTargetGroup] = useState("");
  const [drDestGroup, setDrDestGroup] = useState("");
  const [drStatus, setDrStatus] = useState<InvokeStatus>("idle");
  const [drResponse, setDrResponse] = useState<string>("");

  // SLA state
  const [slaInstance, setSlaInstance] = useState("");
  const [slaTargetGroup, setSlaTargetGroup] = useState("");
  const [slaStatus, setSlaStatus] = useState<InvokeStatus>("idle");
  const [slaResponse, setSlaResponse] = useState<string>("");

  useEffect(() => {
    fetchClientGroups();
    fetchSlaNotificationGroup();
  }, []);

  async function fetchClientGroups() {
    const { data } = await supabase
      .from("monitored_groups")
      .select("id, name, whatsapp_id")
      .eq("is_client_group", true)
      .eq("is_archived", false)
      .order("name");
    if (data) setClientGroups(data);
  }

  async function fetchSlaNotificationGroup() {
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "sla_notification_group_id")
      .single();

    if (setting?.value) {
      setSlaNotificationGroupId(setting.value);
      const { data: group } = await supabase
        .from("monitored_groups")
        .select("name")
        .eq("id", setting.value)
        .single();
      if (group) setSlaNotificationGroupName(group.name);
    }
  }

  async function handleDailyReport() {
    setDrStatus("loading");
    setDrResponse("");
    try {
      const body: Record<string, string> = {};
      if (drSendType === "specific" && drTargetGroup) {
        body.targetGroupId = drTargetGroup;
      }
      if (drDestGroup) {
        body.destinationGroupId = drDestGroup;
      }

      const { data, error } = await supabase.functions.invoke("daily-report", { body });

      if (error) throw error;
      setDrStatus("success");
      setDrResponse(JSON.stringify(data, null, 2));
      toast({ title: "Resumo diário disparado", description: "Verifique a resposta abaixo." });
    } catch (err: any) {
      setDrStatus("error");
      setDrResponse(err?.message || JSON.stringify(err));
      toast({ title: "Erro ao disparar resumo", description: err?.message, variant: "destructive" });
    }
  }

  async function handleSlaTest() {
    setSlaStatus("loading");
    setSlaResponse("");
    try {
      const body: Record<string, any> = { testMode: true };
      if (slaTargetGroup) body.groupId = slaTargetGroup;

      const { data, error } = await supabase.functions.invoke("analyze-tickets", { body });

      if (error) throw error;
      setSlaStatus("success");
      setSlaResponse(JSON.stringify(data, null, 2));
      toast({ title: "Simulação de SLA disparada", description: "Verifique a resposta abaixo." });
    } catch (err: any) {
      setSlaStatus("error");
      setSlaResponse(err?.message || JSON.stringify(err));
      toast({ title: "Erro ao simular SLA", description: err?.message, variant: "destructive" });
    }
  }

  const StatusIcon = ({ status }: { status: InvokeStatus }) => {
    if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (status === "success") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  const ResponseBlock = ({ response, status }: { response: string; status: InvokeStatus }) => {
    if (status === "idle") return null;
    return (
      <Collapsible className="mt-4">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-4 w-4" />
          <span>Resposta da função</span>
          <StatusIcon status={status} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-auto max-h-64 text-foreground">
            {status === "loading" ? "Aguardando resposta..." : response || "Sem resposta"}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <MainLayout
      headerContent={
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Testes de Envio</h1>
        </div>
      }
    >
      <div className="space-y-6 max-w-2xl">
        {/* Card 1: Resumo Diário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Send className="h-5 w-5" />
              Resumo Diário
            </CardTitle>
            <CardDescription>
              Dispare manualmente o envio do resumo diário para validar o funcionamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instância WhatsApp</Label>
              <Select value={drInstance} onValueChange={setDrInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} ({inst.status || "sem status"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grupo de destino do resumo</Label>
              <Select value={drDestGroup} onValueChange={setDrDestGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo de destino" />
                </SelectTrigger>
                <SelectContent>
                  {clientGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de envio</Label>
              <Select value={drSendType} onValueChange={(v) => setDrSendType(v as "all" | "specific")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  <SelectItem value="specific">Grupo específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {drSendType === "specific" && (
              <div className="space-y-2">
                <Label>Grupo para gerar relatório</Label>
                <Select value={drTargetGroup} onValueChange={setDrTargetGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleDailyReport} disabled={drStatus === "loading"} className="w-full">
              {drStatus === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Disparando...</>
              ) : (
                <><Send className="h-4 w-4" /> Disparar Resumo Diário</>
              )}
            </Button>

            <ResponseBlock response={drResponse} status={drStatus} />
          </CardContent>
        </Card>

        {/* Card 2: Estouro de SLA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5" />
              Estouro de SLA
            </CardTitle>
            <CardDescription>
              Simule um alerta de estouro de SLA para testar as notificações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instância WhatsApp</Label>
              <Select value={slaInstance} onValueChange={setSlaInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} ({inst.status || "sem status"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grupo de notificação</Label>
              <div className="p-2 rounded-md bg-muted text-sm text-muted-foreground">
                {slaNotificationGroupName || "Nenhum grupo configurado"}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Grupo para simular estouro</Label>
              <Select value={slaTargetGroup} onValueChange={setSlaTargetGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {clientGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSlaTest} disabled={slaStatus === "loading"} variant="destructive" className="w-full">
              {slaStatus === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Simulando...</>
              ) : (
                <><AlertTriangle className="h-4 w-4" /> Simular Alerta de SLA</>
              )}
            </Button>

            <ResponseBlock response={slaResponse} status={slaStatus} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
