# 📋 Plano de Desenvolvimento do MVP

## Sistema de Gestão e Controle de Desembolso de Contratos — JFAP/NUTEC

| Campo                        | Valor                                        |
| ---------------------------- | -------------------------------------------- |
| **Versão**                   | 1.0                                          |
| **Data**                     | 16 de abril de 2026                          |
| **Documentos de Referência** | PRD v1.0, UX/UI Spec v1.0, Conceito MVP v1.0 |
| **Metodologia**              | Lean MVP — Entrega incremental em 3 ondas    |
| **Status**                   | Aprovado para execução                       |

---

## 1. Objetivo & Hipótese

### 1.1 Hipótese Central (do Conceito MVP)

> **"Se o fiscal de contratos do NUTEC/JFAP tiver uma aplicação estruturada para registrar contratos, empenhos e pagamentos mensais (com validações de integridade), ele terá visibilidade do saldo contratual em tempo real, eliminando o risco de estouro de valor global e de vencimento de vigência por esquecimento."**

### 1.2 Objetivo do Plano

Entregar a **Onda 1 (MVP v0.1)** em produção no menor prazo possível, seguida das Ondas 2 e 3 em ciclos curtos de 2-3 semanas cada. O plano operacionaliza o Conceito MVP em tarefas sequenciais com dependências claras, estimativas de esforço e critérios de aceite.

### 1.3 Critério de Validação da Hipótese

Após **30 dias de uso real** da Onda 1:

- 100% dos contratos ativos cadastrados.
- 100% dos pagamentos mensais registrados em até 5 dias após o ateste.
- Zero quebras de ordem cronológica (bloqueadas pela aplicação).
- Fiscal consegue informar saldo de qualquer contrato em < 30 segundos.

---

## 2. Público-Alvo

| Perfil                                              | Onda   | Papel                                                      |
| --------------------------------------------------- | ------ | ---------------------------------------------------------- |
| **Fiscal de Contratos** (desenvolvedor/solicitante) | Onda 1 | Usuário principal, operação diária, CRUD completo          |
| **Diretor do NUTEC**                                | Onda 3 | Usuário gerencial, somente leitura, dashboard e relatórios |

---

## 3. Funcionalidades Essenciais (In vs Out)

### 3.1 IN — Onda 1 (MVP v0.1)

| ID     | Funcionalidade                                                            | Ref. PRD |
| ------ | ------------------------------------------------------------------------- | -------- |
| MVP-01 | Autenticação local completa (senha forte, bloqueio, timeout, bcrypt)      | RF-07    |
| MVP-02 | Gestão de usuários (CRUD + perfis Fiscal/Diretor)                         | RF-07    |
| MVP-03 | Cadastro de contratos (CRUD, todos os campos do PRD)                      | RF-01    |
| MVP-04 | Lista de contratos (busca, filtros, paginação, badges visuais)            | RF-01    |
| MVP-05 | Ficha do contrato (página com accordion, cabeçalho resumo com saldo)      | RF-01    |
| MVP-06 | Registro de empenhos (múltiplos por exercício, saldo disponível)          | RF-02    |
| MVP-07 | Registro de pagamentos mensais (preenchimento parcial, status automático) | RF-02    |
| MVP-08 | Cálculo automático de saldo contratual + barra de progresso               | RF-02    |
| MVP-09 | 4 regras de validação                                                     | RF-09    |

### 3.2 IN — Onda 2 (v0.2)

| ID     | Funcionalidade                                                          | Ref. PRD |
| ------ | ----------------------------------------------------------------------- | -------- |
| V02-01 | Aditivos contratuais (5 tipos, modal confirmação, recálculo automático) | RF-03    |
| V02-02 | Alertas — sininho com badge e dropdown                                  | RF-05    |
| V02-03 | Log de auditoria completo                                               | RF-08    |

### 3.3 IN — Onda 3 (v0.3)

| ID     | Funcionalidade                                        | Ref. PRD |
| ------ | ----------------------------------------------------- | -------- |
| V03-01 | Dashboard gerencial (7 indicadores, filtro exercício) | RF-04    |
| V03-02 | Relatórios em PDF (3 tipos, 2 caminhos)               | RF-06    |
| V03-03 | Visão transversal de pagamentos                       | RF-02    |

