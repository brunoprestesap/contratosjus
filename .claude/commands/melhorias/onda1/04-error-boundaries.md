---
description: "Adicionar error.tsx em cada rota do dashboard para não expor stack trace"
---

## Ordem de execução: 4 de 7 (Grupo A — Onda 1)

Quarto porque é **mudança isolada por arquivo** — cada `error.tsx` afeta só uma rota. Cumpre regra de segurança "nunca expor stack trace ao cliente".

## Contexto

Sem `error.tsx`, Next.js mostra página de erro padrão que em dev vaza stack trace. Em produção mostra página genérica — mas não temos controle de UX nem logging.

## Passos

1. Criar `src/app/(dashboard)/error.tsx` (boundary raiz do dashboard) como Client Component:
   - Recebe `{ error, reset }` como props
   - Loga erro (stub inicial; integrar com logger do passo B3 quando existir)
   - Renderiza `Alert` destructive do shadcn com mensagem genérica "Ocorreu um erro inesperado"
   - Botão `Tentar novamente` chama `reset()`
2. Criar `src/app/(dashboard)/contratos/error.tsx`, `/pagamentos/error.tsx`, `/usuarios/error.tsx` — podem reexportar do raiz ou ter UX específica.
3. Criar `src/app/global-error.tsx` (captura erros do root layout).
4. Verificar `src/app/(dashboard)/loading.tsx` existe em cada rota — complemento natural.
5. Forçar um erro em dev (ex: `throw new Error("test")` em página) e confirmar que boundary dispara.

## Validação

- Forçar erro em `/contratos` mostra mensagem genérica, não stack trace.
- Botão "Tentar novamente" recarrega a página sem navegação.
- Em produção (`NODE_ENV=production`), nenhuma informação sensível aparece no HTML.
