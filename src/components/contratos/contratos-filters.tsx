"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEGAL_REGIME_LABELS, CONTRACT_STATUS_LABELS } from "@/lib/constants";

export function ContratosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/contratos?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        placeholder="Buscar por número, fornecedor ou objeto..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          const value = e.target.value;
          debounceRef.current = setTimeout(() => {
            updateParam("search", value);
          }, 400);
        }}
        className="max-w-sm"
      />

      <Select
        value={searchParams.get("status") ?? "ALL"}
        onValueChange={(val) => updateParam("status", val ?? "ALL")}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          {Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("legalRegime") ?? "ALL"}
        onValueChange={(val) => updateParam("legalRegime", val ?? "ALL")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Regime Legal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os regimes</SelectItem>
          {Object.entries(LEGAL_REGIME_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
