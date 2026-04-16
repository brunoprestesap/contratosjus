import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TerceirizadosSectionProps {
  terceirizados: {
    id: string;
    usuario: string;
    funcao: string | null;
    jornada: number | null;
    unidade: string | null;
    salario: { toString(): string } | null;
    custo: { toString(): string } | null;
    dataInicio: Date | null;
    dataFim: Date | null;
    situacao: string;
  }[];
}

function decimalToNumber(val: { toString(): string } | null): number | null {
  if (val == null) return null;
  const n = parseFloat(val.toString());
  return isNaN(n) ? null : n;
}

export function TerceirizadosSection({
  terceirizados,
}: TerceirizadosSectionProps) {
  if (terceirizados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum terceirizado registrado para este contrato.
      </p>
    );
  }

  const totalCusto = terceirizados.reduce((sum, t) => {
    const c = decimalToNumber(t.custo);
    return sum + (c ?? 0);
  }, 0);

  return (
    <div className="pt-2 space-y-4 overflow-x-auto">
      <Table className="min-w-[750px]">
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Fun&ccedil;&atilde;o</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead className="text-right">Sal&aacute;rio</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead>Per&iacute;odo</TableHead>
            <TableHead>Situa&ccedil;&atilde;o</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {terceirizados.map((t) => {
            const salario = decimalToNumber(t.salario);
            const custo = decimalToNumber(t.custo);

            return (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.usuario}</TableCell>
                <TableCell className="text-sm">{t.funcao ?? "—"}</TableCell>
                <TableCell className="text-sm">{t.unidade ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {salario != null ? formatCurrency(salario) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {custo != null ? formatCurrency(custo) : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {t.dataInicio
                    ? `${formatDate(t.dataInicio)}${t.dataFim ? ` a ${formatDate(t.dataFim)}` : " — atual"}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={t.situacao === "Ativo" ? "default" : "secondary"}
                  >
                    {t.situacao}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">
            {terceirizados.length} terceirizado{terceirizados.length > 1 ? "s" : ""} &middot; Custo total:{" "}
          </span>
          <span className="font-semibold">{formatCurrency(totalCusto)}</span>
        </div>
      </div>
    </div>
  );
}
