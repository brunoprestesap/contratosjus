"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      router.push("/contratos");
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao fazer login");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold">
          Sistema de Gestão de Contratos
        </h1>
        <p className="text-sm text-muted-foreground">JFAP / NUTEC</p>
      </div>

      <div aria-live="assertive" aria-atomic="true">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <p className="text-sm">{error}</p>
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.jus.br"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
