"use client";

import { useEffect } from "react";

import { logClientError } from "@/actions/log-client-error";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
    void logClientError({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      boundary: "global",
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            background: "#fff",
            color: "#111",
          }}
        >
          <div style={{ maxWidth: "28rem", width: "100%" }}>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Erro crítico na aplicação
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#555", margin: 0 }}>
              Ocorreu uma falha inesperada. Tente novamente e, se persistir, contate o
              administrador.
            </p>
            {error.digest ? (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#777",
                  marginTop: "0.75rem",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Código do erro: {error.digest}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1.25rem",
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
