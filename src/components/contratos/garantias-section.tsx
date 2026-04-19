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

interface GarantiasSectionProps {
  garantias: {
    id: string;
    tipo: string;
    valor: { toString(): string };
    vencimento: Date | null;
  }[];
}

export function GarantiasSection({ garantias }: GarantiasSectionProps) {
  if (garantias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma garantia registrada para este contrato.
      </p>
    );
  }

  const total = garantias.reduce((sum, g) => sum + parseFloat(g.valor.toString()), 0);

  return (
    <div className="pt-2 space-y-4 overflow-x-auto">
      <Table className="min-w-[400px]">
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {garantias.map((g) => (
            <TableRow key={g.id}>
              <TableCell>
                <Badge variant="outline">{g.tipo}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(parseFloat(g.valor.toString()))}
              </TableCell>
              <TableCell>{g.vencimento ? formatDate(g.vencimento) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Total em garantias: </span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
