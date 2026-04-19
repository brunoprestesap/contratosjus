"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn, getBalanceColor } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { FileText, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ContractRow {
  id: string;
  contractNumber: string;
  supplier: string;
  object: string;
  endDate: Date;
  globalValue: string;
  status: string;
  totalPaid: string;
  missingPaymentCount: number;
}

interface ContratosTableProps {
  contracts: ContractRow[];
  total: number;
  totalPages: number;
  currentPage: number;
}

function BalanceBadge({ globalValue, totalPaid }: { globalValue: string; totalPaid: string }) {
  const gv = parseFloat(globalValue) || 0;
  const tp = parseFloat(totalPaid) || 0;
  const balance = gv - tp;
  const percentage = gv > 0 ? ((gv - tp) / gv) * 100 : 0;
  const color = getBalanceColor(percentage);

  const colorClasses = {
    green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50",
    red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-sm font-medium tabular-nums">{formatCurrency(balance)}</span>
      <Badge variant="outline" className={cn("tabular-nums font-semibold", colorClasses[color])}>
        {percentage.toFixed(0)}%
      </Badge>
    </div>
  );
}

function VigenciaBadge({ endDate }: { endDate: Date }) {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
        <span className="text-sm">{formatDate(endDate)}</span>
        <Badge variant="destructive" className="text-xs">
          Expirado
        </Badge>
      </div>
    );
  }

  if (diffDays <= 90) {
    return (
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
        <span className="text-sm">{formatDate(endDate)}</span>
        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
          {diffDays}d
        </Badge>
      </div>
    );
  }

  return <span className="text-sm">{formatDate(endDate)}</span>;
}

export function ContratosTable({ contracts, total, totalPages, currentPage }: ContratosTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <FileText className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">Nenhum contrato encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre o primeiro contrato para começar.
        </p>
        <Link href="/contratos/novo" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
          + Novo Contrato
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>N° Contrato</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="hidden lg:table-cell">Objeto</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Valor Global</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow
                key={contract.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/contratos/${contract.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={contract.status === "ACTIVE" ? "default" : "destructive"}
                      className="size-2 rounded-full p-0"
                    />
                    {contract.contractNumber}
                    {contract.missingPaymentCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge
                              variant="outline"
                              className="gap-0.5 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-50"
                            />
                          }
                        >
                          <AlertTriangle className="size-3" />
                          {contract.missingPaymentCount}
                        </TooltipTrigger>
                        <TooltipContent>
                          {contract.missingPaymentCount}{" "}
                          {contract.missingPaymentCount === 1 ? "m\u00eas" : "meses"} sem pagamento
                          registrado
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="line-clamp-1">{contract.supplier}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[250px]">
                  <span className="line-clamp-1 text-muted-foreground">{contract.object}</span>
                </TableCell>
                <TableCell>
                  <VigenciaBadge endDate={contract.endDate} />
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right tabular-nums">
                  {formatCurrency(parseFloat(contract.globalValue) || 0)}
                </TableCell>
                <TableCell className="text-right">
                  <BalanceBadge globalValue={contract.globalValue} totalPaid={contract.totalPaid} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total} contrato{total !== 1 ? "s" : ""} encontrado
          {total !== 1 ? "s" : ""}
        </p>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="Anterior"
                  aria-disabled={currentPage <= 1}
                  className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage <= 1) return;
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", String(currentPage - 1));
                    router.push(`/contratos?${params.toString()}`);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>
                  {currentPage}
                  <span className="sr-only"> de {totalPages}</span>
                  <span className="ml-1 text-muted-foreground">/{totalPages}</span>
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="Próxima"
                  aria-disabled={currentPage >= totalPages}
                  className={cn(currentPage >= totalPages && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage >= totalPages) return;
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", String(currentPage + 1));
                    router.push(`/contratos?${params.toString()}`);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

export function ContratosTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>N° Contrato</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead className="hidden lg:table-cell">Objeto</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Valor Global</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-24 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
