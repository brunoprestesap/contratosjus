---
description: "Onda 2 — Log de auditoria completo: registro automático de operações, tela com filtros, valor anterior/novo"
---

# Onda 2 — Log de Auditoria

## 1. Schema Prisma

Descomentar o model `AuditLog` no `prisma/schema.prisma`.
Adicionar a relação `auditLogs AuditLog[]` no model `User`.

```bash
npx prisma migrate dev --name add-audit-log
```

## 2. Função de Logging

Criar `src/lib/audit.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface AuditParams {
  entity: "Contract" | "Payment" | "Commitment" | "Additive" | "User";
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export async function logAudit(params: AuditParams) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      oldValue: params.oldValue ?? undefined,
      newValue: params.newValue ?? undefined,
    },
  });
}
```

**IMPORTANTE sobre oldValue/newValue:**

- Para CREATE: oldValue = null, newValue = dados criados
- Para UPDATE: oldValue = dados antes da edição, newValue = dados após (apenas campos alterados)
- Para DELETE: oldValue = dados excluídos, newValue = null
- Serializar Decimal como string para JSON
- NÃO logar senhas (passwordHash) — filtrar campos sensíveis

## 3. Integrar em TODAS as Server Actions

Atualizar TODAS as Server Actions existentes para chamar `logAudit` após mutations:

### `src/actions/contratos.ts`:

- `createContract`: logAudit({ entity: "Contract", action: "CREATE", newValue: contrato criado })
- `updateContract`: buscar dados antigos ANTES de atualizar, logAudit({ oldValue, newValue: apenas campos alterados })
- `deleteContract`: logAudit({ action: "DELETE", oldValue: contrato excluído })

### `src/actions/empenhos.ts`:

- `createCommitment`: logAudit CREATE
- `updateCommitment`: logAudit UPDATE com oldValue/newValue
- `deleteCommitment`: logAudit DELETE

### `src/actions/pagamentos.ts`:

- `createPayment`: logAudit CREATE
- `updatePayment`: logAudit UPDATE (especialmente importante — registra quem alterou valores financeiros)
- `deletePayment`: logAudit DELETE

### `src/actions/aditivos.ts`:

- `createAdditive`: logAudit CREATE (incluir nos newValue as alterações no contrato: globalValue antes/depois, endDate antes/depois)
- `updateAdditive`: logAudit UPDATE
- `deleteAdditive`: logAudit DELETE

### `src/actions/usuarios.ts`:

- `createUser`: logAudit CREATE (sem passwordHash no newValue!)
- `updateUser`: logAudit UPDATE (sem passwordHash!)
- `deleteUser` (desativar): logAudit UPDATE (status ACTIVE → BLOCKED)

## 4. Tela de Auditoria

Criar `src/app/(dashboard)/auditoria/page.tsx`:

- Título "Log de Auditoria"
- Filtros: Usuário (Select), Entidade (Select: Contrato/Pagamento/Empenho/Aditivo/Usuário), Período (DatePicker range), Ação (Select: Criação/Edição/Exclusão)
- Filtros via URL search params

Criar `src/components/auditoria/audit-table.tsx`:

- DataTable com colunas:
  | Data/Hora | Usuário | Entidade | Ação | Descrição |
- Data/Hora: formato "25/04/2026 14:32"
- Usuário: nome do usuário
- Entidade: "Contrato 012/2025", "Pagamento Mar/2026", "Empenho 2026NE000123"
- Ação: Badge (Criação=verde, Edição=amarelo, Exclusão=vermelho)
- Descrição: resumo legível. Ex: "Registrou pagamento Mar/2026 — R$ 35.000,00" ou "Editou valor NF: R$ 35.000 → R$ 34.500"
- Paginação: 50 por página
- Ordenação: mais recente primeiro

Criar `src/lib/audit-formatter.ts`:

```typescript
// formatAuditDescription(log: AuditLog): string
// Gera descrição legível em pt-BR a partir de entity, action, oldValue, newValue
// Ex: "Cadastrou contrato 012/2025"
// Ex: "Editou pagamento Mar/2026 — valor NF: R$ 35.000 → R$ 34.500"
// Ex: "Excluiu empenho 2026NE000123"
// Ex: "Registrou aditivo 1º TA — valor global: R$ 420.000 → R$ 840.000"
```

## 5. Seção de Histórico na Ficha do Contrato

Criar `src/components/contratos/historico-section.tsx`:

- Accordion item "Histórico / Auditoria"
- Timeline vertical (não tabela) com as últimas 20 operações do contrato
- Cada item: data/hora, usuário, descrição formatada
- Link "Ver histórico completo" → navega para `/auditoria?entity=Contract&entityId=[id]`

## 6. Sidebar

Adicionar item "Auditoria" na sidebar (visível apenas para perfil Fiscal):

```
🕐  Auditoria
```

## Verificação

- [ ] Toda mutation (criar, editar, excluir) gera registro no AuditLog
- [ ] oldValue e newValue registrados corretamente (sem senhas!)
- [ ] Tela de auditoria com filtros funciona
- [ ] Descrições legíveis em pt-BR
- [ ] Paginação (50 por página)
- [ ] Seção de Histórico na ficha do contrato
- [ ] Sidebar mostra "Auditoria" apenas para Fiscal
