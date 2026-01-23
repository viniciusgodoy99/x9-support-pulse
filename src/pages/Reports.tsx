import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, Clock, Users, Brain, Filter, MessageSquare, X, Tag } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useTickets } from "@/hooks/useTickets";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useGroups } from "@/hooks/useGroups";
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

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

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

export default function Reports() {
  const { tickets, loading: ticketsLoading } = useTickets();
  const { members, loading: membersLoading } = useTeamMembers();
  const { groups, loading: groupsLoading } = useGroups();
  const [slaDistribution, setSlaDistribution] = useState<{ name: string; value: number }[]>([]);
  const [selectedCS, setSelectedCS] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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
    
    // Filter by group
    if (selectedGroup !== "all") {
      result = result.filter(t => t.monitored_groups?.id === selectedGroup);
    }
    
    // Filter by CS (using resolved_by)
    if (selectedCS !== "all") {
      result = result.filter(t => t.resolved_by === selectedCS);
    }
    
    // Filter by categories (tickets that have at least one demand with selected category)
    if (selectedCategories.length > 0) {
      result = result.filter(t => 
        t.demands?.some(d => selectedCategories.includes(d.category))
      );
    }
    
    return result;
  }, [tickets, selectedGroup, selectedCS, selectedCategories]);

  // SLA Distribution calculation
  useEffect(() => {
    if (filteredTickets.length === 0) {
      setSlaDistribution([]);
      return;
    }

    const resolvedTickets = filteredTickets.filter(
      (t) => t.status === "resolved" && t.first_response_at
    );

    let ok = 0,
      warning = 0,
      critical = 0;

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

  // Weekly trend - real data from last 7 days
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

  // Team performance - real data based on filtered tickets
  const teamPerformance = useMemo(() => {
    // Filter members based on CS filter
    const membersToShow = selectedCS === "all" 
      ? members 
      : members.filter(m => m.id === selectedCS);

    return membersToShow.map(member => {
      // Tickets resolved by this member
      const memberTickets = filteredTickets.filter(
        t => t.resolved_by === member.id && t.status === "resolved"
      );

      // Calculate average SLA
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
  }, [members, filteredTickets, selectedCS]);

  const loading = ticketsLoading || membersLoading || groupsLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Relatórios
            </h1>
            <p className="text-muted-foreground">
              Análise detalhada do desempenho da equipe
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros Avançados
                {(selectedCS !== "all" || selectedGroup !== "all" || selectedCategories.length > 0) && (
                  <Badge variant="secondary" className="ml-1">
                    {(selectedCS !== "all" ? 1 : 0) + (selectedGroup !== "all" ? 1 : 0) + selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filtros</h4>
                  <p className="text-sm text-muted-foreground">
                    Filtre os dados por CS ou grupo
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

                {(selectedCS !== "all" || selectedGroup !== "all" || selectedCategories.length > 0) && (
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tendência Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Distribuição de SLA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={slaDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
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
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Desempenho por Membro da Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamPerformance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p>Adicione membros da equipe para ver o desempenho</p>
                  </div>
                ) : teamPerformance.every(m => m.tickets === 0) && selectedCS !== "all" ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p>Nenhum ticket atribuído a este CS</p>
                    <p className="text-xs mt-1">Os tickets precisam ter o campo "Resolvido por" preenchido</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Histórico de Atendimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTickets
                    .filter((t) => t.status === "resolved")
                    .slice(0, 20)
                    .map((ticket) => (
                      <TicketHistoryCard key={ticket.id} ticket={ticket} />
                    ))}
                  {filteredTickets.filter((t) => t.status === "resolved").length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum atendimento finalizado ainda
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
