---
description: "Onda 3 — Relatórios em PDF: extrato do contrato, desembolso por período, contratos vigentes"
---

# Onda 3 — Relatórios em PDF

## 1. Dependência

Escolher UMA abordagem para geração de PDF:

**Opção A — @react-pdf/renderer** (recomendada):

```bash
npm install @react-pdf/renderer
```

Gera PDF direto no Node.js com componentes React. Mais controle sobre layout.

**Opção B — Puppeteer:**

```bash
npm install puppeteer
```

Renderiza HTML → PDF. Mais pesado, mais fiel ao visual.

**Recomendação: Opção A** para este projeto (mais leve, sem browser headless no Docker).

## 2. Templates de PDF

Criar `src/lib/pdf/` com os templates:

### Relatório 1: Extrato Completo de Contrato

Criar `src/lib/pdf/extrato-contrato.tsx`:

- Cabeçalho: Logo NUTEC/JFAP, "Extrato do Contrato [nº]", data de geração
- Seção Identificação: todos os dados cadastrais
- Seção Vigência: datas, possibilidade de prorrogação
- Seção Financeiro: valor global, tipo, periodicidade
- Seção Dotação: programa de trabalho, natureza da despesa
- Seção Gestão: fiscal, substituto, gestor
- Tabela de Empenhos: nota, data, valor, tipo
- Tabela de Pagamentos: mês ref, valor NF, ateste, liquidação, pagamento, status
- Tabela de Aditivos: nº TA, tipo, data, efeito
- Resumo financeiro: valor global, total empenhado, total liquidado, total pago, saldo restante
- Rodapé: "Gerado em DD/MM/AAAA às HH:MM — Sistema de Gestão de Contratos NUTEC/JFAP"

### Relatório 2: Desembolso por Período

Criar `src/lib/pdf/desembolso-periodo.tsx`:

- Cabeçalho: "Relatório de Desembolso — [data início] a [data fim]"
- Tabela: Contrato, Fornecedor, Mês Ref, Valor NF, Data Pagamento, Valor Pago
- Ordenado por data de pagamento
- Totalizador ao final: "Total desembolsado no período: R$ XXX"
- Filtrado por intervalo de datas de pagamento (paidAt)

### Relatório 3: Contratos Vigentes com Saldos

Criar `src/lib/pdf/contratos-vigentes.tsx`:

- Cabeçalho: "Contratos Vigentes em [data de referência]"
- Tabela: Nº Contrato, Fornecedor, Objeto (truncado), Valor Global, Total Pago, Saldo, % Consumido, Vigência até
- Ordenado por saldo % (menor primeiro — mais urgentes no topo)
- Totalizadores: Total contratado, Total pago, Total saldo restante

## 3. API Routes para Download

Criar `src/app/api/relatorios/extrato/[contractId]/route.ts`:

- GET → Busca contrato completo → Gera PDF → Retorna como download
- Headers: Content-Type: application/pdf, Content-Disposition: attachment; filename="extrato-012-2025.pdf"

Criar `src/app/api/relatorios/desembolso/route.ts`:

- GET com query params: startDate, endDate
- Busca pagamentos no período → Gera PDF → Download

Criar `src/app/api/relatorios/vigentes/route.ts`:

- GET com query param: referenceDate (default: hoje)
- Busca contratos ativos → Gera PDF → Download

## 4. Tela de Relatórios

Criar `src/app/(dashboard)/relatorios/page.tsx`:

- Título "Relatórios"
- 3 Cards, cada um com:
  - Título do relatório
  - Campos de parâmetro (contrato select, date range, etc.)
  - Botão [Gerar PDF 📥] que dispara download via API route
  - Loading state no botão enquanto gera

Card 1 — Extrato Completo:

- Select de contrato (busca por nº ou fornecedor)
- [Gerar PDF]

Card 2 — Desembolso por Período:

- DatePicker: data início
- DatePicker: data fim
- [Gerar PDF]

Card 3 — Contratos Vigentes:

- DatePicker: data de referência (default: hoje)
- [Gerar PDF]

## 5. Atalho na Ficha do Contrato

Atualizar botão "📄 Exportar PDF" no card resumo da ficha do contrato:

- Habilitar o botão (estava desabilitado na Onda 1)
- Ao clicar: dispara download do Extrato Completo via API route
- Loading state enquanto gera

## 6. Sidebar

Adicionar "Relatórios" na sidebar (visível para Fiscal e Diretor):

```
📑  Relatórios
```

## Verificação

- [ ] Tela de relatórios com 3 cards funciona
- [ ] Extrato completo gera PDF com todos os dados do contrato
- [ ] Desembolso por período filtra corretamente e totaliza
- [ ] Contratos vigentes lista com saldos atualizados
- [ ] PDFs formatados com cabeçalho, rodapé, datas pt-BR, moedas pt-BR
- [ ] Botão "Exportar PDF" na ficha do contrato funciona
- [ ] Loading state durante geração
- [ ] Perfil Diretor acessa relatórios
