import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { UserForm } from "@/components/usuarios/user-form";
import { getUser } from "@/actions/usuarios";

interface EditarUsuarioPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarUsuarioPage({
  params,
}: EditarUsuarioPageProps) {
  const session = await auth();
  if (session?.user?.role !== "FISCAL") redirect("/contratos");

  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return (
    <>
      <Header title="Editar Usuário" />
      <div className="p-6">
        <UserForm
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }}
        />
      </div>
    </>
  );
}
