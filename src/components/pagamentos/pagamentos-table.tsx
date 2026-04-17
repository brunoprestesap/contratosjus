"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CreditCard, Check, Clock } from "lucide-react";
import { PAYMENT_STATUS_VARIANTS } from "@/lib/constants";
import {
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  getPaymentStatus,
} from "@/lib/utils";
import type { TransversalPaymentItem } from "@/actions/pagamentos-transversal";

interface PagamentosTableProps {
  payments: TransversalPaymentItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

function DateCell({ date }: { date: string | null }) {
  if (!date) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3" />
        ---
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-green-600">
      <Check className="size-3" />
      {formatShortDate(date)}
    </span>
  );
}

function getStatus(payment: TransversalPaymentItem) {
  return getPaymentStatus({
    attestDate: payment.attestDate ? new Date(payment.attestDate) : null,
    settlementDate: payment.settlementDate ? new Date(payment.settlementDate) : null,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={PAYMENT_STATUS_VARIANTS[status] ?? "secondary"}
      className={
        status === "Atestado"
          ? "border-yellow-500 text-yellow-600"
          : status === "Pago"
            ? "bg-green-600"
            : status === "Liquidado"
              ? "bg-blue-600 text-white"
              : ""
      }
    >
      {status}
    </Badge>
  );
}

export function PagamentosTable({
  payments,
  total,
  totalPages,
  currentPage,
}: PagamentosTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/pagamentos?${params.toString()}`);
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <CreditCard className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">Nenhum pagamento encontrado</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Nenhum pagamento encontrado para os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead className="hidden lg:table-cell">Fornecedor</TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead className="text-right">Valor NF</TableHead>
              <TableHead>Ateste</TableHead>
              <TableHead>Liquidação</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const status = getStatus(p);
              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/contratos/${p.contractId}`)}
                >
                  <TableCell className="py-2">
                    <Link
                      href={`/contratos/${p.contractId}`}
                      className="font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.contractNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden py-2 lg:table-cell">
                    <span className="max-w-[200px] truncate block text-sm text-muted-foreground">
                      {p.supplier}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 capitalize">
                    {formatMonthYear(p.referenceMonth)}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">
                    {p.invoiceValue !== null
                      ? formatCurrency(p.invoiceValue)
                      : "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <DateCell date={p.attestDate} />
                  </TableCell>
                  <TableCell className="py-2">
                    <DateCell date={p.settlementDate} />
                  </TableCell>
                  <TableCell className="py-2">
                    <DateCell date={p.paidAt} />
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusBadge status={status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString("pt-BR")} pagamento{total !== 1 ? "s" : ""}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="flex items-center px-3 text-sm tabular-nums">
              {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PagamentosTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Contrato</TableHead>
            <TableHead className="hidden lg:table-cell">Fornecedor</TableHead>
            <TableHead>Mês Ref.</TableHead>
            <TableHead className="text-right">Valor NF</TableHead>
            <TableHead>Ateste</TableHead>
            <TableHead>Liquidação</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="hidden py-2.5 lg:table-cell">
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="ml-auto h-4 w-20" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
