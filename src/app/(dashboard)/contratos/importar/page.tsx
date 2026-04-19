import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Cloud, ListChecks, Search, Download } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComprasnetSearchForm } from "@/components/contratos/comprasnet-search-form";
import { ComprasnetTable, ComprasnetTableSkeleton } from "@/components/contratos/comprasnet-table";
import {
  consultarContratosComprasnet,
  type ComprasnetSortDir,
  type ComprasnetSortField,
} from "@/actions/comprasnet";

interface ImportarPageProps {
  searchParams: Promise<{
    ug?: string;
    inativos?: string;
    page?: string;
    perPage?: string;
    sortField?: string;
    sortDir?: string;
  }>;
}

const VALID_SORT_FIELDS: ReadonlySet<ComprasnetSortField> = new Set([
  "numero",
  "fornecedor",
  "objeto",
  "vigencia",
  "valor",
  "situacao",
]);

function parseSortField(raw?: string): ComprasnetSortField | undefined {
  return VALID_SORT_FIELDS.has(raw as ComprasnetSortField)
    ? (raw as ComprasnetSortField)
    : undefined;
}

function parseSortDir(raw?: string): ComprasnetSortDir | undefined {
  return raw === "asc" || raw === "desc" ? raw : undefined;
}

function parsePositiveInt(raw?: string): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

async function ResultadoConsulta({
  codigoUg,
  incluirInativos,
  page,
  perPage,
  sortField,
  sortDir,
}: {
  codigoUg: string;
  incluirInativos: boolean;
  page: number | undefined;
  perPage: number | undefined;
  sortField: ComprasnetSortField | undefined;
  sortDir: ComprasnetSortDir | undefined;
}) {
  const result = await consultarContratosComprasnet(codigoUg, incluirInativos, {
    page,
    perPage,
    sortField,
    sortDir,
  });

  if (!result.success) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const paginado = result.data;
  if (!paginado) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Resposta inesperada do serviço de consulta.</AlertDescription>
      </Alert>
    );
  }

  return (
    <ComprasnetTable
      codigoUg={codigoUg}
      contratos={paginado.data}
      page={paginado.page}
      perPage={paginado.perPage}
      total={paginado.total}
      totalPages={paginado.totalPages}
      sortField={sortField}
      sortDir={sortDir}
    />
  );
}

const STEPS = [
  {
    icon: Search,
    title: "1. Consultar",
    desc: "Informe o código da Unidade Gestora (UASG).",
  },
  {
    icon: ListChecks,
    title: "2. Selecionar",
    desc: "Escolha um ou vários contratos da lista.",
  },
  {
    icon: Download,
    title: "3. Importar",
    desc: "Traga os dados para dentro do sistema.",
  },
];

export default async function ImportarContratosPage({ searchParams }: ImportarPageProps) {
  const params = await searchParams;
  const codigoUg = params.ug?.trim() || null;
  const incluirInativos = params.inativos === "true";
  const page = parsePositiveInt(params.page);
  const perPage = parsePositiveInt(params.perPage);
  const sortField = parseSortField(params.sortField);
  const sortDir = parseSortDir(params.sortDir);

  return (
    <>
      <Header
        title="Importar do Comprasnet"
        subtitle="Fonte: API pública contratos.gov.br"
        breadcrumbs={[{ label: "Contratos", href: "/contratos" }, { label: "Importar" }]}
        actions={
          <Link href="/contratos" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-6xl p-4 space-y-6 sm:p-6">
        <Card size="sm">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Cloud className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>Importação a partir do Comprasnet</CardTitle>
              <CardDescription>
                Consulte contratos já cadastrados na Administração Pública e traga-os com um clique
                para esta base.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5"
                >
                  <step.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{step.title}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Consulta</CardTitle>
            <CardDescription>
              Informe o código da UG (UASG) — 6 dígitos. Padrão da JFAP já preenchido.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ComprasnetSearchForm />
          </CardContent>
        </Card>

        {codigoUg && (
          <Suspense fallback={<ComprasnetTableSkeleton />}>
            <ResultadoConsulta
              codigoUg={codigoUg}
              incluirInativos={incluirInativos}
              page={page}
              perPage={perPage}
              sortField={sortField}
              sortDir={sortDir}
            />
          </Suspense>
        )}
      </div>
    </>
  );
}
