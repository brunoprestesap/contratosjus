---
description: "Histórico de alterações por campo com diff visual na ficha do contrato"
---

## Ordem de execução: 3 de 4 (Grupo D — Backlog)

Terceiro porque **depende de auditoria** (Onda 2 — passo C1) já estar no ar. Sem `AuditLog` populado, não há de onde extrair o histórico.

## Contexto

`AuditLog` guarda `before` e `after` em JSON. Sem UI, só serve para forense via SQL. Um diff visual na ficha do contrato transforma auditoria em ferramenta de gestão.

## Pré-requisito

- Onda 2 concluída, com `AuditLog` registrando `before` e `after`.

## Passos

1. Criar `src/components/contratos/historico-alteracoes.tsx` (Client Component) com shadcn `Accordion` ou `Sheet`.
2. Server Component `historico-section.tsx` busca `AuditLog` onde `entity='Contrato' AND entityId=id`, ordenado por `createdAt DESC`.
3. Para cada entrada, renderizar:
   - Data/hora, usuário (join com `User`), ação.
   - Diff campo a campo: comparar `before` e `after`, listar apenas campos que mudaram.
   - Formatar valores com os helpers pt-BR (passo A2).
4. Valor antigo riscado (`<del>`), novo em verde (`<ins>` ou `text-green-700`).
5. Adicionar aba "Histórico" na ficha do contrato (onde já existe accordion por seção).
6. Paginar se mais de 20 entradas (`LIMIT` + "carregar mais").

## Validação

- Editar valor global de um contrato → histórico mostra nova entrada com `valorGlobal: R$ 10.000 → R$ 12.000`.
- Usuário Diretor (leitura) vê o histórico, não consegue editar (já coberto por middleware de autorização).
- Performance OK com 100+ entradas (queries indexadas por `entityId`).