### 3.4 OUT — Explicitamente fora de todas as ondas

Integração SIAFI/Siscontratos, upload de documentos, responsividade mobile, acessibilidade (eMAG/WCAG), controle por itens do contrato, memória de cálculo detalhada, perfil Gestor, multi-tenant.

---

## 4. Stack Tecnológico

### 4.1 Stack Definido

| Camada                | Tecnologia                       | Versão/Detalhes                                    |
| --------------------- | -------------------------------- | -------------------------------------------------- |
| **Framework**         | Next.js                          | 16 (App Router, Server Components, Server Actions) |
| **Linguagem**         | TypeScript                       | Strict mode                                        |
| **Estilização**       | TailwindCSS + shadcn/ui          | Componentes pré-construídos, tema padrão           |
| **Banco de dados**    | PostgreSQL                       | Última versão estável                              |
| **ORM**               | Prisma                           | Migrations, Prisma Studio, type-safe queries       |
| **Autenticação**      | NextAuth (Auth.js v5)            | Credentials provider                               |
| **Validação**         | Zod                              | Schemas compartilhados (frontend + backend)        |
| **Formulários**       | React Hook Form                  | Integração com Zod e shadcn/ui Form                |
| **Gráficos** (Onda 3) | Recharts                         | Dashboard                                          |
| **PDF** (Onda 3)      | @react-pdf/renderer ou Puppeteer | Geração server-side                                |
| **Containerização**   | Docker + Docker Compose          | App + PostgreSQL                                   |
| **HTTPS**             | Let's Encrypt                    | Certificado gratuito, renovação automática         |
| **Testes**            | Vitest                           | Testes unitários para regras de negócio            |

### 4.2 Justificativa das Escolhas

| Decisão                                | Justificativa                                                                                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma** sobre Drizzle               | Migrations automáticas, Prisma Studio para debug visual, tipagem forte, ampla documentação. Trade-off: levemente mais verboso e queries menos otimizadas, aceitável para ~20 contratos. |
| **Server Components + Server Actions** | Reduz complexidade: sem API REST separada, sem gerenciamento de estado client-side para dados do servidor. Mutations via Server Actions com revalidação.                                |
| **Zod compartilhado**                  | Mesmo schema de validação no frontend (React Hook Form) e backend (Server Actions). Evita duplicação e garante consistência.                                                            |
| **Vitest** (não Jest)                  | Mais rápido, compatível nativo com ESM/TypeScript, integração natural com Vite/Next.js.                                                                                                 |
| **Let's Encrypt**                      | Gratuito, automação de renovação via Certbot, padrão para servidores on-premise.                                                                                                        |

### 4.3 Estrutura do Projeto

