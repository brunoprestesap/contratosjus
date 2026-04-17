import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle } from "lucide-react";

interface AlertListPendentesProps {
  payments: {
    id: string;
    contractNumber: string;
    missingMonth: string;
  }[];
}

export function AlertListPendentes({ payments }: AlertListPendentesProps) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="size-5 text-orange-500" />
          Pagamentos Pendentes de Registro
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {payments.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Todos os pagamentos estão em dia
          </div>
        ) : (
          <ul className="space-y-2">
            {payments.map((p, i) => (
              <li key={`${p.id}-${i}`}>
                <Link
                  href={`/contratos/${p.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{p.contractNumber}</span>
                  <span className="text-muted-foreground">
                    {p.missingMonth}
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
