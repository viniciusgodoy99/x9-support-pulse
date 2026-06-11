import { useState, useEffect } from "react";
import { Shield, Save, Info, CheckCircle2, XCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Permission {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
}

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('x9_permissions')
        .select('*')
        .order('label');
      
      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      console.error("Erro ao buscar permissões:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('x9_permissions')
        .update({ is_enabled: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setPermissions(permissions.map(p => 
        p.id === id ? { ...p, is_enabled: !currentStatus } : p
      ));

      toast({
        title: "Permissão atualizada",
        description: "A função foi " + (!currentStatus ? "ativada" : "desativada") + " com sucesso.",
      });
    } catch (err) {
      console.error("Erro ao atualizar permissão:", err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a permissão.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const headerContent = (
    <div className="flex flex-1 items-center gap-3">
      <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Permissões do X9</h1>
        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
          Gerencie quais funções do sistema estão ativas
        </p>
      </div>
    </div>
  );

  return (
    <MainLayout headerContent={headerContent}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Funções do Sistema</CardTitle>
            <CardDescription>
              Ative ou desative as principais funcionalidades do sistema X9.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma permissão configurada.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {permissions.map((permission) => (
                  <div 
                    key={permission.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{permission.label}</span>
                        {permission.is_enabled ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {permission.description && (
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={permission.is_enabled}
                        onCheckedChange={() => handleToggle(permission.id, permission.is_enabled)}
                        disabled={savingId === permission.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 border">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Nota sobre Permissões</p>
            <p>
              Desativar uma função impedirá que o sistema execute as tarefas associadas a ela imediatamente. 
              Isso pode afetar o monitoramento em tempo real e a geração de alertas.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}