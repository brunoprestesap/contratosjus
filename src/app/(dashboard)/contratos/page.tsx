import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import { ContratosTable, ContratosTableSkeleton } from "@/components/contratos/contratos-table";
import { ContratosFilters } from "@/components/contratos/contratos-filters";
import { listContracts } from "@/actions/contratos";

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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Suspense fallback={null}>
            <ContratosFilters />
          </Suspense>
          <div className="flex gap-2">
            <Link
              href="/contratos/importar"
              className={buttonVariants({ variant: "outline" })}
            >
              Importar do Comprasnet
            </Link>
            <Link href="/contratos/novo" className={buttonVariants()}>
              + Novo Contrato
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
