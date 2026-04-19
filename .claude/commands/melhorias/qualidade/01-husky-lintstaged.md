---
description: "Husky + lint-staged para gate local pré-commit (typecheck + lint + testes afetados)"
---

## Ordem de execução: 1 de 3 (Grupo B — Qualidade)

Primeiro porque **feedback loop local rápido** evita que código quebrado chegue ao repo. Pré-requisito para fazer CI (passo B2) ser proveitoso.

## Contexto

Sem gate local, erros de tipo e testes só aparecem no push. Isso adiciona minutos a cada ciclo. Husky + lint-staged rodam apenas nos arquivos staged — rápido o suficiente para não incomodar.

## Passos

1. Instalar: `npm i -D husky lint-staged`.
2. `npx husky init` (cria `.husky/pre-commit`).
3. Editar `.husky/pre-commit` para: `npx lint-staged`.
4. Adicionar em `package.json`:
   ```json
   "lint-staged": {
     "*.{ts,tsx}": [
       "eslint --fix",
       "prettier --write",
       "bash -c 'tsc --noEmit'"
     ]
   }
   ```
5. Garantir que o tsc rode uma vez só (não por arquivo) — usar `tsc --noEmit` via script se necessário.
6. Adicionar script `"typecheck": "tsc --noEmit"` em `package.json`.
7. Testar com commit de arquivo com erro — deve bloquear.

## Validação

- Commit com `any` bloqueado por tsc.
- Commit com import inválido bloqueado por eslint.
- Commit de markdown sem tocar em `.ts` não roda typecheck (performance).
