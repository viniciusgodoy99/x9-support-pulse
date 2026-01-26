import { useEffect, useState, useMemo } from "react";
import { Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Snowflake, Users, Brain, Filter, MessageSquare, X, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useTickets } from "@/hooks/useTickets";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useGroups } from "@/hooks/useGroups";
import { useIsMobile } from "@/hooks/use-mobile";
import { TicketHistoryCard } from "@/components/reports/TicketHistoryCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const categoryConfig: Record<string, { label: string; className: string }> = {
  duvida: { label: "Dúvida", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  solicitacao: { label: "Solicitação", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  reclamacao: { label: "Reclamação", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  agendamento: { label: "Agendamento", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  suporte_tecnico: { label: "Suporte Técnico", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  financeiro: { label: "Financeiro", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  feedback: { label: "Feedback", className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  geral: { label: "Geral", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
};

const ITEMS_PER_PAGE = 10;

export default function Dashboard() {
  const { tickets, loading: ticketsLoading } = useTickets();
  const { members, loading: membersLoading } = useTeamMembers();
  const { groups, loading: groupsLoading } = useGroups();
  const isMobile = useIsMobile();

  const [selectedCS, setSelectedCS] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [slaDistribution, setSlaDistribution] = useState<{ name: string; value: number }[]>([]);
  const [stats, setStats] = useState({
    todayTotal: 0,
    pending: 0,
    avgSla: 0,
    resolved: 0,
  });

  // Filter only CS members
  const csMembers = useMemo(() => 
    members.filter(m => m.role === "CS" && m.is_active),
    [members]
  );

  // Filter only client groups
  const clientGroups = useMemo(() => 
    groups.filter(g => g.is_client_group && g.is_active),
    [groups]
  );

  // Filter tickets based on selected group, CS, and categories
  const filteredTickets = useMemo(() => {
    let result = tickets;
    
    if (selectedGroup !== "all") {
      result = result.filter(t => t.monitored_groups?.id === selectedGroup);
    }
    
    if (selectedCS !== "all") {
      result = result.filter(t => t.resolved_by === selectedCS);
    }
    
    if (selectedCategories.length > 0) {
      result = result.filter(t => 
        t.demands?.some(d => selectedCategories.includes(d.category))
      );
    }
    
    return result;
  }, [tickets, selectedGroup, selectedCS, selectedCategories]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCS, selectedGroup, selectedCategories]);

  // Stats calculation
  useEffect(() => {
    if (filteredTickets.length === 0) {
      setStats({ todayTotal: 0, pending: 0, avgSla: 0, resolved: 0 });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTickets = filteredTickets.filter(
      (t) => new Date(t.created_at) >= today
    );

    const pendingTickets = filteredTickets.filter((t) => t.status === "open");

    const resolvedToday = todayTickets.filter(
      (t) => t.status === "resolved" && t.first_response_at
    );

    const avgSla =
      resolvedToday.length > 0
        ? resolvedToday.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created) / (1000 * 60);
          }, 0) / resolvedToday.length
        : 0;

    setStats({
      todayTotal: todayTickets.length,
      pending: pendingTickets.length,
      avgSla: Math.round(avgSla),
      resolved: resolvedToday.length,
    });
  }, [filteredTickets]);

  // SLA Distribution calculation
  useEffect(() => {
    if (filteredTickets.length === 0) {
      setSlaDistribution([]);
      return;
    }

    const resolvedTickets = filteredTickets.filter(
      (t) => t.status === "resolved" && t.first_response_at
    );

    let ok = 0, warning = 0, critical = 0;

    resolvedTickets.forEach((t) => {
      const created = new Date(t.created_at).getTime();
      const responded = new Date(t.first_response_at!).getTime();
      const minutes = (responded - created) / (1000 * 60);
      const limit = t.monitored_groups?.sla_limit_minutes || 30;

      if (minutes < limit / 2) ok++;
      else if (minutes < limit) warning++;
      else critical++;
    });

    setSlaDistribution([
      { name: "Dentro do SLA", value: ok },
      { name: "Alerta", value: warning },
      { name: "Estourado", value: critical },
    ]);
  }, [filteredTickets]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map(date => {
      const dayTickets = filteredTickets.filter(t => {
        const ticketDate = new Date(t.created_at);
        return ticketDate.toDateString() === date.toDateString();
      });

      const resolvedWithResponse = dayTickets.filter(
        t => t.status === "resolved" && t.first_response_at
      );

      const avgSla = resolvedWithResponse.length > 0
        ? resolvedWithResponse.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created) / (1000 * 60);
          }, 0) / resolvedWithResponse.length
        : 0;

      return {
        day: days[date.getDay()],
        tickets: dayTickets.length,
        slaAvg: Math.round(avgSla),
      };
    });
  }, [filteredTickets]);

  // Team performance
  const teamPerformance = useMemo(() => {
    const membersToShow = selectedCS === "all" 
      ? csMembers 
      : csMembers.filter(m => m.id === selectedCS);

    return membersToShow.map(member => {
      const memberTickets = filteredTickets.filter(
        t => t.resolved_by === member.id && t.status === "resolved"
      );

      const ticketsWithResponse = memberTickets.filter(t => t.first_response_at);
      const avgSla = ticketsWithResponse.length > 0
        ? ticketsWithResponse.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created) / (1000 * 60);
          }, 0) / ticketsWithResponse.length
        : 0;

      return {
        name: member.name.split(" ")[0],
        tickets: memberTickets.length,
        avgSla: Math.round(avgSla),
      };
    });
  }, [csMembers, filteredTickets, selectedCS]);

  // Paginated resolved tickets
  const resolvedTickets = useMemo(() => 
    filteredTickets.filter((t) => t.status === "resolved"),
    [filteredTickets]
  );

  const totalPages = Math.ceil(resolvedTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return resolvedTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [resolvedTickets, currentPage]);

  const loading = ticketsLoading || membersLoading || groupsLoading;

  const activeFiltersCount = (selectedCS !== "all" ? 1 : 0) + (selectedGroup !== "all" ? 1 : 0) + selectedCategories.length;

  const chartHeight = isMobile ? 250 : 300;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Snowflake className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                Visão geral do monitoramento de SLA
              </p>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filtros Avançados</h4>
                  <p className="text-sm text-muted-foreground">
                    Filtre os dados por CS, grupo ou categoria
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Filtrar por CS
                  </Label>
                  <Select value={selectedCS} onValueChange={setSelectedCS}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um CS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os CS</SelectItem>
                      {csMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Filtrar por Grupo
                  </Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os grupos</SelectItem>
                      {clientGroups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Filtrar por Categoria
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1">
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${key}`}
                          checked={selectedCategories.includes(key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, key]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== key));
                            }
                          }}
                        />
                        <label 
                          htmlFor={`cat-${key}`} 
                          className="text-sm cursor-pointer select-none"
                        >
                          {config.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedCS("all");
                      setSelectedGroup("all");
                      setSelectedCategories([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Tickets Hoje"
            value={stats.todayTotal}
            subtitle="Total de atendimentos"
            icon={Ticket}
          />
          <StatsCard
            title="Pendentes"
            value={stats.pending}
            subtitle="Aguardando resposta"
            icon={AlertTriangle}
            variant={stats.pending > 0 ? "warning" : "default"}
          />
          <StatsCard
            title="SLA Médio"
            value={`${stats.avgSla}min`}
            subtitle="Tempo de primeira resposta"
            icon={Clock}
            variant={stats.avgSla > 30 ? "danger" : stats.avgSla > 15 ? "warning" : "success"}
          />
          <StatsCard
            title="Resolvidos"
            value={stats.resolved}
            subtitle="Finalizados hoje"
            icon={CheckCircle}
            variant="success"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="performance">Desempenho</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="frosted-glass border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Tendência Semanal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weeklyTrend.every(d => d.tickets === 0) ? (
                      <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
                        <p>Sem dados para o período</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={chartHeight}>
                        <LineChart data={weeklyTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="day" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "var(--radius)",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tickets"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="Tickets"
                          />
                          <Line
                            type="monotone"
                            dataKey="slaAvg"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            name="SLA Médio (min)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="frosted-glass border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Distribuição de SLA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {slaDistribution.length === 0 || slaDistribution.every(d => d.value === 0) ? (
                      <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                        <Clock className="h-12 w-12 mb-2 opacity-50" />
                        <p>Sem dados de SLA disponíveis</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={chartHeight}>
                        <PieChart>
                          <Pie
                            data={slaDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={isMobile ? 60 : 80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {slaDistribution.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  index === 0
                                    ? "hsl(var(--sla-ok))"
                                    : index === 1
                                    ? "hsl(var(--sla-warning))"
                                    : "hsl(var(--sla-critical))"
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "var(--radius)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="mt-6">
              <Card className="frosted-glass border-border/50">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Desempenho por Membro
                  </CardTitle>
                  <Select value={selectedCS} onValueChange={setSelectedCS}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar membro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {csMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {teamPerformance.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Users className="h-12 w-12 mb-2 opacity-50" />
                      <p>Adicione membros da equipe para ver o desempenho</p>
                    </div>
                  ) : teamPerformance.every(m => m.tickets === 0) ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Users className="h-12 w-12 mb-2 opacity-50" />
                      <p>Nenhum ticket atribuído</p>
                      <p className="text-xs mt-1">Os tickets precisam ter o campo "Resolvido por" preenchido</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={teamPerformance}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                          }}
                        />
                        <Bar
                          dataKey="tickets"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          name="Tickets"
                        />
                        <Bar
                          dataKey="avgSla"
                          fill="hsl(var(--chart-2))"
                          radius={[4, 4, 0, 0]}
                          name="SLA Médio (min)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              <Card className="frosted-glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Histórico de Atendimentos
                    {resolvedTickets.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resolvedTickets.length} total
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {paginatedTickets.map((ticket) => (
                      <TicketHistoryCard key={ticket.id} ticket={ticket} />
                    ))}
                    {resolvedTickets.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Ticket className="h-12 w-12 mb-2 opacity-50" />
                        <p>Nenhum atendimento finalizado</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground mr-2">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
