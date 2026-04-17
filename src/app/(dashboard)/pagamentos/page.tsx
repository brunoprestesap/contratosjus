import { Suspense } from "react";
import { listAllPayments, listContractsForFilter } from "@/actions/pagamentos-transversal";
import { PagamentosTable, PagamentosTableSkeleton } from "@/components/pagamentos/pagamentos-table";
import { PagamentosFilters } from "@/components/pagamentos/pagamentos-filters";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PagamentosPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rawPage = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const contractId = typeof params.contractId === "string" ? params.contractId : undefined;
  const startDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate = typeof params.endDate === "string" ? params.endDate : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;

  const [result, contracts] = await Promise.all([
    listAllPayments({ page, contractId, startDate, endDate, status }),
    listContractsForFilter(),
  ]);

  return (
    <>
      <Header title="Pagamentos" />
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent>
            <PagamentosFilters contracts={contracts} />
          </CardContent>
        </Card>

        {/* Table */}
        <Suspense fallback={<PagamentosTableSkeleton />}>
          <PagamentosTable
            payments={result.payments}
            total={result.total}
            totalPages={result.totalPages}
            currentPage={page}
          />
        </Suspense>
      </div>
    </>
  );
}
