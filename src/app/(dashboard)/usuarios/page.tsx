import Link from "next/link";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listUsers } from "@/actions/usuarios";
import { UserActions } from "@/components/usuarios/user-actions";

export default async function UsuariosPage() {
  const users = await listUsers();

  return (
    <>
      <Header title="Usuários" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.length} usuário(s) cadastrado(s)
          </p>
          <Link href="/usuarios/novo" className={buttonVariants()}>
            + Novo Usuário
          </Link>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "FISCAL" ? "default" : "secondary"}>
                        {user.role === "FISCAL" ? "Fiscal" : "Diretor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "ACTIVE" ? "outline" : "destructive"}
                      >
                        {user.status === "ACTIVE" ? "Ativo" : "Bloqueado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserActions userId={user.id} userStatus={user.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
