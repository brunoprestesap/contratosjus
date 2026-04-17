import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ContratoLoading() {
  return (
    <>
      <Header title="Contrato" />
      <div className="mx-auto w-full max-w-5xl p-4 space-y-6 sm:p-6">
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Card Resumo Skeleton */}
        <Card className="overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>

          <div className="p-4">
            <Separator />
          </div>

          <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>

          <div className="px-4 pt-3 pb-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </Card>

        {/* Sections Skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </>
  );
}