```
projeto/
├── docker-compose.yml
├── Dockerfile
├── .env.local                          → Variáveis de ambiente (dev)
├── .env.production                     → Variáveis de ambiente (prod)
│
├── prisma/
│   ├── schema.prisma                   → Schema do banco
│   ├── migrations/                     → Migrations automáticas
│   └── seed.ts                         → Seed: usuários iniciais
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              → Sidebar + Header
│   │   │   ├── page.tsx                → Landing (Contratos na Onda 1, Dashboard na Onda 3)
│   │   │   │
│   │   │   ├── contratos/
│   │   │   │   ├── page.tsx            → Lista
│   │   │   │   ├── novo/page.tsx       → Cadastro
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        → Ficha
│   │   │   │       └── editar/page.tsx → Edição
│   │   │   │
│   │   │   ├── pagamentos/             → Onda 3
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── relatorios/             → Onda 3
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── usuarios/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/editar/page.tsx
│   │   │   │
│   │   │   └── auditoria/              → Onda 2
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx                  → Root layout
│   │   └── globals.css                 → TailwindCSS + shadcn/ui theme
│   │
│   ├── components/
│   │   ├── ui/                         → Componentes shadcn/ui
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── alert-dropdown.tsx      → Onda 2
│   │   ├── contratos/
│   │   │   ├── contrato-form.tsx
│   │   │   ├── contrato-card-resumo.tsx
│   │   │   ├── contrato-sections.tsx   → Accordion sections
│   │   │   ├── empenhos-section.tsx
│   │   │   ├── pagamentos-section.tsx
│   │   │   ├── aditivos-section.tsx    → Onda 2
│   │   │   └── historico-section.tsx   → Onda 2
│   │   ├── dashboard/                  → Onda 3
│   │   └── usuarios/
│   │       └── usuario-form.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                   → Instância singleton do Prisma Client
│   │   ├── auth.ts                     → Configuração NextAuth
│   │   ├── utils.ts                    → Funções utilitárias (formatação, cálculos)
│   │   ├── validators/
│   │   │   ├── contrato.ts             → Zod schemas de contrato
│   │   │   ├── pagamento.ts            → Zod schemas de pagamento
│   │   │   ├── empenho.ts              → Zod schemas de empenho
│   │   │   └── usuario.ts              → Zod schemas de usuário
│   │   └── constants.ts                → Enums, labels, opções de select
│   │
│   ├── actions/
│   │   ├── contratos.ts                → Server Actions de contratos
│   │   ├── pagamentos.ts               → Server Actions de pagamentos
│   │   ├── empenhos.ts                 → Server Actions de empenhos
│   │   ├── usuarios.ts                 → Server Actions de usuários
│   │   └── auth.ts                     → Server Actions de login/logout
│   │
│   ├── types/
│   │   └── index.ts                    → Types compartilhados
│   │
│   └── middleware.ts                   → Proteção de rotas (auth + perfil)
│
├── tests/
│   ├── lib/
│   │   ├── calculo-saldo.test.ts       → Testes de cálculo de saldo
│   │   ├── validacoes.test.ts          → Testes das 4 regras RF-09
│   │   └── senha.test.ts              → Testes de política de senha
│   └── vitest.config.ts
│
└── public/
    └── logo.svg                        → Logo NUTEC/JFAP
```

---

## 5. Fases de Desenvolvimento / Roadmap

### 5.1 Visão Geral

```
SEMANA       1         2         3         4         5         6         7         8
         ┌─────────────────────────────┐
         │      ONDA 1 (MVP v0.1)     │
         │      10-15 dias úteis      │
         ├─────────────────────────────┤
         │ F0 │ F1  │  F2   │ F3 │ F4 │
         └─────────────────────────────┘
                                        ┌───────────────────┐
                                        │   ONDA 2 (v0.2)   │
                                        │   8-10 dias úteis  │
                                        └───────────────────┘
                                                              ┌───────────────────┐
                                                              │   ONDA 3 (v0.3)   │
                                                              │   8-10 dias úteis  │
                                                              └───────────────────┘

F0 = Setup  |  F1 = Auth  |  F2 = Contratos  |  F3 = Financeiro  |  F4 = Validações + Polish
```

### 5.2 Onda 1 — MVP v0.1 (10-15 dias úteis)

#### Fase 0: Setup do Projeto (1-2 dias)

| Tarefa                                                   | Estimativa | Entregável                                             |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| Criar repositório Git                                    | 0.5h       | Repo inicializado                                      |
| Configurar Docker Compose (Next.js + PostgreSQL)         | 2h         | `docker-compose.yml` + `Dockerfile` funcionais         |
| Inicializar Next.js 16 + TypeScript                      | 1h         | Projeto rodando em `localhost:3000`                    |
| Instalar e configurar TailwindCSS + shadcn/ui            | 1h         | Tema padrão aplicado, componente teste renderizado     |
| Configurar Prisma + conexão PostgreSQL                   | 1h         | `prisma init`, conexão testada                         |
| Criar schema Prisma inicial (todas as tabelas da Onda 1) | 3h         | Schema com models: User, Contract, Commitment, Payment |
| Executar primeira migration                              | 0.5h       | Banco criado com tabelas                               |
| Criar seed script (2 usuários iniciais)                  | 1h         | `prisma db seed` funcional                             |
| Configurar Vitest                                        | 1h         | Teste placeholder passando                             |
| Configurar variáveis de ambiente (.env.local)            | 0.5h       | `.env.local` com DATABASE_URL, NEXTAUTH_SECRET, etc.   |

