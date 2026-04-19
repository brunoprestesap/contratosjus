---
description: "Onda 3 — Visão transversal de pagamentos: todos os contratos, filtráveis por contrato/período/status"
---

# Onda 3 — Pagamentos (Visão Transversal)

## 1. Server Action

Criar `src/actions/pagamentos-transversal.ts`:

```typescript
// listAllPayments({ page, perPage, contractId?, startDate?, endDate?, status? }):
//   Busca pagamentos de TODOS os contratos
//   Filtros:
//     - contractId: filtrar por contrato específico
//     - startDate/endDate: filtrar por referenceMonth
//     - status: filtrar por status calculado (Pendente/Atestado/Liquidado/Pago)
//   Include: contract (para exibir nº e fornecedor)
//   Ordenação: referenceMonth desc (mais recente primeiro)
//   Paginação: server-side
//   Retorna: { payments, total, totalPages }
```

**Nota sobre filtro de status:** Como status é calculado (não é campo no banco), o filtro precisa ser feito no nível da query:

- Pago: `paidAt IS NOT NULL`
- Liquidado: `settlementDate IS NOT NULL AND paidAt IS NULL`
- Atestado: `attestDate IS NOT NULL AND settlementDate IS NULL`
- Pendente: `attestDate IS NULL`

## 2. Página

Criar `src/app/(dashboard)/pagamentos/page.tsx`:

- Título "Pagamentos"
- Filtros (URL search params):
  - Contrato: Select com busca (lista todos os contratos ativos)
  - Período: DatePicker range (mês início, mês fim)
  - Status: Select (Todos, Pendente, Atestado, Liquidado, Pago)

Criar `src/components/pagamentos/pagamentos-transversal-table.tsx`:

- DataTable com colunas:
  | Contrato | Mês Ref. | Valor NF | Ateste | Liquidação | Pagamento | Status |
- Contrato: nº do contrato (link para ficha)
- Demais colunas: mesmo formato da tabela na ficha do contrato
- Linha clicável → navega para ficha do contrato na seção Pagamentos
- Paginação: 20 por página
- Sorting: clique no header
- Loading: Skeleton rows
- Empty: "Nenhum pagamento encontrado para os filtros selecionados"

## 3. Sidebar

Adicionar "Pagamentos" na sidebar (visível apenas para Fiscal):

```
💰  Pagamentos
```

## Verificação

- [ ] Tela lista pagamentos de todos os contratos
- [ ] Filtro por contrato funciona
- [ ] Filtro por período funciona
- [ ] Filtro por status funciona
- [ ] Paginação server-side funciona
- [ ] Clique na linha navega para ficha do contrato
- [ ] Coluna "Contrato" mostra nº do contrato
- [ ] Status com badges coloridos
- [ ] Apenas Fiscal vê no menu
