import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle } from "lucide-react";

interface AlertListVigenciaProps {
  contracts: {
    id: string;
    contractNumber: string;
    daysRemaining: number;
  }[];
}

function getDaysColor(days: number): string {
  if (days < 30) return "text-red-600";
  if (days < 60) return "text-yellow-600";
  return "text-blue-600";
}

export function AlertListVigencia({ contracts }: AlertListVigenciaProps) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="size-5 text-blue-500" />
          Vigências Próximas do Vencimento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {contracts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Nenhum contrato vencendo nos próximos 90 dias
          </div>
        ) : (
          <ul className="space-y-2">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contratos/${c.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{c.contractNumber}</span>
                  <span className={`font-semibold ${getDaysColor(c.daysRemaining)}`}>
                    {c.daysRemaining === 0 ? "Vence hoje" : `${c.daysRemaining} dias`}
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
