---
description: "Onda 2 — Aditivos contratuais: 5 tipos, modal de confirmação antes/depois, recálculo automático"
---

# Onda 2 — Aditivos Contratuais

## Pré-requisito
Onda 1 completa e em produção.

## 1. Schema Prisma

Descomentar o model `Additive` no `prisma/schema.prisma` (já preparado no schema da Onda 1).
Adicionar a relação `additives Additive[]` no model `Contract`.

```bash
npx prisma migrate dev --name add-additives
```

## 2. Zod Schema

Criar `src/lib/validators/aditivo.ts`:
```typescript
// additiveSchema:
//   additiveNumber: string (obrigatório, ex: "1º TA")
//   type: enum TERM | VALUE | MIXED | READJUSTMENT | APOSTILAMENTO
//   signatureDate: date (obrigatório)
//   newGlobalValue: decimal (condicional — obrigatório se type envolve valor)
//   newMonthlyValue: decimal (opcional)
//   newEndDate: date (condicional — obrigatório se type envolve prazo)
//   justification: string (obrigatório)
```

Campos condicionais por tipo:
- TERM: newEndDate obrigatório, valores opcionais
- VALUE: newGlobalValue obrigatório, datas opcionais
- MIXED: newEndDate + newGlobalValue obrigatórios
- READJUSTMENT: newMonthlyValue obrigatório, newGlobalValue opcional
- APOSTILAMENTO: todos opcionais (pode alterar dotação, etc.)

## 3. Server Actions

Criar `src/actions/aditivos.ts`:
- `createAdditive(contractId, data)`:
  1. Validar com Zod
  2. Criar o registro do aditivo
  3. Atualizar o contrato:
     - Se newGlobalValue → atualizar `contract.globalValue`
     - Se newEndDate → atualizar `contract.endDate`
     - Se newMonthlyValue → atualizar `contract.estimatedMonthlyValue`
  4. Recalcular status do contrato (se nova endDate > hoje → ACTIVE)
  5. revalidatePath
- `updateAdditive(id, data)` — Editar (recalcular contrato)
- `deleteAdditive(id)` — Excluir (reverter alterações no contrato? Ou apenas excluir registro?)
- `listAdditives(contractId)` — Listar por contrato

Criar `src/lib/additive-preview.ts`:
```typescript
// generateAdditivePreview(contract, additiveData):
//   Retorna { before: { globalValue, endDate, monthlyValue }, after: { globalValue, endDate, monthlyValue } }
//   Usado no modal de confirmação
```

## 4. Constantes

Adicionar em `src/lib/constants.ts`:
```typescript
export const ADDITIVE_TYPE_LABELS = {
  TERM: "Aditivo de Prazo",
  VALUE: "Aditivo de Valor",
  MIXED: "Aditivo Misto (Prazo + Valor)",
  READJUSTMENT: "Reajuste / Repactuação",
  APOSTILAMENTO: "Apostilamento",
}
```

## 5. Seção de Aditivos (Ficha do Contrato)

Criar `src/components/contratos/aditivos-section.tsx`:
- Accordion item com título "Aditivos" + botão [+ Registrar Aditivo]
- Tabela: Nº TA, Tipo, Data Assinatura, Efeito (resumo textual), Ações
- Coluna "Efeito": texto como "+R$ 100k +6 meses" ou "Prorrogação até 31/12/2027"
- Ordenação cronológica (mais recente primeiro)
- Empty state: "Nenhum aditivo registrado"

Criar `src/components/contratos/aditivo-form-modal.tsx`:
- Dialog com formulário
- Campos que aparecem/escondem conforme o tipo selecionado
- Ao clicar Salvar → NÃO salva ainda → abre modal de confirmação

Criar `src/components/contratos/aditivo-confirmacao-modal.tsx`:
- Dialog de confirmação com comparativo antes/depois:
  ```
  Tipo: Aditivo Misto (Prazo + Valor)
  
  Vigência:
    Antes: 31/12/2026
    Depois: 31/12/2027
  
  Valor Global:
    Antes: R$ 420.000,00
    Depois: R$ 840.000,00
  ```
- Botões: [Cancelar] (volta ao formulário) + [Confirmar e Salvar]
- Ao confirmar: executa Server Action, toast de sucesso, fecha modais

## 6. Atualizar Ficha do Contrato

- Adicionar seção de Aditivos no accordion (entre Pagamentos e Histórico)
- Card resumo: saldo e vigência devem refletir o último aditivo aplicado

## Verificação

- [ ] Cadastro de aditivo dos 5 tipos funciona
- [ ] Campos condicionais aparecem/escondem por tipo
- [ ] Modal de confirmação mostra antes/depois corretamente
- [ ] Valor global do contrato atualizado após aditivo de valor
- [ ] Vigência do contrato atualizada após aditivo de prazo
- [ ] Saldo recalculado corretamente após aditivo
- [ ] Tabela de aditivos na ficha do contrato
