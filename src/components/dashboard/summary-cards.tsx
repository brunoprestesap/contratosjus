import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { FileText, DollarSign, CreditCard } from "lucide-react";

interface SummaryCardsProps {
  activeContractsCount: number;
  totalContractedValue: number;
  totalPaidInYear: number;
  fiscalYear: number;
}

export function SummaryCards({
  activeContractsCount,
  totalContractedValue,
  totalPaidInYear,
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
        </CardContent>
      </Card>
    </div>
  );
}
