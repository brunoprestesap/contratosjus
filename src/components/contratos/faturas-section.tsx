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

interface FaturasSectionProps {
  faturas: {
    id: string;
    numero: string;
    emissao: Date | null;
    vencimento: Date | null;
    valor: { toString(): string };
    juros: { toString(): string };
    multa: { toString(): string };
    glosa: { toString(): string };
    valorLiquido: { toString(): string };
    processo: string | null;
    ateste: string | null;
    situacao: string;
    mesRef: number;
    anoRef: number;
  }[];
}

const MESES = [
  "",
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function getSituacaoBadgeVariant(situacao: string) {
  const lower = situacao.toLowerCase();
  if (lower.includes("pag")) return "default" as const;
  if (lower.includes("liquid")) return "secondary" as const;
  if (lower.includes("atest")) return "outline" as const;
  return "secondary" as const;
}

export function FaturasSection({ faturas }: FaturasSectionProps) {
  if (faturas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma fatura registrada para este contrato.
      </p>
    );
  }

  const totalValor = faturas.reduce((sum, f) => sum + parseFloat(f.valor.toString()), 0);
  const totalLiquido = faturas.reduce((sum, f) => sum + parseFloat(f.valorLiquido.toString()), 0);

  return (
    <div className="pt-2 space-y-4 overflow-x-auto">
      <Table className="min-w-[750px]">
        <TableHeader>
          <TableRow>
            <TableHead>N&uacute;mero</TableHead>
            <TableHead>Refer&ecirc;ncia</TableHead>
            <TableHead>Emiss&atilde;o</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Glosa</TableHead>
            <TableHead className="text-right">Valor L&iacute;quido</TableHead>
            <TableHead>Situa&ccedil;&atilde;o</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faturas.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.numero}</TableCell>
              <TableCell>
                {MESES[f.mesRef] ?? f.mesRef}/{f.anoRef}
              </TableCell>
              <TableCell>{f.emissao ? formatDate(f.emissao) : "\u2014"}</TableCell>
              <TableCell>{f.vencimento ? formatDate(f.vencimento) : "\u2014"}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(parseFloat(f.valor.toString()))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(parseFloat(f.glosa.toString()))}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(parseFloat(f.valorLiquido.toString()))}
              </TableCell>
              <TableCell>
                <Badge variant={getSituacaoBadgeVariant(f.situacao)}>{f.situacao}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-6 border-t pt-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Total bruto: </span>
          <span className="font-semibold">{formatCurrency(totalValor)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Total l&iacute;quido: </span>
          <span className="font-semibold">{formatCurrency(totalLiquido)}</span>
        </div>
      </div>
    </div>
  );
}
