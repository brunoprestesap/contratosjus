---
description: "Onda 1 / Fase 2 — CRUD de contratos: formulário, lista com filtros, ficha do contrato com accordion"
---

# Fase 2 — Contratos (CRUD Completo)

## 1. Zod Schema

Criar `src/lib/validators/contrato.ts`:

```typescript
// contractCreateSchema com todos os campos:
// Identificação:
//   contractNumber: string (obrigatório, único)
//   processNumber: string (obrigatório)
//   object: string (obrigatório)
//   supplier: string (obrigatório)
//   supplierCnpj: string (obrigatório, validação de CNPJ)
//   legalRegime: enum LEI_14133_2021 | LEI_8666_1993
//   biddingModality: enum (pregão, dispensa, inexigibilidade, etc.)
//
// Vigência:
//   signatureDate: date (obrigatório)
//   startDate: date (obrigatório)
//   endDate: date (obrigatório, deve ser >= startDate)
//   canExtend: boolean
//
// Financeiro:
//   globalValue: decimal (obrigatório, > 0)
//   paymentType: enum FIXED | VARIABLE | MIXED
//   estimatedMonthlyValue: decimal (obrigatório se paymentType = FIXED ou MIXED)
//   paymentPeriodicity: enum MONTHLY | BIMONTHLY | ON_DEMAND
//
// Dotação:
//   budgetProgram: string (opcional)
//   expenseNature: string (opcional)
//
// Gestão:
//   fiscalHolder: string (obrigatório)
//   fiscalSubstitute: string (opcional)
//   contractManager: string (opcional)
```

Todas as mensagens de erro em pt-BR.

Criar função `validateCNPJ(cnpj: string): boolean` em `src/lib/utils.ts` com algoritmo de dígitos verificadores módulo 11. Rejeitar CNPJs com todos dígitos iguais.

## 2. Server Actions

Criar `src/actions/contratos.ts`:

- `createContract(data)` — Validar com Zod, criar no Prisma, revalidatePath("/contratos")
- `updateContract(id, data)` — Validar, atualizar, revalidatePath
- `deleteContract(id)` — Deletar em cascata (pagamentos + empenhos), revalidatePath
- `listContracts({ page, perPage, search, status, legalRegime })` — Paginado, com filtros, retorna `{ contracts, total, totalPages }`
- `getContract(id)` — Buscar por ID com `include: { commitments: true, payments: true }`

Todos retornam `{ success, data?, error? }`.

## 3. Componentes Utilitários

Criar `src/components/ui/currency-input.tsx`:

- Input que formata valor como moeda pt-BR (R$ 35.000,00)
- Aceita apenas números, converte para Decimal internamente
- Integrado com React Hook Form via Controller

Criar `src/components/ui/cnpj-input.tsx`:

- Input com máscara XX.XXX.XXX/XXXX-XX
- Validação em tempo real
- Integrado com React Hook Form

Criar `src/lib/utils.ts` (adicionar funções):

- `formatCurrency(value: number | Decimal): string` → "R$ 35.000,00"
- `formatDate(date: Date): string` → "05/04/2026"
- `formatCnpj(cnpj: string): string` → "12.345.678/0001-00"
- `calculateContractBalance(globalValue: Decimal, totalPaid: Decimal): Decimal`
- `getBalancePercentage(globalValue: Decimal, totalPaid: Decimal): number`
- `getBalanceColor(percentage: number): "green" | "yellow" | "red"`

## 4. Formulário de Contrato

Criar `src/components/contratos/contrato-form.tsx`:

- "use client" — formulário interativo
- React Hook Form + zodResolver com contractCreateSchema
- Seções visuais separadas com títulos (Card ou fieldset):
  - **Identificação:** contractNumber, processNumber, object (textarea), supplier, supplierCnpj (com máscara), legalRegime (Select), biddingModality (Select)
  - **Vigência:** signatureDate (DatePicker), startDate, endDate, canExtend (Switch)
  - **Financeiro:** globalValue (CurrencyInput), paymentType (Select), estimatedMonthlyValue (condicional: visível se FIXED ou MIXED), paymentPeriodicity (Select)
  - **Dotação Orçamentária:** budgetProgram, expenseNature
  - **Gestão:** fiscalHolder, fiscalSubstitute, contractManager
- Validação inline em tempo real
- Botões: Cancelar (com Dialog de confirmação se dirty), Salvar (com spinner)
- Toast (Sonner) de sucesso → redireciona para ficha do contrato
- Componente reutilizável para cadastro E edição (recebe `defaultValues?` como prop)

## 5. Lista de Contratos

Criar `src/app/(dashboard)/contratos/page.tsx` (Server Component):

- Título "Contratos" + botão "+ Novo Contrato"
- Busca: Input com ícone de lupa (busca por nº, fornecedor, objeto)
- Filtros: Select de Status (Ativo/Encerrado/Todos), Select de Regime Legal, filtro de Vigência
- Busca e filtros via URL search params (useSearchParams no client, leitura no server)

