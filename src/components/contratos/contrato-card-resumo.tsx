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
import { Calendar, Building2, DollarSign, TrendingDown } from "lucide-react";

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

  const isExpired = daysRemaining <= 0;
  const isNearExpiry = daysRemaining > 0 && daysRemaining <= 90;

  return (
    <Card className="overflow-hidden">
      {/* Header com status */}
      <div className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" />
            <span className="truncate text-sm">
              {contract.supplier} — {formatCnpj(contract.supplierCnpj)}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed">{contract.object}</p>
        </div>
        <Badge
          variant={contract.status === "ACTIVE" ? "default" : "destructive"}
          className="shrink-0 self-start"
        >
          {contract.status === "ACTIVE" ? "Ativo" : "Encerrado"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pt-2 text-xs text-muted-foreground">
        <span>
          {LEGAL_REGIME_LABELS[contract.legalRegime] ?? contract.legalRegime}
        </span>
        <span>•</span>
        <span>
          {BIDDING_MODALITY_LABELS[contract.biddingModality] ??
            contract.biddingModality}
        </span>
      </div>

      <div className="p-4">
        <Separator />
      </div>

      {/* Financeiro — 3 indicadores */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="size-3" />
            Valor Global
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatCurrency(globalNum)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="size-3" />
            Total Pago
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="size-3" />
            Saldo Restante
          </div>
          <p className={`mt-1 text-lg font-bold tabular-nums ${
            color === "red" ? "text-red-600" : color === "yellow" ? "text-yellow-600" : ""
          }`}>
            {formatCurrency(balanceNum)}
          </p>
          <p className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}% disponível
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground">
          <span>Consumido</span>
          <span className="font-medium tabular-nums">{consumed.toFixed(0)}%</span>
        </div>
        <ProgressPrimitive.Root value={consumed} data-slot="progress" className="flex flex-wrap gap-3 h-2.5">
          <ProgressTrack className="h-2.5 rounded-full">
            <ProgressIndicator className={`${progressColor[color]} rounded-full`} />
          </ProgressTrack>
        </ProgressPrimitive.Root>
      </div>

      <div className="p-4 pb-0">
        <Separator />
      </div>

      {/* Vigência */}
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Vigência:</span>
          <span className="font-medium">
            {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
          </span>
        </div>
        <div>
          {isExpired ? (
            <Badge variant="destructive">Expirado</Badge>
          ) : isNearExpiry ? (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
              {daysRemaining} dias restantes
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">
              {daysRemaining} dias restantes
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
