---
description: "Onda 2 — Sistema de alertas: sininho com badge no header, dropdown com lista clicável, 3 tipos de alerta"
---

# Onda 2 — Alertas (Sininho)

## 1. Lógica de Alertas

Criar `src/lib/alerts.ts`:

```typescript
type AlertType = "EXPIRING" | "LOW_BALANCE" | "MISSING_PAYMENT"
type AlertSeverity = "critical" | "warning" | "info"

interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  contractId: string
  contractNumber: string
  createdAt: Date
}
```

Criar `src/actions/alertas.ts`:
- `getAlerts()`:
  1. Buscar todos os contratos ACTIVE
  2. Para cada contrato, verificar:
     - **Vigência vencendo:**
       - < 30 dias → severity "critical" (vermelho)
       - 30-60 dias → severity "warning" (amarelo)
       - 60-90 dias → severity "info" (azul)
     - **Saldo baixo (< 20%):**
       - Calcular % consumido
       - Se < 20% → severity "warning"
     - **Pagamento não registrado** (apenas FIXED + MONTHLY):
       - Verificar meses faltantes
       - Se houver → severity "warning" (laranja)
  3. Ordenar por severity (critical primeiro) e data
  4. Retornar lista de alerts

**IMPORTANTE:** Esta função é chamada no server-side (layout ou header). Deve ser eficiente — uma query com includes, não N+1.

## 2. Componentes

Atualizar `src/components/layout/header.tsx`:
- Adicionar ícone de sininho (Bell do lucide-react)
- Badge numérico: quantidade de alertas não lidos
- Se zero alertas: sininho sem badge, cor muted
- Se > 0: sininho com badge vermelho

Criar `src/components/layout/alert-dropdown.tsx`:
- Popover (shadcn/ui) acionado pelo sininho
- Lista de alertas com scroll interno (max-height 400px)
- Cada item:
  - Ícone de cor (🔴🟡🟠🔵) baseado em severity
  - Título: "Contrato 012/2025 — Vigência vence em 28 dias"
  - Clique → navega para `/contratos/[contractId]`
- Footer: botão "Marcar todos como lidos" (opcional — pode ser simples sem persistência de "lido")
- Empty state: "Nenhum alerta no momento ✅"

## 3. Integração no Layout

Atualizar `src/app/(dashboard)/layout.tsx`:
- Chamar `getAlerts()` no Server Component
- Passar alerts como prop para o Header
- Header passa para AlertDropdown

## 4. Sidebar

Adicionar ícone de sininho na sidebar? **Não** — conforme decisão do UX, alertas ficam APENAS no header como badge/dropdown. Não é item de menu.

## Verificação

- [ ] Sininho aparece no header para ambos os perfis
- [ ] Badge mostra contagem correta de alertas
- [ ] Dropdown lista alertas ordenados por severidade
- [ ] Alerta de vigência vencendo (< 30, 30-60, 60-90 dias) com cores corretas
- [ ] Alerta de saldo baixo (< 20%)
- [ ] Alerta de pagamento não registrado (contratos fixos mensais)
- [ ] Clique no alerta navega para a ficha do contrato
- [ ] Zero alertas: sininho sem badge, dropdown com "Nenhum alerta"
