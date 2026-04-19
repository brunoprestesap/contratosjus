import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { getAiUsageReport } from "@/actions/ia-usage";
import { Sparkles, Users, Cpu } from "lucide-react";
import {
  formatDateTime,
  formatMonthYearLong,
  formatMonthYearShort,
  formatNumber,
} from "@/lib/format";

export const metadata = { title: "Uso de IA | ContratosJUS" };

function monthBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function parsePeriod(m?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (!m) {
    const { start, end } = monthBounds(now);
    return { start, end, label: formatMonthYearLong(now) };
  }
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) {
    const { start, end } = monthBounds(now);
    return { start, end, label: formatMonthYearLong(now) };
  }
  const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 15);
  const { start, end } = monthBounds(d);
  return { start, end, label: formatMonthYearLong(d) };
}

const PURPOSE_LABEL: Record<string, string> = {
  SUGGEST_CATSER: "sugerir CATSER",
  SUGGEST_CATMAT: "sugerir CATMAT",
  RANK_CATALOGO_LEVEL: "ranking catálogo",
  FILTER_SAMPLES: "filtrar amostras",
  WRITE_JUSTIFICATIVA: "redigir justificativa",
  FILL_FREE_FIELD: "preencher campo",
  COHERENCE_CHECK: "checar coerência",
};

export default async function IaUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const period = parsePeriod(sp.m);
  const resp = await getAiUsageReport({
    start: period.start,
    end: period.end,
  });
  const report = resp.success ? resp.data : null;

  // Meses para navegação rápida (atual + 5 anteriores)
  const months: Array<{ value: string; label: string }> = [];
  const baseDate = new Date(period.start);
  for (let i = 0; i < 6; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ value, label: formatMonthYearShort(d) });
  }

  return (
    <>
      <Header title="Uso de IA" />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-muted-foreground">Período:</div>
          {months.map((m) => (
            <a
              key={m.value}
              href={`?m=${m.value}`}
              className={
                "rounded border px-2 py-1 text-xs " +
                (m.value ===
                `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, "0")}`
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted")
              }
            >
              {m.label}
            </a>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" />
                Chamadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(report?.totals.calls ?? 0)}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{period.label}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Tokens de entrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(report?.totals.inputTokens ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Tokens de saída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(report?.totals.outputTokens ?? 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Consumo por usuário
            </CardTitle>
            <CardDescription>
              Chamadas IA agregadas a partir dos logs de auditoria. Ordenado por total de tokens
              (input + output) decrescente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!report || report.byUser.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Nenhuma chamada de IA registrada no período.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="w-20 text-right">Chamadas</TableHead>
                    <TableHead className="w-28 text-right">Tokens in</TableHead>
                    <TableHead className="w-28 text-right">Tokens out</TableHead>
                    <TableHead>Propósitos</TableHead>
                    <TableHead className="w-36">Última chamada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byUser.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium">{u.userName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(u.calls)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(u.inputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(u.outputTokens)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(u.byPurpose)
                            .sort((a, b) => b[1] - a[1])
                            .map(([p, n]) => (
                              <Badge key={p} variant="outline" className="text-[10px]">
                                {PURPOSE_LABEL[p] ?? p}: {n}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(u.lastAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="size-4" />
              Consumo por modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!report || report.byModel.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="w-24 text-right">Chamadas</TableHead>
                    <TableHead className="w-32 text-right">Tokens (in+out)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byModel.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell className="font-mono text-xs">{m.model}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(m.calls)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(m.tokens)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
