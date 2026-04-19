import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface AlertListGarantiasProps {
  guarantees: {
    id: string;
    contractId: string;
    contractNumber: string;
    tipo: string;
    valor: number;
    daysRemaining: number;
  }[];
}

function getDaysColor(days: number): string {
  if (days < 0) return "text-red-700";
  if (days < 30) return "text-red-600";
  if (days < 60) return "text-yellow-600";
  return "text-blue-600";
}

function formatRemaining(days: number): string {
  if (days < 0) return `Vencida há ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoje";
  return `${days} dias`;
}

export function AlertListGarantias({ guarantees }: AlertListGarantiasProps) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldAlert className="size-5 text-amber-600" />
          Garantias Vencendo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {guarantees.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Nenhuma garantia vencendo nos próximos 90 dias
          </div>
        ) : (
          <ul className="space-y-2">
            {guarantees.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/contratos/${g.contractId}`}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{g.contractNumber}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {g.tipo} · {formatCurrency(g.valor)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${getDaysColor(g.daysRemaining)}`}
                  >
                    {formatRemaining(g.daysRemaining)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