**Critério de aceite da Fase 0:**

- `docker compose up` sobe a aplicação + banco.
- `npx prisma studio` mostra as tabelas criadas.
- Página inicial do Next.js renderiza com shadcn/ui.

#### Fase 1: Autenticação + Usuários (2-3 dias)

| Tarefa                                                        | Estimativa | Entregável                                                       |
| ------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| Configurar NextAuth (Auth.js v5) com credentials provider     | 3h         | Login funcional com email/senha                                  |
| Implementar hash de senha com bcrypt (registro e verificação) | 1h         | Senhas hasheadas no banco                                        |
| Implementar política de senha forte (Zod schema)              | 1h         | Validação: 12+ chars, maiúsculas, minúsculas, números, especiais |
| Implementar bloqueio após 5 tentativas inválidas              | 2h         | Campo `failedAttempts` + `lockedUntil` no model User             |
| Implementar timeout de sessão (30 min inatividade)            | 1h         | Sessão expira e redireciona para login                           |
| Criar middleware de proteção de rotas                         | 2h         | Rotas protegidas, redirecionamento para login                    |
| Criar middleware de autorização por perfil                    | 1h         | Fiscal vê tudo, Diretor vê somente leitura                       |
| Tela de login (shadcn/ui: Card, Input, Button, Form)          | 2h         | Tela conforme UX Spec 3.1                                        |
| Tela de lista de usuários                                     | 2h         | Tabela com nome, email, perfil, status, ações                    |
| Página de cadastro de usuário                                 | 2h         | Formulário com validação Zod                                     |
| Página de edição de usuário                                   | 1h         | Reuso do formulário de cadastro                                  |
| Layout principal (sidebar + header)                           | 2h         | Sidebar simplificada (Contratos, Usuários)                       |
| Testes unitários: política de senha, hash                     | 1h         | Testes passando                                                  |

**Critério de aceite da Fase 1:**

- Login funcional com todas as regras de segurança.
- Bloqueio após 5 tentativas (testável manualmente).
- Sessão expira após 30 min.
- CRUD de usuários funcional.
- Sidebar renderiza itens corretos por perfil.

#### Fase 2: Contratos (3-4 dias)

| Tarefa                                                                  | Estimativa | Entregável                                            |
| ----------------------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Server Actions: criar, editar, excluir, listar contratos                | 3h         | CRUD funcional no backend                             |
| Zod schemas de contrato (todos os campos do PRD)                        | 1h         | Validação compartilhada frontend/backend              |
| Formulário de cadastro (página única, seções visuais)                   | 4h         | Formulário conforme UX Spec Fluxo 2.2                 |
| Máscara de CNPJ + validação                                             | 1h         | Input com máscara XX.XXX.XXX/XXXX-XX                  |
| Inputs de moeda (R$ formato pt-BR)                                      | 1h         | Currency input funcional                              |
| Campos condicionais (valor mensal visível se tipo = fixo/misto)         | 0.5h       | Show/hide baseado em select                           |
| Página de edição (reuso do formulário)                                  | 1h         | Formulário preenchido com dados existentes            |
| Lista de contratos com DataTable                                        | 3h         | Busca, filtros, paginação, sorting                    |
| Badges visuais (saldo verde/amarelo/vermelho, vigência)                 | 1h         | Badges conforme UX Spec A.3 e A.4                     |
| Ficha do contrato — cabeçalho resumo                                    | 2h         | Fornecedor, objeto, status, saldo, barra de progresso |
| Ficha do contrato — seções accordion (Dados, Vigência, Dotação, Gestão) | 2h         | 4 seções colapsáveis com dados do contrato            |
| Dialog de confirmação para exclusão                                     | 0.5h       | Modal destrutivo conforme UX Spec 4.3                 |
| Empty states e loading states                                           | 1h         | Skeleton rows, mensagem "nenhum contrato"             |

