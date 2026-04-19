import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/format";

interface HistoricoSectionProps {
  historicos: {
    id: string;
    numero: string;
    tipo: string;
    categoria: string | null;
    observacao: string | null;
    fornecedorNome: string | null;
    fornecedorCnpj: string | null;
    dataAssinatura: Date | null;
    vigenciaInicio: Date | null;
    vigenciaFim: Date | null;
    valorGlobal: { toString(): string } | null;
    novoValorGlobal: { toString(): string } | null;
    situacaoContrato: string | null;
  }[];
}

function decimalToNumber(val: { toString(): string } | null): number | null {
  if (val == null) return null;
  const n = parseFloat(val.toString());
  return isNaN(n) ? null : n;
}

export function HistoricoSection({ historicos }: HistoricoSectionProps) {
  if (historicos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum registro de hist&oacute;rico para este contrato.
      </p>
    );
  }

  return (
    <div className="pt-2 overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow>
            <TableHead>N&uacute;mero</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Assinatura</TableHead>
            <TableHead>Vig&ecirc;ncia</TableHead>
            <TableHead className="text-right">Valor Global</TableHead>
            <TableHead className="text-right">Novo Valor</TableHead>
            <TableHead>Situa&ccedil;&atilde;o</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historicos.map((h) => {
            const valor = decimalToNumber(h.valorGlobal);
            const novoValor = decimalToNumber(h.novoValorGlobal);

            return (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.numero}</TableCell>
                <TableCell>
                  <Badge variant="outline">{h.tipo}</Badge>
                </TableCell>
                <TableCell>{h.dataAssinatura ? formatDate(h.dataAssinatura) : "—"}</TableCell>
                <TableCell className="text-xs">
                  {h.vigenciaInicio && h.vigenciaFim
                    ? `${formatDate(h.vigenciaInicio)} a ${formatDate(h.vigenciaFim)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {valor != null ? formatCurrency(valor) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {novoValor != null ? formatCurrency(novoValor) : "—"}
                </TableCell>
                <TableCell>
                  {h.situacaoContrato ? (
                    <Badge variant={h.situacaoContrato === "Ativo" ? "default" : "secondary"}>
                      {h.situacaoContrato}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
