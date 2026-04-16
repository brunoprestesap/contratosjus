# Convenções de Código

- Sempre usar TypeScript strict mode — nunca `any`, nunca `@ts-ignore`
- Server Components por padrão. Adicionar "use client" SOMENTE quando necessário (useState, useEffect, event handlers, React Hook Form)
- Server Actions para todas as mutations. Nunca criar API routes REST para CRUD
- Retorno padrão de Server Actions: `{ success: boolean; data?: T; error?: string }`
- Zod schemas em `src/lib/validators/` — compartilhados entre frontend e backend
- Imports absolutos com `@/` — nunca imports relativos (`../../`)
- Um componente por arquivo, nomeado em kebab-case
- Componentes shadcn/ui para tudo que estiver disponível — não criar componentes custom quando existe equivalente
- Formatação pt-BR: moeda `R$ 35.000,00`, datas `DD/MM/AAAA`, CNPJ `XX.XXX.XXX/XXXX-XX`
- Variáveis e funções em inglês, textos da UI em português do Brasil
- Decimal do Prisma para valores financeiros — NUNCA Float ou number sem conversão
- `revalidatePath` após toda mutation em Server Action
- Tratamento de erro em todo Server Action com try/catch — nunca expor stack trace
