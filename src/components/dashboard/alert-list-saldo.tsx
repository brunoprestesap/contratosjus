import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface AlertListSaldoProps {
  contracts: {
    id: string;
    contractNumber: string;
    supplier: string;
    balancePercentage: number;
  }[];
}

export function AlertListSaldo({ contracts }: AlertListSaldoProps) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-5 text-yellow-500" />
          Contratos com Saldo Baixo (&lt; 20%)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {contracts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Nenhum contrato com saldo baixo
          </div>
        ) : (
          <ul className="space-y-2">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contratos/${c.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <div>
                    <span className="font-medium">{c.contractNumber}</span>
                    <span className="ml-2 text-muted-foreground">
                      {c.supplier.length > 30
                        ? c.supplier.slice(0, 30) + "..."
                        : c.supplier}
                    </span>
                  </div>
                  <span
                    className={`font-semibold ${
                      c.balancePercentage < 10
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {c.balancePercentage.toFixed(1)}%
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
