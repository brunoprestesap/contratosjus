import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/format";

interface CronogramaSectionProps {
  cronogramas: {
    id: string;
    tipo: string;
    numero: string;
    mesRef: number;
    anoRef: number;
    vencimento: Date | null;
    retroativo: string | null;
    valor: { toString(): string };
    observacao: string | null;
  }[];
}

const MESES = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function CronogramaSection({ cronogramas }: CronogramaSectionProps) {
  if (cronogramas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum cronograma registrado para este contrato.
      </p>
    );
  }

  const total = cronogramas.reduce(
    (sum, c) => sum + parseFloat(c.valor.toString()),
    0
  );

  return (
    <div className="pt-2 space-y-4 overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>N&uacute;mero</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Refer&ecirc;ncia</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Observa&ccedil;&atilde;o</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cronogramas.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.numero}</TableCell>
              <TableCell>
                <Badge variant="outline">{c.tipo}</Badge>
              </TableCell>
              <TableCell>
                {MESES[c.mesRef] ?? c.mesRef}/{c.anoRef}
              </TableCell>
              <TableCell>
                {c.vencimento ? formatDate(c.vencimento) : "—"}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(parseFloat(c.valor.toString()))}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs max-w-[250px] truncate">
                {c.observacao ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
