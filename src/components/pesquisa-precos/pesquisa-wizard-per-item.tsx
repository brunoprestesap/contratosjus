"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WireResearchDetail, WireResearchItem } from "@/lib/pesquisa-precos/mappers";
import { StepCodigoItem } from "@/components/pesquisa-precos/steps/step-codigo-item";
import { StepConsulta } from "@/components/pesquisa-precos/steps/step-consulta";
import { StepAmostrasItem } from "@/components/pesquisa-precos/steps/step-amostras-item";
import { StepJustificativaItem } from "@/components/pesquisa-precos/steps/step-justificativa-item";
import { StepFinalizar } from "@/components/pesquisa-precos/steps/step-finalizar";

interface Props {
  research: WireResearchDetail;
  canEdit: boolean;
}

type StepKey = "codigo" | "consulta" | "amostras" | "justificativa" | "finalizar";

function hasCode(item: WireResearchItem): boolean {
  return Boolean(item.itemType === "MATERIAL" ? item.catmatCode : item.catserCode);
}

function resolveInitialStep(research: WireResearchDetail): StepKey {
  if (research.status === "FINALIZED") return "finalizar";
  const items = research.researchItems;
  const allWithCode = items.length > 0 && items.every(hasCode);
  if (!allWithCode) return "codigo";
  const anySample = research.samples.length > 0;
  if (!anySample) return "consulta";
  const anyJust = items.some((i) => i.justificationText && i.justificationText.length > 0);
  if (!anyJust) return "justificativa";
  return "finalizar";
}

export function PesquisaWizardPerItem({ research, canEdit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isFinalized = research.status === "FINALIZED";

  const items = research.researchItems;
  const firstItem = items[0];
  const [activeItemId, setActiveItemId] = useState<string>(firstItem?.id ?? "");
  const activeItem = useMemo(
    () => items.find((i) => i.id === activeItemId) ?? firstItem,
    [items, activeItemId, firstItem],
  );

  const [tab, setTab] = useState<StepKey>(() => resolveInitialStep(research));

  function refresh() {
    startTransition(() => router.refresh());
  }

  // Auto-avança a tab apenas quando `tab` ainda for a de origem — evita
  // saltar múltiplas etapas caso o usuário já tenha navegado manualmente.
  function advanceFrom(from: StepKey, to: StepKey) {
    setTab((current) => (current === from ? to : current));
  }

  // Chamado por StepCodigoItem após confirmar o código de um item.
  // Avaliação otimista: se este item era o último pendente, avança.
  function handleCodeConfirmed(confirmedItemId: string) {
    const stillPending = items.filter((i) => i.id !== confirmedItemId && !hasCode(i));
    refresh();
    if (stillPending.length === 0) {
      advanceFrom("codigo", "consulta");
    }
  }

  // Chamado por StepConsulta após query bem-sucedida. Avança para "amostras"
  // somente se a consulta inseriu pelo menos uma amostra.
  function handleQueryCompleted(insertedCount: number) {
    refresh();
    if (insertedCount > 0) {
      advanceFrom("consulta", "amostras");
    }
  }

  // Chamado por StepJustificativaItem após salvar justificativa.
  // Avança para "finalizar" quando todos os itens têm justificativa preenchida.
  function handleJustificationSaved(savedItemId: string) {
    const othersWithText = items
      .filter((i) => i.id !== savedItemId)
      .every((i) => (i.justificationText?.trim().length ?? 0) >= 10);
    refresh();
    if (othersWithText) {
      advanceFrom("justificativa", "finalizar");
    }
  }

  const disabled = !canEdit || pending || isFinalized;
  const hasAllCodes = items.length > 0 && items.every(hasCode);
  const hasAnySample = research.samples.length > 0;
  const validCount = research.samples.filter((s) => !s.excluded).length;

  if (items.length === 0 || !activeItem) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Pesquisa sem itens vinculados.
      </div>
    );
  }

  const regimeLabel =
    research.legalRegimeSnapshot === "LEI_14133_2021"
      ? "Lei 14.133/2021"
      : research.legalRegimeSnapshot === "LEI_8666_1993"
        ? "Lei 8.666/1993"
        : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {research.contract.contractNumber} · Pesquisa por item ({items.length})
              </CardTitle>
              <CardDescription className="max-w-2xl">
                {regimeLabel ? (
                  <>
                    Regime: <span className="font-medium">{regimeLabel}</span> ·{" "}
                  </>
                ) : null}
                {research.contract.object}
              </CardDescription>
            </div>
            <Badge variant={isFinalized ? "default" : "secondary"}>{research.status}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Seletor de item ativo — relevante para steps por item (código, amostras, justificativa) */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Item ativo:</span>
        <Select value={activeItem.id} onValueChange={(v) => setActiveItemId(v ?? "")}>
          <SelectTrigger className="w-auto min-w-[300px]">
            {/* SelectValue com children explícito: sem isso, o trigger
                renderiza o `value` cru (cuid do item) em vez do label. */}
            <SelectValue>
              #{activeItem.contractItem.itemNumber} ·{" "}
              {activeItem.contractItem.description.slice(0, 80)}
              {hasCode(activeItem) ? " ✓" : ""}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                #{i.contractItem.itemNumber} · {i.contractItem.description.slice(0, 80)}
                {hasCode(i) ? " ✓" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StepKey)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="codigo">1. Código</TabsTrigger>
          <TabsTrigger value="consulta" disabled={!hasAllCodes}>
            2. Consulta
          </TabsTrigger>
          <TabsTrigger value="amostras" disabled={!hasAnySample}>
            3. Amostras
          </TabsTrigger>
          <TabsTrigger value="justificativa" disabled={!hasAnySample}>
            4. Justificativa
          </TabsTrigger>
          <TabsTrigger value="finalizar" disabled={!hasAnySample}>
            5. Finalizar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codigo">
          <StepCodigoItem
            item={activeItem}
            disabled={disabled}
            onChanged={refresh}
            onCodeConfirmed={handleCodeConfirmed}
          />
        </TabsContent>
        <TabsContent value="consulta">
          <StepConsulta
            research={research}
            disabled={disabled}
            onChanged={refresh}
            onQueryCompleted={handleQueryCompleted}
          />
        </TabsContent>
        <TabsContent value="amostras">
          <StepAmostrasItem
            researchId={research.id}
            item={activeItem}
            disabled={disabled}
            onChanged={refresh}
            refreshing={pending}
          />
        </TabsContent>
        <TabsContent value="justificativa">
          {/* key força reset do estado local quando:
              - item ativo muda (navegação)
              - IA atualiza o texto (justificationEditedAt)
              - valor/ajuste de referência muda via ação salvar método
              Sem isso, o form mostra values antigas quando RSC re-renderiza. */}
          <StepJustificativaItem
            key={[
              activeItem.id,
              activeItem.justificationEditedAt ?? "none",
              activeItem.referenceValue ?? "nv",
              activeItem.adjustmentPercent ?? "na",
              activeItem.exceptionJustification ?? "ne",
            ].join(":")}
            item={activeItem}
            disabled={disabled}
            onChanged={refresh}
            onSaved={() => handleJustificationSaved(activeItem.id)}
          />
        </TabsContent>
        <TabsContent value="finalizar">
          <StepFinalizar
            research={research}
            validCount={validCount}
            disabled={!canEdit || pending}
            onChanged={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
