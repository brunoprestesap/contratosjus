import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

interface OcorrenciasSectionProps {
  ocorrencias: {
    id: string;
    tipo: string | null;
    descricao: string | null;
    data: Date | null;
    situacao: string | null;
  }[];
}

export function OcorrenciasSection({ ocorrencias }: OcorrenciasSectionProps) {
  if (ocorrencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma ocorr&ecirc;ncia registrada para este contrato.
      </p>
    );
  }

  return (
    <div className="pt-2 overflow-x-auto">
      <Table className="min-w-[500px]">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descri&ccedil;&atilde;o</TableHead>
            <TableHead>Situa&ccedil;&atilde;o</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ocorrencias.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                {o.data ? formatDate(o.data) : "—"}
              </TableCell>
              <TableCell>
                {o.tipo ? <Badge variant="outline">{o.tipo}</Badge> : "—"}
              </TableCell>
              <TableCell className="text-sm max-w-[400px]">
                {o.descricao ?? "—"}
              </TableCell>
              <TableCell>
                {o.situacao ? (
                  <Badge
                    variant={o.situacao === "Ativo" ? "default" : "secondary"}
                  >
                    {o.situacao}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
