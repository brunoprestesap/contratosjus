---
description: "Onda 1 / Fase 4 — Validações RF-09, alerta de mês sem registro, polish de UI, testes finais, deploy"
---

# Fase 4 — Validações + Polish + Deploy

## 1. Regra 4: Alerta de Mês Sem Registro

Implementar lógica para contratos com `paymentType = FIXED` e `paymentPeriodicity = MONTHLY`:

Criar `src/lib/missing-payments.ts`:
```typescript
// getMissingPaymentMonths(contract, payments): Date[]
// Para cada mês entre startDate e hoje:
//   Se não existe Payment com esse referenceMonth → incluir na lista
```

Exibir na seção de pagamentos da ficha do contrato:
- Se houver meses faltantes: Alert (warning) acima da tabela
- Texto: "⚠️ Pagamento não registrado para: Mar/2026, Abr/2026"
- Cada mês faltante é um link/botão que abre o modal de registro já com o mês preenchido

Exibir na lista de contratos:
- Badge laranja na coluna de status se houver meses faltantes

## 2. Revisão de todas as validações

Verificar que as 4 regras do RF-09 estão implementadas e funcionais:

| Regra | Tipo | Onde |
|-------|------|------|
| Pagamento em contrato expirado | BLOQUEAR | Server Action `createPayment` / `updatePayment` |
| Total pago + empenhado > valor global | ALERTAR | Formulário de pagamento (Alert warning) |
| Ordem cronológica (ateste → liquidação → pgto) | BLOQUEAR | Zod schema + Server Action |
| Mês sem registro (contrato fixo) | ALERTAR | Ficha do contrato + Lista |

## 3. Polish de UI

### Empty states (verificar em todas as telas):
- Lista de contratos vazia: ilustração + "Nenhum contrato cadastrado" + botão [+ Novo Contrato]
- Tabela de empenhos vazia: "Nenhum empenho registrado" + botão [+ Novo Empenho]
- Tabela de pagamentos vazia: "Nenhum pagamento registrado" + botão [+ Registrar Pagamento]
- Lista de usuários vazia: "Nenhum usuário cadastrado" + botão [+ Novo Usuário]

### Loading states (verificar em todas as telas):
- Lista de contratos: Skeleton rows (5-8 linhas)
- Ficha do contrato: Skeleton do card resumo + skeleton das seções
- Botões de submit: spinner + texto "Salvando..." + campos desabilitados

### Feedback (verificar em todas as mutations):
- Sucesso: Toast verde (Sonner), 4 segundos, auto-dismiss
- Erro: Toast vermelho, persistente até fechar
- Confirmação de exclusão: AlertDialog com botão destructive

### Consistência visual:
- Espaçamentos uniformes entre seções (space-y-6 ou space-y-8)
- Tipografia: text-sm para tabelas dense, text-2xl font-bold para títulos
- Cores de badge consistentes em toda a aplicação
- Formatação pt-BR em todas as datas e valores monetários

### Navegação:
- Botão "← Voltar" funcional em todas as subpáginas
- Sidebar: item ativo destacado corretamente
- Breadcrumb não necessário (sidebar + botão voltar é suficiente)

## 4. Testes Finais

Executar todos os testes:
```bash
npx vitest run
```

Todos devem passar:
- `tests/lib/senha.test.ts` — política de senha
- `tests/lib/calculo-saldo.test.ts` — cálculos financeiros
- `tests/lib/pagamento-status.test.ts` — status automático
- `tests/lib/validacoes.test.ts` — regras de validação

## 5. Preparação para Deploy

### Build de produção:
```bash
npm run build
```
Corrigir quaisquer erros de build (TypeScript, imports faltantes, etc.).

### Variáveis de produção:
Criar `.env.production` (NÃO commitar):
```
DATABASE_URL="postgresql://usuario:senha@db:5432/contratos?schema=public"
NEXTAUTH_URL="https://contratos.jfap.local"
NEXTAUTH_SECRET="[gerar com: openssl rand -base64 32]"
```

### Docker build:
```bash
docker compose build
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
```

### Verificação final (smoke test manual):
- [ ] Página de login acessível
- [ ] Login com credenciais corretas → dashboard
- [ ] Login com credenciais erradas 5x → conta bloqueada
- [ ] Cadastro de contrato com todos os campos
- [ ] Edição de contrato
- [ ] Exclusão de contrato com confirmação
- [ ] Busca e filtros na lista
- [ ] Registro de empenho (inicial + reforço)
- [ ] Saldo de empenho calculado
- [ ] Registro de pagamento (só ateste)
- [ ] Complementar liquidação e pagamento
- [ ] Status automático correto em cada etapa
- [ ] Saldo contratual atualizado
- [ ] Barra de progresso com cor correta
- [ ] Alerta de mês faltante em contrato fixo
- [ ] Bloqueio de pagamento em contrato expirado
- [ ] Alerta de estouro de valor global
- [ ] Bloqueio de ordem cronológica inválida
- [ ] CRUD de usuários funcional
- [ ] Perfil Diretor vê contratos em somente leitura
- [ ] Sessão expira após 30 min

## GO / NO-GO da Onda 1

Se TODOS os itens acima estiverem ✅, a Onda 1 está pronta para deploy em produção.
