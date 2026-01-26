import { useEffect, useState, useMemo } from "react";
import { Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Snowflake } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTickets } from "@/hooks/useTickets";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { TicketHistoryCard } from "@/components/reports/TicketHistoryCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { tickets, loading } = useTickets();
  const { members } = useTeamMembers();
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [stats, setStats] = useState({
    todayTotal: 0,
    pending: 0,
    avgSla: 0,
    resolved: 0,
  });

  useEffect(() => {
    if (tickets.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTickets = tickets.filter(
      (t) => new Date(t.created_at) >= today
    );

    const pendingTickets = tickets.filter((t) => t.status === "open");

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
  }, [tickets]);

  const recentResolved = tickets
    .filter((t) => t.status === "resolved")
    .slice(0, 5);

  // Membros CS ativos para o filtro
  const csMembers = useMemo(() => 
    members.filter(m => m.role === "CS" && m.is_active),
    [members]
  );

  // Cálculo real do tempo médio por membro
  const teamPerformance = useMemo(() => {
    const membersToShow = selectedMember === "all" 
      ? csMembers 
      : csMembers.filter(m => m.id === selectedMember);

    return membersToShow.map(member => {
      const memberTickets = tickets.filter(
        t => t.resolved_by === member.id && t.status === "resolved"
      );

      const ticketsWithResponse = memberTickets.filter(t => t.first_response_at);
      const avgTime = ticketsWithResponse.length > 0
        ? ticketsWithResponse.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created) / (1000 * 60);
          }, 0) / ticketsWithResponse.length
        : 0;

      return {
        name: member.name.split(" ")[0],
        tempo: Math.round(avgTime),
      };
    });
  }, [csMembers, tickets, selectedMember]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Snowflake className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do monitoramento de SLA
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="frosted-glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tempo Médio por Membro
              </CardTitle>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-[180px]">
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis unit="min" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="tempo"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="frosted-glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-sla-ok" />
                Últimos Atendimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recentResolved.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Ticket className="h-12 w-12 mb-2 opacity-50" />
                  <p>Nenhum atendimento resolvido</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentResolved.map((ticket) => (
                    <TicketHistoryCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
