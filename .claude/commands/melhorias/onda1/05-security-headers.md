---
description: "Configurar CSP e headers de segurança em next.config.ts"
---

## Ordem de execução: 5 de 7 (Grupo A — Onda 1)

Quinto porque é **mudança em arquivo de config único**, de baixo risco. `security.md` já define obrigatoriedade mas falta aplicar.

## Contexto

Órgão federal; sistema acessível por intranet. Faltam headers padrão para mitigar clickjacking, MIME sniffing, XSS via injeção de scripts.

## Passos

1. Editar `next.config.ts` adicionando `async headers()`:
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy`: começar com `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'`
2. Testar em `npm run dev` — se shadcn/ui ou algum componente quebrar por CSP, ajustar (ex: Tailwind pode exigir `'unsafe-inline'` em dev).
3. Rodar `npm run build && npm run start` e confirmar via DevTools → Network → Response Headers.
4. Avaliar uso de `nonce` para CSP mais estrito (trabalho adicional — deixar como TODO se não essencial).

## Validação

- securityheaders.com em staging devolve grade A ou superior.
- `curl -I https://localhost` mostra todos os headers.
- Aplicação funciona normalmente (login, CRUD, navegação).
