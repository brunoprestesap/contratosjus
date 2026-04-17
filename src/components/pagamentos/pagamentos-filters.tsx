"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Filter, X } from "lucide-react";

interface PagamentosFiltersProps {
  contracts: { id: string; contractNumber: string; supplier: string }[];
}

export function PagamentosFilters({ contracts }: PagamentosFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentContractId = searchParams.get("contractId") ?? "";
  const currentStartDate = searchParams.get("startDate") ?? "";
  const currentEndDate = searchParams.get("endDate") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  const activeFilterCount = [
    currentContractId,
    currentStartDate,
    currentEndDate,
    currentStatus,
  ].filter((v) => v && v !== "ALL").length;

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    const contractId = formData.get("contractId") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const status = formData.get("status") as string;

    if (contractId && contractId !== "ALL") params.set("contractId", contractId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status && status !== "ALL") params.set("status", status);
    params.set("page", "1");

    router.push(`/pagamentos?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/pagamentos");
  }

  return (
    <form action={applyFilters}>
      <div className="flex items-center gap-2 mb-4">
        <Filter className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-contract" className="text-xs text-muted-foreground">
            Contrato
          </Label>
          <Select
            name="contractId"
            defaultValue={currentContractId || "ALL"}
            items={[
              { value: "ALL", label: "Todos os contratos" },
              ...contracts.map((c) => ({
                value: c.id,
                label: `${c.contractNumber} — ${c.supplier}`,
              })),
            ]}
          >
            <SelectTrigger id="filter-contract" className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os contratos</SelectItem>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.contractNumber} — {c.supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-start" className="text-xs text-muted-foreground">
            Mês início
          </Label>
          <Input
            id="filter-start"
            type="month"
            name="startDate"
            defaultValue={currentStartDate || undefined}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-end" className="text-xs text-muted-foreground">
            Mês fim
          </Label>
          <Input
            id="filter-end"
            type="month"
            name="endDate"
            defaultValue={currentEndDate || undefined}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <Select
            name="status"
            defaultValue={currentStatus || "ALL"}
            items={{ ALL: "Todos os status", ...PAYMENT_STATUS_LABELS }}
          >
            <SelectTrigger id="filter-status" className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm" className="h-8">
          Aplicar filtros
        </Button>
        {activeFilterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="mr-1 size-3.5" />
            Limpar
          </Button>
        )}
      </div>
    </form>
  );
}
