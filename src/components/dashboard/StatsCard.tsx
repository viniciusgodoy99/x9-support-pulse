import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
}

export function StatsCard({ title, value, subtitle, icon: Icon, variant = "default" }: StatsCardProps) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      variant === "success" && "border-sla-ok/50",
      variant === "warning" && "border-sla-warning/50",
      variant === "danger" && "border-sla-critical/50"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-5 w-5",
          variant === "default" && "text-primary",
          variant === "success" && "text-sla-ok",
          variant === "warning" && "text-sla-warning",
          variant === "danger" && "text-sla-critical"
        )} />
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-3xl font-bold",
          variant === "default" && "text-foreground",
          variant === "success" && "text-sla-ok",
          variant === "warning" && "text-sla-warning",
          variant === "danger" && "text-sla-critical"
        )}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
