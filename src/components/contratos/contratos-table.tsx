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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate, getBalanceColor } from "@/lib/utils";

interface ContractRow {
  id: string;
  contractNumber: string;
  supplier: string;
  object: string;
  endDate: Date;
  globalValue: string;
  status: string;
  totalPaid: string;
}

interface ContratosTableProps {
  contracts: ContractRow[];
  total: number;
  totalPages: number;
  currentPage: number;
}

function BalanceBadge({
  globalValue,
  totalPaid,
}: {
  globalValue: string;
  totalPaid: string;
}) {
  const gv = parseFloat(globalValue);
  const tp = parseFloat(totalPaid);
  const percentage = gv > 0 ? ((gv - tp) / gv) * 100 : 0;
  const color = getBalanceColor(percentage);

  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    red: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClasses[color]}`}
    >
      {percentage.toFixed(0)}%
    </span>
  );
}

function VigenciaBadge({ endDate }: { endDate: Date }) {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <div className="space-y-1">
        <span className="text-sm">{formatDate(endDate)}</span>
        <Badge variant="destructive" className="text-xs ml-2">
          Expirado
        </Badge>
      </div>
    );
  }

  if (diffDays <= 90) {
    return (
      <div className="space-y-1">
        <span className="text-sm">{formatDate(endDate)}</span>
        <Badge variant="outline" className="text-xs ml-2 border-yellow-500 text-yellow-700">
          {diffDays}d
        </Badge>
      </div>
    );
  }

  return <span className="text-sm">{formatDate(endDate)}</span>;
}

export function ContratosTable({
  contracts,
  total,
  totalPages,
  currentPage,
}: ContratosTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Nenhum contrato cadastrado.
        </p>
        <Link href="/contratos/novo" className={buttonVariants()}>
          + Novo Contrato
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Contrato</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="hidden md:table-cell">Objeto</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow
                key={contract.id}
                className="cursor-pointer"
                onClick={() => router.push(`/contratos/${contract.id}`)}
              >
                <TableCell className="font-medium">
                  {contract.contractNumber}
                </TableCell>
                <TableCell>{contract.supplier}</TableCell>
                <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                  {contract.object}
                </TableCell>
                <TableCell>
                  <VigenciaBadge endDate={contract.endDate} />
                </TableCell>
                <TableCell className="text-right">
                  <BalanceBadge
                    globalValue={contract.globalValue}
                    totalPaid={contract.totalPaid}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} contrato(s) encontrado(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(currentPage - 1));
                router.push(`/contratos?${params.toString()}`);
              }}
            >
              Anterior
            </Button>
            <span className="flex items-center text-sm px-2">
              {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(currentPage + 1));
                router.push(`/contratos?${params.toString()}`);
              }}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContratosTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Contrato</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead className="hidden md:table-cell">Objeto</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
