import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, ExternalLink, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function ClickUpSettings() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "clickup_api_token")
        .single();
      if (data?.value) {
        setSavedToken(data.value);
        setToken(data.value);
      }
    } catch {
      // No token saved yet
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      toast({ title: "Token vazio", description: "Insira um token válido.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (savedToken) {
        const { error } = await supabase
          .from("settings")
          .update({ value: token.trim() })
          .eq("key", "clickup_api_token");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: "clickup_api_token", value: token.trim() });
        if (error) throw error;
      }
      setSavedToken(token.trim());
      setConnectionOk(null);
      toast({ title: "Token salvo", description: "Token do ClickUp atualizado com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setConnectionOk(null);
    try {
      const { data, error } = await supabase.functions.invoke("clickup-proxy", {
        body: { action: "get_teams" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.teams?.length >= 0) {
        setConnectionOk(true);
        toast({ title: "Conexão OK!", description: `${data.teams.length} workspace(s) encontrado(s).` });
      }
    } catch (err: any) {
      setConnectionOk(false);
      toast({ title: "Falha na conexão", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const maskedToken = savedToken ? `${savedToken.slice(0, 8)}${"•".repeat(20)}` : "";

  return (
    <MainLayout
      headerContent={
        <div className="flex flex-1 items-center gap-3">
          <ExternalLink className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Integração ClickUp</h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs hidden sm:block font-medium">
              Configure a integração com o ClickUp para gerenciar tarefas
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Token de API do ClickUp</CardTitle>
              {connectionOk === true && <Badge className="bg-primary/20 text-primary">Conectado</Badge>}
              {connectionOk === false && <Badge variant="destructive">Falha</Badge>}
            </div>
            <CardDescription>
              Insira seu Personal API Token do ClickUp para habilitar a integração.
              Obtenha em{" "}
              <a
                href="https://app.clickup.com/settings/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                ClickUp Settings → Apps
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Token</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="pk_XXXXXXXXXXXXXXX"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving || !token.trim()} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing || !savedToken}
                    className="gap-2"
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : connectionOk ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : connectionOk === false ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Testar Conexão
                  </Button>
                </div>

                {savedToken && (
                  <p className="text-xs text-muted-foreground">
                    Token salvo: <code className="font-mono">{maskedToken}</code>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
