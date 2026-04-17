"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const JFAP_UG_CODE = process.env.NEXT_PUBLIC_JFAP_UG_CODE ?? "090037";

export function ComprasnetSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [codigoUg, setCodigoUg] = useState(
    searchParams.get("ug") ?? JFAP_UG_CODE
  );
  const [incluirInativos, setIncluirInativos] = useState(
    searchParams.get("inativos") === "true"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("ug", codigoUg);
    if (incluirInativos) params.set("inativos", "true");
    router.push(`/contratos/importar?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="codigo-ug">Código da UG (UASG)</Label>
        <Input
          id="codigo-ug"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ex: 90023"
          value={codigoUg}
          onChange={(e) => setCodigoUg(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      <div className="flex items-center gap-2 sm:pb-2.5">
        <Checkbox
          id="incluir-inativos"
          checked={incluirInativos}
          onCheckedChange={(v) => setIncluirInativos(v === true)}
        />
        <Label htmlFor="incluir-inativos" className="text-sm font-normal">
          Incluir inativos
        </Label>
      </div>

      <Button type="submit" disabled={!codigoUg.trim()} className="w-full sm:w-auto">
        Consultar
      </Button>
    </form>
  );
}
