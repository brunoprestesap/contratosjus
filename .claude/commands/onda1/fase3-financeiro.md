---
description: "Onda 1 / Fase 3 — Empenhos, pagamentos mensais com preenchimento parcial, cálculo automático de saldo"
---

# Fase 3 — Financeiro (Empenhos + Pagamentos + Saldo)

## 1. Zod Schemas

Criar `src/lib/validators/empenho.ts`:

```typescript
// commitmentSchema:
//   commitmentNumber: string (obrigatório, ex: "2026NE000123")
//   commitmentDate: date (obrigatório)
//   value: decimal (obrigatório, > 0)
//   type: enum INITIAL | REINFORCEMENT
//   notes: string (opcional)
```

Criar `src/lib/validators/pagamento.ts`:

```typescript
// paymentCreateSchema:
//   referenceMonth: date (obrigatório — primeiro dia do mês)
//   invoiceValue: decimal (opcional)
//   attestDate: date (obrigatório — mínimo para criar registro)
//   attestNotes: string (opcional)
//   settlementDate: date (opcional, deve ser >= attestDate)
//   settledValue: decimal (opcional)
//   paidAt: date (opcional, deve ser >= settlementDate)
//   paidValue: decimal (opcional)
//
// paymentUpdateSchema: todos opcionais exceto referenceMonth
//   Validações de ordem cronológica:
//   - Se settlementDate informada, attestDate obrigatório
//   - Se paidAt informada, settlementDate obrigatório
//   - settlementDate >= attestDate
//   - paidAt >= settlementDate
```

## 2. Server Actions

Criar `src/actions/empenhos.ts`:

- `createCommitment(contractId, data)` — Criar empenho vinculado ao contrato
- `updateCommitment(id, data)` — Editar empenho
- `deleteCommitment(id)` — Excluir com confirmação
- `listCommitments(contractId)` — Listar por contrato
- Após toda mutation: `revalidatePath("/contratos/[contractId]")`

Criar `src/actions/pagamentos.ts`:

- `createPayment(contractId, data)` — Criar pagamento
  - BLOQUEAR se contrato expirado (endDate < hoje) → retornar error
  - ALERTAR se total pago + empenhado > valor global → retornar `{ success: true, warning: "..." }`
  - Validar uniqueness: um registro por (contractId + referenceMonth)
- `updatePayment(id, data)` — Atualizar (complementar campos)
  - Mesmas validações de bloqueio e alerta
  - Validar ordem cronológica
- `deletePayment(id)` — Excluir com confirmação
- `listPayments(contractId)` — Listar por contrato, ordenado por referenceMonth desc
- Após toda mutation: `revalidatePath("/contratos/[contractId]")`

Criar funções utilitárias em `src/lib/utils.ts`:

```typescript
// getPaymentStatus(payment): "Pendente" | "Atestado" | "Liquidado" | "Pago"
// isContractExpired(endDate: Date): boolean
// isOverBudget(totalPaid: Decimal, totalCommitted: Decimal, globalValue: Decimal): boolean
// calculateCommitmentBalance(commitments: Commitment[], payments: Payment[]): Decimal
```

## 3. Seção de Empenhos (Ficha do Contrato)

Criar `src/components/contratos/empenhos-section.tsx`:

- Accordion item com título "Empenhos" + botão [+ Novo Empenho] no header
- Tabela com colunas: Nota Empenho, Data, Valor, Tipo (Inicial/Reforço), Ações (editar, excluir)
- Última linha: **Saldo Disponível** (soma empenhos − soma liquidações) em negrito
- Modal (Dialog) para cadastro/edição:
  - Campos: commitmentNumber, commitmentDate (DatePicker), value (CurrencyInput), type (Select), notes (Textarea)
  - React Hook Form + zodResolver
- Dialog de confirmação para exclusão
- Empty state: "Nenhum empenho registrado"

## 4. Seção de Pagamentos (Ficha do Contrato)

Criar `src/components/contratos/pagamentos-section.tsx`:

