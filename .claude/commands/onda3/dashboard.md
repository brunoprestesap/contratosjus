---
description: "Onda 3 — Dashboard gerencial: 7 indicadores, gráficos Recharts, filtro de exercício, layout spacious"
---

# Onda 3 — Dashboard Gerencial

## Pré-requisito
Ondas 1 e 2 completas.

## 1. Dependências

```bash
npm install recharts
```

## 2. Server Actions / Data Fetching

Criar `src/actions/dashboard.ts`:

```typescript
// getDashboardData(fiscalYear: number):
//   1. Total de contratos ativos (count where status = ACTIVE)
//   2. Valor total contratado (sum globalValue where status = ACTIVE)
//   3. Total pago no exercício (sum paidValue where paidAt in [01/01/year, 31/12/year])
//   4. Empenhado / Liquidado / Pago no exercício:
//      - empenhado: sum commitments.value where year(commitmentDate) = year
//      - liquidado: sum payments.settledValue where year(settlementDate) = year
//      - pago: sum payments.paidValue where year(paidAt) = year
//   5. Contratos com saldo baixo (< 20%): lista com contractNumber, supplier, %
//   6. Contratos com vigência vencendo (< 90 dias): lista com contractNumber, diasRestantes
//   7. Pagamentos pendentes de registro: contratos FIXED sem pagamento no mês corrente/anterior
//   8. Evolução mensal (últimos 12 meses): array [{ month, totalPaid }]
//   9. Ranking por volume: top 10 contratos ordenados por globalValue desc
```

**Otimização:** Fazer o mínimo de queries possível. Buscar todos os contratos ACTIVE com include de pagamentos e empenhos em UMA query, depois processar no JS.

## 3. Componentes do Dashboard

Criar `src/components/dashboard/summary-cards.tsx`:
- 3 cards em grid de 3 colunas
- Card 1: "Contratos Ativos" — número grande (text-3xl font-bold)
- Card 2: "Total Contratado" — valor formatado em moeda
- Card 3: "Total Pago (Exercício)" — valor formatado
- Estilo **spacious**: p-6, gap-6

Criar `src/components/dashboard/chart-empenho-liquidado.tsx`:
- Gráfico de barras empilhadas (Recharts BarChart)
- 3 barras: Empenhado (azul), Liquidado (amarelo), Pago (verde)
- Label do eixo Y em moeda
- Título: "Empenhado / Liquidado / Pago no Exercício"

Criar `src/components/dashboard/chart-evolucao-desembolso.tsx`:
- Gráfico de linha ou barras (Recharts)
- Eixo X: últimos 12 meses (Mar/25, Abr/25, ..., Fev/26)
- Eixo Y: valor pago no mês (formatado moeda)
- Título: "Evolução de Desembolso Mensal"

Criar `src/components/dashboard/alert-list-saldo.tsx`:
- Card com título "⚠️ Contratos com Saldo Baixo (< 20%)"
- Lista de contratos com: nº contrato, fornecedor, % de saldo
- Cada item clicável → navega para ficha do contrato
- Empty: "Nenhum contrato com saldo baixo ✅"

Criar `src/components/dashboard/alert-list-vigencia.tsx`:
- Card com título "⏳ Vigências Próximas do Vencimento"
- Lista: nº contrato, dias restantes
- Cores: vermelho (< 30), amarelo (30-60), azul (60-90)
- Clicável → ficha do contrato

Criar `src/components/dashboard/alert-list-pendentes.tsx`:
- Card com título "📅 Pagamentos Pendentes de Registro"
- Lista: nº contrato, mês de referência faltante
- Clicável → ficha do contrato

Criar `src/components/dashboard/ranking-contratos.tsx`:
- Card com título "🏷️ Ranking por Volume Financeiro"
- Lista numerada: posição, nº contrato, fornecedor (truncado), valor global
- Top 10

## 4. Página do Dashboard

Atualizar `src/app/(dashboard)/page.tsx`:
- Filtro de exercício no topo: Select com anos disponíveis (ex: 2025, 2026)
- Layout grid:
  - Linha 1: 3 summary cards (grid-cols-3)
  - Linha 2: 2 gráficos (grid-cols-2)
  - Linha 3: 2 listas de alerta (grid-cols-2)
  - Linha 4: 2 cards (pendentes + ranking) (grid-cols-2)
- Server Component: busca dados e passa para componentes client (gráficos)

## 5. Sidebar

Adicionar "Dashboard" como primeiro item da sidebar:
```
📊  Dashboard    ← NOVO (primeiro item)
📄  Contratos
💰  Pagamentos   ← será adicionado nesta onda
📑  Relatórios   ← será adicionado nesta onda
────
👥  Usuários
🕐  Auditoria
```

Alterar a landing page (após login) de Contratos para Dashboard.

## 6. Perfil Diretor

Verificar que o Diretor:
- ✅ Acessa o Dashboard
- ✅ Acessa Contratos (somente leitura — sem botões de criar/editar/excluir)
- ✅ Acessa Relatórios
- ❌ NÃO acessa Pagamentos, Usuários, Auditoria

## Verificação

- [ ] Dashboard renderiza com 7 indicadores
- [ ] Filtro de exercício funciona (muda todos os dados)
- [ ] Summary cards mostram números corretos
- [ ] Gráfico de empenhado/liquidado/pago funciona
- [ ] Gráfico de evolução mensal mostra últimos 12 meses
- [ ] Listas de alerta com contratos corretos
- [ ] Items clicáveis navegam para ficha do contrato
- [ ] Ranking top 10 funciona
- [ ] Layout spacious (espaçamentos maiores, tipografia maior)
- [ ] Perfil Diretor acessa dashboard corretamente