**Critério de aceite da Fase 2:**

- CRUD completo de contratos testável pela UI.
- Lista com busca, filtros e paginação funcionais.
- Ficha do contrato exibindo todos os dados com accordion.
- Validação de CNPJ e campos obrigatórios.

#### Fase 3: Financeiro — Empenhos + Pagamentos (3-4 dias)

| Tarefa                                                            | Estimativa | Entregável                         |
| ----------------------------------------------------------------- | ---------- | ---------------------------------- |
| **Empenhos:**                                                     |            |                                    |
| Server Actions: CRUD de empenhos                                  | 1.5h       | Vinculado ao contrato              |
| Seção de empenhos na ficha (accordion + tabela + modal)           | 2h         | Conforme UX Spec 3.4               |
| Cálculo de saldo disponível de empenhos                           | 1h         | Soma empenhos − soma liquidações   |
| Tipo de empenho (inicial / reforço)                               | 0.5h       | Select no formulário               |
| **Pagamentos:**                                                   |            |                                    |
| Server Actions: CRUD de pagamentos                                | 2h         | Registro com preenchimento parcial |
| Formulário de registro (modal ou seção expandida)                 | 3h         | Conforme UX Spec Fluxo 2.3         |
| Lógica de preenchimento parcial (ateste → liquidação → pagamento) | 1h         | Campos opcionais, mínimo = ateste  |
| Status automático calculado (Pendente/Atestado/Liquidado/Pago)    | 1h         | Baseado em campos preenchidos      |
| Tabela de pagamentos na ficha (checkmarks + datas)                | 2h         | Conforme UX Spec 3.4               |
| **Saldo contratual:**                                             |            |                                    |
| Cálculo automático: valor global − total pago                     | 1h         | Recalculado a cada pagamento       |
| Barra de progresso no cabeçalho (verde/amarelo/vermelho)          | 0.5h       | Progress component shadcn/ui       |
| Atualização do saldo na lista de contratos                        | 0.5h       | Badge % atualizado                 |
| Testes unitários: cálculo de saldo, status automático             | 1.5h       | Testes passando                    |

**Critério de aceite da Fase 3:**

- Empenhos: CRUD funcional, saldo disponível calculado.
- Pagamentos: registro parcial funcional, status calculado corretamente.
- Saldo contratual atualizado em tempo real na ficha e na lista.
- Barra de progresso com cores corretas.

#### Fase 4: Validações + Polish (1-2 dias)