- Accordion item com título "Pagamentos" + botão [+ Registrar Pagamento] no header
- **Tabela de pagamentos** com colunas:
  | Mês Ref. | Valor NF | Ateste | Liquidação | Pagamento | Status |
  - Mês Ref: formato "Mar/2026"
  - Valor NF: formatado como moeda
  - Ateste: ✅ DD/MM se preenchido, ⏳ --- se não
  - Liquidação: ✅ DD/MM se preenchido, ⏳ --- se não, --- se ateste não preenchido
  - Pagamento: ✅ DD/MM se preenchido, ⏳ --- se não
  - Status: Badge colorido (Pago=verde, Liquidado=azul, Atestado=amarelo, Pendente=cinza)
- Linha clicável → abre modal de edição (para complementar campos)
- Ordenação: mês mais recente primeiro

Criar `src/components/contratos/pagamento-form-modal.tsx`:

- Dialog com formulário de pagamento
- Campos organizados em seções visuais:
  - **Referência:** referenceMonth (MonthPicker ou Select de mês/ano), invoiceValue (CurrencyInput)
  - **Ateste:** attestDate (DatePicker), attestNotes (Textarea)
  - **Liquidação:** settlementDate (DatePicker), settledValue (CurrencyInput)
  - **Pagamento:** paidAt (DatePicker), paidValue (CurrencyInput)
- Campos de liquidação desabilitados se ateste não preenchido
- Campos de pagamento desabilitados se liquidação não preenchida
- Validação inline de ordem cronológica
- Se contrato expirado: exibir Alert destructive e desabilitar submit
- Se valor estoura global: exibir Alert warning (mas permitir salvar)
- Botões: Cancelar + Salvar

## 5. Cabeçalho Resumo (atualização)

Atualizar `src/components/contratos/contrato-card-resumo.tsx`:

- Calcular totais a partir dos pagamentos e empenhos do contrato:
  - Total Pago: soma de `paidValue` onde `paidAt IS NOT NULL`
  - Saldo Restante: globalValue − totalPago
  - % Consumido: (totalPago / globalValue) × 100
- Barra de progresso (Progress):
  - value = percentual consumido
  - Cor: verde (< 50%), amarelo (50-80%), vermelho (> 80%)
- Exibir também:
  - Total Empenhado: soma de `value` dos commitments
  - Total Liquidado: soma de `settledValue`

## 6. Testes Unitários

Criar `tests/lib/calculo-saldo.test.ts`:

- `calculateContractBalance`: saldo correto, totalmente pago (zero), estourado (negativo), sem pagamentos
- `getBalancePercentage`: 0%, 50%, 100%, > 100%
- `getBalanceColor`: verde, amarelo, vermelho

Criar `tests/lib/pagamento-status.test.ts`:

- `getPaymentStatus`: Pendente (todos null), Atestado (só ateste), Liquidado (ateste + liquidação), Pago (tudo preenchido)

Criar `tests/lib/validacoes.test.ts`:

- `isContractExpired`: contrato ativo (futuro), vencido (passado), vence hoje
- `isOverBudget`: dentro do budget, exatamente no limite, estourado
- Ordem cronológica: datas válidas, liquidação antes do ateste, pagamento antes da liquidação

## Verificação

- [ ] Cadastro de empenho funciona (inicial + reforço)
- [ ] Saldo disponível de empenho calculado corretamente
- [ ] Registro de pagamento com apenas ateste → status "Atestado"
- [ ] Edição para complementar liquidação → status "Liquidado"
- [ ] Edição para complementar pagamento → status "Pago"
- [ ] Tabela de pagamentos com checkmarks e datas
- [ ] Saldo contratual atualiza em tempo real na ficha
- [ ] Barra de progresso com cor correta
- [ ] BLOQUEIO: pagamento em contrato expirado
- [ ] BLOQUEIO: liquidação antes do ateste / pagamento antes da liquidação
- [ ] ALERTA: estouro de valor global (warning, não bloqueia)
- [ ] Todos os testes unitários passando
