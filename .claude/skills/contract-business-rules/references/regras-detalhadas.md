# Regras de Negócio — Especificação Detalhada com Exemplos

## 1. Cálculo de Saldo Contratual

**Fórmula:** `saldoRestante = valorGlobal - somaPagamentosEfetivados`

Exemplo — Contrato 012/2025 (suporte técnico, R$ 35.000/mês, 12 meses):

```
Valor Global:    R$ 420.000,00
Pagamento Jan:   R$  35.000,00 (pago)
Pagamento Fev:   R$  35.000,00 (pago)
Pagamento Mar:   R$  35.000,00 (pago)
Pagamento Abr:   R$  35.000,00 (liquidado, não pago ainda)
Pagamento Mai:   ---            (pendente)
────────────────────────────────
Total Pago:      R$ 105.000,00  (apenas os 3 efetivados)
Saldo Restante:  R$ 315.000,00  (420k - 105k)
% Consumido:     25%
```

**IMPORTANTE:** O pagamento de Abril (liquidado mas não pago) NÃO entra no cálculo de "total pago". Saldo contratual só considera `paidValue` onde `paidAt IS NOT NULL`.

## 2. Cálculo de Saldo de Empenho

**Fórmula:** `saldoEmpenho = somaEmpenhos - somaLiquidações`

```
Empenho inicial:  2026NE000123  R$ 420.000,00
Reforço:          2026NE000456  R$  30.000,00
────────────────────────────────
Total Empenhado:  R$ 450.000,00

Liquidação Jan:   R$  35.000,00
Liquidação Fev:   R$  35.000,00
Liquidação Mar:   R$  35.000,00
────────────────────────────────
Total Liquidado:  R$ 105.000,00

Saldo Disponível: R$ 345.000,00  (450k - 105k)
```

## 3. Status Automático de Pagamento

```typescript
function getPaymentStatus(payment: Payment): string {
  if (payment.paidAt && payment.settlementDate && payment.attestDate) return "Pago";
  if (payment.settlementDate && payment.attestDate) return "Liquidado";
  if (payment.attestDate) return "Atestado";
  return "Pendente";
}
```

| attestDate | settlementDate | paidAt | Status    |
| ---------- | -------------- | ------ | --------- |
| null       | null           | null   | Pendente  |
| 05/04      | null           | null   | Atestado  |
| 05/04      | 18/04          | null   | Liquidado |
| 05/04      | 18/04          | 25/04  | Pago      |

## 4. Validação de Ordem Cronológica

```
attestDate ≤ settlementDate ≤ paidAt
```

Exemplos válidos:

- ateste 05/04, liquidação 18/04, pagamento 25/04 ✅
- ateste 05/04, liquidação 05/04, pagamento 05/04 ✅ (mesmo dia é ok)

Exemplos inválidos:

- ateste 18/04, liquidação 05/04 ❌ (liquidação antes do ateste)
- ateste 05/04, liquidação 18/04, pagamento 10/04 ❌ (pagamento antes da liquidação)

## 5. Validação de Contrato Expirado

```typescript
function isContractExpired(endDate: Date): boolean {
  return new Date() > endDate;
}
```

Se `isContractExpired(contract.endDate) === true`, BLOQUEAR registro de novo pagamento. Exibir mensagem: "Não é possível registrar pagamento em contrato com vigência encerrada."

## 6. Alerta de Estouro de Valor Global

```typescript
function isOverBudget(totalPaid: number, totalCommitted: number, globalValue: number): boolean {
  return totalPaid + totalCommitted > globalValue;
}
```

NÃO bloquear. Exibir Alert (warning/amarelo) no formulário:
"⚠️ Atenção: o total pago + empenhado (R$ XXX) ultrapassa o valor global do contrato (R$ YYY). Verifique a necessidade de aditivo de valor."

## 7. Alerta de Mês Sem Registro

Para contratos com `paymentType = FIXED` e `paymentPeriodicity = MONTHLY`:

```typescript
// Para cada mês entre startDate e hoje:
// Se não existe Payment para aquele referenceMonth → gerar alerta
function getMissingPaymentMonths(contract: Contract, payments: Payment[]): Date[] {
  const months: Date[] = [];
  let current = startOfMonth(contract.startDate);
  const now = startOfMonth(new Date());

  while (current <= now) {
    const hasPayment = payments.some(
      (p) => startOfMonth(p.referenceMonth).getTime() === current.getTime(),
    );
    if (!hasPayment) months.push(current);
    current = addMonths(current, 1);
  }
  return months;
}
```

## 8. Validação de Senha

```typescript
function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Mínimo de 12 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Deve conter letra maiúscula");
  if (!/[a-z]/.test(password)) errors.push("Deve conter letra minúscula");
  if (!/[0-9]/.test(password)) errors.push("Deve conter número");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Deve conter caractere especial");
  return { valid: errors.length === 0, errors };
}
```

## 9. Validação de CNPJ

Algoritmo padrão de validação de CNPJ com dígitos verificadores (módulo 11). Aceitar com ou sem máscara. Rejeitar CNPJs com todos dígitos iguais (ex: 00.000.000/0000-00).

## 10. Barra de Progresso — Cores

| % Consumido | Cor      | Classe Tailwind         |
| ----------- | -------- | ----------------------- |
| 0% - 50%    | Verde    | `bg-green-500`          |
| 50% - 80%   | Amarelo  | `bg-yellow-500`         |
| 80% - 100%  | Vermelho | `bg-red-500`            |
| > 100%      | Vermelho | `bg-red-500` + ⚠️ badge |
