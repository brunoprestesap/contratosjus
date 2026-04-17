import { Suspense } from "react";
import { listAuditLogs, listAuditUsers } from "@/actions/auditoria";
import { AuditTable, AuditTableSkeleton } from "@/components/auditoria/audit-table";
import { AuditFilters } from "@/components/auditoria/audit-filters";
import { AuditStats } from "@/components/auditoria/audit-stats";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rawPage = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const userId = typeof params.userId === "string" && params.userId !== "ALL" ? params.userId : undefined;
  const entity = typeof params.entity === "string" && params.entity !== "ALL" ? params.entity : undefined;
  const action = typeof params.action === "string" && params.action !== "ALL" ? params.action : undefined;
  const entityId = typeof params.entityId === "string" ? params.entityId : undefined;
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : undefined;
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : undefined;

  const [result, users] = await Promise.all([
    listAuditLogs({ page, userId, entity, action, entityId, dateFrom, dateTo }),
    listAuditUsers(),
  ]);

  return (
    <>
      <Header title="Auditoria" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <AuditStats total={result.total} logs={result.logs} />

        {/* Filters */}
        <Card>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-20 w-full" />}>
              <AuditFilters users={users} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Table */}
        <Suspense fallback={<AuditTableSkeleton />}>
          <AuditTable
            logs={result.logs}
            total={result.total}
            totalPages={result.totalPages}
            currentPage={page}
          />
        </Suspense>
      </div>
    </>
  );
}
