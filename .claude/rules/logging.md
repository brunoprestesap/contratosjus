# Logging — Regras de Uso

Todo código server-side deve usar o logger centralizado de `@/lib/logger`. `console.*` é proibido em `src/` por regra ESLint (exceto `warn`/`error` nos pontos mencionados abaixo).

## Import

```ts
import { logger } from "@/lib/logger";
```

## Níveis

| Nível   | Uso                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `debug` | Detalhes úteis em dev. Não deve aparecer em prod (filtrado por `LOG_LEVEL`).                                                   |
| `info`  | Eventos de negócio esperados (login bem-sucedido, contrato criado, pagamento registrado).                                      |
| `warn`  | Situações recuperáveis ou de segurança (login falhou, conta bloqueada, acesso negado por perfil, caminho inseguro de arquivo). |
| `error` | Falhas: exceções em catch, indisponibilidade de dependência externa, erro em boundary do React.                                |

`LOG_LEVEL` controla o nível mínimo. Default: `debug` em dev, `info` em prod. Pode ser sobrescrito via env var.

## Formato esperado

Sempre passe um objeto como primeiro argumento com os campos de contexto, e uma mensagem curta como segundo:

```ts
logger.error({ err: error, action: "syncEmpenhos", contractId }, "Erro ao sincronizar empenhos");
logger.warn({ event: "login.failed", email, reason: "invalid_credentials" }, "Login falhou");
logger.info({ event: "contract.created", contractId, userId }, "Contrato criado");
```

Campos convencionais:

- `err` — o objeto de erro (pino serializa `name`/`message`/`stack` automaticamente).
- `event` — identificador semântico do evento, em `namespace.verbo` (ex: `login.failed`, `access.denied`, `client.boundary`).
- `action` — nome da Server Action quando for o contexto.
- `route` — nome curto da API route.
- `userId`, `contractId`, etc. — identificadores relevantes para rastreio.

## Redaction

O logger redacta automaticamente os campos: `password`, `senha`, `passwordHash`, `hashedPassword`, `token`, `authorization`, `cookie` (em qualquer nível de aninhamento). Mesmo assim, **nunca passe o objeto `user` inteiro ou o `credentials` recebido do NextAuth** — extraia apenas os campos necessários. A redaction é rede de segurança, não licença para descuido.

## Client Components (error boundaries)

Logger pino é server-only. Em Client Components (`"use client"`), o padrão é:

1. Manter `console.error(error)` para inspeção no devtools do browser (permitido pelo ESLint via `allow: ["warn", "error"]`).
2. Chamar a Server Action `logClientError` em [src/actions/log-client-error.ts](../../src/actions/log-client-error.ts) para propagar o erro ao logger do servidor.

```tsx
import { logClientError } from "@/actions/log-client-error";

useEffect(() => {
  console.error(error);
  void logClientError({
    message: error.message,
    digest: error.digest,
    stack: error.stack,
    boundary: "dashboard",
  });
}, [error]);
```

## Middleware (Edge Runtime)

Pino **não funciona** em Edge Runtime. No [src/middleware.ts](../../src/middleware.ts) usar `console.warn(JSON.stringify({...}))` para manter formato agregável por ferramentas de log.

## Scripts fora de `src/`

Arquivos como `prisma/seed.mts` podem usar `console.*` livremente — não são afetados pela regra ESLint e não precisam do logger estruturado.
