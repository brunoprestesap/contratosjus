import { Card, CardContent } from "@/components/ui/card";
import { Activity, Plus, Pencil, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { AuditLogItem } from "@/actions/auditoria";

interface AuditStatsProps {
  total: number;
  logs: AuditLogItem[];
}

export function AuditStats({ total, logs }: AuditStatsProps) {
  const creates = logs.filter((l) => l.action === "CREATE").length;
  const updates = logs.filter((l) => l.action === "UPDATE").length;
  const deletes = logs.filter((l) => l.action === "DELETE").length;

  const stats = [
    {
      label: "Total de Registros",
      value: total,
      icon: Activity,
      color: "text-foreground",
      bg: "bg-muted",
    },
    {
      label: "Criações",
      value: creates,
      icon: Plus,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Edições",
      value: updates,
      icon: Pencil,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Exclusões",
      value: deletes,
      icon: Trash2,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardContent className="flex items-center gap-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon className={`size-4 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${stat.color}`}>
                {formatNumber(stat.value)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
