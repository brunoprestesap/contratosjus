import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";

interface ItensSectionProps {
  itens: {
    id: string;
    descricao: string | null;
    descricaoComplementar: string | null;
    quantidade: { toString(): string } | null;
    valorUnitario: { toString(): string } | null;
    valorTotal: { toString(): string } | null;
    numeroItemCompra: string | null;
  }[];
}

function decimalToNumber(val: { toString(): string } | null): number | null {
  if (val == null) return null;
  const n = parseFloat(val.toString());
  return isNaN(n) ? null : n;
}

export function ItensSection({ itens }: ItensSectionProps) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum item registrado para este contrato.
      </p>
    );
  }

  const total = itens.reduce((sum, i) => {
    const v = decimalToNumber(i.valorTotal);
    return sum + (v ?? 0);
  }, 0);

  return (
    <div className="pt-2 space-y-4 overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Descri&ccedil;&atilde;o</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Valor Unit.</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((i) => {
            const qtd = decimalToNumber(i.quantidade);
            const unitario = decimalToNumber(i.valorUnitario);
            const totalItem = decimalToNumber(i.valorTotal);

            return (
              <TableRow key={i.id}>
                <TableCell className="font-medium">
                  {i.numeroItemCompra ?? "—"}
                </TableCell>
                <TableCell className="max-w-[350px]">
                  <p className="text-sm truncate">
                    {i.descricao ?? "—"}
                  </p>
                  {i.descricaoComplementar && (
                    <p className="text-xs text-muted-foreground truncate">
                      {i.descricaoComplementar}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {qtd != null ? formatNumber(qtd) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {unitario != null ? formatCurrency(unitario) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {totalItem != null ? formatCurrency(totalItem) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Total dos itens: </span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
