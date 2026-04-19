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

interface PublicacoesSectionProps {
  publicacoes: {
    id: string;
    dataPublicacao: Date | null;
    status: string | null;
    textoDou: string | null;
    linkPublicacao: string | null;
  }[];
}

export function PublicacoesSection({ publicacoes }: PublicacoesSectionProps) {
  if (publicacoes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma publica&ccedil;&atilde;o registrada para este contrato.
      </p>
    );
  }

  return (
    <div className="pt-2 overflow-x-auto">
      <Table className="min-w-[450px]">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Texto DOU</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {publicacoes.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {p.dataPublicacao ? formatDate(p.dataPublicacao) : "—"}
              </TableCell>
              <TableCell>
                {p.status ? (
                  <Badge variant="outline">{p.status}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-sm max-w-[500px]">
                {p.textoDou ? (
                  <p className="truncate">{p.textoDou}</p>
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
