---
description: "Revisa o código alterado na branch atual antes de commit"
---

## Arquivos Alterados

!`git diff --name-only HEAD 2>/dev/null || git diff --name-only --cached 2>/dev/null || echo "Nenhuma alteração detectada"`

## Diff Completo

!`git diff HEAD 2>/dev/null || git diff --cached 2>/dev/null || echo "Sem diff"`

## Revisar os seguintes pontos:

1. **TypeScript:** Erros de tipo, `any` desnecessário, tipos faltantes
2. **Segurança:** Dados sensíveis expostos, SQL injection, XSS, stack traces no cliente
3. **Regras de negócio:** Cálculos financeiros corretos, validações aplicadas
4. **Convenções do projeto:** Conforme CLAUDE.md (naming, imports, formatação pt-BR)
5. **Performance:** N+1 queries, dados não paginados, re-renders desnecessários
6. **Erros:** Try/catch em Server Actions, empty states, loading states
7. **Acessibilidade mínima:** Labels em inputs, alt em imagens, HTML semântico
8. **Segredos:** Nenhum .env, senha ou token commitado

Para cada problema encontrado, indique: arquivo, linha, severidade (🔴 blocker / 🟡 atenção / 🔵 sugestão) e correção sugerida.
