"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WireResearchDetail } from "@/lib/pesquisa-precos/mappers";
import { StepCodigo } from "@/components/pesquisa-precos/steps/step-codigo";
import { StepConsulta } from "@/components/pesquisa-precos/steps/step-consulta";
import { StepAmostras } from "@/components/pesquisa-precos/steps/step-amostras";
import { StepJustificativa } from "@/components/pesquisa-precos/steps/step-justificativa";
import { StepFinalizar } from "@/components/pesquisa-precos/steps/step-finalizar";
import { resolveInitialStep } from "@/components/pesquisa-precos/steps/resolve-initial-step";

interface PesquisaWizardProps {
  research: WireResearchDetail;
  canEdit: boolean;
}

export function PesquisaWizard({ research, canEdit }: PesquisaWizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const codigo = research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode;
  const hasCodigo = !!codigo;
  const hasSamples = research.samples.length > 0;
  const validCount = research.samples.filter((s) => !s.excluded).length;
  const isFinalized = research.status === "FINALIZED";

  const [tab, setTab] = useState(() => resolveInitialStep(research));

  function refresh() {
    startTransition(() => router.refresh());
  }

  const disabled = !canEdit || pending || isFinalized;
  const stepProps = { research, disabled, onChanged: refresh };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {research.contract.contractNumber} ·{" "}
                {research.itemType === "MATERIAL" ? "Material (CATMAT)" : "Serviço (CATSER)"}
              </CardTitle>
              <CardDescription className="max-w-2xl">{research.contract.object}</CardDescription>
            </div>
            <Badge variant={isFinalized ? "default" : "secondary"}>{research.status}</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="codigo">1. Código</TabsTrigger>
          <TabsTrigger value="consulta" disabled={!hasCodigo}>
            2. Consulta
          </TabsTrigger>
          <TabsTrigger value="amostras" disabled={!hasSamples}>
            3. Amostras
          </TabsTrigger>
          <TabsTrigger value="justificativa" disabled={!hasSamples}>
            4. Justificativa
          </TabsTrigger>
          <TabsTrigger value="finalizar" disabled={!hasSamples}>
            5. Finalizar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codigo">
          <StepCodigo {...stepProps} />
        </TabsContent>
        <TabsContent value="consulta">
          <StepConsulta {...stepProps} />
        </TabsContent>
        <TabsContent value="amostras">
          <StepAmostras {...stepProps} />
        </TabsContent>
        <TabsContent value="justificativa">
          <StepJustificativa {...stepProps} validCount={validCount} />
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
