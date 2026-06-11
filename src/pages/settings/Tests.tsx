import { useState, useEffect, useMemo, ReactNode } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Send, Loader2,
  CheckCircle2, XCircle, Eye, MessageSquare, FileText, Filter, CalendarDays
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
  hasDemands?: boolean;
  demandsCount: number;
  messagesCount: number;
  resolvedCount?: number;
  pendingCount?: number;
  message: string | null;
}

type InvokeStatus = "idle" | "loading" | "success" | "error";

export default function Tests() {
  const { instances, loading: loadingInstances } = useWhatsAppInstances();
  const { toast } = useToast();

  const [clientGroups, setClientGroups] = useState<MonitoredGroup[]>([]);

  // Daily report state
  const [drInstance, setDrInstance] = useState("");
  const [drStatus, setDrStatus] = useState<InvokeStatus>("idle");
  const [previews, setPreviews] = useState<Map<string, GroupPreview>>(new Map());
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<GroupPreview | null>(null);
  const [interactionFilter, setInteractionFilter] = useState<"all" | "with" | "without">("all");

  // Weekly report state
  const [wrStatus, setWrStatus] = useState<InvokeStatus>("idle");
  const [weeklyPreviews, setWeeklyPreviews] = useState<Map<string, GroupPreview>>(new Map());
  const [loadingWeeklyPreviewId, setLoadingWeeklyPreviewId] = useState<string | null>(null);
  const [weeklyPreviewModal, setWeeklyPreviewModal] = useState<GroupPreview | null>(null);
  const [weeklyDateRange, setWeeklyDateRange] = useState("");
  const [weeklyFilter, setWeeklyFilter] = useState<"all" | "with" | "without">("all");

  useEffect(() => {
    fetchClientGroups();
  }, []);

  useEffect(() => {
    if (instances.length === 1 && !drInstance) {
      setDrInstance(instances[0].id);
    }
  }, [instances]);

  useEffect(() => {
    setInteractionFilter("all");
    setPreviews(new Map());
    setWeeklyFilter("all");
    setWeeklyPreviews(new Map());
  }, [drInstance]);

  async function fetchClientGroups() {
    const { data } = await supabase
      .from("monitored_groups")
      .select("id, name, whatsapp_id")
      .eq("is_client_group", true)
      .eq("is_archived", false)
      .order("name");
    if (data) setClientGroups(data);
  }

  // Daily filters
  const filteredGroups = useMemo(() => {
    if (interactionFilter === "all") return clientGroups;
    return clientGroups.filter(g => {
      const preview = previews.get(g.id);
      if (interactionFilter === "with") return preview && preview.messagesCount > 0;
      return !preview || preview.messagesCount === 0;
    });
  }, [clientGroups, previews, interactionFilter]);

  // Weekly filters
  const weeklyFilteredGroups = useMemo(() => {
    if (weeklyFilter === "all") return clientGroups;
    return clientGroups.filter(g => {
      const preview = weeklyPreviews.get(g.id);
      if (weeklyFilter === "with") return preview && (preview.messagesCount > 0 || preview.demandsCount > 0);
      return !preview || (preview.messagesCount === 0 && preview.demandsCount === 0);
    });
  }, [clientGroups, weeklyPreviews, weeklyFilter]);

  // ---- Daily handlers ----
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

  // ---- Weekly handlers ----
  async function handleLoadAllWeeklyPreviews() {
    setWrStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("weekly-report", {
        body: { previewOnly: true },
      });
      if (error) throw error;

      const newPreviews = new Map<string, GroupPreview>();
      for (const p of data.previews || []) {
        newPreviews.set(p.groupId, p);
      }
      setWeeklyPreviews(newPreviews);
      setWeeklyDateRange(data.dateRange || "");
      setWrStatus("success");
      toast({ title: "Previews semanais carregados", description: `${newPreviews.size} grupos processados.` });
    } catch (err: any) {
      setWrStatus("error");
      toast({ title: "Erro ao carregar previews semanais", description: err?.message, variant: "destructive" });
    }
  }

  async function handleLoadSingleWeeklyPreview(groupId: string) {
    setLoadingWeeklyPreviewId(groupId);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-report", {
        body: { previewOnly: true, targetGroupId: groupId },
      });
      if (error) throw error;

      const preview = (data.previews || [])[0];
      if (preview) {
        setWeeklyPreviews((prev) => new Map(prev).set(preview.groupId, preview));
        setWeeklyPreviewModal(preview);
        setWeeklyDateRange(data.dateRange || "");
      } else {
        toast({ title: "Sem dados", description: "Não há atividade esta semana para este grupo.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar preview semanal", description: err?.message, variant: "destructive" });
    } finally {
      setLoadingWeeklyPreviewId(null);
    }
  }

  // ---- Shared group card renderer ----
  function renderGroupCard(
    group: MonitoredGroup,
    preview: GroupPreview | undefined,
    isLoading: boolean,
    onView: () => void,
    type: "daily" | "weekly"
  ) {
    return (
      <Card key={`${type}-${group.id}`} className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-tight truncate flex-1">
              {group.name}
            </h3>
            {preview && preview.message && (
              <Badge
                variant={
                  type === "daily"
                    ? preview.hasDemands ? "default" : "secondary"
                    : preview.demandsCount > 0 ? "default" : "secondary"
                }
                className="shrink-0 text-[10px]"
              >
                {type === "daily"
                  ? preview.hasDemands ? "Demandas" : "Interação"
                  : `${preview.demandsCount} dem.`}
              </Badge>
            )}
          </div>

          {preview && (
            <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
              {preview.demandsCount > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {preview.demandsCount} demandas
                </span>
              )}
              {type === "weekly" && preview.resolvedCount !== undefined && preview.resolvedCount > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> {preview.resolvedCount} resolvidas
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
            onClick={onView}
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
  }

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
        {/* ===== Resumo Diário ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Send className="h-5 w-5" />
                Resumo Diário
              </CardTitle>
              {drInstance && previews.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {clientGroups.filter(g => { const p = previews.get(g.id); return p && p.messagesCount > 0; }).length} com interação
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {clientGroups.filter(g => { const p = previews.get(g.id); return !p || p.messagesCount === 0; }).length} sem interação
                  </Badge>
                </div>
              )}
            </div>
            <CardDescription>
              Selecione a instância para visualizar os grupos e pré-visualizar as mensagens diárias.
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
                <>
                  <div className="space-y-2">
                    <Label>Filtro</Label>
                    <Select value={interactionFilter} onValueChange={(v) => setInteractionFilter(v as any)}>
                      <SelectTrigger className="w-[180px]" disabled={previews.size === 0}>
                        <Filter className="h-4 w-4 mr-2 shrink-0" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="with">Com interação</SelectItem>
                        <SelectItem value="without">Sem interação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </>
              )}
            </div>

            {drInstance && filteredGroups.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {filteredGroups.map((group) => {
                  const preview = previews.get(group.id);
                  const isLoading = loadingPreviewId === group.id;

                  return renderGroupCard(
                    group,
                    preview,
                    isLoading,
                    () => {
                      if (preview?.message) setPreviewModal(preview);
                      else handleLoadSinglePreview(group.id);
                    },
                    "daily"
                  );
                })}
              </div>
            )}

            {drInstance && filteredGroups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {interactionFilter === "all"
                  ? "Nenhum grupo de cliente ativo encontrado."
                  : interactionFilter === "with"
                    ? "Nenhum grupo com interação encontrado."
                    : "Nenhum grupo sem interação encontrado."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ===== Resumo Semanal ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarDays className="h-5 w-5" />
                Resumo Semanal
              </CardTitle>
              {weeklyPreviews.size > 0 && (
                <div className="flex items-center gap-2">
                  {weeklyDateRange && (
                    <Badge variant="outline" className="text-xs">
                      {weeklyDateRange}
                    </Badge>
                  )}
                  <Badge variant="default" className="text-xs">
                    {[...weeklyPreviews.values()].filter(p => p.message).length} com atividade
                  </Badge>
                </div>
              )}
            </div>
            <CardDescription>
              Pré-visualize o resumo semanal que será enviado às sextas-feiras às 18h. A IA separa o que foi feito/decidido do que ficou pendente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              {drInstance && (
                <>
                  <div className="space-y-2">
                    <Label>Filtro</Label>
                    <Select value={weeklyFilter} onValueChange={(v) => setWeeklyFilter(v as any)}>
                      <SelectTrigger className="w-[180px]" disabled={weeklyPreviews.size === 0}>
                        <Filter className="h-4 w-4 mr-2 shrink-0" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="with">Com atividade</SelectItem>
                        <SelectItem value="without">Sem atividade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleLoadAllWeeklyPreviews}
                    disabled={wrStatus === "loading"}
                    variant="secondary"
                  >
                    {wrStatus === "loading" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><CalendarDays className="h-4 w-4" /> Carregar Previews Semanais</>
                    )}
                  </Button>
                </>
              )}
            </div>

            {!drInstance && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Selecione uma instância WhatsApp acima para visualizar os resumos semanais.
              </p>
            )}

            {drInstance && weeklyFilteredGroups.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {weeklyFilteredGroups.map((group) => {
                  const preview = weeklyPreviews.get(group.id);
                  const isLoading = loadingWeeklyPreviewId === group.id;

                  return renderGroupCard(
                    group,
                    preview,
                    isLoading,
                    () => {
                      if (preview?.message) setWeeklyPreviewModal(preview);
                      else handleLoadSingleWeeklyPreview(group.id);
                    },
                    "weekly"
                  );
                })}
              </div>
            )}

            {drInstance && weeklyFilteredGroups.length === 0 && weeklyPreviews.size > 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum grupo encontrado com o filtro selecionado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Preview Modal */}
      <Dialog open={!!previewModal} onOpenChange={(open) => !open && setPreviewModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewModal?.groupName}</DialogTitle>
            <DialogDescription>
              Prévia da mensagem diária que será enviada no WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono leading-relaxed">
            {previewModal?.message || "Sem mensagem disponível"}
          </div>
        </DialogContent>
      </Dialog>

      {/* Weekly Preview Modal */}
      <Dialog open={!!weeklyPreviewModal} onOpenChange={(open) => !open && setWeeklyPreviewModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {weeklyPreviewModal?.groupName}
            </DialogTitle>
            <DialogDescription>
              Prévia do resumo semanal {weeklyDateRange && `(${weeklyDateRange})`}
            </DialogDescription>
          </DialogHeader>
          {weeklyPreviewModal && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">
                  {weeklyPreviewModal.demandsCount} demandas
                </Badge>
                {weeklyPreviewModal.resolvedCount !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {weeklyPreviewModal.resolvedCount} resolvidas
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {weeklyPreviewModal.messagesCount} mensagens
                </Badge>
              </div>
              <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono leading-relaxed">
                {weeklyPreviewModal.message || "Sem mensagem disponível"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
