import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { RelatoriosClient } from "./relatorios-client";

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const contracts = await prisma.contract.findMany({
    select: {
      id: true,
      contractNumber: true,
      supplier: true,
    },
    orderBy: { contractNumber: "asc" },
    take: 500,
  });

  return (
    <>
      <Header title="Relatórios" />
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Gere relatórios em PDF para consulta e impressão.
          </p>
        </div>

        <RelatoriosClient contracts={contracts} />
      </div>
    </>
  );
}
