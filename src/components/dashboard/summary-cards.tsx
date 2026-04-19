import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { FileText, DollarSign, CreditCard, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SummaryCardsProps {
  activeContractsCount: number;
  totalContractedValue: number;
  totalPaidInYear: number;
  totalPaidPreviousYear: number;
  fiscalYear: number;
}

function YoYBadge({
  current,
  previous,
  fiscalYear,
}: {
  current: number;
  previous: number;
  fiscalYear: number;
}) {
  if (previous === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        sem referência em {fiscalYear - 1}
      </span>
    );
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta * 10) / 10;
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const color = isFlat
    ? "text-muted-foreground"
    : isUp
      ? "text-green-600"
      : "text-red-600";
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="size-3" />
      {isUp ? "+" : ""}
      {rounded}% vs ano anterior
    </span>
  );
}

export function SummaryCards({
  activeContractsCount,
  totalContractedValue,
  totalPaidInYear,
  totalPaidPreviousYear,
  fiscalYear,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Contratos Ativos
          </CardTitle>
          <FileText className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <p className="text-3xl font-bold">{activeContractsCount}</p>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Contratado
          </CardTitle>
          <DollarSign className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <p className="text-3xl font-bold">
            {formatCurrency(totalContractedValue)}
          </p>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pago ({fiscalYear})
          </CardTitle>
          <CreditCard className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <p className="text-3xl font-bold">
            {formatCurrency(totalPaidInYear)}
          </p>
          <div className="pt-1">
            <YoYBadge
              current={totalPaidInYear}
              previous={totalPaidPreviousYear}
              fiscalYear={fiscalYear}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