Criar `src/components/contratos/contratos-table.tsx`:

- DataTable com colunas: Nº Contrato, Fornecedor, Objeto (truncado), Vigência (data fim), Saldo (%)
- Sorting por coluna (clique no header)
- Paginação: 10 por página
- Coluna Saldo: Badge com cor (verde > 50%, amarelo 20-50%, vermelho < 20%)
- Coluna Vigência: Badge de alerta se < 90 dias
- Linha clicável → navega para `/contratos/[id]`
- Loading: Skeleton rows
- Empty: "Nenhum contrato cadastrado" + botão "+ Novo Contrato"

## 6. Ficha do Contrato

Criar `src/app/(dashboard)/contratos/[id]/page.tsx` (Server Component):

- Buscar contrato por ID com include de pagamentos e empenhos
- Se não encontrado → notFound()

Criar `src/components/contratos/contrato-card-resumo.tsx`:

- Card no topo com informações-chave:
  - Fornecedor (razão social + CNPJ)
  - Objeto
  - Status: Badge ● Ativo ou ● Encerrado
  - Regime legal + Modalidade
  - Valor Global: formatado
  - Total Pago: formatado
  - Saldo Restante: formatado + porcentagem
  - Barra de progresso (Progress do shadcn/ui) com cor semântica
  - Vigência: data início a data fim + dias restantes
- Botões no topo: [← Voltar] [Editar] [Excluir] [📄 Exportar PDF — desabilitado, Onda 3]

Criar `src/components/contratos/contrato-sections.tsx`:

- Accordion com seções colapsáveis:
  - **Dados Cadastrais** (expandido por padrão): nº contrato, processo, regime, modalidade
  - **Vigência** (colapsado): datas, possibilidade de prorrogação
  - **Dotação Orçamentária** (colapsado): programa de trabalho, natureza da despesa
  - **Gestão** (colapsado): fiscal titular, substituto, gestor
- Cada seção exibe dados em grid 2 colunas (label: valor)

**Nota:** As seções de Empenhos e Pagamentos são criadas na Fase 3.

## 7. Páginas de Cadastro e Edição

Criar `src/app/(dashboard)/contratos/novo/page.tsx`:

- Título "Novo Contrato"
- Renderiza `<ContratoForm />`

Criar `src/app/(dashboard)/contratos/[id]/editar/page.tsx`:

- Título "Editar Contrato 012/2025"
- Busca dados do contrato
- Renderiza `<ContratoForm defaultValues={contract} />`

Dialog de confirmação para exclusão (dentro da ficha):

- AlertDialog: "Tem certeza que deseja excluir o contrato 012/2025? Esta ação não pode ser desfeita. Todos os pagamentos e empenhos vinculados serão excluídos."
- Botões: Cancelar (outline) + Excluir (destructive)

## 8. Constantes

Criar `src/lib/constants.ts`:

```typescript
export const LEGAL_REGIME_LABELS = {
  LEI_14133_2021: "Lei 14.133/2021",
  LEI_8666_1993: "Lei 8.666/1993",
};

export const BIDDING_MODALITY_LABELS = {
  PREGAO_ELETRONICO: "Pregão Eletrônico",
  PREGAO_PRESENCIAL: "Pregão Presencial",
  DISPENSA: "Dispensa de Licitação",
  INEXIGIBILIDADE: "Inexigibilidade",
  CONCORRENCIA: "Concorrência",
  TOMADA_PRECOS: "Tomada de Preços",
  CONVITE: "Convite",
  DIALOGO_COMPETITIVO: "Diálogo Competitivo",
  OUTROS: "Outros",
};

export const PAYMENT_TYPE_LABELS = {
  FIXED: "Fixo Mensal",
  VARIABLE: "Variável por Consumo",
  MIXED: "Misto",
};

export const PAYMENT_PERIODICITY_LABELS = {
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  ON_DEMAND: "Por Demanda",
};

export const CONTRACT_STATUS_LABELS = {
  ACTIVE: "Ativo",
  EXPIRED: "Encerrado",
};
```

## Verificação

- [ ] Cadastro de contrato com todos os campos funciona
- [ ] Validação de CNPJ funciona (rejeita inválidos)
- [ ] Máscara de CNPJ e moeda funcionam
- [ ] Campo estimatedMonthlyValue aparece/esconde conforme paymentType
- [ ] Edição carrega dados e salva alterações
- [ ] Exclusão com confirmação funciona
- [ ] Lista com busca, filtros e paginação funciona
- [ ] Badges de saldo e vigência na lista
- [ ] Ficha do contrato exibe todos os dados em accordion
- [ ] Barra de progresso com cor correta
- [ ] Empty states e loading states presentes
