import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, isOverBudget, type ContractFinancialTotals } from "@/lib/utils";
import { formatCurrency, formatDate, formatCnpj } from "@/lib/format";
import { LEGAL_REGIME_LABELS, BIDDING_MODALITY_LABELS } from "@/lib/constants";
import {
  Calendar,
  Building2,
  Banknote,
  Receipt,
  FileCheck,
  CreditCard,
  Wallet,
  CircleAlert,
} from "lucide-react";

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
    startDate: Date;
    endDate: Date;
  };
  financials: ContractFinancialTotals;
}

interface MetricTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  emphasis?: "default" | "primary" | "warning" | "danger";
  className?: string;
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  emphasis = "default",
  className,
}: MetricTileProps) {
  const valueColor = {
    default: "text-foreground",
    primary: "text-foreground",
    warning: "text-yellow-600 dark:text-yellow-500",
    danger: "text-red-600 dark:text-red-500",
  }[emphasis];

  const ring =
    emphasis === "primary"
      ? "ring-1 ring-inset ring-primary/20 bg-primary/5"
      : "ring-1 ring-inset ring-foreground/5 bg-muted/30";

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-1.5 rounded-lg p-3 transition-colors",
        ring,
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "text-base font-semibold tabular-nums leading-tight sm:text-lg",
          valueColor,
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-muted-foreground tabular-nums">{hint}</p>
      )}
    </div>
  );
}

export function ContratoCardResumo({
  contract,
  financials,
}: ContratoCardResumoProps) {
  const {
    totalPaid,
    totalSettled,
    totalCommitted,
    globalValue,
    balance,
    balancePercentage,
    balanceColor: color,
  } = financials;

  const consumed = 100 - balancePercentage;

  const now = new Date();
  const endDate = new Date(contract.endDate);
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;
  const isNearExpiry = daysRemaining > 0 && daysRemaining <= 90;

  const isActive = contract.status === "ACTIVE";

  const paidPct = globalValue > 0 ? (totalPaid / globalValue) * 100 : 0;
  const committedNotPaid = Math.max(totalCommitted - totalPaid, 0);
  const committedPct =
    globalValue > 0 ? (committedNotPaid / globalValue) * 100 : 0;

  const paidBarPct = Math.min(paidPct, 100);
  const committedBarPct = Math.max(
    0,
    Math.min(paidPct + committedPct, 100) - paidBarPct,
  );

  const overcommitted = isOverBudget(totalPaid, totalCommitted, globalValue);

  const solidBar = {
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
  }[color];
  const softBar = {
    red: "bg-red-500/40",
    yellow: "bg-yellow-500/40",
    green: "bg-green-500/40",
  }[color];

  return (
    <Card className="overflow-hidden">
      {/* Cabeçalho: fornecedor + status */}
      <div className="flex flex-col gap-3 px-4 pt-1 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate text-sm font-medium">
                {contract.supplier}
              </span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCnpj(contract.supplierCnpj)}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {contract.object}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:flex-col sm:items-end">
          <Badge
            variant={isActive ? "default" : "destructive"}
            className="shrink-0"
          >
            {isActive ? "Ativo" : "Encerrado"}
          </Badge>
        </div>
      </div>

      {/* Metadados: regime + modalidade */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 text-[11px] text-muted-foreground sm:px-5">
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5">
          {LEGAL_REGIME_LABELS[contract.legalRegime] ?? contract.legalRegime}
        </span>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5">
          {BIDDING_MODALITY_LABELS[contract.biddingModality] ??
            contract.biddingModality}
        </span>
      </div>

      <Separator />

      {/* Métricas financeiras: 2 cols (mobile) → 3 cols (sm) → 5 cols (lg) */}
      <div className="grid grid-cols-2 gap-2.5 px-4 sm:grid-cols-3 sm:gap-3 sm:px-5 lg:grid-cols-5">
        <MetricTile
          icon={Banknote}
          label="Valor Global"
          value={formatCurrency(globalValue)}
          emphasis="primary"
        />
        <MetricTile
          icon={Receipt}
          label="Empenhado"
          value={formatCurrency(totalCommitted)}
        />
        <MetricTile
          icon={FileCheck}
          label="Liquidado"
          value={formatCurrency(totalSettled)}
        />
        <MetricTile
          icon={CreditCard}
          label="Pago"
          value={formatCurrency(totalPaid)}
        />
        <MetricTile
          icon={Wallet}
          label="Saldo Restante"
          value={formatCurrency(balance)}
          hint={`${balancePercentage.toFixed(0)}% disponível`}
          emphasis={
            color === "red"
              ? "danger"
              : color === "yellow"
                ? "warning"
                : "default"
          }
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Barra de progresso segmentada: pago + empenhado não-pago */}
      <div className="space-y-2 px-4 sm:px-5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">
            Utilização do contrato
          </span>
          <span className="tabular-nums">{consumed.toFixed(0)}% consumido</span>
        </div>

        <div
          className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(consumed)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Consumido ${consumed.toFixed(0)}% do valor global`}
        >
          <div
            className={cn("absolute inset-y-0 left-0 transition-all", solidBar)}
            style={{ width: `${paidBarPct}%` }}
          />
          <div
            className={cn("absolute inset-y-0 transition-all", softBar)}
            style={{
              left: `${paidBarPct}%`,
              width: `${committedBarPct}%`,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", solidBar)} />
            Pago
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", softBar)} />
            Empenhado (não pago)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted ring-1 ring-inset ring-border" />
            Saldo disponível
          </span>
          {overcommitted && (
            <span className="ml-auto inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
              <CircleAlert className="size-3" />
              Pago + empenhado excede valor global
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Vigência */}
      <div className="flex flex-col gap-2 px-4 pb-1 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Vigência:</span>
          <span className="font-medium tabular-nums">
            {formatDate(contract.startDate)} a {formatDate(contract.endDate)}
          </span>
        </div>
        <div>
          {isExpired ? (
            <Badge variant="destructive">
              Expirado há {Math.abs(daysRemaining)}d
            </Badge>
          ) : isNearExpiry ? (
            <Badge
              variant="outline"
              className="border-yellow-500/60 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            >
              {daysRemaining} dias restantes
            </Badge>
          ) : (
            <Badge variant="secondary" className="tabular-nums">
              {daysRemaining} dias restantes
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
