# Padrões de UI — shadcn/ui + TailwindCSS

## Componentes shadcn/ui obrigatórios

| Uso | Componente |
|-----|-----------|
| Navegação lateral | Sidebar |
| Cards de resumo | Card |
| Tabelas de dados | DataTable (Table + columns) |
| Formulários | Form + Input + Label + Select + DatePicker |
| Seções colapsáveis | Accordion |
| Modais de confirmação | Dialog (AlertDialog para destrutivos) |
| Badges de status | Badge |
| Barra de progresso | Progress |
| Alertas no sininho | Popover |
| Toasts de feedback | Sonner |
| Loading em tabelas | Skeleton |
| Avisos inline | Alert |
| Tooltips | Tooltip |
| Separadores | Separator |

## Densidade Visual

### Telas operacionais (contratos, pagamentos, usuários, auditoria)
- Texto base: `text-sm`
- Padding de rows: `py-2`
- Gap entre seções: `space-y-6`
- Cards: `p-4`

### Dashboard
- Texto base: `text-base` a `text-lg`
- Números grandes: `text-3xl font-bold`
- Cards: `p-6`
- Gap: `gap-6`

## Estados obrigatórios em toda tela

1. **Loading:** Skeleton (tabelas) ou Spinner (botões)
2. **Empty:** Mensagem descritiva + botão de ação primária
3. **Erro:** Alert destructive ou Toast vermelho
4. **Sucesso:** Toast verde (Sonner), 4 segundos, auto-dismiss

## Cores semânticas de status

| Status | Badge variant | Cor |
|--------|--------------|-----|
| Pago | default (verde) | green |
| Liquidado | secondary (azul) | blue |
| Atestado | outline (amarelo) | yellow |
| Pendente | muted (cinza) | gray |

## Cores de saldo

| Faixa | Cor | Progress class |
|-------|-----|---------------|
| > 50% | Verde | indicatorClassName="bg-green-500" |
| 20-50% | Amarelo | indicatorClassName="bg-yellow-500" |
| < 20% | Vermelho | indicatorClassName="bg-red-500" |
