import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PrepostosSectionProps {
  prepostos: {
    id: string;
    usuario: string;
    email: string | null;
    telefonefixo: string | null;
    celular: string | null;
    dataInicio: Date | null;
    dataFim: Date | null;
    situacao: string;
  }[];
}

export function PrepostosSection({ prepostos }: PrepostosSectionProps) {
  if (prepostos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum preposto registrado para este contrato.
      </p>
    );
  }

  return (
    <div className="pt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Per&iacute;odo</TableHead>
            <TableHead>Situa&ccedil;&atilde;o</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prepostos.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.usuario}</TableCell>
              <TableCell className="text-sm">{p.email ?? "—"}</TableCell>
              <TableCell className="text-sm">
                {p.celular ?? p.telefonefixo ?? "—"}
              </TableCell>
              <TableCell className="text-xs">
                {p.dataInicio
                  ? `${formatDate(p.dataInicio)}${p.dataFim ? ` a ${formatDate(p.dataFim)}` : " — atual"}`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={p.situacao === "Ativo" ? "default" : "secondary"}
                >
                  {p.situacao}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
