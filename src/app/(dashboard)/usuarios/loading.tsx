import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UsuariosLoading() {
  return (
    <>
      <Header title="Usu\u00e1rios" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">A\u00e7\u00f5es</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
