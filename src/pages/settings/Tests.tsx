import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Send, AlertTriangle, ChevronDown, Loader2,
  CheckCircle2, XCircle, Eye, MessageSquare, FileText
} from "lucide-react";

interface MonitoredGroup {
  id: string;
  name: string;
  whatsapp_id: string;
}

interface GroupPreview {
  groupId: string;
  groupName: string;
  whatsappId: string;
  hasDemands: boolean;
  demandsCount: number;
  messagesCount: number;
  message: string | null;
}

type InvokeStatus = "idle" | "loading" | "success" | "error";

export default function Tests() {
  const { instances, loading: loadingInstances } = useWhatsAppInstances();
  const { toast } = useToast();

  const [clientGroups, setClientGroups] = useState<MonitoredGroup[]>([]);
  const [slaNotificationGroupName, setSlaNotificationGroupName] = useState("");

  // Daily report state
  const [drInstance, setDrInstance] = useState("");
  const [drStatus, setDrStatus] = useState<InvokeStatus>("idle");
  const [previews, setPreviews] = useState<Map<string, GroupPreview>>(new Map());
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<GroupPreview | null>(null);

  // SLA state
  const [slaInstance, setSlaInstance] = useState("");
  const [slaTargetGroup, setSlaTargetGroup] = useState("");
  const [slaStatus, setSlaStatus] = useState<InvokeStatus>("idle");
  const [slaResponse, setSlaResponse] = useState("");

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
      const { data: group } = await supabase
        .from("monitored_groups")
        .select("name")
        .eq("id", setting.value)
        .single();
      if (group) setSlaNotificationGroupName(group.name);
    }
  }

  async function handleLoadAllPreviews() {
    setDrStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("daily-report", {
        body: { previewOnly: true },
      });
      if (error) throw error;

      const newPreviews = new Map<string, GroupPreview>();
      for (const p of data.previews || []) {
        newPreviews.set(p.groupId, p);
      }
      setPreviews(newPreviews);
      setDrStatus("success");
      toast({ title: "Previews carregados", description: `${newPreviews.size} mensagens geradas.` });
    } catch (err: any) {
      setDrStatus("error");
      toast({ title: "Erro ao carregar previews", description: err?.message, variant: "destructive" });
    }
  }

  async function handleLoadSinglePreview(groupId: string) {
    setLoadingPreviewId(groupId);
    try {
      const { data, error } = await supabase.functions.invoke("daily-report", {
        body: { previewOnly: true, targetGroupId: groupId },
      });
      if (error) throw error;

      const preview = (data.previews || [])[0];
      if (preview) {
        setPreviews((prev) => new Map(prev).set(preview.groupId, preview));
        setPreviewModal(preview);
      } else {
        toast({ title: "Sem dados", description: "Não há interações hoje para gerar preview deste grupo.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar preview", description: err?.message, variant: "destructive" });
    } finally {
      setLoadingPreviewId(null);
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
      <div className="space-y-6">
        {/* Card 1: Resumo Diário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Send className="h-5 w-5" />
              Resumo Diário
            </CardTitle>
            <CardDescription>
              Selecione a instância para visualizar os grupos e pré-visualizar as mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1">
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

              {drInstance && (
                <Button
                  onClick={handleLoadAllPreviews}
                  disabled={drStatus === "loading"}
                  variant="secondary"
                >
                  {drStatus === "loading" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><FileText className="h-4 w-4" /> Carregar Previews</>
                  )}
                </Button>
              )}
            </div>

            {/* Group Cards Grid */}
            {drInstance && clientGroups.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {clientGroups.map((group) => {
                  const preview = previews.get(group.id);
                  const isLoading = loadingPreviewId === group.id;

                  return (
                    <Card key={group.id} className="border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-sm leading-tight truncate flex-1">
                            {group.name}
                          </h3>
                          {preview && (
                            <Badge variant={preview.hasDemands ? "default" : "secondary"} className="shrink-0 text-[10px]">
                              {preview.hasDemands ? "Demandas" : "Interação"}
                            </Badge>
                          )}
                        </div>

                        {preview && (
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {preview.demandsCount > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" /> {preview.demandsCount} demandas
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> {preview.messagesCount} msgs
                            </span>
                          </div>
                        )}

                        {preview?.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {preview.message.split("\n").slice(2, 4).join(" ")}
                          </p>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={isLoading}
                          onClick={() => {
                            if (preview?.message) {
                              setPreviewModal(preview);
                            } else {
                              handleLoadSinglePreview(group.id);
                            }
                          }}
                        >
                          {isLoading ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</>
                          ) : (
                            <><Eye className="h-3 w-3" /> Visualizar Mensagem</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {drInstance && clientGroups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum grupo de cliente ativo encontrado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Estouro de SLA */}
        <Card className="max-w-2xl">
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

      {/* Preview Modal */}
      <Dialog open={!!previewModal} onOpenChange={(open) => !open && setPreviewModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewModal?.groupName}</DialogTitle>
            <DialogDescription>
              Prévia da mensagem que será enviada no WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono leading-relaxed">
            {previewModal?.message || "Sem mensagem disponível"}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
