import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { UserForm } from "@/components/usuarios/user-form";

export default async function NovoUsuarioPage() {
  const session = await auth();
  if (session?.user?.role !== "FISCAL") redirect("/contratos");

  return (
    <>
      <Header title="Novo Usuário" />
      <div className="p-6">
        <UserForm />
      </div>
    </>
  );
}
