import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { ComprasnetSearchForm } from "@/components/contratos/comprasnet-search-form";
import { ComprasnetTable, ComprasnetTableSkeleton } from "@/components/contratos/comprasnet-table";
import { consultarContratosComprasnet } from "@/actions/comprasnet";

interface ImportarPageProps {
  searchParams: Promise<{
    ug?: string;
    inativos?: string;
  }>;
}

async function ResultadoConsulta({
  codigoUg,
  incluirInativos,
}: {
  codigoUg: string;
  incluirInativos: boolean;
}) {
  const result = await consultarContratosComprasnet(codigoUg, incluirInativos);

  if (!result.success) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  return <ComprasnetTable contratos={result.data ?? []} />;
}

export default async function ImportarContratosPage({ searchParams }: ImportarPageProps) {
  const params = await searchParams;
  const codigoUg = params.ug?.trim() || null;
  const incluirInativos = params.inativos === "true";

  return (
    <>
      <Header title="Importar do Comprasnet" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Consulte contratos da API pública do Comprasnet (contratos.gov.br) e importe para o
            sistema.
          </p>
          <Link
            href="/contratos"
            className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
          >
            Voltar para Contratos
          </Link>
        </div>

        <Suspense fallback={null}>
          <ComprasnetSearchForm />
        </Suspense>

        {codigoUg && (
          <Suspense fallback={<ComprasnetTableSkeleton />}>
            <ResultadoConsulta codigoUg={codigoUg} incluirInativos={incluirInativos} />
          </Suspense>
        )}
      </div>
    </>
  );
}
