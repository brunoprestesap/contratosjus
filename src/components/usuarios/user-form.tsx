"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  userCreateSchema,
  userUpdateSchema,
  validatePasswordStrength,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/validators/usuario";
import { createUser, updateUser } from "@/actions/usuarios";

interface UserFormProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "FISCAL" | "DIRETOR";
  };
}

export function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(isEditing ? userUpdateSchema : userCreateSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "FISCAL",
    },
  });

  const passwordValue = watch("password") ?? "";
  const passwordCheck =
    passwordValue.length > 0 ? validatePasswordStrength(passwordValue) : null;

  async function onSubmit(data: UserCreateInput | UserUpdateInput) {
    const result = isEditing
      ? await updateUser(user.id, data)
      : await createUser(data);

    if (result.success) {
      toast.success(
        isEditing
          ? "Usuário atualizado com sucesso"
          : "Usuário criado com sucesso"
      );
      router.push("/usuarios");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao salvar usuário");
    }
  }

  return (
    <Card className="max-w-lg p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Senha{isEditing && " (deixe em branco para manter a atual)"}
          </Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
          {passwordCheck && !passwordCheck.valid && (
            <Alert variant="destructive" className="py-2">
              <ul className="list-disc pl-4 text-xs space-y-0.5">
                {passwordCheck.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}
          {passwordCheck?.valid && (
            <p className="text-sm text-green-600">Senha forte</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FISCAL">Fiscal</SelectItem>
                  <SelectItem value="DIRETOR">Diretor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role.message}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/usuarios")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
