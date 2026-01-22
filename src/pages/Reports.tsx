import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Clock, Users, Brain } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTickets } from "@/hooks/useTickets";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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

export default function Reports() {
  const { tickets, loading: ticketsLoading } = useTickets();
  const { members, loading: membersLoading } = useTeamMembers();
  const [slaDistribution, setSlaDistribution] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (tickets.length === 0) return;

    const resolvedTickets = tickets.filter(
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
  }, [tickets]);

  // Weekly trend mock data
  const weeklyTrend = [
    { day: "Seg", tickets: 12, slaAvg: 18 },
    { day: "Ter", tickets: 19, slaAvg: 22 },
    { day: "Qua", tickets: 15, slaAvg: 15 },
    { day: "Qui", tickets: 22, slaAvg: 25 },
    { day: "Sex", tickets: 18, slaAvg: 20 },
    { day: "Sáb", tickets: 8, slaAvg: 12 },
    { day: "Dom", tickets: 5, slaAvg: 10 },
  ];

  // Team performance mock data
  const teamPerformance = members.map((m) => ({
    name: m.name.split(" ")[0],
    tickets: Math.floor(Math.random() * 30) + 10,
    avgSla: Math.floor(Math.random() * 25) + 5,
  }));

  const loading = ticketsLoading || membersLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Análise detalhada do desempenho da equipe
          </p>
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
                  {tickets
                    .filter((t) => t.status === "resolved")
                    .slice(0, 20)
                    .map((ticket) => (
                      <TicketHistoryCard key={ticket.id} ticket={ticket} />
                    ))}
                  {tickets.filter((t) => t.status === "resolved").length === 0 && (
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
