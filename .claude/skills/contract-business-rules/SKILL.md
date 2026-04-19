---
name: contract-business-rules
description: "Regras de negócio do domínio de contratos públicos (Leis 14.133 e 8.666). Consultar antes de implementar cálculos financeiros, validações ou lógica de status."
---

# Regras de Negócio — Contratos JFAP

## Quando usar esta skill

- Ao implementar cálculos financeiros (saldo, empenho, etc.)
- Ao implementar validações de formulário ou Server Actions
- Ao definir lógica de status automático
- Ao implementar alertas

## Referência detalhada

Consultar `references/regras-detalhadas.md` para a especificação completa de cada regra com exemplos numéricos.

## Resumo das Regras

### Cálculos

1. **Saldo contratual** = valor global do contrato − soma de todos `paidValue` (pagamentos efetivados)
2. **Saldo de empenho** = soma de `value` em Commitment − soma de `settledValue` em Payment
3. **% consumido** = (total pago / valor global) × 100

### Status automático de pagamento

- Nenhum campo → `Pendente`
- attestDate preenchido → `Atestado`
- attestDate + settlementDate → `Liquidado`
- attestDate + settlementDate + paidAt → `Pago`

### Validações bloqueantes (impedem salvar)

- ❌ Pagamento em contrato com status `EXPIRED` ou `endDate < hoje`
- ❌ `settlementDate < attestDate`
- ❌ `paidAt < settlementDate`

### Validações de alerta (permitem salvar, mas mostram warning)

- ⚠️ `totalPaid + totalCommitted > globalValue` (estouro)
- ⚠️ Mês sem registro em contrato `PaymentType.FIXED` quando mês já encerrou

### Alertas (Onda 2)

- 🔴 Vigência vencendo em < 30 dias
- 🟡 Vigência vencendo em 30-60 dias
- 🔵 Vigência vencendo em 60-90 dias
- 🟡 Saldo < 20% do valor global
- 🟠 Mês sem pagamento registrado (contrato fixo)

### Aditivos (Onda 2)

- Aditivo de **prazo**: altera `endDate` do contrato
- Aditivo de **valor**: altera `globalValue` do contrato
- Aditivo **misto**: altera ambos
- **Reajuste/Repactuação**: altera `estimatedMonthlyValue` e pode alterar `globalValue`
- **Apostilamento**: pode alterar `budgetProgram`, `expenseNature`
- Após salvar aditivo, recalcular saldo automaticamente
