---
description: "Implementa uma feature completa: schema → action → UI → teste"
argument-hint: "[nome-da-feature] ex: cadastro-contrato, registro-pagamento, login"
---

## Tarefa

Implementar a feature `$ARGUMENTS` seguindo o padrão do projeto.

## Checklist de Implementação

Para cada feature, seguir esta sequência:

### 1. Schema & Banco

- Verificar se o model Prisma já existe (consultar `prisma/schema.prisma`)
- Se necessário, criar/atualizar model e executar `npx prisma migrate dev --name <feature>`

### 2. Validação (Zod)

- Criar/atualizar schema Zod em `src/lib/validators/<entidade>.ts`
- Schema deve ser compartilhado entre frontend e backend
- Incluir mensagens de erro em pt-BR

### 3. Server Actions

- Criar/atualizar em `src/actions/<entidade>.ts`
- Usar Zod schema para validar input
- Usar `revalidatePath` após mutations
- Retornar `{ success: boolean, data?: T, error?: string }`
- Tratar erros de forma genérica (nunca expor stack trace)

### 4. Componentes UI

- Usar componentes shadcn/ui existentes
- Formulários com React Hook Form + zodResolver
- Implementar todos os estados: vazio, carregando, preenchido, erro, sucesso
- Toast (Sonner) para feedback de sucesso/erro
- Validação inline em tempo real

### 5. Página

- Server Component por padrão
- Client Component somente se necessário (formulários, interatividade)
- Integrar com Server Actions

### 6. Testes (se regra de negócio crítica)

- Criar teste em `tests/lib/`
- Cobrir: cálculos financeiros, validações, edge cases

## Referências

- Consultar `CLAUDE.md` para convenções e regras de negócio
- Consultar docs do PRD em `docs/PRD.md` se existir
- Consultar specs UX em `docs/UX-UI-Spec.md` se existir
