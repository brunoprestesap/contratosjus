---
description: "Onda 1 / Fase 1 — Autenticação completa (NextAuth, senha forte, bloqueio, timeout) + CRUD de usuários + Layout principal"
---

# Fase 1 — Autenticação + Usuários + Layout

## 1. NextAuth (Auth.js v5)

Criar `src/lib/auth.ts` com configuração NextAuth:
- Provider: Credentials (email + senha)
- Adapter: Prisma (usar `@auth/prisma-adapter` ou manual)
- Callbacks: session inclui `id`, `role`, `name`
- Pages: signIn → "/login"

Criar `src/app/api/auth/[...nextauth]/route.ts`.

### Lógica de login (dentro do authorize):
1. Buscar usuário por email
2. Verificar se `status === BLOCKED` → retornar erro "Conta bloqueada"
3. Verificar se `lockedUntil > now()` → retornar erro "Conta temporariamente bloqueada"
4. Comparar senha com bcrypt
5. Se senha errada:
   - Incrementar `failedAttempts`
   - Se `failedAttempts >= 5` → setar `lockedUntil` para `now() + 30 minutos`
   - Retornar erro "Credenciais inválidas"
6. Se senha correta:
   - Resetar `failedAttempts` para 0
   - Limpar `lockedUntil`
   - Atualizar `lastLoginAt`
   - Retornar user

### Timeout de sessão:
- Configurar `maxAge: 30 * 60` (30 minutos) no session do NextAuth
- JWT strategy com `maxAge: 30 * 60`

## 2. Middleware

Criar `src/middleware.ts`:
- Rotas públicas: `/login`, `/api/auth/*`
- Todas as demais rotas: redirecionar para `/login` se não autenticado
- Verificar perfil: se Diretor tentar acessar `/usuarios` ou `/auditoria` → redirecionar para `/`

## 3. Zod Schemas

Criar `src/lib/validators/auth.ts`:
```typescript
// loginSchema: email (required, email format) + senha (required)
```

Criar `src/lib/validators/usuario.ts`:
```typescript
// userCreateSchema: name, email, password (com validação de força), role
// userUpdateSchema: name, email, role (senha opcional)
// passwordSchema: mínimo 12 chars, maiúscula, minúscula, número, especial
```

Mensagens de erro em pt-BR.

## 4. Server Actions

Criar `src/actions/auth.ts`:
- `loginAction(formData)` — autenticação via signIn do NextAuth
- `logoutAction()` — signOut

Criar `src/actions/usuarios.ts`:
- `createUser(data)` — criar usuário com senha hasheada (bcrypt custo 12)
- `updateUser(id, data)` — editar (se senha informada, hashear)
- `deleteUser(id)` — desativar (setar status BLOCKED, não deletar do banco)
- `listUsers()` — listar todos
- `getUser(id)` — buscar por ID

Todos retornam `{ success: boolean; data?: T; error?: string }`.

## 5. Tela de Login

Criar `src/app/(auth)/login/page.tsx`:
- Layout centralizado, Card com logo, título "Sistema de Gestão de Contratos"
- Campos: email, senha
- Botão "Entrar" com loading spinner
- Mensagens de erro: "Credenciais inválidas", "Conta bloqueada"
- Redirecionar para `/` após login
- Componentes: Card, Input, Label, Button, Form (shadcn/ui)

Criar `src/app/(auth)/layout.tsx`:
- Layout limpo sem sidebar (apenas a tela de login)

## 6. Layout Principal (Dashboard)

Criar `src/app/(dashboard)/layout.tsx`:
- Sidebar à esquerda (256px fixa)
- Header no topo com nome do usuário + botão Sair
- Área de conteúdo flex-1 com padding

Criar `src/components/layout/sidebar.tsx`:
- Logo NUTEC/JFAP no topo
- Menu items (Onda 1): Contratos, Usuários (só Fiscal)
- Item ativo com background accent
- Rodapé: nome do usuário, perfil, botão Sair
- Filtrar itens por perfil (useSession)

Criar `src/components/layout/header.tsx`:
- Título da página atual
- Espaço para sininho de alertas (Onda 2 — só o placeholder)
- Nome do usuário + avatar placeholder

## 7. Tela de Usuários

Criar `src/app/(dashboard)/usuarios/page.tsx`:
- Título "Usuários" + botão "+ Novo Usuário"
- Tabela: Nome, Email, Perfil, Status, Ações (editar, desativar)
- Componentes: DataTable, Button, Badge

Criar `src/app/(dashboard)/usuarios/novo/page.tsx`:
- Formulário: nome, email, senha (com indicador de força), perfil (select: Fiscal/Diretor)
- React Hook Form + zodResolver
- Botões: Cancelar (volta para lista), Salvar
- Toast de sucesso/erro

Criar `src/app/(dashboard)/usuarios/[id]/editar/page.tsx`:
- Mesmo formulário, preenchido com dados atuais
- Senha opcional na edição

## 8. Testes

Criar `tests/lib/senha.test.ts`:
- Testar `validatePasswordStrength`:
  - Senha válida (12+ chars, todas categorias) → valid: true
  - Muito curta → errors inclui "Mínimo de 12 caracteres"
  - Sem maiúscula → errors inclui mensagem
  - Sem número → errors inclui mensagem
  - Sem especial → errors inclui mensagem
  - String vazia → multiple errors

## Verificação

- [ ] Login funcional com email/senha
- [ ] Senha errada 5x → conta bloqueada
- [ ] Sessão expira após 30 min inatividade
- [ ] Middleware protege rotas (redireciona para /login)
- [ ] Diretor não acessa /usuarios
- [ ] CRUD de usuários funcional
- [ ] Sidebar mostra itens corretos por perfil
- [ ] Testes de senha passando
