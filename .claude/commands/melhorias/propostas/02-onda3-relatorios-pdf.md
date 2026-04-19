---
description: "[PROPOSTA] Onda 3 — avaliar @react-pdf/renderer para relatórios"
---

## Ordem de execução: 2 de 3 (Grupo C — Propostas)

**ATENÇÃO:** Funcionalidade da **Onda 3**. Não executar sem confirmação explícita do usuário.

## Contexto

Onda 3 prevê 3 relatórios em PDF: extrato do contrato, desembolso por período, contratos vigentes. Duas bibliotecas dominam:

| Biblioteca | Modelo | Prós | Contras |
|---|---|---|---|
| `@react-pdf/renderer` | Declarativo, React | Reusa componentes, familiar ao time | Tamanho maior, limites de CSS |
| `pdfkit` | Imperativo, streams | Controle fino, menor bundle | Código verboso, não reusa JSX |
| `puppeteer` | HTML→PDF | Usa mesmo layout da web | Pesado, exige Chromium |

## Recomendação

**`@react-pdf/renderer`** — combina com a stack React, permite reusar formatação pt-BR dos helpers, e os relatórios previstos são lineares (não layouts complexos).

## Passos (somente se Onda 3 aprovada)

1. `npm i @react-pdf/renderer`.
2. Criar `src/lib/pdf/` com componentes de página:
   - `ContratoExtratoPdf.tsx`
   - `DesembolsoPeriodoPdf.tsx`
   - `ContratosVigentesPdf.tsx`
3. Criar Server Action que chama `renderToBuffer(<ContratoExtratoPdf data={...} />)` e retorna `Response` com `Content-Type: application/pdf`.
4. Route handler em `src/app/api/relatorios/[tipo]/route.ts` (exceção ao padrão "Server Actions only" — downloads exigem route handler).
5. Fontes pt-BR: registrar Inter ou Roboto para não usar Helvetica genérica.

## Decisão pendente

Pergunte ao usuário: "Aprovar `@react-pdf/renderer` ou prefere avaliar puppeteer para fidelidade visual?"
