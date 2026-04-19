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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FileText, CreditCard, Landmark, FilePlus2, Users, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { formatAuditDescription } from "@/lib/audit-formatter";
import type { AuditLogItem } from "@/actions/auditoria";

interface AuditTableProps {
  logs: AuditLogItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

const ACTION_STYLES: Record<string, { label: string; className: string }> = {
  CREATE: {
    label: "Criação",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  UPDATE: {
    label: "Edição",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  },
  DELETE: {
    label: "Exclusão",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
  },
};

const ENTITY_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  Contract: { label: "Contrato", icon: FileText, color: "text-blue-600" },
  Payment: { label: "Pagamento", icon: CreditCard, color: "text-emerald-600" },
  Commitment: { label: "Empenho", icon: Landmark, color: "text-violet-600" },
  Additive: { label: "Aditivo", icon: FilePlus2, color: "text-amber-600" },
  User: { label: "Usuário", icon: Users, color: "text-slate-600" },
};

function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const full = formatDateTime(d);
  const [date, time] = full.split(", ");
  return { date: date ?? formatDate(d), time: time ?? "" };
}

function EntityCell({ entity }: { entity: string }) {
  const config = ENTITY_CONFIG[entity];
  if (!config) return <span className="text-sm">{entity}</span>;

  const Icon = config.icon;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded ${config.color} bg-current/10`}
      >
        <Icon className={`size-3.5 ${config.color}`} />
      </div>
      <span className="text-sm">{config.label}</span>
    </div>
  );
}

export function AuditTable({ logs, total, totalPages, currentPage }: AuditTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/auditoria?${params.toString()}`);
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">Nenhum registro encontrado</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Ajuste os filtros ou aguarde novas operações serem registradas no sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">Data/Hora</TableHead>
              <TableHead className="w-[130px]">Usuário</TableHead>
              <TableHead className="w-[130px]">Entidade</TableHead>
              <TableHead className="w-[90px]">Ação</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const { date, time } = splitDateTime(log.createdAt);
              const actionStyle = ACTION_STYLES[log.action];

              return (
                <TableRow key={log.id}>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm tabular-nums">{date}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-sm font-medium">{log.userName}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <EntityCell entity={log.entity} />
                  </TableCell>
                  <TableCell className="py-2.5">
                    {actionStyle ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${actionStyle.className}`}
                      >
                        {actionStyle.label}
                      </span>
                    ) : (
                      <Badge variant="secondary">{log.action}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <p className="text-sm text-muted-foreground leading-snug">
                      {formatAuditDescription(log)}
                    </p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {formatNumber(total)} registro{total !== 1 ? "s" : ""}
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
                    if (currentPage > 1) goToPage(currentPage - 1);
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
                    if (currentPage < totalPages) goToPage(currentPage + 1);
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

export function AuditTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px]">Data/Hora</TableHead>
            <TableHead className="w-[130px]">Usuário</TableHead>
            <TableHead className="w-[130px]">Entidade</TableHead>
            <TableHead className="w-[90px]">Ação</TableHead>
            <TableHead>Descrição</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="py-2.5">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-6 rounded" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="py-2.5">
                <Skeleton className="h-4 w-48" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