| Tarefa                                                                | Estimativa | Entregável                               |
| --------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| Regra 1: bloquear pagamento em contrato expirado                      | 1h         | Erro ao tentar registrar                 |
| Regra 2: alertar se total pago + empenhado > valor global             | 1h         | Alert inline (warning) no formulário     |
| Regra 3: bloquear ordem cronológica (ateste → liquidação → pagamento) | 1h         | Validação de datas                       |
| Regra 4: alertar mês sem registro em contrato fixo mensal             | 2h         | Indicador visual na tabela de pagamentos |
| Testes unitários: 4 regras de validação                               | 1.5h       | Testes passando                          |
| Revisão geral de UI: consistência, espaçamentos, estados              | 2h         | Visual polido                            |
| Testes manuais end-to-end (fluxo completo)                            | 2h         | Checklist do Go/No-Go da Onda 1          |
| Configurar HTTPS (Let's Encrypt + Certbot)                            | 1h         | Certificado instalado                    |
| Deploy no servidor da JFAP                                            | 1h         | Aplicação acessível via HTTPS            |
| Seed de dados reais (contratos da unidade)                            | 1h         | Dados iniciais populados                 |

**Critério de aceite da Fase 4 (= Go/No-Go da Onda 1):**

- Checklist completo do Conceito MVP, Seção 8, Onda 1.

### 5.3 Onda 2 — v0.2 (8-10 dias úteis)

| Fase                 | Tarefas principais                                                                                                                              | Estimativa |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Aditivos**         | Model Prisma, Server Actions, formulário, 5 tipos, modal confirmação antes/depois, recálculo automático de valor global e vigência              | 3-4 dias   |
| **Alertas**          | Lógica de cálculo de alertas (vigência, saldo, pagamento pendente), componente sininho no header, dropdown com Popover, navegação para contrato | 2-3 dias   |
| **Log de auditoria** | Model Prisma (AuditLog), interceptor/middleware para captura automática de operações, tela de auditoria com DataTable e filtros                 | 2-3 dias   |
| **Polish + Deploy**  | Testes, revisão, deploy                                                                                                                         | 1 dia      |

### 5.4 Onda 3 — v0.3 (8-10 dias úteis)

| Fase                       | Tarefas principais                                                                                                                          | Estimativa |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Dashboard**              | 7 indicadores, summary cards, gráficos Recharts (barras empilhadas, linha/barras), listas de alerta clicáveis, ranking, filtro de exercício | 4-5 dias   |
| **Relatórios PDF**         | Configuração da lib de PDF, 3 templates (extrato, desembolso, vigentes), tela de relatórios, botão exportar na ficha                        | 2-3 dias   |
| **Pagamentos transversal** | Tela com DataTable, filtros por contrato/período/status                                                                                     | 1 dia      |
| **Ajustes finais**         | Landing page → Dashboard, sidebar completa, perfil Diretor testado, polish                                                                  | 1 dia      |

---

## 6. Estratégia de Testes

### 6.1 Abordagem: Testes Mínimos para Regras Críticas

Dado o contexto (dev solo, prazo imediato), a estratégia é **proteger o que pode quebrar silenciosamente** — cálculos financeiros e validações de integridade.

| Categoria            | Ferramenta | Escopo                                                                                                                                                        | Onda   |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Testes unitários** | Vitest     | Cálculo de saldo contratual, cálculo de saldo de empenho, status automático de pagamento, 4 regras de validação (RF-09), política de senha, validação de CNPJ | Onda 1 |
| **Testes unitários** | Vitest     | Recálculo pós-aditivo (valor global, vigência), lógica de alertas (thresholds)                                                                                | Onda 2 |
| **Testes manuais**   | Checklist  | Fluxo completo (login → cadastro → pagamento → saldo) antes de cada deploy                                                                                    | Todas  |

### 6.2 O que NÃO será testado automaticamente no MVP

- Testes de integração (banco real).
- Testes E2E (Playwright/Cypress).
- Testes de UI/componentes.
- Testes de performance/carga (volume desprezível).

Esses podem ser adicionados pós-MVP se necessário.

### 6.3 Checklist de Teste Manual (Pré-Deploy)

**Onda 1:**

- [ ] Login com credenciais corretas → sucesso.
- [ ] Login com credenciais erradas 5x → conta bloqueada.
- [ ] Sessão expira após 30 min inatividade.
- [ ] Cadastro de contrato com todos os campos → salvo corretamente.
- [ ] Edição de contrato → dados atualizados.
- [ ] Exclusão de contrato → removido com confirmação.
- [ ] Busca e filtros na lista de contratos.
- [ ] Registro de empenho → saldo disponível atualizado.
- [ ] Registro de pagamento (só ateste) → status "Atestado".
- [ ] Complementar liquidação → status "Liquidado".
- [ ] Complementar pagamento → status "Pago", saldo contratual atualizado.
- [ ] Tentar pagamento em contrato expirado → bloqueado.
- [ ] Tentar liquidação com data anterior ao ateste → bloqueado.
- [ ] Registrar valor que estoura o global → alerta exibido.
- [ ] Sidebar mostra itens corretos por perfil (Fiscal vs Diretor).

---

## 7. Deploy / Lançamento

### 7.1 Ambientes

| Ambiente                  | Localização                    | Propósito                              |
| ------------------------- | ------------------------------ | -------------------------------------- |
| **Desenvolvimento (dev)** | Máquina local do desenvolvedor | Desenvolvimento ativo, iteração rápida |
| **Produção (prod)**       | Servidor interno da JFAP       | Uso real pelo fiscal e diretor         |

### 7.2 Infraestrutura de Produção

```
Servidor JFAP (Linux)
│
├── Docker Compose
│   ├── Container: app (Next.js 16)
│   │   ├── Port: 3000 (interno)
│   │   ├── Env: .env.production
│   │   └── Volumes: (nenhum — app stateless)
│   │
│   ├── Container: db (PostgreSQL)
│   │   ├── Port: 5432 (interno, não exposto)
│   │   ├── Volume: pgdata (persistente)
│   │   └── Env: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
│   │
│   └── Container: nginx (reverse proxy) — opcional
│       ├── Port: 443 (HTTPS) → proxy para app:3000
│       ├── Certificado: Let's Encrypt (Certbot)
│       └── Renovação automática via cron
│
└── Backup
    └── pg_dump diário via cron → armazenamento local
```

### 7.3 Processo de Deploy

```
[Dev local] → git push → [Servidor JFAP]
                              │
                              ├── git pull
                              ├── docker compose build
                              ├── docker compose up -d
                              ├── npx prisma migrate deploy
                              └── Verificação manual (smoke test)
```

**Nota:** Sem CI/CD automatizado no MVP. Deploy manual via SSH + Git. Pode ser automatizado futuramente.

### 7.4 Estratégia de Backup

| Item                      | Estratégia                                                      |
| ------------------------- | --------------------------------------------------------------- |
| **Banco de dados**        | `pg_dump` diário automatizado via cron job. Retenção: 30 dias.  |
| **Código**                | Repositório Git (local + remoto se disponível).                 |
| **Variáveis de ambiente** | Arquivo `.env.production` com backup separado (não versionado). |

### 7.5 Pré-Requisitos de Deploy (Ação Necessária)

| Item                     | Status          | Ação                                                                      |
| ------------------------ | --------------- | ------------------------------------------------------------------------- |
| Servidor on-premise      | **A solicitar** | Solicitar provisão de servidor Linux com Docker à equipe de infra da JFAP |
| Acesso SSH ao servidor   | A solicitar     | Solicitar credenciais                                                     |
| Porta 443 liberada       | A solicitar     | Solicitar abertura de porta para HTTPS                                    |
| Domínio/hostname interno | A definir       | Definir URL interna (ex.: `contratos.jfap.local`)                         |
| DNS interno              | A configurar    | Apontar hostname para IP do servidor                                      |

> **Risco:** A solicitação do servidor é uma **dependência externa** que pode atrasar o deploy. Recomenda-se iniciar a solicitação **imediatamente**, em paralelo com o desenvolvimento.

---

## 8. Métricas de Sucesso

### 8.1 Onda 1 — Validação em 30 dias

| Métrica                    | Alvo                             | Medição                   |
| -------------------------- | -------------------------------- | ------------------------- |
| Contratos cadastrados      | 100% dos ativos (~20) em 30 dias | Contagem no banco         |
| Pagamentos registrados     | 100% em até 5 dias após ateste   | Datas no banco            |
| Bloqueios de validação     | 100% de regras funcionando       | Zero bypass               |
| Tempo de consulta de saldo | < 30 segundos                    | Autoavaliação qualitativa |

### 8.2 Onda 2

| Métrica              | Alvo                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Aditivos registrados | 100% dos existentes retroativamente em 15 dias                      |
| Alertas              | Zero contratos vencidos sem ciência prévia (≥ 30 dias antecedência) |
| Auditoria            | 100% das operações logadas                                          |

### 8.3 Onda 3

| Métrica                | Alvo                                    |
| ---------------------- | --------------------------------------- |
| Visibilidade gerencial | Diretor consulta sem depender do fiscal |
| Tempo de relatório     | < 2 minutos para gerar PDF              |
| Satisfação do Diretor  | Avaliação qualitativa positiva          |

---

## 9. Riscos & Mitigação

| #   | Risco                                                                                | Probabilidade | Impacto | Mitigação                                                                                                                               |
| --- | ------------------------------------------------------------------------------------ | ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Atraso na provisão do servidor** (dependência externa da infra JFAP)               | Média-Alta    | Alto    | Solicitar imediatamente. Desenvolver 100% localmente enquanto aguarda. Deploy pode ser feito em horas quando o servidor estiver pronto. |
| R2  | **Escopo creep** (tentar adicionar funcionalidades da Onda 2/3 durante a Onda 1)     | Média         | Médio   | Disciplina de escopo. Seguir rigorosamente o checklist Go/No-Go da Onda 1. Anotar ideias para ondas futuras sem implementá-las.         |
| R3  | **Complexidade subestimada** na autenticação (bloqueio, timeout, política de senhas) | Baixa-Média   | Médio   | Fase 1 tem buffer de 1 dia. Se necessário, implementar bloqueio/timeout na Fase 4 (polish) em vez da Fase 1.                            |
| R4  | **Perda de dados** (sem backup configurado)                                          | Baixa         | Crítico | Configurar pg_dump + cron no primeiro dia de deploy em produção. Testar restore.                                                        |
| R5  | **Desenvolvedor solo = ponto único de falha**                                        | Constante     | Médio   | Código limpo, documentado e versionado em Git. Schema Prisma auto-documentado. PRD + UX Spec como documentação viva.                    |
| R6  | **Incompatibilidade Next.js 16** (versão muito recente, possíveis breaking changes)  | Baixa         | Baixo   | Consultar release notes. Se houver problemas, fallback para Next.js 15 (estável).                                                       |
| R7  | **Let's Encrypt em rede interna** (pode exigir DNS público para validação)           | Média         | Baixo   | Alternativa: certificado auto-assinado para rede interna + exceção no navegador. Ou solicitar certificado institucional à JFAP.         |

---

## 10. Equipe

| Papel                        | Pessoa                            | Dedicação               |
| ---------------------------- | --------------------------------- | ----------------------- |
| **Desenvolvedor Full-Stack** | Fiscal de Contratos (solicitante) | Full-time               |
| **Product Owner**            | Fiscal de Contratos (solicitante) | Simultâneo              |
| **Stakeholder**              | Diretor do NUTEC                  | Validação nas Ondas 2-3 |
| **Dependência externa**      | Equipe de infraestrutura da JFAP  | Provisão de servidor    |

---

## 11. Próximos Passos Pós-MVP (Após Onda 3)

Após a conclusão das 3 ondas e validação das métricas de sucesso, os seguintes itens do PRD (Seção 9 — Considerações Futuras) podem ser priorizados:

| Prioridade sugerida | Funcionalidade                              | Justificativa                                                 |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| 1ª                  | Upload de documentos (PDF de contratos, NF) | Elimina necessidade de consultar documentos fora da aplicação |
| 2ª                  | Integração SIAFI/Siscontratos               | Elimina registro manual (maior ganho de eficiência)           |
| 3ª                  | Acessibilidade (eMAG/WCAG 2.1)              | Conformidade obrigatória para órgão federal                   |
| 4ª                  | Responsividade mobile                       | Acesso em campo/reuniões                                      |
| 5ª                  | Multi-tenant                                | Expansão para outras Seções Judiciárias                       |

---

## 12. Resumo Executivo

| Atributo        | Valor                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| **O que**       | Sistema web de gestão e controle de desembolso de contratos                                 |
| **Para quem**   | Fiscal de contratos do NUTEC/JFAP                                                           |
| **Problema**    | Zero controle estruturado dos contratos e seus pagamentos                                   |
| **Solução MVP** | Aplicação de registro manual com cálculo de saldo em tempo real                             |
| **Stack**       | Next.js 16 + TypeScript + TailwindCSS + shadcn/ui + PostgreSQL + Prisma + NextAuth + Docker |
| **Entrega**     | 3 ondas: Onda 1 (10-15 dias), Onda 2 (+8-10 dias), Onda 3 (+8-10 dias)                      |
| **Equipe**      | 1 desenvolvedor full-time                                                                   |
| **Deploy**      | On-premise, Docker, HTTPS (Let's Encrypt)                                                   |
| **Validação**   | 30 dias de uso real pós Onda 1                                                              |

---

_Documento elaborado em processo iterativo de planejamento de MVP. Versão 1.0 — 16/04/2026._
