import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import { ContratosTable, ContratosTableSkeleton } from "@/components/contratos/contratos-table";
import { ContratosFilters } from "@/components/contratos/contratos-filters";
import { listContracts } from "@/actions/contratos";
import { Plus, Download } from "lucide-react";

interface ContratosPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    legalRegime?: string;
  }>;
}

export default async function ContratosPage({ searchParams }: ContratosPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { contracts, total, totalPages } = await listContracts({
    page,
    perPage: 10,
    search: params.search,
    status: params.status,
    legalRegime: params.legalRegime,
  });

  return (
    <>
      <Header title="Contratos" />
      <div className="mx-auto w-full max-w-6xl p-4 space-y-6 sm:p-6">
        {/* Toolbar: filtros + ações */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Suspense fallback={null}>
            <ContratosFilters />
          </Suspense>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/contratos/importar"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="mr-1.5 size-3.5" />
              Importar
            </Link>
            <Link
              href="/contratos/novo"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="mr-1.5 size-3.5" />
              Novo Contrato
            </Link>
          </div>
        </div>

        <Suspense fallback={<ContratosTableSkeleton />}>
          <ContratosTable
            contracts={contracts}
            total={total}
            totalPages={totalPages}
            currentPage={page}
          />
        </Suspense>
      </div>
    </>
  );
}
