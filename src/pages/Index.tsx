import { useEffect, useState } from "react";
import { Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Snowflake } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTickets } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

  // Mock data for chart (would be calculated from real data)
  const chartData = [
    { name: "João", tempo: 12 },
    { name: "Maria", tempo: 18 },
    { name: "Carlos", tempo: 8 },
    { name: "Ana", tempo: 15 },
    { name: "Pedro", tempo: 22 },
  ];

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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tempo Médio por Membro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
                  {recentResolved.map((ticket) => {
                    const created = new Date(ticket.created_at);
                    const resolved = ticket.resolved_at
                      ? new Date(ticket.resolved_at)
                      : new Date();
                    const duration = Math.round(
                      (resolved.getTime() - created.getTime()) / (1000 * 60)
                    );

                    return (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {ticket.monitored_groups?.name || "Grupo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {created.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono",
                            duration <= 15 && "border-sla-ok text-sla-ok",
                            duration > 15 && duration <= 30 && "border-sla-warning text-sla-warning",
                            duration > 30 && "border-sla-critical text-sla-critical"
                          )}
                        >
                          {duration}min
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
