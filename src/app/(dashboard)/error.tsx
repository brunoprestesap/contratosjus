"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logClientError } from "@/actions/log-client-error";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error);
    void logClientError({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      boundary: "dashboard",
    });
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Ocorreu um erro inesperado</AlertTitle>
          <AlertDescription>
            Tente novamente. Se o problema persistir, contate o administrador.
          </AlertDescription>
        </Alert>

        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            Código do erro: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        {isDev && error.message ? (
          <pre className="max-h-48 overflow-auto rounded border bg-muted p-3 text-xs">
            {error.message}
          </pre>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={reset}>Tentar novamente</Button>
        </div>
      </div>
    </div>
  );
}
