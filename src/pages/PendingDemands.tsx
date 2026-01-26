import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PendingDemandCard } from "@/components/demands/PendingDemandCard";
import { usePendingDemands } from "@/hooks/usePendingDemands";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Filter, ClipboardList, Inbox, Tag } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const categoryConfig: Record<string, { label: string }> = {
  duvida: { label: "Dúvida" },
  solicitacao: { label: "Solicitação" },
  reclamacao: { label: "Reclamação" },
  agendamento: { label: "Agendamento" },
  suporte_tecnico: { label: "Suporte Técnico" },
  financeiro: { label: "Financeiro" },
  feedback: { label: "Feedback" },
  geral: { label: "Geral" },
};

const priorityConfig: Record<string, { label: string }> = {
  urgent: { label: "Urgente" },
  high: { label: "Alta" },
  normal: { label: "Normal" },
  low: { label: "Baixa" },
};

export default function PendingDemands() {
  const { demands, loading, refetch } = usePendingDemands();
  const { groups } = useGroups();
  
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  const filteredDemands = useMemo(() => {
    let result = demands;

    if (selectedGroup !== "all") {
      result = result.filter((d) => d.group_id === selectedGroup);
    }

    if (selectedCategories.length > 0) {
      result = result.filter((d) => selectedCategories.includes(d.category));
    }

    if (selectedPriorities.length > 0) {
      result = result.filter((d) => selectedPriorities.includes(d.priority));
    }

    return result;
  }, [demands, selectedGroup, selectedCategories, selectedPriorities]);

  const activeFiltersCount = 
    (selectedGroup !== "all" ? 1 : 0) + 
    selectedCategories.length + 
    selectedPriorities.length;

  const handleClearFilters = () => {
    setSelectedGroup("all");
    setSelectedCategories([]);
    setSelectedPriorities([]);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const clientGroups = groups.filter((g) => g.is_client_group && g.is_active);

  const headerContent = (
    <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Demandas Pendentes</h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            Visualize e acompanhe todas as demandas aguardando resolução
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout headerContent={headerContent}>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-5 w-5" />
              <span className="text-sm">
                {loading ? (
                  "Carregando..."
                ) : (
                  <>
                    <span className="font-semibold text-foreground">
                      {filteredDemands.length}
                    </span>{" "}
                    demanda{filteredDemands.length !== 1 ? "s" : ""} pendente
                    {filteredDemands.length !== 1 ? "s" : ""}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Group Filter */}
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {clientGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced Filters */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir filtros avançados</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtros Avançados</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-auto py-1 px-2 text-xs"
                      >
                        Limpar Filtros
                      </Button>
                    )}
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(priorityConfig).map(([key, { label }]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`priority-${key}`}
                            checked={selectedPriorities.includes(key)}
                            onCheckedChange={() => togglePriority(key)}
                          />
                          <label
                            htmlFor={`priority-${key}`}
                            className="text-sm cursor-pointer"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Categoria
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(categoryConfig).map(([key, { label }]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${key}`}
                            checked={selectedCategories.includes(key)}
                            onCheckedChange={() => toggleCategory(key)}
                          />
                          <label
                            htmlFor={`category-${key}`}
                            className="text-sm cursor-pointer"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Atualizar lista de demandas</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[180px] rounded-lg" />
            ))}
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              Nenhuma demanda pendente
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {activeFiltersCount > 0
                ? "Nenhuma demanda encontrada com os filtros selecionados. Tente ajustar os filtros."
                : "Todas as demandas foram resolvidas. Excelente trabalho! 🎉"}
            </p>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="mt-4"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDemands.map((demand) => (
              <PendingDemandCard key={demand.id} demand={demand} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
