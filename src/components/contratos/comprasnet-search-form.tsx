"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const JFAP_UG_CODE = process.env.NEXT_PUBLIC_JFAP_UG_CODE ?? "090037";

export function ComprasnetSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [codigoUg, setCodigoUg] = useState(searchParams.get("ug") ?? JFAP_UG_CODE);
  const [incluirInativos, setIncluirInativos] = useState(searchParams.get("inativos") === "true");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("ug", codigoUg);
    if (incluirInativos) params.set("inativos", "true");
    startTransition(() => {
      router.push(`/contratos/importar?${params.toString()}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
    >
      <div className="flex-1 space-y-1.5 md:max-w-xs">
        <Label htmlFor="codigo-ug" className="text-xs font-medium text-foreground">
          Código da UG (UASG)
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="codigo-ug"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ex: 090037"
            value={codigoUg}
            onChange={(e) => setCodigoUg(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="pl-8 tabular-nums tracking-wide"
            autoComplete="off"
          />
        </div>
      </div>

      <label
        htmlFor="incluir-inativos"
        className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60 md:h-9 md:py-0"
      >
        <Checkbox
          id="incluir-inativos"
          checked={incluirInativos}
          onCheckedChange={(v) => setIncluirInativos(v === true)}
        />
        <span className="font-normal select-none">Incluir contratos inativos</span>
      </label>

      <Button type="submit" disabled={!codigoUg.trim() || isPending} className="w-full md:w-auto">
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            Consultando...
          </>
        ) : (
          <>
            <Search className="mr-1.5 size-3.5" />
            Consultar
          </>
        )}
      </Button>
    </form>
  );
}
