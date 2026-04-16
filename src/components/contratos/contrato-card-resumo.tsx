import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { Separator } from "@/components/ui/separator";
import {
  formatCurrency,
  formatDate,
  formatCnpj,
  getBalancePercentage,
  getBalanceColor,
} from "@/lib/utils";
import { LEGAL_REGIME_LABELS, BIDDING_MODALITY_LABELS } from "@/lib/constants";

interface ContratoCardResumoProps {
  contract: {
    id: string;
    contractNumber: string;
    supplier: string;
    supplierCnpj: string;
    object: string;
    status: string;
    legalRegime: string;
    biddingModality: string;
    globalValue: { toString(): string };
    startDate: Date;
    endDate: Date;
    payments: { paidValue: { toString(): string } | null }[];
  };
}

export function ContratoCardResumo({ contract }: ContratoCardResumoProps) {
  const totalPaid = contract.payments.reduce(
    (sum, p) => sum + (p.paidValue ? parseFloat(p.paidValue.toString()) : 0),
    0
  );
  const globalNum = parseFloat(contract.globalValue.toString());
  const balanceNum = globalNum - totalPaid;
  const percentage = getBalancePercentage(globalNum, totalPaid);
  const color = getBalanceColor(percentage);
  const consumed = 100 - percentage;

  const now = new Date();
  const endDate = new Date(contract.endDate);
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const progressColor = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {contract.supplier} — {formatCnpj(contract.supplierCnpj)}
            </p>
            <p className="text-sm mt-1">{contract.object}</p>
          </div>
          <Badge
            variant={contract.status === "ACTIVE" ? "default" : "destructive"}
          >
            {contract.status === "ACTIVE" ? "Ativo" : "Encerrado"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            {LEGAL_REGIME_LABELS[contract.legalRegime] ?? contract.legalRegime}
          </span>
          <span>•</span>
          <span>
            {BIDDING_MODALITY_LABELS[contract.biddingModality] ??
              contract.biddingModality}
          </span>
        </div>

        <Separator />

        {/* Financeiro */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor Global</p>
            <p className="text-sm font-semibold">
              {formatCurrency(globalNum)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pago</p>
            <p className="text-sm font-semibold">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo Restante</p>
            <p className="text-sm font-semibold">
              {formatCurrency(balanceNum)} ({percentage.toFixed(0)}%)
            </p>
          </div>
        </div>

        <ProgressPrimitive.Root value={consumed} data-slot="progress" className="flex flex-wrap gap-3 h-2">
          <ProgressTrack className="h-2">
            <ProgressIndicator className={progressColor[color]} />
          </ProgressTrack>
        </ProgressPrimitive.Root>

        <Separator />

        {/* Vigência */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Vigência: </span>
            {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
          </div>
          <div>
            {daysRemaining > 0 ? (
              <span
                className={
                  daysRemaining <= 90
                    ? "text-yellow-600 font-medium"
                    : "text-muted-foreground"
                }
              >
                {daysRemaining} dias restantes
              </span>
            ) : (
              <span className="text-red-600 font-medium">Expirado</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
