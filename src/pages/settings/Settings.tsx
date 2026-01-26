import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "@/hooks/use-toast";
import { Clock, Save, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Settings() {
  const { globalSla, loading, updateGlobalSla } = useSettings();
  
  const [editedSla, setEditedSla] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const currentValue = editedSla ?? globalSla;
  const hasChanges = editedSla !== null && editedSla !== globalSla;

  const handleSlaChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedSla(numValue);
  };

  const handleSave = async () => {
    if (editedSla === null || editedSla < 1) {
      toast({
        title: "Valor inválido",
        description: "O limite de SLA deve ser maior que 0 minutos.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const success = await updateGlobalSla(editedSla);
    setSaving(false);

    if (success) {
      toast({
        title: "SLA atualizado",
        description: `Limite de SLA global alterado para ${editedSla} minutos.`,
      });
      setEditedSla(null);
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o SLA. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const headerContent = (
    <div className="flex flex-1 items-center gap-3">
      <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Configurações de SLA</h1>
        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
          Configure o tempo máximo de resposta para atendimentos
        </p>
      </div>
    </div>
  );

  return (
    <MainLayout headerContent={headerContent}>
      <div className="space-y-6">

        {/* Global SLA Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Limite de SLA Global</CardTitle>
            </div>
            <CardDescription>
              Tempo máximo (em minutos) para primeira resposta ao cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Current Value Display */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Limite atual:</span>
                  <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                    {globalSla} minutos
                  </Badge>
                </div>

                {/* Input Section */}
                <div className="flex items-end gap-4">
                  <div className="flex-1 max-w-xs space-y-2">
                    <label className="text-sm font-medium">Novo limite (minutos)</label>
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={currentValue}
                      onChange={(e) => handleSlaChange(e.target.value)}
                      placeholder="minutos"
                      className="text-lg"
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="gap-2"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Salvar alterações de SLA</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Info Section */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Este limite se aplica a todos os grupos de cliente. Atendimentos que 
                    ultrapassarem este tempo serão marcados como em atraso no monitoramento.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
