import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ArquivosSectionProps {
  arquivos: {
    id: string;
    tipo: string | null;
    descricao: string | null;
    pathArquivo: string | null;
    origem: string | null;
    sequencialDocumento: string | null;
  }[];
}

export function ArquivosSection({ arquivos }: ArquivosSectionProps) {
  if (arquivos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum arquivo registrado para este contrato.
      </p>
    );
  }

  return (
    <div className="pt-2 overflow-x-auto">
      <Table className="min-w-[450px]">
        <TableHeader>
          <TableRow>
            <TableHead>Seq.</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descri&ccedil;&atilde;o</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {arquivos.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">
                {a.sequencialDocumento ?? "—"}
              </TableCell>
              <TableCell>
                {a.tipo ? <Badge variant="outline">{a.tipo}</Badge> : "—"}
              </TableCell>
              <TableCell className="text-sm max-w-[400px] truncate">
                {a.descricao ?? "—"}
              </TableCell>
              <TableCell className="text-sm">{a.origem ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
