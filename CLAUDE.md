# Sistema de Gestão e Controle de Desembolso de Contratos — JFAP/NUTEC

Aplicação web interna para fiscal de contratos do Judiciário Federal (Amapá). Controle de desembolso de contratos de prestação de serviços conforme Leis 14.133/2021 e 8.666/1993. Registro de contratos, empenhos, pagamentos mensais (ateste → liquidação → pagamento) e aditivos, com cálculo automático de saldo contratual.

## Stack

- Next.js 16 (App Router, Server Components, Server Actions)
- TypeScript strict mode
- TailwindCSS + shadcn/ui
- PostgreSQL + Prisma ORM
- NextAuth (Auth.js v5) com credentials provider
- Zod (validação compartilhada frontend/backend)
- React Hook Form + Zod resolver
- Vitest (testes unitários)
- Docker + Docker Compose

## Comandos

- `docker compose up -d` — Sobe PostgreSQL (app roda via `npm run dev` no host)
- `npm run dev` — Dev server (localhost:3000)
- `npm run build` — Build de produção
- `npm run db:migrate` — Criar/aplicar migrations em dev
- `npm run db:seed` — Seed de dados iniciais
- `npm run db:studio` — Interface visual do banco
- `npx vitest` — Rodar testes
- `npx vitest run` — Testes sem watch

## Estrutura de Diretórios

- `src/app/(auth)/` — Login (rota pública)
- `src/app/(dashboard)/` — Rotas protegidas com layout (sidebar + header)
- `src/app/(dashboard)/contratos/` — CRUD de contratos
- `src/app/(dashboard)/pagamentos/` — Visão transversal (Onda 3)
- `src/app/(dashboard)/relatorios/` — Relatórios PDF (Onda 3)
- `src/app/(dashboard)/usuarios/` — Gestão de usuários
- `src/app/(dashboard)/auditoria/` — Log de auditoria (Onda 2)
- `src/components/ui/` — Componentes shadcn/ui
- `src/components/layout/` — Sidebar, Header, AlertDropdown
- `src/components/contratos/` — Componentes da ficha do contrato
- `src/lib/` — Prisma client, auth config, utils, validators (Zod schemas)
- `src/actions/` — Server Actions (contratos, pagamentos, empenhos, usuarios)
- `src/types/` — Types compartilhados
- `prisma/` — Schema, migrations, seed
- `tests/` — Testes unitários (Vitest)

## Convenções

- Idioma do código: variáveis e funções em inglês, labels/textos da UI em pt-BR
- Moeda formatada como pt-BR: `R$ 35.000,00`
- Datas formatadas como DD/MM/AAAA
- CNPJ com máscara: XX.XXX.XXX/XXXX-XX
- Usar Server Components por padrão; Client Components apenas para interatividade
- Server Actions para mutations (criar, editar, excluir)
- Zod schemas compartilhados entre frontend (React Hook Form) e backend (Server Actions)
- Formulários sempre com React Hook Form + zodResolver
- Componentes shadcn/ui sempre que disponível — não reinventar
- `revalidatePath` após mutations para atualizar dados
- Imports absolutos com `@/` (ex: `@/lib/prisma`, `@/components/ui/button`)
- Um componente por arquivo
- Nomear arquivos em kebab-case: `contrato-form.tsx`, `pagamentos-section.tsx`

## Regras de Negócio Críticas

- Saldo contratual = valor global − total pago (recalcular a cada pagamento)
- Saldo de empenho = soma empenhos − soma liquidações
- Pagamento mensal tem preenchimento parcial: mínimo = ateste; liquidação e pagamento são opcionais
- Status automático: Pendente → Atestado → Liquidado → Pago (baseado em campos preenchidos)
- BLOQUEAR: pagamento em contrato encerrado/expirado
- BLOQUEAR: data liquidação < data ateste, ou data pagamento < data liquidação
- ALERTAR (não bloquear): total pago + empenhado > valor global
- ALERTAR: mês sem registro em contrato com pagamento fixo mensal
- Aditivos recalculam automaticamente valor global e/ou vigência

## Segurança (obrigatório desde o dia 1)

- Senhas: mínimo 12 chars, maiúsculas + minúsculas + números + especiais
- Hash com bcrypt (custo 12)
- Bloqueio após 5 tentativas inválidas de login
- Timeout de sessão: 30 minutos de inatividade
- HTTPS obrigatório em produção
- Dois perfis: Fiscal (admin/CRUD) e Diretor (somente leitura)
- Middleware protege todas as rotas exceto /login

## Ondas de Entrega

- **Onda 1 (MVP v0.1):** Auth, Usuários, Contratos, Empenhos, Pagamentos, Validações
- **Onda 2 (v0.2):** Aditivos, Alertas (sininho), Log de Auditoria
- **Onda 3 (v0.3):** Dashboard, Relatórios PDF, Pagamentos transversal

## Cuidados

- Não implementar funcionalidades de ondas futuras sem pedir confirmação
- Testes unitários obrigatórios para: cálculo de saldo, validações RF-09, política de senha
- Nunca expor stack traces ao cliente
- Nunca commitar .env — usar .env.example como template
- PostgreSQL roda em container Docker — não instalar localmente
- Volume `pgdata` é persistente — não destruir sem aviso
