import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface RankingContratosProps {
  contracts: {
    id: string;
    contractNumber: string;
    supplier: string;
    globalValue: number;
  }[];
}

export function RankingContratos({ contracts }: RankingContratosProps) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Trophy className="size-5 text-amber-500" />
          Ranking por Volume Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum contrato ativo
          </p>
        ) : (
          <ol className="space-y-2">
            {contracts.map((c, index) => (
              <li key={c.id}>
                <Link
                  href={`/contratos/${c.id}`}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{c.contractNumber}</span>
                    <span className="ml-2 text-muted-foreground">
                      {c.supplier.length > 25
                        ? c.supplier.slice(0, 25) + "..."
                        : c.supplier}
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold">
                    {formatCurrency(c.globalValue)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
