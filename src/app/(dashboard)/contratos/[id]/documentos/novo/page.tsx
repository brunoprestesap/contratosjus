import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContract } from "@/actions/contratos";
import { listTemplates } from "@/lib/documents/templates/registry";
import { ArrowLeft, ArrowRight, FileText, Scale } from "lucide-react";

const TEMPLATES_WITH_WIZARD = new Set([
  "fiscalizacao.ateste-nf",
  "fiscalizacao.notificacao",
  "fiscalizacao.relatorio-fiscal",
  "fiscalizacao.registro-ocorrencia",
  "prorrogacao.termo-aditivo",
  "prorrogacao.solicitacao-parecer",
  "prorrogacao.pesquisa-precos",
  "prorrogacao.justificativa-economicidade",
]);

/** Templates que têm seu próprio fluxo fora de /documentos/novo/<slug>/ */
const TEMPLATES_CUSTOM_HREF: Record<string, (contractId: string) => string> = {
  "prorrogacao.pesquisa-precos": (id) => `/contratos/${id}/pesquisas`,
};

function templateSlug(templateId: string): string {
  const parts = templateId.split(".");
  return parts[parts.length - 1];
}

function templateHref(contractId: string, templateId: string): string {
  const custom = TEMPLATES_CUSTOM_HREF[templateId];
  if (custom) return custom(contractId);
  return `/contratos/${contractId}/documentos/novo/${templateSlug(templateId)}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  PROROGACAO: "Prorrogação",
  FISCALIZACAO: "Fiscalização",
  CONTRATACAO: "Contratação",
  ENCERRAMENTO: "Encerramento",
};

const REGIME_LABEL: Record<string, string> = {
  LEI_14133_2021: "Lei 14.133/2021",
  LEI_8666_1993: "Lei 8.666/1993",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  return {
    title: contract
      ? `Novo documento — ${contract.contractNumber} | ContratosJUS`
      : "Novo documento | ContratosJUS",
  };
}

export default async function NovoDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  const templates = listTemplates();
  const legalRegime = contract.legalRegime;
  const applicable = templates.filter((t) => t.regimes.includes(legalRegime));

  const porCategoria = applicable.reduce<Record<string, typeof applicable>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <>
      <Header title="Catálogo de Documentos" />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/contratos/${id}/documentos`}
            className={
              "inline-flex items-center " + buttonVariants({ variant: "outline", size: "sm" })
            }
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar
          </Link>
          <div className="sm:ml-auto text-xs text-muted-foreground">
            <Scale className="mr-1 inline size-3.5" />
            Regime do contrato: {REGIME_LABEL[legalRegime] ?? legalRegime}
          </div>
        </div>

        {Object.entries(porCategoria).map(([categoria, lista]) => (
          <section key={categoria} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {CATEGORY_LABEL[categoria] ?? categoria} · {lista.length}{" "}
              {lista.length === 1 ? "template" : "templates"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {lista.map((t) => {
                const ai = t.sections.filter((s) => s.kind === "AI").length;
                const manual = t.sections.filter((s) => s.kind === "MANUAL").length;
                return (
                  <Card key={t.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <FileText className="size-4" />
                          {t.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-1">
                          {ai > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {ai} IA
                            </Badge>
                          )}
                          {manual > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {manual} manual
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-xs leading-relaxed">
                        {t.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground">
                          {t.regimes.map((r) => REGIME_LABEL[r] ?? r).join(" · ")}
                        </div>
                        {TEMPLATES_WITH_WIZARD.has(t.id) ? (
                          <Link
                            href={templateHref(id, t.id)}
                            className={buttonVariants({ size: "sm" })}
                          >
                            Gerar
                            <ArrowRight className="ml-1.5 size-3.5" />
                          </Link>
                        ) : (
                          <span
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Em breve
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
