"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUser, reactivateUser } from "@/actions/usuarios";
import { toast } from "sonner";
import type { UserStatus } from "@/generated/prisma/client";

interface UserActionsProps {
  userId: string;
  userStatus: UserStatus;
}

export function UserActions({ userId, userStatus }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggleStatus() {
    setLoading(true);
    const action = userStatus === "ACTIVE" ? deleteUser : reactivateUser;

    const result = await action(userId);
    if (result.success) {
      toast.success(
        `Usuário ${userStatus === "ACTIVE" ? "desativado" : "reativado"} com sucesso`
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao processar ação");
    }
    setLoading(false);
  }

  if (userStatus !== "ACTIVE") {
    return (
      <div className="flex items-center gap-1">
        <Link
          href={`/usuarios/${userId}/editar`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Editar
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleStatus}
          disabled={loading}
        >
          Reativar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/usuarios/${userId}/editar`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Editar
      </Link>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="sm" disabled={loading}>
              Desativar
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será bloqueado e não poderá acessar o sistema. Você
              poderá reativá-lo posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleToggleStatus}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
