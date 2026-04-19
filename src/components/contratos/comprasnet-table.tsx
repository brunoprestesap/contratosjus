"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatCnpj } from "@/lib/format";
import { parseBrazilianNumber } from "@/lib/comprasnet-utils";
import { cn } from "@/lib/utils";
import { importarContratoComprasnet, importarMultiplosContratos } from "@/actions/comprasnet";
import type {
  ComprasnetContratoComStatus,
  ComprasnetSortDir,
  ComprasnetSortField,
} from "@/actions/comprasnet";

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  FileSearch,
  Loader2,
  PackageCheck,
} from "lucide-react";

interface ComprasnetTableProps {
  codigoUg: string;
  contratos: ComprasnetContratoComStatus[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  sortField: ComprasnetSortField | undefined;
  sortDir: ComprasnetSortDir | undefined;
}

function formatVigencia(inicio: string | null, fim: string | null): string {
  return `${inicio ? formatDate(inicio) : "—"} → ${fim ? formatDate(fim) : "—"}`;
}

function SortButton({
  field,
  label,
  sortField,
  sortDir,
  onToggle,
  disabled,
  align = "left",
}: {
  field: ComprasnetSortField;
  label: string;
  sortField: ComprasnetSortField | undefined;
  sortDir: ComprasnetSortDir | undefined;
  onToggle: (field: ComprasnetSortField) => void;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const active = sortField === field;
  const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      disabled={disabled}
      aria-label={`Ordenar por ${label}`}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "flex-row-reverse",
      )}
    >
      <span>{label}</span>
      <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} />
    </button>
  );
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-1.5 rounded-md border px-2.5 py-1.5",
        tone === "success" && "border-green-200 bg-green-50 text-green-800",
        tone === "muted" && "border-border/60 bg-muted/40 text-muted-foreground",
        tone === "default" && "border-border/60 bg-background",
      )}
    >
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function ComprasnetTable({
  codigoUg,
  contratos: initial,
  page,
  perPage,
  total,
  totalPages,
  sortField,
  sortDir,
}: ComprasnetTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contratos, setContratos] = useState(initial);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNavigation] = useTransition();

  // Sincroniza com nova página retornada pelo server (mesmo component instance durante transição).
  useEffect(() => {
    setContratos(initial);
  }, [initial]);

  // Reseta seleção quando a UG muda — ids de outra UG não fazem sentido.
  useEffect(() => {
    setSelecionados(new Set());
  }, [codigoUg]);

  const importaveis = useMemo(() => contratos.filter((c) => !c.jaImportado), [contratos]);
  const valoresFormatados = useMemo(
    () =>
      new Map(
        contratos.map((c) => [c.id, formatCurrency(parseBrazilianNumber(c.valor_global))] as const),
      ),
    [contratos],
  );
  const todosSelecionados =
    importaveis.length > 0 && importaveis.every((c) => selecionados.has(c.id));
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);

  function navigateWith(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    startNavigation(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function toggleSort(field: ComprasnetSortField) {
    // Ciclo: inativo → asc → desc → limpa (volta à ordem original)
    if (sortField !== field) {
      navigateWith({ sortField: field, sortDir: "asc", page: "1" });
    } else if (sortDir === "asc") {
      navigateWith({ sortField: field, sortDir: "desc", page: "1" });
    } else {
      navigateWith({ sortField: null, sortDir: null, page: "1" });
    }
  }

  function gotoPage(nextPage: number) {
    const clamped = Math.min(totalPages, Math.max(1, nextPage));
    navigateWith({ page: String(clamped) });
  }

  function changePerPage(value: string | null) {
    if (!value) return;
    navigateWith({ perPage: value, page: "1" });
  }

  function ariaSort(field: ComprasnetSortField): "ascending" | "descending" | "none" {
    if (sortField !== field) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function toggleSelecao(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleTodos() {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (todosSelecionados) {
        for (const c of importaveis) next.delete(c.id);
      } else {
        for (const c of importaveis) next.add(c.id);
      }
      return next;
    });
  }

  function handleImportarUm(contrato: ComprasnetContratoComStatus) {
    startTransition(async () => {
      const result = await importarContratoComprasnet(codigoUg, contrato.id);
      if (result.success) {
        toast.success(`Contrato ${contrato.numero} importado com sucesso`);
        setContratos((prev) =>
          prev.map((c) => (c.id === contrato.id ? { ...c, jaImportado: true } : c)),
        );
        setSelecionados((prev) => {
          const next = new Set(prev);
          next.delete(contrato.id);
          return next;
        });
      } else {
        toast.error(result.error ?? "Erro ao importar contrato");
      }
    });
  }

  function handleImportarSelecionados() {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;

    startTransition(async () => {
      const result = await importarMultiplosContratos(codigoUg, ids);
      if (result.success && result.data) {
        toast.success(
          `${result.data.importados} contrato(s) importado(s)${result.data.erros > 0 ? `, ${result.data.erros} erro(s)` : ""}`,
        );
        // Marca os contratos VISÍVEIS na página atual como importados (otimista).
        // Seleções de outras páginas já foram enviadas e serão refletidas ao re-navegar.
        setContratos((prev) =>
          prev.map((c) => (selecionados.has(c.id) ? { ...c, jaImportado: true } : c)),
        );
        setSelecionados(new Set());
      } else {
        toast.error(result.error ?? "Erro ao importar contratos");
      }
    });
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <FileSearch className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">Nenhum contrato encontrado</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          A consulta não retornou contratos para esta Unidade Gestora. Confira o código informado ou
          tente incluir contratos inativos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats + ações em lote */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatChip label="Encontrados" value={total} />
          {selecionados.size > 0 && (
            <StatChip label="Selecionados" value={selecionados.size} tone="default" />
          )}
        </div>

        {/* Botão em lote — some quando não há seleção */}
        <div
          className={cn(
            "transition-opacity",
            selecionados.size === 0 && "pointer-events-none opacity-0",
          )}
          aria-hidden={selecionados.size === 0}
        >
          <Button
            onClick={handleImportarSelecionados}
            disabled={isPending || isNavigating || selecionados.size === 0}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="mr-1.5 size-3.5" />
                Importar {selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cards — mobile only */}
      <div className="space-y-2 md:hidden">
        {importaveis.length > 0 && (
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <label className="flex items-center gap-2 text-xs font-medium">
              <Checkbox
                aria-label="Selecionar todos"
                checked={todosSelecionados}
                onCheckedChange={() => toggleTodos()}
              />
              Selecionar todos disponíveis
            </label>
            <span className="text-[11px] text-muted-foreground">{importaveis.length}</span>
          </div>
        )}
        {contratos.map((contrato) => (
          <Card key={contrato.id} size="sm" className={cn(contrato.jaImportado && "opacity-70")}>
            <CardContent className="flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Checkbox
                    aria-label={`Selecionar contrato ${contrato.numero}`}
                    checked={selecionados.has(contrato.id)}
                    onCheckedChange={() => toggleSelecao(contrato.id)}
                    disabled={contrato.jaImportado}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{contrato.numero}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {contrato.fornecedor?.nome ?? "Fornecedor não informado"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={contrato.situacao === "Ativo" ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {contrato.situacao}
                </Badge>
              </div>

              <p className="line-clamp-2 text-xs text-muted-foreground">{contrato.objeto}</p>

              <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs">
                <div className="text-muted-foreground">
                  {formatVigencia(contrato.vigencia_inicio, contrato.vigencia_fim)}
                </div>
                <div className="font-semibold tabular-nums">
                  {valoresFormatados.get(contrato.id)}
                </div>
              </div>

              <div className="flex justify-end">
                {contrato.jaImportado ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-green-200 bg-green-50 text-green-700"
                  >
                    <Check className="size-3" />
                    Importado
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleImportarUm(contrato)}
                    className="h-7 text-xs"
                  >
                    <Download className="mr-1 size-3" />
                    Importar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela — md+ */}
      <div className="hidden rounded-xl border md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Selecionar todos"
                  checked={todosSelecionados}
                  onCheckedChange={() => toggleTodos()}
                  disabled={importaveis.length === 0}
                />
              </TableHead>
              <TableHead className="w-28" aria-sort={ariaSort("numero")}>
                <SortButton
                  field="numero"
                  label="N° Contrato"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  disabled={isNavigating}
                />
              </TableHead>
              <TableHead aria-sort={ariaSort("fornecedor")}>
                <SortButton
                  field="fornecedor"
                  label="Fornecedor"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  disabled={isNavigating}
                />
              </TableHead>
              <TableHead className="hidden xl:table-cell" aria-sort={ariaSort("objeto")}>
                <SortButton
                  field="objeto"
                  label="Objeto"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  disabled={isNavigating}
                />
              </TableHead>
              <TableHead className="hidden w-44 lg:table-cell" aria-sort={ariaSort("vigencia")}>
                <SortButton
                  field="vigencia"
                  label="Vigência"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  disabled={isNavigating}
                />
              </TableHead>
              <TableHead className="w-32 text-right" aria-sort={ariaSort("valor")}>
                <SortButton
                  field="valor"
                  label="Valor Global"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  disabled={isNavigating}
                  align="right"
                />
              </TableHead>
              <TableHead className="hidden w-24 lg:table-cell" aria-sort={ariaSort("situacao")}>
                <SortButton
                  field="situacao"
                  label="Situação"
                  sortField={sortField}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  disabled={isNavigating}
                />
              </TableHead>
              <TableHead className="w-28 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.map((contrato) => {
              const isSelected = selecionados.has(contrato.id);
              return (
                <TableRow
                  key={contrato.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    "transition-colors",
                    contrato.jaImportado && "bg-muted/20 text-muted-foreground",
                  )}
                >
                  <TableCell>
                    <Checkbox
                      aria-label={`Selecionar contrato ${contrato.numero}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleSelecao(contrato.id)}
                      disabled={contrato.jaImportado}
                    />
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    <span className="block truncate">{contrato.numero}</span>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger render={<span className="block truncate cursor-help" />}>
                        {contrato.fornecedor?.nome ?? "N/I"}
                      </TooltipTrigger>
                      <TooltipContent>
                        CNPJ: {formatCnpj(contrato.fornecedor?.cnpj_cpf_idgener ?? "")}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="block truncate text-muted-foreground">{contrato.objeto}</span>
                  </TableCell>
                  <TableCell className="hidden whitespace-normal text-sm text-muted-foreground lg:table-cell">
                    {formatVigencia(contrato.vigencia_inicio, contrato.vigencia_fim)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <span className="block truncate">{valoresFormatados.get(contrato.id)}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge
                      variant={contrato.situacao === "Ativo" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {contrato.situacao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {contrato.jaImportado ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-200 bg-green-50 text-green-700"
                      >
                        <PackageCheck className="size-3" />
                        Importado
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleImportarUm(contrato)}
                        className="h-7 text-xs"
                      >
                        <Download className="mr-1 size-3" />
                        Importar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t pt-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground tabular-nums">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            de <span className="font-medium text-foreground tabular-nums">{total}</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <label htmlFor="per-page-select" className="whitespace-nowrap">
                Por página
              </label>
              <Select value={String(perPage)} onValueChange={changePerPage} disabled={isNavigating}>
                <SelectTrigger id="per-page-select" className="h-8 w-[72px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => gotoPage(page - 1)}
                disabled={page <= 1 || isNavigating}
                aria-label="Página anterior"
                className="size-8 p-0"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="min-w-[5rem] px-1 text-center text-xs text-muted-foreground tabular-nums">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => gotoPage(page + 1)}
                disabled={page >= totalPages || isNavigating}
                aria-label="Próxima página"
                className="size-8 p-0"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComprasnetTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="hidden rounded-xl border md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10" />
              <TableHead className="w-28">N° Contrato</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="hidden xl:table-cell">Objeto</TableHead>
              <TableHead className="hidden w-44 lg:table-cell">Vigência</TableHead>
              <TableHead className="w-32 text-right">Valor Global</TableHead>
              <TableHead className="hidden w-24 lg:table-cell">Situação</TableHead>
              <TableHead className="w-28 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-24" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
