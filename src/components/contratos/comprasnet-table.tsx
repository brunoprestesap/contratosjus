"use client";

import { useState, useTransition } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatCnpj } from "@/lib/utils";
import {
  importarContratoComprasnet,
  importarMultiplosContratos,
} from "@/actions/comprasnet";
import type { ComprasnetContratoComStatus } from "@/actions/comprasnet";
import type { ComprasnetContrato } from "@/types/comprasnet";

interface ComprasnetTableProps {
  contratos: ComprasnetContratoComStatus[];
}

function parseValue(value: number | string): number {
  if (typeof value === "string") {
    return parseFloat(String(value).replace(/\./g, "").replace(",", ".")) || 0;
  }
  return value;
}

export function ComprasnetTable({ contratos: initial }: ComprasnetTableProps) {
  const [contratos, setContratos] = useState(initial);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  const importaveis = contratos.filter((c) => !c.jaImportado);
  const todosSelecionados =
    importaveis.length > 0 && selecionados.size === importaveis.length;

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
    if (todosSelecionados) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(importaveis.map((c) => c.id)));
    }
  }

  function handleImportarUm(contrato: ComprasnetContrato) {
    startTransition(async () => {
      const result = await importarContratoComprasnet(contrato);
      if (result.success) {
        toast.success(`Contrato ${contrato.numero} importado com sucesso`);
        setContratos((prev) =>
          prev.map((c) => (c.id === contrato.id ? { ...c, jaImportado: true } : c))
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
    const paraImportar = contratos.filter(
      (c) => selecionados.has(c.id) && !c.jaImportado
    );
    if (paraImportar.length === 0) return;

    startTransition(async () => {
      const result = await importarMultiplosContratos(paraImportar);
      if (result.success && result.data) {
        toast.success(
          `${result.data.importados} contrato(s) importado(s)${result.data.erros > 0 ? `, ${result.data.erros} erro(s)` : ""}`
        );
        const importadosIds = new Set(paraImportar.map((c) => c.id));
        setContratos((prev) =>
          prev.map((c) =>
            importadosIds.has(c.id) ? { ...c, jaImportado: true } : c
          )
        );
        setSelecionados(new Set());
      } else {
        toast.error(result.error ?? "Erro ao importar contratos");
      }
    });
  }

  if (contratos.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Nenhum contrato encontrado para esta Unidade Gestora.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {contratos.length} contrato(s) encontrado(s) &mdash;{" "}
          {contratos.filter((c) => c.jaImportado).length} já importado(s)
        </p>
        {selecionados.size > 0 && (
          <Button
            onClick={handleImportarSelecionados}
            disabled={isPending}
            size="sm"
            className="w-full sm:w-auto"
          >
            {isPending
              ? "Importando..."
              : `Importar ${selecionados.size} selecionado(s)`}
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Selecionar todos"
                  checked={todosSelecionados}
                  onCheckedChange={() => toggleTodos()}
                  disabled={importaveis.length === 0}
                />
              </TableHead>
              <TableHead>N° Contrato</TableHead>
              <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
              <TableHead className="hidden xl:table-cell">Objeto</TableHead>
              <TableHead className="hidden md:table-cell">Vigência</TableHead>
              <TableHead className="text-right">Valor Global</TableHead>
              <TableHead className="hidden sm:table-cell">Situação</TableHead>
              <TableHead className="w-24">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.map((contrato) => (
              <TableRow key={contrato.id}>
                <TableCell>
                  <Checkbox
                    aria-label={`Selecionar contrato ${contrato.numero}`}
                    checked={selecionados.has(contrato.id)}
                    onCheckedChange={() => toggleSelecao(contrato.id)}
                    disabled={contrato.jaImportado}
                  />
                </TableCell>
                <TableCell className="font-medium">{contrato.numero}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Tooltip>
                    <TooltipTrigger
                      render={<span className="cursor-help" />}
                    >
                      {contrato.fornecedor?.nome ?? "N/I"}
                    </TooltipTrigger>
                    <TooltipContent>
                      CNPJ: {formatCnpj(contrato.fornecedor?.cnpj_cpf_idgener ?? "")}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden xl:table-cell max-w-[250px] truncate">
                  {contrato.objeto}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm whitespace-nowrap">
                  {contrato.vigencia_inicio ? formatDate(contrato.vigencia_inicio) : "N/I"}{" "}
                  a {contrato.vigencia_fim ? formatDate(contrato.vigencia_fim) : "N/I"}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatCurrency(parseValue(contrato.valor_global))}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant={
                      contrato.situacao === "Ativo" ? "default" : "secondary"
                    }
                  >
                    {contrato.situacao}
                  </Badge>
                </TableCell>
                <TableCell>
                  {contrato.jaImportado ? (
                    <Badge variant="outline" className="text-xs">
                      Importado
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleImportarUm(contrato)}
                    >
                      Importar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ComprasnetTableSkeleton() {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>N° Contrato</TableHead>
            <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
            <TableHead className="hidden xl:table-cell">Objeto</TableHead>
            <TableHead className="hidden md:table-cell">Vigência</TableHead>
            <TableHead className="text-right">Valor Global</TableHead>
            <TableHead className="hidden sm:table-cell">Situação</TableHead>
            <TableHead className="w-24">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
              <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
