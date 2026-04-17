import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Wallet, HandCoins } from "lucide-react";

interface FinancialSummaryCardsProps {
  totalBalanceRemaining: number;
  settledNotPaid: number;
}

export function FinancialSummaryCards({
  totalBalanceRemaining,
  settledNotPaid,
}: FinancialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo a Executar
          </CardTitle>
          <Wallet className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <p className="text-3xl font-bold">
            {formatCurrency(totalBalanceRemaining)}
          </p>
          <p className="pt-1 text-xs text-muted-foreground">
            Soma dos saldos contratuais dos contratos ativos
          </p>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Liquidado Não Pago
          </CardTitle>
          <HandCoins
            className={
              settledNotPaid > 0
                ? "size-5 text-amber-600"
                : "size-5 text-muted-foreground"
            }
          />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <p className="text-3xl font-bold">{formatCurrency(settledNotPaid)}</p>
          <p className="pt-1 text-xs text-muted-foreground">
            Valor reconhecido e ainda não pago (fluxo de caixa pendente)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
